// ============ AI 解析逻辑（可独立测试） ============
const fs = require('fs');
const path = require('path');

// 供应商预设：baseURL + 可选模型列表（供设置界面使用）
const PROVIDERS = {
  doubao: {
    label: '豆包',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
    models: ['doubao-seed-1-6-250615', 'doubao-1-5-pro-32k-250115', 'doubao-1-5-lite-32k-250115']
  },
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-reasoner']
  },
  kimi: {
    label: 'Kimi',
    baseURL: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k']
  },
  qwen: {
    label: '千问',
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen-plus', 'qwen-max', 'qwen-turbo']
  }
};

const CONFIG_FILE = () => path.join(process.env.TODO_DATA_DIR || require('electron').app.getPath('userData'), 'config.json');

function readConfig() {
  try {
    const f = CONFIG_FILE();
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch (e) { /* ignore */ }
  return {};
}

// 解析供应商对应的接口地址：自定义 baseURL 优先，否则按 provider 预设
function resolveBaseURL(cfg) {
  if (cfg.baseURL && cfg.baseURL.trim()) return cfg.baseURL.trim().replace(/\/$/, '');
  const p = PROVIDERS[cfg.provider];
  return p ? p.baseURL : PROVIDERS.doubao.baseURL;
}
function resolveModel(cfg) {
  if (cfg.model && cfg.model.trim()) return cfg.model.trim();
  const p = PROVIDERS[cfg.provider];
  return p ? p.models[0] : PROVIDERS.doubao.models[0];
}

// 主入口：一律走大模型 AI 解析（不提供本地兜底）；未配置 API Key 或调用失败时直接返回错误提示
async function aiParse(text) {
  const cfg = readConfig();
  if (!cfg.apiKey) {
    return { source: 'ai', items: [], error: '未配置 API Key：请点右上角设置 → AI 解析接口，填入 API Key 后重试' };
  }
  const baseURL = resolveBaseURL(cfg);
  const model = resolveModel(cfg);
  const now = new Date();
  const todayInfo = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const prompt = `你是待办提取助手。从用户的通知文本中提取所有任务，只输出严格 JSON 数组，不要输出任何其他文字。
今天是 ${todayInfo}。
每个元素字段：
- title: 任务名称（简洁，一句话）
- deadline: 截止时间（"YYYY-MM-DD HH:mm" 格式；没提到就填 ""）
- remark: 备注（考试规则、分数占比、后果等补充信息；没有就填 ""）
- location: 地点（通知里提到的地点/教室/会议室/地址，没有就填 ""）
- items: 所需物品（通知里要求携带/准备/需要带的东西，逗号分隔，没有就填 ""）
- link: 链接（通知里的网址，没有就填 ""）
- isStar: 是否重要（涉及考试、毕业、扣分、成绩、截止类任务为 true，否则 false）
规则：
1. 只提取真正的任务（学习/考试/提交/填写/报名等动作），合并为 1-3 条核心任务。
2. 分数占比、考试时间范围、重考次数、及格线、注意事项等说明细节一律归入对应任务的 remark，绝对不要单独拆成任务。
3. 一句话里确实含多个并列任务才拆开（如"完成学习"和"参加考试"是两个任务）。
4. deadline 的年份必须写正确：通知只写"X月X日"时，年份取离今天最近且不早于今天的年份（通常是今年；若该日期今年已过则用明年）。
5. 不编造文本里没有的时间；地点和物品提取不到就填空字符串。
通知文本：
"""${text}"""`;
  try {
    const resp = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: '你只输出 JSON。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1
      })
    });
    if (!resp.ok) throw new Error('API HTTP ' + resp.status);
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    const json = content.replace(/```json|```/g, '').trim();
    const items = JSON.parse(json);
    if (!Array.isArray(items)) throw new Error('not array');
    // AI 输出兜底：deadline 年份早于今年（如大模型写错成去年）→ 修正为今年
    return { source: 'ai', items: items.map(it => sanitizeItem({ ...it, deadline: fixYear(it.deadline) })) };
  } catch (e) {
    // 不降级本地解析：直接报错，引导用户检查 API Key
    return { source: 'ai', items: [], error: 'AI 解析失败：' + String((e && e.message) || e) + '（请检查 API Key 是否正确、网络是否通畅）' };
  }
}

