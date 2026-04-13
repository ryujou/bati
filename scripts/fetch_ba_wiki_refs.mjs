import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import characters from '../src/data/characters.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outDir = path.join(repoRoot, '.generated', 'references')
const manifestPath = path.join(outDir, 'manifest.json')
const execFileAsync = promisify(execFile)
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7890'

const wikiTitles = {
  hina: 'Hina',
  iroha: 'Iroha',
  ako: 'Ako',
  aru: 'Aru',
  kayoko: 'Kayoko',
  alice: 'Alice',
  mika: 'Mika',
  mutsuki: 'Mutsuki',
  yuuka: 'Yuuka',
  hifumi: 'Hifumi',
  iori: 'Iori',
  koharu: 'Koharu',
  shiroko: 'Shiroko',
  hoshino: 'Hoshino',
  neru: 'Neru',
  nonomi: 'Nonomi',
}

function ensureAbsoluteUrl(url) {
  if (!url) return ''
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `https://bluearchive.wiki${url}`
}

function extractSection(html, sectionId) {
  const startToken = `id="${sectionId}"`
  const start = html.indexOf(startToken)
  if (start < 0) return ''
  const nextArticle = html.indexOf('<article', start + startToken.length)
  const nextSection = html.indexOf('</article>', start + startToken.length)
  if (nextSection < 0) return html.slice(start)
  return html.slice(start, nextSection)
}

function extractFilePageHref(sectionHtml) {
  const match = sectionHtml.match(/href="([^"]+)" class="mw-file-description"/)
  return match?.[1] ?? ''
}

function extractBestImageUrl(sectionHtml) {
  const srcset = sectionHtml.match(/srcset="([^"]+)"/)?.[1] ?? ''
  const src = sectionHtml.match(/src="([^"]+)"/)?.[1] ?? ''

  const srcsetCandidates = srcset
    .split(',')
    .map((item) => item.trim().split(' ')[0]?.trim())
    .filter(Boolean)

  const best = srcsetCandidates[srcsetCandidates.length - 1] || src
  return ensureAbsoluteUrl(best)
}

async function fetchText(url) {
  const { stdout } = await execFileAsync('curl', [
    '-L',
    '--fail',
    '--silent',
    '--show-error',
    '--proxy',
    proxyUrl,
    '--user-agent',
    'Mozilla/5.0 BATI Reference Fetcher',
    url,
  ], {
    maxBuffer: 64 * 1024 * 1024,
  })

  return stdout
}

async function fetchBinary(url) {
  const { stdout } = await execFileAsync('curl', [
    '-L',
    '--fail',
    '--silent',
    '--show-error',
    '--proxy',
    proxyUrl,
    '--user-agent',
    'Mozilla/5.0 BATI Reference Fetcher',
    url,
  ], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  })

  return new Uint8Array(stdout)
}

async function resolveOriginalFromFilePage(filePageHref) {
  if (!filePageHref) return ''
  const html = await fetchText(ensureAbsoluteUrl(filePageHref))
  const original =
    html.match(/href="(\/\/static[^"]+\.(?:png|jpg|jpeg|webp))" class="internal"/i)?.[1] ??
    html.match(/href="(https?:\/\/[^"]+\.(?:png|jpg|jpeg|webp))" class="internal"/i)?.[1] ??
    ''

  return ensureAbsoluteUrl(original)
}

async function writeReferenceImage(characterId, kind, url) {
  if (!url) return ''
  const ext = path.extname(new URL(url).pathname) || '.png'
  const outPath = path.join(outDir, `${characterId}-${kind}${ext}`)
  const bytes = await fetchBinary(url)
  await fs.writeFile(outPath, bytes)
  return outPath
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })

  const requestedIds = process.argv.slice(2)
  const selected = requestedIds.length
    ? characters.filter((character) => requestedIds.includes(character.id))
    : characters

  const manifest = {}

  for (const character of selected) {
    const wikiTitle = wikiTitles[character.id]
    if (!wikiTitle) {
      console.warn(`Skipping ${character.id}: no wiki title mapping`)
      continue
    }

    const pageUrl = `https://bluearchive.wiki/wiki/${encodeURIComponent(wikiTitle)}`
    console.log(`Fetching ${character.name} from ${pageUrl}`)
    const html = await fetchText(pageUrl)

    const profileSection = extractSection(html, 'tabber-Profile_Image')
    const artworkSection = extractSection(html, 'tabber-Artwork')

    const profileUrl = extractBestImageUrl(profileSection)
    const artworkPreviewUrl = extractBestImageUrl(artworkSection)
    const artworkFilePage = extractFilePageHref(artworkSection)
    const artworkUrl = (await resolveOriginalFromFilePage(artworkFilePage)) || artworkPreviewUrl

    const savedProfile = await writeReferenceImage(character.id, 'profile', profileUrl)
    const savedArtwork = await writeReferenceImage(character.id, 'artwork', artworkUrl)

    manifest[character.id] = {
      id: character.id,
      name: character.name,
      pageUrl,
      profileUrl,
      artworkUrl,
      files: {
        profile: savedProfile,
        artwork: savedArtwork,
      },
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Reference manifest written to ${manifestPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
