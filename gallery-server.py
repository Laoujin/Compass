#!/usr/bin/env python3
"""On-demand Compass gallery server.

Serves _gallery.html (the layout/card/palette picker) and builds each
`<skeleton>-<card>` combo *when you navigate to it* — not all 42 up front. Every
time the iframe loads `/<skeleton>-<card>/` (i.e. you pick a layout/card or refresh)
that one combo is rebuilt from the current sources, so there is never a stale build:
edit a file -> refresh -> see it (~1.5s for the one combo). Sub-resources (css/js)
are served from that fresh build. Palette is swapped client-side, no rebuild.

Builds are logged to this terminal as `[build] s1-v7 ...`. If a build fails, the
iframe shows the Jekyll error instead of silently serving an old page.

Run:  python gallery-server.py            # http://localhost:4000/
      PORT=8080 python gallery-server.py

Needs Docker (builds run in ruby:3.3 with a cached bundle volume).
"""
import http.server
import os
import re
import subprocess
import sys
import threading

ROOT = os.path.dirname(os.path.abspath(__file__))
PREV = os.path.join(ROOT, "_previews")
PORT = int(os.environ.get("PORT", "4000"))
RUBY_IMAGE = "ruby:3.3"
BUNDLE_VOL = "compass-bundle"

COMBO = r"s[1-6]-v[1-7]"
# The combo "home page" requests that should trigger a rebuild (not every css/img).
INDEX_RE = re.compile(rf"^/({COMBO})(?:/|/index\.html)?$")
SUBRES_RE = re.compile(rf"^/({COMBO})/.+")

_build_lock = threading.Lock()
_buildno = 0


def docker(*args, **kw):
    base = ["docker", "run", "--rm",
            "-v", f"{ROOT}:/srv/jekyll",
            "-v", f"{BUNDLE_VOL}:/usr/local/bundle",
            "-w", "/srv/jekyll", RUBY_IMAGE]
    return subprocess.run(base + list(args), **kw)


def build(combo):
    """Build <combo> into _previews/<combo>. Returns (ok, log, token). Serialized.
    token is a fresh integer per build, used to cache-bust the served CSS links."""
    global _buildno
    skel, card = combo.split("-")
    with _build_lock:
        _buildno += 1
        token = _buildno
        print(f"[build] {combo} ...", flush=True)
        ov = os.path.join(ROOT, "_galleryoverride.yml")
        with open(ov, "w") as fh:
            fh.write(f"skeleton: {skel}\ncard: {card}\n")
        try:
            r = docker("bundle", "exec", "jekyll", "build",
                       "-d", f"_previews/{combo}",
                       "--config", "_config.yml,_galleryoverride.yml",
                       "--baseurl", f"/{combo}",
                       capture_output=True, text=True)
        finally:
            try:
                os.remove(ov)
            except OSError:
                pass
        if r.returncode != 0:
            print(f"[build] {combo} FAILED\n{r.stdout}{r.stderr}", flush=True)
            return False, (r.stdout + r.stderr), token
        return True, "", token


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=PREV, **kw)

    def end_headers(self):
        # Dev server: never let the browser cache or answer 304 with a stale asset.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        # Drop conditional-request headers so SimpleHTTPRequestHandler never returns
        # 304 against a cached (stale) css/js — always serve the freshly built file.
        for h in ("If-Modified-Since", "If-None-Match"):
            try:
                del self.headers[h]
            except Exception:
                pass
        try:
            path = self.path.split("?", 1)[0]
            if path in ("/", "/index.html"):
                return self._send(open(os.path.join(ROOT, "_gallery.html"), "rb").read(), "text/html")
            m = INDEX_RE.match(path)
            if m:                                   # combo home page -> always rebuild fresh
                combo = m.group(1)
                ok, log, token = build(combo)
                if not ok:
                    page = f"<!doctype html><meta charset=utf-8><body style='font:13px monospace;padding:1rem'>" \
                           f"<h3>build failed: {combo}</h3><pre>{self._esc(log)}</pre>"
                    return self._send(page.encode(), "text/html", code=500)
                # Serve the index with cache-busted CSS links (?v=<token>) so the
                # browser can never reuse a stale stylesheet from an earlier build.
                html = open(os.path.join(PREV, combo, "index.html"), encoding="utf-8").read()
                html = re.sub(r'(href="[^"?]+\.css)"', rf'\1?v={token}"', html)
                return self._send(html.encode("utf-8"), "text/html")
            # combo sub-resource or anything else: serve from _previews as-is
            return super().do_GET()
        except (ConnectionError, BrokenPipeError, OSError):
            # Client went away (often Chrome cancelling a socket during the build) —
            # benign; don't crash the handler thread or spam the terminal.
            pass

    def _send(self, data, ctype, code=200):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    @staticmethod
    def _esc(s):
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def log_message(self, fmt, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        # Suppress benign client-disconnect noise (WinError 10053/10054 etc.); only
        # surface genuine handler bugs.
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionError, BrokenPipeError, OSError)):
            return
        super().handle_error(request, client_address)


def main():
    os.makedirs(PREV, exist_ok=True)
    print("Installing gems (cached) ...", flush=True)
    r = docker("bundle", "install", "--quiet")
    if r.returncode != 0:
        print("WARNING: bundle install failed — builds will likely fail. Is Docker running?", flush=True)
    httpd = Server(("", PORT), Handler)
    print(f"Gallery (on-demand, rebuilds every navigation) at http://localhost:{PORT}/   Ctrl+C to stop", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
