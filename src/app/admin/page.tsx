import { db } from '@/db'
import { articles, cities, agentJobs } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'

export default async function AdminPage() {
  const [artStats] = await db.select({
    total:     sql<number>`count(*)`,
    published: sql<number>`count(*) filter (where status='published')`,
    draft:     sql<number>`count(*) filter (where status='draft')`,
    review:    sql<number>`count(*) filter (where status='review')`,
  }).from(articles)

  const [cityStats] = await db.select({
    total:      sql<number>`count(*)`,
    withArt:    sql<number>`count(*) filter (where has_article)`,
  }).from(cities)

  const recentJobs = await db.select().from(agentJobs).orderBy(agentJobs.startedAt).limit(3)

  const coverage = cityStats.total > 0 ? Math.round((cityStats.withArt / cityStats.total) * 100) : 0

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Обзор</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)' }}>Статус вашего контент-проекта</p>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Опубликовано', val: artStats.published, color: 'var(--green)', bg: 'var(--green-bg)' },
          { label: 'На проверке',  val: artStats.review,    color: 'var(--amber)', bg: 'var(--amber-bg)' },
          { label: 'Черновики',    val: artStats.draft,     color: 'var(--text3)', bg: 'var(--bg2)' },
          { label: 'Городов охвачено', val: `${coverage}%`, color: 'var(--blue)', bg: 'var(--blue-bg)' },
        ].map(m => (
          <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: m.color }}>{m.val}</div>
            <div style={{ fontSize: 12, color: m.color, opacity: 0.8, marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Coverage bar */}
      <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <span style={{ fontWeight: 500 }}>Охват городов России</span>
          <span style={{ color: 'var(--text3)' }}>{cityStats.withArt} из {cityStats.total}</span>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${coverage}%`, background: 'var(--green)', borderRadius: 4, transition: 'width .6s' }} />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Link href="/admin/editor" style={{ display: 'block', padding: '16px 18px', background: 'var(--bg2)', borderRadius: 10, border: '0.5px solid var(--border)', textDecoration: 'none' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>✦</div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Создать шаблон</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Визуальный конструктор статьи</div>
        </Link>
        <Link href="/admin/agent" style={{ display: 'block', padding: '16px 18px', background: 'var(--bg2)', borderRadius: 10, border: '0.5px solid var(--border)', textDecoration: 'none' }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}>◈</div>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>Запустить агента</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Размножить статьи на все города</div>
        </Link>
      </div>
    </div>
  )
}
