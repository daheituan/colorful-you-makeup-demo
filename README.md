# Colorful You — Makeup Agent Virtual Try-on Demo

针对“用户难以判断妆容是否适合自己”的 Web MVP。当前版本已经形成完整演示闭环：

**上传照片 → 用自然语言描述场景/偏好 → Makeup Agent 决策 → 自动应用妆容 → 多轮局部调整 → 妆前/妆后对比 → 导出结果**

## 1. 最快运行

无需安装 npm 依赖，Node.js 18+ 即可：

```bash
cd "coloful you"
node backend/server.js
```

浏览器打开：`http://localhost:8787`

此时即使没有 API Key，Makeup Agent 也会自动使用本地规则 fallback，因此 Demo 可以完整运行。

## 2. 启用 OpenAI Makeup Agent

推荐通过环境变量提供 API Key，不要把 Key 写进前端或提交到 GitHub。

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

也可以参考 `.env.example`。当前项目不自动读取 `.env`，避免增加依赖；如果需要，可自行用 dotenv 或部署平台的 Secret/Environment Variables 配置。

启动后访问 `http://localhost:8787/api/health`：

- `makeupAgent: "openai"`：正在使用 OpenAI Agent。
- `makeupAgent: "local-fallback"`：未配置 Key，前端会自动回退到本地 Agent。

## 3. Makeup Agent 已实现什么

Agent 不负责评价用户“好不好看”，而是把用户的**场景和偏好**转换成现有虚拟试妆引擎可以执行的参数：

```json
{
  "lookId": "clean-rose",
  "intensity": 0.5,
  "effects": {
    "eye": 1.0,
    "blush": 0.85,
    "lip": 0.7
  },
  "reply": "选择清透玫瑰并降低唇色与腮红，更适合自然正式的面试场景。"
}
```

支持两类交互：

- 场景推荐：`明天面试，希望自然、精神一点`、`今晚约会，想要冷调氛围感`。
- 多轮调整：第一次生成后继续说 `口红再淡一点`、`腮红不要这么明显`、`整体再浓一点`。

前端会保留当前妆容状态，局部调整只改变对应参数。

## 4. 其他已实现功能

- 本地上传 JPG / PNG，照片不上传 OpenAI API；API 只接收文字需求和当前妆容参数。
- 内置示例图，一键进入演示流程。
- 4 种妆容：清透玫瑰、拿铁柔雾、冷调梅子、蜜桃元气。
- MediaPipe FaceMesh 眼部、双颊、唇部关键点定位。
- FaceMesh 失败时使用基础位置估算降级。
- Canvas 眼影、腮红、唇色叠加。
- 整体强度 + Agent 控制的局部强度。
- 妆前 / 妆后拖动分割线。
- PNG 结果导出。
- OpenAI Agent 失败/未配置时自动本地 fallback。

## 5. 项目结构

```text
coloful you/
├── index.html
├── styles.css
├── .env.example
├── .gitignore
├── src/
│   ├── app.js          # 图片、FaceMesh、Canvas、状态与 UI
│   ├── agent.js        # Agent 客户端 + 本地 fallback
│   └── catalog.js      # 妆容预设
├── backend/
│   └── server.js       # 静态服务 + /api/agent OpenAI 代理
├── docs/
│   ├── learn-colorful-you.md
│   └── my-module.md
└── demo/
    └── colorful-you-demo.mp4
```

## 6. Agent 架构

```text
User natural language
       ↓
Makeup Agent
       ↓
{ lookId, intensity, eye, blush, lip }
       ↓
Virtual Makeup Engine (Canvas + FaceMesh)
       ↓
Before / After Preview
       ↓
User feedback → next Agent turn
```

为了避免在浏览器暴露 API Key，OpenAI 请求统一通过 `backend/server.js` 的 `/api/agent` 转发。

## 7. Demo 演示建议（45–60 秒）

1. 点击“使用内置示例图”。
2. 在 Makeup Agent 输入：`明天面试，希望自然、精神一点`。
3. 展示 Agent 自动切换妆容并调整强度。
4. 再输入：`口红再淡一点，腮红也弱一点`。
5. 强调第二轮只修改局部参数，体现 Agent 的状态与决策。
6. 拖动妆前/妆后分割线。
7. 点击导出结果。
8. 说明 API 不可用时有本地 fallback，答辩演示不会中断。

## 8. 尚未完成

- 当前妆效是 2D Canvas 模拟，不是生成式高保真材质迁移。
- Agent 当前使用文字场景和用户偏好，不读取用户照片内容做视觉分析。
- 未加入粉底、眉妆、修容、高光等更细参数。
- 未做账号、收藏、历史记录和云同步。
- 未部署生产后端；正式部署时需要把 `OPENAI_API_KEY` 放在平台 Secret 中。

## 9. 隐私说明

照片始终在浏览器端用于 FaceMesh / Canvas 处理。当前 `/api/agent` 只会发送用户输入的文字和妆容参数，不会发送照片。
