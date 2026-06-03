'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const NAV = [
  { href: '/admin',            label: 'Обзор',     icon: '⬡' },
  { href: '/admin/articles',   label: 'Статьи',    icon: '≡' },
  { href: '/admin/templates',  label: 'Шаблоны',   icon: '◫' },
  { href: '/admin/editor',     label: 'Редактор',  icon: '✦' },
  { href: '/admin/agent',      label: 'AI агент',  icon: '◈' },
  { href: '/admin/analytics',  label: 'Аналитика', icon: '∿' },
]

export default function AdminSidebar({ user }: { user: { name?: string; email?: string; role?: string } }) {
  const path = usePathname()
  return (
    <aside style={{ width: 220, minHeight: '100vh', background: 'var(--bg2)', borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '20px 0', position: 'sticky', top: 0 }}>
      <div style={{ padding: '0 18px 20px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>WallPrint CMS</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Печать на стенах</div>
      </div>
      <nav style={{ padding: '14px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = path === item.href || (item.href !== '/admin' && path.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400,
              color: active ? 'var(--text)' : 'var(--text2)',
              background: active ? 'var(--bg)' : 'transparent',
              border: active ? '0.5px solid var(--border)' : '0.5px solid transparent',
              textDecoration: 'none', transition: 'all .15s',
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '14px 18px', borderTop: '0.5px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2 }}>{user?.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 10 }}>{user?.role}</div>
        <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          Выйти →
        </button>
      </div>
    </aside>
  )
}
