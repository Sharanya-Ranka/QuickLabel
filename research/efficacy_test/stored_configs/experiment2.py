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
import logging


def agnews_df_processor(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sample(n=5000).iloc[:, [1, 0]]
    df["Class Index"] = df["Class Index"] - 1
    # breakpoint()
    return df


baseline_config = AppConfig(
    dataloader=DataloaderConfig(
        data_filepath=r"D:\Sharanya Personal\QuickLabel\experiments\data\agnews_train.csv\train.csv",
        num_classes=4,
        dataframe_processor_hook=agnews_df_processor,
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
    sampler=dict(num_items=5, random_prob=0.2, sampling_type="margin"),
    experiment=ExperimentConfig(num_active_loops=100, name="baseline"),
)
# ----------------------------------
model0_config = baseline_config.model_copy(deep=True)
model0_config.model.epochs = 50
model0_config.experiment.name = "model:epochs50"

model1_config = baseline_config.model_copy(deep=True)
model1_config.model.learning_rate = 0.01
model1_config.experiment.name = "model:lr0_01"

# ----------------------------------
# Sampler modifications
# Check if changing proportion of random elements has an impact on final accuracy
sampler0_config = baseline_config.model_copy(deep=True)
sampler0_config.sampler.random_prob = 0.0
sampler0_config.experiment.name = "sampler:p0"

sampler1_config = baseline_config.model_copy(deep=True)
sampler1_config.sampler.random_prob = 0.8
sampler1_config.experiment.name = "sampler:p0_8"

sampler2_config = baseline_config.model_copy(deep=True)
sampler2_config.sampler.random_prob = 1
sampler2_config.experiment.name = "sampler:p1"

sampler3_config = baseline_config.model_copy(deep=True)
sampler3_config.sampler.random_prob = 0.4
sampler3_config.experiment.name = "sampler:p0_4"

# breakpoint()
all_configs = [
    baseline_config,
    # Modifying model attributes
    model0_config,
    model1_config,
    # Sampling configs
    sampler0_config,
    sampler1_config,
    sampler2_config,
    sampler3_config,
]
