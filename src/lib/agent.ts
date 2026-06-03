import Anthropic from '@anthropic-ai/sdk'
import type { Block, JobSettings } from '@/db/schema'

const client = new Anthropic()

export interface CityInfo {
  id: string; name: string; slug: string
  region: string; federalDistrict: string; population?: number
}

// ─── Adapt a template's blocks for a specific city ───────────────────────────
export async function adaptTemplateForCity(
  blocks: Block[],
  city: CityInfo,
  mode: JobSettings['mode'] = 'adapt',
): Promise<{ blocks: Block[]; metaTitle: string; metaDescription: string }> {

  if (mode === 'variables_only') {
    return {
      blocks: substituteVars(blocks, city),
      metaTitle:       `Печать на стенах в ${city.name} — заказать от 2 900 ₽/м²`,
      metaDescription: `Профессиональная печать на стенах в ${city.name}. Любое изображение на стену, потолок, пол. Готово за 1 день. Звоните!`,
    }
  }

  const textBlocks = blocks.filter(b => ['heading','text','review','cta'].includes(b.type))
  const textContent = textBlocks.map(b => `[${b.type}]: ${b.content || ''}`).join('\n')

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 2048,
    system: `Ты — SEO-копирайтер. Адаптируешь тексты статьи о печати на стенах под конкретный город.
Правила: упоминай город естественно, подбирай цены под регион, добавляй 1-2 локальных факта.
Верни ТОЛЬКО валидный JSON без обёртки.`,
    messages: [{
      role: 'user',
      content: `Адаптируй тексты для города ${city.name} (${city.region}, ${city.federalDistrict}).
${city.population ? `Население: ${city.population.toLocaleString('ru')} чел.` : ''}

Исходные блоки:
${textContent}

Верни JSON:
{
  "blocks": [{"type":"...","content":"адаптированный текст"}],
  "metaTitle": "до 60 символов",
  "metaDescription": "до 160 символов"
}`,
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(clean)

  // Merge adapted text back into original blocks (preserving structure/style)
  const adaptedMap = new Map(parsed.blocks.map((b: Block) => [b.type + '_idx', b.content]))
  let textIdx = 0
  const mergedBlocks = blocks.map(block => {
    if (['heading','text','review','cta'].includes(block.type)) {
      const adapted = parsed.blocks[textIdx++]
      return adapted ? { ...block, content: adapted.content } : block
    }
    return block
  })

  return {
    blocks: mergedBlocks,
    metaTitle: parsed.metaTitle,
    metaDescription: parsed.metaDescription,
  }
}

// ─── Full article generation from scratch ────────────────────────────────────
export async function generateFullArticle(city: CityInfo): Promise<{
  blocks: Block[]; metaTitle: string; metaDescription: string
}> {
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: `Ты — SEO-копирайтер по теме "печать на стенах вертикальным принтером".
Компания наносит фотопечать на стены, потолки, полы. Стоимость от 2 900 ₽/м².
Пиши профессионально, структурировано. Верни ТОЛЬКО JSON.`,
    messages: [{
      role: 'user',
      content: `Напиши SEO-статью о печати на стенах для города ${city.name} (${city.region}).
${city.population ? `Население: ${city.population.toLocaleString('ru')} чел.` : ''}

Верни JSON со структурой блоков:
{
  "metaTitle": "до 60 символов",
  "metaDescription": "до 160 символов",
  "blocks": [
    {"type":"heading","content":"H1 заголовок"},
    {"type":"text","content":"вводный абзац 3-4 предложения"},
    {"type":"heading","content":"H2 подзаголовок"},
    {"type":"text","content":"абзац о технологии"},
    {"type":"price","items":[{"name":"Стена","value":"от X ₽/м²"},{"name":"Потолок","value":"от Y ₽/м²"}]},
    {"type":"text","content":"абзац об особенностях города"},
    {"type":"cta","content":"Текст кнопки-заявки"}
  ]
}`,
    }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}

// ─── Streaming version for real-time editor preview ──────────────────────────
export async function* streamArticle(city: CityInfo): AsyncGenerator<string> {
  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 3000,
    system: 'Ты SEO-копирайтер по печати на стенах. Пиши в markdown.',
    messages: [{
      role: 'user',
      content: `Напиши подробную SEO-статью о печати на стенах вертикальным принтером в ${city.name} (${city.region}). 800-1000 слов.`,
    }],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      yield chunk.delta.text
    }
  }
}

// ─── Batch job runner ────────────────────────────────────────────────────────
export interface AgentCallbacks {
  onStart?:  (total: number) => void
  onCity?:   (city: CityInfo, done: number) => void
  onDone?:   (city: CityInfo, result: Awaited<ReturnType<typeof adaptTemplateForCity>>) => void
  onError?:  (city: CityInfo, err: Error) => void
  onFinish?: (done: number, failed: number) => void
}

export async function runBatchJob(
  templateBlocks: Block[],
  cities: CityInfo[],
  settings: JobSettings,
  callbacks: AgentCallbacks,
  save: (city: CityInfo, result: Awaited<ReturnType<typeof adaptTemplateForCity>>) => Promise<void>,
  isPaused: () => Promise<boolean>,
) {
  let done = 0, failed = 0
  callbacks.onStart?.(cities.length)

  for (let i = 0; i < cities.length; i += settings.batchSize) {
    const batch = cities.slice(i, i + settings.batchSize)
    for (const city of batch) {
      while (await isPaused()) await sleep(3000)
      callbacks.onCity?.(city, done)
      try {
        const fn = settings.mode === 'full_rewrite' ? generateFullArticle : adaptTemplateForCity
        const result = settings.mode === 'full_rewrite'
          ? await generateFullArticle(city)
          : await adaptTemplateForCity(templateBlocks, city, settings.mode)
        await save(city, result)
        done++
        callbacks.onDone?.(city, result)
      } catch (e) {
        failed++
        callbacks.onError?.(city, e instanceof Error ? e : new Error(String(e)))
      }
      if (settings.delayMs > 0) await sleep(settings.delayMs)
    }
  }
  callbacks.onFinish?.(done, failed)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function substituteVars(blocks: Block[], city: CityInfo): Block[] {
  const vars: Record<string, string> = {
    '{{город}}':           city.name,
    '{{регион}}':          city.region,
    '{{цена_м2}}':         '2 900',
    '{{срок_дней}}':       '1',
    '{{федеральный_округ}}': city.federalDistrict,
  }
  const sub = (s?: string) => s
    ? Object.entries(vars).reduce((acc, [k, v]) => acc.replaceAll(k, v), s)
    : s
  return blocks.map(b => ({
    ...b,
    content: sub(b.content),
    cols: b.cols?.map(col => col.map(cb => ({ ...cb, content: sub(cb.content) }))),
  }))
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
