import asyncio
import json
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from research.tensorflow_try_backend.src.embed import (
    embed_batch,
)  # Import the embedding function from embed.py
import time

app = FastAPI()

# Allow cross-origin requests from your frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Adjust this to match your Vite port (e.g., ["http://localhost:5173"])
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BATCH_SIZE = 128  # Low batch size to make progress updates visible


# Define the data shape expected in the request body using Pydantic
class DataItem(BaseModel):
    id: str
    text: str


class EmbedRequest(BaseModel):
    items: List[DataItem]


# Asynchronous generator to calculate batches and yield SSE data formatting
async def embedding_progress_generator(items: List[DataItem]):
    total = len(items)
    start_time = time.time()

    for i in range(0, total, BATCH_SIZE):
        batch = items[i : i + BATCH_SIZE]

        # --- CRITICAL STEP ---
        # Calculate your text embeddings here on the server.
        # e.g., embeddings = model.encode([item.text for item in batch])
        # ---------------------

        embeddings = embed_batch(
            [item.text for item in batch]
        )  # Call the embedding function

        # Simulate ML model inference latency (e.g., 800ms)
        # await asyncio.sleep(0.8)
        print(
            f"Processed batch {i // BATCH_SIZE + 1} of {total // BATCH_SIZE + 1}",
            flush=True,
        )

        # Map calculated embedding arrays back to their relative item IDs
        results = [
            {
                "id": item.id,
                "embedding": embedding.tolist(),  # Use the actual embedding from the batch
            }
            for item, embedding in zip(batch, embeddings)
        ]

        progress_payload = {
            "results": results,
            "progress": min(i + BATCH_SIZE, total),
            "total": total,
        }

        # Format explicitly using the SSE protocol requirement: "data: <JSON>\n\n"
        yield f"data: {json.dumps(progress_payload)}\n\n"

    end_time = time.time()
    print(
        f"Completed embedding for {total} items in {end_time - start_time:.2f} seconds",
        flush=True,
    )
    # Signal that the entire processing stream is successfully completed
    yield "data: [DONE]\n\n"


@app.post("/api/embed-stream")
async def embed_stream(request: EmbedRequest):
    if not request.items:
        raise HTTPException(status_code=400, detail="The items array cannot be empty.")

    # Return a StreamingResponse running our asynchronous data generator
    return StreamingResponse(
        embedding_progress_generator(request.items),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
