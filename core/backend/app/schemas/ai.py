from pydantic import BaseModel


class AIInvokeRequest(BaseModel):
    plugin_id: str
    task_type: str
    payload: dict


class AIInvokeResponse(BaseModel):
    model: str
    output: dict
