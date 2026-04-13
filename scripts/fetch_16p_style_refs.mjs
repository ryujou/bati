import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import characters from '../src/data/characters.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const outDir = path.join(repoRoot, '.generated', 'mbti-style-refs')
const manifestPath = path.join(outDir, 'manifest.json')
const execFileAsync = promisify(execFile)
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7890'

function lowerCode(code) {
  return code.trim().toLowerCase()
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
    'Mozilla/5.0 BATI MBTI Style Fetcher',
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
    'Mozilla/5.0 BATI MBTI Style Fetcher',
    url,
  ], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  })

  return new Uint8Array(stdout)
}

function extractMatch(html, pattern) {
  return html.match(pattern)?.[1] ?? ''
}

function resolveIntroUrl(html) {
  const raw =
    extractMatch(html, /"animation":\{"src":"(https:\\\/\\\/[^"]+?\.svg)"/) ||
    extractMatch(html, /src="(https:\/\/[^"]+\/type-descriptions\/introductions\/[^"]+?\.svg(?:\?v=\d+)?)"/) ||
    ''

  return raw.replaceAll('\\/', '/')
}

function resolveHeaderUrl(html) {
  const raw =
    extractMatch(html, /"tablet":"(https:\\\/\\\/[^"]+?\/headers\/[^"]+?\.svg)"/) ||
    extractMatch(html, /srcset="(https:\/\/[^"]+?\/headers\/[^"]+?-desktop1\.svg)"/) ||
    extractMatch(html, /href="(https:\/\/[^"]+?\/headers\/[^"]+?-desktop1\.svg)"/) ||
    ''

  return raw.replaceAll('\\/', '/')
}

function resolveSocialUrl(html) {
  return (
    extractMatch(html, /<meta property="og:image" content="(https:\/\/[^"]+)"/) ||
    extractMatch(html, /<meta name="twitter:image" content="(https:\/\/[^"]+)"/) ||
    ''
  )
}

async function writeFileFromUrl(url, outPath) {
  if (!url) return ''
  const bytes = await fetchBinary(url)
  await fs.writeFile(outPath, bytes)
  return outPath
}

async function renderSvgToPng(inputPath, outputPath, width) {
  const args = ['-background', 'white', inputPath]
  if (width) {
    args.push('-resize', `${width}x`)
  }
  args.push(outputPath)

  await execFileAsync('convert', args, {
    maxBuffer: 64 * 1024 * 1024,
  })
}

async function resizePng(inputPath, outputPath, width) {
  await execFileAsync('convert', [
    inputPath,
    '-resize',
    `${width}x`,
    outputPath,
  ], {
    maxBuffer: 64 * 1024 * 1024,
  })
}

async function cropCenterPng(inputPath, outputPath, cropWidthPercent) {
  await execFileAsync('convert', [
    inputPath,
    '-gravity',
    'center',
    '-crop',
    `${cropWidthPercent}%x100%+0+0`,
    '+repage',
    outputPath,
  ], {
    maxBuffer: 64 * 1024 * 1024,
  })
}

async function main() {
  await fs.mkdir(outDir, { recursive: true })

  const requestedCodes = process.argv.slice(2).map((code) => code.toUpperCase())
  const knownCodes = [...new Set(characters.map((item) => item.matchCode))]
  const selectedCodes = requestedCodes.length
    ? knownCodes.filter((code) => requestedCodes.includes(code))
    : knownCodes

  const manifest = {}

  for (const code of selectedCodes) {
    const pageUrl = `https://www.16personalities.com/${lowerCode(code)}-personality`
    console.log(`Fetching official 16Personalities references for ${code} from ${pageUrl}`)
    const html = await fetchText(pageUrl)

    const introUrl = resolveIntroUrl(html)
    const headerUrl = resolveHeaderUrl(html)
    const socialUrl = resolveSocialUrl(html)

    if (!headerUrl && !socialUrl && !introUrl) {
      throw new Error(`No 16Personalities references found for ${code} on ${pageUrl}`)
    }

    const baseName = lowerCode(code)
    const introSvgPath = introUrl ? path.join(outDir, `${baseName}-intro.svg`) : ''
    const headerSvgPath = headerUrl ? path.join(outDir, `${baseName}-header.svg`) : ''
    const socialRawPath = socialUrl ? path.join(outDir, `${baseName}-social-raw.png`) : ''
    const introPngPath = introUrl ? path.join(outDir, `${baseName}-intro.png`) : ''
    const headerPngPath = headerUrl ? path.join(outDir, `${baseName}-header.png`) : ''
    const socialPngPath = socialUrl ? path.join(outDir, `${baseName}-social.png`) : ''
    const socialFocusPath = socialUrl ? path.join(outDir, `${baseName}-social-focus.png`) : ''

    if (introUrl) {
      await writeFileFromUrl(introUrl, introSvgPath)
      await renderSvgToPng(introSvgPath, introPngPath, 1200)
    }

    if (headerUrl) {
      await writeFileFromUrl(headerUrl, headerSvgPath)
      await renderSvgToPng(headerSvgPath, headerPngPath, 1400)
    }

    if (socialUrl) {
      await writeFileFromUrl(socialUrl, socialRawPath)
      await resizePng(socialRawPath, socialPngPath, 1600)
      await cropCenterPng(socialPngPath, socialFocusPath, 48)
    }

    manifest[code] = {
      code,
      pageUrl,
      introUrl,
      headerUrl,
      socialUrl,
      files: {
        introSvg: introSvgPath,
        intro: introPngPath,
        headerSvg: headerSvgPath,
        header: headerPngPath,
        socialRaw: socialRawPath,
        social: socialPngPath,
        socialFocus: socialFocusPath,
      },
    }
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`Style reference manifest written to ${manifestPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
