/* ============================================================
 * 🐶 狗头军师 · 前端逻辑
 * ------------------------------------------------------------
 * 隐私设计：对话记录、设置、长期记忆全部保存在【本浏览器】的
 * localStorage 里，服务器不保存任何数据 → 不同访问者互相看不到，
 * 只有本机可见。换浏览器/清缓存即视为新用户。
 * ============================================================ */
const $ = (s) => document.querySelector(s);

/* ---------------- 本地存储 ---------------- */
const LS = {
  settings: 'gtjs.settings',
  memory: 'gtjs.memory',
  conversations: 'gtjs.conversations',
};

const DEFAULT_SETTINGS = {
  apiBase: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  detailLevel: 3,
  stylePrompt: '',
  memoryEnabled: true,
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}
function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {
    console.error('保存到浏览器失败：', e);
    toast('⚠️ 浏览器存储失败（可能已满）');
  }
}

let settings = loadLS(LS.settings, DEFAULT_SETTINGS);
let memory = loadLS(LS.memory, []);
let conversations = loadLS(LS.conversations, []);
let currentConv = null;      // 当前打开的会话（conversations 数组内对象的引用）
let currentTab = 'chat';     // 'chat' | 'settings'
let sending = false;
let sendController = null;   // 当前请求的 AbortController（用于停止/超时掐断）
let toastTimer = null;

/* ---------------- 工具 ---------------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function fmtTime(t) {
  const d = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function makeTitle(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  return (t.slice(0, 24) || '新对话') + (t.length > 24 ? '…' : '');
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function saveConversations() { saveLS(LS.conversations, conversations); }
function saveSettingsLocal() { saveLS(LS.settings, settings); }
function saveMemoryLocal() { saveLS(LS.memory, memory); }

/* ---------------- 详细程度档位 ---------------- */
const DETAILS = {
  1: { name: '极简', desc: '一句话结论 + 一个现在就能做的小动作，100 字以内。' },
  2: { name: '简要', desc: '一句话结论 + 2~4 条要点，250 字以内。' },
  3: { name: '均衡', desc: '标准框架：接住情绪 → 拆事实 → 首选建议与理由 → 收束行动，400~700 字。' },
  4: { name: '详细', desc: '完整分析：情绪/事实/推测分开列，给 1~2 个备选方案及代价，含观察窗口与反馈信号，800~1300 字。' },
  5: { name: '复杂', desc: '深度多角度剖析：长期利益权衡、知识依据、分阶段计划、风险提示、可复制话术示例，1500 字以上。' },
};

/* ---------------- 预设 ---------------- */
const PRESETS = {
  openai: { apiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  deepseek: { apiBase: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  kimi: { apiBase: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  qwen: { apiBase: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  zhipu: { apiBase: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash' },
  groq: { apiBase: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  ollama: { apiBase: 'http://localhost:11434/v1', model: 'qwen2.5:7b' },
  custom: null, // 自定义：不预设，保留手填
};

/* ---------------- 标签页切换 ---------------- */
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + tab).classList.add('active');
  $('#settingsTabBtn').classList.toggle('active', tab === 'settings');
  if (tab === 'settings') loadSettingsIntoForm();
  else renderChat();
}

/* ---------------- 会话（全部本地） ---------------- */
function renderConvList() {
  const list = $('#convList');
  const sorted = [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!sorted.length) {
    list.innerHTML = '<div style="padding:16px;color:var(--text-3);font-size:12px;text-align:center;">还没有对话<br>点上方「新对话」开始 🐶</div>';
    return;
  }
  list.innerHTML = '';
  sorted.forEach((c) => {
    const firstUser = c.messages.find((m) => m.role === 'user');
    const preview = firstUser ? String(firstUser.content).slice(0, 40) : '';
    const item = document.createElement('div');
    item.className = 'conv-item' + (currentConv && currentConv.id === c.id ? ' active' : '');
    item.innerHTML = `
      <span class="conv-title">${esc(c.title || '新对话')}</span>
      <span class="conv-preview">${esc(preview || '（空对话）')}</span>
      <div class="conv-meta"><span>${c.messages.length} 条</span><span>·</span><span>${fmtTime(c.updatedAt || c.time).slice(5)}</span></div>
      <button class="conv-del" title="删除对话">🗑</button>`;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('conv-del')) return;
      openConversation(c.id);
    });
    item.querySelector('.conv-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`确定删除对话「${c.title || '新对话'}」吗？`)) return;
      deleteConversation(c.id);
    });
    list.appendChild(item);
  });
}

