# Colorful You — AI Real-time Makeup Coach V2

Colorful You 从“虚拟试妆图片 Demo”升级为 **AI 实时跟妆助手**：不只展示最终效果，而是让用户在摄像头里看到 **半张脸的 AI 妆效示范**，另一半保持真实画面，按步骤照着完成真实妆容。

## 1. 核心产品闭环

**实时摄像头 → FaceMesh 跟踪 → 本地视觉摘要 → Makeup Agent 推荐 → 半脸分步示范 → 用户对照另一半真实脸跟画 → 下一步骤**

与普通 P 图/滤镜的区别：目标不是替用户“生成一张化好妆的图”，而是帮助用户把推荐妆容真正画到自己脸上。

## 2. 最快运行

需要 Node.js 18+，不需要 npm install：

```bash
node backend/server.js
```

浏览器打开：`http://localhost:8787`

点击 **开启摄像头** 并允许摄像头权限。localhost 可以正常使用 `getUserMedia`。

没有 OpenAI API Key 时，Makeup Agent 会自动使用本地规则 fallback，因此完整跟妆 Demo 仍可运行。

## 3. 启用 OpenAI Makeup Agent

macOS / Linux：

```bash
export OPENAI_API_KEY="你的 API Key"
export OPENAI_MODEL="gpt-5.6-luna"
node backend/server.js
```

Windows PowerShell：

```powershell
$env:OPENAI_API_KEY="你的 API Key"
$env:OPENAI_MODEL="gpt-5.6-luna"
node backend/server.js
```

生产部署时请把 `OPENAI_API_KEY` 配置在部署平台 Secret / Environment Variables 中，**不要写进前端代码或提交 GitHub**。

## 4. V2 已实现

- **实时摄像头模式**：使用 `getUserMedia` 获取本地视频流。
- **MediaPipe FaceMesh 实时跟踪**：约每 100ms 更新一次关键点，视频绘制保持浏览器刷新节奏。
- **Mirror Makeup Mode**：AI 妆效只绘制在左/右半脸之一，另一半保持真实画面。
- **示范侧切换**：一键切换 AI 示范左半脸 / 右半脸。
- **6 步实时跟妆**：底妆、眉妆、眼妆、腮红、修容与高光、唇妆。
- **更细妆容参数**：`foundation / brow / eye / blush / contour / highlight / lip`。
- **Makeup Agent**：将面试、约会、通勤等自然语言需求转换成妆容方案和各区域强度。
- **多轮调整**：可以继续说“口红淡一点”“眉毛轻一点”“修容弱一点”。
- **本地视觉分析**：浏览器根据 FaceMesh 计算脸部纵横比、眼距比例，并根据当前 Canvas 估算画面亮度；只把结构化摘要提供给 Agent。
- **照片备用模式**：摄像头不可用时仍可上传照片或使用示例图测试步骤。
- **隐私设计**：摄像头画面/照片不上传后端；Agent API 只接收文字、妆容参数和本地计算出的非敏感视觉摘要。

## 5. 技术架构

```text
Camera / Photo
      ↓
MediaPipe FaceMesh
      ↓
Local visual profile
(face aspect / eye spacing / brightness)
      ↓
Makeup Agent
      ↓
Makeup Plan
{ look, intensity, foundation, brow, eye,
  blush, contour, highlight, lip }
      ↓
Real-time Half-face AR Renderer (Canvas)
      ↓
Step-by-step Makeup Coach
```

## 6. 实时渲染说明

V2 仍使用 Canvas 作为浏览器端实时渲染层，但已经从旧版本的“固定椭圆叠色”升级为：

- FaceMesh 区域多边形；
- 眉毛与嘴唇 Polygon Mask；
- 眼妆与腮红动态渐变；
- 修容/高光跟随关键点；
- 半脸裁剪；
- 实时视频跟踪。

这使它从静态 P 图 Demo 转变为 **实时 AR 跟妆交互原型**。

## 7. 推荐演示方式

1. 点击“开启摄像头”。
2. 输入：`明天面试，希望自然、精神一点`。
3. Agent 生成“清透玫瑰”等方案。
4. 保持 AI 示范在左半脸，右半脸保持真实。
5. 从 Step 1 底妆开始，点击“我画好了，下一步”。
6. 依次展示眉妆、眼妆、腮红、修容高光、唇妆。
7. 点击“AI 示范：左半脸”切换到右半脸，证明渲染不是静态贴图。
8. 再输入：`口红淡一点，腮红也弱一点`，展示多轮调整。

## 8. 当前边界与下一阶段

V2 已完成“实时跟妆”核心闭环，但以下功能仍属于下一阶段：

- **高保真材质迁移**：当前仍是实时 Canvas/AR 渲染，不是生成式皮肤材质重建。建议未来采用 Hybrid：实时 CV + WebGL/Shader，静态最终预览再调用生成式图像编辑。
- **Face Parsing**：当前区域主要由 FaceMesh Polygon 估算；下一步可引入皮肤、眉毛、嘴唇等像素级语义分割提高边界质量。
- **AI 完成度检测**：尚未自动判断“用户真实一侧是否已经画到目标位置/强度”。未来可加入 reference mask vs camera 的差异分析。
- **视频跟妆**：尚未解析教程视频的步骤、区域和时间轴。V3 可实现 Tutorial Video → Step Extraction → 用户实时跟练。
- **账号 / 收藏 / 历史 / 云同步**：暂未实现，因为目前优先验证实时跟妆 Hero Feature。
- **生产部署**：尚未部署托管后端；部署时需将 API Key 放入 Secret。

## 9. 项目定位

**Colorful You — AI Real-time Makeup Coach**

> 不仅告诉你这个妆适不适合你，还实时教你把它画出来。
