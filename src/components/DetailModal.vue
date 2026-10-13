<template>
  <div class="detail-page">
    <!-- 顶部栏：只保留左侧返回按钮，点击关闭详情页 -->
    <div class="dp-top">
      <button class="dp-back" @click="$emit('close')" title="返回">←</button>
      <span class="dp-top-title">任务详情</span>
    </div>

    <!-- 大标题：可编辑，长标题自动换行 -->
    <textarea
      class="dp-title"
      :class="{ done: todo.done }"
      :value="todo.title"
      @input="onTitleInput"
      rows="1"
      placeholder="任务名称"
    ></textarea>

    <!-- 结构化信息：地点 / 所需物品 / 链接 -->
    <div class="dp-fields">
      <div class="f-row">
        <span class="f-ico">📍</span>
        <input
          class="f-input"
          :value="todo.location"
          @input="onField('location', $event.target.value)"
          placeholder="地点：如 行政楼302会议室"
        />
      </div>
      <div class="f-row">
        <span class="f-ico">📦</span>
        <input
          class="f-input"
          :value="todo.items"
          @input="onField('items', $event.target.value)"
          placeholder="所需物品：如 学生证、身份证"
        />
      </div>
      <div class="f-row">
        <span class="f-ico">🔗</span>
        <input
          class="f-input"
          :value="todo.link"
          @input="onField('link', $event.target.value)"
          placeholder="链接：如 https://..."
        />
      </div>
    </div>

    <!-- 设定时间：折叠行，点开日历 -->
    <button class="time-toggle" @click="calOpen = !calOpen">
      <span class="tt-label">设定时间</span>
      <span class="tt-summary" :class="{ active: hasTime }">{{ timeSummary }}</span>
      <span class="tt-arrow" :class="{ open: calOpen }">▾</span>
    </button>
    <div v-show="calOpen" class="cal-wrap">
      <div class="cal">
        <div class="cal-head">
          <button class="cal-nav" @click="shiftMonth(-1)">‹</button>
          <span class="cal-title">{{ viewYear }}年{{ viewMonth + 1 }}月</span>
          <button class="cal-nav" @click="shiftMonth(1)">›</button>
        </div>
        <div class="cal-week">
          <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="cal-wd">{{ w }}</span>
        </div>
        <div class="cal-grid">
          <button
            v-for="(c, i) in cells"
            :key="i"
            class="cal-day"
            :class="{
              dim: !c.inMonth,
              start: isStart(c.date),
              end: isEnd(c.date),
              range: isRange(c.date),
              today: isToday(c.date)
            }"
            @click="pick(c.date)"
          >{{ c.date.getDate() }}</button>
        </div>
      </div>
      <div class="time-row">
        <label class="t-field">
          <span>开始</span>
          <select v-model.number="startH">
            <option v-for="h in 24" :key="h" :value="h - 1">{{ String(h - 1).padStart(2, '0') }}时</option>
          </select>
          <select v-model.number="startM">
            <option v-for="m in minutes" :key="m" :value="m">{{ String(m).padStart(2, '0') }}分</option>
          </select>
        </label>
        <label class="t-field">
          <span>结束</span>
          <select v-model.number="endH">
            <option v-for="h in 24" :key="h" :value="h - 1">{{ String(h - 1).padStart(2, '0') }}时</option>
          </select>
          <select v-model.number="endM">
            <option v-for="m in minutes" :key="m" :value="m">{{ String(m).padStart(2, '0') }}分</option>
          </select>
        </label>
      </div>
      <div class="time-hint" :class="{ active: hasRange }">
        {{ hasRange ? `已选：${fmtDate(startSel)} ${fmtHM(startH, startM)} → ${fmtDate(endSel)} ${fmtHM(endH, endM)}` : (startSel ? `已选：${fmtDate(startSel)} ${fmtHM(startH, startM)}（再点一个日期可选时间段）` : '请选择日期') }}
      </div>
      <div class="time-btns">
        <button class="btn-ghost" @click="clearTime">清除时间</button>
        <button class="btn-parse" @click="applyTime" :disabled="!startSel">应用时间</button>
      </div>
    </div>

    <!-- 说明：可编辑，随文字自动撑高，每个"；"自动换行显示 -->
    <textarea
      class="dp-remark"
      :value="remarkShow"
      @input="onRemarkInput"
      placeholder="说明/备注（可空），如：要求、占比…"
    ></textarea>

    <!-- 原始通知原文：点击展开，可编辑 -->
    <div v-if="todo.sourceText" class="d-section">
      <button class="src-toggle" @click="srcOpen = !srcOpen">
        <span>原始通知原文</span>
        <span class="tt-arrow" :class="{ open: srcOpen }">▾</span>
      </button>
      <textarea
        v-show="srcOpen"
        class="d-text source"
        :value="todo.sourceText"
        @input="onField('sourceText', $event.target.value)"
        rows="3"
        placeholder="原始通知原文（可修改）"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';

