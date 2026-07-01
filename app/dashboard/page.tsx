'use client'
import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { Property, getFinancials } from '@/lib/calculations'
import PropertyCard from '@/components/PropertyCard'
import AddPropertyModal from '@/components/AddPropertyModal'

type TabId = 'all' | 'top5' | 'general' | 'laquinta' | 'bigbear' | 'adu' | 'duplex' | 'money' | 'sold' | 'comps'

const TABS: { id: TabId; label: string }[] = [
  { id: 'all',       label: '🏘️ All' },
  { id: 'top5',      label: '🏆 Top 5' },
  { id: 'general',   label: '📋 General' },
  { id: 'laquinta',  label: '🌴 La Quinta' },
  { id: 'bigbear',   label: '🏔️ Big Bear' },
  { id: 'adu',       label: '🏠 ADU' },
  { id: 'duplex',    label: '🏘️ Duplex' },
  { id: 'money',     label: '💰 Money Tab' },
  { id: 'sold',      label: '🔴 Sold' },
]

export default function Dashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const [showAdd, setShowAdd] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/'); return }
      setUser({ email: data.user.email })
    })
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    setLoading(true)
    const res = await fetch('/api/properties')
    if (res.ok) {
      const data = await res.json()
      setProperties(data)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDelete = async (id: string) => {
    await fetch('/api/properties', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setProperties(prev => prev.filter(p => p.id !== id))
  }

  const handleUpdate = (updated: Property) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const handleAdd = (p: Property) => {
    setProperties(prev => [p, ...prev])
  }

  // Filter properties by tab
  const visibleProperties = useMemo(() => {
    let filtered = properties

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.address.toLowerCase().includes(q) ||
        (p.region ?? '').toLowerCase().includes(q)
      )
    }

    if (activeTab === 'all') return filtered.filter(p => !p.sold)
    if (activeTab === 'sold') return filtered.filter(p => p.sold)
    if (activeTab === 'top5') {
      return filtered
        .filter(p => !p.sold)
        .filter(p => {
          const f = getFinancials(p)
          return f && f.coc !== null && f.coc > 0
        })
        .sort((a, b) => {
          const fa = getFinancials(a)?.coc ?? -Infinity
          const fb = getFinancials(b)?.coc ?? -Infinity
          return fb - fa
        })
        .slice(0, 5)
    }

    return filtered.filter(p => !p.sold && (p.tab_label === activeTab || (!p.tab_label && activeTab === 'general')))
  }, [properties, activeTab, searchQuery])

  // Tab counts (excluding search filter for badge counts)
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    counts.all = properties.filter(p => !p.sold).length
    counts.sold = properties.filter(p => p.sold).length
    counts.top5 = Math.min(5, properties.filter(p => {
      if (p.sold) return false
      const f = getFinancials(p)
      return f && f.coc !== null && f.coc > 0
    }).length)
    TABS.forEach(t => {
      if (!['all', 'top5', 'sold'].includes(t.id)) {
        counts[t.id] = properties.filter(p => !p.sold && (p.tab_label === t.id || (!p.tab_label && t.id === 'general'))).length
      }
    })
    return counts
  }, [properties])

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      {/* Header */}
      <header style={HEADER_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🏡</span>
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
            STR Analyzer
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{user?.email}</span>
          <button
            onClick={() => setShowAdd(true)}
            style={ADD_BTN_STYLE}
          >
            + Add Property
          </button>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: '1px solid rgba(148,163,184,0.2)', color: '#94a3b8', borderRadius: 8, padding: '6px 14px', fontSize: '0.78rem', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Tab bar */}
      <div style={TABBAR_STYLE}>
        <div style={{ display: 'flex', gap: 2, overflowX: 'auto', paddingBottom: 1 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...TAB_BTN_STYLE,
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab.id
                  ? (tab.id === 'sold' ? '#f87171' : '#f1f5f9')
                  : (tab.id === 'sold' ? '#f87171aa' : '#64748b'),
                fontWeight: activeTab === tab.id ? 700 : 400,
              }}
            >
              {tab.label}
              {tabCounts[tab.id] > 0 && (
                <span style={{
                  marginLeft: 5, fontSize: '0.65rem', fontWeight: 700,
                  background: 'rgba(148,163,184,0.15)', borderRadius: 10,
                  padding: '1px 6px', color: '#94a3b8',
                }}>
                  {tabCounts[tab.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', paddingLeft: 16, flexShrink: 0 }}>
          <input
            type="text"
            placeholder="Search address or region…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              background: '#1e293b', border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 8, color: '#f1f5f9', fontSize: '0.8rem',
              padding: '6px 12px', width: 220, outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Property grid */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#475569' }}>Loading properties…</div>
        ) : visibleProperties.length === 0 ? (
          <EmptyState tab={activeTab} onAdd={() => setShowAdd(true)} hasProperties={properties.length > 0} />
        ) : (
          <div style={GRID_STYLE}>
            {visibleProperties.map(p => (
              <PropertyCard key={p.id} property={p} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </main>

      {showAdd && <AddPropertyModal onClose={() => setShowAdd(false)} onAdd={handleAdd} />}
    </div>
  )
}

function EmptyState({ tab, onAdd, hasProperties }: { tab: TabId; onAdd: () => void; hasProperties: boolean }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏡</div>
      <h2 style={{ color: '#f1f5f9', marginBottom: 8 }}>
        {hasProperties ? `No properties in this tab yet` : 'No properties yet'}
      </h2>
      <p style={{ color: '#64748b', marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>
        {hasProperties
          ? `Add a property and assign it to the "${tab}" tab to see it here.`
          : 'Add your first property to get started with your STR analysis.'}
      </p>
      <button onClick={onAdd} style={ADD_BTN_STYLE}>+ Add Property</button>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────

const HEADER_STYLE: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '14px 24px', background: 'rgba(15,23,42,0.95)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(148,163,184,0.1)',
  position: 'sticky', top: 0, zIndex: 100,
}

const TABBAR_STYLE: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  padding: '0 24px',
  background: 'rgba(15,23,42,0.9)',
  backdropFilter: 'blur(8px)',
  borderBottom: '1px solid rgba(148,163,184,0.1)',
  position: 'sticky', top: 57, zIndex: 99,
  overflowX: 'auto',
}

const TAB_BTN_STYLE: React.CSSProperties = {
  background: 'none', border: 'none',
  padding: '12px 14px', fontSize: '0.83rem',
  cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'color 0.15s',
  display: 'flex', alignItems: 'center',
}

const ADD_BTN_STYLE: React.CSSProperties = {
  background: '#1d4ed8', color: '#fff', border: 'none',
  borderRadius: 10, padding: '8px 18px', fontSize: '0.85rem',
  fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em',
}

const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: 20,
}