function newConversation() {
  // 只回到欢迎页，不创建会话；发送第一条消息时才真正新建会话
  currentConv = null;
  renderConvList();
  renderChat();
  $('#chatInput').focus();
}

function openConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  currentConv = conv;
  renderConvList();
  renderChat();
}

function deleteConversation(id) {
  conversations = conversations.filter((c) => c.id !== id);
  if (currentConv && currentConv.id === id) currentConv = null;
  saveConversations();
  renderConvList();
  renderChat();
  toast('对话已删除 🗑️');
}

function renameConversation(id, title) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  conv.title = title;
  conv.updatedAt = Date.now();
  saveConversations();
  if (currentConv && currentConv.id === id) $('#chatTitle').textContent = title;
  renderConvList();
}

/* ---------------- 聊天 ---------------- */
/*
 * 欢迎页（🐶 图标 + “我是狗头军师” + 说明文字）：
 * 在脚本加载时（DOM 已就绪）立即捕获原始 HTML。
 * 不能等到“第一次显示时”再抓——如果进应用时已有会话，
 * #chatMsgs 会被清空重建，原始欢迎页元素已被销毁，再抓就空白了。
 * 另备一份兜底模板，防止任何情况下抓取失败。
 */
const WELCOME_HTML = (() => {
  const el = document.getElementById('welcomeBox');
  return el ? el.outerHTML : '';
})() || `<div class="welcome" id="welcomeBox">
            <div class="welcome-dog">🐶</div>
            <h2>我是狗头军师</h2>
            <p>先接住你的情绪，再一起想办法。<br>恋爱、暧昧、聊天话术、关系修复、分手复合……<br>把心事讲给我听吧。</p>
            <div class="welcome-tags">
              <button class="tag" data-q="我喜欢的人好像不喜欢我，怎么办？">ta 好像不喜欢我</button>
              <button class="tag" data-q="帮我想一句高情商的回复话术">帮我回一句话</button>
              <button class="tag" data-q="我们最近总是吵架，怎么修复关系？">总是吵架</button>
              <button class="tag" data-q="刚分手很难受，怎么走出来？">分手了很难受</button>
            </div>
          </div>`;

function renderChat() {
  const box = $('#chatMsgs');
  const head = $('#chatHead');
  if (!currentConv) {
    box.innerHTML = WELCOME_HTML;
    head.style.display = 'none';
    $('#exportBtn').style.display = 'none';
    $('#deleteConvBtn').style.display = 'none';
    return;
  }
  head.style.display = 'flex';
  $('#exportBtn').style.display = '';
  $('#deleteConvBtn').style.display = '';
  $('#chatTitle').textContent = currentConv.title || '新对话';

  box.innerHTML = '';
  if (!currentConv.messages.length) {
    box.innerHTML = WELCOME_HTML;
  } else {
    currentConv.messages.forEach((m) => box.appendChild(buildMsg(m)));
  }
  box.scrollTop = box.scrollHeight;
}

/* 取当前要显示的版本内容（AI 回复支持多版本切换） */
function getVersion(m) {
  if (m.role === 'assistant' && Array.isArray(m.versions) && m.versions.length) {
    const vi = Math.min(m.vIndex || 0, m.versions.length - 1);
    return m.versions[vi];
  }
  return { content: m.content, mock: !!m.mock };
}

