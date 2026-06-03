import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Inter, sans-serif', color: 'var(--text)' }}>
      <div style={{ fontSize: 64, fontWeight: 700, color: 'var(--border2)' }}>404</div>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Страница не найдена</h1>
      <p style={{ color: 'var(--text3)', fontSize: 14 }}>Возможно, статья ещё не опубликована или адрес изменился.</p>
      <Link href="/" style={{ marginTop: 8, padding: '9px 20px', background: 'var(--text)', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
        На главную
      </Link>
    </div>
  )
}
