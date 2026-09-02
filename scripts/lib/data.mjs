// Data layer. Pulls everything the cards render from public sources:
//   - GitHub REST      profile, repos, per-repo language bytes
//   - GitHub HTML      the contribution calendar (no token, no GraphQL scopes)
//   - LeetCode GraphQL solved counts
//   - npm registry     download totals
//
// Every source is wrapped so a single outage degrades one card instead of the
// whole run: the caller keeps the previously committed SVG for anything that
// fails. Responses are cached under scripts/.cache so local iteration doesn't
// burn the 60/hour unauthenticated GitHub budget.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(HERE, '..', '..')
const CACHE = path.join(ROOT, 'scripts', '.cache')

export const USER = process.env.GH_USER || 'Thre4dripper'
export const LEETCODE_USER = process.env.LEETCODE_USER || 'thre4dripper'
export const NPM_PACKAGES = ['node-server-init', 'express-master-controller']
export const FIRST_YEAR = 2021

const UA = 'thre4dripper-profile-cards'
const useCache = process.argv.includes('--cache')

const cachePath = (key) => path.join(CACHE, `${key.replace(/[^\w.-]/g, '_')}.json`)

function readCache(key) {
  try {
    return JSON.parse(fs.readFileSync(cachePath(key), 'utf8'))
  } catch {
    return null
  }
}

function writeCache(key, value) {
  fs.mkdirSync(CACHE, { recursive: true })
  fs.writeFileSync(cachePath(key), JSON.stringify(value))
}

/** Cache-aware fetch. Falls back to a stale cache entry when the network fails. */
async function cached(key, loader) {
  if (useCache) {
    const hit = readCache(key)
    if (hit !== null) return hit
  }
  try {
    const value = await loader()
    writeCache(key, value)
    return value
  } catch (err) {
    const stale = readCache(key)
    if (stale !== null) {
      console.warn(`  ! ${key} failed (${err.message}) - using cached copy`)
      return stale
    }
    throw err
  }
}

async function gh(endpoint) {
  const headers = { 'User-Agent': UA, Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  }
  const res = await fetch(`https://api.github.com${endpoint}`, { headers })
  if (!res.ok) throw new Error(`GitHub ${endpoint} -> ${res.status}`)
  return res.json()
}

export const getUser = () => cached('user', () => gh(`/users/${USER}`))

export const getRepos = () =>
  cached('repos', async () => {
    const all = []
    for (let page = 1; page <= 6; page++) {
      const batch = await gh(`/users/${USER}/repos?per_page=100&page=${page}`)
      all.push(...batch)
      if (batch.length < 100) break
    }
    return all.map((r) => ({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
      fork: r.fork,
      archived: r.archived,
      updated: r.updated_at,
      created: r.created_at,
      topics: r.topics || [],
      homepage: r.homepage,
    }))
  })

/**
 * Language bytes across every original repo, fetched with bounded concurrency.
 * Throws when too many repos failed: a partial tally would silently misreport
 * the split, which is worse than leaving yesterday's card in place.
 */
export async function getLanguageBytes(repos) {
  const names = repos.filter((r) => !r.fork).map((r) => r.name)
  const totals = {}
  const queue = [...names]
  let missed = 0
  const worker = async () => {
    while (queue.length) {
      const name = queue.shift()
      try {
        const bytes = await cached(`lang_${name}`, () =>
          gh(`/repos/${USER}/${name}/languages`),
        )
        for (const [lang, n] of Object.entries(bytes)) {
          totals[lang] = (totals[lang] || 0) + n
        }
      } catch (err) {
        missed++
        console.warn(`  ! languages for ${name}: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  if (missed > names.length * 0.1) {
    throw new Error(`${missed}/${names.length} repos missing language data`)
  }
  return { totals, counted: names.length - missed }
}

/**
 * The contribution calendar, scraped from the public profile fragment. The
 * GraphQL equivalent needs a PAT with extra scopes; this needs nothing, and
 * it's the same data GitHub renders on the profile page.
 */
export async function getContributions(fromYear = FIRST_YEAR, toYear = new Date().getUTCFullYear()) {
  const days = {}
  for (let year = fromYear; year <= toYear; year++) {
    const html = await cached(`contrib_${year}`, async () => {
      const url = `https://github.com/users/${USER}/contributions?from=${year}-01-01&to=${year}-12-31`
      const res = await fetch(url, { headers: { 'User-Agent': UA } })
      if (!res.ok) throw new Error(`contributions ${year} -> ${res.status}`)
      return res.text()
    })

    const dates = {}
    for (const m of html.matchAll(/<td\b[^>]*class="[^"]*ContributionCalendar-day[^"]*"[^>]*>/g)) {
      const tag = m[0]
      const id = /id="([^"]+)"/.exec(tag)?.[1]
      const date = /data-date="(\d{4}-\d{2}-\d{2})"/.exec(tag)?.[1]
      if (id && date) dates[id] = date
    }
    for (const m of html.matchAll(
      /<tool-tip\b[^>]*for="([^"]+)"[^>]*>\s*(No|[\d,]+) contributions?/g,
    )) {
      const date = dates[m[1]]
      if (!date || !date.startsWith(String(year))) continue
      days[date] = m[2] === 'No' ? 0 : Number(m[2].replace(/,/g, ''))
    }
    // Days with zero contributions get a tool-tip too, but be defensive.
    for (const date of Object.values(dates)) {
      if (date.startsWith(String(year)) && days[date] === undefined) days[date] = 0
    }
  }
  return days
}

