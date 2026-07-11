from config.model_config import (
    NeuralNetworkConfig,
    RandomForestClassifierConfig,
    ModelConfig,
)
from config.sampling_config import SamplingConfig
from pydantic import BaseModel, Field, model_validator
from typing import Literal, Union
from typing import Callable, Any
from config.dataloader_config import DataloaderConfig


class PreprocessingConfig(BaseModel):
    embedding_model_name: str = "all-MiniLM-L6-v2"  # Default embedding model
    embedding_dim: int = 384


class ExperimentConfig(BaseModel):
    num_active_loops: int = 10
    name: str = "experiment_name"
    run_num: int = 0


class AppConfig(BaseModel):
    dataloader: DataloaderConfig = DataloaderConfig()
    preprocessing: PreprocessingConfig = PreprocessingConfig()
    model: ModelConfig = Field(..., discriminator="model_type")
    sampler: SamplingConfig = Field(..., discriminator="sampling_type")
    experiment: ExperimentConfig = ExperimentConfig()

    @model_validator(mode="after")
    def sync_shared_attributes(self) -> "AppConfig":
        # Inject the single source of truth into the model configuration
        self.model.num_classes = self.dataloader.num_classes
        self.model.input_dim = self.preprocessing.embedding_dim
        return self
