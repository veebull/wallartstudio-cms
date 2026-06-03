'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: 'Опубликовано', color: '#27500A', bg: '#EAF3DE' },
  review:    { label: 'На проверке',  color: '#633806', bg: '#FAEEDA' },
  draft:     { label: 'Черновик',     color: '#5F5E5A', bg: '#F1EFE8' },
  archived:  { label: 'Архив',        color: '#444441', bg: '#D3D1C7' },
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/articles?status=${status}&search=${search}&page=${page}`)
    const data = await res.json()
    setArticles(data.articles || [])
    setLoading(false)
  }, [status, search, page])

  useEffect(() => { load() }, [load])

  async function deleteArticle(id: string) {
    if (!confirm('Удалить статью?')) return
    await fetch(`/api/articles/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Статьи</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Все статьи проекта</p>
        </div>
        <Link href="/admin/editor?mode=article" style={{ padding: '8px 18px', background: 'var(--text)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          + Новая статья
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Поиск по городу..."
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, outline: 'none', background: 'var(--bg)' }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer' }}>
          <option value="all">Все статусы</option>
          {Object.entries(STATUS_STYLE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 70px 80px 80px 80px', gap: 0, background: 'var(--bg2)', padding: '8px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <span>Город</span><span>Округ</span><span>Статус</span><span>Слов</span><span>Просм.</span><span>Уник.</span><span></span>
        </div>

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Загрузка...</div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            Статьи не найдены. <Link href="/admin/agent" style={{ color: 'var(--blue)' }}>Запустить AI агента →</Link>
          </div>
        )}

        {!loading && articles.map((a, i) => {
          const st = STATUS_STYLE[a.status] || STATUS_STYLE.draft
          return (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 70px 80px 80px 80px', gap: 0, padding: '10px 14px', fontSize: 13, borderTop: '0.5px solid var(--border)', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{a.cityName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{a.cityRegion}</div>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{a.cityFd}</span>
              <span>
                <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 12, background: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'monospace' }}>{a.wordCount || '—'}</span>
              <span style={{ fontSize: 12, fontWeight: a.totalViews > 0 ? 500 : 400, color: a.totalViews > 0 ? 'var(--text)' : 'var(--text3)' }}>
                {Number(a.totalViews).toLocaleString('ru') || '—'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{Number(a.totalUnique).toLocaleString('ru') || '—'}</span>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Link href={`/admin/editor?id=${a.id}`} style={{ fontSize: 11, padding: '4px 8px', border: '0.5px solid var(--border2)', borderRadius: 5, color: 'var(--text2)' }}>
                  Изменить
                </Link>
                <button onClick={() => deleteArticle(a.id)}
                  style={{ fontSize: 11, padding: '4px 8px', border: '0.5px solid var(--border)', borderRadius: 5, color: 'var(--red)', background: 'none', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ padding: '6px 12px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 7, background: 'var(--bg)', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1 }}>← Назад</button>
        <span style={{ padding: '6px 12px', fontSize: 12, color: 'var(--text3)' }}>стр. {page}</span>
        <button disabled={articles.length < 30} onClick={() => setPage(p => p + 1)}
          style={{ padding: '6px 12px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 7, background: 'var(--bg)', cursor: articles.length < 30 ? 'not-allowed' : 'pointer', opacity: articles.length < 30 ? 0.4 : 1 }}>Вперёд →</button>
      </div>
    </div>
  )
}
