'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const res = await fetch('/api/templates')
    const data = await res.json()
    setTemplates(data.templates || [])
    setLoading(false)
  }

  async function del(id: string) {
    if (!confirm('Удалить шаблон?')) return
    await fetch(`/api/templates/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Шаблоны статей</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Базовые статьи для размножения по городам</p>
        </div>
        <Link href="/admin/editor" style={{ padding: '8px 18px', background: 'var(--text)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          + Новый шаблон
        </Link>
      </div>

      {loading && <div style={{ color: 'var(--text3)', fontSize: 13 }}>Загрузка...</div>}

      {!loading && templates.length === 0 && (
        <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Шаблонов нет</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
            Создайте базовую статью в редакторе, используйте переменные {`{{город}}`} и размножьте на все города
          </p>
          <Link href="/admin/editor" style={{ padding: '9px 20px', background: 'var(--text)', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
            Открыть редактор
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {templates.map((t: any) => (
          <div key={t.id} style={{ background: 'var(--bg2)', borderRadius: 12, padding: 18, border: '0.5px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14, flex: 1, marginRight: 8 }}>{t.title}</div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: t.status === 'published' ? 'var(--green-bg)' : 'var(--bg3)', color: t.status === 'published' ? 'var(--green)' : 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                {t.status === 'published' ? 'Активный' : 'Черновик'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>
              {(t.blocks?.length || 0)} блоков · {t.nicheTopic || 'печать на стенах'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
              Создан: {new Date(t.createdAt).toLocaleDateString('ru')}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link href={`/admin/editor?template=${t.id}`} style={{ flex: 1, padding: '7px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 7, color: 'var(--text2)', textAlign: 'center' }}>
                Редактировать
              </Link>
              <Link href={`/admin/agent?template=${t.id}`} style={{ flex: 1, padding: '7px', fontSize: 12, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 7, textAlign: 'center' }}>
                Размножить
              </Link>
              <button onClick={() => del(t.id)} style={{ padding: '7px 10px', fontSize: 12, border: '0.5px solid var(--border)', borderRadius: 7, color: 'var(--red)', background: 'none', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
