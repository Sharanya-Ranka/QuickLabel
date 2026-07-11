from typing import Literal, Union
from pydantic import BaseModel, Field


class BaseModelConfig(BaseModel):
    num_classes: int = 0
    input_dim: int = 0


# 1. Define specific configs, explicitly setting the model_type as a Literal
class NeuralNetworkConfig(BaseModelConfig):
    model_type: Literal["neural_network"] = "neural_network"
    hidden_layers: list[int] = Field(default_factory=lambda: [128, 64])
    activation_function: str = "relu"
    optimizer: str = "adam"
    loss_function: str = "sparse_categorical_crossentropy"
    epochs: int = 10
    batch_size: int = 32
    learning_rate: float = 0.001
    metrics: list[str] = Field(default_factory=lambda: ["accuracy"])


class RandomForestClassifierConfig(BaseModelConfig):
    model_type: Literal["random_forest"] = "random_forest"
    max_depth: int = 5
    criterion: Literal["gini", "entropy"] = "gini"
    # min_samples_split: int = 2
    # min_samples_leaf: int = 1


class HistGradientBoostingClassifierConfig(BaseModelConfig):
    model_type: Literal["gradient_boosting"] = "gradient_boosting"


class OracleConfig(BaseModelConfig):
    model_type: Literal["oracle"] = "oracle"


# 2. Create the Master Config using a Union with a discriminator
# class ModelConfig
ModelConfig = Union[
    NeuralNetworkConfig,
    RandomForestClassifierConfig,
    HistGradientBoostingClassifierConfig,
    OracleConfig,
]
