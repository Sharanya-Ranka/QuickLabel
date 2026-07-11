from typing import Optional
from pydantic import BaseModel, ConfigDict, computed_field, Field, PlainSerializer
from config.app_config import AppConfig
import numpy as np
import uuid
from typing import Annotated

NumpyFloat = Annotated[
    np.float32 | np.float64,
    PlainSerializer(lambda x: float(x), return_type=float),
]


class Datapoint(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    text: str
    label: Optional[int] = None
    id: Optional[uuid.UUID] = None
    embedding: Optional[np.ndarray] = None


class StepInfo(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    num_labeled_data: int
    num_all_data: int
    recall_k: list[float]
    num_correct: int
    margins: dict[str, float]


class ExperimentLog(BaseModel):
    experiment_name: str
    run_num: int = 0
    experiment_config: AppConfig
    step_info: list[dict] = []
