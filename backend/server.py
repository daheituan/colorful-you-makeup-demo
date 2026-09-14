from http.server import BaseHTTPRequestHandler, HTTPServer
from json import dumps
from urllib.parse import parse_qs, urlparse

STYLES = [
    {"id":"clean-rose","type":"makeup","name":"清透玫瑰","tags":["新手","通勤","低饱和"],"score":96,
     "colors":{"blush":"rgba(213, 89, 112, 0.30)","lip":"rgba(181, 55, 76, 0.48)","eye":"rgba(128, 73, 63, 0.24)"}},
    {"id":"ash-brown","type":"hairColor","name":"亚麻冷棕","tags":["显白","低饱和","通勤"],"score":91,"color":"#7b6858"},
]

SOURCE_POSTS = [
    {"styleId":"clean-rose","title":"清透玫瑰妆教程合集","creator":"授权创作者示例","likes":82000,
     "url":"https://www.xiaohongshu.com/search_result?keyword=%E6%B8%85%E9%80%8F%E7%8E%AB%E7%91%B0%E5%A6%86%20%E6%95%99%E7%A8%8B"},
    {"styleId":"ash-brown","title":"亚麻冷棕发色参考","creator":"授权发色博主示例","likes":54000,
     "url":"https://www.xiaohongshu.com/search_result?keyword=%E4%BA%9A%E9%BA%BB%E5%86%B7%E6%A3%95%20%E5%8F%91%E8%89%B2"},
]

class ApiHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        if parsed.path == "/api/styles":
            return self.send_json({"styles": STYLES})
        if parsed.path == "/api/recommendations":
            style_id = query.get("styleId", [None])[0]
            posts = [p for p in SOURCE_POSTS if not style_id or p["styleId"] == style_id]
            return self.send_json({"posts": sorted(posts, key=lambda p: p["likes"], reverse=True)})
        if parsed.path == "/api/health":
            return self.send_json({"ok": True, "service": "colorful-you-backend"})
        self.send_json({"error":"Not found"}, status=404)

    def send_json(self, body, status=200):
        payload = dumps(body, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

if __name__ == "__main__":
    server = HTTPServer(("localhost", 8787), ApiHandler)
    print("Colorful You API running at http://localhost:8787")
    server.serve_forever()
