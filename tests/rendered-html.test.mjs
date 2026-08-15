import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the FORMA session recovery screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>FORMA｜12 周腹肌计划<\/title>/i);
  assert.match(html, /bootScreen/);
  assert.match(html, /FORMA°/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps the routed fitness feature free of starter preview code", async () => {
  const [page, fitnessApp, layout, packageJson, architecture] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/fitness/FitnessApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../ARCHITECTURE.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /FitnessApp/);
  assert.match(fitnessApp, /FORMA/);
  assert.match(layout, /12 周腹肌计划/);
  assert.match(architecture, /Feature Slice/);
  assert.doesNotMatch(page + fitnessApp, /SkeletonPreview|codex-preview/);
  assert.doesNotMatch(layout, /Starter Project|codex-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
