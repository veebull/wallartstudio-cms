'use client'
import { useState } from 'react'

export default function CtaBlock({ cityName, buttonText }: { cityName: string; buttonText?: string }) {
  const [phone, setPhone] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = () => {
    if (!phone.trim()) return
    setSent(true)
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border2)', borderRadius: 12, padding: '24px 28px', margin: '32px 0' }}>
      <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 14 }}>
        Рассчитать стоимость в {cityName}
      </div>
      {!sent ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Ваш телефон"
            style={{ flex: 1, minWidth: 180, padding: '10px 14px', fontSize: 14, border: '0.5px solid var(--border2)', borderRadius: 8, outline: 'none', background: 'var(--bg)', fontFamily: 'inherit' }}
          />
          <button
            data-cta="true"
            onClick={handleSubmit}
            style={{ padding: '10px 22px', fontSize: 14, fontWeight: 600, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
            {buttonText || 'Получить расчёт'}
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 15, color: 'var(--green)', fontWeight: 500 }}>
          ✓ Заявка принята! Свяжемся в течение 30 минут.
        </div>
      )}
    </div>
  )
}
