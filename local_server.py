#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import json
import re
import ssl


ROOT = Path(__file__).resolve().parent
CONFIG_PATH = ROOT / "config" / "api.local.js"
HOST = "127.0.0.1"
PORT = 8080
SSL_CONTEXT = ssl._create_unverified_context()


def read_api_config():
    text = CONFIG_PATH.read_text(encoding="utf-8")

    def value(name):
        match = re.search(rf'{name}\s*:\s*"([^"]+)"', text)
        if not match:
            raise ValueError(f"Missing {name} in {CONFIG_PATH}")
        return match.group(1)

    return {
        "base_url": value("baseUrl").rstrip("/"),
        "authorization": value("authorization"),
        "cf_client_id": value("cfAccessClientId"),
        "cf_client_secret": value("cfAccessClientSecret"),
    }


def upstream_headers(config, content_type=None):
    headers = {
        "authorization": config["authorization"],
        "cf-access-client-id": config["cf_client_id"],
        "cf-access-client-secret": config["cf_client_secret"],
        "accept": "*/*",
        "user-agent": "curl/8.7.1",
    }
    if content_type:
        headers["content-type"] = content_type
    return headers


class FreyrLocalHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.split("?", 1)[0] == "/api/model-info":
            self.proxy_model_info()
            return
        super().do_GET()

    def do_POST(self):
        if self.path.split("?", 1)[0] == "/api/chat/completions":
            self.proxy_chat_completions()
            return
        self.send_error(404, "Not found")

    def proxy_model_info(self):
        try:
            config = read_api_config()
            request = Request(
                f'{config["base_url"]}/model/info',
                headers=upstream_headers(config),
                method="GET",
            )
            with urlopen(request, timeout=30, context=SSL_CONTEXT) as response:
                body = response.read()
                self.send_response(response.status)
                self.send_header("content-type", response.headers.get("content-type", "application/json"))
                self.send_header("cache-control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except HTTPError as error:
            self.send_upstream_error(error.code, error.read())
        except (OSError, URLError, ValueError) as error:
            self.send_json_error(502, str(error))

    def proxy_chat_completions(self):
        try:
            config = read_api_config()
            length = int(self.headers.get("content-length", "0"))
            body = self.rfile.read(length)
            request = Request(
                f'{config["base_url"]}/chat/completions',
                data=body,
                headers=upstream_headers(config, "application/json"),
                method="POST",
            )
            with urlopen(request, timeout=180, context=SSL_CONTEXT) as response:
                self.send_response(response.status)
                self.send_header("content-type", response.headers.get("content-type", "application/json"))
                self.send_header("cache-control", "no-store")
                self.end_headers()
                while True:
                    chunk = response.read(8192)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()
        except HTTPError as error:
            self.send_upstream_error(error.code, error.read())
        except (OSError, URLError, ValueError) as error:
            self.send_json_error(502, str(error))

    def send_upstream_error(self, status, body):
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(body or json.dumps({"error": "Upstream request failed"}).encode("utf-8"))

    def send_json_error(self, status, message):
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("cache-control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode("utf-8"))


if __name__ == "__main__":
    print(f"Serving Freyr static site at http://{HOST}:{PORT}/models.html")
    ThreadingHTTPServer((HOST, PORT), FreyrLocalHandler).serve_forever()
