import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/db'
import { articles, cities } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import CityCards from '@/components/CityCards'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Печать на стенах по всей России — от 2 900 ₽/м²',
  description: 'Вертикальный принтер наносит любое изображение на стены, потолки, полы. Работаем во всех городах России. Готово за 1 день.',
  keywords: 'печать на стенах, вертикальная печать, роспись стен принтером, фотопечать на стене',
}

export default async function HomePage() {
  const publishedArticles = await db
    .select({ id: articles.id, title: articles.title, slug: articles.slug })
    .from(articles)
    .where(eq(articles.status, 'published'))
    .orderBy(desc(articles.publishedAt))
    .limit(12)

  const [totalArticles] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .where(eq(articles.status, 'published'))

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      {/* Hero */}
      <section style={{ textAlign: 'center', marginBottom: 60 }}>
        <h1 style={{ fontSize: 'clamp(28px,5vw,48px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.5px' }}>
          Печать на стенах<br />по всей России
        </h1>
        <p style={{ fontSize: 18, color: 'var(--text2)', maxWidth: 560, margin: '0 auto 24px', lineHeight: 1.7 }}>
          Вертикальный принтер наносит любое изображение на стены, потолки и полы. Готово за 1 рабочий день — без грязи и запаха.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="#goroda"
            style={{ padding: '12px 28px', background: 'var(--text)', color: '#fff', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}
          >
            Найти в своём городе
          </a>
          <Link
            href="/admin"
            style={{ padding: '12px 28px', border: '1.5px solid var(--border2)', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: 15, textDecoration: 'none', color: 'inherit' }}
          >
            Войти в CMS
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 60 }}>
        {[
          ['от 2 900 ₽/м²', 'Стоимость печати'],
          ['1 день',        'Срок выполнения'],
          [String(totalArticles?.count || 0), 'Городов в базе'],
          ['500+',          'Объектов сделано'],
        ].map(([val, label]) => (
          <div key={label} style={{ background: 'var(--bg2)', borderRadius: 'var(--radius-lg)', padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{val}</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>{label}</div>
          </div>
        ))}
      </section>

      {/* Cities grid */}
      <section id="goroda">
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Статьи по городам</h2>
        {publishedArticles.length > 0 ? (
          <CityCards cities={publishedArticles} />
        ) : (
          <p style={{ color: 'var(--text3)', fontSize: 14 }}>
            Статьи ещё не опубликованы.{' '}
            <Link href="/admin" style={{ color: 'var(--blue)' }}>Войдите в CMS</Link>{' '}
            и запустите AI агент.
          </p>
        )}
      </section>
    </main>
  )
}