/* 构建单条消息元素：时间戳在左上角(AI)/右上角(用户)，操作区在消息下方（始终可见） */
function buildMsg(m) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (m.role === 'user' ? 'user' : 'ai');
  wrap.dataset.id = m.id;

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = fmtTime(m.time);
  wrap.appendChild(time);

  const version = getVersion(m);
  const mock = version.mock ? '<div class="mock-tag">⚠️ 示范模式回复（未配置 API Key）</div>' : '';
  const inner = m.role === 'assistant'
    ? renderMarkdown(version.content)
    : esc(m.content);
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = inner + mock;
  wrap.appendChild(bubble);

  /* 消息下方操作区 */
  const actions = document.createElement('div');
  actions.className = 'msg-actions';

  if (m.role === 'user') {
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn';
    editBtn.dataset.action = 'edit-msg';
    editBtn.dataset.id = m.id;
    editBtn.textContent = '✏️ 修改';
    actions.appendChild(editBtn);
    if (m.edited && m.edited.length) {
      const tag = document.createElement('span');
      tag.className = 'edited-tag';
      tag.textContent = `已编辑 ${m.edited.length} 次`;
      actions.appendChild(tag);
    }
  } else {
    const likeBtn = document.createElement('button');
    likeBtn.className = 'action-btn' + (m.liked ? ' liked' : '');
    likeBtn.dataset.action = 'like-msg';
    likeBtn.dataset.id = m.id;
    likeBtn.textContent = m.liked ? '👍 已赞' : '👍 赞';
    actions.appendChild(likeBtn);

    const regenBtn = document.createElement('button');
    regenBtn.className = 'action-btn';
    regenBtn.dataset.action = 'regen-msg';
    regenBtn.dataset.id = m.id;
    regenBtn.textContent = '🔄 重新生成';
    actions.appendChild(regenBtn);

    if (m.versions && m.versions.length > 1) {
      const vr = document.createElement('div');
      vr.className = 'reply-versions';
      const vi = Math.min(m.vIndex || 0, m.versions.length - 1);
      vr.innerHTML = `
        <button class="ver-arrow" data-action="prev-ver" data-id="${m.id}" title="上一版">◀</button>
        <span class="ver-info">第 ${vi + 1}/${m.versions.length} 版</span>
        <button class="ver-arrow" data-action="next-ver" data-id="${m.id}" title="下一版">▶</button>`;
      actions.appendChild(vr);
    }
  }
  wrap.appendChild(actions);
  return wrap;
}

/* 极简 Markdown 渲染（安全：先转义再还原受支持的标记） */
function renderMarkdown(text) {
  let s = esc(text);
  // 代码块
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;overflow-x:auto;font-size:12.5px;">${code.trim()}</pre>`);
  // 行内代码
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:12.5px;">${c}</code>`);
  // 粗体
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  // 标题
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  // 引用
  s = s.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  // 列表
  s = s.replace(/^[-*] (.+)$/gm, '• $1');
  // 数字列表
  s = s.replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2');
  // 分隔线
  s = s.replace(/^---+$/gm, '<hr>');
  // 自动换行
  s = s.replace(/\n/g, '<br>');
  return s;
}

const TIMEOUT_MS = 10 * 60 * 1000; // 思考超过 10 分钟直接掐断

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}分${String(s % 60).padStart(2, '0')}秒`;
}

function makeTyping() {
  const typing = document.createElement('div');
  typing.className = 'msg ai';
  typing.innerHTML = `<div class="bubble typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <div class="typing-timer">思考中（历时 0分00秒）</div></div>`;
  return typing;
}

function updateTypingTimer(typing, start) {
  const t = typing.querySelector('.typing-timer');
  if (t) t.textContent = `思考中（历时 ${fmtElapsed(Date.now() - start)}）`;
}

function showSysNote(box, text) {
  const note = document.createElement('div');
  note.className = 'msg ai';
  note.innerHTML = `<div class="bubble sys-note">${esc(text)}</div>`;
  box.appendChild(note);
  box.scrollTop = box.scrollHeight;
}

