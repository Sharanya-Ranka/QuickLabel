import asyncio
import json
import time
from typing import List
import modal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import numpy as np

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


# Build the container environment with the required dependencies
app_image = (
    modal.Image.debian_slim()
    .uv_pip_install(
        "fastapi[standard]", "pydantic", "fastembed", "scikit-learn", "numpy"
    )
    .env({"FASTEMBED_CACHE_DIR": CACHE_DIR})
    # Run the download function during build time so it never happens at runtime
    .run_function(download_model_weights)
)

# Initialize the Modal App
app = modal.App("fastembed-sse-backend", image=app_image)

# Create the standard FastAPI instance
web_app = FastAPI()

# Allow cross-origin requests
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this to match your frontend port if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BATCH_SIZE = 32


# -----------------------------------------------------------------------------
# 2. PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------
class DataItem(BaseModel):
    id: str
    text: str


class EmbedRequest(BaseModel):
    items: List[DataItem]


# -----------------------------------------------------------------------------
# 3. CORE APP STATE & EMBEDDING GENERATOR
# -----------------------------------------------------------------------------
# We load the model globally within the container context. Because the weights
# are already cached inside the image, this initialization is lightning fast.
# from fastembed import TextEmbedding

# embedding_model = TextEmbedding(model_name=MODEL_NAME, cache_dir=CACHE_DIR)


@app.cls(
    cpu=0.125, memory=1024, min_containers=0, max_containers=2, scaledown_window=20
)
class BatchEmbedder:
    @modal.enter()
    def initialize_model(self):
        from fastembed import TextEmbedding

        self.embedding_model = TextEmbedding(model_name=MODEL_NAME, cache_dir=CACHE_DIR)

    @modal.method()
    def process_batch(self, batch: List[DataItem]) -> List[dict]:
        texts = [item.text for item in batch]
        embeddings = self.embedding_model.embed(texts)

        results = [
            {
                "id": item.id,
                "embedding": embedding.tolist(),
            }
            for item, embedding in zip(batch, embeddings)
        ]

        progress_payload = {
            "results": results,
        }

        # print(f"Completed chunk")

        # Return raw arrays back up to the orchestrator layer
        return f"data: {json.dumps(progress_payload)}\n\n"

    @modal.method()
    def process_batch_minibatch(self, batch: List[DataItem]) -> List[dict]:
        INTERNAL_BATCH_SIZE = 32
        results = []
        for i in range(0, len(batch), INTERNAL_BATCH_SIZE):
            mini_batch = batch[i : i + INTERNAL_BATCH_SIZE]
            texts = [item.text for item in mini_batch]
            embeddings = self.embedding_model.embed(texts)

            results.extend(
                [
                    {
                        "id": item.id,
                        "embedding": embedding.tolist(),
                    }
                    for item, embedding in zip(mini_batch, embeddings)
                ]
            )

        progress_payload = {
            "results": results,
        }

        # Return raw arrays back up to the orchestrator layer
        return f"data: {json.dumps(progress_payload)}\n\n"


# @app.function(
#     cpu=0.5, memory=2048, min_containers=4, max_containers=4, scaledown_window=20
# )
# def embed_batch(items: List[DataItem]):
#     INTERNAL_BATCH_SIZE = 32
#     results = []
#     for i in range(0, len(items), INTERNAL_BATCH_SIZE):

#         texts = [item.text for item in items[i : i + INTERNAL_BATCH_SIZE]]
#         embeddings = list(embedding_model.embed(texts))

#         results.extend(
#             [
#                 {
#                     "id": item.id,
#                     "embedding": embedding.tolist(),
#                 }
#                 for item, embedding in zip(
#                     items[i : i + INTERNAL_BATCH_SIZE], embeddings
#                 )
#             ]
#         )

#     progress_payload = {
#         "results": results,
#     }

#     return f"data: {json.dumps(progress_payload)}\n\n"


# -----------------------------------------------------------------------------
# 4. FASTAPI ROUTE
# -----------------------------------------------------------------------------
@web_app.post("/api/embed-stream")
async def embed_stream(request: EmbedRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="The items array cannot be empty.")

    batches = (
        request.items[i : i + BATCH_SIZE]
        for i in range(0, len(request.items), BATCH_SIZE)
    )

    print(type(batches))

    return StreamingResponse(
        BatchEmbedder().process_batch.map(batches, order_outputs=False),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# -----------------------------------------------------------------------------
# 5. MODAL DEPLOYMENT CONFIGURATION
# -----------------------------------------------------------------------------
@app.function(
    scaledown_window=30,  # Scale back to zero after 5 minutes (300 seconds) of inactivity
    cpu=0.125,  # Request 2 CPU cores (adjust based on load demands)
    memory=1024,  # 2GB RAM is plenty for bge-small
    min_containers=0,
)
@modal.concurrent(max_inputs=50)
@modal.asgi_app()
def fastapi_app():
    return web_app
