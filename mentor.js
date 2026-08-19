/* ============================================================
 * 🐶 狗头军师 · 独立版核心引擎
 * ------------------------------------------------------------
 * 基于 birthday-wish-pool 的 mentor.js 提取增强：
 *   - 多会话对话（每条消息独立时间戳）
 *   - 回答详细程度 5 档：极简 / 简要 / 均衡 / 详细 / 复杂
 *   - 自定义回复风格提示词
 *   - 长期记忆（开关 + 自动提取 + 去重 + 注入系统提示词）
 * 调用 OpenAI 兼容接口（OpenAI / DeepSeek / 通义 / Kimi 均可）。
 * 未配置 API Key 时返回示范回复，功能不报错。
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

/* 技能知识库目录：兼容多种命名（goutoujunshi / backseat-ai），自动探测 */
const SKILL_DIR = ['goutoujunshi', 'backseat-ai']
  .map((n) => path.join(__dirname, n))
  .find((d) => fs.existsSync(path.join(d, 'SKILL.md')))
  || path.join(__dirname, 'goutoujunshi');
const SKILL_FILE = path.join(SKILL_DIR, 'SKILL.md');
const REFS_DIR = path.join(SKILL_DIR, 'references');

/* ---------------- 回答详细程度档位（中英双语） ---------------- */
const DETAIL_LEVELS = {
  zh: {
    1: { name: '极简', maxTokens: 500, desc:
      '用最短的话给出结论：先一句话点明最关键的建议，再给一个现在就能做的小动作。整体控制在 100 字以内，不展开分析、不给多方案。' },
    2: { name: '简要', maxTokens: 900, desc:
      '简要回答：一句话结论 + 2~4 条要点（事实/建议/行动各一到两条）。整体控制在 250 字以内，不铺陈情绪分析。' },
    3: { name: '均衡', maxTokens: 1500, desc:
      '均衡回答（默认）：按核心工作流走完整框架——先接住情绪（2~4 句）、再拆事实与推测、给一个首选建议和 2~4 个理由、最后收束为一个可执行的小动作。整体 400~700 字。' },
    4: { name: '详细', maxTokens: 2400, desc:
      '详细回答：完整框架 + 更充分的分析。情绪、事实、推测、未知信息分开列；首选建议之外再给 1~2 个备选方案（稳健/会撩/强势），每个方案说明代价与适用场景；行动收束给出观察窗口与回来反馈的信号。整体 800~1300 字。' },
    5: { name: '复杂', maxTokens: 3600, desc:
      '复杂深度回答：多角度深度剖析。除完整框架外，加入：长期利益权衡（互惠/安全/机会成本/时间精力）、可引用的知识依据、分阶段执行计划（近/中/远期）、风险与边界提示、多条可复制的话术示例（如涉及回复）。整体 1500 字以上，分节组织，有清晰小标题。' },
  },
  en: {
    1: { name: 'Minimal', maxTokens: 500, desc:
      'Give the shortest answer: one sentence with the key recommendation, then one small action to take right now. Keep it under ~100 words; no analysis, no multiple options.' },
    2: { name: 'Brief', maxTokens: 900, desc:
      'Answer briefly: one-sentence conclusion + 2\u20134 bullet points (facts / advice / actions, one or two each). Keep it under ~250 words; skip long emotional analysis.' },
    3: { name: 'Balanced', maxTokens: 1500, desc:
      'Balanced answer (default): follow the full framework \u2014 meet the emotions first (2\u20134 sentences), separate facts from assumptions, give one top recommendation with 2\u20134 reasons, and close with one concrete next step. Around 400\u2013700 words.' },
    4: { name: 'Detailed', maxTokens: 2400, desc:
      'Detailed answer: full framework with richer analysis. List emotions, facts, assumptions and unknowns separately; give 1\u20132 alternative options (steady / flirty / assertive) with trade-offs and when to use each; close with an observation window and signals to report back. Around 800\u20131300 words.' },
    5: { name: 'Complex', maxTokens: 3600, desc:
      'Complex deep-dive: multi-angle analysis. On top of the full framework, include: long-term trade-offs (reciprocity / safety / opportunity cost / time & energy), knowledge references, a phased plan (near / mid / far), risk and boundary notes, and several copy-ready example lines (if replying). 1500+ words, organized in clear sections with headings.' },
  },
};

