<template>
  <div
    class="todo-item"
    :class="{ done: todo.done, over: isOverdue && !todo.done }"
    @click="$emit('open-detail')"
    title="点击查看详情"
  >
    <button class="check" :class="{ checked: todo.done }" @click.stop="$emit('toggle-done')" :title="todo.done ? '标记未完成' : '标记完成'">
      <svg v-if="todo.done" viewBox="0 0 16 16" width="11" height="11"><path d="M2 8.5 6 12.5 14 3.5" fill="none" stroke="#0e1420" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>

    <div class="body">
      <div class="title-row">
        <span class="title">{{ todo.title }}</span>
      </div>
      <div v-if="timeText" class="deadline" :class="{ over: isOverdue && !todo.done }">
        {{ timeText }}
      </div>
      <div v-if="todo.remark" class="remark">{{ fmtRemark(todo.remark) }}</div>
    </div>

    <!-- 删除：鼠标放上去才显示，点击直接删除 -->
    <button class="del" @pointerdown.stop @click.stop="$emit('remove')" title="删除">✕</button>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ todo: Object });
defineEmits(['open-detail', 'toggle-done', 'remove']);

// 修正年份：旧数据里截止时间被写成去年 → 显示与判断都用今年（避免"还没到却显示已截止"）
function fixDate(str) {
  if (!str) return '';
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return str;
  const y = +m[1];
  const nowY = new Date().getFullYear();
  if (y < nowY) return String(str).replace(/^\d{4}/, String(nowY));
  return str;
}

const endOf = computed(() => fixDate(props.todo.endAt || props.todo.deadline || ''));

const timeText = computed(() => {
  const t = props.todo;
  const s = fixDate(t.startAt), e = fixDate(t.endAt), d = fixDate(t.deadline);
  if (s && e) return `🕐 ${fmtShort(s)} → ${fmtShort(e)} · ${tipOf(e)}`;
  if (e) return `⏰ 截止 ${fmtShort(e)} · ${tipOf(e)}`;
  if (s) return `🕐 ${fmtShort(s)} 开始`;
  if (d) return `⏰ ${fmtShort(d)} · ${tipOf(d)}`;
  return '';
});

const isOverdue = computed(() => {
  const d = endOf.value;
  if (!d) return false;
  const t = new Date(d.replace(' ', 'T')).getTime();
  return !isNaN(t) && t < Date.now();
});

// 备注显示：每个"；"后自动换行（分号后已有的空白/换行合并成单个换行）
function fmtRemark(r) {
  return String(r || '').replace(/；(\s*)/g, '；\n');
}

function fmtShort(str) {
  if (!str) return '';
  const [d, t] = str.split(' ');
  const [, m, dd] = d.split('-');
  return `${+m}-${+dd} ${t}`;
}
function tipOf(str) {
  const t = new Date(str.replace(' ', 'T')).getTime();
  if (isNaN(t)) return '';
  const diff = t - Date.now();
  if (diff <= 0) return '已截止';
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `剩 ${days} 天 ${hours} 小时`;
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `剩 ${hours} 小时 ${mins} 分`;
  if (mins > 0) return `剩 ${mins} 分钟`;
  return '即将截止';
}
</script>
