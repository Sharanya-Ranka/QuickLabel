from pydantic import BaseModel
from typing import List


# -----------------------------------------------------------------------------
# 2. PYDANTIC SCHEMAS
# -----------------------------------------------------------------------------
class DataItem(BaseModel):
    id: str
    text: str


class EmbedRequest(BaseModel):
    items: List[DataItem]


class EmbedRequestInfo(BaseModel):
    num_items: int