function detailSpec(level, lang) {
  const n = Number(level);
  const L = lang === 'en' ? 'en' : 'zh';
  return DETAIL_LEVELS[L][n] || DETAIL_LEVELS[L][3];
}

/* ---------------- 文档读取（带缓存） ---------------- */
const docCache = new Map();
function readDoc(rel) {
  const full = path.join(REFS_DIR, rel);
  if (docCache.has(full)) return docCache.get(full);
  try {
    const txt = fs.readFileSync(full, 'utf8');
    docCache.set(full, txt);
    return txt;
  } catch { return ''; }
}

/* ---------------- 核心工作流 ---------------- */
function loadSkillCore() {
  try {
    let txt = fs.readFileSync(SKILL_FILE, 'utf8');
    txt = txt.replace(/^---[\s\S]*?---\s*/, ''); // 去掉 front-matter
    return txt.trim();
  } catch { return ''; }
}
const skillCore = loadSkillCore();

/* ---------------- 主题路由（对应 SKILL.md 的"按需加载"表） ---------------- */
const TOPIC_RULES = [
  { kws: ['怎么回', '话术', '开场白', '邀约', '回复', '发什么', '演练', '怎么说'], file: 'practical/实战话术编排器：从一句回复到后续分支.md' },
  { kws: ['松弛', '调情', '现场取材', '接话', '暧昧推进', '社交校准', '推进关系'], file: 'practical/场景感、松弛感与社交校准：从接话到关系推进.md' },
  { kws: ['冷读', 'pua', '推拉', '煤气灯', '服从性', '打压', '贬低', '操控'], file: 'knowledge/05-PUA操控与伦理替代.md' },
  { kws: ['截图', '网聊', '微信', 'qq', '已读', '幽灵', '在线约会', '网络聊天'], file: 'knowledge/09-在线约会与数字关系.md' },
  { kws: ['表白', '主动表达', '第一次见面', '约会', '追求', '约出来'], file: 'practical/主动表达、第一次见面与自然接触.md' },
  { kws: ['冷淡', '投入', '失衡', '退出', '止损', '内耗', '断联', '降级', '退场'], file: 'practical/关系投入失衡：互惠判断、降级投入与退出决策.md' },
  { kws: ['依恋', '回避型', '焦虑型', '安全感', '情绪调节', '崩溃', '难受'], file: 'knowledge/03-依恋理论与情绪调节.md' },
  { kws: ['mbti', '人格', '性格匹配'], file: 'knowledge/04-MBTI人格与匹配.md' },
  { kws: ['吵架', '冲突', '冷战', '修复', '道歉'], file: 'knowledge/07-沟通冲突与修复.md' },
  { kws: ['拒绝', '不好意思', '体面'], file: 'practical/高情商拒绝他人：体面护边界的实用指南.md' },
  { kws: ['夸', '赞美'], file: 'practical/万能夸人的话术技巧：真诚认可的实用指南.md' },
  { kws: ['情绪价值', '安慰', '哄', '难过', '伤心', '低落'], file: 'practical/为他人提供情绪价值：温暖且有效的回应指南.md' },
  { kws: ['分手', '复合', '前任', '挽回', '背叛', '出轨', '放下'], file: 'knowledge/15-分手背叛与关系修复.md' },
  { kws: ['结婚', '婚姻', '彩礼', '离婚', '婆婆', '丈母娘', '家庭矛盾', '育儿'], file: 'knowledge/11-婚姻家庭与生命周期.md' },
  { kws: ['家暴', '跟踪', '威胁', '报警', '法律', '自伤', '自杀', '危机'], file: 'knowledge/17-中国法律安全与危机转介.md' },
  { kws: ['同性', 'lgbt', '跨性别', '出柜', '多元关系'], file: 'knowledge/16-多元关系与反刻板印象.md' },
  { kws: ['性同意', '性行为', '性关系', '亲密边界', '身体自主'], file: 'knowledge/08-同意边界性与亲密.md' },
  { kws: ['尴尬', '冷场', '救场'], file: 'practical/化解尴尬：轻松救场的实用指南.md' },
  { kws: ['逻辑', '表达混乱', '说不清'], file: 'practical/提升表达逻辑性：从混乱到清晰的实用指南.md' },
  { kws: ['气场', '自信', '紧张', '怯场'], file: 'practical/提高气场：从内到外的力量感塑造指南.md' },
  { kws: ['人脉', '拓展', '社交圈', '职场'], file: 'practical/有效拓展人脉：从建立到维护的实用指南.md' },
];

