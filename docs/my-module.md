# 独立负责模块说明 — Colorful You Makeup Agent

## 我独立负责的模块

### 1. 完整虚拟试妆 Demo 流程

将原先不完整的实时摄像头原型重构为更稳定、适合展示的照片型流程：

`上传照片 → 人脸定位 → 选择/推荐妆容 → Canvas 叠加 → 前后对比 → 导出`

### 2. Makeup Agent 设计与实现

将“用户需要自己判断选哪个妆容”的问题转化为 Agent 决策任务。Agent 接收自然语言场景和偏好，并输出结构化工具参数：

- `lookId`：选择哪套妆容；
- `intensity`：整体妆感；
- `effects.eye`：眼妆相对强度；
- `effects.blush`：腮红相对强度；
- `effects.lip`：唇色相对强度；
- `reply`：简短解释。

这些参数会直接作用于现有虚拟试妆渲染引擎，而不是只生成文字建议。

### 3. 多轮状态调整

在前端保存最近 Agent 状态。用户可以在第一次推荐后继续输入：

- “口红再淡一点”
- “腮红不要这么明显”
- “整体再浓一点”

Agent 会保留没有被要求修改的参数，只更新目标区域，使流程具备“状态 → 决策 → 执行 → 反馈 → 再决策”的 Agent 特征。

### 4. OpenAI API 安全接入

OpenAI 请求放在 Node 后端 `/api/agent` 中，API Key 仅从服务器环境变量 `OPENAI_API_KEY` 读取，避免把密钥放在浏览器 JavaScript 或 GitHub 仓库中。

当前 Agent 只把用户文字和妆容参数发送到模型，不上传用户照片。

### 5. Local Fallback

为保证现场演示稳定，另外实现了浏览器本地规则 Agent。OpenAI API 未配置、超时或请求失败时，前端会自动切换到 fallback，仍可完成场景推荐和局部调整。

这使 Demo 同时具备：

- 联网时：LLM 对自然语言有更强泛化能力；
- 离线/无 Key 时：核心演示流程不会中断。

### 6. 人脸定位与妆效渲染

负责 MediaPipe FaceMesh 接入、关键点映射、Canvas 妆效叠加、强度控制和识别失败的基础定位降级逻辑。

### 7. 交互与展示

实现 Makeup Agent 输入框、快捷 Prompt、响应解释、Agent 模式标识、妆前/妆后滑杆以及导出功能，并整理 README 和演示流程。

## 技术栈

- HTML / CSS / Vanilla JavaScript
- Canvas 2D
- MediaPipe FaceMesh
- Node.js HTTP Server
- OpenAI Responses API（可选）

## 设计重点

我没有让 Agent 对用户外貌进行“美丑打分”或敏感属性推断，而是让它负责将用户明确给出的场景与偏好转成可执行妆容参数。这样既直接对应产品问题，也降低了不必要的主观审美判断。
