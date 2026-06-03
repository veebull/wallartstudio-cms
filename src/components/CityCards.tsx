'use client'

interface City {
  id: string
  title: string
  slug: string
}

export default function CityCards({ cities }: { cities: City[] }) {
  if (cities.length === 0) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 8 }}>
      {cities.map(a => (
        <a
          key={a.id}
          href={`/goroda/${a.slug}`}
          style={{
            display: 'block',
            padding: '12px 14px',
            background: 'var(--bg2)',
            borderRadius: 'var(--radius)',
            border: '0.5px solid var(--border)',
            fontSize: 14,
            transition: 'border-color .15s',
            textDecoration: 'none',
            color: 'inherit',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          {a.title.replace('Печать на стенах в ', '')}
        </a>
      ))}
    </div>
  )
}