/* 停止生成（用户点击） */
function stopSending() {
  if (sendController) sendController.abort();
}

/* 发送消息；opts.editId = 修改某条用户消息后重发，opts.regenId = 重新生成某条 AI 回复 */
async function sendMessage(opts) {
  if (sending) return;
  const editId = opts && opts.editId;
  const regenId = opts && opts.regenId;
  const input = $('#chatInput');

  // 欢迎页状态下发送第一条消息时，自动创建新会话
  if (!currentConv) {
    const now = Date.now();
    currentConv = { id: uid(), title: '新对话', time: now, updatedAt: now, messages: [] };
    conversations.unshift(currentConv);
    saveConversations();
    renderConvList();
  }

  let text;
  let editMsg = null;
  let regenMsg = null;
  let oldVersions = null;   // 已有版本（编辑/重新生成时保留，用于版本切换）
  let newUserId = null;

  if (regenId) {
    regenMsg = currentConv.messages.find((m) => m.id === regenId && m.role === 'assistant');
    if (!regenMsg) return;
    const u = currentConv.messages.find((m) => m.id === regenMsg.parentId && m.role === 'user');
    if (!u) return;
    text = u.content;
    oldVersions = (regenMsg.versions && regenMsg.versions.length)
      ? regenMsg.versions.slice()
      : [{ content: regenMsg.content, time: regenMsg.time, mock: !!regenMsg.mock }];
    // 移除本条 AI 回复及其后的所有内容，重新生成
    const idx = currentConv.messages.indexOf(regenMsg);
    currentConv.messages.splice(idx);
    currentConv.updatedAt = Date.now();
    saveConversations();
    renderChat();
  } else if (editId) {
    editMsg = currentConv.messages.find((m) => m.id === editId && m.role === 'user');
    if (!editMsg) return;
    text = editMsg.content;
    const idx = currentConv.messages.indexOf(editMsg);
    // 记录紧随其后的旧 AI 回复的所有版本（用于切换）
    const next = currentConv.messages[idx + 1];
    if (next && next.role === 'assistant' && next.parentId === editMsg.id) {
      oldVersions = (next.versions && next.versions.length)
        ? next.versions.slice()
        : [{ content: next.content, time: next.time, mock: !!next.mock }];
    }
    // 截断该消息之后的所有内容，重新生成分支
    currentConv.messages.splice(idx + 1);
    editMsg.time = Date.now();
    if (!currentConv.title || currentConv.title === '新对话') currentConv.title = makeTitle(text);
    currentConv.updatedAt = Date.now();
    saveConversations();
    renderChat();
  } else {
    text = input.value.trim();
    if (!text) return;
    input.value = '';
    autoGrow();
    const box0 = $('#chatMsgs');
    if (box0.querySelector('.welcome')) box0.innerHTML = '';
    const userMsg = { id: uid(), role: 'user', content: text, time: Date.now() };
    newUserId = userMsg.id;
    currentConv.messages.push(userMsg);
    saveConversations();
    const u = buildMsg(userMsg);
    box0.appendChild(u);
  }

  const box = $('#chatMsgs');
  // 思考中提示 + 计时
  const typing = makeTyping();
  box.appendChild(typing);
  box.scrollTop = box.scrollHeight;

  sending = true;
  $('#sendBtn').disabled = true;
  $('#stopBtn').classList.remove('hidden');
  const start = Date.now();
  const timer = setInterval(() => updateTypingTimer(typing, start), 1000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('timeout'), TIMEOUT_MS);
  sendController = controller;

  try {
    const history = currentConv.messages
      .slice(-40)
      .map((m) => ({ role: m.role, content: m.content }));
    const data = await api('/api/chat', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ text, settings, memory, history }),
    });
    clearTimeout(timeoutId);
    clearInterval(timer);
    const now = Date.now();
    const elapsed = now - start;

    const newVersion = { content: data.reply, time: now, mock: !!data.mock };
    let aiMsg;
    if (regenMsg) {
      // 重新生成：保留旧版本，追加新版本，默认显示最新
      const versions = [...oldVersions, newVersion];
      aiMsg = { id: uid(), role: 'assistant', content: data.reply, time: now, mock: !!data.mock, parentId: regenMsg.parentId, versions, vIndex: versions.length - 1 };
    } else if (editMsg) {
      const versions = oldVersions
        ? [...oldVersions, newVersion]
        : [newVersion];
      aiMsg = { id: uid(), role: 'assistant', content: data.reply, time: now, mock: !!data.mock, parentId: editMsg.id, versions, vIndex: versions.length - 1 };
    } else {
      aiMsg = { id: uid(), role: 'assistant', content: data.reply, time: now, mock: !!data.mock, parentId: newUserId, versions: [newVersion], vIndex: 0 };
    }
    currentConv.messages.push(aiMsg);
    if (!currentConv.title || currentConv.title === '新对话') currentConv.title = makeTitle(text);
    currentConv.updatedAt = now;
    if (currentConv.messages.length > 400) currentConv.messages.splice(0, currentConv.messages.length - 400);
    saveConversations();

    if (Array.isArray(data.memory)) {
      memory = data.memory;
      saveMemoryLocal();
    }

    typing.remove();
    const ai = buildMsg(aiMsg);
    box.appendChild(ai);
    box.scrollTop = box.scrollHeight;
    $('#chatTitle').textContent = currentConv.title || '新对话';

    if (data.memoryUpdated && data.memoryUpdated.length) {
      toast(`🧠 记忆已更新 ${data.memoryUpdated.length} 条 · 思考用时 ${fmtElapsed(elapsed)}`);
    }
    renderConvList();
  } catch (err) {
    clearTimeout(timeoutId);
    clearInterval(timer);
    typing.remove();
    const isAbort = err && err.name === 'AbortError';
    if (isAbort) {
      const isTimeout = controller.signal.reason === 'timeout';
      if (isTimeout) {
        showSysNote(box, '⚠️ 已超时中断：思考超过 10 分钟，本次回复已掐断。可修改后重新发送。');
        toast('已超时中断（超过 10 分钟）');
      } else {
        showSysNote(box, '⏹ 已停止生成。可修改这条消息后重新发送。');
        toast('已停止生成');
      }
    } else {
      toast('发送失败：' + (err.message || err));
    }
  } finally {
    sending = false;
    sendController = null;
    $('#sendBtn').disabled = false;
    $('#stopBtn').classList.add('hidden');
    input.focus();
  }
}