const props = defineProps({ todo: Object });
const emit = defineEmits(['close', 'update-time', 'update']);

// ---------- 详情字段实时编辑（任务名/说明） ----------
function onField(key, val) {
  emit('update', { [key]: val });
}
// 说明：显示时每个"；"自动换行（分号后已有空白合并成单个换行）；编辑保存原样
const remarkShow = computed(() => String(props.todo.remark || '').replace(/；(\s*)/g, '；\n'));
function onRemarkInput(e) {
  onField('remark', e.target.value);
}
// 标题自动增高（长标题可换行显示全文）
function onTitleInput(e) {
  onField('title', e.target.value);
  autoGrow(e.target);
}
function autoGrow(el) {
  // Chromium 123+ 支持 field-sizing: content，textarea 自动随内容撑高
  if (CSS.supports('field-sizing', 'content')) return;
  // 兜底：手动撑高
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ---------- 设定时间折叠 ----------
const calOpen = ref(false);
const hasTime = computed(() => props.todo.startAt || props.todo.endAt || props.todo.deadline);
const timeSummary = computed(() => {
  const t = props.todo;
  if (t.startAt && t.endAt) return `已设 ${fmtShort(t.startAt)} → ${fmtShort(t.endAt)}`;
  if (t.endAt) return `已设 ${fmtShort(t.endAt)}`;
  if (t.startAt) return `已设 ${fmtShort(t.startAt)} 开始`;
  if (t.deadline) return `已设 ${fmtShort(t.deadline)}`;
  return '未设置';
});

// 原始通知原文：默认展开，可点击收起
const srcOpen = ref(true);

function fmtShort(str) {
  if (!str) return '';
  const [d, t] = str.split(' ');
  const [, m, dd] = d.split('-');
  return `${+m}-${+dd} ${t}`;
}

// ---------- 日历 ----------
const minutes = [0, 15, 30, 45];
const now = new Date();
const viewYear = ref(now.getFullYear());
const viewMonth = ref(now.getMonth());
const startSel = ref(null);
const endSel = ref(null);
const startH = ref(0);
const startM = ref(0);
const endH = ref(23);
const endM = ref(59);

// 初始化：从既有时间解析，否则默认今天零点
(function init() {
  const t = props.todo;
  const parse = str => (str ? new Date(str.replace(' ', 'T')) : null);
  const s = parse(t.startAt);
  const e = parse(t.endAt || t.deadline);
  if (s) {
    startSel.value = s;
    startH.value = s.getHours();
    startM.value = Math.floor(s.getMinutes() / 15) * 15;
  } else {
    startSel.value = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (e) {
    endSel.value = e;
    endH.value = e.getHours();
    endM.value = Math.floor(e.getMinutes() / 15) * 15;
  }
})();

// 打开弹窗时让标题按内容自动撑高
onMounted(() => {
  nextTick(() => {
    const el = document.querySelector('.dp-title');
    if (el) autoGrow(el);
  });
});

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1);
  const offset = (first.getDay() + 6) % 7; // 周一开头
  const out = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(viewYear.value, viewMonth.value, i - offset + 1);
    out.push({ date: d, inMonth: d.getMonth() === viewMonth.value });
  }
  return out;
});

