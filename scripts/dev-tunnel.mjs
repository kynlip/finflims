#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import localtunnel from "localtunnel";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 3002);
const mongoTunnelHost = process.env.MONGO_TUNNEL_HOST || "127.0.0.1";
const mongoTunnelPort = Number(process.env.MONGO_TUNNEL_PORT || 27018);
const subdomain = process.env.SUBDOMAIN || undefined;
const mongoScript = join(rootDir, "ketnoidb.mjs");
const nextCli = join(rootDir, "node_modules", "next", "dist", "bin", "next");

let mongoTunnel;
let ownsMongoTunnel = false;
let nextDev;
let publicTunnel;
let stopping = false;

function log(message, ...args) {
  console.log("[dev:tunnel]", message, ...args);
}

function logError(message, ...args) {
  console.error("[dev:tunnel]", message, ...args);
}

/**
 * Read the local env values needed by this launcher. Next.js loads the same
 * files for the child process; parsing here lets us rewrite the Mongo URI
 * before the child imports the database module.
 */
function loadLocalEnv() {
  const values = {};
  const files = [".env", ".env.development", ".env.local", ".env.development.local"];

  for (const file of files) {
    const path = join(rootDir, file);
    if (!existsSync(path)) continue;

    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;

      let value = rawValue.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  }

  return values;
}

function addDirectConnection(uri) {
  if (!uri || uri.startsWith("mongodb+srv://") || /(?:^|[?&])directConnection=/i.test(uri)) {
    return uri;
  }

  const separator = uri.includes("?") ? (uri.endsWith("?") || uri.endsWith("&") ? "" : "&") : "?";
  return `${uri}${separator}directConnection=true`;
}

function rewriteMongoUri(uri) {
  if (!uri || !uri.startsWith("mongodb://")) return uri;

  // The SSH tunnel exposes the VPS Mongo port locally. Only rewrite the
  // conventional local endpoint; remote hosts and mongodb+srv stay untouched.
  const rewritten = uri.replace(
    /(mongodb:\/\/(?:[^@/?]+@)?)(?:127\.0\.0\.1|localhost):27017\b/i,
    `$1${mongoTunnelHost}:${mongoTunnelPort}`,
  );

  return addDirectConnection(rewritten);
}

function canConnect(host, targetPort, timeoutMs = 750) {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port: targetPort });
    let settled = false;

    const finish = (connected) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(connected);
    };

    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function waitForPort(host, targetPort, timeoutMs, child) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await canConnect(host, targetPort)) return true;
    if (child && child.exitCode !== null) return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function waitForHttp(targetPort, timeoutMs = 60_000) {
  return new Promise((resolve) => {
    const deadline = Date.now() + timeoutMs;

    const probe = () => {
      if (Date.now() >= deadline) {
        resolve(false);
        return;
      }

      const request = http.get(`http://127.0.0.1:${targetPort}/`, (response) => {
        response.resume();
        resolve(true);
      });

      request.setTimeout(2_000, () => request.destroy());
      request.once("error", () => setTimeout(probe, 500));
    };

    probe();
  });
}

function terminate(child) {
  if (!child || child.exitCode !== null || child.killed) return;

  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

async function cleanup(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  if (publicTunnel) {
    try {
      publicTunnel.close();
    } catch {}
  }

  terminate(nextDev);
  if (ownsMongoTunnel) terminate(mongoTunnel);

  // Give taskkill/close a moment to release the ports before exiting.
  await new Promise((resolve) => setTimeout(resolve, 250));
  process.exit(exitCode);
}

async function startMongoTunnel(env) {
  if (await canConnect(mongoTunnelHost, mongoTunnelPort)) {
    log(`Đã tìm thấy Mongo SSH tunnel tại ${mongoTunnelHost}:${mongoTunnelPort}, dùng lại tiến trình hiện có.`);
    return;
  }

  if (!existsSync(mongoScript)) {
    throw new Error(`Không tìm thấy ${mongoScript}`);
  }

  log(`Đang mở Mongo SSH tunnel tới ${mongoTunnelHost}:${mongoTunnelPort}...`);
  mongoTunnel = spawn(process.execPath, [mongoScript], {
    cwd: rootDir,
    env,
    stdio: "inherit",
    windowsHide: false,
  });
  ownsMongoTunnel = true;

  const ready = await waitForPort(mongoTunnelHost, mongoTunnelPort, 30_000, mongoTunnel);
  if (!ready) {
    if (mongoTunnel.exitCode !== null) {
      throw new Error(
        "SSH tunnel đã thoát trước khi mở được Mongo port. Hãy kiểm tra SSH key/agent hoặc đăng nhập mật khẩu trong terminal rồi chạy lại.",
      );
    }
    throw new Error(`Không thể mở Mongo tunnel tại ${mongoTunnelHost}:${mongoTunnelPort} trong 30 giây.`);
  }

  log(`Mongo SSH tunnel sẵn sàng tại ${mongoTunnelHost}:${mongoTunnelPort}.`);
}

async function start() {
  const localEnv = loadLocalEnv();
  const env = { ...localEnv, ...process.env, PORT: String(port) };
  const configuredMongoUri = env.MONGODB_URI || `mongodb://${mongoTunnelHost}:${mongoTunnelPort}`;
  env.MONGODB_URI = rewriteMongoUri(configuredMongoUri);

  await startMongoTunnel(env);

  if (!existsSync(nextCli)) {
    throw new Error(`Không tìm thấy Next CLI tại ${nextCli}. Hãy chạy npm install trước.`);
  }

  log(`Đang khởi động Next.js Dev Server trên port ${port}...`);
  nextDev = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
    cwd: rootDir,
    env,
    stdio: "inherit",
    windowsHide: false,
  });

  nextDev.once("error", (error) => {
    logError("Không thể khởi động Next.js:", error.message);
    void cleanup(1);
  });
  nextDev.once("exit", (code, signal) => {
    if (!stopping) {
      logError(`Next.js đã dừng (code=${code ?? "-"}, signal=${signal ?? "-"}).`);
      void cleanup(code && code !== 0 ? code : 1);
    }
  });

  log("Đang chờ Next.js phản hồi HTTP...");
  if (!(await waitForHttp(port))) {
    throw new Error(`Next.js không phản hồi trên http://127.0.0.1:${port} trong 60 giây.`);
  }
  log("Next.js đã sẵn sàng.");

  if (process.env.DEV_TUNNEL_NO_PUBLIC === "1") {
    log("DEV_TUNNEL_NO_PUBLIC=1: bỏ qua localtunnel, giữ Next.js chạy local.");
    return;
  }

  log("Đang thiết lập Public Tunnel HTTPS...");
  publicTunnel = await localtunnel({ port, subdomain });

  console.log(`[dev:tunnel] Public URL: ${publicTunnel.url}`);

  publicTunnel.on("close", () => log("Public tunnel đã đóng."));
  publicTunnel.on("error", (error) => {
    logError("Public tunnel lỗi:", error.message);
    void cleanup(1);
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => void cleanup(0));
}

process.on("uncaughtException", (error) => {
  logError(error.message);
  void cleanup(1);
});

process.on("unhandledRejection", (error) => {
  logError(error instanceof Error ? error.message : String(error));
  void cleanup(1);
});

start().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  void cleanup(1);
});
