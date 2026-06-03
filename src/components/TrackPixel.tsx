'use client'
import { useEffect, useRef } from 'react'

export default function TrackPixel({ articleId }: { articleId: string }) {
  const startRef = useRef(Date.now())

  useEffect(() => {
    // Generate or retrieve anonymous visitor ID
    let vid = localStorage.getItem('_wvid')
    if (!vid) { vid = crypto.randomUUID(); localStorage.setItem('_wvid', vid) }

    const device = /Mobi|Android/i.test(navigator.userAgent) ? 'mobile'
      : /Tablet|iPad/i.test(navigator.userAgent) ? 'tablet' : 'desktop'

    // Fire pageview
    fetch(`/api/track?a=${articleId}&v=${vid}&d=${device}&r=${encodeURIComponent(document.referrer)}`)
      .catch(() => {})

    // Send time on page when leaving
    const sendTime = () => {
      const secs = Math.round((Date.now() - startRef.current) / 1000)
      if (secs < 2) return
      navigator.sendBeacon(`/api/track?a=${articleId}&v=${vid}&d=${device}&t=${secs}`)
    }

    // CTA click tracking
    const handleClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest('[data-cta]')
      if (el) fetch(`/api/track?a=${articleId}&v=${vid}&cta=1`).catch(() => {})
    }

    window.addEventListener('beforeunload', sendTime)
    document.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('beforeunload', sendTime)
      document.removeEventListener('click', handleClick)
    }
  }, [articleId])

  return null
}
