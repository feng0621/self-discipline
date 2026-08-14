import { writeFile } from "node:fs/promises";

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("static-render", Date.now().toString());
const { default: worker } = await import(workerUrl.href);
const request = new Request("https://self-discipline.vercel.app/", { headers: { accept: "text/html" } });
const response = typeof worker === "function"
  ? await worker(request)
  : await worker.fetch(
      request,
      { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
      { waitUntil() {}, passThroughOnException() {} },
    );

if (!response.ok) throw new Error(`Static render failed with ${response.status}`);
await writeFile(new URL("../dist/client/index.html", import.meta.url), await response.text(), "utf8");
process.exit(0);
