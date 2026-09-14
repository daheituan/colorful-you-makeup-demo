# Colorful You 网页应用制作教程

这份教程对应当前项目里的 `index.html`、`styles.css`、`src/catalog.js` 和 `src/app.js`，可以一边运行应用，一边打开这些文件对照学习。

## 1. 项目思路

原型核心思路是：读取用户照片/摄像头画面，进行人脸关键点检测，再通过图形叠加模拟妆容效果。当前 Demo 为了更适合答辩和验收，重点采用“上传照片 → 人脸定位 → Canvas 妆效叠加 → 前后对比”的流程。

## 2. 前端结构

- `index.html`：页面骨架和交互控件。
- `styles.css`：布局、视觉与响应式适配。
- `src/catalog.js`：妆容预设数据。
- `src/app.js`：上传、FaceMesh、人脸定位、Canvas 绘制、前后对比和导出。

## 3. 后端结构

当前 MVP 主流程不依赖后端，但保留了 Node.js 与 Python 原型接口，用于后续承载风格数据、推荐内容、收藏和用户反馈等功能。

Python 示例：

```bash
python backend/server.py
```

Node 示例：

```bash
node backend/server.js
```

接口示例：

```text
http://localhost:8787/api/styles
http://localhost:8787/api/recommendations
http://localhost:8787/api/health
```

## 4. 内容来源与合规

真实产品应优先使用平台开放 API、创作者授权、人工录入或有授权的数据服务。建议保存必要元数据和原帖链接，而不是未经许可复制创作者图片或视频。

`backend/crawlers/` 中保留了授权来源适配器的结构示例，用于说明未来的数据接入位置。

## 5. 当前试妆核心流程

1. 用户上传一张照片或使用内置示例图。
2. MediaPipe FaceMesh 尝试返回人脸 landmark。
3. 将归一化 landmark 映射到 Canvas 像素坐标。
4. 使用 Canvas 2D 在眼部、脸颊和嘴唇区域绘制低透明度妆效。
5. 用户切换妆容或调整强度时重新绘制。
6. 使用双 Canvas + `clip-path` 生成可拖动的妆前/妆后对比。
7. 将妆后 Canvas 导出为 PNG。

如果 FaceMesh CDN 或识别失败，程序会退化到基础位置估算，确保演示流程不会被完全中断。

## 6. 如何运行

在仓库根目录运行：

```bash
python3 -m http.server 5173
```

然后浏览器打开：

```text
http://localhost:5173
```

## 7. 部署建议

当前前端是静态站点，可使用 GitHub Pages、Vercel、Netlify 或普通 Web 服务器部署。由于 MediaPipe 资源通过 CDN 加载，正式演示时需要网络连接。

## 8. 下一阶段

- 增加肤色、脸型、五官特征分析，形成个性化推荐。
- 增加眉妆、修容、高光、粉底等区域。
- 引入更精细的人脸/皮肤分割模型。
- 做光照校正、侧脸姿态修正和遮挡处理。
- 接入账号、收藏、历史记录和推荐后端。
- 在用户明确授权的前提下探索更高保真的生成式妆容预览。