/* ---------------- 编辑消息 ---------------- */
function beginEdit(id) {
  if (sending) return;
  const m = currentConv && currentConv.messages.find((x) => x.id === id && x.role === 'user');
  if (!m) return;
  const wrap = document.querySelector(`.msg[data-id="${id}"]`);
  if (!wrap) return;
  const bubble = wrap.querySelector('.bubble');
  if (!bubble) return;
  const ta = document.createElement('textarea');
  ta.className = 'edit-area';
  ta.value = m.content;
  ta.maxLength = 2000;
  ta.rows = 4;
  const actions = document.createElement('div');
  actions.className = 'edit-actions';
  actions.innerHTML = `
    <button class="ghost-btn btn-small" data-action="cancel-edit" data-id="${id}">取消</button>
    <button class="primary-btn btn-small" data-action="save-edit" data-id="${id}">保存并重新发送</button>`;
  bubble.replaceWith(ta);
  ta.after(actions);
  ta.focus();
  ta.select();
}

function saveEdit(id) {
  const m = currentConv && currentConv.messages.find((x) => x.id === id && x.role === 'user');
  if (!m) return;
  const ta = document.querySelector(`.msg[data-id="${id}"] .edit-area`);
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) { toast('内容不能为空'); return; }
  if (text === m.content) { renderChat(); return; } // 没改动，直接取消
  if (m.edited) m.edited.push({ content: m.content, time: Date.now() });
  else m.edited = [{ content: m.content, time: Date.now() }];
  m.content = text;
  sendMessage({ editId: id });
}

