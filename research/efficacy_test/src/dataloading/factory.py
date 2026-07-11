from config.app_config import DataloaderConfig, PreprocessingConfig
from src.dataloading.dataloader import DataLoader


def get_dataloader(
    data_config: DataloaderConfig, preprocessing_config: PreprocessingConfig
):
    return DataLoader(
        data_config=data_config, preprocessing_config=preprocessing_config
    )
