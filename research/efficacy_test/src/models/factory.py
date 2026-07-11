from config.model_config import ModelConfig
from src.models.neural_network import NNClassificationModel
from src.models.random_forest import RandomForestModel
from src.models.gradient_boosting import GradientBoostingModel
from src.models.oracle import OracleModel


def get_model(config: ModelConfig):
    """
    Factory function to instantiate a model based on the provided configuration.
    """
    if config.model_type == "neural_network":
        return NNClassificationModel(config)
    elif config.model_type == "random_forest":
        return RandomForestModel(config)
    elif config.model_type == "gradient_boosting":
        return GradientBoostingModel(config)
    elif config.model_type == "oracle":
        return OracleModel(config)
    else:
        raise ValueError(f"Unsupported model type: {config.model_type}")
