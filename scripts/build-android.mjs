import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const build = spawnSync(command,["exec","vinext","build"],{stdio:"inherit",shell:process.platform==="win32",env:{...process.env,CAPACITOR:"1"}});
if(build.error)throw build.error;
if(build.status!==0)process.exit(build.status??1);
const render = spawnSync(process.execPath,["scripts/vercel-build.mjs"],{stdio:"inherit",env:{...process.env,CAPACITOR:"1"}});
process.exit(render.status??1);
