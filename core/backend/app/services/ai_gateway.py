from app.schemas.ai import AIInvokeRequest


def invoke_model(payload: AIInvokeRequest) -> dict:
    """
    AI 调度占位实现：
    后续在这里接入 GPT/Claude/Composer 的真实路由与配额控制。
    """
    model = "gpt"
    return {
        "model": model,
        "output": {
            "message": "ai dispatch placeholder",
            "pluginId": payload.plugin_id,
            "taskType": payload.task_type,
        },
    }
