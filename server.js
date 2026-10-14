// Server Node untuk hosting cPanel/Passenger.
//
// Passenger memasang aplikasi di subfolder (PassengerBaseURI, mis. /program-cp) dan
// memotong prefix itu sebelum request sampai ke Node, sementara Next dibuild dengan
// basePath yang sama. Jadi prefix-nya ditempel balik di sini.
//
// Di lokal (tanpa NEXT_PUBLIC_BASE_PATH) file ini tetap jalan apa adanya.
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const dev = process.env.NODE_ENV === "development";
const port = Number.parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, port });
const handle = app.getRequestHandler();

function requestUrl(raw) {
  const url = raw && raw.length > 0 ? raw : "/";
  const queryAt = url.indexOf("?");
  const pathOnly = queryAt === -1 ? url : url.slice(0, queryAt);
  const query = queryAt === -1 ? "" : url.slice(queryAt);
  if (!BASE_PATH) return `${pathOnly}${query}`;
  const path = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;
  const already = path === BASE_PATH || path.startsWith(`${BASE_PATH}/`);
  const prefixed = already
    ? path
    : path === "/"
      ? BASE_PATH
      : `${BASE_PATH}${path}`;
  return `${prefixed}${query}`;
}

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      try {
        req.url = requestUrl(req.url);
        handle(req, res, parse(req.url, true));
      } catch (error) {
        console.error("Request failed", req.url, error);
        res.statusCode = 500;
        res.end("internal server error");
      }
    }).listen(port, () => {
      console.log(`> Ready on port ${port} (basePath: ${BASE_PATH || "/"})`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
