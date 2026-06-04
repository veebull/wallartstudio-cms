import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/db'
import { articles, cities } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import type { Block } from '@/db/schema'
import TrackPixel from '@/components/TrackPixel'
import CtaBlock from '@/components/CtaBlock'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const [row] = await db
    .select({ title: articles.metaTitle, desc: articles.metaDescription })
    .from(articles)
    .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))
  if (!row) return {}
  return {
    title: row.title ?? undefined,
    description: row.desc ?? undefined,
    openGraph: { title: row.title ?? undefined, description: row.desc ?? undefined },
  }
}

// export async function generateStaticParams() {
//   const rows = await db
//     .select({ slug: articles.slug })
//     .from(articles)
//     .where(eq(articles.status, 'published'))
//   return rows.map(r => ({ slug: r.slug }))
// }

// Pure server-side render — no event handlers allowed here
function renderBlock(block: Block, cityName: string): React.ReactNode {
  switch (block.type) {
    case 'heading':
      return (
        <h2 key={block.id} style={{ fontSize: 22, fontWeight: 700, margin: '32px 0 12px', lineHeight: 1.3 }}>
          {block.content}
        </h2>
      )
    case 'text':
      return (
        <p key={block.id} style={{ fontSize: 16, lineHeight: 1.85, marginBottom: 18, color: 'var(--text2)' }}>
          {block.content}
        </p>
      )
    case 'cta':
      // Client component — handles form interactivity
      return <CtaBlock key={block.id} cityName={cityName} buttonText={block.content} />
    case 'price':
      return (
        <div key={block.id} style={{ overflowX: 'auto', margin: '16px 0 28px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                {['Поверхность', 'Стоимость', 'Срок'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text3)', border: '0.5px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(block.items?.length
                ? block.items
                : [{ name: 'Стена', value: 'от 2 900 ₽/м²' }, { name: 'Потолок', value: 'от 3 500 ₽/м²' }, { name: 'Пол', value: 'от 3 200 ₽/м²' }]
              ).map(item => (
                <tr key={item.name}>
                  <td style={{ padding: '10px 14px', border: '0.5px solid var(--border)', fontWeight: 500 }}>{item.name}</td>
                  <td style={{ padding: '10px 14px', border: '0.5px solid var(--border)' }}>{item.value}</td>
                  <td style={{ padding: '10px 14px', border: '0.5px solid var(--border)', color: 'var(--text3)' }}>1–2 дня</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'divider':
      return <hr key={block.id} style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '28px 0' }} />
    case 'review':
      return (
        <blockquote key={block.id} style={{ borderLeft: '3px solid var(--border2)', paddingLeft: 16, margin: '20px 0', fontStyle: 'italic', color: 'var(--text2)', fontSize: 15 }}>
          {block.content}
        </blockquote>
      )
    case 'columns':
      return (
        <div key={block.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${block.cols?.length || 2}, 1fr)`, gap: 16, margin: '20px 0' }}>
          {block.cols?.map((col, i) => (
            <div key={i}>{col.map(b => renderBlock(b, cityName))}</div>
          ))}
        </div>
      )
    default:
      return null
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params

  const [row] = await db
    .select({
      id:              articles.id,
      title:           articles.title,
      blocks:          articles.blocks,
      metaTitle:       articles.metaTitle,
      metaDescription: articles.metaDescription,
      publishedAt:     articles.publishedAt,
      updatedAt:       articles.updatedAt,
      cityName:        cities.name,
      cityRegion:      cities.region,
      cityFd:          cities.federalDistrict,
    })
    .from(articles)
    .innerJoin(cities, eq(articles.cityId, cities.id))
    .where(and(eq(articles.slug, slug), eq(articles.status, 'published')))

  if (!row) notFound()

  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: row.title,
    description: row.metaDescription,
    datePublished: row.publishedAt?.toISOString(),
    dateModified: row.updatedAt.toISOString(),
    publisher: { '@type': 'Organization', name: 'WallPrint', url: base },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <TrackPixel articleId={row.id} />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 60px' }}>
        {/* Breadcrumbs */}
        <nav style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 22, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Link href="/">Главная</Link>
          <span>›</span>
          <Link href="/goroda">Города</Link>
          <span>›</span>
          <span style={{ color: 'var(--text2)' }}>{row.cityName}</span>
        </nav>

        {/* Meta info */}
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>{row.cityRegion}</span>
          {row.updatedAt && (
            <span>Обновлено {new Date(row.updatedAt).toLocaleDateString('ru')}</span>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 700, lineHeight: 1.25, marginBottom: 16, letterSpacing: '-0.3px' }}>
          {row.title}
        </h1>

        {/* Lead */}
        {row.metaDescription && (
          <p style={{ fontSize: 17, color: 'var(--text2)', marginBottom: 28, lineHeight: 1.65, fontStyle: 'italic' }}>
            {row.metaDescription}
          </p>
        )}

        <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', marginBottom: 28 }} />

        {/* Article content blocks */}
        <article className="article-body">
          {(row.blocks as Block[]).map(b => renderBlock(b, row.cityName))}
        </article>

        {/* Related cities footer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Печать на стенах в других городах {row.cityFd}
          </div>
          <Link href="/goroda" style={{ fontSize: 14, color: 'var(--blue)', textDecoration: 'underline' }}>
            Все города →
          </Link>
        </div>
      </main>
    </>
  )
}
