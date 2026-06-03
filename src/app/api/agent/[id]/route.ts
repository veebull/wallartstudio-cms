import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/db'
import { agentJobs, agentLogs, cities } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const [job] = await db.select().from(agentJobs).where(eq(agentJobs.id, id))
  if (!job) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const logs = await db
    .select({
      id: agentLogs.id,
      event: agentLogs.event,
      message: agentLogs.message,
      createdAt: agentLogs.createdAt,
      cityName: cities.name,
    })
    .from(agentLogs)
    .leftJoin(cities, eq(agentLogs.cityId, cities.id))
    .where(eq(agentLogs.jobId, id))
    .orderBy(desc(agentLogs.createdAt))
    .limit(100)

  return NextResponse.json({ job, logs })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  await db.delete(agentJobs).where(eq(agentJobs.id, id))
  return NextResponse.json({ ok: true })
}
