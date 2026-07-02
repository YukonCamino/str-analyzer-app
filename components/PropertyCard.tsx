'use client'
import { useState } from 'react'
import { Property, getFinancials, compute, fmtMoney, fmtPlain } from '@/lib/calculations'

interface Props {
  property: Property
  onDelete: (id: string) => void
  onUpdate: (p: Property) => void
}

export default function PropertyCard({ property: p, onDelete, onUpdate }: Props) {
  const [annualRev, setAnnualRev] = useState(p.annual_rev ?? 0)
  const [remodelBudget, setRemodelBudget] = useState(0)
  const [saving, setSaving] = useState(false)

  const f = p.piti && p.down_payment && p.sqft
    ? compute(p.price, annualRev, p.piti, p.down_payment + remodelBudget, p.sqft, p.has_pool ?? false)
    : null

  // Adjust startup when remodel changes (adds to base startup)
  const baseStartup = f ? (f.startup - remodelBudget) : null
  const totalStartup = baseStartup ? baseStartup + remodelBudget : null

  const cardClass = p.sold
    ? 'property-card sold'
    : f?.coc !== null && f?.coc !== undefined
      ? f.coc > 0 ? 'property-card green' : 'property-card red'
      : 'property-card'

  const [street, cityState] = p.address.split(',').reduce<[string, string]>(
    (acc, part, i) => i === 0 ? [part, ''] : [acc[0], acc[1] + (acc[1] ? ',' : '') + part], ['', '']
  )

  const handleRevChange = (val: string) => {
    const num = parseInt(val.replace(/,/g, '')) || 0
    setAnnualRev(num)
  }

  const handleSave = async () => {
    if (!p.id) return
    setSaving(true)
    try {
      await fetch('/api/properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, annual_rev: annualRev }),
      })
      onUpdate({ ...p, annual_rev: annualRev })
    } finally {
      setSaving(false)
    }
  }

  // DOM chip color
  const domCls = p.dom === undefined || p.dom === null ? '' :
    p.dom <= 30 ? 'dom-green' : p.dom <= 60 ? 'dom-yellow' : 'dom-red'

  // Price display
  const priceDisplay = p.original_price && p.original_price > p.price
    ? <><del style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 400, marginRight: 3 }}>${p.original_price.toLocaleString()}</del> ${p.price.toLocaleString()}</>
    : <>${p.price.toLocaleString()}</>

  return (
    <div className={cardClass} style={CARD_STYLE}>
      {/* Image */}
      <div style={IMG_WRAP_STYLE}>
        {p.img_url
          ? <img src={p.img_url} alt={street} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={IMG_FALLBACK_STYLE}><span style={{ fontSize: 32 }}>🏡</span></div>
        }
        <div style={PRICE_BADGE_STYLE}>{priceDisplay}</div>
        {p.sold && <div style={SOLD_BADGE_STYLE}>SOLD</div>}
      </div>

      {/* Body */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9', marginBottom: 2 }}>{street}</div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 10 }}>{cityState.trim()}</div>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {p.beds && <Chip label={`${p.beds} bd`} cls="bed" />}
          {p.baths && <Chip label={`${p.baths} ba`} cls="bath" />}
          {p.sqft && <Chip label={`${p.sqft.toLocaleString()} sqft`} cls="sqft" />}
          {p.region && <Chip label={p.region} cls="region" />}
          {p.dom !== null && p.dom !== undefined && (
            <Chip label={`📅 ${p.dom}d`} cls={domCls} title="Days on Market" />
          )}
        </div>

        {/* Cash flow breakdown */}
        {f && !f.no_rev && (
          <div style={BREAKDOWN_STYLE}>
            <CostRow label="Mo. Revenue" value={`+${fmtPlain(f.mo_rev)}/mo`} cls="neutral" />
            <CostRow label="PITI (mtg+tax+ins)" value={`-${fmtPlain(f.piti)}/mo`} cls="neg" />
            <CostRow label="Cleaning (23%)" value={`-${fmtPlain(f.cleaning)}/mo`} cls="neg" />
            {f.pool > 0 && <CostRow label="Pool service" value="-$250/mo" cls="neg" />}
            <CostRow label="Net Cash Flow" value={`${fmtMoney(f.cf)}/mo`} cls={f.cf! >= 0 ? 'pos' : 'neg'} total />
          </div>
        )}

        {/* CoC bar */}
        {f && !f.no_rev && f.coc !== null && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Cash-on-Cash Return</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: f.coc >= 0 ? '#22c55e' : '#ef4444' }}>
                {f.coc >= 0 ? '+' : ''}{f.coc.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 5, background: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${Math.max(0, Math.min(100, (Math.min(Math.max(f.coc, -20), 50) + 20) / 70 * 100))}%`,
                background: f.coc >= 0 ? '#22c55e' : '#ef4444',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {/* Revenue input */}
        {f && (
          <div style={REV_SECTION_STYLE}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                📊 Revenue — {p.rev_source ?? 'estimate'}
              </span>
              {annualRev !== (p.annual_rev ?? 0) && (
                <button onClick={handleSave} disabled={saving} style={SAVE_BTN_STYLE}>
                  {saving ? '…' : 'Save'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Annual</span>
              <input
                type="text"
                value={annualRev ? annualRev.toLocaleString() : ''}
                onChange={e => handleRevChange(e.target.value)}
                onClick={e => (e.target as HTMLInputElement).select()}
                placeholder="0"
                style={REV_INPUT_STYLE}
              />
            </div>
          </div>
        )}

        {/* Startup costs */}
        {f && (
          <div style={STARTUP_STYLE}>
            <div style={{ fontWeight: 600, fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6 }}>Startup Costs</div>
            <StartupRow label="Down Payment (30%)" value={fmtPlain(f.down)} />
            <StartupRow label="Furnishing ($16/sqft)" value={fmtPlain(f.furnishing)} />
            <StartupRow label="Buyer's Agent (2.5%)" value={fmtPlain(f.buyer_agent)} />
            <StartupRow label="Closing Costs (est. 2%)" value={fmtPlain(f.closing)} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Remodel Budget</span>
              <input
                type="text"
                placeholder="$0"
                value={remodelBudget ? remodelBudget.toLocaleString() : ''}
                onChange={e => setRemodelBudget(parseInt(e.target.value.replace(/,/g, '')) || 0)}
                style={{ ...REV_INPUT_STYLE, width: 80 }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(148,163,184,0.15)', paddingTop: 6, marginTop: 6 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f1f5f9' }}>Total Cash In</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f1f5f9' }}>
                {fmtPlain(totalStartup)}
              </span>
            </div>
          </div>
        )}

        {/* Links + delete */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          {p.zillow_link && (
            <a href={p.zillow_link} target="_blank" rel="noopener noreferrer" style={LINK_BTN_STYLE('#1d4ed8')}>
              🏠 Zillow
            </a>
          )}
          {p.airbnb_link && p.airbnb_link.startsWith('http') && (
            <a href={p.airbnb_link} target="_blank" rel="noopener noreferrer" style={LINK_BTN_STYLE('#e02240')}>
              📍 AirBnB
            </a>
          )}
          <button
            onClick={() => { if (confirm('Delete this property?')) onDelete(p.id!) }}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.75rem', padding: '4px 6px', borderRadius: 6, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────

function Chip({ label, cls, title }: { label: string; cls: string; title?: string }) {
  const styles: Record<string, React.CSSProperties> = {
    bed:        { background: '#1e293b', color: '#7dd3fc', border: '1px solid rgba(125,211,252,0.25)' },
    bath:       { background: '#1e293b', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.25)' },
    sqft:       { background: '#1e293b', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' },
    region:     { background: '#1e293b', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' },
    'dom-green':{ background: '#14321e', color: '#4ade80', border: '1px solid rgba(74,222,128,0.35)' },
    'dom-yellow':{ background: '#302008', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.35)' },
    'dom-red':  { background: '#2d1010', color: '#f87171', border: '1px solid rgba(248,113,113,0.35)' },
  }
  return (
    <span title={title} style={{ ...BASE_CHIP_STYLE, ...(styles[cls] ?? styles.sqft) }}>
      {label}
    </span>
  )
}

function CostRow({ label, value, cls, total }: { label: string; value: string; cls: string; total?: boolean }) {
  const color = cls === 'pos' ? '#22c55e' : cls === 'neg' ? '#f87171' : '#94a3b8'
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: total ? '6px 0 0' : '3px 0',
      borderTop: total ? '1px solid rgba(148,163,184,0.15)' : 'none',
      marginTop: total ? 4 : 0,
    }}>
      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: total ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: '0.72rem', color, fontWeight: total ? 700 : 500 }}>{value}</span>
    </div>
  )
}

function StartupRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</span>
      <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>{value}</span>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: 'linear-gradient(160deg,#1a2742 0%,#0f172a 100%)',
  border: '1px solid rgba(148,163,184,0.12)',
  borderRadius: 16,
  overflow: 'hidden',
  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  cursor: 'default',
}

const IMG_WRAP_STYLE: React.CSSProperties = {
  position: 'relative', height: 180, overflow: 'hidden',
  background: '#1e293b',
}

const IMG_FALLBACK_STYLE: React.CSSProperties = {
  width: '100%', height: '100%', display: 'flex',
  alignItems: 'center', justifyContent: 'center', background: '#1e293b',
}

const PRICE_BADGE_STYLE: React.CSSProperties = {
  position: 'absolute', bottom: 10, left: 10,
  background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)',
  color: '#f1f5f9', fontWeight: 700, fontSize: '0.9rem',
  padding: '4px 10px', borderRadius: 8,
}

const SOLD_BADGE_STYLE: React.CSSProperties = {
  position: 'absolute', top: 10, right: 10,
  background: '#ef4444', color: '#fff',
  padding: '4px 10px', borderRadius: 6,
  fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.5px',
  textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
}

const BREAKDOWN_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)', borderRadius: 10,
  padding: '10px 12px', marginBottom: 12,
}

const REV_SECTION_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)', borderRadius: 10,
  padding: '10px 12px', marginBottom: 10,
}

const STARTUP_STYLE: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)', borderRadius: 10,
  padding: '10px 12px', marginBottom: 10,
}

const REV_INPUT_STYLE: React.CSSProperties = {
  background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 6, color: '#f1f5f9', fontSize: '0.82rem',
  padding: '4px 8px', width: '100%', outline: 'none',
}

const SAVE_BTN_STYLE: React.CSSProperties = {
  background: '#1d4ed8', color: '#fff', border: 'none',
  borderRadius: 6, padding: '2px 10px', fontSize: '0.72rem',
  fontWeight: 600, cursor: 'pointer',
}

const BASE_CHIP_STYLE: React.CSSProperties = {
  fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px',
  borderRadius: 20, whiteSpace: 'nowrap',
}

const LINK_BTN_STYLE = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', textDecoration: 'none',
  padding: '5px 12px', borderRadius: 8, fontSize: '0.75rem',
  fontWeight: 600,
})
