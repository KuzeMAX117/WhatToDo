<template>
  <div class="ai-panel">
    <!-- 头部 -->
    <div class="panel-head">
      <span class="panel-title">✦ AI 解析</span>
      <button class="panel-close" @click="$emit('close')" title="收起">✕</button>
    </div>

    <!-- 文本上传区 -->
    <textarea
      v-model="text"
      rows="3"
      class="parse-input"
      placeholder="把群通知/长消息粘贴到这里，例如：考试时间是10月12日-10月18日晚上11点，可重考2次…"
    ></textarea>
    <div class="parse-actions">
      <button class="btn-parse" @click="doParse" :disabled="parsing || !text.trim()">
        {{ parsing ? '解析中…' : '开始解析' }}
      </button>
      <span class="parse-hint">由大模型解析（需先在设置里配置 API Key，无本地解析）</span>
    </div>
    <p v-if="msg" class="parse-msg" :class="{ warn: msgType === 'warn' }">{{ msg }}</p>

    <!-- 预览列表（可编辑） -->
    <div v-if="previews.length" class="preview-list">
      <div class="preview-hint">预览结果 — 可直接修改，勾掉不要的，然后确认添加</div>
      <div v-for="(p, i) in previews" :key="p.key" class="preview-item" :class="{ off: p.off }">
        <button class="check" :class="{ checked: !p.off }" @click="p.off = !p.off" title="勾选/取消这条">
          <svg v-if="!p.off" viewBox="0 0 16 16" width="11" height="11"><path d="M2 8.5 6 12.5 14 3.5" fill="none" stroke="var(--accent-text)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="p-body">
          <input v-model="p.title" class="p-title" :class="{ muted: p.off }" placeholder="任务名称" />
          <input v-model="p.deadline" class="p-deadline" placeholder="截止时间，如 2026-10-18 23:00" />
          <textarea v-model="p.remark" class="p-remark" rows="2" placeholder="备注（可空），如：线上学习占20%…"></textarea>
        </div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div v-if="previews.length" class="panel-btns">
      <span class="count">共 {{ previews.length }} 条，已选 {{ selectedCount }} 条</span>
      <div class="btns-right">
        <button class="btn-ghost" @click="reset">清空</button>
        <button class="btn-parse" @click="confirm" :disabled="selectedCount === 0">确认添加 ({{ selectedCount }})</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['confirm', 'close']);

const text = ref('');
const parsing = ref(false);
const previews = ref([]);
const msg = ref('');
const msgType = ref('ok');

let seed = 0;
const key = () => 'p' + (++seed) + '-' + Date.now();

const selectedCount = computed(() => previews.value.filter(p => !p.off).length);

async function doParse() {
  const t = text.value.trim();
  if (!t) return;
  parsing.value = true;
  msg.value = '';
  try {
    const res = await window.todoAPI.aiParse(t);
    if (res.error) {
      msg.value = res.error;
      msgType.value = 'warn';
      return;
    }
    if (!res.items.length) {
      msg.value = '大模型没有识别到任务，换一段文本试试';
      msgType.value = 'warn';
      return;
    }
    previews.value = res.items.map(it => ({
      key: key(),
      title: it.title,
      deadline: it.deadline || '',
      remark: it.remark || '',
      location: it.location || '',
      items: it.items || '',
      link: it.link || '',
      isStar: !!it.isStar,
      off: false
    }));
    msg.value = `✓ 大模型识别出 ${res.items.length} 条，可编辑后确认`;
    msgType.value = 'ok';
  } catch (e) {
    msg.value = '解析出错：' + (e.message || e);
    msgType.value = 'warn';
  } finally {
    parsing.value = false;
  }
}

function reset() {
  previews.value = [];
  text.value = '';
  msg.value = '';
}

function confirm() {
  const items = previews.value
    .filter(p => !p.off)
    .map(p => ({
      title: p.title.trim(),
      deadline: p.deadline.trim(),
      remark: p.remark.trim(),
      location: (p.location || '').trim(),
      items: (p.items || '').trim(),
      link: (p.link || '').trim(),
      isStar: p.isStar
    }))
    .filter(p => p.title);
  emit('confirm', items, text.value.trim());
  reset();
}
</script>

<style scoped>
.ai-panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  padding: 10px;
  box-shadow: var(--shadow-card);
  margin-top: 10px;
  flex-shrink: 1;                     /* 允许收缩而不是把其他模块挤出去 */
  min-height: 0;
  max-height: min(430px, calc(100vh - 200px));
  overflow-y: auto;                   /* 超高时面板内部滚动 */
  animation: slideUp .18s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.panel-title { font-size: 13px; font-weight: 600; color: var(--accent); }
.panel-close { color: var(--sub2); font-size: 12px; padding: 2px 6px; border-radius: 8px; }

.parse-input {
  width: 100%;
  resize: none;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: 8px 10px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text2);
}
/* 玻璃主题下输入框背景加深：文字更清晰 */
[data-theme="glass"] .parse-input {
  background: rgba(8, 11, 20, 0.55);
  color: #ffffff;
}
.parse-input::placeholder { color: var(--sub2); }
.parse-input:focus { border-color: var(--accent); }

.parse-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.btn-parse {
  background: var(--accent);
  color: var(--accent-text);
  font-weight: 600;
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 8px;
  white-space: nowrap;
}
.btn-parse:disabled { opacity: 0.5; cursor: not-allowed; }
.parse-hint { font-size: 11px; color: var(--sub2); }
.parse-msg { margin-top: 6px; font-size: 12px; color: var(--accent); }
.parse-msg.warn { color: var(--star); }

.preview-list { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.preview-hint { font-size: 11px; color: var(--sub2); }
.preview-item {
  display: flex;
  gap: 8px;
  background: var(--card2);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 8px;
}
.preview-item.off { opacity: 0.45; }
.check {
  width: 17px; height: 17px;
  margin-top: 2px;
  border-radius: 50%;
  border: 2px solid var(--check-border);
  display: grid; place-items: center;
  flex-shrink: 0;
}
.check.checked { background: var(--accent); border-color: var(--accent); }
.p-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.p-title { font-size: 13px; font-weight: 600; color: var(--text); background: transparent; }
.p-title.muted { text-decoration: line-through; }
.p-deadline { font-size: 11px; color: var(--accent); background: var(--accent-soft); border-radius: 8px; padding: 2px 8px; }
.p-remark { font-size: 12px; color: var(--sub); background: var(--card2); border: 1px solid var(--border); border-radius: 8px; padding: 5px 8px; resize: vertical; line-height: 1.5; min-height: 44px; }
.star { color: var(--check-border); flex-shrink: 0; }
.star.on { color: var(--star); }

.panel-btns { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
.count { font-size: 12px; color: var(--sub); }
.btns-right { display: flex; gap: 8px; }
.btn-ghost { color: var(--sub); font-size: 12px; padding: 6px 10px; border-radius: 8px; }
</style>