export const getLeetCode = () =>
  cached('leetcode', async () => {
    const query = `query($u:String!){
      matchedUser(username:$u){
        profile{ranking}
        submitStatsGlobal{acSubmissionNum{difficulty count}}
      }
      allQuestionsCount{difficulty count}
    }`
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': UA,
        Referer: `https://leetcode.com/${LEETCODE_USER}/`,
      },
      body: JSON.stringify({ query, variables: { u: LEETCODE_USER } }),
    })
    if (!res.ok) throw new Error(`LeetCode -> ${res.status}`)
    const json = await res.json()
    if (!json?.data?.matchedUser) throw new Error('LeetCode: no such user')

    const pick = (list, d) => list.find((x) => x.difficulty === d)?.count ?? 0
    const solved = json.data.matchedUser.submitStatsGlobal.acSubmissionNum
    const pool = json.data.allQuestionsCount || []
    return {
      ranking: json.data.matchedUser.profile.ranking,
      total: pick(solved, 'All'),
      easy: pick(solved, 'Easy'),
      medium: pick(solved, 'Medium'),
      hard: pick(solved, 'Hard'),
      poolEasy: pick(pool, 'Easy'),
      poolMedium: pick(pool, 'Medium'),
      poolHard: pick(pool, 'Hard'),
    }
  })

export const getNpm = () =>
  cached('npm', async () => {
    const out = []
    for (const name of NPM_PACKAGES) {
      const [dl, meta] = await Promise.all([
        fetch(`https://api.npmjs.org/downloads/point/last-year/${name}`, {
          headers: { 'User-Agent': UA },
        }).then((r) => r.json()),
        fetch(`https://registry.npmjs.org/${name}`, { headers: { 'User-Agent': UA } }).then(
          (r) => r.json(),
        ),
      ])
      out.push({
        name,
        downloads: dl.downloads || 0,
        version: meta['dist-tags']?.latest || '',
        releases: Object.keys(meta.versions || {}).length,
      })
    }
    return out
  })

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

const iso = (d) => d.toISOString().slice(0, 10)

/** Streaks, activity rate, monthly series - everything the cards chart. */
export function summarise(days, today = new Date()) {
  const cutoff = iso(today)
  const entries = Object.entries(days)
    .filter(([d]) => d <= cutoff)
    .sort(([a], [b]) => (a < b ? -1 : 1))

  const total = entries.reduce((n, [, v]) => n + v, 0)
  const activeDays = entries.filter(([, v]) => v > 0).length

  let longest = 0
  let run = 0
  for (const [, v] of entries) {
    run = v > 0 ? run + 1 : 0
    if (run > longest) longest = run
  }

  // Today counts if it has activity but never breaks the streak if it doesn't.
  let current = 0
  for (let i = entries.length - 1; i >= 0; i--) {
    const [date, v] = entries[i]
    if (v > 0) current++
    else if (date === cutoff) continue
    else break
  }

  const best = entries.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0])

  const byYear = {}
  const byMonth = {}
  const byWeekday = Array(7).fill(0)
  for (const [date, v] of entries) {
    const [y, m] = date.split('-')
    byYear[y] = (byYear[y] || 0) + v
    byMonth[`${y}-${m}`] = (byMonth[`${y}-${m}`] || 0) + v
    byWeekday[new Date(`${date}T00:00:00Z`).getUTCDay()] += v
  }

  const yearAgo = new Date(today)
  yearAgo.setUTCDate(yearAgo.getUTCDate() - 364)
  const lastYear = entries
    .filter(([d]) => d >= iso(yearAgo))
    .reduce((n, [, v]) => n + v, 0)

  return {
    total,
    activeDays,
    trackedDays: entries.length,
    activeRate: entries.length ? activeDays / entries.length : 0,
    currentStreak: current,
    longestStreak: longest,
    bestDay: { date: best[0], count: best[1] },
    lastYear,
    byYear,
    byMonth,
    byWeekday,
    firstDate: entries[0]?.[0],
    lastDate: entries.at(-1)?.[0],
  }
}

/**
 * Contiguous month series, zero-filled. The current month is dropped: it is
 * only partly elapsed, and plotting it makes every chart end in a false cliff.
 */
export function monthlySeries(byMonth, today = new Date()) {
  const partial = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`
  const keys = Object.keys(byMonth).filter((k) => k !== partial).sort()
  if (!keys.length) return []
  const [sy, sm] = keys[0].split('-').map(Number)
  const [ey, em] = keys.at(-1).split('-').map(Number)
  const out = []
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); ) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    out.push({ key, year: y, month: m, value: byMonth[key] || 0 })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}
