import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { articles, cities, articleStats } from '@/db/schema'
import { eq, desc, and, ilike, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'all'
  const search = searchParams.get('search') || ''
  const page   = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit  = 30
  const offset = (page - 1) * limit

  const conds: any[] = []
  if (status !== 'all') conds.push(eq(articles.status, status as any))
  if (search)           conds.push(ilike(cities.name, `%${search}%`))

  const rows = await db
    .select({
      id:         articles.id,
      title:      articles.title,
      slug:       articles.slug,
      status:     articles.status,
      authorType: articles.authorType,
      wordCount:  articles.wordCount,
      publishedAt:articles.publishedAt,
      updatedAt:  articles.updatedAt,
      cityName:   cities.name,
      cityRegion: cities.region,
      cityFd:     cities.federalDistrict,
      totalViews: sql<number>`coalesce(sum(${articleStats.views}), 0)`,
      totalUnique:sql<number>`coalesce(sum(${articleStats.uniqueVisitors}), 0)`,
    })
    .from(articles)
    .leftJoin(cities, eq(articles.cityId, cities.id))
    .leftJoin(articleStats, eq(articleStats.articleId, articles.id))
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(articles.id, cities.name, cities.region, cities.federalDistrict)
    .orderBy(desc(articles.updatedAt))
    .limit(limit)
    .offset(offset)

  return NextResponse.json({ articles: rows, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { cityId, title, blocks, metaTitle, metaDescription, status, templateId } = body
  if (!cityId || !title) return NextResponse.json({ error: 'cityId and title required' }, { status: 400 })

  const [city] = await db.select({ slug: cities.slug }).from(cities).where(eq(cities.id, cityId))
  const slug = `pechat-na-stenah-${city?.slug || cityId.slice(0, 8)}`
  const wc = JSON.stringify(blocks || []).split(/\s+/).length

  const [article] = await db.insert(articles).values({
    cityId, templateId: templateId ?? null, title, slug,
    blocks: blocks || [],
    metaTitle: metaTitle ?? null,
    metaDescription: metaDescription ?? null,
    status: status || 'draft',
    authorType: 'human',
    authorId: (session.user as any).id,
    wordCount: wc,
    publishedAt: status === 'published' ? new Date() : null,
  }).returning()

  if (status === 'published') {
    await db.update(cities).set({ hasArticle: true }).where(eq(cities.id, cityId))
  }

  return NextResponse.json(article)
}
