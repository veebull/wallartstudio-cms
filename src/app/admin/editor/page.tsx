'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Block } from '@/db/schema'

// ─── Block type definitions ───────────────────────────────────────────────────
const BLOCK_TYPES: { type: Block['type']; label: string; icon: string; defaultContent: string }[] = [
  { type: 'heading',  label: 'Заголовок',  icon: 'H', defaultContent: 'Вертикальная печать на стенах в {{город}}' },
  { type: 'text',     label: 'Текст',      icon: 'T', defaultContent: 'Введите текст. Используйте {{город}} и {{регион}} для автоподстановки.' },
  { type: 'cta',      label: 'CTA кнопка', icon: '→', defaultContent: 'Рассчитать стоимость в {{город}}' },
  { type: 'price',    label: 'Прайс',      icon: '₽', defaultContent: '' },
  { type: 'divider',  label: 'Разделитель',icon: '—', defaultContent: '' },
  { type: 'review',   label: 'Отзыв',      icon: '"', defaultContent: '«Отличная работа, сделали за день» — Клиент из {{город}}' },
  { type: 'columns',  label: '2 колонки',  icon: '⋮⋮', defaultContent: '' },
]

const CITY_VARS = ['{{город}}', '{{регион}}', '{{цена_м2}}', '{{срок_дней}}', '{{федеральный_округ}}']

// ─── Sortable block wrapper ───────────────────────────────────────────────────
function SortableBlock({ block, selected, onSelect, onDelete, onUpdate }: {
  block: Block; selected: boolean
  onSelect: () => void; onDelete: () => void
  onUpdate: (updates: Partial<Block>) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style}>
      <div onClick={onSelect} style={{
        border: `1px solid ${selected ? '#185FA5' : 'var(--border)'}`,
        borderRadius: 8, marginBottom: 8, overflow: 'hidden', cursor: 'pointer',
        boxShadow: selected ? '0 0 0 2px #185FA520' : 'none', background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg2)', borderBottom: '0.5px solid var(--border)' }}>
          <span {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text3)', fontSize: 16, lineHeight: 1, touchAction: 'none' }}>⠿</span>
          <span style={{ fontSize: 11, color: 'var(--text2)', flex: 1, fontWeight: 500 }}>
            {BLOCK_TYPES.find(t => t.type === block.type)?.label || block.type}
          </span>
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '8px 12px', fontSize: 13 }}>
          {block.type === 'heading'  && <strong style={{ fontSize: 15 }}>{block.content || '(пусто)'}</strong>}
          {block.type === 'text'     && <span style={{ color: 'var(--text2)', lineHeight: 1.5 }}>{(block.content || '').slice(0, 120)}{(block.content?.length || 0) > 120 ? '…' : ''}</span>}
          {block.type === 'cta'      && <span style={{ display: 'inline-block', padding: '6px 14px', background: 'var(--text)', color: '#fff', borderRadius: 6, fontSize: 12 }}>{block.content}</span>}
          {block.type === 'price'    && <span style={{ color: 'var(--text3)', fontStyle: 'italic', fontSize: 12 }}>Прайс: {block.items?.length || 3} позиции</span>}
          {block.type === 'divider'  && <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '4px 0' }} />}
          {block.type === 'review'   && <span style={{ fontStyle: 'italic', color: 'var(--text2)', fontSize: 12 }}>{(block.content || '').slice(0, 80)}…</span>}
          {block.type === 'columns'  && <span style={{ color: 'var(--text3)', fontSize: 12 }}>2 колонки · {(block.cols?.[0]?.length || 0) + (block.cols?.[1]?.length || 0)} блоков</span>}
        </div>
      </div>
    </div>
  )
}

