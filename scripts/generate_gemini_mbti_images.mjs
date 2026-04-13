import fs from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

import characters from '../src/data/characters.json' with { type: 'json' }
import archetypes from '../src/data/archetypes.json' with { type: 'json' }
import characterVisuals from '../src/data/characterVisuals.json' with { type: 'json' }

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const manifestPath = path.join(repoRoot, '.generated', 'references', 'manifest.json')
const styleManifestPath = path.join(repoRoot, '.generated', 'mbti-style-refs', 'manifest.json')
const stylePrimaryRefPath = path.join(repoRoot, 'public', 'images', 'characters', 'hina.jpg')
const styleSecondaryRefPath = path.join(repoRoot, 'public', 'images', 'characters', 'aru.jpg')
const outDir = path.join(repoRoot, 'public', 'images', 'characters')
const visualsPath = path.join(repoRoot, 'src', 'data', 'characterVisuals.json')
const tempDir = path.join(repoRoot, '.generated', 'gemini-requests')

const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3-pro-image-preview'
const execFileAsync = promisify(execFile)
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7890'
const characterPromptOverrides = {
  kayoko: {
    extraInstructions: [
      'Character-specific lock: this character must not have any demon wing, bat wing, tail, or tail-like appendage in the final image.',
      'Character-specific lock: keep the horn-like hair accessories, halo, split black-and-white hairstyle, hoodie, skirt, stockings, shoes, and handgun, but omit any demon wing, bat wing, tail, or tail-like appendage even if a reference image suggests one.',
    ],
  },
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function fileToInlineData(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const mimeType =
    ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : 'image/png'

  return fs.readFile(filePath).then((buffer) => ({
    inlineData: {
      mimeType,
      data: buffer.toString('base64'),
    },
  }))
}

function extensionForMimeType(mimeType) {
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/webp') return '.webp'
  return '.png'
}

function buildPrompt(character, archetype) {
  const overrides = characterPromptOverrides[character.id]

  return [
    'Use case: stylized-concept',
    'Asset type: personality test result illustration',
    `Primary request: redesign ${character.name} from Blue Archive in the mixed visual language used by this project's low-poly MBTI character style, keeping more anime appeal than pure official 16Personalities art while preserving the faceted low-poly MBTI look.`,
    `Input images: images 1-2 are local project style references and are the strongest style guide; images 3-4 are official 16Personalities references and should only guide geometric props, set dressing, and blocky composition; images 5-6 are Blue Archive identity references for ${character.name} and must dominate the character design.`,
    `Subject: ${character.name}, one character only, recognizable as the same Blue Archive student.`,
    'Style priority: first match the local project references for overall character appeal, proportions, face simplification, and anime influence; second match the official 16Personalities references for faceted geometry, prop design, and simple spatial staging.',
    'Style/medium: anime-informed low-poly character illustration, faceted geometric construction, angular planar forms, hard-edged cel shading, clean vector-like finish, light pastel background, very little line-art, no painterly brushwork.',
    'Character proportions: keep a youthful stylized anime proportion similar to the local project references, with a slightly larger head and slimmer schoolgirl body, around 4.5 to 5.5 heads tall, not realistic adult proportions and not ultra-chibi.',
    'Face construction: use a cute simplified anime-inspired face similar to the local project references, with small black oval or bean-shaped eyes, a tiny nose, a tiny mouth, soft feminine facial balance, and faceted cheeks. Keep the face youthful and girlish, not square-jawed, not adult-masculine, and not pure official 16Personalities adult-face geometry.',
    'Blue Archive identity lock: preserve the original character much more faithfully than before. Keep the same silhouette, same hairstyle, same bang structure, same hair length, same hair color, same eye color, same facial mood, same halo shape, same horn or ear shape, same coat and uniform structure, same signature weapon type, and the same key accessories from the Blue Archive references.',
    'Reference obedience rule: only include anatomy, appendages, accessories, and costume parts that are clearly present in the Blue Archive reference images. If a tail, animal ears, extra horns, wings, floating ornaments, ribbons, bags, mechanical parts, or other feature is not visible in the references, do not invent it.',
    'No invention rule: do not add any new traits to make the design feel richer. Accuracy is more important than variety. It is better to simplify a real feature than to hallucinate a new one.',
    'Hair and clothing treatment: rebuild the bangs, hair masses, coat edges, skirt folds, sleeves, weapon, and any reference-confirmed wings or cape shapes with low-poly anime planes and visible angular corners, but do not redesign or replace the original Blue Archive costume language.',
    'Composition/framing: portrait 3:4, full body visible including feet, one prominent character occupying most of the frame, standing or slightly dynamic pose, a few symbolic geometric props, clean light background.',
    'Environment language: borrow geometric panels, pedestals, wedges, and simplified hard-surface objects from the official 16Personalities references, but keep the character presentation closer to the local project illustrations.',
    'Character fidelity requirements: if a viewer who knows Blue Archive sees the final image, they should instantly identify the exact student without reading any label. Preserve the Blue Archive design first, then translate it into the project low-poly style.',
    `Narrative mood: ${archetype.name} / ${archetype.subtitle}.`,
    `Personality cues: ${character.tags.join('、')}.`,
    `Short role cue: ${character.title}.`,
    ...(overrides?.extraInstructions ?? []),
    'Important priority: the final image must feel clearly closer to the local project reference art than to pure official 16Personalities art, while still keeping the faceted MBTI geometry.',
    'Avoid: altering the character into a different person, changing the hairstyle dramatically, changing the halo design, swapping outfit parts, inventing new accessories, inventing new anatomy, adding a tail that does not exist in the references, adding animal ears that do not exist in the references, adding extra horns, adding wings that do not exist in the references, realistic adult face proportions, pure official 16Personalities square adult faces, pure chibi mascot proportions, soft anime poster shading, glossy eyes, long eyelashes, fluffy textures, airbrushed gradients, photorealism, extra characters, text, logo, watermark.',
    'If the character reference includes large weapons, simplify them into one iconic angular prop unless keeping more detail is necessary for recognizability.',
  ].join('\n')
}

async function generateImageForCharacter(characterId, manifest, styleManifest) {
  const character = characters.find((item) => item.id === characterId)
  if (!character) {
    throw new Error(`Unknown character id: ${characterId}`)
  }

  const archetype = archetypes.find((item) => item.id === character.archetypeId)
  if (!archetype) {
    throw new Error(`Missing archetype for ${characterId}`)
  }

  const references = manifest[characterId]
  if (!references?.files?.artwork && !references?.files?.profile) {
    throw new Error(`No references found for ${characterId}. Run fetch_ba_wiki_refs.mjs first.`)
  }

  const styleReferences = styleManifest[character.matchCode]
  if (!styleReferences?.files?.header && !styleReferences?.files?.socialFocus && !styleReferences?.files?.social) {
    throw new Error(`No official 16Personalities style references found for ${character.matchCode}. Run fetch_16p_style_refs.mjs first.`)
  }

  const parts = [{ text: buildPrompt(character, archetype) }]
  parts.push(await fileToInlineData(stylePrimaryRefPath))
  parts.push(await fileToInlineData(styleSecondaryRefPath))
  if (styleReferences.files.socialFocus) {
    parts.push(await fileToInlineData(styleReferences.files.socialFocus))
  }
  if (styleReferences.files.header) {
    parts.push(await fileToInlineData(styleReferences.files.header))
  }
  else if (styleReferences.files.social) {
    parts.push(await fileToInlineData(styleReferences.files.social))
  }
  if (references.files.artwork) {
    parts.push(await fileToInlineData(references.files.artwork))
  }
  if (references.files.profile) {
    parts.push(await fileToInlineData(references.files.profile))
  }

  const payload = JSON.stringify({
    contents: [
      {
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        aspectRatio: '3:4',
        imageSize: '2K',
      },
    },
  })

  await fs.mkdir(tempDir, { recursive: true })
  const payloadPath = path.join(tempDir, `${characterId}.json`)
  await fs.writeFile(payloadPath, payload)

  const { stdout, stderr } = await execFileAsync(
    'curl',
    [
      '-sS',
      '-L',
      '--connect-timeout',
      '20',
      '--max-time',
      '240',
      '--proxy',
      proxyUrl,
      '-X',
      'POST',
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      '-H',
      `x-goog-api-key: ${apiKey}`,
      '-H',
      'Content-Type: application/json',
      '--data-binary',
      `@${payloadPath}`,
    ],
    {
      maxBuffer: 128 * 1024 * 1024,
    },
  )

  const json = JSON.parse(stdout || '{}')
  if (stderr || json.error) {
    throw new Error(`Gemini API error for ${character.name}: ${stderr || JSON.stringify(json)}`)
  }

  const contentParts = json?.candidates?.[0]?.content?.parts ?? []
  const imagePart = contentParts.find((part) => part.inlineData?.data)
  const textPart = contentParts.find((part) => part.text)?.text ?? ''

  if (!imagePart?.inlineData?.data) {
    throw new Error(`No image returned for ${character.name}: ${JSON.stringify(json)}`)
  }

  const mimeType = imagePart.inlineData.mimeType || 'image/png'
  const ext = extensionForMimeType(mimeType)
  const outFile = path.join(outDir, `${characterId}${ext}`)
  await fs.mkdir(outDir, { recursive: true })
  await fs.writeFile(outFile, Buffer.from(imagePart.inlineData.data, 'base64'))

  return {
    outFile,
    publicPath: `/images/characters/${characterId}${ext}`,
    model,
    note: textPart,
  }
}

async function main() {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
  const styleManifest = JSON.parse(await fs.readFile(styleManifestPath, 'utf8'))
  const requestedIds = process.argv.slice(2)
  const selectedIds = requestedIds.length ? requestedIds : characters.map((item) => item.id)

  const nextVisuals = structuredClone(characterVisuals)

  for (const characterId of selectedIds) {
    const character = characters.find((item) => item.id === characterId)
    if (!character) {
      console.warn(`Skipping unknown id: ${characterId}`)
      continue
    }

    console.log(`Generating MBTI-style image for ${character.name} (${character.id}) with ${model}`)
    const result = await generateImageForCharacter(characterId, manifest, styleManifest)
    nextVisuals[characterId] = {
      ...(nextVisuals[characterId] ?? {}),
      image: result.publicPath,
      accent: nextVisuals[characterId]?.accent ?? '#4aa3ff',
    }

    if (result.note) {
      console.log(`Model note for ${character.name}: ${result.note}`)
    }

    // Small delay to avoid slamming the API in batch mode.
    await sleep(1200)
  }

  await fs.writeFile(visualsPath, JSON.stringify(nextVisuals, null, 2) + '\n')
  console.log(`Updated character visuals in ${visualsPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
