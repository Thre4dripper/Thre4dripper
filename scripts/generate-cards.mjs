#!/usr/bin/env node
// Regenerates every SVG card in assets/ from live data.
//
//   node scripts/generate-cards.mjs            fetch fresh, write assets/
//   node scripts/generate-cards.mjs --cache    reuse scripts/.cache (offline)
//
// A card only gets rewritten when its data actually arrived, so one flaky
// upstream leaves the previously committed SVG in place rather than blanking
// the profile.

import fs from 'node:fs'
import path from 'node:path'

import {
  ROOT,
  getUser,
  getRepos,
  getLanguageBytes,
  getContributions,
  getLeetCode,
  getNpm,
  summarise,
  monthlySeries,
} from './lib/data.mjs'
import { journeyCard } from './cards/journey.mjs'
import { statsCard } from './cards/stats.mjs'
import { languagesCard } from './cards/languages.mjs'
import { elsewhereCard } from './cards/elsewhere.mjs'
import { reposCard } from './cards/repos.mjs'
import { terminalCard } from './cards/terminal.mjs'

const ASSETS = path.join(ROOT, 'assets')

function write(name, svg) {
  fs.mkdirSync(ASSETS, { recursive: true })
  const file = path.join(ASSETS, name)
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null
  fs.writeFileSync(file, svg)
  const kb = (Buffer.byteLength(svg) / 1024).toFixed(1)
  console.log(`  ${before === svg ? '=' : '+'} assets/${name}  (${kb} kB)`)
}

/** Build one card; never let a single failure abort the run. */
async function card(name, build) {
  try {
    write(name, await build())
    return true
  } catch (err) {
    console.error(`  ! assets/${name} skipped: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('fetching...')
  // A fresh CI checkout has no cache to fall back on, so treat the profile
  // endpoints as fallible too and render whatever the other sources allow.
  let user = null
  let repos = null
  try {
    ;[user, repos] = await Promise.all([getUser(), getRepos()])
    console.log(`  github: ${user.public_repos} public repos, ${user.followers} followers`)
  } catch (err) {
    console.warn(`  ! github profile unavailable: ${err.message}`)
  }

  const settled = await Promise.allSettled([
    getContributions(),
    repos ? getLanguageBytes(repos) : Promise.reject(new Error('no repo list')),
    getLeetCode(),
    getNpm(),
  ])
  const [days, bytes, leetcode, npm] = settled.map((s) =>
    s.status === 'fulfilled' ? s.value : null,
  )
  settled.forEach((s, i) => {
    if (s.status === 'rejected') {
      console.warn(`  ! source ${['contributions', 'languages', 'leetcode', 'npm'][i]} failed: ${s.reason.message}`)
    }
  })

  const stats = days ? summarise(days) : null
  if (stats) {
    console.log(
      `  contributions: ${stats.total} total, ${stats.currentStreak}-day streak, ${stats.activeDays} active days`,
    )
  }

  console.log('rendering...')
  const ok = []
  if (repos) ok.push(await card('repos.svg', () => reposCard({ repos })))
  if (stats) {
    ok.push(await card('journey.svg', () => journeyCard({ months: monthlySeries(stats.byMonth), stats })))
    if (user && repos) {
      ok.push(await card('stats.svg', () => statsCard({ user, repos, stats })))
      ok.push(await card('terminal.svg', () => terminalCard({ stats, repos, user })))
    }
  }
  if (bytes && Object.keys(bytes.totals).length) {
    ok.push(
      await card('languages.svg', () =>
        languagesCard({ bytes: bytes.totals, repoCount: bytes.counted }),
      ),
    )
  }
  if (leetcode && npm) {
    ok.push(await card('elsewhere.svg', () => elsewhereCard({ leetcode, npm })))
  }

  const failed = ok.filter((x) => !x).length
  console.log(`done - ${ok.length - failed}/${ok.length} cards written`)
  if (!ok.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
