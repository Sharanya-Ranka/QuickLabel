from config.app_config import AppConfig
from src.dataloading.factory import get_dataloader
from src.models.factory import get_model
from src.sampling.factory import get_sampler
from src.types import Datapoint, ExperimentLog
import numpy as np
import scipy.stats as scistats
import logging

logger = logging.getLogger(__name__)


def get_seed_data(dataset: list[Datapoint]):
    seed_list = []

    labels_not_added = set(dp.label for dp in dataset)
    # Get exactly 1 datapoint per class to begin with
    for dp in dataset:
        if dp.label in labels_not_added:
            labels_not_added.discard(dp.label)
            seed_list.append(dp)

    return seed_list


def get_stats(
    labeled_data: list[Datapoint], all_data: list[Datapoint], predictions: list
):
    frac_labeled = len(labeled_data) / len(all_data)

    all_labels = [dp.label for dp in all_data]
    predicted_labels_order = np.argsort(predictions, axis=-1)
    pprob_sorted = np.sort(predictions, axis=-1)
    margins = pprob_sorted[:, -1] - pprob_sorted[:, -2]
    entropies = scistats.entropy(predictions, axis=1)

    recall_k = []
    correct_till_now = np.full(len(all_labels), False)
    for i in range(1, 4):
        correct_till_now |= predicted_labels_order[:, -i] == all_labels
        recall_k.append(correct_till_now.mean())

    got_right = np.where(predicted_labels_order[:, -1] == all_labels)[0]
    got_wrong = np.where(predicted_labels_order[:, -1] != all_labels)[0]

    margin_when_right = margins[got_right].mean()
    margin_when_wrong = margins[got_wrong].mean()
    margin_mean = margins.mean()

    entropy_when_right = entropies[got_right].mean()
    entropy_when_wrong = entropies[got_wrong].mean()
    entropy_mean = entropies.mean()

    # breakpoint()

    logger.info(
        f"Stats: Labeled={len(labeled_data)}({frac_labeled * 100:.2f}%), recall_k={' '.join([f'{rv*100:.2f}' for rv in recall_k])}, margins=(right={margin_when_right:3f}, wrong={margin_when_wrong:3f})"
    )
    # breakpoint()
    return dict(
        num_labeled_data=len(labeled_data),
        num_all_data=len(all_data),
        recall_k=[float(rk) for rk in recall_k],
        num_correct=len(got_right),
        margins=dict(
            average=float(margin_mean),
            when_right=float(margin_when_right),
            when_wrong=float(margin_when_wrong),
        ),
        entropy=dict(
            average=float(entropy_mean),
            when_right=float(entropy_when_right),
            when_wrong=float(entropy_when_wrong),
        ),
    )


def run_active_loop(app_config: AppConfig) -> ExperimentLog:
    dataset = get_dataloader(app_config.dataloader, app_config.preprocessing)
    model = get_model(app_config.model)
    sampler = get_sampler(app_config.sampler)
    log = ExperimentLog(
        experiment_name=app_config.experiment.name,
        run_num=app_config.experiment.run_num,
        experiment_config=app_config,
    )

    labeled_data: list[Datapoint] = []
    dataset.load_data()
    labeled_data.extend(get_seed_data(dataset.datapoints))
    for loop in range(app_config.experiment.num_active_loops):
        model.fit(labeled_data)
        model_predictions = model.predict(dataset.datapoints)
        step_stats = get_stats(labeled_data, dataset.datapoints, model_predictions)
        log.step_info.append(step_stats)
        next_samples = sampler.get_next_samples(dataset.datapoints, model_predictions)
        labeled_data.extend(next_samples)

    return log
