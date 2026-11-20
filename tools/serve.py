"""프로토타입 로컬 서버 — 캐시를 끄고 prototype/ 를 서빙한다 (수정 사항이 바로 보이도록)."""
import functools
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "prototype")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("", PORT), handler) as httpd:
        print(f"Serving prototype at http://localhost:{PORT}")
        httpd.serve_forever()
