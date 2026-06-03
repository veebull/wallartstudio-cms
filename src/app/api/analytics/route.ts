import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { articles, cities, articleStats } from '@/db/schema'
import { eq, gte, desc, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') || '30'), 365)
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const [summary] = await db
    .select({
      totalViews:  sql<number>`coalesce(sum(${articleStats.views}), 0)`,
      totalUnique: sql<number>`coalesce(sum(${articleStats.uniqueVisitors}), 0)`,
      totalCta:    sql<number>`coalesce(sum(${articleStats.ctaClicks}), 0)`,
      avgTime:     sql<number>`coalesce(avg(${articleStats.avgTimeSec}), 0)`,
    })
    .from(articleStats)
    .where(gte(articleStats.statDate, since))

  const topCities = await db
    .select({
      articleId:  articles.id,
      title:      articles.title,
      slug:       articles.slug,
      cityName:   cities.name,
      cityRegion: cities.region,
      cityFd:     cities.federalDistrict,
      views:      sql<number>`coalesce(sum(${articleStats.views}), 0)`,
      unique:     sql<number>`coalesce(sum(${articleStats.uniqueVisitors}), 0)`,
      ctaClicks:  sql<number>`coalesce(sum(${articleStats.ctaClicks}), 0)`,
      avgTime:    sql<number>`coalesce(avg(${articleStats.avgTimeSec}), 0)`,
    })
    .from(articleStats)
    .innerJoin(articles, eq(articleStats.articleId, articles.id))
    .innerJoin(cities, eq(articles.cityId, cities.id))
    .where(gte(articleStats.statDate, since))
    .groupBy(articles.id, articles.title, articles.slug, cities.name, cities.region, cities.federalDistrict)
    .orderBy(desc(sql`sum(${articleStats.views})`))
    .limit(100)

  const daily = await db
    .select({
      date:   articleStats.statDate,
      views:  sql<number>`sum(${articleStats.views})`,
      unique: sql<number>`sum(${articleStats.uniqueVisitors})`,
    })
    .from(articleStats)
    .where(gte(articleStats.statDate, since))
    .groupBy(articleStats.statDate)
    .orderBy(articleStats.statDate)

  return NextResponse.json({ summary, topCities, daily })
}
