<template>
  <div class="app">
    <!-- 标题栏（可拖拽） -->
    <div class="titlebar">
      <span class="titlebar-title">WhatToDo</span>
      <div class="win-btns">
        <button class="win-btn pin-btn" :class="{ on: pinned }" @click="togglePin" :title="pinned ? '取消置顶（不再显示在最上层）' : '置顶（一直显示在最上层）'">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 17v5M9 3h6M10 3v4l-2 5a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l-2-5V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button class="win-btn settings-btn" @click="showSettings = true" title="设置">
          <svg viewBox="0 0 24 24" width="13" height="13"><path d="M19.4 13a7.5 7.5 0 0 0 .1-1 7.5 7.5 0 0 0-.1-1l2.1-1.6a.5.5 0 0 0 .1-.7l-2-3.4a.5.5 0 0 0-.6-.2l-2.5 1a7.7 7.7 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a7.7 7.7 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.7L4.5 11a7.5 7.5 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.7l2 3.4c.1.2.4.3.6.2l2.5-1a7.7 7.7 0 0 0 1.7 1l.4 2.6c0 .2.2.4.5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a7.7 7.7 0 0 0 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.4a.5.5 0 0 0-.1-.7zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" fill="currentColor"/></svg>
        </button>
        <button class="win-btn" @click="minimize">—</button>
        <button class="win-btn close" @click="close">✕</button>
      </div>
    </div>

    <div class="content">
      <!-- 头部 -->
      <header class="header">
        <div>
          <h1 class="day-title">我的一天</h1>
          <p class="day-sub">{{ todayText }}</p>
        </div>
        <span class="clock">{{ clock }}</span>
      </header>

      <!-- 待办列表（主视图） -->
      <main class="list" ref="listRef" v-if="todos.length">
        <template v-for="(t, idx) in todos" :key="t.id">
          <!-- 拖拽插入指示线 -->
          <div
            v-if="dragState && dragState.id !== t.id && idx === dragState.target"
            class="drop-line"
          ></div>
          <TodoItem
            :todo="t"
            :data-id="t.id"
            :class="{ 'is-drag': dragState && dragState.id === t.id }"
            :style="dragState && dragState.id === t.id ? { '--drag-dy': dragState.deltaY + 'px' } : undefined"
            @pointerdown="startDrag($event, t)"
            @open-detail="openDetail(t.id)"
            @toggle-done="toggleDone(t.id)"
            @remove="removeTodo(t.id)"
          />
        </template>
        <!-- 拖到最后一项之后时，指示线放在列表末尾 -->
        <div
          v-if="dragState && dragState.target === todos.length"
          class="drop-line"
        ></div>
      </main>
      <div v-else class="empty">
        <p>还没有待办</p>
        <p class="empty-sub">点底部「AI 解析」，粘贴通知自动生成</p>
      </div>

      <!-- AI 解析展开面板 -->
      <AiParsePanel
        v-if="parseOpen"
        @confirm="onConfirm"
        @close="parseOpen = false"
      />

      <!-- 添加任务 + AI 解析按钮 -->
      <footer class="add-bar">
        <span class="plus">+</span>
        <input
          v-model="newTitle"
          class="add-input"
          placeholder="添加任务"
          @keydown.enter="addManual"
        />
        <button class="btn-ai" :class="{ on: parseOpen }" @click="parseOpen = !parseOpen" title="AI 解析">
          <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 2l1.9 5.2L19 9l-5.1 1.8L12 16l-1.9-5.2L5 9l5.1-1.8zM19 15l.9 2.4L22 18.3l-2.1.9L19 21.5l-.9-2.3-2.1-.9 2.1-.9z" fill="currentColor"/></svg>
          AI 解析
        </button>
      </footer>
      <!-- 任务详情弹窗 -->
      <DetailModal
        v-if="detailTodo"
        :todo="detailTodo"
        @close="detailTodo = null"
        @update="onUpdateField"
        @update-time="onUpdateTime"
      />

      <!-- 设置弹窗 -->
      <SettingsModal v-if="showSettings" @close="showSettings = false" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import TodoItem from './components/TodoItem.vue';
import AiParsePanel from './components/AiParsePanel.vue';
import DetailModal from './components/DetailModal.vue';
import SettingsModal from './components/SettingsModal.vue';
import { applyTheme } from './theme.js';

const todos = ref([]);
const parseOpen = ref(false);
const newTitle = ref('');
const detailTodo = ref(null);
const showSettings = ref(false);
const pinned = ref(false);

// 置顶：一直显示在最上层
async function togglePin() {
  pinned.value = !pinned.value;
  await window.todoAPI.setPin(pinned.value);
}

