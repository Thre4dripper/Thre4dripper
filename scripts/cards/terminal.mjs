// terminal.svg - a typing terminal whose output is regenerated from live data,
// so the numbers it prints are never stale.

import { C, MONO, svgDoc, fmt, round, esc, nextId } from '../lib/svg.mjs'

const FS = 12.5
const CW = FS * 0.6 // monospace advance width
const PITCH = 24
const TOP = 60
const PAD = 18

const TYPE = 0.055 // seconds per character while a command is typed
const PRINT = 0.011 // seconds per character while output is printed
const PAUSE_CMD = 0.38 // beat before a command starts
const PAUSE_OUT = 0.14 // beat before its output appears
const HOLD = 3.2 // rest at the end before looping

export function terminalCard({ stats, repos, user }) {
  const stars = repos.reduce((n, r) => n + r.stars, 0)
  const lines = [
    { cmd: 'whoami', out: 'ijlal ahmad — full stack & ai engineer' },
    { cmd: 'cat now.txt', out: 'building an ai-native platform @ gus global' },
    {
      cmd: 'gh contrib --since 2021',
      out: `${fmt(stats.total)} contributions · ${fmt(stats.currentStreak)}-day streak`,
    },
    {
      cmd: 'ls ~/side-quests',
      out: 'infinity-castle/  boardy/  tidefetch/  homelab/',
    },
    {
      cmd: 'uptime',
      out: `${user.public_repos} repos, ${fmt(stars)} stars, sleep schedule unknown`,
    },
  ]

  // Lay the whole session out on one timeline first, then express each line's
  // window as a fraction of it.
  const steps = []
  let t = 0
  lines.forEach((line) => {
    t += PAUSE_CMD
    steps.push({ text: `$ ${line.cmd}`, start: t, per: TYPE, prompt: true, cursor: true })
    t += line.cmd.length * TYPE + 2 * TYPE
    t += PAUSE_OUT
    steps.push({ text: line.out, start: t, per: PRINT, prompt: false, cursor: false })
    t += line.out.length * PRINT
  })
  const restAt = t
  const T = t + HOLD

  const W = 480
  const H = TOP + (steps.length - 1) * PITCH + 34

  let body = ''
  steps.forEach((step, i) => {
    const y = TOP + i * PITCH
    const chars = step.text.length
    const clip = nextId('t')

    // Discrete width steps = one character revealed per tick.
    const values = []
    const keyTimes = []
    values.push('0')
    keyTimes.push('0')
    for (let k = 0; k <= chars; k++) {
      values.push(round(k * CW, 2))
      keyTimes.push(round(Math.min(1, (step.start + k * step.per) / T), 5))
    }
    const anim = `<animate attributeName="width" values="${values.join(';')}" keyTimes="${keyTimes.join(';')}" calcMode="discrete" dur="${round(T, 2)}s" repeatCount="indefinite"/>`

    const textX = PAD
    const label = step.prompt
      ? `<text x="${textX}" y="${y}" fill="${C.mint}">$</text><text x="${round(textX + 2 * CW)}" y="${y}" fill="${C.text}">${esc(step.text.slice(2))}</text>`
      : `<text x="${textX}" y="${y}" fill="${C.dim}">${esc(step.text)}</text>`

    body += `\n<clipPath id="${clip}"><rect x="${PAD}" y="${y - 12}" height="18" width="0">${anim}</rect></clipPath>
<g clip-path="url(#${clip})" font-size="${FS}" xml:space="preserve">${label}</g>`

    if (step.cursor) {
      const cvals = []
      const ckeys = []
      cvals.push(String(PAD))
      ckeys.push('0')
      for (let k = 0; k <= chars; k++) {
        cvals.push(round(PAD + k * CW, 2))
        ckeys.push(round(Math.min(1, (step.start + k * step.per) / T), 5))
      }
      const on = round(step.start / T, 5)
      const off = round(Math.min(1, (step.start + (chars + 1) * step.per) / T), 5)
      body += `\n<g opacity="0">
  <animate attributeName="opacity" values="0;1;0;0" keyTimes="0;${on};${off};1" calcMode="discrete" dur="${round(T, 2)}s" repeatCount="indefinite"/>
  <rect x="${PAD}" y="${y - 11}" width="${round(CW, 2)}" height="14" fill="${C.amber}" opacity="0.85">
    <animate attributeName="x" values="${cvals.join(';')}" keyTimes="${ckeys.join(';')}" calcMode="discrete" dur="${round(T, 2)}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.9;0.9;0.15;0.15;0.9" dur="1.05s" repeatCount="indefinite"/>
  </rect>
</g>`
    }
  })

  // Resting cursor on a fresh prompt line once the session finishes.
  const restY = TOP + steps.length * PITCH - 4
  const restOn = round(restAt / T, 5)
  body += `\n<g opacity="0">
  <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;${restOn};${round(Math.min(1, restOn + 0.01), 5)};1" dur="${round(T, 2)}s" repeatCount="indefinite"/>
  <text x="${PAD}" y="${restY}" font-size="${FS}" fill="${C.mint}">$</text>
  <rect x="${round(PAD + 2 * CW, 2)}" y="${restY - 11}" width="${round(CW, 2)}" height="14" fill="${C.amber}">
    <animate attributeName="opacity" values="0.9;0.9;0.15;0.15;0.9" dur="1.05s" repeatCount="indefinite"/>
  </rect>
</g>`

  const bg = nextId('tbg')
  const defs = `
  <linearGradient id="${bg}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${C.panel}"/>
    <stop offset="100%" stop-color="${C.sky0}"/>
  </linearGradient>`

  const chrome = `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12" fill="url(#${bg})" stroke="${C.line}" stroke-width="1.5"/>
<path d="M1,13 A12,12 0 0 1 13,1 L${W - 13},1 A12,12 0 0 1 ${W - 1},13 L${W - 1},40 L1,40 Z" fill="${C.panelTop}"/>
<line x1="1" y1="40" x2="${W - 1}" y2="40" stroke="${C.line}" stroke-width="1.2"/>
<circle cx="22" cy="20.5" r="5.5" fill="#ff5f57"/>
<circle cx="40" cy="20.5" r="5.5" fill="#febc2e"/>
<circle cx="58" cy="20.5" r="5.5" fill="#28c840"/>
<text x="${W / 2}" y="25" text-anchor="middle" font-size="11.5" fill="${C.faint}">ijlal@homelab: ~</text>`

  return svgDoc({
    w: W,
    h: H,
    title: 'terminal session: whoami',
    defs,
    css: '',
    body: chrome + body,
  })
}
