import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { articles, cities } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const [row] = await db.select().from(articles).where(eq(articles.id, id))
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { title, blocks, metaTitle, metaDescription, status } = body

  const wordCount = JSON.stringify(blocks || []).split(/\s+/).length

  const [updated] = await db.update(articles)
    .set({
      title, blocks, metaTitle, metaDescription, status, wordCount,
      updatedAt: new Date(),
      publishedAt: status === 'published' ? new Date() : undefined,
    })
    .where(eq(articles.id, id))
    .returning()

  if (status === 'published' && updated?.cityId) {
    await db.update(cities).set({ hasArticle: true }).where(eq(cities.id, updated.cityId))
  }

  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.delete(articles).where(eq(articles.id, id))
  return NextResponse.json({ ok: true })
}