function sanitizeItem(it) {
  return {
    title: String(it.title || '').slice(0, 200),
    deadline: String(it.deadline || ''),
    remark: String(it.remark || '').slice(0, 500),
    location: String(it.location || '').slice(0, 100),
    items: String(it.items || '').slice(0, 200),
    link: String(it.link || '').slice(0, 300),
    isStar: !!it.isStar
  };
}

// 修正 deadline 年份：年份早于今年（大模型写错）→ 改为今年
function fixYear(d) {
  if (!d) return d;
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return d;
  const y = +m[1];
  const nowY = new Date().getFullYear();
  if (y < nowY) return String(d).replace(/^\d{4}/, String(nowY));
  return d;
}

// 本地规则解析（无 API Key 时的兜底，可独立测试）
function localParse(text) {
  if (!text) return [];
  const items = [];
  const seen = new Set();
  const year = new Date().getFullYear();

  // 1) 截止时间：找所有 "M月D日"，附带其后紧跟的 "晚上/下午/上午 X点(半)" 或 "HH:mm"
  const dateRe = /(\d{1,2})月(\d{1,2})日/g;
  const timeRe = /(?:晚上|下午|上午|中午)?\s*(\d{1,2})[:：点时](\d{1,2})?分?/;
  const deadlines = [];
  let m;
  while ((m = dateRe.exec(text)) !== null) {
    const month = +m[1], day = +m[2];
    const tail = text.slice(m.index + m[0].length, m.index + m[0].length + 12);
    const timeMatch = tail.match(timeRe);
    let hh = 23, mm = 0;
    if (timeMatch) {
      let h = +timeMatch[1];
      if (/(晚上|下午)/.test(timeMatch[0]) && h < 12) h += 12;
      hh = h;
      mm = timeMatch[2] ? +timeMatch[2] : 0;
    }
    const d = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    deadlines.push(d);
  }
  // 日期范围（如 10月12日-10月18日）取最后一天
  const deadline = deadlines.length > 0 ? deadlines[deadlines.length - 1] : '';

  // 2) 去噪声前缀，按句再按逗号拆成子句（括号内的内容不拆开，避免"（注意：…）"被切碎）
  const clean = text.replace(/[@＠]所有人|[@＠]all|′|’|「」|""|''/gi, '').trim();
  const splitClauses = (src) => {
    const out = [];
    let buf = '', depth = 0;
    for (const ch of src) {
      if (ch === '(' || ch === '（') depth++;
      if (ch === ')' || ch === '）') depth = Math.max(0, depth - 1);
      if (depth === 0 && /[。；;\n！!？?，,、：:]/.test(ch)) {
        const s = buf.trim().replace(/^[，,、\s]+/, '');
        if (s.length >= 3) out.push(s);
        buf = '';
      } else {
        buf += ch;
      }
    }
    const last = buf.trim().replace(/^[，,、\s]+/, '');
    if (last.length >= 3) out.push(last);
    return out;
  };
  const clauses = splitClauses(clean);

  // 3) 子句分类
  const actionRe = /(完成|提交|学习|考试|填写|报名|参加|上传|发送|上交|办理|复习|观看|打卡|务必|记得|需要|观看|答题)/;
  const ruleRe = /(百分之|占比|占总|重考|最高分|以最高|允许|总分|核算|占.{0,3}成绩|成绩占|平时分|权重|考试时间|时间(是|为)|及格|注意|截止)/;
  const bgRe = /(发布|公布|上线|告知|通知|提醒)/;
  const helloRe = /^(本学期|这学期|各位|同学们|大家好|学校|教务处|老师)/;

  const remarks = [];
  const titles = [];

  for (const c of clauses) {
    const s = c.replace(/^请(各位)?(同学|大家)?(务必)?/, '');
    if (ruleRe.test(s)) { remarks.push(s); continue; }
    // 背景句（发布/公布等）优先过滤，即使含"学习"等动作词
    if (bgRe.test(s)) continue;
    if (helloRe.test(s) && !/截止|考试|作业|任务/.test(s)) continue;
    if (actionRe.test(s)) {
      // 标题从动作词开始截取
      const m2 = s.match(actionRe);
      const idx = m2 ? m2.index : 0;
      let title = s.slice(idx).slice(0, 60);
      if (title.length < 3) continue;
      // 规范化："XX考试已开始" → "参加XX考试"
      title = title.replace(/(已|正在|将|马上)?(开始|开启)(了|啦)?$/, '').trim();
      if (/(考试|作业|活动|竞赛|答辩|会议|课程|线上学习)/.test(title) && !/^(参加|完成|提交|报名|复习|观看|打卡)/.test(title)) {
        title = '参加' + title;
      }
      // 去重：与已有任务共享 "完成+考试" 之类核心词则跳过（总括句）
      const dup = titles.some(t => {
        const core = ['完成', '考试', '学习', '提交', '填写', '参加'];
        const hit = core.filter(w => title.includes(w) && t.includes(w));
        return hit.length >= 2;
      });
      if (dup) continue;
      titles.push(title);
      seen.add(title);
      items.push({
        title,
        deadline,
        remark: '',
        isStar: /考试|毕业|影响|成绩|截止|务必|扣分/.test(s)
      });
    }
  }

  // 4) 兜底：一句任务都没抓到就整段作为一条
  if (items.length === 0) {
    items.push({ title: clean.slice(0, 50), deadline, remark: clean.slice(0, 200), isStar: false });
  } else if (remarks.length) {
    // 5) 规则句并入第一条备注
    items[0].remark = remarks.join('；').slice(0, 300);
  }

  // 6) 提取公共信息（地点/所需物品/链接），挂到每条任务上
  const common = extractCommon(text);
  if (common.location || common.items || common.link) {
    items.forEach(it => {
      it.location = common.location;
      it.items = common.items;
      it.link = common.link;
    });
  }
  return items;
}

