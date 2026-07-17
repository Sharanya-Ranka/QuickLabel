from .modal_build import app, web_app, MODEL_NAME, CACHE_DIR, BATCH_SIZE, volume
from .modal_helpers import verify_and_update_quota
import modal
from pydantic import BaseModel
from typing import List, Annotated
from .types import DataItem, EmbedRequest
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

import json


@app.cls(
    cpu=0.125, memory=1024, min_containers=0, max_containers=1, scaledown_window=20
)
class BatchEmbedder:
    @modal.enter()
    def initialize_model(self):
        from fastembed import TextEmbedding

        self.embedding_model = TextEmbedding(model_name=MODEL_NAME, cache_dir=CACHE_DIR)

    @modal.method()
    def process_batch(self, batch: List[DataItem]) -> List[dict]:
        # print(f"Embedding a batch")
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


# -----------------------------------------------------------------------------
# 4. FASTAPI ROUTE
# -----------------------------------------------------------------------------
@web_app.post("/api/embed-stream")
def embed_stream(
    items: EmbedRequest, user_info: dict = Depends(verify_and_update_quota)
):
    # print(f"In embed_stream")
    if not items.items:
        raise HTTPException(status_code=400, detail="The items array cannot be empty.")

    batches = (
        items.items[i : i + BATCH_SIZE] for i in range(0, len(items.items), BATCH_SIZE)
    )
    # print(user_info)
    # print(f"Created batches")

    # print(type(batches))

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
    # print(f"In fastapi_app")
    return web_app
