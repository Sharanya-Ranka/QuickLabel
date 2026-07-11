from pydantic import BaseModel, Field, model_validator
from typing import Literal, Union


class BaseSamplingConfig(BaseModel):
    num_items: int = 10
    random_prob: float = 0.05
    seed: int = 42

    # @model_validator(mode="after")
    # def validate_sampling_threshold(self) -> "BaseSamplingConfig":
    #     # Calculate the expected number of random samples
    #     expected_samples = self.random_prob * self.num_items

    #     if expected_samples < 1.0:
    #         raise ValueError(
    #             f"Invalid configuration: random_prob * num_items must be >= 1. "
    #             f"Got {self.random_prob} * {self.num_items} = {expected_samples:.2f}"
    #         )

    #     return self


class MarginSamplingConfig(BaseSamplingConfig):
    sampling_type: Literal["margin"] = "margin"


class EntropySamplingConfig(BaseSamplingConfig):
    sampling_type: Literal["entropy"] = "entropy"


SamplingConfig = Union[MarginSamplingConfig, EntropySamplingConfig]
