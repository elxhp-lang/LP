type PluginRow = {
  id: string;
  name: string;
  status: string;
  latestVersion: string;
};

const demoPlugins: PluginRow[] = [
  { id: "plugin.translation", name: "商品翻译", status: "published", latestVersion: "0.1.0" },
  { id: "plugin.market-analysis", name: "市场分析", status: "draft", latestVersion: "0.1.0" },
];

export default function PluginDashboardPage() {
  return (
    <main style={{ padding: 24 }}>
      <h2>插件管理后台</h2>
      <p>该页面为阶段二骨架，后续接入真实插件市场 API。</p>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th align="left">插件ID</th>
            <th align="left">名称</th>
            <th align="left">状态</th>
            <th align="left">版本</th>
          </tr>
        </thead>
        <tbody>
          {demoPlugins.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.status}</td>
              <td>{item.latestVersion}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
