export default function WorkflowPage() {
  return (
    <main style={{ padding: "var(--space-xl)", maxWidth: 720 }}>
      <h1 style={{ color: "var(--color-accent)", fontSize: "1.25rem" }}>工作流</h1>
      <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
        可视化 DAG（首期只读）、节点状态与执行日志；与当前项目及已选插件对齐。
      </p>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>状态：占位页，下一阶段接工作流存储与画布。</p>
    </main>
  );
}
