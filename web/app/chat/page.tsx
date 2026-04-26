export default function ChatPage() {
  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 720 }}>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.25rem" }}>对话模式</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        超级 Agent 将在此引导：描述职业或需求 → 推荐插件组合与费用 → 购买/充值提醒 → 组装工作流并分步执行。
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>状态：占位页，下一阶段接入对话与推荐 API。</p>
    </main>
  );
}
