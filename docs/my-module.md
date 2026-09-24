# 独立负责模块说明 — AI Real-time Makeup Coach V2

本版本独立完成从“静态虚拟试妆”到“实时跟妆助手”的核心升级。

## 负责内容

1. **实时摄像头链路**：基于 `getUserMedia` 获取用户视频流，并与 MediaPipe FaceMesh 实时关键点检测衔接。
2. **半脸 AR 妆效示范**：设计 Mirror Makeup Mode，通过 Canvas 裁剪只在一侧脸渲染 AI 妆效，另一侧保留真实画面供用户对照跟画。
3. **分步骤跟妆流程**：将完整妆容拆分为底妆、眉妆、眼妆、腮红、修容/高光和唇妆 6 个步骤，并提供步骤提示与进度控制。
4. **区域化妆容渲染**：从旧版简单椭圆叠色升级为 FaceMesh 多边形、动态渐变与关键点路径，增加 foundation / brow / contour / highlight 等区域。
5. **本地视觉分析**：在浏览器端计算脸部纵横比、眼距比例和画面亮度，形成结构化 visual profile，在不上传照片/视频的情况下给 Agent 提供视觉上下文。
6. **Makeup Agent 扩展**：将 Agent 输出从 `eye/blush/lip` 扩展为 `foundation/brow/eye/blush/contour/highlight/lip`，支持场景推荐和多轮局部调整。
7. **隐私与降级方案**：摄像头画面不上传后端；OpenAI 不可用时自动回退本地规则 Agent；摄像头不可用时支持照片备用模式。

## 技术栈

- JavaScript / Node.js
- HTML / CSS
- MediaPipe FaceMesh
- Canvas 2D API
- WebRTC `getUserMedia`
- OpenAI Responses API（可选，未配置时使用 local fallback）
