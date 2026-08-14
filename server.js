const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'signals.json');

// Store connected SSE clients for real-time broadcast
let sseClients = [];

// Helper to read signals from signals.json
function readSignals() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading signals.json:', err);
        return [];
    }
}

// Helper to write signals to signals.json
function writeSignals(signals) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(signals, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error('Error writing signals.json:', err);
        return false;
    }
}

// Broadcast SSE event to all connected clients
function broadcastEvent(eventType, payload) {
    const data = JSON.stringify({ type: eventType, payload });
    sseClients.forEach(client => {
        client.res.write(`event: signal-change\ndata: ${data}\n\n`);
    });
}

// MIME types map
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.kml': 'application/vnd.google-earth.kml+xml',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // -------------------------------------------------------------------------
    // API ENDPOINTS
    // -------------------------------------------------------------------------

    // SSE Realtime Stream
    if (pathname === '/api/events' && method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('retry: 3000\n\n');

        const clientId = Date.now();
        const newClient = { id: clientId, res };
        sseClients.push(newClient);

        req.on('close', () => {
            sseClients = sseClients.filter(c => c.id !== clientId);
        });
        return;
    }

    // GET /api/signals
    if (pathname === '/api/signals' && method === 'GET') {
        const signals = readSignals();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(signals));
        return;
    }

    // POST /api/signals (Add new signal)
    if (pathname === '/api/signals' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const newSignal = JSON.parse(body);
                if (!newSignal.code || !newSignal.name) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Code and Name are required.' }));
                    return;
                }

                const signals = readSignals();
                // Check if code exists
                const existingIndex = signals.findIndex(s => s.code === newSignal.code);
                if (existingIndex >= 0) {
                    signals[existingIndex] = { ...signals[existingIndex], ...newSignal };
                } else {
                    signals.push(newSignal);
                }

                writeSignals(signals);
                broadcastEvent(existingIndex >= 0 ? 'update' : 'create', newSignal);

                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, signal: newSignal }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
            }
        });
        return;
    }

    // PUT /api/signals/:code (Update signal)
    if (pathname.startsWith('/api/signals/') && method === 'PUT') {
        const code = decodeURIComponent(pathname.replace('/api/signals/', ''));
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const updatedData = JSON.parse(body);
                const signals = readSignals();
                const idx = signals.findIndex(s => s.code === code);
                if (idx === -1) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Signal not found.' }));
                    return;
                }

                signals[idx] = { ...signals[idx], ...updatedData };
                writeSignals(signals);
                broadcastEvent('update', signals[idx]);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, signal: signals[idx] }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
            }
        });
        return;
    }

    // DELETE /api/signals/:code (Delete signal permanently)
    if (pathname.startsWith('/api/signals/') && method === 'DELETE') {
        const code = decodeURIComponent(pathname.replace('/api/signals/', ''));
        const signals = readSignals();
        const newSignals = signals.filter(s => s.code !== code);

        if (signals.length === newSignals.length) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Signal not found.' }));
            return;
        }

        writeSignals(newSignals);
        broadcastEvent('delete', { code });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, code }));
        return;
    }

    // -------------------------------------------------------------------------
    // STATIC FILE SERVER
    // -------------------------------------------------------------------------
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    
    // Security check: stay in directory
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

// Periodic heartbeat for SSE connection health
setInterval(() => {
    sseClients.forEach(client => {
        client.res.write(': keepalive\n\n');
    });
}, 15000);

server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`  CHN-4 AtoN GIS Server running on http://localhost:${PORT}`);
    console.log(`  Multi-user real-time interoperability ACTIVE.`);
    console.log(`=======================================================`);
});
