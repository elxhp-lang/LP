export default function MarketPage() {
  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 720 }}>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.25rem" }}>插件市场</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        浏览、搜索、加入自配篮子；助手栏将提示配置、购买与插件兼容性。
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>状态：占位页，下一阶段接市场列表与详情 API。</p>
    </main>
  );
}