function cancelEdit() {
  renderChat();
}

/* 点赞/取消点赞 AI 回复 */
function likeMsg(id) {
  const m = currentConv && currentConv.messages.find((x) => x.id === id && x.role === 'assistant');
  if (!m) return;
  m.liked = !m.liked;
  saveConversations();
  const btn = document.querySelector(`.msg[data-id="${id}"] [data-action="like-msg"]`);
  if (btn) {
    btn.classList.toggle('liked', !!m.liked);
    btn.textContent = m.liked ? '👍 已赞' : '👍 赞';
  }
}

/* 重新生成 AI 回复（生成新版本） */
function regenMsg(id) {
  if (sending) return;
  sendMessage({ regenId: id });
}

/* ---------------- AI 回复版本切换 ---------------- */
function changeVersion(id, dir) {
  const m = currentConv && currentConv.messages.find((x) => x.id === id && x.role === 'assistant');
  if (!m || !m.versions || m.versions.length < 2) return;
  const max = m.versions.length - 1;
  let vi = (m.vIndex || 0) + dir;
  if (vi < 0) vi = max;
  if (vi > max) vi = 0;
  m.vIndex = vi;
  saveConversations();
  renderChat();
  const el = document.querySelector(`.msg[data-id="${id}"]`);
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function autoGrow() {
  const ta = $('#chatInput');
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
}

/* ---------------- 导出 Markdown（纯前端） ---------------- */
function exportConversationMd() {
  if (!currentConv) { toast('请先打开一个对话'); return; }
  const c = currentConv;
  const lines = [];
  lines.push(`# 🐶 狗头军师 · 对话记录`);
  lines.push('');
  lines.push(`- 会话：${c.title || '新对话'}`);
  lines.push(`- 创建：${fmtTime(c.time)}`);
  lines.push(`- 消息数：${c.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  c.messages.forEach((m) => {
    const who = m.role === 'user' ? '🧑 我' : '🐶 狗头军师';
    lines.push(`### ${who}（${fmtTime(m.time)}）`);
    lines.push('');
    lines.push(m.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  lines.push('> AI 建议仅供参考 · 紧急情况请寻求专业帮助');
  const md = lines.join('\n');

  const safe = (c.title || '对话').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
  const filename = `${safe}-${new Date().toISOString().slice(0, 10)}.md`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast(`已导出 ${filename} ⬇️`);
}

/* ---------------- 设置（全部本地） ---------------- */
function memoryToText(mem) {
  const label = { user: '用户', object: '对象', relationship: '关系', event: '事件', hypothesis: '推测', note: '备注' };
  return (mem || []).map((m) => `[${label[m.scope] || '备注'}] ${m.content}`).join('\n');
}

function loadSettingsIntoForm() {
  $('#setApiBase').value = settings.apiBase || '';
  $('#setApiKey').value = settings.apiKey || '';
  $('#setModel').value = settings.model || '';
  $('#detailSlider').value = settings.detailLevel || 3;
  $('#setStyle').value = settings.stylePrompt || '';
  $('#memSwitch').checked = !!settings.memoryEnabled;
  $('#memText').value = memoryToText(memory);
  updateDetailLabel();
  updateMemCount();
  highlightPreset();
}

function highlightPreset() {
  // 以【当前输入框】的值为准来判断命中了哪个预设（而不是已保存的 settings）
  const base = $('#setApiBase').value.trim().replace(/\/+$/, '');
  const model = $('#setModel').value.trim();
  let matched = 'custom';
  for (const key of Object.keys(PRESETS)) {
    const p = PRESETS[key];
    if (p && p.apiBase.replace(/\/+$/, '') === base && p.model === model) { matched = key; break; }
  }
  document.querySelectorAll('.preset').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.preset === matched);
  });
}

function updateDetailLabel() {
  const v = Number($('#detailSlider').value);
  const d = DETAILS[v] || DETAILS[3];
  $('#detailLabel').textContent = d.name;
  $('#detailDesc').textContent = `档位 ${v} · ${d.desc}`;
}

