# 全量开发收口基线（自动化节奏）

> 目标：用固定里程碑 + 自动检测，连续推进并在最后统一做业务验收。

## 1) 范围基线（本轮）

- CHG-044：支付渠道接口增强（回调验签占位、退款占位）  
- CHG-045：示例插件做实（统一走 AI 记账/审计/计费链路）  
- CHG-046：收口基线与自动检测脚本（里程碑/终态）

## 2) 里程碑标记规则

- `M1`：支付接口契约齐备（checkout/callback/refund）  
- `M2`：示例插件调用闭环（plugins/use -> ai invoke pipeline）  
- `M3`：收口与回归（文档、自动检查、提交推送）

每个里程碑完成后，必须执行：

```powershell
.\scripts\checkpoint.ps1 -Mode milestone
```

## 3) 终态基线（交付门槛）

- 后端测试通过（`pytest -q`）  
- 前端构建通过（`next build`）  
- 文档同步（`frontend-ui-spec-v1.md`、`development-status.md`、`change-log.md`）  
- 主分支提交并推送成功

终态检测命令：

```powershell
.\scripts\checkpoint.ps1 -Mode final
```

## 4) 业务验收入口（最后一步）

技术终态通过后，业务方按“整体业务测试清单”集中验收：

1. 支付下单（支付宝/微信/钱包）与订单状态流转  
2. 支付回调验签占位（失败/成功）  
3. 退款占位受理（已支付订单）  
4. 插件调用 AI 后的计费与审计可见性  
5. 路由策略运营台（分页、批量操作、导入导出）
