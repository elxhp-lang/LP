import json
import os
from urllib.error import HTTPError
from urllib.request import Request, urlopen


BASE_URL = os.getenv("LP_BASE_URL", "http://127.0.0.1:8000")
HEADERS = {
    "content-type": "application/json",
    "x-tenant-id": "sandbox-tenant",
}


def post(path: str, payload: dict[str, object]) -> tuple[int, str]:
    data = json.dumps(payload).encode("utf-8")
    req = Request(f"{BASE_URL}{path}", data=data, headers=HEADERS, method="POST")
    try:
        with urlopen(req) as res:
            return res.status, res.read().decode("utf-8")
    except HTTPError as err:
        return err.code, err.read().decode("utf-8")


def run_plugin_lifecycle(plugin_id: str, config: dict[str, object], action: str, api_name: str) -> None:
    print(f"[sandbox] install -> {plugin_id}")
    print(post("/api/v1/plugins/install", {"plugin_id": plugin_id, "version": "0.1.0"}))

    print(f"[sandbox] configure -> {plugin_id}")
    print(post("/api/v1/plugins/configure", {"plugin_id": plugin_id, "config": config}))

    print(f"[sandbox] use -> {plugin_id} ({api_name})")
    print(
        post(
            "/api/v1/plugins/use",
            {"plugin_id": plugin_id, "action": action, "api_name": api_name},
        )
    )

    print(f"[sandbox] uninstall -> {plugin_id}")
    print(post(f"/api/v1/plugins/uninstall/{plugin_id}", {}))


if __name__ == "__main__":
    run_plugin_lifecycle(
        "plugin.translation.gpt",
        {"sourceLanguage": "zh-CN", "targetLanguage": "en-US"},
        "translate-product",
        "ai:invoke",
    )

    run_plugin_lifecycle(
        "plugin.market.analysis.composer",
        {"market": "eu"},
        "analyze-market",
        "market:read",
    )

    print("[sandbox] permission isolation demo (expect 403):")
    print(post("/api/v1/plugins/install", {"plugin_id": "plugin.translation.gpt", "version": "0.1.0"}))
    print(
        post(
            "/api/v1/plugins/use",
            {
                "plugin_id": "plugin.translation.gpt",
                "action": "illegal-call",
                "api_name": "market:read",
            },
        )
    )
    print(post("/api/v1/plugins/uninstall/plugin.translation.gpt", {}))
