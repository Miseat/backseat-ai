/* ============================================================
 * 🐶 狗头军师 · 前端逻辑（中英文双语）
 * ------------------------------------------------------------
 * 隐私设计：对话记录、设置、长期记忆全部保存在【本浏览器】的
 * localStorage 里，服务器不保存任何数据 → 不同访问者互相看不到，
 * 只有本机可见。换浏览器/清缓存即视为新用户。
 * 语言：设置页顶部切换 中文/English，默认中文，存在 settings.language。
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
  language: 'zh', // 默认中文
};

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}

/* ---------------- 国际化 ---------------- */
const I18N = {
  zh: {
    appName: '狗头军师',
    appTagline: '感情咨询 · 先接住情绪，再想办法',
    newChat: '新对话',
    historyLabel: '历史对话',
    settings: '设置',
    renameTitle: '点击重命名',
    rename: '重命名',
    exportTitle: '导出当前对话为 Markdown',
    export: '导出',
    deleteConv: '删除当前对话',
    chatPlaceholder: '说说你的心事…（Enter 发送，Shift+Enter 换行）',
    inputTip: 'AI 建议仅供参考 · 紧急情况请寻求专业帮助',
    stopTitle: '停止生成',
    stop: '停止',
    send: '发送',
    languageLabel: '语言 / Language',
    backToChat: '← 返回对话',
    settingsTitle: '⚙️ 设置',
    apiConfig: '🔌 API 配置',
    qwenName: '通义',
    zhipuName: '智谱GLM',
    ollamaName: 'Ollama(本地)',
    customName: '✍️ 自定义',
    presetTip: '预设 = 一键填入常用地址和模型，<b>之后仍可自由修改</b>；不想用预设就直接手填，或点「✍️ 自定义」。',
    apiBaseLabel: 'API 地址',
    apiBaseTip: '填服务商文档里的接口地址（OpenAI 兼容格式，通常以 /v1 结尾）。预设已含各家正确地址，也可整体替换。',
    apiKeyLabel: 'API Key（只保存在本机）',
    modelLabel: '模型名称',
    modelTip: '点预设会自动填该家的推荐模型，这里可<b>任意改成该平台支持的其他模型</b>（下拉可参考常用模型名）。',
    testConnection: '🧪 测试连接',
    replySettings: '💬 回复设置',
    detailLevel: '回答详细程度',
    detailMin: '极简', detailBrief: '简要', detailBalanced: '均衡', detailDetailed: '详细', detailComplex: '复杂',
    detailNames: { 1: '极简', 2: '简要', 3: '均衡', 4: '详细', 5: '复杂' },
    detailDescs: {
      1: '一句话结论 + 一个现在就能做的小动作，100 字以内。',
      2: '一句话结论 + 2~4 条要点，250 字以内。',
      3: '标准框架：接住情绪 → 拆事实 → 首选建议与理由 → 收束行动，400~700 字。',
      4: '完整分析：情绪/事实/推测分开列，给 1~2 个备选方案及代价，含观察窗口与反馈信号，800~1300 字。',
      5: '深度多角度剖析：长期利益权衡、知识依据、分阶段计划、风险提示、可复制话术示例，1500 字以上。',
    },
    detailDescLine: (v, d) => `档位 ${v} · ${d}`,
    stylePrompt: '自定义回复风格提示词',
    stylePlaceholder: '例如：多用比喻和共情，语气温柔；每次结尾给出 3 个具体行动选项；不用太学术，像朋友聊天…',
    styleTip: '这段文字会作为「回复风格要求」注入给狗头军师',
    memory: '🧠 长期记忆',
    memoryDesc: '跨对话记住你和对象的关键信息（MBTI、关系阶段、重要事件…）',
    memoryContentLabel: '记忆内容（每行一条，可手动编辑）',
    memoryPlaceholder: '[用户] 用户是 INTJ，主观评分 75\n[对象] 对象代号小A，用户评分 88\n[关系] 双方认识 3 个月，正在暧昧期\n[事件] 上周五一起看了电影，氛围不错\n[推测] 用户猜测对象是回避型依恋（置信度中）',
    clearMemory: '🗑️ 清空记忆',
    exportConversation: '📤 导出对话',
    exportTip: '把当前对话导出为 Markdown 文件（xxx.md）保存到本地。',
    exportCurrent: '⬇️ 导出当前对话为 .md',
    saveSettings: '💾 保存设置',
    resetDefaults: '恢复默认',
    welcomeTitle: '我是狗头军师',
    welcomeDesc: '先接住你的情绪，再一起想办法。<br>恋爱、暧昧、聊天话术、关系修复、分手复合……<br>把心事讲给我听吧。',
    welcomeApiNote: '🔑 请自行接入 API 以正常使用；接入办法请自行搜索（可百度），在 ⚙️ 设置 → API 配置 里填写。',
    welcomeTags: [
      { q: '我喜欢的人好像不喜欢我，怎么办？', label: 'ta 好像不喜欢我' },
      { q: '帮我想一句高情商的回复话术', label: '帮我回一句话' },
      { q: '我们最近总是吵架，怎么修复关系？', label: '总是吵架' },
      { q: '刚分手很难受，怎么走出来？', label: '分手了很难受' },
    ],
    noConversations: '还没有对话<br>点上方「新对话」开始 🐶',
    emptyConv: '（空对话）',
    msgCount: (n) => `${n} 条`,
    deleteConvTitle: '删除对话',
    deleteConvConfirm: (t) => `确定删除对话「${t}」吗？`,
    convDeleted: '对话已删除 🗑️',
    renamePrompt: '重命名对话：',
    renamed: '已重命名 ✏️',
    renameFailed: '重命名失败：',
    mockTag: '⚠️ 示范模式回复（未配置 API Key）',
    edit: '✏️ 修改',
    editedCount: (n) => `已编辑 ${n} 次`,
    like: '👍 赞',
    liked: '👍 已赞',
    regenerate: '🔄 重新生成',
    prevVer: '上一版',
    nextVer: '下一版',
    versionInfo: (i, n) => `第 ${i}/${n} 版`,
    thinking: (el) => `思考中（历时 ${el}）`,
    timeoutNote: '⚠️ 已超时中断：思考超过 10 分钟，本次回复已掐断。可修改后重新发送。',
    stoppedNote: '⏹ 已停止生成。可修改这条消息后重新发送。',
    timeoutToast: '已超时中断（超过 10 分钟）',
    stoppedToast: '已停止生成',
    sendFailed: '发送失败：',
    requestFailed: '请求失败',
    memoryUpdated: (n, el) => `🧠 记忆已更新 ${n} 条 · 思考用时 ${el}`,
    cancel: '取消',
    saveAndResend: '保存并重新发送',
    emptyContent: '内容不能为空',
    openConvFirst: '请先打开一个对话',
    exportDocTitle: '# 🐶 狗头军师 · 对话记录',
    exportConv: '会话：',
    exportCreated: '创建：',
    exportMsgCount: '消息数：',
    exportMe: '🧑 我',
    exportAdvisor: '🐶 狗头军师',
    exportDisclaimer: '> AI 建议仅供参考 · 紧急情况请寻求专业帮助',
    exported: (f) => `已导出 ${f} ⬇️`,
    memoryScopeLabels: { user: '用户', object: '对象', relationship: '关系', event: '事件', hypothesis: '推测', note: '备注' },
    memoryCount: (n) => `共 ${n} 条记忆`,
    settingsSaved: '设置已保存 💾（仅本浏览器）',
    memorySaved: '记忆已保存 🧠（仅本浏览器）',
    memoryCleared: '记忆已清空 🗑️',
    clearMemoryConfirm: '确定清空全部长期记忆吗？此操作不可恢复。',
    memOn: '已开启长期记忆 🧠',
    memOff: '已关闭长期记忆（已保存的内容保留）',
    customMode: '自定义模式：填写你的 API 地址 / Key / 模型名（任意 OpenAI 兼容接口）',
    presetOllama: (base) => `已填入 Ollama 本地预设（${base}），无需 API Key；地址和模型可再手动修改`,
    presetFilled: (name, model) => `已填入 ${name} 预设（${model}）；地址和模型都可再手动修改`,
    testing: '测试中…',
    connSuccess: (m) => `✅ 连接成功！模型「${m}」可用`,
    testFailed: '❌ 测试失败：',
    connError: '❌ ',
    resetConfirm: '恢复默认设置？（会清空 API 配置与风格提示词，不影响对话记录与记忆）',
    browserStorageFail: '⚠️ 浏览器存储失败（可能已满）',
    langSwitched: '🌐 语言已切换',
  },
  en: {
    appName: 'Backseat AI',
    appTagline: 'Relationship advice · meet emotions first, then find a way',
    newChat: 'New chat',
    historyLabel: 'Conversations',
    settings: 'Settings',
    renameTitle: 'Click to rename',
    rename: 'Rename',
    exportTitle: 'Export current conversation as Markdown',
    export: 'Export',
    deleteConv: 'Delete current conversation',
    chatPlaceholder: 'Tell me what\u2019s on your mind\u2026 (Enter to send, Shift+Enter for new line)',
    inputTip: 'AI advice is for reference only \u00b7 seek professional help in emergencies',
    stopTitle: 'Stop generating',
    stop: 'Stop',
    send: 'Send',
    languageLabel: 'Language',
    backToChat: '\u2190 Back to chat',
    settingsTitle: '\u2699\ufe0f Settings',
    apiConfig: '🔌 API Configuration',
    qwenName: 'Qwen',
    zhipuName: 'Zhipu GLM',
    ollamaName: 'Ollama (local)',
    customName: '\u270d\ufe0f Custom',
    presetTip: 'Presets are one-click shortcuts \u2014 you can <b>still edit the URL and model freely</b>; or fill in manually, or use \u201c\u270d\ufe0f Custom\u201d.',
    apiBaseLabel: 'API Base URL',
    apiBaseTip: 'The endpoint from your provider\u2019s docs (OpenAI-compatible, usually ends with /v1). Presets include the correct URLs for each provider.',
    apiKeyLabel: 'API Key (stored locally only)',
    modelLabel: 'Model Name',
    modelTip: 'Clicking a preset fills in that provider\u2019s recommended model \u2014 you can <b>change it to any model the provider supports</b> (dropdown shows common names).',
    testConnection: '🧪 Test Connection',
    replySettings: '💬 Reply Settings',
    detailLevel: 'Answer Detail Level',
    detailMin: 'Minimal', detailBrief: 'Brief', detailBalanced: 'Balanced', detailDetailed: 'Detailed', detailComplex: 'Complex',
    detailNames: { 1: 'Minimal', 2: 'Brief', 3: 'Balanced', 4: 'Detailed', 5: 'Complex' },
    detailDescs: {
      1: 'One-sentence conclusion + one small action you can take right now (under ~100 words).',
      2: 'One-sentence conclusion + 2\u20134 bullet points (~250 words max).',
      3: 'Standard structure: meet emotions \u2192 separate facts \u2192 top recommendation with reasons \u2192 a concrete next step (400\u2013700 words).',
      4: 'Full analysis: emotions / facts / assumptions listed separately, 1\u20132 alternative options with trade-offs, observation window and feedback signals (800\u20131300 words).',
      5: 'Deep multi-angle analysis: long-term trade-offs, knowledge references, phased plan, risk notes, copy-ready example lines (1500+ words).',
    },
    detailDescLine: (v, d) => `Level ${v} \u00b7 ${d}`,
    stylePrompt: 'Custom Reply Style Prompt',
    stylePlaceholder: 'e.g. Use metaphors and empathy, warm tone; end each reply with 3 concrete action options; keep it casual, like a friend\u2026',
    styleTip: 'This text is injected to the advisor as a \u201creply style requirement\u201d.',
    memory: '🧠 Long-term Memory',
    memoryDesc: 'Remember key facts about you and your person across conversations (MBTI, relationship stage, important events\u2026)',
    memoryContentLabel: 'Memory content (one per line, editable)',
    memoryPlaceholder: '[User] The user is INTJ, subjective score 75\n[Object] Object code-named A, user score 88\n[Relationship] Known each other for 3 months, in the talking stage\n[Event] Went to a movie together last Friday, good vibe\n[Hypothesis] User suspects the object is avoidant attachment (medium confidence)',
    clearMemory: '🗑\ufe0f Clear Memory',
    exportConversation: '📤 Export Conversation',
    exportTip: 'Export the current conversation as a Markdown file (xxx.md) saved locally.',
    exportCurrent: '\u2b07\ufe0f Export current conversation as .md',
    saveSettings: '💾 Save Settings',
    resetDefaults: 'Reset defaults',
    welcomeTitle: 'I\u2019m the Dog-Head Military Advisor',
    welcomeDesc: 'Let me meet your emotions first, then we\u2019ll figure it out together.<br>Crush, dating, reply scripts, repair, breakups\u2026<br>Tell me what\u2019s on your mind.',
    welcomeApiNote: '🔑 Please connect your own API for full functionality; search online for setup guides, then fill it in under ⚙️ Settings → API Configuration.',
    welcomeTags: [
      { q: 'Someone I like doesn\'t seem to like me. What should I do?', label: 'They seem uninterested' },
      { q: 'Help me write a high-EQ reply to a message', label: 'Help me reply' },
      { q: 'We keep fighting lately. How do we fix our relationship?', label: 'We keep fighting' },
      { q: 'I just broke up and it hurts a lot. How do I move on?', label: 'Just broke up' },
    ],
    noConversations: 'No conversations yet<br>Click \u201cNew chat\u201d above to start 🐶',
    emptyConv: '(empty)',
    msgCount: (n) => `${n} msgs`,
    deleteConvTitle: 'Delete conversation',
    deleteConvConfirm: (t) => `Delete conversation \u201c${t}\u201d?`,
    convDeleted: 'Conversation deleted 🗑\ufe0f',
    renamePrompt: 'Rename conversation:',
    renamed: 'Renamed \u270f\ufe0f',
    renameFailed: 'Rename failed: ',
    mockTag: '\u26a0\ufe0f Demo reply (no API Key configured)',
    edit: '\u270f\ufe0f Edit',
    editedCount: (n) => `Edited ${n} times`,
    like: '👍 Like',
    liked: '👍 Liked',
    regenerate: '🔄 Regenerate',
    prevVer: 'Previous version',
    nextVer: 'Next version',
    versionInfo: (i, n) => `v${i}/${n}`,
    thinking: (el) => `Thinking\u2026 (${el})`,
    timeoutNote: '\u26a0\ufe0f Timed out: thinking exceeded 10 minutes, this reply was cut off. You can edit and resend.',
    stoppedNote: '\u23f9 Stopped generating. You can edit this message and send again.',
    timeoutToast: 'Timed out (over 10 minutes)',
    stoppedToast: 'Stopped generating',
    sendFailed: 'Send failed: ',
    requestFailed: 'Request failed',
    memoryUpdated: (n, el) => `🧠 Memory updated (${n}) \u00b7 thinking ${el}`,
    cancel: 'Cancel',
    saveAndResend: 'Save & resend',
    emptyContent: 'Content cannot be empty',
    openConvFirst: 'Please open a conversation first',
    exportDocTitle: '# 🐶 Backseat AI \u00b7 Conversation Log',
    exportConv: 'Conversation: ',
    exportCreated: 'Created: ',
    exportMsgCount: 'Messages: ',
    exportMe: '🧑 Me',
    exportAdvisor: '🐶 Backseat AI',
    exportDisclaimer: '> AI advice is for reference only \u00b7 seek professional help in emergencies',
    exported: (f) => `Exported ${f} \u2b07\ufe0f`,
    memoryScopeLabels: { user: 'User', object: 'Object', relationship: 'Relationship', event: 'Event', hypothesis: 'Hypothesis', note: 'Note' },
    memoryCount: (n) => `${n} memories`,
    settingsSaved: 'Settings saved 💾 (this browser only)',
    memorySaved: 'Memory saved 🧠 (this browser only)',
    memoryCleared: 'Memory cleared 🗑\ufe0f',
    clearMemoryConfirm: 'Clear all long-term memory? This cannot be undone.',
    memOn: 'Long-term memory enabled 🧠',
    memOff: 'Long-term memory disabled (saved entries are kept)',
    customMode: 'Custom mode: enter your API URL / Key / model (any OpenAI-compatible endpoint)',
    presetOllama: (base) => `Filled Ollama local preset (${base}) \u2014 no API Key needed; you can still edit the URL and model`,
    presetFilled: (name, model) => `Filled ${name} preset (${model}); URL and model are still editable`,
    testing: 'Testing\u2026',
    connSuccess: (m) => `\u2705 Connected! Model \u201c${m}\u201d works`,
    testFailed: '\u274c Test failed: ',
    connError: '\u274c ',
    resetConfirm: 'Reset default settings? (clears API config and style prompt; conversations and memory are kept)',
    browserStorageFail: '\u26a0\ufe0f Browser storage failed (may be full)',
    langSwitched: '🌐 Language switched',
  },
};

