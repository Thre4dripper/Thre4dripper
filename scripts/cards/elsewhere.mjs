// elsewhere.svg - the work that doesn't live in the contribution graph:
// LeetCode solves and npm package reach.

import {
  C,
  MONO,
  BASE_CSS,
  svgDoc,
  shell,
  odometer,
  fmt,
  round,
  esc,
} from '../lib/svg.mjs'

export function elsewhereCard({ leetcode, npm }) {
  const W = 1200
  const H = 230
  const chrome = shell({ w: W, h: H, title: '~/elsewhere', accent: C.rose })
  let css = BASE_CSS
  let body = chrome.open

  // ---- LeetCode: a ring split by difficulty --------------------------------
  const cx = 108
  const cy = 138
  const r = 50
  const circ = 2 * Math.PI * r
  const tiers = [
    { key: 'easy', label: 'Easy', color: C.mint, n: leetcode.easy, pool: leetcode.poolEasy },
    { key: 'medium', label: 'Medium', color: C.amber, n: leetcode.medium, pool: leetcode.poolMedium },
    { key: 'hard', label: 'Hard', color: C.rose, n: leetcode.hard, pool: leetcode.poolHard },
  ]
  const solved = leetcode.total || 1

  let ring = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.line}" stroke-width="11" opacity="0.55"/>`
  let offset = 0
  tiers.forEach((t, i) => {
    const frac = t.n / solved
    const len = frac * circ
    ring += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${t.color}" stroke-width="11"
      stroke-linecap="butt" stroke-dasharray="0 ${round(circ, 1)}" stroke-dashoffset="${round(-offset, 1)}"
      transform="rotate(-90 ${cx} ${cy})">
      <animate attributeName="stroke-dasharray" values="0 ${round(circ, 1)};${round(len, 1)} ${round(circ - len, 1)}"
               dur="1.05s" begin="${round(0.3 + i * 0.22, 2)}s" fill="freeze"
               keyTimes="0;1" keySplines="0.2 0.75 0.25 1" calcMode="spline"/>
    </circle>`
    offset += len
  })

  const odTotal = odometer({ x: cx - 33, y: cy + 6, value: fmt(leetcode.total), size: 27, color: C.text, delay: 0.35 })
  css += odTotal.css
  ring += odTotal.svg
  ring += `<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-size="9.5" letter-spacing="1.2" fill="${C.faint}">SOLVED</text>`

  // Difficulty rows, each bar showing share of that difficulty's whole pool.
  let tierRows = ''
  const rowX = 196
  const rowW = 300
  tiers.forEach((t, i) => {
    const y = 106 + i * 38
    const pct = t.n / Math.max(...tiers.map((x) => x.n), 1)
    tierRows += `<g class="fu" style="animation-delay:${round(0.55 + i * 0.1, 2)}s">
      <text x="${rowX}" y="${y}" font-size="11.5" fill="${t.color}">${t.label}</text>
      <text x="${rowX + rowW}" y="${y}" text-anchor="end" font-size="11.5" fill="${C.dim}">${fmt(t.n)}${t.pool ? ` / ${fmt(t.pool)}` : ''}</text>
      <rect x="${rowX}" y="${y + 7}" width="${rowW}" height="5" rx="2.5" fill="${C.line}" opacity="0.6"/>
      <rect x="${rowX}" y="${y + 7}" width="${round(Math.max(3, pct * rowW))}" height="5" rx="2.5" fill="${t.color}"
            class="gw" style="animation-delay:${round(0.65 + i * 0.1, 2)}s;transform-origin:${rowX}px ${y + 9.5}px"/>
    </g>`
  })

  body += `\n  <text x="26" y="70" font-size="10" letter-spacing="1.6" fill="${C.faint}">LEETCODE · @thre4dripper</text>
  ${ring}
  ${tierRows}
  <text x="${rowX}" y="${H - 24}" font-size="9.5" fill="${C.faint}" opacity="0.85">global rank #${fmt(leetcode.ranking)}</text>
  <line x1="565" y1="60" x2="565" y2="${H - 24}" stroke="${C.line}" stroke-width="1"/>`

  // ---- npm packages --------------------------------------------------------
  const npmX = 610
  const maxDl = Math.max(...npm.map((p) => p.downloads), 1)
  const colW = 268
  let pkgs = ''
  npm.forEach((p, i) => {
    const x = npmX + i * (colW + 26)
    const od = odometer({ x, y: 130, value: fmt(p.downloads), size: 30, color: C.text, delay: 0.45 + i * 0.15 })
    css += od.css
    pkgs += `<g class="fu" style="animation-delay:${round(0.4 + i * 0.12, 2)}s">
      <text x="${x}" y="98" font-size="12.5" fill="${C.mint}">${esc(p.name)}</text>
    </g>
    ${od.svg}
    <text x="${x}" y="150" font-size="10" fill="${C.faint}">installs in the last 12 months</text>
    <rect x="${x}" y="162" width="${colW}" height="5" rx="2.5" fill="${C.line}" opacity="0.6"/>
    <rect x="${x}" y="162" width="${round(Math.max(4, (p.downloads / maxDl) * colW))}" height="5" rx="2.5" fill="${C.violet}"
          class="gw" style="animation-delay:${round(0.7 + i * 0.12, 2)}s;transform-origin:${x}px 164.5px"/>
    <text x="${x}" y="185" font-size="10" fill="${C.faint}" opacity="0.9">v${esc(p.version)} · ${p.releases} releases published</text>`
  })

  const totalDl = npm.reduce((n, p) => n + p.downloads, 0)
  body += `\n  <text x="${npmX}" y="70" font-size="10" letter-spacing="1.6" fill="${C.faint}">NPM REGISTRY · PUBLISHED PACKAGES</text>
  ${pkgs}
  <text x="${npmX}" y="${H - 24}" font-size="9.5" fill="${C.faint}" opacity="0.85">${fmt(totalDl)} installs a year across ${npm.length} packages</text>`

  return svgDoc({
    w: W,
    h: H,
    title: `${fmt(leetcode.total)} LeetCode problems solved and ${fmt(totalDl)} npm installs a year`,
    defs: chrome.defs,
    css,
    body,
  })
}
