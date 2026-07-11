from src.sampling.margin_sampling import MarginSampler
from src.sampling.entropy_sampling import EntropySampler
from config.sampling_config import SamplingConfig


def get_sampler(config: SamplingConfig):
    if config.sampling_type == "margin":
        return MarginSampler(config)
    elif config.sampling_type == "entropy":
        return EntropySampler(config)
    else:
        raise ValueError(f"No sampler available for type={config.sampling_type}")