let settings = loadLS(LS.settings, DEFAULT_SETTINGS);
let lang = (settings && settings.language === 'en') ? 'en' : 'zh';
function t(key, ...args) {
  const v = (I18N[lang] && I18N[lang][key]) !== undefined ? I18N[lang][key] : I18N.zh[key];
  return typeof v === 'function' ? v(...args) : (v !== undefined ? v : key);
}
function isDefaultTitle(title) {
  return !title || title === '新对话' || title === 'New chat' || title === t('newChat');
}

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
  const tt = String(text || '').trim().replace(/\s+/g, ' ');
  return (tt.slice(0, 24) || t('newChat')) + (tt.length > 24 ? '…' : '');
}

function toast(msg) {
  const tt = $('#toast');
  tt.textContent = msg;
  tt.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => tt.classList.remove('show'), 2800);
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || t('requestFailed'));
  return data;
}

function saveConversations() { saveLS(LS.conversations, conversations); }
function saveSettingsLocal() { saveLS(LS.settings, settings); }
function saveMemoryLocal() { saveLS(LS.memory, memory); }

function saveLS(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {
    console.error('save failed:', e);
    toast(t('browserStorageFail'));
  }
}

/* ---------------- 详细程度档位（双语） ---------------- */
function detailInfo(v) {
  const L = lang === 'en' ? 'en' : 'zh';
  const n = Number(v);
  return {
    name: (I18N[L].detailNames[n] || I18N[L].detailNames[3]),
    desc: (I18N[L].detailDescs[n] || I18N[L].detailDescs[3]),
  };
}

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
    list.innerHTML = `<div style="padding:16px;color:var(--text-3);font-size:12px;text-align:center;">${t('noConversations')}</div>`;
    return;
  }
  list.innerHTML = '';
  sorted.forEach((c) => {
    const firstUser = c.messages.find((m) => m.role === 'user');
    const preview = firstUser ? String(firstUser.content).slice(0, 40) : '';
    const item = document.createElement('div');
    item.className = 'conv-item' + (currentConv && currentConv.id === c.id ? ' active' : '');
    item.innerHTML = `
      <span class="conv-title">${esc(isDefaultTitle(c.title) ? t('newChat') : c.title)}</span>
      <span class="conv-preview">${esc(preview || t('emptyConv'))}</span>
      <div class="conv-meta"><span>${t('msgCount', c.messages.length)}</span><span>·</span><span>${fmtTime(c.updatedAt || c.time).slice(5)}</span></div>
      <button class="conv-del" title="${t('deleteConvTitle')}">🗑</button>`;
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('conv-del')) return;
      openConversation(c.id);
    });
    item.querySelector('.conv-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(t('deleteConvConfirm', c.title || t('newChat')))) return;
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
  toast(t('convDeleted'));
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
/* 欢迎页：按当前语言动态构建（不缓存，语言切换后自动更新） */
function buildWelcomeHTML() {
  const tags = t('welcomeTags').map((x) =>
    `<button class="tag" data-q="${esc(x.q)}">${esc(x.label)}</button>`).join('');
  return `<div class="welcome" id="welcomeBox">
            <div class="welcome-dog">🐶</div>
            <h2>${t('welcomeTitle')}</h2>
            <p>${t('welcomeDesc')}</p>
            <div class="welcome-tags">${tags}</div>
            <div class="welcome-note">${t('welcomeApiNote')}</div>
          </div>`;
}

function renderChat() {
  const box = $('#chatMsgs');
  const head = $('#chatHead');
  if (!currentConv) {
    box.innerHTML = buildWelcomeHTML();
    head.style.display = 'none';
    $('#exportBtn').style.display = 'none';
    $('#deleteConvBtn').style.display = 'none';
    return;
  }
  head.style.display = 'flex';
  $('#exportBtn').style.display = '';
  $('#deleteConvBtn').style.display = '';
  $('#chatTitle').textContent = isDefaultTitle(currentConv.title) ? t('newChat') : currentConv.title;

  box.innerHTML = '';
  if (!currentConv.messages.length) {
    box.innerHTML = buildWelcomeHTML();
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
  const mock = version.mock ? `<div class="mock-tag">${t('mockTag')}</div>` : '';
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
    editBtn.textContent = t('edit');
    actions.appendChild(editBtn);
    if (m.edited && m.edited.length) {
      const tag = document.createElement('span');
      tag.className = 'edited-tag';
      tag.textContent = t('editedCount', m.edited.length);
      actions.appendChild(tag);
    }
  } else {
    const likeBtn = document.createElement('button');
    likeBtn.className = 'action-btn' + (m.liked ? ' liked' : '');
    likeBtn.dataset.action = 'like-msg';
    likeBtn.dataset.id = m.id;
    likeBtn.textContent = m.liked ? t('liked') : t('like');
    actions.appendChild(likeBtn);

    const regenBtn = document.createElement('button');
    regenBtn.className = 'action-btn';
    regenBtn.dataset.action = 'regen-msg';
    regenBtn.dataset.id = m.id;
    regenBtn.textContent = t('regenerate');
    actions.appendChild(regenBtn);

    if (m.versions && m.versions.length > 1) {
      const vr = document.createElement('div');
      vr.className = 'reply-versions';
      const vi = Math.min(m.vIndex || 0, m.versions.length - 1);
      vr.innerHTML = `
        <button class="ver-arrow" data-action="prev-ver" data-id="${m.id}" title="${t('prevVer')}">◀</button>
        <span class="ver-info">${t('versionInfo', vi + 1, m.versions.length)}</span>
        <button class="ver-arrow" data-action="next-ver" data-id="${m.id}" title="${t('nextVer')}">▶</button>`;
      actions.appendChild(vr);
    }
  }
  wrap.appendChild(actions);
  return wrap;
}

/* 极简 Markdown 渲染（安全：先转义再还原受支持的标记） */
function renderMarkdown(text) {
  let s = esc(text);
  s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_, l, code) =>
    `<pre style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;overflow-x:auto;font-size:12.5px;">${code.trim()}</pre>`);
  s = s.replace(/`([^`\n]+)`/g, (_, c) => `<code style="background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:1px 5px;font-size:12.5px;">${c}</code>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  s = s.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
  s = s.replace(/^[-*] (.+)$/gm, '• $1');
  s = s.replace(/^(\d+)\.\s+(.+)$/gm, '$1. $2');
  s = s.replace(/^---+$/gm, '<hr>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

const TIMEOUT_MS = 10 * 60 * 1000; // 思考超过 10 分钟直接掐断

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, '0');
  return lang === 'en' ? `${m}m ${ss}s` : `${m}分${ss}秒`;
}

