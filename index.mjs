import Server from 'bare-server-node';
import http from "http";
import express from "express";
import config from "./config.mjs";
import routes from "./server/routes.mjs";
import rateLimit from "express-rate-limit";
import minify from "express-minify-html-2";

let bare;
if (config.gameProxy) bare = new Server("/bare/", "");

const app = express();
const server = http.createServer(app);

// setup options
if (config.minify) {
  app.use(minify({
    override: true,
    exception_url: false,
    htmlMinifier: {
      removeComments: true,
      collapseWhitespace: true,
      collapseBooleanAttributes: true,
      removeAttributeQuotes: true,
      removeEmptyAttributes: true,
      minifyJS: true
  }}));
}
if(config.rateLimit.enabled) {
  app.use(rateLimit({
    max: config.rateLimit.maxRequests,
    windowMs: config.rateLimit.timeWindow * 60 * 1000,
  }));
}

// setup app
app.use(express.static("static"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// register routes
routes(app);

// setup proxy
app.use("/", (req, res) => {
  if (config.gameProxy) {
    if (bare.route_request(req, res)) return;
  }
  res.status(404).render("pages/404", {});
});
if (config.gameProxy) {
  server.on('upgrade', (req, socket, head) => {
	  if(bare.route_upgrade(req, socket, head))return;
	  socket.end();
  });
}

server.listen(process.env.PORT || config.port || 3000);