import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { articleTemplates } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const templates = await db.select().from(articleTemplates).orderBy(desc(articleTemplates.createdAt))
  return NextResponse.json({ templates })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const [tmpl] = await db.insert(articleTemplates).values({
    title: body.title || 'Новый шаблон',
    blocks: body.blocks || [],
    authorId: (session.user as any).id,
    status: 'draft',
  }).returning()
  return NextResponse.json(tmpl)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json()
  const [tmpl] = await db.update(articleTemplates)
    .set({ title: body.title, blocks: body.blocks, status: body.status, updatedAt: new Date() })
    .where(eq(articleTemplates.id, body.id))
    .returning()
  return NextResponse.json(tmpl)
}
