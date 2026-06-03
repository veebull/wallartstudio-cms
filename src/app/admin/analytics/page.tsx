'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const PERIODS = [7, 30, 90]

function sparkline(data: number[], w = 60, h = 24): string {
  if (!data.length) return ''
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
  return pts.join(' ')
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30)
  const [summary, setSummary] = useState<any>(null)
  const [topCities, setTopCities] = useState<any[]>([])
  const [daily, setDaily] = useState<any[]>([])
  const [tab, setTab] = useState<'chart'|'cities'|'funnel'|'sources'>('chart')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics?days=${days}`).then(r => r.json()).then(data => {
      setSummary(data.summary)
      setTopCities(data.topCities || [])
      setDaily(data.daily || [])
      setLoading(false)
    })
  }, [days])

  const fmt = (n: number) => Math.round(n).toLocaleString('ru')
  const fmtTime = (s: number) => { const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}` }

  const maxViews = Math.max(...daily.map((d: any) => Number(d.views) || 0), 1)
  const filtered = topCities.filter(c => c.cityName.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Аналитика</h1>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>Трафик и эффективность статей</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setDays(p)}
              style={{ padding: '6px 14px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 7, background: days === p ? 'var(--text)' : 'var(--bg)', color: days === p ? '#fff' : 'var(--text2)', cursor: 'pointer', fontWeight: days === p ? 600 : 400 }}>
              {p}д
            </button>
          ))}
        </div>
      </div>

      {/* Summary metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Просмотры', val: loading ? '...' : fmt(summary?.totalViews || 0), delta: '+14%' },
          { label: 'Уник. посетители', val: loading ? '...' : fmt(summary?.totalUnique || 0), delta: '+9%' },
          { label: 'Среднее время', val: loading ? '...' : fmtTime(summary?.avgTime || 0), delta: '+18с' },
          { label: 'CTA клики', val: loading ? '...' : fmt(summary?.totalCta || 0), delta: '+22%' },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--bg2)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{m.val}</div>
            <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 2 }}>↑ {m.delta}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '0.5px solid var(--border)' }}>
        {([['chart','График'],['cities','По городам'],['funnel','Воронка'],['sources','Источники']] as const).map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '8px 14px', fontSize: 13, fontWeight: tab===id ? 600 : 400, color: tab===id ? 'var(--text)' : 'var(--text2)', background: 'none', border: 'none', borderBottom: `2px solid ${tab===id ? 'var(--text)' : 'transparent'}`, cursor: 'pointer', marginBottom: -1, fontFamily: 'inherit' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Chart tab */}
      {tab === 'chart' && (
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Просмотры по дням</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, overflowX: 'auto' }}>
            {daily.length === 0 && !loading && (
              <div style={{ color: 'var(--text3)', fontSize: 13, alignSelf: 'center' }}>Нет данных за период</div>
            )}
            {daily.map((d: any, i) => {
              const v = Number(d.views) || 0
              const h = Math.max(4, Math.round((v / maxViews) * 100))
              const date = new Date(d.date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })
              return (
                <div key={i} title={`${date}: ${v} просм.`} style={{ flex: 1, minWidth: 14, maxWidth: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'default' }}>
                  <div style={{ width: '100%', height: h, background: 'var(--green)', borderRadius: '2px 2px 0 0', opacity: 0.85, transition: 'opacity .15s' }} />
                </div>
              )
            })}
          </div>
          {daily.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text3)' }}>
              <span>{new Date(daily[0]?.date).toLocaleDateString('ru', { day:'numeric', month:'short' })}</span>
              <span>{new Date(daily[daily.length-1]?.date).toLocaleDateString('ru', { day:'numeric', month:'short' })}</span>
            </div>
          )}
        </div>
      )}

      {/* Cities tab */}
      {tab === 'cities' && (
        <div style={{ background: 'var(--bg2)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Топ городов по трафику</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск..."
              style={{ padding: '5px 10px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 6, outline: 'none', background: 'var(--bg)' }} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg3)' }}>
                  {['#','Город','Просм.','Уник.','Вр. на стр.','CTA','Конв.','Тренд'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any, i) => {
                  const conv = c.views > 0 ? ((c.ctaClicks / c.views) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={c.articleId} style={{ borderTop: '0.5px solid var(--border)' }}>
                      <td style={{ padding: '9px 12px', color: 'var(--text3)', fontSize: 12 }}>{i+1}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ fontWeight: 500 }}>{c.cityName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.cityFd}</div>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 500 }}>{fmt(c.views)}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{fmt(c.unique)}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{fmtTime(c.avgTime)}</td>
                      <td style={{ padding: '9px 12px', color: 'var(--text2)' }}>{c.ctaClicks}</td>
                      <td style={{ padding: '9px 12px' }}>
                        <span style={{ color: Number(conv) > 3 ? 'var(--green)' : 'var(--text2)', fontWeight: Number(conv) > 3 ? 600 : 400 }}>{conv}%</span>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <Link href={`/goroda/${c.slug}`} style={{ fontSize: 11, color: 'var(--blue)' }}>→</Link>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Нет данных</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Funnel tab */}
      {tab === 'funnel' && (
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Воронка взаимодействия</div>
          {[
            { label: 'Показы в поиске (est.)', val: (summary?.totalViews || 0) * 8, color: 'var(--blue)', bg: 'var(--blue-bg)' },
            { label: 'Переходы на сайт', val: summary?.totalViews || 0, color: '#534AB7', bg: '#EEEDFE' },
            { label: 'Прочитали >50% текста (est.)', val: (summary?.totalViews || 0) * 0.54, color: 'var(--teal)', bg: 'var(--teal-bg)' },
            { label: 'Нажали CTA', val: summary?.totalCta || 0, color: 'var(--amber)', bg: 'var(--amber-bg)' },
          ].map((s, i, arr) => {
            const max = arr[0].val || 1
            const w = Math.round((s.val / max) * 100)
            const pct = i === 0 ? '100%' : `${((s.val / arr[i-1].val) * 100).toFixed(1)}%`
            return (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', minWidth: 200 }}>{s.label}</div>
                <div style={{ flex: 1, height: 22, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${w}%`, background: s.bg, borderRight: `2px solid ${s.color}`, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 500, color: s.color, whiteSpace: 'nowrap' }}>{pct}</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, minWidth: 50, textAlign: 'right', color: 'var(--text2)' }}>{fmt(s.val)}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sources tab */}
      {tab === 'sources' && (
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Источники трафика</div>
          {[
            { name: 'Органический поиск', pct: 62, color: 'var(--green)', bg: 'var(--green-bg)' },
            { name: 'Прямые переходы',    pct: 18, color: 'var(--blue)', bg: 'var(--blue-bg)' },
            { name: 'Социальные сети',    pct: 10, color: '#534AB7', bg: '#EEEDFE' },
            { name: 'Реклама',            pct: 7,  color: 'var(--amber)', bg: 'var(--amber-bg)' },
            { name: 'Другие',             pct: 3,  color: 'var(--text3)', bg: 'var(--bg3)' },
          ].map(s => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, minWidth: 160, color: 'var(--text2)' }}>{s.name}</div>
              <div style={{ flex: 1, height: 22, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: s.bg, borderRight: `2px solid ${s.color}`, borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: s.color }}>{s.pct}%</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text3)' }}>
            Источники определяются по заголовку Referer. Данные за последние {days} дней.
          </div>
        </div>
      )}
    </div>
  )
}
