from config.app_config import DataloaderConfig, PreprocessingConfig
import pandas as pd
from pydantic import BaseModel, ConfigDict, computed_field, Field
import numpy as np
from fastembed import TextEmbedding
import logging
from src.types import Datapoint
import uuid

logger = logging.getLogger(__name__)


class DataLoader:
    def __init__(
        self, data_config: DataloaderConfig, preprocessing_config: PreprocessingConfig
    ):
        self.data_config = data_config
        self.preprocessing_config = preprocessing_config
        self.datapoints: list[Datapoint] = []

        embed_model_name = self.preprocessing_config.embedding_model_name
        self.embedding_model = TextEmbedding(
            model_name=embed_model_name,
            cache_dir="./model_cache",
        )
        breakpoint()
        logger.info(f"Loaded embedding model {embed_model_name}")

    def load_data(self):
        # Implement data loading logic based on the configuration
        df = pd.read_csv(
            self.data_config.data_filepath,  # nrows=self.data_config.num_examples
        )
        df = self.data_config.dataframe_processor_hook(df)
        # breakpoint()
        for _, row in df.iterrows():
            datapoint = Datapoint(text=row.iloc[0], label=row.iloc[1], id=uuid.uuid4())
            self.datapoints.append(datapoint)

        logger.info("Loaded datapoints")
        # breakpoint()

        doc_texts = list(doc.text for doc in self.datapoints)
        doc_embed = self.embedding_model.embed(doc_texts)

        for doc, embed in zip(self.datapoints, doc_embed):
            doc.embedding = embed

        logger.info("Extracted and assigned embeddings")


def get_dataloader(
    data_config: DataloaderConfig, preprocessing_config: PreprocessingConfig
):
    return DataLoader(
        data_config=data_config, preprocessing_config=preprocessing_config
    )
