<template>
  <div class="mask" @click.self="$emit('close')">
    <div class="modal settings">
      <div class="s-head">
        <h3>设置</h3>
        <button class="s-close" @click="$emit('close')">✕</button>
      </div>

      <!-- 1. 主题设置 -->
      <section class="s-section">
        <div class="s-label">设置样式</div>
        <div class="theme-row">
          <button
            v-for="t in themes"
            :key="t.key"
            class="theme-btn"
            :class="{ on: cfg.theme === t.key }"
            @click="setTheme(t.key)"
          >{{ t.name }}</button>
        </div>
        <div v-if="cfg.theme === 'glass'" class="glass-alpha">
          <span class="ga-label">透明程度</span>
          <input type="range" min="0.04" max="0.5" step="0.01" v-model.number="cfg.glassAlpha" @input="onGlassAlpha" />
          <span class="ga-val">{{ Math.round(cfg.glassAlpha * 100) }}%</span>
        </div>
      </section>

      <!-- 2. AI 解析设置 -->
      <section class="s-section">
        <div class="s-label">AI 解析接口</div>
        <div class="field">
          <label>选择服务商</label>
          <select v-model="cfg.provider" @change="onProviderChange">
            <option v-for="(p, key) in providers" :key="key" :value="key">{{ p.label }}</option>
          </select>
        </div>
        <div class="field">
          <label>API Key（左侧填写）</label>
          <input v-model="cfg.apiKey" type="password" placeholder="sk-..." @input="changed = true" />
        </div>
        <div class="field">
          <label>模型（右侧选择）</label>
          <select v-model="cfg.model" @change="changed = true">
            <option v-for="m in currentModels" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="field">
          <label>接口地址（一般不用改）</label>
          <input v-model="cfg.baseURL" placeholder="留空使用服务商默认" @input="changed = true" />
        </div>
        <p class="s-tip">配置 API Key 后使用大模型解析；未配置自动用本地解析</p>
      </section>

      <!-- 启动设置 -->
      <section class="s-section">
        <div class="s-label">启动设置</div>
        <div class="switch-row">
          <span class="sw-text">开机自启动</span>
          <button
            class="switch"
            :class="{ on: autostart }"
            @click="toggleAutostart"
            :title="autostart ? '点击关闭开机自启动' : '点击开启开机自启动'"
          >
            <span class="knob"></span>
          </button>
        </div>
        <p class="s-tip">开启后登录 Windows 自动启动；关闭则取消自启动（绿色版请保持 exe 位置不变）</p>
      </section>

      <!-- 3. 作者 -->
      <section class="s-section">
        <div class="s-label author-label" @click="authorOpen = !authorOpen">
          <span>作者引言</span>
          <span class="chevron" :class="{ open: authorOpen }">▾</span>
        </div>
        <div v-if="authorOpen" class="author-box">
          <p class="a-line">我是创作者 <b>penguin</b> <span class="penguin" @click="hello">🐧</span></p>
          <div class="a-grid">
            <div class="a-item"><span class="a-key">邮箱</span><a :href="'mailto:' + info.email">{{ info.email }}</a></div>
            <div class="a-item"><span class="a-key">小红书</span><span>{{ info.xhs }}</span></div>
            <div class="a-item"><span class="a-key">GitHub</span><a :href="info.github" target="_blank" rel="noopener">{{ info.github || '未填写' }}</a></div>
          </div>
          <p class="a-mail-note">有任何更好的建议，或者想和我做朋友，欢迎来信</p>
        </div>
      </section>

      <div class="modal-btns">
        <button class="btn-ghost" @click="$emit('close')">取消</button>
        <button class="btn-parse" @click="save">保存</button>
      </div>
    </div>

    <!-- HELLO 动画 -->
    <transition name="hello-fade">
      <div v-if="helloShow" class="hello-overlay">
        <span class="hello-text">HELLO！~</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { applyTheme } from '../theme.js';

const emit = defineEmits(['close']);

const themes = [
  { key: 'dark', name: '深色' },
  { key: 'light', name: '浅色' },
  { key: 'glass', name: '玻璃' }
];

