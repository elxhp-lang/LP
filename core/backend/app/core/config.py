import os
from dataclasses import dataclass
from typing import Mapping

from pydantic import BaseModel


class Settings(BaseModel):
    jwt_secret: str = "change-me-in-env"
    jwt_algorithm: str = "HS256"
    token_exp_minutes: int = 60
    database_url: str = "sqlite:///./lp.db"


settings = Settings()


@dataclass(frozen=True)
class AISettings:
    """每次调用时读取环境变量，便于测试与进程外改配置。"""

    provider: str
    api_key: str | None
    base_url: str | None
    model: str
    task_model_map: Mapping[str, str]


def get_ai_settings() -> AISettings:
    task_model_map_raw = (os.environ.get("AI_TASK_MODEL_MAP") or "").strip()
    task_model_map: dict[str, str] = {}
    if task_model_map_raw:
        for pair in task_model_map_raw.split(","):
            left, _, right = pair.partition(":")
            task = left.strip().lower()
            model = right.strip()
            if task and model:
                task_model_map[task] = model
    return AISettings(
        provider=(os.environ.get("AI_PROVIDER") or "stub").lower().strip(),
        api_key=os.environ.get("AI_API_KEY") or None,
        base_url=(os.environ.get("AI_BASE_URL") or "").strip() or None,
        model=(os.environ.get("AI_MODEL") or "gpt-3.5-turbo").strip(),
        task_model_map=task_model_map,
    )
