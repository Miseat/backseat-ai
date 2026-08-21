# 🐶 狗头军师 / Dog-Head Military Advisor

---

# 中文版 / Chinese

## 简介

一个专注感情与恋爱咨询的 AI 对话助手（Dog-Head Military Advisor）。内置完整的狗头军师知识库——40+ 份关系心理学、沟通话术与安全边界文档，先接住你的情绪，再分清事实与猜测，最后给出可执行的选择。界面为现代侧边栏聊天风格：

- 左上角 **＋ 新对话**：随时开一个新会话
- 左侧导航：浏览/切换/删除所有历史对话记录
- 左下角 **⚙️ 设置**：API 配置、回复风格、长期记忆、导出对话

零依赖，不需要 `npm install`，电脑上装了 Node.js 就能跑。

## 🚀 快速开始

```bash
cd backseat-ai
node server.js
```

然后打开浏览器访问 **http://localhost:3800**

> 想换端口：`PORT=8080 node server.js`（Windows PowerShell 用 `$env:PORT=8080; node server.js`）
> 也可以直接双击 `启动狗头军师.bat`（会自动开浏览器）。

## ✨ 功能

| 功能 | 说明 |
| --- | --- |
| 🆕 多会话 | 每个对话独立保存，左侧列表可切换 / 重命名 / 删除 |
| 🔌 自配 API | OpenAI 兼容接口：预设（OpenAI / DeepSeek / Kimi / 通义 / 智谱GLM / Groq / Ollama 本地）+ ✍️ 自定义手填地址 / Key / 模型，带「测试连接」 |
| 🧠 长期记忆 | 开关控制；开启后自动提取关键信息（用户/对象/关系/事件/推测），跨对话生效，可手动查看、编辑、清空 |
| 🎨 自定义风格 | 设置里写一段「回复风格提示词」，每次回答都会遵守 |
| 📊 详细程度滑块 | 5 档：极简 → 简要 → 均衡 → 详细 → 复杂，控制回答篇幅与结构 |
| 📤 导出对话 | 一键把当前对话导出为 `xxx.md` 下载到本地 |
| 📚 内置知识库 | 完整 [goutoujunshi](https://github.com/powerycy/goutoujunshi) 知识库（40+ 份恋爱/情感文档），按问题自动检索注入 |
| 🛑 停止 / 修改 / 重新生成 | 生成中可停止；用户消息可修改重发、AI 回复可重新生成，每次产生一个新版本，用 ◀ ▶ 箭头切换 |

## 📁 文件结构

```
backseat-ai/
├── server.js          # 零依赖后端（Node 原生 http）：静态页面 + 聊天代理 + 连接测试
├── mentor.js          # 🐶 狗头军师引擎：知识检索 + 记忆提取 + 详细程度 + 风格
├── goutoujunshi/      # 狗头军师 Skill 知识库（完整保留）
├── public/            # 前端界面（纯静态，现代聊天界面）
│   ├── index.html
│   ├── style.css
│   └── app.js
├── README.md          # 说明文档（中文 + 英文）
└── 启动狗头军师.bat    # Windows 一键启动
```

## 🔌 API 接口

服务器**不保存任何数据**，只做无状态转发：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/chat` | 聊天：`{ text, settings, history, memory }` → `{ reply, mock, memoryUpdated, memory }` |
| POST | `/api/settings/test` | 测试连接：`{ apiBase, apiKey, model }` → `{ ok, model }` |

## 🔑 配置 API（三步）

1. 左下角 **⚙️ 设置** → **API 配置**
2. 点一个服务商预设（OpenAI / DeepSeek / Kimi / 通义 / 智谱GLM / Groq / Ollama 本地），或直接手填
3. 粘贴 **API Key**，点 **🧪 测试连接** 验证，最后 **💾 保存设置**

> 预设只是**一键填入常用地址和模型**的快捷方式，填完后地址和模型**仍可自由修改**（模型框有各家常用模型的下拉建议）；任何 OpenAI 兼容接口（硅基流动、vLLM、本地推理等）都可以手填，或用「✍️ 自定义」清空预设值后自行输入。地址通常是服务商文档里给的接口地址（大多以 `/v1` 结尾）。

**不填 Key 也能用**：进入示范模式，给出预设的温暖回复并提示配置；填好 Key 后自动切换为完整版军师。

## 🧠 长期记忆怎么工作

- 开启后，系统提示词会告诉狗头军师「记忆维护规则」：每轮判断有没有值得跨会话记住的新信息
- **在对话里直接说"记住…"、"请把这些计入到记忆中"**，军师会照做，并在回复末尾追加 `【记忆】scope|内容` 行
- 后端解析、去重后**返回给浏览器**，前端存进 localStorage；下次任何对话都会自动带上（跨对话生效）
- 设置页可以随时查看/编辑/清空全部记忆；关闭开关即不再提取（已存内容保留）

## 🗃️ 数据存哪里？—— 只在本机浏览器

**对话记录、设置（含 API Key）、长期记忆全部存在访问者自己的浏览器 localStorage 里**，服务器电脑上不保存任何用户数据：

- 每个访问者只能看到自己浏览器里存的对话，**用户之间互相看不到**，只有本机可见
- 同一台电脑换浏览器（Chrome → Edge）、换账号、或清除浏览器数据，就是"新用户"，看到的是空的
- 想彻底清空：浏览器设置里清除该站点的数据即可（或点对话旁边的 🗑、设置里的「清空记忆」）

## 🌍 部署到网站

这是一个**纯 Node.js 应用**（自带前端与 API），可以部署到任意支持 Node.js 的托管平台（如 Render、Koyeb、Glitch 等）：

1. 把代码推到 GitHub
2. 在托管平台新建 Web Service，关联该仓库
3. **启动命令填 `node server.js`**（本应用零依赖，无需安装/构建步骤）
4. 平台会自动分配端口（应用读取 `PORT` 环境变量，默认 3800）

部署后访问平台给你的网址即可使用，前端与 `/api/chat` 在同一域名下自动联通。

**注意事项：**

- 每个访问者的对话/设置/记忆仍然只存在**各自的浏览器 localStorage** 里，互不可见，部署平台不保存任何用户数据
- 免费托管一般会在一段时间无访问后休眠，再次访问会慢几秒（冷启动），属正常现象

## ⚠️ 说明

狗头军师提供的是关系教育与决策支持，不替代心理治疗、医疗诊断或紧急服务。紧急情况请寻求专业帮助。

---

# English Version / English

## Introduction

An AI chat assistant focused on relationship and love advice (Dog-Head Military Advisor). It ships with the full goutoujunshi knowledge base — 40+ documents on relationship psychology, communication scripts, and safety boundaries — that meets your emotions first, separates facts from assumptions, and gives actionable next steps. The UI follows a modern sidebar chat style:

- **＋ New Chat** (top-left): start a new conversation anytime
- **Left sidebar**: browse / switch / delete all past conversations
- **⚙️ Settings** (bottom-left): API config, reply style, long-term memory, export conversation

Zero dependencies — no `npm install` needed. Any machine with Node.js can run it.

## 🚀 Quick Start

```bash
cd backseat-ai
node server.js
```

Then open **http://localhost:3800** in your browser.

> Change port: `PORT=8080 node server.js` (Windows PowerShell: `$env:PORT=8080; node server.js`)
> Or double-click `启动狗头军师.bat` (opens the browser automatically).

## ✨ Features

| Feature | Description |
| --- | --- |
| 🆕 Multi-conversation | Each conversation is saved independently; switch / rename / delete from the left list |
| 🔌 Custom API | OpenAI-compatible endpoints: presets (OpenAI / DeepSeek / Kimi / Qwen / Zhipu GLM / Groq / local Ollama) + ✍️ custom URL / Key / model, with a "Test Connection" button |
| 🧠 Long-term memory | Toggle on/off; auto-extracts key facts (user / object / relationship / event / hypothesis) across conversations; view, edit and clear from Settings |
| 🎨 Custom style | Write a "reply style prompt" in Settings; every answer follows it |
| 📊 Detail level slider | 5 levels: Minimal → Brief → Balanced → Detailed → Complex, controlling answer length and structure |
| 📤 Export conversation | One click downloads the current conversation as `xxx.md` |
| 📚 Built-in knowledge base | The full [goutoujunshi](https://github.com/powerycy/goutoujunshi) knowledge base (40+ relationship/emotional docs), auto-retrieved per question |
| 🛑 Stop / Edit / Regenerate | Stop generation anytime; edit and resend a user message; regenerate an AI reply — each edit/regenerate becomes a new version, switchable with ◀ ▶ arrows |

## 📁 File Structure

```
backseat-ai/
├── server.js          # Zero-dependency backend (native Node http): static files + chat proxy + connection test
├── mentor.js          # 🐶 Advisor engine: knowledge retrieval + memory extraction + detail level + style
├── goutoujunshi/      # goutoujunshi Skill knowledge base (fully kept)
├── public/            # Frontend (pure static, modern chat UI)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── README.md          # Documentation (Chinese + English)
└── 启动狗头军师.bat    # Windows one-click launcher
```

## 🔌 API Endpoints

The server **stores nothing** — it is a stateless proxy:

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/chat` | Chat: `{ text, settings, history, memory }` → `{ reply, mock, memoryUpdated, memory }` |
| POST | `/api/settings/test` | Test connection: `{ apiBase, apiKey, model }` → `{ ok, model }` |

## 🔑 Configure API (three steps)

1. **⚙️ Settings** (bottom-left) → **API Configuration**
2. Click a provider preset (OpenAI / DeepSeek / Kimi / Qwen / Zhipu GLM / Groq / local Ollama), or fill in manually
3. Paste your **API Key**, click **🧪 Test Connection** to verify, then **💾 Save Settings**

> Presets are just **one-click shortcuts** that fill in common URLs and models — you can still **freely edit** the URL and model afterwards (the model field has a dropdown of common models). Any OpenAI-compatible endpoint (SiliconFlow, vLLM, local inference, etc.) works; use **✍️ Custom** to clear preset values and type your own. The URL is usually the endpoint from the provider's docs (most end with `/v1`).

**Works without a Key too**: the advisor falls back to a warm canned reply and reminds you to configure; once a Key is set, the full advisor takes over.

## 🧠 How Long-term Memory Works

- When enabled, the system prompt tells the advisor the "memory maintenance rules": every turn it checks whether there is new information worth remembering across conversations
- **Say "remember this..." or "please save this to memory" in the chat** and the advisor will comply, appending a `【记忆】scope|content` line at the end of its reply
- The backend parses, de-duplicates and **returns the memory to the browser**; the frontend stores it in localStorage; every future conversation automatically carries it (cross-conversation)
- View / edit / clear all memory from Settings; turning the switch off stops extraction (saved entries are kept)

## 🗃️ Where Is Data Stored? — Only in the Visitor's Browser

**Conversations, settings (including API Key) and long-term memory all live in the visitor's own browser localStorage** — the server machine stores no user data:

- Each visitor only sees the conversations stored in their own browser — **users cannot see each other's data**; it is local-only
- On the same machine, switching browsers (Chrome → Edge), switching OS accounts, or clearing browser data makes you a "new user" with an empty list
- To wipe everything: clear this site's data in browser settings (or delete conversations with 🗑, or clear memory in Settings)

## 🌍 Deploy to the Web

This is a **pure Node.js app** (frontend and API bundled together), so it can be deployed to any Node.js hosting platform (Render, Koyeb, Glitch, etc.):

1. Push the code to GitHub
2. Create a Web Service on the hosting platform and link the repo
3. Set the **start command to `node server.js`** (zero dependencies — no install or build step needed)
4. The platform assigns a port automatically (the app reads the `PORT` env var, default 3800)

After deployment, visit the URL the platform gives you — the frontend and `/api/chat` connect automatically on the same domain.

**Notes:**

- Every visitor's conversations / settings / memory still live only in **their own browser localStorage** — nobody sees each other's data, and the hosting platform stores no user data
- Free hosting usually sleeps after a period of inactivity; the first visit after that takes a few seconds longer (cold start), which is normal

## ⚠️ Disclaimer

The Dog-Head Military Advisor provides relationship education and decision support only. It does **not** replace psychological therapy, medical diagnosis, or emergency services. In an emergency, please seek professional help.
