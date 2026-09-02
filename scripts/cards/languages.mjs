// languages.svg - real byte counts across every original repo, not a guess
// from each repo's single "primary language" field.

import {
  C,
  MONO,
  BASE_CSS,
  svgDoc,
  shell,
  fmt,
  round,
  esc,
  nextId,
} from '../lib/svg.mjs'
import { langColor } from '../lib/palette.mjs'

const TOP = 8

export function languagesCard({ bytes, repoCount }) {
  const W = 500
  const H = 316
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1
  const sorted = Object.entries(bytes).sort((a, b) => b[1] - a[1])
  const top = sorted.slice(0, TOP)
  const restSum = sorted.slice(TOP).reduce((a, b) => a + b[1], 0)
  const rows = restSum > 0 ? [...top, ['Other', restSum]] : top

  const chrome = shell({ w: W, h: H, title: '~/languages --by-bytes', accent: C.violet })
  const clip = nextId('bar')
  let css = BASE_CSS
  let body = chrome.open

  // Stacked bar across the full card width.
  const barX = 26
  const barW = W - 52
  const barY = 62
  const barH = 22
  const r = nextId('round')
  let segs = ''
  let cursor = barX
  rows.forEach(([name, n], i) => {
    const w = (n / total) * barW
    segs += `<rect x="${round(cursor)}" y="${barY}" width="${round(Math.max(w, 0.6))}" height="${barH}" fill="${langColor(name)}" opacity="0">
      <animate attributeName="opacity" values="0;1" begin="${round(0.25 + i * 0.06, 2)}s" dur="0.45s" fill="freeze"/>
    </rect>`
    cursor += w
  })

  // Legend, two columns; each row carries its own share bar.
  const maxShare = rows[0][1] / total
  const colW = 212
  let legend = ''
  rows.forEach(([name, n], i) => {
    const share = n / total
    const col = i < 5 ? 0 : 1
    const row = i < 5 ? i : i - 5
    const x = 26 + col * (colW + 24)
    const y = 122 + row * 33
    const fillW = Math.max(2, (share / maxShare) * colW)
    const color = name === 'Other' ? C.faint : langColor(name)
    legend += `<g class="fu" style="animation-delay:${round(0.4 + i * 0.07, 2)}s">
      <circle cx="${x + 4}" cy="${y - 4}" r="4" fill="${color}"/>
      <text x="${x + 15}" y="${y}" font-size="11.5" fill="${C.text}">${esc(name)}</text>
      <text x="${x + colW}" y="${y}" text-anchor="end" font-size="11" fill="${C.dim}">${(share * 100).toFixed(1)}%</text>
      <rect x="${x}" y="${y + 6}" width="${colW}" height="3.5" rx="1.75" fill="${C.line}" opacity="0.6"/>
      <rect x="${x}" y="${y + 6}" width="${round(fillW)}" height="3.5" rx="1.75" fill="${color}" opacity="0.9"
            class="gw" style="animation-delay:${round(0.5 + i * 0.07, 2)}s;transform-origin:${x}px ${y + 8}px"/>
    </g>`
  })

  const mb = (total / 1e6).toFixed(1)
  body += `\n  <clipPath id="${clip}"><rect x="${barX}" y="${barY}" width="0" height="${barH}" rx="6">
    <animate attributeName="width" values="0;${barW}" dur="1.25s" begin="0.2s" fill="freeze"
             keyTimes="0;1" keySplines="0.2 0.75 0.25 1" calcMode="spline"/>
  </rect></clipPath>
  <rect x="${barX}" y="${barY}" width="${barW}" height="${barH}" rx="6" fill="${C.line}" opacity="0.45"/>
  <g clip-path="url(#${clip})">${segs}</g>
  <text x="${barX}" y="${barY + 38}" font-size="9.5" letter-spacing="1" fill="${C.faint}">${esc(mb)} MB OF SOURCE ACROSS ${repoCount} REPOSITORIES</text>
  ${legend}
  <text x="${barX}" y="${H - 18}" font-size="9" fill="${C.faint}" opacity="0.8">counted from the GitHub languages API, every original repo, weighted by bytes</text>`

  return svgDoc({
    w: W,
    h: H,
    title: `Language breakdown: ${rows.map(([k, v]) => `${k} ${((v / total) * 100).toFixed(0)}%`).join(', ')}`,
    defs: chrome.defs,
    css,
    body,
  })
}