/* ---------------- 分词与检索 ---------------- */
function tokenize(text) {
  const tokens = [];
  const cn = text.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  for (const seg of cn) {
    for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2)); // 中文二元组
  }
  const en = text.toLowerCase().match(/[a-z0-9]{2,}/g) || [];
  return tokens.concat(en);
}

function walkFiles(dir, base) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.join(base || '', entry.name).split(path.sep).join('/');
    if (entry.isDirectory()) out.push(...walkFiles(full, rel));
    else if (entry.isFile() && entry.name.endsWith('.md')) out.push(rel);
  }
  return out;
}

let index = null;
function buildIndex() {
  if (index) return index;
  index = [];
  for (const rel of walkFiles(REFS_DIR, '')) {
    const content = readDoc(rel);
    index.push({ file: rel, tokens: new Set(tokenize(content.slice(0, 8000))) });
  }
  return index;
}

function loadDocs(files, maxTotalChars = 16000) {
  const out = [];
  let used = 0;
  for (const f of files) {
    const c = readDoc(f);
    if (!c) continue;
    const slice = c.slice(0, maxTotalChars - used);
    if (slice.length < 300) continue;
    out.push(`【${f.split('/').pop().replace('.md', '')}】\n${slice}`);
    used += slice.length;
    if (used >= maxTotalChars) break;
  }
  return out;
}

