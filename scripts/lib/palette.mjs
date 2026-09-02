// Shared design tokens. Every generated card matches assets/hero.svg so the
// profile reads as one system rather than a pile of third-party widgets.

export const C = {
  sky0: '#080b18', // deepest background
  sky1: '#0f1226',
  panel: '#12162a',
  panelTop: '#191d33',
  line: '#2b3152',
  lineSoft: '#222846',
  text: '#e6ebff',
  dim: '#a7b0d6',
  faint: '#6f78a3',
  amber: '#FFC66E',
  ember: '#B4611B',
  mint: '#4FE0B0',
  violet: '#a884de',
  rose: '#f2789b',
}

// Heatmap / density ramp, same family as the snake animation's palette.
export const RAMP = ['#161b22', '#44365b', '#654f83', '#a884de', '#cbaaff']

// GitHub Linguist colours, so language chips read as the ones people know.
export const LANG_COLORS = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Kotlin: '#A97BFF',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Python: '#3572A5',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Svelte: '#ff3e00',
  Astro: '#ff5a03',
  Vue: '#41b883',
  Ruby: '#701516',
  Dockerfile: '#384d54',
  EJS: '#a91e50',
  Makefile: '#427819',
  PowerShell: '#012456',
  Batchfile: '#C1F12E',
  Procfile: '#a0a0a0',
  Handlebars: '#f7931e',
  Smarty: '#f0c040',
  Less: '#1d365d',
  Blade: '#f7523f',
  Mustache: '#724b3b',
}

export const langColor = (name) => LANG_COLORS[name] || C.faint

// One font stack for everything. Cards render inside <img>, so no webfonts —
// only families that already exist on the reader's machine.
export const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace'
export const SANS =
  'Segoe UI, Helvetica Neue, Helvetica, Arial, sans-serif'