const providers = {
  doubao: { label: '豆包', models: ['doubao-seed-1-6-250615', 'doubao-1-5-pro-32k-250115', 'doubao-1-5-lite-32k-250115'] },
  deepseek: { label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  kimi: { label: 'Kimi', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  qwen: { label: '千问', models: ['qwen-plus', 'qwen-max', 'qwen-turbo'] }
};

const info = {
  email: '1563215141@qq.com',
  xhs: '26790182778',
  github: 'https://github.com/KuzeMAX117/Text2Todo'
};

const cfg = ref({ theme: 'dark', provider: 'doubao', apiKey: '', baseURL: '', model: '', glassAlpha: 0.12 });
const changed = ref(false);
const authorOpen = ref(false);
const helloShow = ref(false);
const autostart = ref(false);

const currentModels = computed(() => {
  const p = providers[cfg.value.provider];
  return p ? p.models : providers.doubao.models;
});

onMounted(async () => {
  const saved = await window.todoAPI.getConfig();
  // 主题以配置为准，配置缺失时以当前界面主题兜底，避免打开设置闪回深色
  const curTheme = document.documentElement.dataset.theme || 'dark';
  cfg.value = { ...cfg.value, ...saved, theme: saved.theme || curTheme };
  // 自定义主题已下线：旧配置残留 custom 时兜底为深色并落盘
  if (cfg.value.theme === 'custom') {
    cfg.value.theme = 'dark';
    persistTheme();
  }
  if (saved.customColors) custom.value = { ...custom.value, ...saved.customColors };
  // 注意：这里不做 applyTheme——打开设置弹窗不能改变当前界面主题，
  // 只有用户点主题按钮/调透明度时才应用+保存（否则会闪回默认深色）
  autostart.value = await window.todoAPI.getAutostart();
});

// 开机自启动开关
async function toggleAutostart() {
  const next = !autostart.value;
  const ok = await window.todoAPI.setAutostart(next);
  if (ok) autostart.value = next;
}

function applyLocalTheme() {
  applyTheme(cfg.value);
}

// 主题相关即时保存：切换主题/调透明度立即写盘，重启不丢，不会闪回默认深色
function persistTheme() {
  window.todoAPI.setConfig({
    theme: cfg.value.theme,
    glassAlpha: cfg.value.glassAlpha
  });
}

function setTheme(key) {
  cfg.value.theme = key;
  changed.value = true;
  applyLocalTheme();
  persistTheme();
}

function onGlassAlpha() {
  applyLocalTheme();
  persistTheme();
}

function onProviderChange() {
  // 切换服务商：默认模型取该服务商第一个，清空自定义地址（用服务商默认）
  const p = providers[cfg.value.provider];
  cfg.value.model = p ? p.models[0] : '';
  cfg.value.baseURL = '';
  changed.value = true;
}

async function save() {
  await window.todoAPI.setConfig({
    theme: cfg.value.theme,
    provider: cfg.value.provider,
    apiKey: cfg.value.apiKey,
    baseURL: cfg.value.baseURL,
    model: cfg.value.model,
    glassAlpha: cfg.value.glassAlpha
  });
  changed.value = false;
  emit('close');
}

function hello() {
  if (helloShow.value) return;
  helloShow.value = true;
  setTimeout(() => { helloShow.value = false; }, 2000);
}
</script>

<style scoped>
.mask {
  position: fixed; inset: 0;
  background: var(--mask);
  display: flex; align-items: center; justify-content: center;
  z-index: 30;
  padding: 20px;
}
.settings { width: 340px; max-height: 88vh; overflow-y: auto; }
.settings::-webkit-scrollbar { width: 4px; }

.s-head { display: flex; align-items: center; justify-content: space-between; }
.s-head h3 { margin: 0; }
.s-close { color: var(--sub2); font-size: 13px; padding: 2px 6px; border-radius: 8px; }

.s-section {
  border-top: 1px solid var(--border);
  padding-top: 10px;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.s-label { font-size: 12px; color: var(--sub); letter-spacing: 1px; }

.theme-row { display: flex; gap: 8px; }
.theme-btn {
  flex: 1;
  padding: 7px 0;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  font-size: 13px;
  color: var(--sub);
}
.theme-btn.on { background: var(--accent); color: var(--accent-text); border-color: var(--accent); font-weight: 600; }

.glass-alpha { display: flex; align-items: center; gap: 10px; margin-top: 2px; }
.ga-label { font-size: 12px; color: var(--sub2); white-space: nowrap; }
.glass-alpha input[type="range"] {
  flex: 1;
  accent-color: var(--accent);
  cursor: pointer;
}
.ga-val { font-size: 12px; color: var(--sub); width: 34px; text-align: right; }

/* 开关 */
.switch-row { display: flex; align-items: center; justify-content: space-between; }
.sw-text { font-size: 13px; color: var(--text); }
.switch {
  width: 40px; height: 22px;
  border-radius: 999px;
  background: var(--border2);
  position: relative;
  transition: background .2s;
  flex-shrink: 0;
}
.switch.on { background: var(--accent); }
.knob {
  position: absolute; top: 2px; left: 2px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: left .2s;
}
.switch.on .knob { left: 20px; }

.field { display: flex; flex-direction: column; gap: 4px; }
.field label { font-size: 12px; color: var(--sub2); }
.s-tip { font-size: 11px; color: var(--sub2); }

.author-label { cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
.chevron { transition: transform .2s; color: var(--sub2); }
.chevron.open { transform: rotate(180deg); }

.author-box { display: flex; flex-direction: column; gap: 8px; }
.a-line { font-size: 13px; }
.a-line b { color: var(--accent); }
.penguin { cursor: pointer; font-size: 18px; margin-left: 2px; }

.a-grid { display: flex; flex-direction: column; gap: 5px; font-size: 12px; }
.a-item { display: flex; gap: 8px; align-items: center; }
.a-key { color: var(--sub2); width: 56px; flex-shrink: 0; }
.a-item a { color: var(--accent); text-decoration: none; }
.a-mail-note { font-size: 11px; color: var(--sub2); }

/* HELLO 动画：2 秒渐隐 */
.hello-overlay {
  position: fixed; inset: 0;
  display: flex; align-items: center; justify-content: center;
  z-index: 50;
  pointer-events: none;
}
.hello-text {
  font-size: 72px;
  font-weight: 900;
  letter-spacing: 4px;
  color: var(--accent);
  text-shadow: 0 0 40px var(--accent-soft2);
  animation: helloOut 2s ease forwards;
}
@keyframes helloOut {
  0% { opacity: 0; transform: scale(0.7); }
  15% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.15); }
}
</style>
