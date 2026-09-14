"""Compliant content-ingestion placeholder for Colorful You."""

async def fetch_authorized_posts():
    return [{
        "externalId": "demo-001",
        "title": "清透玫瑰妆教程合集",
        "creator": "授权创作者示例",
        "url": "https://www.xiaohongshu.com/search_result?keyword=%E6%B8%85%E9%80%8F%E7%8E%AB%E7%91%B0%E5%A6%86%20%E6%95%99%E7%A8%8B",
        "likes": 82000,
        "tags": ["清透玫瑰", "新手", "低饱和"],
    }]

def classify_post(post):
    text = f"{post['title']} {' '.join(post['tags'])}"
    if "玫瑰" in text:
        return "clean-rose"
    if "冷棕" in text:
        return "ash-brown"
    return "general"
