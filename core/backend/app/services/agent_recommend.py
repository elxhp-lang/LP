"""
规则化推荐（MVP）：后续可替换为 LLM + 检索，不改变 API 契约。
"""

from app.schemas.agent import (
    AgentRecommendResponse,
    PluginRecommendationCard,
    WorkflowDraft,
    WorkflowDraftStep,
)

_CATALOG: dict[str, PluginRecommendationCard] = {
    "plugin.translation.gpt": PluginRecommendationCard(
        plugin_id="plugin.translation.gpt",
        name="商品翻译插件",
        role="多语言标题与卖点翻译，降低出海沟通成本",
        price_hint="MVP 占位：按次 / 按 Token（以市场标价为准）",
        capabilities=["GPT 类翻译任务", "源语言/目标语言可配置"],
        case_example="将 20 条中文商品标题批量译为英语，保持品牌名不译。",
    ),
    "plugin.market.analysis.composer": PluginRecommendationCard(
        plugin_id="plugin.market.analysis.composer",
        name="市场分析插件",
        role="跨境市场趋势与需求信号摘要",
        price_hint="MVP 占位：按次 / 订阅（以市场标价为准）",
        capabilities=["趋势摘要", "简易需求指数图数据"],
        case_example="输入品类「便携储能」，输出欧盟市场近月需求变化要点。",
    ),
}


def recommend_from_user_message(message: str) -> AgentRecommendResponse:
    text = message.lower()
    # 简单关键词（中英文片段）
    want_translation = any(
        k in message
        for k in ("翻译", "多语言", "英文", "出海", "标题", "语种", "语言")
    ) or any(k in text for k in ("translate", "i18n", "localization"))
    want_market = any(
        k in message
        for k in ("市场", "分析", "趋势", "竞品", "选品", "跨境", "销量", "需求")
    ) or any(k in text for k in ("market", "trend", "analysis"))

    chosen: list[str] = []
    if want_translation:
        chosen.append("plugin.translation.gpt")
    if want_market:
        chosen.append("plugin.market.analysis.composer")
    if not chosen:
        chosen = ["plugin.translation.gpt", "plugin.market.analysis.composer"]

    # 去重保序
    seen: set[str] = set()
    ordered: list[str] = []
    for pid in chosen:
        if pid not in seen:
            seen.add(pid)
            ordered.append(pid)

    plugins = [_CATALOG[pid] for pid in ordered if pid in _CATALOG]
    steps = [
        WorkflowDraftStep(plugin_id=p.plugin_id, title=f"步骤：{p.name}") for p in plugins
    ]

    intent_parts = []
    if want_translation:
        intent_parts.append("翻译/本地化")
    if want_market:
        intent_parts.append("市场分析")
    if not intent_parts:
        intent_parts.append("通用跨境电商辅助（默认组合）")

    return AgentRecommendResponse(
        intent_summary="、".join(intent_parts) + "。以下为规则引擎生成的初版方案（非大模型）。",
        plugins=plugins,
        workflow_draft=WorkflowDraft(steps=steps),
        billing_hints=[
            "若插件为按 Token 计费，执行前请确认账户余额或完成充值。",
            "若插件需单独购买，请在市场完成下单后再运行工作流。",
        ],
        next_actions=[
            "在「插件控制台」安装并配置推荐插件",
            "使用「运行前检查」确认计费与权限（MVP 占位）",
            "确认后到「工作流」页查看自动组装的步骤（后续版本）",
        ],
    )
