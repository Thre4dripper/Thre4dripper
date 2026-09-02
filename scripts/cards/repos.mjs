// repos.svg - most-starred original repos, so the README never carries a
// hand-typed star count that quietly goes stale.

import { C, BASE_CSS, svgDoc, shell, fmt, round, esc } from '../lib/svg.mjs'
import { langColor } from '../lib/palette.mjs'

const COUNT = 8
const COL_W = 545

// Descriptions start with a decorative emoji often enough that stripping them
// keeps every row's text on the same left edge.
const clean = (s) =>
  (s || '')
    .replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()

const truncate = (s, chars) => (s.length > chars ? `${s.slice(0, chars - 1).trimEnd()}…` : s)

export function reposCard({ repos }) {
  const W = 1200
  const top = repos
    .filter((r) => !r.fork && r.description)
    .sort((a, b) => b.stars - a.stars || (a.updated < b.updated ? 1 : -1))
    .slice(0, COUNT)

  const rows = Math.ceil(top.length / 2)
  const rowH = 48
  const startY = 84
  const H = startY + rows * rowH + 34

  const maxStars = Math.max(...top.map((r) => r.stars), 1)
  const chrome = shell({
    w: W,
    h: H,
    title: '~/repos --sort stars',
    accent: C.mint,
    badge: `${fmt(repos.filter((r) => !r.fork).length)} original repos · ${fmt(repos.reduce((n, r) => n + r.stars, 0))} stars`,
  })

  let body = chrome.open
  top.forEach((r, i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = 26 + col * (COL_W + 58)
    const y = startY + row * rowH
    const delay = round(0.2 + i * 0.07, 2)
    const dot = langColor(r.language)
    const desc = truncate(clean(r.description), 74)
    const barW = Math.max(3, (r.stars / maxStars) * 120)

    body += `\n  <g class="fu" style="animation-delay:${delay}s">
    <circle cx="${x + 4}" cy="${y - 4}" r="4" fill="${dot}"/>
    <text x="${x + 16}" y="${y}" font-size="12.5" fill="${C.mint}">${esc(r.name)}</text>
    <text x="${x + COL_W}" y="${y}" text-anchor="end" font-size="12" fill="${C.amber}">★ ${fmt(r.stars)}</text>
    <text x="${x + 16}" y="${y + 16}" font-size="10" fill="${C.faint}">${esc(desc)}</text>
    <rect x="${round(x + COL_W - 190)}" y="${y - 6}" width="120" height="3.5" rx="1.75" fill="${C.line}" opacity="0.55"/>
    <rect x="${round(x + COL_W - 190)}" y="${y - 6}" width="${round(barW)}" height="3.5" rx="1.75" fill="${C.amber}" opacity="0.85"
          class="gw" style="animation-delay:${round(delay + 0.1, 2)}s;transform-origin:${round(x + COL_W - 190)}px ${y - 4.25}px"/>
  </g>`
  })

  body += `\n  <text x="26" y="${H - 14}" font-size="9.5" fill="${C.faint}" opacity="0.8">dot colour is the repository's primary language · refreshed daily from the GitHub API</text>`

  return svgDoc({
    w: W,
    h: H,
    title: `Top repositories: ${top.map((r) => `${r.name} (${r.stars})`).join(', ')}`,
    defs: chrome.defs,
    css: BASE_CSS,
    body,
  })
}
