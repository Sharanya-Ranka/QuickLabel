import torch
import torch.nn as nn
import torch.optim as optim
from pydantic import BaseModel, Field
from src.models.interface import ModelInterface
from src.types import Datapoint
from config.model_config import NeuralNetworkConfig
import logging
import random
import numpy as np

logger = logging.getLogger(__name__)


# 2. Define the Dynamic PyTorch Model
class ClassificationNet(nn.Module):
    def __init__(self, config: NeuralNetworkConfig):
        super().__init__()
        self.config = config

        # Select activation function to Relu
        self.activation = nn.ReLU()

        # Use nn.ModuleList to hold dynamically created layers
        self.layers = nn.ModuleList()

        # Track the input dimension of the current layer as we loop
        current_dim = config.input_dim

        # Build hidden layers
        for hidden_dim in config.hidden_layers:
            self.layers.append(nn.Linear(current_dim, hidden_dim))
            current_dim = hidden_dim  # Output of this layer is input to the next

        # Final output layer
        self.output_layer = nn.Linear(current_dim, config.num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Pass sequentially through hidden layers and activations
        for layer in self.layers:
            x = self.activation(layer(x))

        # Pass through the output layer (no activation here if using CrossEntropyLoss)
        x = self.output_layer(x)
        return x


class NNClassificationModel(ModelInterface):
    def __init__(self, config: NeuralNetworkConfig):
        self.config = config
        self.model = ClassificationNet(config)
        trainable_params = sum(
            p.numel() for p in self.model.parameters() if p.requires_grad
        )
        logger.info(f"Trainable params={trainable_params}")
        self.optimizer = optim.Adam(
            self.model.parameters(), lr=self.config.learning_rate
        )

    def predict(self, x: list[Datapoint]) -> list[float]:
        self.model.eval()  # Set model to evaluation mode
        batchX = torch.tensor(np.array([dp.embedding for dp in x]))
        with torch.no_grad():
            predY = self.model(batchX)
            pred_normalised: torch.Tensor = nn.Softmax(dim=-1)(predY)
            # breakpoint()
            return pred_normalised.numpy()

    def _get_weight_balances(self, dataset: list[Datapoint]):
        # Add 1 "pseudocount" to each class (Laplace/Additive Smoothing)
        label_count = [1] * self.config.num_classes
        for dp in dataset:
            label_count[dp.label] += 1

        total = sum(label_count)
        inverse_weights = total / torch.tensor(label_count, dtype=torch.float32)
        normalized_weights = inverse_weights / inverse_weights.mean()

        return normalized_weights

    def _get_num_correct(self, predY: torch.Tensor, batchY: torch.Tensor):
        return (predY.argmax(dim=-1) == batchY).sum()

    def fit(self, dataset: list[Datapoint]):
        len_dataset = len(dataset)
        train_indices = list(range(len_dataset))
        batch_size = self.config.batch_size
        # None of the datapoints should have a None label
        assert all(dataset[i].label != None for i in range(len_dataset))

        self.model.train()
        weight_balances = self._get_weight_balances(dataset)
        loss_criterion = nn.CrossEntropyLoss(weight_balances)
        for epoch in range(self.config.epochs):
            # logger.info(f"Beginning epoch {epoch}")
            random.shuffle(train_indices)

            total_batch_loss = 0
            total_batch_correct = 0

            for batch_start in range(0, len_dataset, batch_size):
                batch_inds = train_indices[batch_start : batch_start + batch_size]
                batchX = torch.tensor([dataset[i].embedding for i in batch_inds])
                batchY = torch.tensor([dataset[i].label for i in batch_inds])

                predY = self.model.forward(batchX)
                loss = loss_criterion(predY, batchY)
                num_correct = self._get_num_correct(predY, batchY)

                self.optimizer.zero_grad()
                loss.backward()
                self.optimizer.step()

                total_batch_loss += loss.item()
                total_batch_correct += num_correct.item()

            num_batches = int(np.ceil(len_dataset / batch_size))
            logger.debug(
                f"Epoch {epoch}: Loss={total_batch_loss/num_batches :.4f} Acc={total_batch_correct/len_dataset :.3f}"
            )

        logger.debug(f"Model trained")


# # --- Example Usage (Combining the Factory/Runtime Concepts) ---

# # 1. Configuration defined (maybe missing input_dim initially)
# raw_config_data = {
#     "num_classes": 3,
#     "hidden_layers": [256, 128, 64],
#     "activation_function": "relu",
# }

# # 2. Runtime data arrives, telling us the input dimension
# mock_dataset = torch.randn(10, 45)  # 10 samples, 45 features
# runtime_input_dim = mock_dataset.shape[1]  # 45

# # 3. Complete the config and instantiate the model
# config = NNModelConfig(input_dim=runtime_input_dim, **raw_config_data)
# model = DynamicNet(config)

# # 4. Run a forward pass
# output = model(mock_dataset)
# print(f"Model Structure:\n{model}")
# print(f"Output Shape: {output.shape}")  # Should be [10, 3]
