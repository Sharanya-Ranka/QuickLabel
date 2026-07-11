from config.sampling_config import MarginSamplingConfig
from src.sampling.interface import SamplingInterface
from src.types import Datapoint
import numpy as np
import torch


class MarginSampler(SamplingInterface):
    def __init__(self, config: MarginSamplingConfig):
        self.config = config
        self.rng = np.random.default_rng(seed=self.config.seed)

    def get_next_samples(self, dataset: list[Datapoint], model_predictions: np.ndarray):
        sorted_predictions = np.sort(model_predictions, axis=-1)
        margins = sorted_predictions[:, -1] - sorted_predictions[:, -2]
        margin_based_sorted_inds = np.argsort(margins)

        random_inds_to_choose = int(self.config.random_prob * self.config.num_items)
        margin_inds_to_choose = self.config.num_items - random_inds_to_choose

        random_inds = self.rng.choice(
            margin_based_sorted_inds[margin_inds_to_choose:],
            random_inds_to_choose,
            replace=False,
        )
        all_inds = list(margin_based_sorted_inds[:margin_inds_to_choose]) + list(
            random_inds
        )
        # breakpoint()

        return [dataset[i] for i in all_inds]
