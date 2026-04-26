"""
MVP 市场目录：静态条目，与 Agent 推荐、PluginLoader 权限目录对齐。
后续可改为读 manifest 索引或数据库上架表。
"""

from app.schemas.marketplace import MarketplacePluginDetail, MarketplacePluginSummary

_SUMMARIES: tuple[MarketplacePluginSummary, ...] = (
    MarketplacePluginSummary(
        plugin_id="plugin.translation.gpt",
        name="商品翻译插件",
        version="0.1.0",
        category="跨境 / 内容",
        tagline="多语言标题与卖点翻译，降低出海沟通成本",
        price_hint="MVP 占位：按次 / 按 Token（以市场标价为准）",
        capabilities=["GPT 类翻译任务", "源语言/目标语言可配置"],
    ),
    MarketplacePluginSummary(
        plugin_id="plugin.market.analysis.composer",
        name="市场分析插件",
        version="0.1.0",
        category="跨境 / 数据",
        tagline="跨境市场趋势与需求信号摘要",
        price_hint="MVP 占位：按次 / 订阅（以市场标价为准）",
        capabilities=["趋势摘要", "简易需求指数图数据"],
    ),
)

_DETAILS: dict[str, MarketplacePluginDetail] = {
    "plugin.translation.gpt": MarketplacePluginDetail(
        plugin_id="plugin.translation.gpt",
        name="商品翻译插件",
        version="0.1.0",
        category="跨境 / 内容",
        tagline="多语言标题与卖点翻译，降低出海沟通成本",
        price_hint="MVP 占位：按次 / 按 Token（以市场标价为准）",
        capabilities=["GPT 类翻译任务", "源语言/目标语言可配置"],
        description="面向跨境电商卖家的文案翻译能力，支持批量标题与卖点，保持品牌名与禁译词策略可配置。",
        case_example="将 20 条中文商品标题批量译为英语，保持品牌名不译。",
    ),
    "plugin.market.analysis.composer": MarketplacePluginDetail(
        plugin_id="plugin.market.analysis.composer",
        name="市场分析插件",
        version="0.1.0",
        category="跨境 / 数据",
        tagline="跨境市场趋势与需求信号摘要",
        price_hint="MVP 占位：按次 / 订阅（以市场标价为准）",
        capabilities=["趋势摘要", "简易需求指数图数据"],
        description="按品类与目标市场输出需求与竞争态势要点，为选品与投放提供可读摘要。",
        case_example="输入品类「便携储能」，输出欧盟市场近月需求变化要点。",
    ),
}


def list_marketplace_plugins(
    query: str | None = None,
    category: str | None = None,
    offset: int = 0,
    limit: int = 20,
) -> list[MarketplacePluginSummary]:
    rows = list(_SUMMARIES)

    if category:
        want = category.strip().lower()
        rows = [r for r in rows if r.category.lower() == want]

    if query:
        q = query.strip().lower()
        if q:
            rows = [
                r
                for r in rows
                if q in r.plugin_id.lower()
                or q in r.name.lower()
                or q in r.tagline.lower()
                or any(q in c.lower() for c in r.capabilities)
            ]

    start = max(0, offset)
    end = start + max(1, limit)
    return rows[start:end]


def list_marketplace_categories() -> list[str]:
    return sorted({r.category for r in _SUMMARIES})


def get_marketplace_plugin(plugin_id: str) -> MarketplacePluginDetail | None:
    return _DETAILS.get(plugin_id)
