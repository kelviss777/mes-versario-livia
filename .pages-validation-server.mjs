import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = "C:\\Users\\User\\Desktop";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
};

http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  const requested = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const filePath = path.resolve(root, `.${requested}`);

  if (!filePath.startsWith(path.resolve(root)) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    response.writeHead(404).end("Not found");
    return;
  }

  const stat = fs.statSync(filePath);
  response.writeHead(200, {
    "Content-Type": mime[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Content-Length": stat.size,
  });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(filePath).pipe(response);
}).listen(8765, "127.0.0.1");
