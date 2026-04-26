import { runLifecycle } from "@core/plugin-sdk";
import { TemplatePlugin } from "./index.js";

const main = async () => {
  const plugin = new TemplatePlugin();
  const result = await runLifecycle(
    plugin,
    { locale: "en-US" },
    { message: "hello from template" },
  );
  console.log("[template] lifecycle completed", result);
};

main().catch((err) => {
  console.error("[template] sandbox run failed", err);
  process.exit(1);
});
