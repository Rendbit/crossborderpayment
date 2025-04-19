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

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}`);
});
