import { MetadataRoute } from 'next'
import { db } from '@/db'
import { articles } from '@/db/schema'
import { eq } from 'drizzle-orm'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  const published = await db
    .select({ slug: articles.slug, updatedAt: articles.updatedAt })
    .from(articles)
    .where(eq(articles.status, 'published'))

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/goroda`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...published.map(a => ({
      url: `${base}/goroda/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
