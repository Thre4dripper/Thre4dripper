// stats.svg - the numbers, on rolling-digit counters, plus the weekly rhythm.

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

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function statsCard({ user, repos, stats }) {
  const W = 500
  const H = 316
  const originals = repos.filter((r) => !r.fork)
  const stars = repos.reduce((n, r) => n + r.stars, 0)
  const forks = repos.reduce((n, r) => n + r.forks, 0)

  const chrome = shell({ w: W, h: H, title: '~/whoami --stats', accent: C.mint })
  let css = BASE_CSS
  let body = chrome.open

  // Two headline figures.
  const heroes = [
    { x: 26, value: fmt(stats.total), label: `contributions since ${stats.firstDate.slice(0, 4)}`, color: C.amber },
    { x: 285, value: fmt(stats.currentStreak), label: 'day streak, unbroken', color: C.mint },
  ]
  heroes.forEach((h, i) => {
    const od = odometer({
      x: h.x,
      y: 100,
      value: h.value,
      size: 40,
      color: h.color,
      delay: 0.15 + i * 0.12,
    })
    css += od.css
    body += `\n  ${od.svg}
  <text x="${h.x}" y="119" font-size="10.5" letter-spacing="0.7" fill="${C.faint}">${esc(h.label)}</text>`
  })

  body += `\n  <line x1="270" y1="62" x2="270" y2="112" stroke="${C.line}" stroke-width="1"/>
  <line x1="26" y1="136" x2="${W - 26}" y2="136" stroke="${C.line}" stroke-width="1" opacity="0.8"/>`

  // Supporting figures, two rows of two.
  const cells = [
    { value: fmt(originals.length), label: 'repositories built' },
    { value: fmt(stars), label: 'stars earned' },
    { value: fmt(stats.activeDays), label: 'days with commits' },
    { value: fmt(user.followers), label: 'followers' },
  ]
  cells.forEach((cell, i) => {
    const x = 26 + (i % 2) * 259
    const y = 172 + Math.floor(i / 2) * 46
    const od = odometer({ x, y, value: cell.value, size: 21, color: C.text, delay: 0.5 + i * 0.09 })
    css += od.css
    body += `\n  ${od.svg}
  <text x="${x}" y="${y + 15}" font-size="9.5" fill="${C.faint}">${esc(cell.label)}</text>`
  })

  // Weekly rhythm: which days the commits actually land on.
  const peak = Math.max(...stats.byWeekday, 1)
  const barW = 13
  const gap = 8
  const baseY = 282
  const maxH = 34
  const startX = W - 26 - (barW * 7 + gap * 6)
  let bars = ''
  stats.byWeekday.forEach((v, d) => {
    const h = Math.max(3, (v / peak) * maxH)
    const x = startX + d * (barW + gap)
    const hot = v === peak
    bars += `<g class="fu" style="animation-delay:${round(0.85 + d * 0.05, 2)}s">
      <rect x="${x}" y="${round(baseY - h)}" width="${barW}" height="${round(h)}" rx="3" fill="${hot ? C.mint : C.violet}" opacity="${hot ? 0.95 : 0.5}"/>
      <text x="${x + barW / 2}" y="${baseY + 12}" text-anchor="middle" font-size="8.5" fill="${hot ? C.mint : C.faint}">${DAYS[d]}</text>
    </g>`
  })

  body += `\n  <text x="26" y="${baseY - 30}" font-size="9.5" letter-spacing="1" fill="${C.faint}">WEEKLY RHYTHM</text>
  <text x="26" y="${baseY - 12}" font-size="11" fill="${C.dim}">busiest on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][stats.byWeekday.indexOf(peak)]}</text>
  <text x="26" y="${baseY + 12}" font-size="9" fill="${C.faint}" opacity="0.8">busiest single day: ${fmt(stats.bestDay.count)} contributions</text>
  ${bars}`

  return svgDoc({
    w: W,
    h: H,
    title: `GitHub stats: ${fmt(stats.total)} contributions, ${fmt(stats.currentStreak)} day streak, ${fmt(stars)} stars`,
    defs: chrome.defs,
    css,
    body,
  })
}
