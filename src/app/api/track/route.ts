import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { pageViews, articleStats } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const articleId  = searchParams.get('a')
    const visitorId  = searchParams.get('v')
    const device     = searchParams.get('d') || 'desktop'
    const referrer   = searchParams.get('r') || ''
    const timeOnPage = searchParams.get('t') ? parseInt(searchParams.get('t')!) : null
    const ctaClick   = searchParams.get('cta') === '1'

    if (!articleId || !visitorId) return NextResponse.json({ ok: false }, { status: 400 })

    const today = new Date().toISOString().slice(0, 10)

    if (timeOnPage !== null) {
      // Update avg time on page
      await db.insert(articleStats)
        .values({ articleId, statDate: today, avgTimeSec: timeOnPage })
        .onConflictDoUpdate({
          target: [articleStats.articleId, articleStats.statDate],
          set: {
            avgTimeSec: sql`(${articleStats.avgTimeSec} + ${timeOnPage}) / 2`,
          },
        })
    } else if (ctaClick) {
      await db.insert(articleStats)
        .values({ articleId, statDate: today, ctaClicks: 1 })
        .onConflictDoUpdate({
          target: [articleStats.articleId, articleStats.statDate],
          set: { ctaClicks: sql`${articleStats.ctaClicks} + 1` },
        })
    } else {
      // Pageview
      await db.insert(pageViews).values({ articleId, visitorId, device, referrer })

      // Upsert daily stats
      await db.insert(articleStats)
        .values({ articleId, statDate: today, views: 1, uniqueVisitors: 1 })
        .onConflictDoUpdate({
          target: [articleStats.articleId, articleStats.statDate],
          set: {
            views: sql`${articleStats.views} + 1`,
            uniqueVisitors: sql`${articleStats.uniqueVisitors} + 1`,
          },
        })
    }

    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
