const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();

app.use(
  '/',
  createProxyMiddleware({
    target: process.env.BASE_URL,
    changeOrigin: true,
    ws: true,
    onProxyRes(proxyRes, req, res) {
      console.log(`Proxying request: ${req.method} ${req.url}`);
    },
  })
);

const PORT = process.env.PORT || 8080;
const SERVER_URL = `${process.env.RENDER_SUBDOMAIN}`;
const RENDER_SUBDOMAIN_WAITLIST = `${process.env.RENDER_SUBDOMAIN_WAITLIST}`;

app.listen(PORT, () => {

  // 🔁 Keep-alive pinger every 14 minutes
  setInterval(() => {
    fetch(SERVER_URL)
      .then((res) => {
        console.log(`[KEEP-AWAKE] Pinged server: ${res.status} at ${new Date().toISOString()}`);
      })
      .catch((err) => {
        console.error(`[KEEP-AWAKE] Ping failed: ${err.message}`);
      });
    fetch(RENDER_SUBDOMAIN_WAITLIST)
      .then((res) => {
        console.log(`[KEEP-AWAKE] Pinged waitlist server server: ${res.status} at ${new Date().toISOString()}`);
      })
      .catch((err) => {
        console.error(`[KEEP-AWAKE] Ping waitlist server failed: ${err.message}`);
      });
  }, 25 * 60 * 1000); // 25 mins
});