function retrieveDocs(query, maxDocs = 2) {
  const q = query.toLowerCase();
  // 1) 主题规则命中
  const hits = [];
  for (const r of TOPIC_RULES) {
    if (r.kws.some((k) => q.includes(k.toLowerCase()))) hits.push(r.file);
  }
  if (hits.length) return loadDocs(hits.slice(0, maxDocs));
  // 2) 兜底：二元组重合打分
  const qTokens = tokenize(query);
  if (!qTokens.length) return [];
  const scored = [];
  for (const item of buildIndex()) {
    let score = 0;
    for (const t of qTokens) if (item.tokens.has(t)) score++;
    if (score > 0) scored.push({ file: item.file, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return loadDocs(scored.slice(0, maxDocs).map((s) => s.file));
}

/* ---------------- 系统提示词 ---------------- */
function buildSystemPrompt(opts) {
  const { docs, memoryText, stylePrompt, detailLevel, memoryEnabled, language } = opts;
  const isEn = language === 'en';

  const head = isEn
    ? 'You are the "Dog-Head Military Advisor", a relationship & love advisor who is always on the user\u2019s side.\nMeet the emotions first, then separate facts from assumptions, then give actionable choices; stay warm, clear-headed, and on the user\u2019s side.\n'
    : '你是「狗头军师」，一个站在用户一边的恋爱与情感军师。\n先接住情绪，再分清事实，最后给能执行的选择；保持温暖、清醒、站在用户一边。\n';

  const ref = docs.length
    ? (isEn
      ? `\n\n## Relevant knowledge references for this question (use them to inform your advice, do NOT quote them verbatim)\n\n${docs.join('\n\n---\n\n')}\n`
      : `\n\n## 本次相关的知识参考（结合参考给出建议，不要逐字复述原文）\n\n${docs.join('\n\n---\n\n')}\n`)
    : '';

  const detail = detailSpec(detailLevel, language);
  const detailSec = isEn
    ? `\n\n## Answer detail level (current: ${detail.name})\n${detail.desc}\nFollow the required length and structure strictly \u2014 not too long, not too brief.\n`
    : `\n\n## 回答详细程度（当前档位：${detail.name}）\n${detail.desc}\n严格按照档位要求的篇幅与结构回答，不要超出太多也不要过于简略。\n`;

  const langSec = isEn
    ? `\n\n## Reply language\nPlease reply entirely in English.\n`
    : `\n\n## 回复语言\n请始终使用简体中文回复用户。\n`;

  const styleSec = (stylePrompt && String(stylePrompt).trim())
    ? (isEn
      ? `\n\n## Reply style requirement (user-defined, must follow)\n${String(stylePrompt).trim()}\n`
      : `\n\n## 回复风格要求（用户自定义，务必遵守）\n${String(stylePrompt).trim()}\n`)
    : '';

  /* 长期记忆：启用时始终注入（含记忆维护规则），让模型知道如何写入记忆 */
  let memSec = '';
  if (memoryEnabled) {
    if (isEn) {
      const current = memoryText
        ? `Here is the long-term memory saved so far. Reference it naturally in your answer; do NOT recite it line by line; unless the user explicitly provides new information this turn, do not invent facts beyond the memory.\n\n${memoryText}\n`
        : 'No long-term memory has been saved yet.\n';
      memSec = `\n\n## Long-term memory (enabled, stored in the user's browser, works across conversations)\n${current}\n`
        + `### Memory maintenance rules\nWhen this turn contains new information WORTH remembering long-term, append ONE line 【记忆】 at the very END of your reply (not in the middle):\n`
        + `- Content the user explicitly asks you to remember (e.g. "remember this...", "save this to memory") \u2192 you MUST save it;\n`
        + `- Key identity info about the user / the other person (name, MBTI, subjective score), relationship stage, important events, the user's preferences / boundaries / goals.\n`
        + `Format: 【记忆】scope|content\n`
        + `scope: user / object / relationship / event / hypothesis / note.\n`
        + `Content: one third-person sentence, no more than 200 characters; do not repeat the same thing; if there is nothing new, append nothing.\n`;
    } else {
      const current = memoryText
        ? `以下是已保存的长期记忆，回答时自然引用，不要逐条复述；除非用户本轮明确提供了新信息，不要编造记忆之外的事实。\n\n${memoryText}\n`
        : '当前还没有保存任何长期记忆。\n';
      memSec = `\n\n## 长期记忆（已启用，保存在用户浏览器本地，跨对话生效）\n${current}\n`
        + `### 记忆维护规则\n当本轮对话出现【值得长期记住】的新信息时，在你的回答的【最末尾】追加一行【记忆】，不要放在正文中间：\n`
        + `- 用户明确要求记住的内容（例如用户说"记住…"、"请把这些计入到记忆中"、"记一下…"）→ 必须写入；\n`
        + `- 用户/对象的关键身份信息（称呼、MBTI、主观评分）、关系阶段、重要事件、用户的偏好/边界/目标。\n`
        + `格式：【记忆】scope|内容\n`
        + `scope 取：user=用户 / object=对象 / relationship=关系 / event=事件 / hypothesis=推测 / note=备注。\n`
        + `内容用第三人称一句话陈述、不超过 200 字；同一件事不要重复写；没有新信息就什么也不要追加。\n`;
    }
  }

  return head + skillCore + ref + detailSec + langSec + styleSec + memSec;
}

/* ---------------- 长期记忆 ---------------- */
/* 记忆条目：{ id, scope, content, time }
 * scope: user(用户) / object(对象) / relationship(关系) / event(事件) / hypothesis(推测) / note(备注)
 */
const MEMORY_SCOPES = ['user', 'object', 'relationship', 'event', 'hypothesis', 'note'];
const MEMORY_MAX_ENTRIES = 200;
const MEMORY_MAX_CHARS = 200;

function memoryToText(memory) {
  if (!Array.isArray(memory) || !memory.length) return '';
  const label = { user: '用户', object: '对象', relationship: '关系', event: '事件', hypothesis: '推测', note: '备注' };
  return memory
    .map((m) => `- [${label[m.scope] || m.scope}] ${m.content}`)
    .join('\n');
}

/* 从回复中提取【记忆】行并移除；返回 { clean, entries } */
function extractMemoryLines(reply) {
  const lines = String(reply).split('\n');
  const kept = [];
  const entries = [];
  for (const line of lines) {
    const m = line.match(/^【记忆】\s*([a-zA-Z_]+)?\s*[|｜]?\s*(.+)$/);
    if (m && (!m[1] || MEMORY_SCOPES.includes(m[1].toLowerCase()))) {
      const scope = m[1] ? m[1].toLowerCase() : 'note';
      const content = m[2].trim().slice(0, MEMORY_MAX_CHARS);
      if (content) entries.push({ scope, content });
      continue;
    }
    kept.push(line);
  }
  return { clean: kept.join('\n').replace(/\n{3,}/g, '\n\n').trim(), entries };
}

/* 去重追加记忆，返回新增数量与新增条目摘要 */
function mergeMemory(memory, entries, uid) {
  let added = 0;
  const addedInfo = [];
  const existingKeys = new Set(memory.map((m) => `${m.scope}|${m.content}`));
  for (const e of entries) {
    const key = `${e.scope}|${e.content}`;
    if (existingKeys.has(key)) continue;
    memory.push({ id: uid(), scope: e.scope, content: e.content, time: Date.now() });
    existingKeys.add(key);
    added++;
    addedInfo.push({ scope: e.scope, content: e.content });
    if (memory.length > MEMORY_MAX_ENTRIES) memory.shift();
  }
  return { added, addedInfo };
}

/* ---------------- 示范回复（未配置 API Key，中英双语） ---------------- */
function mockReply(language) {
  if (language === 'en') {
    return 'Let me meet your emotions first 🍃 It already matters a lot that you\u2019re willing to say this out loud.\n\n'
      + '(This is demo mode: no AI endpoint is configured yet, so this is a canned reply. Open \u2699\ufe0f Settings \u2192 API Configuration, paste your API Key, and the Dog-Head Military Advisor will analyze your situation with the full knowledge base: meet the emotions, separate facts from guesses, and give you one small action you can take right now.)\n\n'
      + 'For now, tell me what hurts most: what happened, how you feel, and what next step you\u2019d most like to solve. I\u2019ll pick it up from here once I\u2019m online.';
  }
  return '先接住你的情绪 🍃 愿意把这件事说出来，本身就很重要。\n\n'
    + '（当前是示范模式：还没配置 AI 接口，所以这是预设回复。点 ⚙️ 设置 → API 配置，填上 API Key 后，狗头军师就会用完整知识库认真陪你分析：先接住情绪、再拆事实和猜测、最后给一个现在就能做的小动作。）\n\n'
    + '现在你可以先把最难受的点讲给我听：发生了什么、你现在的感受、最想解决的下一步是什么。等我上线后，会从这里接着陪你。';
}

/* ---------------- 调用 OpenAI 兼容 API ---------------- */
function callLLM(cfg, systemPrompt, messages, maxTokens) {
  return new Promise((resolve, reject) => {
    const base = (cfg.apiBase || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const body = JSON.stringify({
      model: cfg.model || 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: maxTokens || 1500,
    });
    const lib = base.startsWith('https') ? https : http;
    const req = lib.request(base + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (cfg.apiKey || ''),
      },
      timeout: 90000,
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            const msg = (json.error && (json.error.message || json.error.code)) || 'API 错误';
            return reject(new Error(msg));
          }
          const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
          if (!content) return reject(new Error('API 返回内容为空'));
          resolve(content.trim());
        } catch {
          reject(new Error('API 返回解析失败（HTTP ' + (res.statusCode || '?') + '）'));
        }
      });
    });
    req.on('error', (e) => reject(new Error('网络错误：' + e.message)));
    req.on('timeout', () => { req.destroy(); reject(new Error('AI 接口请求超时')); });
    req.write(body);
    req.end();
  });
}

