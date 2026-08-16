import http.server
import socketserver
import json
import os
import datetime
from urllib.parse import unquote, parse_qs, urlparse

PORT = 3000
BASE_DIR = os.path.dirname(__file__)
DB_FILE = os.path.join(BASE_DIR, 'signals.json')
BACKUPS_DIR = os.path.join(BASE_DIR, 'backups')

if not os.path.exists(BACKUPS_DIR):
    os.makedirs(BACKUPS_DIR, exist_ok=True)

def read_signals():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print("Erro ao ler signals.json:", e)
    return []

def create_backup_snapshot(note="Ponto de parada automático", signals_data=None):
    try:
        signals = signals_data if signals_data is not None else read_signals()
        if not isinstance(signals, list) or len(signals) == 0:
            return None
        
        now = datetime.datetime.now()
        timestamp_str = now.isoformat().replace(":", "-").replace(".", "-")
        filename = f"backup_{timestamp_str}.json"
        filepath = os.path.join(BACKUPS_DIR, filename)

        meta = {
            "filename": filename,
            "createdAt": now.isoformat(),
            "formattedDate": now.strftime("%d/%m/%Y %H:%M:%S"),
            "count": len(signals),
            "note": note,
            "signals": signals
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
        
        return meta
    except Exception as e:
        print("Erro ao criar backup snapshot:", e)
        return None

def list_backups():
    backups = []
    try:
        if not os.path.exists(BACKUPS_DIR):
            return []
        files = [f for f in os.listdir(BACKUPS_DIR) if f.startswith('backup_') and f.endswith('.json')]
        for f in files:
            p = os.path.join(BACKUPS_DIR, f)
            stat = os.stat(p)
            try:
                with open(p, 'r', encoding='utf-8') as fp:
                    content = json.load(fp)
                backups.append({
                    "filename": f,
                    "createdAt": content.get("createdAt", datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()),
                    "formattedDate": content.get("formattedDate", datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M:%S")),
                    "count": content.get("count", len(content.get("signals", [])) if isinstance(content.get("signals"), list) else 0),
                    "note": content.get("note", "Ponto de parada automático"),
                    "sizeBytes": stat.st_size
                })
            except Exception:
                backups.append({
                    "filename": f,
                    "createdAt": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "formattedDate": datetime.datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M:%S"),
                    "count": 0,
                    "note": "Arquivo de backup",
                    "sizeBytes": stat.st_size
                })
        backups.sort(key=lambda x: x["createdAt"], reverse=True)
    except Exception as e:
        print("Erro ao listar backups:", e)
    return backups

def write_signals(data, create_backup=True, note="Ponto de parada automático"):
    try:
        if create_backup and isinstance(data, list) and len(data) > 0:
            create_backup_snapshot(note, data)
        with open(DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print("Erro ao gravar signals.json:", e)
        return False

class CHN4RequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        pathname = parsed.path

        if pathname == '/api/signals':
            signals = read_signals()
            content = json.dumps(signals, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        elif pathname == '/api/backups':
            backups = list_backups()
            content = json.dumps(backups, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return

        elif pathname == '/api/backups/download':
            query = parse_qs(parsed.query)
            file_param = query.get('file', [None])[0]
            if file_param:
                target_path = os.path.join(BACKUPS_DIR, os.path.basename(file_param))
                if os.path.exists(target_path):
                    with open(target_path, 'rb') as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self.send_header('Content-Disposition', f'attachment; filename="{os.path.basename(file_param)}"')
                    self.send_header('Content-Length', str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
            self.send_response(404)
            self.end_headers()
            return

        elif pathname == '/api/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(b': keepalive\n\n')
            return

        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        pathname = parsed.path

        if pathname == '/api/signals':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                new_signal = json.loads(body)
                signals = read_signals()
                idx = next((i for i, s in enumerate(signals) if s['code'] == new_signal['code']), -1)
                if idx >= 0:
                    signals[idx] = new_signal
                else:
                    signals.append(new_signal)
                write_signals(signals)
                res = json.dumps({"success": True}).encode('utf-8')
                self.send_response(201)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
            except Exception:
                self.send_response(400)
                self.end_headers()
            return

        elif pathname == '/api/backups/create':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
            try:
                parsed_body = json.loads(body) if body else {}
                note = parsed_body.get('note', 'Ponto de parada manual')
                meta = create_backup_snapshot(note)
                res = json.dumps({"success": True, "backup": meta}, ensure_ascii=False).encode('utf-8')
                self.send_response(201)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
            except Exception as e:
                self.send_response(400)
                self.end_headers()
            return

        elif pathname == '/api/backups/restore':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                parsed_body = json.loads(body)
                filename = parsed_body.get('filename')
                if filename:
                    target_path = os.path.join(BACKUPS_DIR, os.path.basename(filename))
                    if os.path.exists(target_path):
                        with open(target_path, 'r', encoding='utf-8') as f:
                            content = json.load(f)
                        restored = content.get('signals', []) if isinstance(content, dict) else (content if isinstance(content, list) else [])
                        create_backup_snapshot(f"Pré-restauração de {filename}")
                        with open(DB_FILE, 'w', encoding='utf-8') as f:
                            json.dump(restored, f, ensure_ascii=False, indent=2)
                        res = json.dumps({"success": True, "count": len(restored), "signals": restored}, ensure_ascii=False).encode('utf-8')
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json; charset=utf-8')
                        self.send_header('Content-Length', str(len(res)))
                        self.end_headers()
                        self.wfile.write(res)
                        return
                self.send_response(400)
                self.end_headers()
            except Exception:
                self.send_response(500)
                self.end_headers()
            return

        super().do_POST()

    def do_PUT(self):
        if self.path.startswith('/api/signals/'):
            code = unquote(self.path.replace('/api/signals/', ''))
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length).decode('utf-8')
            try:
                updated = json.loads(body)
                signals = read_signals()
                for i, s in enumerate(signals):
                    if s['code'] == code:
                        signals[i] = updated
                        break
                write_signals(signals)
                res = json.dumps({"success": True}).encode('utf-8')
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Content-Length', str(len(res)))
                self.end_headers()
                self.wfile.write(res)
            except Exception:
                self.send_response(400)
                self.end_headers()
            return

    def do_DELETE(self):
        if self.path.startswith('/api/signals/'):
            code = unquote(self.path.replace('/api/signals/', ''))
            signals = read_signals()
            new_signals = [s for s in signals if s['code'] != code]
            write_signals(new_signals)
            res = json.dumps({"success": True}).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(res)))
            self.end_headers()
            self.wfile.write(res)
            return

if __name__ == '__main__':
    print(f"=======================================================")
    print(f"  Servidor CHN-4 AtoN GIS rodando em http://localhost:{PORT}")
    print(f"  Banco de Dados JSON, Pontos de Parada & Backups ATIVOS")
    print(f"=======================================================")
    with socketserver.TCPServer(("", PORT), CHN4RequestHandler) as httpd:
        httpd.serve_forever()

