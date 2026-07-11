from src.runner.efficacy_test import run_active_loop
from config.app_config import (
    AppConfig,
    DataloaderConfig,
    PreprocessingConfig,
    ExperimentConfig,
)
from config.model_config import ModelConfig
from config.sampling_config import SamplingConfig
import pandas as pd
import numpy as np
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def agnews_df_processor(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sample(n=1000).iloc[:, [1, 0]]
    df["Class Index"] = df["Class Index"] - 1
    # breakpoint()
    return df


def dbpedia_df_processor(df: pd.DataFrame) -> pd.DataFrame:
    df["l1_encoded"] = df["l1"].astype("category").cat.codes
    df = df[["text", "l1_encoded"]]

    random_mask = np.random.rand(len(df)) < 0.7
    condition = df["l1_encoded"] == 0
    df = df[~(condition & random_mask)]

    sampled_df = df.sample(n=1000)
    nunique = sampled_df.iloc[:, 1].nunique()
    while nunique < 9:
        logger.debug(f"Not all classes found, resampling from dataset")
        sampled_df = df.sample(n=1000)
        nunique = sampled_df.iloc[:, 1].nunique()

    df = sampled_df
    df["text"] = df["text"].astype(str).str[:50]

    # breakpoint()
    return df


def bank77_df_processor(df: pd.DataFrame) -> pd.DataFrame:
    sample_size = 3000
    sampled_df = df.sample(n=sample_size)
    nunique = sampled_df.iloc[:, 1].nunique()
    while nunique < 77:
        logger.debug(f"Not all classes found, resampling from dataset")
        sampled_df = df.sample(n=sample_size)
        nunique = sampled_df.iloc[:, 1].nunique()

    df = sampled_df
    df.iloc[:, 0] = df.iloc[:, 0].astype(str).str[:50]
    # breakpoint()
    return df


app_config = AppConfig(
    dataloader=DataloaderConfig(
        data_filepath=r"D:\Sharanya Personal\QuickLabel\experiments\data\bank77_dev.csv",
        num_classes=77,
        dataframe_processor_hook=bank77_df_processor,
    ),
    preprocessing=PreprocessingConfig(
        embedding_model_name="BAAI/bge-small-en-v1.5", embedding_dim=384
    ),
    model=dict(
        model_type="neural_network",
        hidden_layers=[],
        epochs=10,
        batch_size=4,
        learning_rate=0.001,
    ),
    sampler=dict(num_items=5, random_prob=0, sampling_type="margin"),
    experiment=ExperimentConfig(num_active_loops=50),
)

run_active_loop(app_config)