/* ---------------- 友好错误提示 ---------------- */
function friendlyError(e) {
  const msg = (e && e.message) || String(e);
  if (/invalid|authentication|unauthorized|401|api key/i.test(msg)) {
    return `API Key 无效（${msg}）。请检查：① Key 是否复制完整、首尾有没有多余空格；② 是否用对了平台——选了哪个预设，就要用哪个平台申请的 Key。`;
  }
  if (/balance|insufficient|quota|402|payment|amount/i.test(msg)) {
    return `接口返回：${msg}。通常是账户余额不足，去平台充值后再试。`;
  }
  if (/timeout|etimedout|econnrefused|enotfound|network|网络|fetch failed/i.test(msg)) {
    return `网络问题：${msg}。请检查 API 地址能否访问（国内直连 OpenAI 一般需要代理）。`;
  }
  if (/model/i.test(msg) && /not exist|not found|does not exist|model.*invalid/i.test(msg)) {
    return `模型名不对：${msg}。请在设置里改成该平台正确的模型名。`;
  }
  return msg;
}

/* ---------------- 对外主入口 ---------------- */
/* cfg: { apiBase, apiKey, model, stylePrompt, detailLevel, memoryEnabled, language }
 * history: [{role:'user'|'assistant', content}] 该会话的历史消息（由前端传入）
 * memory: [] 长期记忆条目数组（由前端传入，本函数会就地合并去重）
 * uid: 生成 id 的函数
 */
