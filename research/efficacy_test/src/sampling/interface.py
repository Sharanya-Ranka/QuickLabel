# sampling/interface.py
from abc import ABC, abstractmethod
import torch


class SamplingInterface(ABC):
    @abstractmethod
    def get_next_samples(self):
        """All samplers must implement this method."""
        pass
