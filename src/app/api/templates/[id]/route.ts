import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { articleTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const [tmpl] = await db.select().from(articleTemplates).where(eq(articleTemplates.id, id))
  if (!tmpl) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(tmpl)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const [tmpl] = await db
    .update(articleTemplates)
    .set({ title: body.title, blocks: body.blocks, status: body.status, updatedAt: new Date() })
    .where(eq(articleTemplates.id, id))
    .returning()
  return NextResponse.json(tmpl)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.delete(articleTemplates).where(eq(articleTemplates.id, id))
  return NextResponse.json({ ok: true })
}