function updateMemCount() {
  $('#memCount').textContent = memory.length ? `共 ${memory.length} 条记忆` : '';
}

function saveSettings() {
  settings = {
    ...settings,
    apiBase: $('#setApiBase').value.trim(),
    apiKey: $('#setApiKey').value.trim(),
    model: $('#setModel').value.trim(),
    detailLevel: Number($('#detailSlider').value),
    stylePrompt: $('#setStyle').value.trim(),
    memoryEnabled: $('#memSwitch').checked,
  };
  saveSettingsLocal();
  highlightPreset();
  toast('设置已保存 💾（仅本浏览器）');
}

function saveMemoryText() {
  const text = $('#memText').value;
  const parsed = [];
  const scopeMap = { 用户: 'user', 对象: 'object', 关系: 'relationship', 事件: 'event', 推测: 'hypothesis', 备注: 'note' };
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const m = t.match(/^\[(用户|对象|关系|事件|推测|备注)\]\s*(.+)$/);
    if (m) parsed.push({ id: uid(), scope: scopeMap[m[1]], content: m[2].trim().slice(0, 200), time: Date.now() });
    else parsed.push({ id: uid(), scope: 'note', content: t.slice(0, 200), time: Date.now() });
  }
  memory = parsed.slice(0, 200);
  saveMemoryLocal();
  updateMemCount();
  toast('记忆已保存 🧠（仅本浏览器）');
}

/* ---------------- 事件绑定 ---------------- */
/* 新对话 */
$('#newChatBtn').addEventListener('click', newConversation);

/* 发送（注意：不能把事件对象传进去，否则会被当成 editId） */
$('#sendBtn').addEventListener('click', () => sendMessage());
$('#stopBtn').addEventListener('click', stopSending);
$('#chatInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});
$('#chatInput').addEventListener('input', autoGrow);

/* 消息操作：编辑 / 保存编辑 / 取消 / 版本切换（事件委托） */
$('#chatMsgs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit-msg') beginEdit(id);
  else if (action === 'save-edit') saveEdit(id);
  else if (action === 'cancel-edit') cancelEdit();
  else if (action === 'like-msg') likeMsg(id);
  else if (action === 'regen-msg') regenMsg(id);
  else if (action === 'prev-ver') changeVersion(id, -1);
  else if (action === 'next-ver') changeVersion(id, 1);
});

/* 欢迎页快捷问题：sendMessage 会自动创建新会话 */
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('tag')) {
    const q = e.target.dataset.q;
    if (!q) return;
    $('#chatInput').value = q;
    sendMessage();
  }
});

/* 重命名 */
function renameConv() {
  if (!currentConv) return;
  const name = prompt('重命名对话：', currentConv.title || '');
  if (name === null) return;
  const t = name.trim();
  if (t) renameConversation(currentConv.id, t);
}
$('#renameBtn').addEventListener('click', renameConv);
$('#chatTitle').addEventListener('dblclick', renameConv);

/* 删除当前对话 */
$('#deleteConvBtn').addEventListener('click', () => {
  if (!currentConv) return;
  if (!confirm(`确定删除对话「${currentConv.title}」吗？`)) return;
  deleteConversation(currentConv.id);
});

/* 导出 */
$('#exportBtn').addEventListener('click', exportConversationMd);
$('#exportBtn2').addEventListener('click', exportConversationMd);

/* 设置标签：已在设置里再点一下 = 返回对话 */
$('#settingsTabBtn').addEventListener('click', () => {
  if (currentTab === 'settings') switchTab('chat');
  else switchTab('settings');
});
/* 设置视图顶部的返回按钮 */
$('#settingsBackBtn').addEventListener('click', () => switchTab('chat'));

/* 手动修改 API 地址/模型名时，实时更新预设高亮 */
$('#setApiBase').addEventListener('input', highlightPreset);
$('#setModel').addEventListener('input', highlightPreset);

