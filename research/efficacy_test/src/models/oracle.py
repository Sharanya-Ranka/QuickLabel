import torch
import torch.nn as nn
import torch.optim as optim
from pydantic import BaseModel, Field
from src.models.interface import ModelInterface
from src.types import Datapoint
from config.model_config import OracleConfig
import logging
import random
import numpy as np

logger = logging.getLogger(__name__)


class OracleModel(ModelInterface):
    def __init__(self, config: OracleConfig):
        self.config = config

    def fit(self, dataset: list[Datapoint]):
        # Do nothing
        return

    def predict(self, dataset: list[Datapoint]):
        # The oracle looks up the true label in the datapoints and assigns those probability 1
        probs = np.zeros(
            shape=(len(dataset), self.config.num_classes), dtype=np.float32
        )
        for i, dp in enumerate(dataset):
            assert (
                dp.label is not None
            ), "OracleModel: datapoint label in predict found to be None"
            probs[i, dp.label] = 1

        return probs
