from sklearn.ensemble import RandomForestClassifier
import torch
import torch.nn as nn
import torch.optim as optim
from pydantic import BaseModel, Field
from src.models.interface import ModelInterface
from src.types import Datapoint
from config.model_config import RandomForestClassifierConfig
import logging
import random
import numpy as np

logger = logging.getLogger(__name__)


class RandomForestModel(ModelInterface):
    def __init__(self, config: RandomForestClassifierConfig):
        self.config = config
        self.model = RandomForestClassifier(
            max_depth=config.max_depth, criterion=config.criterion
        )

    def predict(self, dataset: list[Datapoint]) -> list[list[float]]:
        X = np.array([dp.embedding for dp in dataset])
        return self.model.predict_proba(X)

    def fit(self, dataset: list[Datapoint]):
        X = np.array([dp.embedding for dp in dataset])
        y = np.array([dp.label for dp in dataset])
        self.model.fit(X=X, y=y)
