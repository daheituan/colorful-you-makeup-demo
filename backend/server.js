const http = require("http");
const { URL } = require("url");

const styles = [
  { id: "clean-rose", type: "makeup", name: "清透玫瑰", tags: ["新手", "通勤", "低饱和"], score: 96,
    colors: { blush: "rgba(213, 89, 112, 0.30)", lip: "rgba(181, 55, 76, 0.48)", eye: "rgba(128, 73, 63, 0.24)" } },
  { id: "ash-brown", type: "hairColor", name: "亚麻冷棕", tags: ["显白", "低饱和", "通勤"], score: 91, color: "#7b6858" }
];

const sourcePosts = [
  { styleId: "clean-rose", title: "清透玫瑰妆教程合集", creator: "授权创作者示例", likes: 82000,
    url: "https://www.xiaohongshu.com/search_result?keyword=%E6%B8%85%E9%80%8F%E7%8E%AB%E7%91%B0%E5%A6%86%20%E6%95%99%E7%A8%8B" },
  { styleId: "ash-brown", title: "亚麻冷棕发色参考", creator: "授权发色博主示例", likes: 54000,
    url: "https://www.xiaohongshu.com/search_result?keyword=%E4%BA%9A%E9%BA%BB%E5%86%B7%E6%A3%95%20%E5%8F%91%E8%89%B2" }
];

function sendJson(response, body, statusCode = 200) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" });
  response.end(JSON.stringify(body, null, 2));
}

function router(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === "/api/styles") return sendJson(response, { styles });
  if (url.pathname === "/api/recommendations") {
    const styleId = url.searchParams.get("styleId");
    const posts = styleId ? sourcePosts.filter((post) => post.styleId === styleId) : sourcePosts;
    return sendJson(response, { posts: posts.sort((a, b) => b.likes - a.likes) });
  }
  if (url.pathname === "/api/health") return sendJson(response, { ok: true, service: "colorful-you-backend" });
  sendJson(response, { error: "Not found" }, 404);
}

http.createServer(router).listen(8787, () => console.log("Colorful You API running at http://localhost:8787"));
