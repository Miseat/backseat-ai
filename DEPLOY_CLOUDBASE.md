# 🚀 部署到腾讯云 CloudBase（云开发）· 零绑卡免费方案

本应用是**完整 Node.js 应用**，CloudBase 用「静态托管（前端）+ 云函数（后端）」两件套就能跑起来，**免费额度按月刷新、个人聊天用量远用不完，只需实名认证、不需要绑卡**。

> 云函数是真正的 Node 运行时，知识库（`goutoujunshi/`）已随函数打包，直接可读。

## 准备
1. 注册腾讯云账号：https://cloud.tencent.com （需**实名认证**，手机号 + 身份证，免费）
2. 打开**云开发 CloudBase** 控制台：https://console.cloud.tencent.com/tcb
3. 创建环境（免费版即可），记下环境 ID（形如 `xxx-1a2b3c`）

## 第 1 步：部署前端（静态托管）
1. 控制台 → **静态网站托管** → 开通
2. 把项目 `public/` 目录里的内容（`index.html`、`style.css`、`app.js`）**直接拖拽上传**
3. 记下默认域名：`https://<环境ID>.tcloudbaseapp.com`（先不要急着用，等函数配好）

## 第 2 步：部署后端（云函数）
1. 控制台 → **云函数** → 新建云函数
2. 名称填 `api`，运行环境选 **Nodejs16 或更高**，创建方式选**空函数/上传代码包**
3. 上传代码包：用项目里现成的 **`cloudbase/api-function.zip`**（内含 index.js + mentor.js + goutoujunshi/ 知识库）
4. 创建后点进函数 → **触发管理 / HTTP 访问服务** → 开启，**触发路径填 `/api/*`**（若控制台不支持通配符，就分别加两个路径：`/api/chat` 和 `/api/settings/test`）
5. 保存后记下函数的访问地址，形如：
   - `https://<环境ID>.service.tcloudbase.com/api/chat`（同一域名下静态与函数共存）或
   - `https://<环境ID>-<函数名>-<服务ID>.ap-shanghai.app.tcloudbase.com`（云函数独立域名）

## 第 3 步：让前端找到云函数
打开 `public/index.html`，找到文件末尾的注释，**取消注释并按你的函数地址填写**：

```html
<script>window.API_BASE = 'https://<你的云函数地址>';</script>
```

> 如果第 2 步的触发路径配置后，`https://<环境ID>.tcloudbaseapp.com/api/chat` 直接能通（静态与函数同域），则**不用改**，API_BASE 保持空即可。

改完后把 `index.html` **重新上传**到静态托管覆盖。

## 第 4 步：验证
1. 访问 `https://<环境ID>.tcloudbaseapp.com`，在浏览器地址栏直接试：
   `https://<你的API_BASE>/api/chat` 应返回 JSON（而不是 404）
2. 打开应用 → ⚙️ 设置 → 填 API Key → 测试连接 ✅ → 聊天 ✅

## 更新代码后
- 改了 `mentor.js` 或知识库：重新执行
  `node scripts/打包或手动复制` —— 简便做法：**重新生成 zip 并覆盖上传云函数**
  （项目里可以跑：把 `mentor.js` 和 `goutoujunshi/` 复制进 `cloudbase/functions/api/` 后重新压缩）
- 改了前端：重新上传 `public/` 内容

## 费用说明
- CloudBase 免费版每月额度（以控制台为准）：云函数调用次数、资源使用量、静态托管流量都有免费额度，**个人聊天应用用量极小，远低于免费额度，相当于一直免费**
- 不需要绑银行卡，仅需实名认证

## 常见问题
| 现象 | 处理 |
| --- | --- |
| 聊天提示"发送失败" | 检查 API_BASE 是否正确、`/api/chat` 是否返回 404 |
| `/api/chat` 404 | 云函数没创建/没开 HTTP 触发/触发路径不对 |
| 跨域报错 | 云函数已自动带 CORS 头；确认 API_BASE 填的是函数完整域名 |
| 测试连接失败 | 检查 API 地址/Key/模型，或函数运行日志（云函数 → 日志） |
