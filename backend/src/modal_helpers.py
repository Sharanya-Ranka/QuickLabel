import os
import datetime
import sqlite3
from contextlib import contextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request
import modal
from .types import EmbedRequest, EmbedRequestInfo
import jwt
import requests
from .modal_build import (
    DB_DIR,
    DB_PATH,
    volume,
    security_scheme,
    DAILY_MAX_EMBEDDINGS,
    JWKS_URL,
    JWKS_CACHE,
    COGNITO_APP_CLIENT_ID,
    COGNITO_ISSUER,
)


def get_cognito_public_key(kid: str) -> dict:
    """Fetches Cognito public keys and locates the signing key matching the token's Key ID."""
    global JWKS_CACHE
    # print(f"In get_cognito_public_key")

    # Check if the key signature is already in our container memory cache
    if kid not in JWKS_CACHE:
        # print(f"Cache not present")
        try:
            response = requests.get(JWKS_URL, timeout=5.0)
            response.raise_for_status()
            jwks = response.json()

            # Re-populate the internal key dictionary mapping
            JWKS_CACHE = {key["kid"]: key for key in jwks.get("keys", [])}
            # print(f"Cache ={JWKS_CACHE}")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to fetch signature validation certificates from AWS: {str(e)}",
            )

    if kid not in JWKS_CACHE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature key identifier. The token was signed by an unrecognized cluster.",
        )

    # Construct an RS256 signing key map object using PyJWT's helper functions
    return jwt.algorithms.RSAAlgorithm.from_jwk(JWKS_CACHE[kid])


@contextmanager
def get_db():
    # print(f"In get_db")
    """Context manager ensuring safe SQLite connections across containers."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20.0)  # High timeout for concurrent writes
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_quotas (
                user_id TEXT PRIMARY KEY,
                quota_used INTEGER DEFAULT 0,
                last_reset_date TEXT
            )
        """)
        conn.commit()
        yield conn
    finally:
        conn.close()
        # Synchronize changes back to Modal persistent storage cluster
        volume.commit()


def verify_token(token: str):
    # -------------------------------------------------------------
    # Step 1: Securely Verify the AWS Cognito Bearer Token
    # -------------------------------------------------------------
    # print(f"In verify_token (with token={token})")
    try:
        # Extract the unverified header fields first to locate the cryptographic Key ID (kid)
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")
        if not kid:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing key ID 'kid' in token header.",
            )

        # Pull matching public key algorithm block
        public_key = get_cognito_public_key(kid)

        # Securely decode and verify signature, expirations, audience claims, and issuer paths
        # PyJWT handles expiration (exp) and token_use validation under the hood here
        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience=COGNITO_APP_CLIENT_ID,
            issuer=COGNITO_ISSUER,
        )

        # Extract Cognito's unique, immutable User Subject String Guid
        user_id = claims.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token validation failed. Subject field missing.",
            )

        else:
            return claims

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The authentication session token has expired.",
        )
    except jwt.InvalidTokenError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Access token security validation failed: {str(err)}",
        )


def verify_and_update_quota(
    items_info: EmbedRequestInfo,
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
):
    """
    Extracts Bearer payload, maps it to a user identity,
    and checks/increments daily consumption limits atomically.
    """
    # print(f"In verify_and_update")
    token = credentials.credentials
    request_count = items_info.num_items

    # 💡 PRODUCTION TODO: Verify your JWT token using Cognito/Amplify verification certs
    # For this pattern, we infer a simplified sub/user_id for clarity
    payload = verify_token(token=token)
    user_id = payload.get("sub")

    # Establish today's tracking stamp (e.g., Resetting strictly at midnight UTC)
    current_tracking_day = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    conn: sqlite3.Connection
    with get_db() as conn:
        cursor = conn.cursor()

        # Pull current footprint record
        cursor.execute(
            "SELECT quota_used, last_reset_date FROM user_quotas WHERE user_id = ?",
            (user_id,),
        )
        row = cursor.fetchone()

        if row is None:
            # First time visitor footprint setup
            quota_used = 0
            cursor.execute(
                "INSERT INTO user_quotas (user_id, quota_used, last_reset_date) VALUES (?, ?, ?)",
                (user_id, request_count, current_tracking_day),
            )
        else:
            db_quota, db_date = row
            # print(f"db_quota={db_quota}, db_date={db_date}")
            # print(f"Current tracking  date = {current_tracking_day}")

            # Check if a new day window has rolled over
            if db_date != current_tracking_day:
                quota_used = 0
                # Reset tracking timestamp window instantly
                cursor.execute(
                    "UPDATE user_quotas SET quota_used = ?, last_reset_date = ? WHERE user_id = ?",
                    (request_count, current_tracking_day, user_id),
                )
            else:
                quota_used = db_quota

                # Enforce safety firewall gates
                if quota_used + request_count > DAILY_MAX_EMBEDDINGS:
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail=f"Daily threshold exceeded. Consumed: {quota_used}/{DAILY_MAX_EMBEDDINGS} requests.",
                    )

                # Atomically increment current window quota scale
                cursor.execute(
                    "UPDATE user_quotas SET quota_used = quota_used + ? WHERE user_id = ?",
                    (request_count, user_id),
                )

        conn.commit()

    return {"user_id": user_id, "consumed_today": quota_used + request_count}


# # --- Modal Deployable Container Configuration ---
# @app.function(
#     image=image,
#     volumes={DB_DIR: volume},  # Mount the SQLite file system into the container
# )
# @modal.fastapi_endpoint()
# def process_embeddings(
#     payload: dict, auth_details: dict = Depends(verify_and_update_quota)
# ):
#     # Extract structural array details
#     items_to_embed = payload.get("items", [])

#     # The quota check is already complete! Proceed to run the GPU code...
#     return {
#         "status": "SUCCESS",
#         "user": auth_details["user_id"],
#         "quota_status": f"{auth_details['consumed_today']}/{DAILY_MAX_EMBEDDINGS}",
#     }