function makeTyping() {
  const typing = document.createElement('div');
  typing.className = 'msg ai';
  typing.innerHTML = `<div class="bubble typing"><span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <div class="typing-timer">${t('thinking', fmtElapsed(0))}</div></div>`;
  return typing;
}

function updateTypingTimer(typing, start) {
  const tt = typing.querySelector('.typing-timer');
  if (tt) tt.textContent = t('thinking', fmtElapsed(Date.now() - start));
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
    currentConv = { id: uid(), title: '', time: now, updatedAt: now, messages: [] };
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
    const next = currentConv.messages[idx + 1];
    if (next && next.role === 'assistant' && next.parentId === editMsg.id) {
      oldVersions = (next.versions && next.versions.length)
        ? next.versions.slice()
        : [{ content: next.content, time: next.time, mock: !!next.mock }];
    }
    currentConv.messages.splice(idx + 1);
    editMsg.time = Date.now();
    if (isDefaultTitle(currentConv.title)) currentConv.title = makeTitle(text);
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
      const versions = [...oldVersions, newVersion];
      aiMsg = { id: uid(), role: 'assistant', content: data.reply, time: now, mock: !!data.mock, parentId: regenMsg.parentId, versions, vIndex: versions.length - 1 };
    } else if (editMsg) {
      const versions = oldVersions ? [...oldVersions, newVersion] : [newVersion];
      aiMsg = { id: uid(), role: 'assistant', content: data.reply, time: now, mock: !!data.mock, parentId: editMsg.id, versions, vIndex: versions.length - 1 };
    } else {
      aiMsg = { id: uid(), role: 'assistant', content: data.reply, time: now, mock: !!data.mock, parentId: newUserId, versions: [newVersion], vIndex: 0 };
    }
    currentConv.messages.push(aiMsg);
    if (isDefaultTitle(currentConv.title)) currentConv.title = makeTitle(text);
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
    $('#chatTitle').textContent = isDefaultTitle(currentConv.title) ? t('newChat') : currentConv.title;

    if (data.memoryUpdated && data.memoryUpdated.length) {
      toast(t('memoryUpdated', data.memoryUpdated.length, fmtElapsed(elapsed)));
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
        showSysNote(box, t('timeoutNote'));
        toast(t('timeoutToast'));
      } else {
        showSysNote(box, t('stoppedNote'));
        toast(t('stoppedToast'));
      }
    } else {
      toast(t('sendFailed') + (err.message || err));
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
    <button class="ghost-btn btn-small" data-action="cancel-edit" data-id="${id}">${t('cancel')}</button>
    <button class="primary-btn btn-small" data-action="save-edit" data-id="${id}">${t('saveAndResend')}</button>`;
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
  if (!text) { toast(t('emptyContent')); return; }
  if (text === m.content) { renderChat(); return; }
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
    btn.textContent = m.liked ? t('liked') : t('like');
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
  if (!currentConv) { toast(t('openConvFirst')); return; }
  const c = currentConv;
  const lines = [];
  lines.push(t('exportDocTitle'));
  lines.push('');
  lines.push(`- ${t('exportConv')}${c.title || t('newChat')}`);
  lines.push(`- ${t('exportCreated')}${fmtTime(c.time)}`);
  lines.push(`- ${t('exportMsgCount')}${c.messages.length}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  c.messages.forEach((m) => {
    const who = m.role === 'user' ? t('exportMe') : t('exportAdvisor');
    lines.push(`### ${who}（${fmtTime(m.time)}）`);
    lines.push('');
    lines.push(m.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  });
  lines.push(t('exportDisclaimer'));
  const md = lines.join('\n');

  const safe = (c.title || t('newChat')).replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
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
  toast(t('exported', filename));
}

/* ---------------- 设置（全部本地） ---------------- */
function memoryToText(mem) {
  const label = t('memoryScopeLabels');
  return (mem || []).map((m) => `[${label[m.scope] || label.note}] ${m.content}`).join('\n');
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
  const d = detailInfo(v);
  $('#detailLabel').textContent = d.name;
  $('#detailDesc').textContent = t('detailDescLine', v, d.desc);
}

function updateMemCount() {
  $('#memCount').textContent = memory.length ? t('memoryCount', memory.length) : '';
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
  toast(t('settingsSaved'));
}

function saveMemoryText() {
  const text = $('#memText').value;
  const parsed = [];
  const scopeMap = {
    用户: 'user', 对象: 'object', 关系: 'relationship', 事件: 'event', 推测: 'hypothesis', 备注: 'note',
    User: 'user', Object: 'object', Relationship: 'relationship', Event: 'event', Hypothesis: 'hypothesis', Note: 'note',
  };
  for (const line of text.split('\n')) {
    const tt = line.trim();
    if (!tt) continue;
    const m = tt.match(/^\[(用户|对象|关系|事件|推测|备注|User|Object|Relationship|Event|Hypothesis|Note)\]\s*(.+)$/);
    if (m) parsed.push({ id: uid(), scope: scopeMap[m[1]], content: m[2].trim().slice(0, 200), time: Date.now() });
    else parsed.push({ id: uid(), scope: 'note', content: tt.slice(0, 200), time: Date.now() });
  }
  memory = parsed.slice(0, 200);
  saveMemoryLocal();
  updateMemCount();
  toast(t('memorySaved'));
}

/* ---------------- 应用界面语言 ---------------- */
function applyI18n() {
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  document.title = `🐶 ${t('appName')}`;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  renderConvList();
  renderChat();
  if (currentTab === 'settings') loadSettingsIntoForm();
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

/* 消息操作：编辑 / 保存编辑 / 取消 / 点赞 / 重新生成 / 版本切换（事件委托） */
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
  const name = prompt(t('renamePrompt'), isDefaultTitle(currentConv.title) ? '' : currentConv.title);
  if (name === null) return;
  const tt = name.trim();
  if (tt) renameConversation(currentConv.id, tt);
}
$('#renameBtn').addEventListener('click', renameConv);
$('#chatTitle').addEventListener('dblclick', renameConv);

/* 删除当前对话 */
$('#deleteConvBtn').addEventListener('click', () => {
  if (!currentConv) return;
  if (!confirm(t('deleteConvConfirm', currentConv.title || t('newChat')))) return;
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

/* 语言切换 */
document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (btn.dataset.lang === lang) return;
    lang = btn.dataset.lang;
    settings.language = lang;
    saveSettingsLocal();
    applyI18n();
    toast(t('langSwitched'));
  });
});

