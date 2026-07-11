from config.sampling_config import EntropySamplingConfig
from src.sampling.interface import SamplingInterface
from src.types import Datapoint
import numpy as np
import scipy.stats as scistats
import torch


class EntropySampler(SamplingInterface):
    def __init__(self, config: EntropySamplingConfig):
        self.config = config
        self.rng = np.random.default_rng(seed=self.config.seed)

    def get_next_samples(self, dataset: list[Datapoint], model_predictions: np.ndarray):
        entropy = scistats.entropy(model_predictions, axis=1)
        entropy_based_sorted_inds = np.flip(np.argsort(entropy))

        random_inds_to_choose = int(self.config.random_prob * self.config.num_items)
        entropy_inds_to_choose = self.config.num_items - random_inds_to_choose

        random_inds = self.rng.choice(
            entropy_based_sorted_inds[entropy_inds_to_choose:],
            random_inds_to_choose,
            replace=False,
        )
        all_inds = list(entropy_based_sorted_inds[:entropy_inds_to_choose]) + list(
            random_inds
        )
        # breakpoint()

        return [dataset[i] for i in all_inds]
