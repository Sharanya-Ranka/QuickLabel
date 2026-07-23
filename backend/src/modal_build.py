import os
import datetime
import sqlite3
from contextlib import contextmanager

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import modal
from .types import EmbedRequest
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

DB_DIR = "/data"
DB_PATH = os.path.join(DB_DIR, "quotas.db")
DAILY_MAX_EMBEDDINGS = 20_000  # Cap limits

# Secure Bearer token extraction hook
security_scheme = HTTPBearer()


# -----------------------------------------------------------------------------
# 1. DEFINE THE IMAGE & BAKE IN THE MODEL WEIGHTS
# -----------------------------------------------------------------------------
MODEL_NAME = "BAAI/bge-small-en-v1.5"
CACHE_DIR = "/root/model_cache"


def download_model_weights():
    """
    This function runs strictly during the container image build phase.
    It forces fastembed to download and cache the model weights directly
    into the container's file system.
    """
    from fastembed import TextEmbedding

    print(f"Baking model weights for {MODEL_NAME} into image...")
    # Initialize the model once to trigger the download into our target cache directory
    _ = TextEmbedding(model_name=MODEL_NAME, cache_dir=CACHE_DIR)
    print("Model weights successfully baked!")


# Define a persistent volume for our SQLite database file
volume = modal.Volume.from_name("quota-storage-vol", create_if_missing=True)

# Build the container environment with the required dependencies
app_image = (
    modal.Image.debian_slim()
    .uv_pip_install(
        "fastapi[standard]",
        "pydantic",
        "fastembed",
        "scikit-learn",
        "numpy",
        "pyjwt[crypto]",
        "requests",
    )
    .env({"FASTEMBED_CACHE_DIR": CACHE_DIR})
    # Run the download function during build time so it never happens at runtime
    .run_function(download_model_weights)
)

# Initialize the Modal App
app = modal.App("quicklabel-backend", image=app_image, volumes={DB_DIR: volume})

# # Create the standard FastAPI instance
# web_app = FastAPI()

# # Allow cross-origin requests
# web_app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Adjust this to match your frontend port if needed
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

BATCH_SIZE = 32

ALLOWED_ORIGINS = ["https://main.d1cwi5hq26s827.amplifyapp.com"]  # Amazon app


# AWS Cognito Parameters (Update these with your specific AWS resource IDs)
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID", "us-east-1_Y1sBfCf1r")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID", "21vufs31733qum04vh88v8t9kt")

# Calculated URL path pointing to your user pool's public verification endpoints
COGNITO_ISSUER = (
    f"https://cognito-idp.{AWS_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"
)
JWKS_URL = f"{COGNITO_ISSUER}/.well-known/jwks.json"

# In-memory global cache to avoid hit latencies on subsequent warm container hits
JWKS_CACHE = {}