// ---------- 日期 ----------
const week = ['日', '一', '二', '三', '四', '五', '六'];
const todayText = computed(() => {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日,星期${week[d.getDay()]}`;
});

// ---------- 标题栏同行右侧：24 小时制时间 ----------
const clock = ref('');
let clockTimer = null;
function tick() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  clock.value = `${hh}:${mm}`;
}
tick();
clockTimer = setInterval(tick, 15000);   // 每 15 秒同步一次

// ---------- 数据 ----------
onMounted(async () => {
  todos.value = await window.todoAPI.loadTodos();
  // 应用已保存的主题（深色/浅色/自定义）
  const saved = await window.todoAPI.getConfig();
  applyTheme(saved);
});
// 即时持久化（拖拽只在松手时重排一次，无高频写盘；改回立即保存避免后台节流丢数据）
// 持久化：Vue 响应式数组是 Proxy，Electron IPC 无法直接克隆，需先转成普通数据
watch(todos, v => window.todoAPI.saveTodos(JSON.parse(JSON.stringify(v))), { deep: true });

let seed = Date.now();
function uid() { return 't' + (seed++); }

function addTodo(item, sourceText) {
  const dl = item.deadline || '';
  todos.value.push({
    id: uid(),
    title: item.title,
    deadline: dl,
    startAt: '',
    endAt: dl, // 解析出的截止时间作为结束时间
    remark: item.remark || '',
    location: item.location || '',
    items: item.items || '',
    link: item.link || '',
    isStar: !!item.isStar,
    done: false,
    sourceText: sourceText || '',
    createdAt: Date.now()
  });
}

// ---------- AI 解析面板确认 ----------
function onConfirm(items, rawText) {
  items.forEach(it => addTodo(it, rawText));
}

// ---------- 长按拖拽排序 ----------
const listRef = ref(null);
const dragState = ref(null);       // { id, deltaY } 激活后表示正在拖拽
let pressTimer = null;
let pressStart = { x: 0, y: 0 };
let wasDragging = false;           // 长按拖拽过 → 吞掉随之而来的 click（不打开详情）

function startDrag(e, todo) {
  if (e.button !== 0) return;
  // 在按钮/输入框上按下不启动拖拽
  if (e.target.closest('button, input, textarea, select')) return;
  pressStart = { x: e.clientX, y: e.clientY };
  clearTimeout(pressTimer);
  pressTimer = setTimeout(() => {
    dragState.value = { id: todo.id, deltaY: 0, target: todos.value.findIndex(t => t.id === todo.id) };
    wasDragging = true;
  }, 300); // 长按 300ms 进入拖拽（更跟手）
}

function onPointerMove(e) {
  // 未进入拖拽前：不取消长按（按住卡片移动就是拖拽意图，轻微移动不应取消拖拽）
  if (!dragState.value) return;
  const st = dragState.value;
  st.deltaY = e.clientY - pressStart.y;
  const list = listRef.value;
  if (!list) return;
  // 拖到列表顶部/底部边缘自动滚动
  const lr = list.getBoundingClientRect();
  if (e.clientY < lr.top + 36 && list.scrollTop > 0) list.scrollTop -= 10;
  else if (e.clientY > lr.bottom - 36) list.scrollTop += 10;
  const items = [...list.querySelectorAll('.todo-item')];
  if (!items.length) return;
  const cur = todos.value.findIndex(t => t.id === st.id);
  let target = items.length - 1;
  // 统一用视口坐标（getBoundingClientRect 与 clientY 同基准）
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) { target = i; break; }
  }
  // 未越过任何中线（还在原位）就不显示指示线
  if (target === cur) target = -1;
  st.target = target;
}

function onPointerUp() {
  clearTimeout(pressTimer);
  pressTimer = null;
  if (dragState.value) {
    const st = dragState.value;
    const arr = [...todos.value];
    const cur = arr.findIndex(t => t.id === st.id);
    const target = st.target ?? cur; // -1 表示没越过中线，不重排
    if (target >= 0 && target !== cur) {
      const [m] = arr.splice(cur, 1);
      arr.splice(target, 0, m);
      todos.value = arr; // 一次性重排，其他卡片 .18s 平滑让位
    }
    dragState.value = null;
  }
}

onMounted(() => {
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  // 滚动条只在滚动时出现：滚动期间加 .scrolling，停止 500ms 后隐藏
  let scrollTimer = null;
  document.addEventListener('scroll', () => {
    document.body.classList.add('scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => document.body.classList.remove('scrolling'), 500);
  }, true);
});
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  if (clockTimer) clearInterval(clockTimer);
});

// ---------- 详情弹窗 ----------
function openDetail(id) {
  if (wasDragging) { wasDragging = false; return; } // 拖拽结束的 click 不打开详情
  const t = todos.value.find(x => x.id === id);
  if (t) detailTodo.value = t;
}

// 详情弹窗里编辑任务名/说明（实时写回，watch 自动持久化）
function onUpdateField(patch) {
  const t = detailTodo.value;
  if (!t) return;
  Object.assign(t, patch);
}

// 详情弹窗里设定时间（日历单选/双选）
function onUpdateTime({ startAt, endAt }) {
  const t = detailTodo.value;
  if (!t) return;
  t.startAt = startAt;
  t.endAt = endAt;
  t.deadline = endAt || startAt || ''; // 兼容旧字段：deadline 始终与 endAt/startAt 同步
}

// ---------- 手动添加 ----------
function addManual() {
  const t = newTitle.value.trim();
  if (!t) return;
  addTodo({ title: t, deadline: '', remark: '', isStar: false });
  newTitle.value = '';
}
function toggleDone(id) {
  const t = todos.value.find(x => x.id === id);
  if (t) t.done = !t.done;
}
function removeTodo(id) {
  todos.value = todos.value.filter(x => x.id !== id);
  if (detailTodo.value && detailTodo.value.id === id) detailTodo.value = null;
}

// ---------- 窗口 ----------
function minimize() { window.todoAPI.minimize(); }
function close() { window.todoAPI.close(); }
</script>
