"""Serve only the deliverable HTML for preview on the same local network."""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

HTML = Path(__file__).resolve().parents[1] / 'index.html'

class PreviewHandler(BaseHTTPRequestHandler):
    def send_page(self, include_body=True):
        if urlsplit(self.path).path not in ('/', '/index.html'):
            self.send_error(404)
            return
        try:
            data = HTML.read_bytes()
        except OSError:
            self.send_error(503, 'Preview file unavailable')
            return
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        if include_body:
            self.wfile.write(data)

    def do_GET(self):
        self.send_page()

    def do_HEAD(self):
        self.send_page(False)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8766)
    options = parser.parse_args()
    server = ThreadingHTTPServer((options.bind, options.port), PreviewHandler)
    print(f'Preview: http://{options.bind}:{options.port}/', flush=True)
    server.serve_forever()