// ─── City picker modal ────────────────────────────────────────────────────────
function CityPickerModal({ onPick, onClose }: { onPick: (city: any) => void; onClose: () => void }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/cities?search=${encodeURIComponent(search)}&no_article=0`)
      const data = await res.json()
      setResults(data.cities || [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetch('/api/cities?no_article=0').then(r => r.json()).then(d => setResults(d.cities || []))
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Выберите город</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text3)', lineHeight: 1 }}>×</button>
        </div>
        <input
          autoFocus
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск города..."
          style={{ width: '100%', padding: '9px 12px', fontSize: 14, border: '0.5px solid var(--border2)', borderRadius: 8, outline: 'none', background: 'var(--bg)', marginBottom: 12 }}
        />
        <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loading && <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 4px' }}>Поиск...</div>}
          {!loading && results.length === 0 && <div style={{ color: 'var(--text3)', fontSize: 13, padding: '8px 4px' }}>Ничего не найдено</div>}
          {results.map(city => (
            <button key={city.id} onClick={() => onPick(city)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', border: '0.5px solid var(--border)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', textAlign: 'left', transition: 'border-color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{city.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{city.federalDistrict}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main editor ──────────────────────────────────────────────────────────────
function EditorInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // URL params
  const articleId  = searchParams.get('id')       // editing existing article
  const templateId = searchParams.get('template') // editing existing template
  const isTemplate = searchParams.get('mode') === 'template' || !!templateId

  // State
  const [blocks, setBlocks]       = useState<Block[]>([])
  const [selected, setSelected]   = useState<string | null>(null)
  const [title, setTitle]         = useState('Печать на стенах в {{город}}')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDesc, setMetaDesc]   = useState('')
  const [saving, setSaving]       = useState(false)
  const [savedMsg, setSavedMsg]   = useState('')
  const [showMultiply, setShowMultiply]   = useState(false)
  const [showCityPicker, setShowCityPicker] = useState(false)
  const [selectedCity, setSelectedCity]   = useState<any>(null)
  const [allTemplates, setAllTemplates]   = useState<any[]>([])
  const [mode, setMode] = useState<'article' | 'template'>(isTemplate ? 'template' : 'article')

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Load data on mount
  useEffect(() => {
    if (articleId) {
      fetch(`/api/articles/${articleId}`).then(r => r.json()).then(data => {
        setTitle(data.title || '')
        setBlocks(data.blocks || [])
        setMetaTitle(data.metaTitle || '')
        setMetaDesc(data.metaDescription || '')
        setMode('article')
      })
    } else if (templateId) {
      fetch(`/api/templates/${templateId}`).then(r => r.json()).then(data => {
        setTitle(data.title || '')
        setBlocks(data.blocks || [])
        setMode('template')
      })
    }
    fetch('/api/templates').then(r => r.json()).then(d => setAllTemplates(d.templates || []))
  }, [articleId, templateId])

  // Block operations
  const addBlock = (type: Block['type']) => {
    const def = BLOCK_TYPES.find(t => t.type === type)
    const id = 'blk_' + Date.now()
    const newBlock: Block = {
      id, type,
      content: def?.defaultContent || '',
      items: type === 'price' ? [
        { name: 'Стена', value: 'от 2 900 ₽/м²' },
        { name: 'Потолок', value: 'от 3 500 ₽/м²' },
        { name: 'Пол', value: 'от 3 200 ₽/м²' },
      ] : undefined,
      cols: type === 'columns' ? [[], []] : undefined,
    }
    setBlocks(bs => [...bs, newBlock])
    setSelected(id)
  }

  const deleteBlock = (id: string) => {
    setBlocks(bs => bs.filter(b => b.id !== id))
    if (selected === id) setSelected(null)
  }

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(bs => bs.map(b => b.id === id ? { ...b, ...updates } : b))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setBlocks(bs => {
      const oi = bs.findIndex(b => b.id === active.id)
      const ni = bs.findIndex(b => b.id === over.id)
      return arrayMove(bs, oi, ni)
    })
  }

  // ── Save logic ────────────────────────────────────────────────────────────
  const save = async (status: 'draft' | 'published' = 'draft') => {
    // Template mode → always save as template
    if (mode === 'template') {
      setSaving(true)
      const url = templateId ? `/api/templates/${templateId}` : '/api/templates'
      const method = templateId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: templateId, title, blocks, status }),
      })
      const data = await res.json()
      setSaving(false)
      setSavedMsg('Шаблон сохранён')
      setTimeout(() => setSavedMsg(''), 2500)
      if (!templateId && data.id) router.replace(`/admin/editor?template=${data.id}`)
      return
    }

    // Article mode
    if (!articleId && !selectedCity) {
      // Need to pick a city first
      setShowCityPicker(true)
      return
    }

    setSaving(true)
    const body = { title, blocks, metaTitle, metaDescription: metaDesc, status }

    if (articleId) {
      // Update existing article
      await fetch(`/api/articles/${articleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      setSaving(false)
      setSavedMsg(status === 'published' ? 'Опубликовано!' : 'Черновик сохранён')
      setTimeout(() => setSavedMsg(''), 2500)
    } else {
      // Create new article for selected city
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, cityId: selectedCity.id }),
      })
      const created = await res.json()
      setSaving(false)
      if (created.id) {
        setSavedMsg(status === 'published' ? 'Опубликовано!' : 'Черновик сохранён')
        // Replace URL so subsequent saves use PATCH
        router.replace(`/admin/editor?id=${created.id}`)
        setTimeout(() => setSavedMsg(''), 2500)
      }
    }
  }

  const handleCityPick = (city: any) => {
    setSelectedCity(city)
    setShowCityPicker(false)
    // Auto-fill title with city name
    if (title.includes('{{город}}')) {
      setTitle(title.replace('{{город}}', city.name))
    }
  }

  const selectedBlock = blocks.find(b => b.id === selected)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', fontSize: 18, fontWeight: 600, border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            {/* Mode toggle */}
            <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 7, overflow: 'hidden', fontSize: 12 }}>
              <button
                onClick={() => setMode('article')}
                style={{ padding: '4px 12px', background: mode === 'article' ? 'var(--text)' : 'var(--bg)', color: mode === 'article' ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: mode === 'article' ? 600 : 400 }}>
                Статья
              </button>
              <button
                onClick={() => setMode('template')}
                style={{ padding: '4px 12px', background: mode === 'template' ? 'var(--text)' : 'var(--bg)', color: mode === 'template' ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: mode === 'template' ? 600 : 400 }}>
                Шаблон
              </button>
            </div>

            {/* City badge */}
            {mode === 'article' && (
              <button
                onClick={() => !articleId && setShowCityPicker(true)}
                style={{ padding: '4px 12px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 7, background: selectedCity ? 'var(--blue-bg)' : 'var(--bg2)', color: selectedCity ? 'var(--blue)' : 'var(--text3)', cursor: articleId ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                {articleId ? 'Редактирование статьи' : selectedCity ? `📍 ${selectedCity.name}` : '+ Выбрать город'}
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {mode === 'article' && (
            <button onClick={() => setShowMultiply(true)}
              style={{ padding: '7px 14px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit' }}>
              ◈ Размножить
            </button>
          )}
          <button
            onClick={() => save('draft')}
            disabled={saving}
            style={{ padding: '7px 14px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Сохраняем...' : savedMsg || (mode === 'template' ? 'Сохранить шаблон' : 'Сохранить черновик')}
          </button>
          {mode === 'article' && (
            <button
              onClick={() => save('published')}
              disabled={saving}
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 600, background: 'var(--green)', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
              Опубликовать
            </button>
          )}
        </div>
      </div>

      {/* Hint when no city selected */}
      {mode === 'article' && !articleId && !selectedCity && (
        <div style={{ background: 'var(--amber-bg)', border: '0.5px solid #EF9F27', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>⚠</span>
          <span>Выберите город чтобы сохранить статью, или переключитесь в режим <strong>Шаблон</strong> для создания шаблона под размножение.</span>
          <button onClick={() => setShowCityPicker(true)} style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 12, background: 'var(--amber)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            Выбрать город
          </button>
        </div>
      )}

      {/* 3-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 240px', gap: 14, minHeight: 600 }}>

        {/* Left: block palette */}
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'start' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6, padding: '0 2px' }}>
            Блоки
          </div>
          {BLOCK_TYPES.map(bt => (
            <button key={bt.type} onClick={() => addBlock(bt.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '0.5px solid var(--border)', borderRadius: 7, background: 'var(--bg)', cursor: 'pointer', fontSize: 12, textAlign: 'left', fontFamily: 'inherit' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text3)', minWidth: 18, textAlign: 'center' }}>{bt.icon}</span>
              {bt.label}
            </button>
          ))}
        </div>

        {/* Center: canvas */}
        <div style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 20, minHeight: 500 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={selected === block.id}
                  onSelect={() => setSelected(block.id)}
                  onDelete={() => deleteBlock(block.id)}
                  onUpdate={u => updateBlock(block.id, u)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {blocks.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text3)', fontSize: 13, gap: 8, textAlign: 'center' }}>
              <span style={{ fontSize: 36 }}>✦</span>
              <div>Добавьте блоки из панели слева</div>
              <div style={{ fontSize: 12 }}>Текст, заголовок, CTA, прайс, отзыв и другие</div>
            </div>
          )}
        </div>

        {/* Right: properties panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Block-specific props */}
          {selectedBlock ? (
            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12 }}>
                {BLOCK_TYPES.find(t => t.type === selectedBlock.type)?.label || selectedBlock.type}
              </div>

              {(['heading', 'text', 'cta', 'review'] as Block['type'][]).includes(selectedBlock.type) && (
                <>
                  <label style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>Содержимое</label>
                  <textarea
                    value={selectedBlock.content || ''}
                    rows={selectedBlock.type === 'text' ? 6 : 2}
                    onChange={e => updateBlock(selectedBlock.id, { content: e.target.value })}
                    style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 6, resize: 'vertical', outline: 'none', background: 'var(--bg)', lineHeight: 1.6, fontFamily: 'inherit' }}
                  />
                </>
              )}

              {selectedBlock.type === 'price' && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, display: 'block' }}>Позиции прайса</label>
                  {(selectedBlock.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                      <input
                        value={item.name}
                        onChange={e => {
                          const items = [...(selectedBlock.items || [])]
                          items[i] = { ...items[i], name: e.target.value }
                          updateBlock(selectedBlock.id, { items })
                        }}
                        placeholder="Поверхность"
                        style={{ flex: 1, padding: '5px 7px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 5, outline: 'none', background: 'var(--bg)', fontFamily: 'inherit' }}
                      />
                      <input
                        value={item.value}
                        onChange={e => {
                          const items = [...(selectedBlock.items || [])]
                          items[i] = { ...items[i], value: e.target.value }
                          updateBlock(selectedBlock.id, { items })
                        }}
                        placeholder="от X ₽"
                        style={{ width: 80, padding: '5px 7px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 5, outline: 'none', background: 'var(--bg)', fontFamily: 'inherit' }}
                      />
                      <button
                        onClick={() => {
                          const items = (selectedBlock.items || []).filter((_, idx) => idx !== i)
                          updateBlock(selectedBlock.id, { items })
                        }}
                        style={{ padding: '5px 7px', fontSize: 12, border: '0.5px solid var(--border)', borderRadius: 5, background: 'none', cursor: 'pointer', color: 'var(--red)', lineHeight: 1 }}>
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => updateBlock(selectedBlock.id, { items: [...(selectedBlock.items || []), { name: '', value: '' }] })}
                    style={{ fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit' }}>
                    + Добавить позицию
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>Кликните на блок для редактирования</div>
            </div>
          )}

          {/* SEO */}
          <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>SEO</div>
            <label style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>
              Meta Title <span style={{ color: 'var(--text3)' }}>({metaTitle.length}/60)</span>
            </label>
            <input
              value={metaTitle}
              onChange={e => setMetaTitle(e.target.value)}
              maxLength={60}
              style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 6, outline: 'none', background: 'var(--bg)', marginBottom: 8, fontFamily: 'inherit' }}
            />
            <label style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4, display: 'block' }}>
              Meta Description <span style={{ color: 'var(--text3)' }}>({metaDesc.length}/160)</span>
            </label>
            <textarea
              value={metaDesc}
              onChange={e => setMetaDesc(e.target.value)}
              rows={3}
              maxLength={160}
              style={{ width: '100%', padding: '7px 9px', fontSize: 12, border: '0.5px solid var(--border2)', borderRadius: 6, outline: 'none', resize: 'none', background: 'var(--bg)', fontFamily: 'inherit' }}
            />
          </div>

          {/* City variables */}
          <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>
              Переменные города
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, lineHeight: 1.5 }}>
              Вставьте в текст блока — агент подставит при размножении
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {CITY_VARS.map(v => (
                <button key={v}
                  onClick={() => {
                    if (selectedBlock && (['text','heading','cta','review'] as Block['type'][]).includes(selectedBlock.type)) {
                      updateBlock(selectedBlock.id, { content: (selectedBlock.content || '') + v })
                    }
                  }}
                  style={{ padding: '4px 8px', fontSize: 11, border: '0.5px solid var(--border)', borderRadius: 5, background: 'var(--bg)', cursor: 'pointer', textAlign: 'left', color: 'var(--text2)', fontFamily: 'monospace' }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCityPicker && (
        <CityPickerModal
          onPick={handleCityPick}
          onClose={() => setShowCityPicker(false)}
        />
      )}
      {showMultiply && (
        <MultiplyModal
          templates={allTemplates}
          onClose={() => setShowMultiply(false)}
          currentBlocks={blocks}
          currentTitle={title}
        />
      )}
    </div>
  )
}

// ─── Multiply modal ───────────────────────────────────────────────────────────
function MultiplyModal({ templates, onClose, currentBlocks, currentTitle }: {
  templates: any[]; onClose: () => void; currentBlocks: Block[]; currentTitle: string
}) {
  const [selTemplate, setSelTemplate] = useState(templates[0]?.id || '')
  const [mode, setMode]               = useState<'adapt'|'variables_only'|'full_rewrite'>('adapt')
  const [autoPublish, setAutoPublish] = useState(false)
  const [district, setDistrict]       = useState('')
  const [saving, setSaving]           = useState(false)
  const [jobId, setJobId]             = useState('')
  const router = useRouter()

  const start = async () => {
    setSaving(true)
    let tid = selTemplate
    if (!tid) {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: currentTitle, blocks: currentBlocks }),
      })
      const tmpl = await res.json()
      tid = tmpl.id
    }
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start', templateId: tid, settings: { mode, autoPublish, district, batchSize: 3, delayMs: 2000 } }),
    })
    const data = await res.json()
    setJobId(data.jobId)
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div style={{ background: 'var(--bg)', borderRadius: 14, padding: 28, maxWidth: 480, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 18 }}>Размножить на города</div>
        {!jobId ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Шаблон</label>
              <select value={selTemplate} onChange={e => setSelTemplate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', fontFamily: 'inherit' }}>
                <option value="">— использовать текущий контент —</option>
                {templates.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Режим агента</label>
              <select value={mode} onChange={e => setMode(e.target.value as any)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', fontFamily: 'inherit' }}>
                <option value="adapt">Адаптировать текст под город</option>
                <option value="variables_only">Только подставить переменные (быстро)</option>
                <option value="full_rewrite">Написать уникальную статью с нуля</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Округ</label>
              <select value={district} onChange={e => setDistrict(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', fontFamily: 'inherit' }}>
                <option value="">Все округа (~1100 городов)</option>
                {['ЦФО','СЗФО','ЮФО','СКФО','ПФО','УФО','СФО','ДВФО'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
              <input type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)} />
              Автоматически публиковать готовые статьи
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={start} disabled={saving}
                style={{ flex: 1, padding: '10px', fontSize: 14, fontWeight: 600, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Запускаем...' : 'Запустить агент'}
              </button>
              <button onClick={onClose}
                style={{ padding: '10px 16px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Отмена
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>◈</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Агент запущен!</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 20 }}>Job ID: {jobId}</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={() => router.push('/admin/agent')}
                style={{ padding: '8px 18px', fontSize: 13, fontWeight: 600, background: 'var(--text)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                Следить за прогрессом →
              </button>
              <button onClick={onClose}
                style={{ padding: '8px 14px', fontSize: 13, border: '0.5px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', cursor: 'pointer', fontFamily: 'inherit' }}>
                Закрыть
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page export with Suspense ────────────────────────────────────────────────
export default function EditorPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>Загрузка редактора...</div>}>
      <EditorInner />
    </Suspense>
  )
}
