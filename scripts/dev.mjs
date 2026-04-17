import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(frontendRoot, "..", "mini_games_collection_back-end");

const FRONTEND_HOST = "127.0.0.1";
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 8000);
const BACKEND_HOST = "127.0.0.1";
const BACKEND_PORT = Number(process.env.BACKEND_PORT || 3000);
const BACKEND_HEALTH_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}/api/health`;
const FRONTEND_URL = `http://${FRONTEND_HOST}:${FRONTEND_PORT}`;

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webmanifest", "application/manifest+json; charset=utf-8"]
]);

let shuttingDown = false;
let backendProcess = null;

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

function getContentType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end(message);
}

function isInsideRoot(targetPath, rootPath) {
  const normalizedRoot = path.resolve(rootPath);
  const normalizedTarget = path.resolve(targetPath);
  return normalizedTarget === normalizedRoot || normalizedTarget.startsWith(`${normalizedRoot}${path.sep}`);
}

async function resolveStaticFile(requestPath) {
  const safeRelativePath = `.${requestPath}`;
  const candidatePath = path.resolve(frontendRoot, safeRelativePath);

  if (!isInsideRoot(candidatePath, frontendRoot)) {
    return null;
  }

  try {
    const stats = await stat(candidatePath);

    if (stats.isDirectory()) {
      const indexPath = path.join(candidatePath, "index.html");
      const indexStats = await stat(indexPath);
      if (indexStats.isFile()) {
        return indexPath;
      }
      return null;
    }

    if (stats.isFile()) {
      return candidatePath;
    }
  } catch {
    return null;
  }

  return null;
}

const frontendServer = createServer(async function (req, res) {
  try {
    const url = new URL(req.url || "/", `${FRONTEND_URL}/`);
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = await resolveStaticFile(pathname);

    if (!filePath) {
      sendText(res, 404, "Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": getContentType(filePath)
    });

    createReadStream(filePath).on("error", function () {
      sendText(res, 500, "Failed to read file");
    }).pipe(res);
  } catch (error) {
    sendText(res, 500, `Server error: ${error.message}`);
  }
});

function killBackend() {
  if (!backendProcess || backendProcess.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/PID", String(backendProcess.pid), "/T", "/F"], {
      stdio: "ignore"
    });
    return;
  }

  backendProcess.kill("SIGTERM");
  setTimeout(function () {
    if (backendProcess && backendProcess.exitCode === null) {
      backendProcess.kill("SIGKILL");
    }
  }, 2000);
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (!frontendServer.listening) {
    killBackend();
    process.exit(exitCode);
    return;
  }

  frontendServer.close(function () {
    killBackend();
    process.exit(exitCode);
  });
}

function openBrowser(url) {
  if (process.platform === "win32") {
    const child = spawn("cmd", ["/c", "start", "", url], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return;
  }

  if (process.platform === "darwin") {
    const child = spawn("open", [url], {
      detached: true,
      stdio: "ignore"
    });
    child.unref();
    return;
  }

  const child = spawn("xdg-open", [url], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();
}

async function waitForBackendReady() {
  const timeoutMs = 30000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (backendProcess && backendProcess.exitCode !== null) {
      throw new Error(`Backend exited early with code ${backendProcess.exitCode}`);
    }

    try {
      const response = await fetch(BACKEND_HEALTH_URL);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until the backend is ready or times out.
    }

    await sleep(500);
  }

  throw new Error("Backend did not become ready within 30 seconds");
}

async function main() {
  backendProcess = spawn(process.execPath, ["server.js"], {
    cwd: backendRoot,
    stdio: ["ignore", "pipe", "pipe"]
  });

  backendProcess.stdout.on("data", function (chunk) {
    process.stdout.write(`[backend] ${chunk}`);
  });

  backendProcess.stderr.on("data", function (chunk) {
    process.stderr.write(`[backend] ${chunk}`);
  });

  backendProcess.once("exit", function (code, signal) {
    if (shuttingDown) {
      return;
    }

    console.error(`[backend] exited${signal ? ` via ${signal}` : ""}${code !== null ? ` with code ${code}` : ""}`);
    shutdown(typeof code === "number" && code !== 0 ? code : 1);
  });

  frontendServer.listen(FRONTEND_PORT, FRONTEND_HOST, function () {
    console.log(`[frontend] http://${FRONTEND_HOST}:${FRONTEND_PORT}`);
  });

  frontendServer.on("error", function (error) {
    console.error("[frontend] failed to start:", error);
    shutdown(1);
  });

  await waitForBackendReady();

  console.log(`[backend] ready at ${BACKEND_HEALTH_URL}`);
  console.log(`[open] ${FRONTEND_URL}`);
  if (process.env.NO_BROWSER !== "1" && process.env.CI !== "1") {
    openBrowser(FRONTEND_URL);
  }
}

process.on("SIGINT", function () {
  shutdown(0);
});

process.on("SIGTERM", function () {
  shutdown(0);
});

main().catch(function (error) {
  console.error("[dev] failed to start:", error);
  shutdown(1);
});
