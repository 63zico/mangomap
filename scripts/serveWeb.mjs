import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const startPort = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function getSafePath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const decodedPath = decodeURIComponent(url.pathname);
  const requestedPath = path.normalize(path.join(distDir, decodedPath));

  if (!requestedPath.startsWith(distDir)) {
    return null;
  }

  return requestedPath;
}

async function resolveAssetPath(requestUrl) {
  const requestedPath = getSafePath(requestUrl);

  if (!requestedPath) {
    return null;
  }

  try {
    const requestedStat = await stat(requestedPath);

    if (requestedStat.isFile()) {
      return requestedPath;
    }

    if (requestedStat.isDirectory()) {
      return path.join(requestedPath, "index.html");
    }
  } catch {
    // Expo web is a single-page app, so unknown routes fall back to index.html.
  }

  return path.join(distDir, "index.html");
}

async function verifyBuildExists() {
  try {
    await readFile(path.join(distDir, "index.html"));
  } catch {
    console.error("dist/index.html 파일이 없습니다. 먼저 npm run build 를 실행하세요.");
    process.exit(1);
  }
}

function createStaticServer() {
  return createServer(async (request, response) => {
    try {
      const assetPath = await resolveAssetPath(request.url || "/");

      if (!assetPath) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const contentType = mimeTypes.get(path.extname(assetPath)) || "application/octet-stream";
      response.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": assetPath.endsWith("index.html") ? "no-cache" : "public, max-age=31536000, immutable",
      });
      createReadStream(assetPath).pipe(response);
    } catch {
      response.writeHead(500);
      response.end("Internal Server Error");
    }
  });
}

async function listen(port) {
  const server = createStaticServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      listen(port + 1);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`웹버전 미리보기: http://127.0.0.1:${port}/`);
  });
}

await verifyBuildExists();
await listen(startPort);
