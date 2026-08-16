const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'signals.json');

// Store connected SSE clients for real-time broadcast
let sseClients = [];

const BACKUPS_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Helper to clean up old backups (keep max N)
function cleanOldBackups(maxKeep = 50) {
    try {
        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .map(f => ({
                filename: f,
                time: fs.statSync(path.join(BACKUPS_DIR, f)).mtimeMs
            }))
            .sort((a, b) => b.time - a.time);

        if (files.length > maxKeep) {
            const toDelete = files.slice(maxKeep);
            toDelete.forEach(f => {
                try { fs.unlinkSync(path.join(BACKUPS_DIR, f.filename)); } catch (e) {}
            });
        }
    } catch (e) {
        console.warn('Warning cleaning old backups:', e);
    }
}

// Helper to create a backup snapshot
function createBackupSnapshot(note = 'Ponto de parada automático', signalsData = null) {
    try {
        const signals = signalsData || readSignals();
        if (!Array.isArray(signals) || signals.length === 0) return null;

        const now = new Date();
        const timestampStr = now.toISOString().replace(/[:.]/g, '-');
        const filename = `backup_${timestampStr}.json`;
        const filePath = path.join(BACKUPS_DIR, filename);

        const meta = {
            filename: filename,
            createdAt: now.toISOString(),
            formattedDate: now.toLocaleString('pt-BR'),
            count: signals.length,
            note: note,
            signals: signals
        };

        fs.writeFileSync(filePath, JSON.stringify(meta, null, 2), 'utf8');
        cleanOldBackups(50);
        return meta;
    } catch (err) {
        console.error('Error creating backup snapshot:', err);
        return null;
    }
}

