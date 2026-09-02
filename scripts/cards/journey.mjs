// journey.svg - every month of contributions since the account was created,
// drawn as one continuous line with a comet running the timeline.

import {
  C,
  MONO,
  SANS,
  BASE_CSS,
  svgDoc,
  shell,
  smoothPath,
  pathLength,
  fmt,
  round,
  esc,
  nextId,
} from '../lib/svg.mjs'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function journeyCard({ months, stats }) {
  const W = 1200
  const H = 330
  const padL = 54
  const padR = 26
  const top = 74
  const bottom = H - 78
  const plotW = W - padL - padR
  const plotH = bottom - top

  const max = Math.max(...months.map((m) => m.value), 1)
  const n = months.length
  const xAt = (i) => padL + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1))
  const yAt = (v) => bottom - (v / max) * plotH

  const pts = months.map((m, i) => [xAt(i), yAt(m.value)])
  const line = smoothPath(pts)
  const len = pathLength(pts)
  const area = `${line}L${round(pts.at(-1)[0])},${bottom}L${round(pts[0][0])},${bottom}Z`

  const fill = nextId('fill')
  const stroke = nextId('str')
  const clip = nextId('wipe')
  const lineId = nextId('path')
  const soft = nextId('soft')

  // Year boundaries, so the shape of each year is readable at a glance.
  const years = [...new Set(months.map((m) => m.year))]
  let axis = ''
  for (const y of years) {
    const first = months.findIndex((m) => m.year === y)
    const last = months.findLastIndex((m) => m.year === y)
    const x0 = xAt(first)
    const x1 = xAt(last)
    const mid = (x0 + x1) / 2
    const total = stats.byYear[String(y)] ?? months.filter((m) => m.year === y).reduce((a, b) => a + b.value, 0)
    const delay = round(0.35 + years.indexOf(y) * 0.09, 2)
    if (first > 0) {
      axis += `<line x1="${round(x0 - 4)}" y1="${top - 6}" x2="${round(x0 - 4)}" y2="${bottom}" stroke="${C.line}" stroke-width="1" opacity="0.5" class="fi" style="animation-delay:${delay}s"/>`
    }
    axis += `<g class="fu" style="animation-delay:${delay}s">
    <text x="${round(mid)}" y="${bottom + 25}" text-anchor="middle" font-size="13" font-weight="700" fill="${C.dim}" letter-spacing="1">${y}</text>
    <text x="${round(mid)}" y="${bottom + 41}" text-anchor="middle" font-size="11" fill="${C.faint}">${fmt(total)}</text>
  </g>`
  }

  // Horizontal guides at quarter steps of the busiest month.
  let guides = ''
  for (let k = 1; k <= 3; k++) {
    const v = (max * k) / 4
    const y = yAt(v)
    guides += `<line x1="${padL}" y1="${round(y)}" x2="${W - padR}" y2="${round(y)}" stroke="${C.lineSoft}" stroke-width="1" opacity="0.55"/>
  <text x="${padL - 9}" y="${round(y + 3.5)}" text-anchor="end" font-size="9.5" fill="${C.faint}" opacity="0.8">${Math.round(v)}</text>`
  }

  // Busiest month, called out where it happens.
  const peakIdx = months.reduce((best, m, i) => (m.value > months[best].value ? i : best), 0)
  const peak = months[peakIdx]
  const px = xAt(peakIdx)
  const py = yAt(peak.value)
  const flip = px > W - 190
  const peakLabel = `<g class="fu" style="animation-delay:1.95s">
    <line x1="${round(px)}" y1="${round(py - 8)}" x2="${round(px)}" y2="${round(py - 24)}" stroke="${C.amber}" stroke-width="1.2" opacity="0.65"/>
    <text x="${round(flip ? px - 8 : px + 8)}" y="${round(py - 27)}" text-anchor="${flip ? 'end' : 'start'}" font-size="11" fill="${C.amber}">${MONTHS[peak.month - 1]} ${peak.year} · ${fmt(peak.value)}</text>
  </g>`

  const chrome = shell({
    w: W,
    h: H,
    title: `~/contributions --since ${years[0]}`,
    accent: C.amber,
    badge: `${fmt(stats.total)} total  ·  ${fmt(stats.currentStreak)}-day streak  ·  ${Math.round(stats.activeRate * 100)}% of days active`,
  })

  const defs = `${chrome.defs}
  <linearGradient id="${fill}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${C.amber}" stop-opacity="0.42"/>
    <stop offset="55%" stop-color="${C.ember}" stop-opacity="0.14"/>
    <stop offset="100%" stop-color="${C.ember}" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="${stroke}" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${C.mint}"/>
    <stop offset="52%" stop-color="${C.amber}"/>
    <stop offset="100%" stop-color="${C.rose}"/>
  </linearGradient>
  <radialGradient id="${soft}">
    <stop offset="0%" stop-color="${C.amber}" stop-opacity="0.9"/>
    <stop offset="100%" stop-color="${C.amber}" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="${clip}"><rect x="0" y="0" width="0" height="${H}">
    <animate attributeName="width" values="0;${W}" dur="1.9s" begin="0.3s" fill="freeze"
             keySplines="0.22 0.7 0.25 1" keyTimes="0;1" calcMode="spline"/>
  </rect></clipPath>
  <path id="${lineId}" d="${line}" fill="none"/>`

  const css = `${BASE_CSS}
.draw{stroke-dasharray:${len};stroke-dashoffset:${len};animation:draw 2.1s cubic-bezier(.25,.7,.25,1) .3s both}
@keyframes draw{to{stroke-dashoffset:0}}`

  const body = `${chrome.open}
  <g>${guides}</g>
  <g clip-path="url(#${clip})">
    <path d="${area}" fill="url(#${fill})"/>
  </g>
  <use href="#${lineId}" stroke="url(#${stroke})" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="draw"/>
  <circle r="18" fill="url(#${soft})" opacity="0">
    <animate attributeName="opacity" values="0;0.85;0.85;0" keyTimes="0;0.06;0.94;1" dur="7s" begin="0.4s" repeatCount="indefinite"/>
    <animateMotion dur="7s" begin="0.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
      <mpath href="#${lineId}"/>
    </animateMotion>
  </circle>
  <circle r="3.4" fill="#fff7e6" opacity="0">
    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" dur="7s" begin="0.4s" repeatCount="indefinite"/>
    <animateMotion dur="7s" begin="0.4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
      <mpath href="#${lineId}"/>
    </animateMotion>
  </circle>
  ${peakLabel}
  <line x1="${padL}" y1="${bottom}" x2="${W - padR}" y2="${bottom}" stroke="${C.line}" stroke-width="1.2"/>
  ${axis}
  <text x="${W - padR}" y="${H - 9}" text-anchor="end" font-size="10" fill="${C.faint}" opacity="0.75">monthly contributions · longest streak ${fmt(stats.longestStreak)} days · busiest day ${fmt(stats.bestDay.count)}</text>`

  return svgDoc({
    w: W,
    h: H,
    title: `${fmt(stats.total)} GitHub contributions since ${years[0]}`,
    defs,
    css,
    body,
  })
}
