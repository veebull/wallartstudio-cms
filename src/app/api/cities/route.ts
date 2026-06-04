import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { cities } from '@/db/schema'
import { eq, ilike, and, or } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const search    = searchParams.get('search') || ''
  const district  = searchParams.get('district') || ''
  const noArticle = searchParams.get('no_article') === '1'

  const conditions = []
  if (search)    conditions.push(ilike(cities.name, `%${search}%`))
  if (district)  conditions.push(eq(cities.federalDistrict, district))
  if (noArticle) conditions.push(eq(cities.hasArticle, false))

  const rows = await db
    .select()
    .from(cities)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(cities.name)
    .limit(200)

  return NextResponse.json({ cities: rows })
}
