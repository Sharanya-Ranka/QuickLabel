from pydantic import BaseModel, Field, model_validator
from typing import Callable, Any
import pandas as pd


class DataloaderConfig(BaseModel):
    data_filepath: str = ""
    num_classes: int = 5
    dataframe_processor_hook: Callable[[pd.DataFrame], pd.DataFrame] = Field(
        default=lambda df: df, exclude=True
    )
