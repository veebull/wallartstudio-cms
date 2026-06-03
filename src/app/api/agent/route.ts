import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { cities, articles, articleTemplates, agentJobs, agentLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { runBatchJob, adaptTemplateForCity, generateFullArticle } from '@/lib/agent'
import type { JobSettings, Block } from '@/db/schema'

// In-memory pause state (use Redis in production multi-process)
const pausedJobs = new Set<string>()

// GET /api/agent         → list recent jobs
// GET /api/agent?jobId=x → job status + logs
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const jobId = new URL(req.url).searchParams.get('jobId')

  if (!jobId) {
    const jobs = await db.select().from(agentJobs).orderBy(agentJobs.startedAt).limit(20)
    return NextResponse.json({ jobs })
  }

  const [job] = await db.select().from(agentJobs).where(eq(agentJobs.id, jobId))
  const logs = await db
    .select({ id: agentLogs.id, event: agentLogs.event, message: agentLogs.message, createdAt: agentLogs.createdAt })
    .from(agentLogs)
    .where(eq(agentLogs.jobId, jobId))
    .orderBy(agentLogs.createdAt)
    .limit(100)

  return NextResponse.json({ job, logs, paused: pausedJobs.has(jobId) })
}

// POST /api/agent  { action: 'start'|'pause'|'resume', templateId, settings, jobId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, templateId, settings, jobId } = body

  if (action === 'pause')  { pausedJobs.add(jobId);    return NextResponse.json({ ok: true }) }
  if (action === 'resume') { pausedJobs.delete(jobId); return NextResponse.json({ ok: true }) }

  // action === 'start'
  const cfg: JobSettings = {
    batchSize:   settings?.batchSize   ?? 3,
    delayMs:     settings?.delayMs     ?? 2500,
    autoPublish: settings?.autoPublish ?? false,
    mode:        settings?.mode        ?? 'adapt',
    district:    settings?.district    ?? undefined,
  }

  // Load template
  const [tmpl] = await db.select().from(articleTemplates).where(eq(articleTemplates.id, templateId))
  if (!tmpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  // Get pending cities (no article yet)
  let pendingQuery = db.select().from(cities).where(eq(cities.hasArticle, false))
  const pendingCities = await pendingQuery.limit(1100)

  if (pendingCities.length === 0) {
    return NextResponse.json({ error: 'Все города уже имеют статьи' }, { status: 400 })
  }

  // Create job record
  const [job] = await db.insert(agentJobs).values({
    templateId,
    status: 'running',
    citiesTotal: pendingCities.length,
    citiesDone: 0,
    citiesFailed: 0,
    settings: cfg,
    startedAt: new Date(),
  }).returning()

  // Run in background (fire and forget)
  setImmediate(() => runAgentJob(job.id, tmpl.blocks as Block[], pendingCities, cfg))

  return NextResponse.json({ jobId: job.id, status: 'started', citiesTotal: pendingCities.length })
}

async function runAgentJob(
  jobId: string,
  templateBlocks: Block[],
  pendingCities: any[],
  cfg: JobSettings,
) {
  let done = 0
  let failed = 0

  for (let i = 0; i < pendingCities.length; i += cfg.batchSize) {
    const batch = pendingCities.slice(i, i + cfg.batchSize)

    for (const city of batch) {
      // Check pause
      while (pausedJobs.has(jobId)) {
        await db.update(agentJobs).set({ status: 'paused' }).where(eq(agentJobs.id, jobId))
        await sleep(3000)
      }
      await db.update(agentJobs).set({ status: 'running', currentCity: city.name, citiesDone: done }).where(eq(agentJobs.id, jobId))
      await db.insert(agentLogs).values({ jobId, cityId: city.id, event: 'started', message: `Обработка: ${city.name}` })

      try {
        const cityInfo = {
          id: city.id, name: city.name, slug: city.slug,
          region: city.region, federalDistrict: city.federalDistrict,
          population: city.population ?? undefined,
        }

        const result = cfg.mode === 'full_rewrite'
          ? await generateFullArticle(cityInfo)
          : await adaptTemplateForCity(templateBlocks, cityInfo, cfg.mode)

        const slug = `pechat-na-stenah-${city.slug}`
        const wc = JSON.stringify(result.blocks).split(/\s+/).length

        await db.insert(articles).values({
          cityId: city.id,
          templateId: (await db.select({ id: agentJobs.templateId }).from(agentJobs).where(eq(agentJobs.id, jobId)))[0]?.templateId ?? undefined,
          title: `Печать на стенах в ${city.name}`,
          slug,
          blocks: result.blocks as any,
          metaTitle: result.metaTitle,
          metaDescription: result.metaDescription,
          status: cfg.autoPublish ? 'published' : 'draft',
          authorType: 'ai',
          wordCount: wc,
          publishedAt: cfg.autoPublish ? new Date() : null,
        }).onConflictDoNothing()

        if (cfg.autoPublish) {
          await db.update(cities).set({ hasArticle: true }).where(eq(cities.id, city.id))
        }

        done++
        await db.insert(agentLogs).values({ jobId, cityId: city.id, event: 'generated', message: `Статья создана, ${wc} слов` })
      } catch (err: any) {
        failed++
        await db.insert(agentLogs).values({ jobId, cityId: city.id, event: 'error', message: err?.message || 'Unknown error' })
        await db.update(agentJobs).set({ citiesFailed: failed }).where(eq(agentJobs.id, jobId))
      }

      if (cfg.delayMs > 0) await sleep(cfg.delayMs)
    }
  }

  await db.update(agentJobs).set({
    status: 'done',
    citiesDone: done,
    citiesFailed: failed,
    currentCity: null,
    finishedAt: new Date(),
  }).where(eq(agentJobs.id, jobId))
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
