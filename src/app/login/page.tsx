'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await signIn('credentials', { email, password, redirect: false })
    if (res?.ok) router.push('/admin')
    else { setError('Неверный email или пароль'); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)' }}>
      <div style={{ width: '100%', maxWidth: 360, padding: '0 16px' }}>
        <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 14, padding: '32px 28px' }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Вход в CMS</div>
            <div style={{ fontSize: 13, color: 'var(--text3)' }}>Печать на стенах — панель управления</div>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: '0.5px solid var(--border2)', borderRadius: 'var(--radius)', outline: 'none', background: 'var(--bg)' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: '0.5px solid var(--border2)', borderRadius: 'var(--radius)', outline: 'none', background: 'var(--bg)' }} />
            </div>
            {error && <div style={{ fontSize: 12, color: 'var(--red)', background: 'var(--red-bg)', padding: '8px 10px', borderRadius: 6 }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ marginTop: 4, padding: '10px', fontSize: 14, fontWeight: 600, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
