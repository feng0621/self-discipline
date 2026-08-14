import vinext from "vinext";
import { defineConfig } from "vite";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Vercel serves the generated static client. Cloudflare bindings are only
  // needed for local/Workers builds and include platform-specific binaries.
  const staticTarget = Boolean(process.env.VERCEL || process.env.CAPACITOR);
  const cloudflarePlugins = staticTarget ? [] : await (async()=>{
    const {readFile}=await import("node:fs/promises");
    const hostingConfig=JSON.parse(await readFile(new URL("./.openai/hosting.json",import.meta.url),"utf8")) as {d1?:string;r2?:string};
    const localBindingConfig={
      main:"./worker/index.ts",
      compatibility_flags:["nodejs_compat"],
      d1_databases:hostingConfig.d1?[{binding:hostingConfig.d1,database_name:"site-creator-d1",database_id:SITE_CREATOR_PLACEHOLDER_DATABASE_ID}]:[],
      r2_buckets:hostingConfig.r2?[{binding:hostingConfig.r2,bucket_name:"site-creator-r2"}]:[],
    };
    return [(await import("@cloudflare/vite-plugin")).cloudflare({
          viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
          config: localBindingConfig,
        })];
  })();

  return {
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      ...cloudflarePlugins,
    ],
  };
});