/* 预设 */
document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    if (key === 'custom') {
      // 自定义：如果当前填的正好是某个预设值，清空让用户手填；否则保留
      const base = $('#setApiBase').value.trim().replace(/\/+$/, '');
      const model = $('#setModel').value.trim();
      const isPreset = Object.values(PRESETS).some((p) => p && p.apiBase.replace(/\/+$/, '') === base && p.model === model);
      if (isPreset || (!base && !model)) {
        $('#setApiBase').value = '';
        $('#setModel').value = '';
      }
      toast('自定义模式：填写你的 API 地址 / Key / 模型名（任意 OpenAI 兼容接口）');
      $('#setApiBase').focus();
      highlightPreset();
      return;
    }
    const p = PRESETS[key];
    if (!p) return;
    $('#setApiBase').value = p.apiBase;
    $('#setModel').value = p.model;
    highlightPreset();
    if (key === 'ollama') toast(`已填入 Ollama 本地预设（${p.apiBase}），无需 API Key；地址和模型可再手动修改`);
    else toast(`已填入 ${btn.textContent} 预设（${p.model}）；地址和模型都可再手动修改`);
  });
});

/* 测试连接（只验证，不保存） */
$('#apiTestBtn').addEventListener('click', async () => {
  const btn = $('#apiTestBtn');
  const out = $('#apiTestResult');
  btn.disabled = true;
  btn.textContent = '测试中…';
  out.textContent = '';
  out.className = 'test-result';
  try {
    const r = await api('/api/settings/test', {
      method: 'POST',
      body: JSON.stringify({
        apiBase: $('#setApiBase').value.trim(),
        apiKey: $('#setApiKey').value.trim(),
        model: $('#setModel').value.trim(),
      }),
    });
    if (r.ok) {
      out.textContent = `✅ 连接成功！模型「${r.model}」可用`;
      out.className = 'test-result ok';
    } else {
      out.textContent = '❌ ' + (r.error || '测试失败');
      out.className = 'test-result err';
    }
  } catch (err) {
    out.textContent = '❌ 测试失败：' + err.message;
    out.className = 'test-result err';
  }
  btn.disabled = false;
  btn.textContent = '🧪 测试连接';
});

/* 详细程度滑块 */
$('#detailSlider').addEventListener('input', updateDetailLabel);

/* 记忆开关与编辑 */
$('#memSwitch').addEventListener('change', () => {
  const on = $('#memSwitch').checked;
  toast(on ? '已开启长期记忆 🧠' : '已关闭长期记忆（已保存的内容保留）');
});
$('#memClearBtn').addEventListener('click', async () => {
  if (!confirm('确定清空全部长期记忆吗？此操作不可恢复。')) return;
  memory = [];
  saveMemoryLocal();
  $('#memText').value = '';
  updateMemCount();
  toast('记忆已清空 🗑️');
});

/* 保存设置 / 恢复默认 */
$('#settingsSaveBtn').addEventListener('click', () => {
  saveSettings();
  saveMemoryText();
});
$('#settingsResetBtn').addEventListener('click', () => {
  if (!confirm('恢复默认设置？（会清空 API 配置与风格提示词，不影响对话记录与记忆）')) return;
  $('#setApiBase').value = 'https://api.deepseek.com/v1';
  $('#setApiKey').value = '';
  $('#setModel').value = 'deepseek-chat';
  $('#detailSlider').value = 3;
  $('#setStyle').value = '';
  $('#memSwitch').checked = true;
  updateDetailLabel();
  saveSettings();
});

/* ---------------- 启动 ---------------- */
(function init() {
  // 兼容旧数据：把设置里的默认值合并进去
  settings = { ...DEFAULT_SETTINGS, ...settings };
  saveSettingsLocal();
  renderConvList();
  // 有历史对话时自动打开最近的一个，否则显示欢迎页
  if (conversations.length) {
    const latest = [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    openConversation(latest.id);
  } else {
    renderChat();
  }
  if (currentTab !== 'chat') switchTab('chat');
})();
