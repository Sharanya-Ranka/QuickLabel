import json
import random
import numpy as np
from fastembed import TextEmbedding
from sklearn.linear_model import LogisticRegression

# Configuration
NUM_UNCERTAIN = 2 * 5  # 2 * 10
NUM_ROUNDS = 5

# Downloads and initializes the model
embedding_model = TextEmbedding(
    model_name="BAAI/bge-small-en-v1.5", cache_dir="./model_cache"
)
print("Loaded model", flush=True)


def embed_batch(batch):
    """Embeds a batch of text documents using the preloaded embedding model."""
    return list(embedding_model.embed(batch))
