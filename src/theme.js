// 主题应用：深色/浅色/玻璃半透明/自定义（自定义通过 inline CSS 变量覆盖）
export function applyTheme(saved) {
  const root = document.documentElement;
  const theme = (saved && saved.theme) || 'dark';
  root.dataset.theme = theme;
  const custom = (saved && saved.customColors) || {};
  if (theme === 'custom') {
    for (const [k, v] of Object.entries(custom)) {
      if (v) root.style.setProperty(k, v);
    }
  } else {
    ['--bg', '--card', '--text', '--accent'].forEach(k => root.style.removeProperty(k));
  }
  // 玻璃主题透明度
  const alpha = saved && saved.glassAlpha;
  if (theme === 'glass' && alpha != null) {
    root.style.setProperty('--glass-a', String(alpha));
  } else {
    root.style.removeProperty('--glass-a');
  }
}