/* 手动修改 API 地址/模型名时，实时更新预设高亮 */
$('#setApiBase').addEventListener('input', highlightPreset);
$('#setModel').addEventListener('input', highlightPreset);

/* 预设 */
document.querySelectorAll('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.dataset.preset;
    if (key === 'custom') {
      const base = $('#setApiBase').value.trim().replace(/\/+$/, '');
      const model = $('#setModel').value.trim();
      const isPreset = Object.values(PRESETS).some((p) => p && p.apiBase.replace(/\/+$/, '') === base && p.model === model);
      if (isPreset || (!base && !model)) {
        $('#setApiBase').value = '';
        $('#setModel').value = '';
      }
      toast(t('customMode'));
      $('#setApiBase').focus();
      highlightPreset();
      return;
    }
    const p = PRESETS[key];
    if (!p) return;
    $('#setApiBase').value = p.apiBase;
    $('#setModel').value = p.model;
    highlightPreset();
    if (key === 'ollama') toast(t('presetOllama', p.apiBase));
    else toast(t('presetFilled', btn.textContent.trim(), p.model));
  });
});

/* 测试连接（只验证，不保存） */
$('#apiTestBtn').addEventListener('click', async () => {
  const btn = $('#apiTestBtn');
  const out = $('#apiTestResult');
  btn.disabled = true;
  btn.textContent = t('testing');
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
      out.textContent = t('connSuccess', r.model);
      out.className = 'test-result ok';
    } else {
      out.textContent = t('connError') + (r.error || t('testFailed'));
      out.className = 'test-result err';
    }
  } catch (err) {
    out.textContent = t('testFailed') + err.message;
    out.className = 'test-result err';
  }
  btn.disabled = false;
  btn.textContent = t('testConnection');
});

/* 详细程度滑块 */
$('#detailSlider').addEventListener('input', updateDetailLabel);

/* 记忆开关与编辑 */
$('#memSwitch').addEventListener('change', () => {
  const on = $('#memSwitch').checked;
  toast(on ? t('memOn') : t('memOff'));
});
$('#memClearBtn').addEventListener('click', async () => {
  if (!confirm(t('clearMemoryConfirm'))) return;
  memory = [];
  saveMemoryLocal();
  $('#memText').value = '';
  updateMemCount();
  toast(t('memoryCleared'));
});

/* 保存设置 / 恢复默认 */
$('#settingsSaveBtn').addEventListener('click', () => {
  saveSettings();
  saveMemoryText();
});
$('#settingsResetBtn').addEventListener('click', () => {
  if (!confirm(t('resetConfirm'))) return;
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
  lang = settings.language === 'en' ? 'en' : 'zh';
  saveSettingsLocal();
  applyI18n();
  // 有历史对话时自动打开最近的一个，否则显示欢迎页
  if (conversations.length) {
    const latest = [...conversations].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    openConversation(latest.id);
  } else {
    renderChat();
  }
  if (currentTab !== 'chat') switchTab('chat');
})();