// Helper to list all backup snapshots
function listBackups() {
    try {
        if (!fs.existsSync(BACKUPS_DIR)) return [];
        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
            .map(f => {
                const p = path.join(BACKUPS_DIR, f);
                const stat = fs.statSync(p);
                try {
                    const content = JSON.parse(fs.readFileSync(p, 'utf8'));
                    return {
                        filename: f,
                        createdAt: content.createdAt || stat.mtime.toISOString(),
                        formattedDate: content.formattedDate || new Date(stat.mtime).toLocaleString('pt-BR'),
                        count: content.count || (Array.isArray(content.signals) ? content.signals.length : (Array.isArray(content) ? content.length : 0)),
                        note: content.note || 'Ponto de parada automático',
                        sizeBytes: stat.size
                    };
                } catch (e) {
                    return {
                        filename: f,
                        createdAt: stat.mtime.toISOString(),
                        formattedDate: new Date(stat.mtime).toLocaleString('pt-BR'),
                        count: 0,
                        note: 'Arquivo de backup',
                        sizeBytes: stat.size
                    };
                }
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return files;
    } catch (e) {
        console.error('Error listing backups:', e);
        return [];
    }
}

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

// Helper to write signals to signals.json with auto-backup snapshot
function writeSignals(signals, createBackup = true, note = 'Ponto de parada automático') {
    try {
        if (createBackup && Array.isArray(signals) && signals.length > 0) {
            createBackupSnapshot(note, signals);
        }
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
    // BACKUP & PONTOS DE PARADA ENDPOINTS
    // -------------------------------------------------------------------------

    // GET /api/backups (List all backups)
    if (pathname === '/api/backups' && method === 'GET') {
        const backups = listBackups();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(backups));
        return;
    }

    // POST /api/backups/create (Create manual snapshot)
    if (pathname === '/api/backups/create' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const parsed = body ? JSON.parse(body) : {};
                const note = parsed.note || 'Ponto de parada manual';
                const meta = createBackupSnapshot(note);
                if (meta) {
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, backup: meta }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Erro ao criar ponto de parada.' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload JSON inválido.' }));
            }
        });
        return;
    }

    // POST /api/backups/restore (Restore database from snapshot)
    if (pathname === '/api/backups/restore' && method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const parsed = JSON.parse(body);
                const filename = parsed.filename;
                if (!filename) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Nome do arquivo de backup não informado.' }));
                    return;
                }

                const targetPath = path.join(BACKUPS_DIR, path.basename(filename));
                if (!fs.existsSync(targetPath)) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Arquivo de backup não encontrado.' }));
                    return;
                }

                const backupContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                const restoredSignals = Array.isArray(backupContent.signals) 
                    ? backupContent.signals 
                    : (Array.isArray(backupContent) ? backupContent : []);

                if (restoredSignals.length === 0) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Backup vazio ou formato inválido.' }));
                    return;
                }

                // First create safety backup of current state before restoring
                createBackupSnapshot(`Pré-restauração de ${filename}`);

                // Write restored signals to DB
                fs.writeFileSync(DB_FILE, JSON.stringify(restoredSignals, null, 2), 'utf8');

                // Broadcast SSE event to all open tabs/devices to reload in real-time!
                broadcastEvent('reload', { restoredFrom: filename, count: restoredSignals.length });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, count: restoredSignals.length, signals: restoredSignals }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Erro ao restaurar backup: ' + e.message }));
            }
        });
        return;
    }

    // GET /api/backups/download?file=xxx (Download specific backup file)
    if (pathname === '/api/backups/download' && method === 'GET') {
        const fileParam = parsedUrl.query.file;
        if (!fileParam) {
            res.writeHead(400);
            res.end('Parametro file e obrigatorio.');
            return;
        }
        const targetPath = path.join(BACKUPS_DIR, path.basename(fileParam));
        if (!fs.existsSync(targetPath)) {
            res.writeHead(404);
            res.end('Backup nao encontrado.');
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': `attachment; filename="${path.basename(fileParam)}"`
        });
        fs.createReadStream(targetPath).pipe(res);
        return;
    }

    // -------------------------------------------------------------------------
    // WMS PROXY & TILE CACHE (Proteção contra HTTP 429 Rate Limiting do GeoServer IDEM)
    // -------------------------------------------------------------------------
    if (pathname === '/api/wms-proxy' && method === 'GET') {
        const queryString = parsedUrl.search ? parsedUrl.search.substring(1) : '';
        if (!queryString) {
            res.writeHead(400);
            res.end('Query string required');
            return;
        }

        const WMS_CACHE_DIR = path.join(__dirname, 'wms_cache');
        if (!fs.existsSync(WMS_CACHE_DIR)) {
            try { fs.mkdirSync(WMS_CACHE_DIR, { recursive: true }); } catch (e) {}
        }

        const crypto = require('crypto');
        const tileHash = crypto.createHash('md5').update(queryString).digest('hex');
        const tilePath = path.join(WMS_CACHE_DIR, `${tileHash}.png`);

        // Serve from local disk cache if valid (cached for 14 days)
        if (fs.existsSync(tilePath)) {
            const stat = fs.statSync(tilePath);
            if (Date.now() - stat.mtimeMs < 14 * 24 * 3600 * 1000 && stat.size > 0) {
                res.writeHead(200, {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=1209600',
                    'Access-Control-Allow-Origin': '*'
                });
                fs.createReadStream(tilePath).pipe(res);
                return;
            }
        }

        // Fetch from IDEM GeoServer with backoff retry
        const https = require('https');
        const targetUrl = `https://idem.marinha.mil.br/geoserver/wms?${queryString}`;

        const fetchTile = (attempt = 1) => {
            const reqProxy = https.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
                },
                timeout: 10000
            }, (proxyRes) => {
                if (proxyRes.statusCode === 429 && attempt <= 4) {
                    setTimeout(() => fetchTile(attempt + 1), attempt * 1200);
                    return;
                }

                if (proxyRes.statusCode === 200) {
                    const chunks = [];
                    proxyRes.on('data', chunk => chunks.push(chunk));
                    proxyRes.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        try { fs.writeFileSync(tilePath, buffer); } catch(e) {}
                        res.writeHead(200, {
                            'Content-Type': 'image/png',
                            'Cache-Control': 'public, max-age=1209600',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(buffer);
                    });
                } else {
                    if (fs.existsSync(tilePath)) {
                        res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' });
                        fs.createReadStream(tilePath).pipe(res);
                    } else {
                        res.writeHead(proxyRes.statusCode, { 'Access-Control-Allow-Origin': '*' });
                        res.end();
                    }
                }
            });

            reqProxy.on('error', () => {
                if (attempt <= 3) {
                    setTimeout(() => fetchTile(attempt + 1), attempt * 1000);
                } else if (fs.existsSync(tilePath)) {
                    res.writeHead(200, { 'Content-Type': 'image/png', 'Access-Control-Allow-Origin': '*' });
                    fs.createReadStream(tilePath).pipe(res);
                } else {
                    res.writeHead(502, { 'Access-Control-Allow-Origin': '*' });
                    res.end();
                }
            });
        };

        fetchTile(1);
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
