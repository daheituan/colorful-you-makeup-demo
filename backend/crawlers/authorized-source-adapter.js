/**
 * Placeholder for compliant content ingestion.
 * Use official APIs, creator-authorized submissions, licensed providers,
 * or manually reviewed public links. Do not bypass login or mirror
 * creator media without permission.
 */
async function fetchAuthorizedPosts() {
  return [{
    externalId: "demo-001",
    title: "清透玫瑰妆教程合集",
    creator: "授权创作者示例",
    url: "https://www.xiaohongshu.com/search_result?keyword=%E6%B8%85%E9%80%8F%E7%8E%AB%E7%91%B0%E5%A6%86%20%E6%95%99%E7%A8%8B",
    likes: 82000,
    tags: ["清透玫瑰", "新手", "低饱和"]
  }];
}
function classifyPost(post) {
  const text = `${post.title} ${post.tags.join(" ")}`;
  if (text.includes("玫瑰")) return "clean-rose";
  if (text.includes("冷棕")) return "ash-brown";
  return "general";
}
module.exports = { fetchAuthorizedPosts, classifyPost };
