import json
from typing import Any

import httpx

from app.core.config import get_ai_settings
from app.schemas.ai import AIInvokeRequest


def _chat_completions_url(base: str) -> str:
    b = base.rstrip("/")
    if b.endswith("/v1"):
        return f"{b}/chat/completions"
    return f"{b}/v1/chat/completions"


def _stub_response(payload: AIInvokeRequest, note: str | None = None) -> dict[str, Any]:
    out: dict[str, Any] = {
        "message": "ai dispatch placeholder (stub)",
        "pluginId": payload.plugin_id,
        "taskType": payload.task_type,
    }
    if note:
        out["hint"] = note
    return {"model": "stub", "output": out}


def _openai_compatible_invoke(payload: AIInvokeRequest) -> dict[str, Any]:
    cfg = get_ai_settings()
    base = cfg.base_url or "https://api.openai.com"
    url = _chat_completions_url(base)
    user_content = json.dumps(
        {
            "plugin_id": payload.plugin_id,
            "task_type": payload.task_type,
            "payload": payload.payload,
        },
        ensure_ascii=False,
    )
    body = {
        "model": cfg.model,
        "messages": [
            {
                "role": "system",
                "content": "You are assisting plugin tasks for a commerce platform. Reply concisely.",
            },
            {"role": "user", "content": user_content},
        ],
    }
    r = httpx.post(
        url,
        headers={
            "Authorization": f"Bearer {cfg.api_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=120.0,
    )
    r.raise_for_status()
    data = r.json()
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        text = json.dumps(data, ensure_ascii=False)[:4000]
    return {
        "model": cfg.model,
        "output": {
            "message": text,
            "pluginId": payload.plugin_id,
            "taskType": payload.task_type,
        },
    }


def invoke_model(payload: AIInvokeRequest) -> dict[str, Any]:
    cfg = get_ai_settings()
    prov = cfg.provider

    if prov in ("stub", "none", ""):
        return _stub_response(payload)

    if prov in ("openai_compatible", "openai", "deepseek"):
        if not cfg.api_key:
            return _stub_response(
                payload,
                note="AI_PROVIDER 已设为远程模式但未配置 AI_API_KEY，仍返回占位。",
            )
        if not cfg.base_url:
            return _stub_response(
                payload,
                note="已配置密钥但缺少 AI_BASE_URL（例如 https://api.deepseek.com）。",
            )
        try:
            return _openai_compatible_invoke(payload)
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:2000] if exc.response is not None else str(exc)
            return {
                "model": cfg.model,
                "output": {
                    "message": "upstream http error",
                    "pluginId": payload.plugin_id,
                    "taskType": payload.task_type,
                    "error": detail,
                    "status_code": exc.response.status_code if exc.response else None,
                },
            }
        except (httpx.RequestError, ValueError, KeyError) as exc:
            return {
                "model": cfg.model,
                "output": {
                    "message": "ai request failed",
                    "pluginId": payload.plugin_id,
                    "taskType": payload.task_type,
                    "error": str(exc),
                },
            }

    return _stub_response(payload, note=f"未知 AI_PROVIDER={prov!r}，使用 stub。")
