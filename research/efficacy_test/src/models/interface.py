# models/interface.py
from abc import ABC, abstractmethod
import torch


class ModelInterface(ABC):
    @abstractmethod
    def predict(self):
        """All models must implement this method."""
        pass

    @abstractmethod
    def fit(self, dataset):
        """All models must implement this method."""
        pass
