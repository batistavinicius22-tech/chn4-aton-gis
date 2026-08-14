import http.server
import socketserver
import json
import os
from urllib.parse import unquote

PORT = 3000
DB_FILE = os.path.join(os.path.dirname(__file__), 'signals.json')

def read_signals():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print("Erro ao ler signals.json:", e)
    return []

def write_signals(data):
    try:
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
        if self.path == '/api/signals':
            signals = read_signals()
            content = json.dumps(signals, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        elif self.path == '/api/events':
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(b': keepalive\n\n')
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/signals':
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
            except Exception as e:
                self.send_response(400)
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
            except Exception as e:
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
    print(f"  Banco de Dados JSON e Interoperabilidade ATIVOS")
    print(f"=======================================================")
    with socketserver.TCPServer(("", PORT), CHN4RequestHandler) as httpd:
        httpd.serve_forever()