// 提取通知级公共信息：地点 / 所需物品 / 链接
function extractCommon(text) {
  const out = { location: '', items: '', link: '' };
  // 链接
  const linkRe = /(?:https?:\/\/|www\.)[^\s，,。；;）)]+/i;
  const lm = text.match(linkRe);
  if (lm) out.link = lm[0];
  // 地点：显式"地点/地址：xxx"；或 "在XX楼/XX教室/XX会议室"（到动作词前结束）
  const locRe = /(?:地点|地址|位置|集合点)[:：为是]\s*([^，,。；;\n]+)/;
  const loc2 = /(?:在|到|前往)([\u4e00-\u9fa5A-Za-z0-9]+?(?:楼|教室|会议室|报告厅|办公室|处|中心|大厅|广场|操场|体育馆|图书馆|校区|栋))(?=参加|进行|提交|领取|办理|签到|开会|答辩|集合|[，,。；;\s]|$)/;
  const l1 = text.match(locRe);
  const l2 = text.match(loc2);
  if (l1) out.location = l1[1].trim().slice(0, 60);
  else if (l2) out.location = l2[1].trim().slice(0, 60);
  // 所需物品：携带/准备/带好 + 内容（到动作/地点词前结束）
  const itemRe = /(?:携带|自备|带好?|准备|需?需要(?:带|准备)?|自?带)[:：]?\s*([^，,。；;\n]{2,60}?)(?=到|前往|去|参加|进行|提交|领取|办理|签到|并在|[，,。；;\n]|$)/;
  const im = text.match(itemRe);
  if (im) out.items = im[1].trim().slice(0, 100);
  return out;
}

module.exports = { aiParse, localParse, PROVIDERS, resolveBaseURL, resolveModel };