function shiftMonth(delta) {
  const d = new Date(viewYear.value, viewMonth.value + delta, 1);
  viewYear.value = d.getFullYear();
  viewMonth.value = d.getMonth();
}

function pick(d) {
  const key = d.getTime();
  if (!startSel.value || (startSel.value && endSel.value)) {
    startSel.value = new Date(key);
    endSel.value = null;
  } else if (d < startSel.value) {
    endSel.value = new Date(startSel.value.getTime());
    startSel.value = new Date(key);
  } else {
    endSel.value = new Date(key);
  }
}

const hasRange = computed(() => startSel.value && endSel.value);
function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isStart(d) { return sameDay(d, startSel.value); }
function isEnd(d) { return sameDay(d, endSel.value); }
function isRange(d) {
  if (!startSel.value || !endSel.value) return false;
  return d > startSel.value && d < endSel.value;
}
function isToday(d) { return sameDay(d, new Date()); }

// ---------- 应用 / 清除 ----------
function fmtHM(h, m) { return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
function fmtDate(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function applyTime() {
  if (!startSel.value) return;
  const startAt = `${fmtDate(startSel.value)} ${fmtHM(startH.value, startM.value)}`;
  const endAt = endSel.value ? `${fmtDate(endSel.value)} ${fmtHM(endH.value, endM.value)}` : '';
  emit('update-time', { startAt, endAt });
}
function clearTime() {
  startSel.value = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  endSel.value = null;
  startH.value = 0; startM.value = 0; endH.value = 23; endM.value = 59;
  emit('update-time', { startAt: '', endAt: '' });
}
</script>

<style scoped>
/* ============ 全屏详情页 ============ */
.detail-page {
  position: fixed;
  inset: 8px;              /* 与窗口边缘留一圈间距，形成圆角卡片框架 */
  z-index: 20;
  border-radius: var(--r-lg);   /* 与首页窗口同款圆角 */
  border: 1px solid var(--border);
  background:
    radial-gradient(1000px 400px at 85% -10%, var(--glow1), transparent 60%),
    var(--bg);
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 20px 24px;
  overflow-y: auto;
  animation: pageIn .18s ease;
}
/* 玻璃主题下详情页用不透明深灰背景：内容框要看得清，不能被透明背景干扰 */
[data-theme="glass"] .detail-page {
  background:
    radial-gradient(1000px 400px at 85% -10%, var(--glow1), transparent 60%),
    #171b26;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 顶部栏：返回/关闭绝对定位在两端并垂直居中，做成圆形背景按钮 */
.dp-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2px 0 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.dp-back {
  position: absolute;
  top: -5px; bottom: 5px;    /* 上下边距自动垂直居中，再整体上移 5px；热区以图标为中心对称 */
  left: 0;
  margin: auto 0;
  width: 48px; height: 48px; /* 加大热区：图标周围 48px 都可点 */
  display: grid; place-items: center;
  color: var(--text2);
  font-size: 17px;
  line-height: 1;
  z-index: 5;                /* 确保不被其他元素遮挡 */
  -webkit-app-region: no-drag;
}
/* 按压反馈：按下瞬间变淡，确认已点中（非悬浮效果） */
.dp-back:active { opacity: 0.5; }
.dp-top-title { font-size: 13px; color: var(--sub); letter-spacing: 2px; text-align: center; }

/* 大标题 */
.dp-title {
  width: 100%;
  resize: none;
  field-sizing: content;   /* 浏览器按内容自动撑高（Chromium 123+） */
  min-height: 44px;
  max-height: 50vh;
  overflow-y: auto;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.5;
  word-break: break-all;
  color: var(--text);
  background: none;
  border-bottom: 1px dashed transparent;
  padding: 2px 0;
}
.dp-title:focus { border-bottom-color: var(--accent-border); }
.dp-title.done { text-decoration: line-through; opacity: 0.6; }
.dp-title::placeholder { color: var(--sub2); font-weight: 400; }

/* 结构化字段：地点 / 物品 / 链接 */
.dp-fields { display: flex; flex-direction: column; gap: 8px; }
.f-row {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 9px 12px;
}
.f-ico { font-size: 15px; flex-shrink: 0; }
.f-input {
  flex: 1;
  font-size: 14px;
  color: var(--text);
  min-width: 0;
}
.f-input::placeholder { color: var(--sub2); }

/* 设定时间折叠行 */
.time-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 11px 14px;
}
.tt-label { font-size: 14px; font-weight: 600; color: var(--text); }
.tt-summary {
  flex: 1;
  text-align: right;
  font-size: 13px;
  color: var(--sub2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tt-summary.active { color: var(--accent); }
.tt-arrow { font-size: 12px; color: var(--sub2); transition: transform .2s; }
.tt-arrow.open { transform: rotate(180deg); }
.cal-wrap { display: flex; flex-direction: column; gap: 10px; }

/* 日历 */
.cal {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 10px;
}
.cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.cal-nav {
  width: 28px; height: 28px;
  border-radius: 8px;
  color: var(--sub);
  font-size: 16px;
  display: grid; place-items: center;
}
.cal-title { font-size: 14px; font-weight: 600; }
.cal-week { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 4px; }
.cal-wd { text-align: center; font-size: 11px; color: var(--sub2); padding: 2px 0; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
.cal-day {
  aspect-ratio: 1;
  border-radius: 9px;
  font-size: 13px;
  color: var(--text);
  display: grid; place-items: center;
}
.cal-day.dim { color: var(--sub2); opacity: 0.45; }
.cal-day.today { box-shadow: inset 0 0 0 1px var(--accent); }
.cal-day.range { background: var(--accent-soft); color: var(--accent); }
.cal-day.start, .cal-day.end { font-weight: 700; }
.cal-day.start { background: var(--accent); color: var(--accent-text); }
.cal-day.end { background: var(--star); color: #2a1b02; }
.cal-day.start.end { background: var(--accent); color: var(--accent-text); }

/* 时刻选择 */
.time-row { display: flex; gap: 10px; }
.t-field {
  flex: 1;
  display: flex; align-items: center; gap: 5px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 8px 10px;
}
.t-field span { font-size: 11px; color: var(--sub2); }
.t-field select {
  flex: 1;
  background: none;
  border: none;
  color: var(--text);
  font-size: 13px;
  outline: none;
}
.time-hint {
  font-size: 12px;
  color: var(--sub2);
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--card2);
}
.time-hint.active { color: var(--accent); background: var(--accent-soft); }
.time-btns { display: flex; justify-content: flex-end; gap: 8px; }
.btn-ghost { color: var(--sub); font-size: 13px; padding: 8px 16px; border-radius: var(--r-md); }
.btn-ghost.danger { color: var(--danger); }
.btn-parse {
  background: var(--accent); color: var(--accent-text);
  font-weight: 600; font-size: 13px;
  padding: 8px 16px; border-radius: var(--r-md);
}
.btn-parse:disabled { opacity: 0.5; cursor: not-allowed; }

/* 说明：随内容自动撑高，超出限制后内部滚动 */
.dp-remark {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  max-height: 40vh;
  overflow-y: auto;
  field-sizing: content;   /* 文字变多自动撑高 */
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;   /* 保留"；"自动换行产生的换行 */
  color: var(--text2);
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 11px 14px;
}
.dp-remark::placeholder { color: var(--sub2); }

/* 原始通知原文折叠行 */
.d-section { display: flex; flex-direction: column; gap: 8px; }
.src-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--sub);
  padding: 6px 2px;
}
.d-text {
  font-size: 14px; color: var(--text2);
  line-height: 1.8;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 12px 14px;
  word-break: break-all;
  white-space: pre-wrap;
  resize: vertical;
  font-family: inherit;
}
.d-text.source {
  color: var(--sub);
  min-height: 252px;        /* 默认约 10 行（14px × 1.8 × 10） */
  field-sizing: content;    /* 文字超出自动撑高 */
  max-height: 60vh;         /* 超高后内部滚动，不再无限增高 */
  overflow-y: auto;
}
</style>