async function answer(cfg, history, newText, memory, uid) {
  const lang = (cfg && cfg.language === 'en') ? 'en' : 'zh';
  const msgs = (Array.isArray(history) ? history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content }))
    .concat({ role: 'user', content: newText });

  const detail = detailSpec(cfg.detailLevel, lang);

  if (!cfg || !cfg.apiKey) {
    return { content: mockReply(lang), mock: true, memoryUpdated: [], memory: memory || [] };
  }

  try {
    const docs = retrieveDocs(newText);
    const memoryText = (cfg.memoryEnabled && Array.isArray(memory) && memory.length)
      ? memoryToText(memory)
      : '';
    const systemPrompt = buildSystemPrompt({
      docs,
      memoryText,
      stylePrompt: cfg.stylePrompt,
      detailLevel: cfg.detailLevel,
      memoryEnabled: !!cfg.memoryEnabled,
      language: lang,
    });
    let content = await callLLM(cfg, systemPrompt, msgs, detail.maxTokens);

    // 记忆提取（仅当启用且为真实 API 回复时）
    const memoryUpdated = [];
    if (cfg.memoryEnabled) {
      const { clean, entries } = extractMemoryLines(content);
      content = clean || content;
      if (entries.length) {
        const { addedInfo } = mergeMemory(memory, entries, uid);
        for (const info of addedInfo) memoryUpdated.push(info);
      }
    }

    return { content, mock: false, memoryUpdated, memory: memory || [] };
  } catch (e) {
    return { content: `调用 AI 接口失败：${friendlyError(e)}\n请检查 ⚙️ 设置 → API 配置 里的 API 地址 / Key / 模型是否正确。`, mock: true, memoryUpdated: [], memory: memory || [] };
  }
}

/* ---------------- 连接测试 ---------------- */
async function test(cfg) {
  if (!cfg || !cfg.apiKey) {
    return { ok: false, error: '还没配置 API Key，请先到 ⚙️ 设置里填写。' };
  }
  try {
    const content = await callLLM(cfg, '你是连接测试助手，请只回复两个字：正常。', [{ role: 'user', content: 'ping' }], 100);
    return { ok: true, model: cfg.model || '未知', content: content.slice(0, 60) };
  } catch (e) {
    return { ok: false, error: friendlyError(e) };
  }
}

module.exports = { answer, test, skillCore, retrieveDocs, detailSpec, DETAIL_LEVELS, memoryToText };
