/* ============================================================
 * 🐶 狗头军师 · 独立版后端（Node.js 原生 http，零依赖）
 * ------------------------------------------------------------
 * 无状态设计：服务器【不保存任何数据】。
 *   - 会话记录 / 设置 / 长期记忆 全部存在访问者的浏览器 localStorage 里，
 *     不同用户互相看不到，只有本机可见。
 *   - 本服务器只做三件事：提供静态页面、转发聊天请求（/api/chat）、
 *     测试连接（/api/settings/test）。
 * 启动：node server.js   （默认端口 3800，可用 PORT 环境变量改）
 * ============================================================ */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const mentor = require('./mentor.js'); // 🐶 狗头军师引擎

const PORT = Number(process.env.PORT) || 3800;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ---------------- HTTP ---------------- */
function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) { req.destroy(); reject(new Error('请求体过大')); }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('JSON 解析失败')); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return sendJson(res, 400, { error: '非法路径' }); }

  try {
    /* ============ API ============ */
    if (p.startsWith('/api/')) {
      /* 聊天：前端把 设置 + 历史消息 + 记忆 一起传来，本服务不保存 */
      if (p === '/api/chat' && req.method === 'POST') {
        const body = await readBody(req);
        const text = String(body.text || '').trim().slice(0, 2000);
        if (!text) return sendJson(res, 400, { error: '消息不能为空' });
        const cfg = {
          apiBase: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat',
          detailLevel: 3,
          stylePrompt: '',
          memoryEnabled: true,
          ...(body.settings && typeof body.settings === 'object' ? body.settings : {}),
        };
        const memory = Array.isArray(body.memory) ? body.memory.slice(0, 200) : [];
        const history = Array.isArray(body.history) ? body.history.slice(-40) : [];
        const result = await mentor.answer(cfg, history, text, memory, uid);
        return sendJson(res, 200, {
          reply: result.content,
          mock: !!result.mock,
          memoryUpdated: result.memoryUpdated || [],
          memory: result.memory || memory,
        });
      }

      /* 连接测试：用表单当前填的值直接验证，不保存 */
      if (p === '/api/settings/test' && req.method === 'POST') {
        const body = await readBody(req);
        const cfg = body && typeof body === 'object' ? body : {};
        const result = await mentor.test(cfg);
        return sendJson(res, 200, result);
      }

      return sendJson(res, 404, { error: '接口不存在' });
    }

    /* ============ 静态文件 ============ */
    const rel = p === '/' ? '/index.html' : p;
    const filePath = path.normalize(path.join(PUBLIC_DIR, rel));
    if (!filePath.startsWith(PUBLIC_DIR)) return sendJson(res, 403, { error: '禁止访问' });
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 Not Found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) sendJson(res, 500, { error: '服务器内部错误' });
  }
});

/* ---------------- 启动 ---------------- */
function lanIPs() {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const it of list || []) {
      if (it.family === 'IPv4' && !it.internal) ips.push(it.address);
    }
  }
  return ips;
}

server.listen(PORT, () => {
  console.log('');
  console.log('  🐶 狗头军师（独立版）已启动！');
  console.log(`  ➜ 本机访问：  http://localhost:${PORT}`);
  for (const ip of lanIPs()) console.log(`  ➜ 局域网访问：http://${ip}:${PORT}`);
  console.log('  ➜ 隐私说明：对话/设置/记忆只保存在每个访问者的浏览器本地');
  console.log('  ➜ 按 Ctrl+C 停止服务');
  console.log('');
});
