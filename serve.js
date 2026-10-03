const http = require('http');
const fs = require('fs');
const path = require('path');
const { AppServer } = require('./backend/server');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Initialize integrated backend API engine
const backendApp = new AppServer(PORT);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 1. Unified Backend API Routing (/api/*)
  if (req.url.startsWith('/api/')) {
    return backendApp.handleRequest(req, res);
  }

  // 2. Static Frontend & Super Admin Routing
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') {
    reqPath = '/index.html';
  } else if (reqPath === '/admin' || reqPath === '/admin/') {
    reqPath = '/admin.html';
  } else if (reqPath === '/connect' || reqPath === '/connect/') {
    reqPath = '/connect.html';
  }

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[Unified Server] Landing Page & Super Admin live at: http://${HOST}:${PORT}`);
  console.log(`[Unified Server] REST API live at: http://${HOST}:${PORT}/api/health`);
});

module.exports = { server, backendApp };
