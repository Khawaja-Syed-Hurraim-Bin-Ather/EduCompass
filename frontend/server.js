// Minimal static server: node server.js -> http://localhost:5173 (main) & http://localhost:3000 (mirror)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '5173', 10);
const T = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function handler(req, res) {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  let p = path.join(__dirname, reqPath);
  if (p.endsWith(path.sep)) p += 'index.html';

  if (!p.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  // If path is a directory without trailing slash, look for index.html inside
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
    p = path.join(p, 'index.html');
  }

  fs.readFile(p, (err, data) => {
    if (err) {
      // SPA fallback for HTML routes
      if (!path.extname(p) || path.extname(p) === '.html') {
        return fs.readFile(path.join(__dirname, 'index.html'), (e, d) => {
          if (e) {
            res.writeHead(404);
            return res.end('Not found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(d);
        });
      }
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(p);
    res.writeHead(200, { 'Content-Type': T[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// Main frontend server on port 5173
const server5173 = http.createServer(handler);
server5173.listen(PORT, () => {
  console.log(`✅ EduCompass Main Frontend running on http://localhost:${PORT}`);
});

// Mirror on port 3000 (if 5173 is primary and 3000 is free)
if (PORT !== 3000) {
  const server3000 = http.createServer(handler);
  server3000.on('error', () => {
    // Port 3000 already in use, ignore quietly
  });
  server3000.listen(3000, () => {
    console.log(`   Mirror available on http://localhost:3000`);
  });
}
