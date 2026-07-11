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
    df = df.sample(n=1000).iloc[:, [1, 0]]
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
        hidden_layers=[10],
        epochs=10,
        batch_size=8,
        learning_rate=0.001,
    ),
    sampler=dict(num_items=10, random_prob=0.2, sampling_type="margin"),
    experiment=ExperimentConfig(num_active_loops=10, name="baseline"),
)
# NN Model configuration modifications

# Linear model
model_lin_config = baseline_config.model_copy(deep=True)
model_lin_config.model.hidden_layers = []
model_lin_config.experiment.name = "model:linear"

# Deeper models
model1_config = baseline_config.model_copy(deep=True)
model1_config.model.hidden_layers = [10, 10]
model1_config.experiment.name = "model:10_10"

model3_config = baseline_config.model_copy(deep=True)
model3_config.model.hidden_layers = [10, 10, 10]
model3_config.experiment.name = "model:10_10_10"

# Narrower but deeper model
model2_config = baseline_config.model_copy(deep=True)
model2_config.model.hidden_layers = [5, 5]
model2_config.experiment.name = "model:5_5"

# Larger batch size
model4_config = baseline_config.model_copy(deep=True)
model4_config.model.batch_size = 16
model4_config.experiment.name = "model:bs16"

# Smaller batch size
model5_config = baseline_config.model_copy(deep=True)
model5_config.model.batch_size = 4
model5_config.experiment.name = "model:bs4"

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

# -----------------------------------
# Experiment configs
# Check if modifying the number of loops (with a control on total items labeled) changes accuracy
experiment1_config = baseline_config.model_copy(deep=True)
experiment1_config.experiment.num_active_loops = 5
experiment1_config.sampler.num_items = 20
experiment1_config.experiment.name = "experiment:active5"

experiment2_config = baseline_config.model_copy(deep=True)
experiment2_config.experiment.num_active_loops = 20
experiment2_config.sampler.num_items = 5
experiment2_config.experiment.name = "experiment:active20"

# -------------------------------------
# Different embedding model
embd_config = baseline_config.model_copy(deep=True)
embd_config.preprocessing.embedding_model_name = "BAAI/bge-base-en-v1.5"
embd_config.preprocessing.embedding_dim = 768
embd_config.experiment.name = "embedding:bge-base"
embd_config = embd_config.model_validate(embd_config)


# breakpoint()
all_configs = [
    # baseline_config,
    # # Modifying model depth
    # model_lin_config,
    # model1_config,
    # model3_config,
    # model2_config,
    # model4_config,
    # model5_config,
    # # Sampling configs
    # sampler0_config,
    # sampler1_config,
    # sampler2_config,
    # # Experiment configs
    # experiment1_config,
    # experiment2_config,
    # # Embedding configs
    embd_config,
]
