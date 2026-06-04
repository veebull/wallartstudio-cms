import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/db'
import { articles, cities } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Печать на стенах по городам России',
  description: 'Выберите свой город и узнайте стоимость и условия печати на стенах вертикальным принтером.',
}

export default async function CitiesPage() {
  const published = await db
    .select({
      id: articles.id, title: articles.title, slug: articles.slug,
      cityName: cities.name, cityRegion: cities.region, cityFd: cities.federalDistrict,
    })
    .from(articles)
    .innerJoin(cities, eq(articles.cityId, cities.id))
    .where(eq(articles.status, 'published'))
    .orderBy(cities.name)

  const byDistrict = published.reduce<Record<string, typeof published>>((acc, a) => {
    const fd = a.cityFd || 'Прочие'
    acc[fd] = acc[fd] || []
    acc[fd].push(a)
    return acc
  }, {})

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
      <nav style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>
        <Link href="/">Главная</Link> › Города
      </nav>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Печать на стенах по городам</h1>
      <p style={{ color: 'var(--text2)', marginBottom: 40 }}>
        Вертикальный принтер работает во всех регионах России. Выберите свой город:
      </p>
      {Object.entries(byDistrict).sort().map(([fd, arts]) => (
        <section key={fd} style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em'}}>{fd}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
            {arts.map(a => (
              <Link key={a.id} href={`/goroda/${a.slug}`}
                style={{ display: 'block', padding: '10px 14px', background: 'var(--bg2)', borderRadius: 'var(--radius)', border: '0.5px solid var(--border)', fontSize: 14 }}>
                {a.cityName}
              </Link>
            ))}
          </div>
        </section>
      ))}
      {published.length === 0 && (
        <p style={{ color: 'var(--text3)' }}>Статьи ещё не опубликованы.</p>
      )}
    </main>
  )
}
