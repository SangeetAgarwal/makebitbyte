import path from "path";

import prom from "@isaacs/express-prometheus-middleware";
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";

const app = express();
const metricsApp = express();
app.set("trust proxy", true);

// Existing: Prometheus metrics
app.use(
  prom({
    metricsPath: "/metrics",
    collectDefaultMetrics: true,
    metricsApp,
  })
);

app.use((req, res, next) => {
  // Existing: Helpful headers
  res.set("x-fly-region", process.env.FLY_REGION ?? "unknown");
  res.set("Strict-Transport-Security", `max-age=${60 * 60 * 24 * 365 * 100}`);
  next();
});

/**
 * NEW: Host check to redirect default Fly domain -> custom domain
 *      but allow localhost dev to pass through.
 */
app.use((req, res, next) => {
  // Debug: see what host Express thinks we're on
  // console.log("Host header seen by Express:", req.hostname, req.get("host"));

  // Allow local dev on localhost or 127.0.0.1
  if (
    req.hostname === "localhost" ||
    req.hostname.startsWith("localhost:") ||
    req.hostname === "127.0.0.1"
  ) {
    return next();
  }

  // If it's the Fly default domain, redirect to custom domain
  if (req.hostname === "bitoflearning-9a57.fly.dev") {
    // Include the original path/query in the redirect
    return res.redirect(301, "https://www.makebitbyte.com" + req.url);
  }

  // Otherwise, carry on
  next();
});

// Existing: Clean URL redirect
app.use((req, res, next) => {
  if (req.path.endsWith("/") && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    const safepath = req.path.slice(0, -1).replace(/\/+/g, "/");
    return res.redirect(301, safepath + query);
  }
  next();
});

// if we're not in the primary region, then we need to make sure all
// non-GET/HEAD/OPTIONS requests hit the primary region rather than read-only
// Postgres DBs.
// learn more: https://fly.io/docs/getting-started/multi-region-databases/#replay-the-request
app.all("*", function getReplayResponse(req, res, next) {
  const { method, path: pathname } = req;
  const { PRIMARY_REGION, FLY_REGION } = process.env;

  const isMethodReplayable = !["GET", "OPTIONS", "HEAD"].includes(method);
  const isReadOnlyRegion =
    FLY_REGION && PRIMARY_REGION && FLY_REGION !== PRIMARY_REGION;
  if (isMethodReplayable && isReadOnlyRegion) {
    console.info(`Replaying:`, {
      pathname,
      method,
      PRIMARY_REGION,
      FLY_REGION,
    });

    res.set("fly-replay", `region=${PRIMARY_REGION}`);
    return res.sendStatus(409);
  }
  next();
});

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Remix fingerprints its assets so we can cache forever.
app.use(
  "/build",
  express.static("public/build", { immutable: true, maxAge: "1y" })
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("public", { maxAge: "1h" }));

app.use(morgan("tiny"));

// Existing: Remix request handler
const MODE = process.env.NODE_ENV;
const BUILD_DIR = path.join(process.cwd(), "build");

app.all(
  "*",
  MODE === "production"
    ? createRequestHandler({ build: require(BUILD_DIR) })
    : (...args) => {
        purgeRequireCache();
        const requestHandler = createRequestHandler({
          build: require(BUILD_DIR),
          mode: MODE,
        });
        return requestHandler(...args);
      }
);

const port = process.env.PORT || 3000;

app.listen(port, () => {
  // require the built app so we're ready when the first request comes in
  require(BUILD_DIR); // preload the app
  console.log(`✅ app ready: http://localhost:${port}`);
});

const metricsPort = process.env.METRICS_PORT || 3001;

metricsApp.listen(metricsPort, () => {
  console.log(`✅ metrics ready: http://localhost:${metricsPort}/metrics`);
});

function purgeRequireCache() {
  // purge require cache on requests for "server side HMR" this won't let
  // you have in-memory objects between requests in development,
  // alternatively you can set up nodemon/pm2-dev to restart the server on
  // file changes, we prefer the DX of this though, so we've included it
  // for you by default
  for (const key in require.cache) {
    if (key.startsWith(BUILD_DIR)) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete require.cache[key];
    }
  }
}
