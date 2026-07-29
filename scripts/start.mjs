import { spawn } from "node:child_process";

const port = process.env.PORT ?? "4321";
const host = "0.0.0.0";

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["astro", "preview", "--host", host, "--port", port],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS: "enlaces-app-production.up.railway.app",
      HOST: host,
      PORT: port,
    },
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
