// Small SVG toolkit. Everything here has to survive being rendered inside an
// <img> tag on github.com: no scripts, no webfonts, no external refs. CSS
// keyframes and SMIL both run in that context, which is all the motion we need.

import { C, MONO, SANS } from './palette.mjs'

export const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const fmt = (n) => Number(n).toLocaleString('en-US')

export const round = (n, p = 2) => Number(n.toFixed(p))

let uid = 0
export const nextId = (p = 'i') => `${p}${(uid++).toString(36)}`

/**
 * Card chrome: rounded panel, hairline border, faint grid, and a title strip.
 * `accent` tints the corner glow so cards are distinguishable at a glance.
 */
export function shell({ w, h, title, accent = C.amber, badge }) {
  const g = nextId('g')
  const grid = nextId('grid')
  const glow = nextId('glow')
  return {
    defs: `
  <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${C.panel}"/>
    <stop offset="100%" stop-color="${C.sky0}"/>
  </linearGradient>
  <radialGradient id="${glow}" cx="1" cy="0" r="1">
    <stop offset="0%" stop-color="${accent}" stop-opacity="0.13"/>
    <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
  </radialGradient>
  <pattern id="${grid}" width="26" height="26" patternUnits="userSpaceOnUse">
    <path d="M26 0H0V26" fill="none" stroke="${C.lineSoft}" stroke-width="1" opacity="0.42"/>
  </pattern>`,
    open: `
  <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="13" fill="url(#${g})"/>
  <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="13" fill="url(#${grid})"/>
  <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="13" fill="url(#${glow})"/>
  <rect x="0.75" y="0.75" width="${w - 1.5}" height="${h - 1.5}" rx="13" fill="none" stroke="${C.line}" stroke-width="1.5"/>
  ${
    title
      ? `<text x="22" y="31" font-size="12" letter-spacing="1.6" fill="${C.faint}">${esc(title)}</text>
  <circle cx="${w - 26}" cy="27" r="3.4" fill="${accent}">
    <animate attributeName="opacity" values="1;0.25;1" dur="2.6s" repeatCount="indefinite"/>
  </circle>${
    badge
      ? `\n  <text x="${w - 36}" y="31" text-anchor="end" font-size="10.5" letter-spacing="0.8" fill="${C.faint}">${esc(badge)}</text>`
      : ''
  }
  <line x1="22" y1="43" x2="${w - 22}" y2="43" stroke="${C.line}" stroke-width="1" opacity="0.75"/>`
      : ''
  }`,
  }
}

/**
 * Rolling-digit counter. Each digit is a clipped column holding 0-9 plus the
 * target glyph; the column slides up so the number spins into place the way a
 * mechanical odometer does. Pure CSS, so it replays on every page load.
 */
export function odometer({
  x,
  y,
  value,
  size = 30,
  color = C.text,
  delay = 0,
  dur = 1.15,
  mono = true,
}) {
  const chars = String(value).split('')
  const cw = size * (mono ? 0.6 : 0.58)
  const lh = size * 1.12
  const travel = round(10 * lh, 2)
  const kf = nextId('roll')
  const family = mono ? '' : ` font-family="${SANS}"`

  let cx = x
  let body = ''
  chars.forEach((ch, i) => {
    if (!/\d/.test(ch)) {
      const w = ch === ',' ? cw * 0.58 : cw * 0.72
      body += `<text x="${round(cx)}" y="${y}"${family} font-size="${size}" font-weight="700" fill="${color}" opacity="0">${esc(ch)}<animate attributeName="opacity" values="0;1" begin="${delay + dur * 0.75}s" dur="0.3s" fill="freeze"/></text>`
      cx += w
      return
    }
    const clip = nextId('c')
    // 0-9 once, then the target digit: one full rotation, landing on the answer.
    let strip = ''
    for (let k = 0; k < 10; k++) {
      strip += `<text x="0" y="${round(k * lh)}"${family} font-size="${size}" font-weight="700" fill="${color}">${k}</text>`
    }
    strip += `<text x="0" y="${round(10 * lh)}"${family} font-size="${size}" font-weight="700" fill="${color}">${ch}</text>`
    // Right-most digits take fractionally longer, so the number settles L->R.
    const d = round(dur + i * 0.075, 3)
    // Placement lives on the outer <g> as an attribute and the roll lives on the
    // inner one as CSS: a CSS transform replaces the attribute outright, so the
    // two must never share an element.
    body += `<clipPath id="${clip}"><rect x="${round(cx - 1)}" y="${round(y - size * 0.82)}" width="${round(cw + 2)}" height="${round(size * 1.06)}"/></clipPath>
    <g clip-path="url(#${clip})"><g transform="translate(${round(cx)},${y})"><g class="${kf}" style="animation-duration:${d}s;animation-delay:${delay}s">${strip}</g></g></g>`
    cx += cw
  })

  return {
    svg: body,
    width: cx - x,
    css: `@keyframes ${kf}-k{from{transform:translateY(0)}to{transform:translateY(-${travel}px)}}
.${kf}{animation-name:${kf}-k;animation-timing-function:cubic-bezier(.17,.78,.28,1);animation-fill-mode:both}`,
  }
}

/** Catmull-Rom -> cubic bezier, for sparklines that don't look like polygons. */
export function smoothPath(pts) {
  if (pts.length < 2) return ''
  let d = `M${round(pts[0][0])},${round(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${round(c1[0])},${round(c1[1])} ${round(c2[0])},${round(c2[1])} ${round(p2[0])},${round(p2[1])}`
  }
  return d
}

/** Rough path length, good enough to seed a stroke-dasharray draw-on. */
export function pathLength(pts) {
  let L = 0
  for (let i = 1; i < pts.length; i++) {
    L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  }
  return Math.ceil(L * 1.12)
}

/** Reusable keyframes shared by every card. */
export const BASE_CSS = `
.fu{animation:fu .7s cubic-bezier(.2,.7,.3,1) both}
@keyframes fu{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
.fi{animation:fi .8s ease both}
@keyframes fi{from{opacity:0}to{opacity:1}}
.gw{animation:gw 1.05s cubic-bezier(.2,.75,.3,1) both;transform-origin:left center}
@keyframes gw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.pop{animation:pop .55s cubic-bezier(.2,1.3,.4,1) both}
@keyframes pop{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
`

export function svgDoc({ w, h, title, defs = '', css = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${MONO}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>${defs}
</defs>
<style>${css}</style>
${body}
</svg>
`
}

export { C, MONO, SANS }
