'use client'
import { useState } from 'react'
import { Property, estimatePITI, estimateDown, compute, fmtMoney } from '@/lib/calculations'

interface Props {
  onClose: () => void
  onAdd: (p: Property) => void
}

const BLANK: Partial<Property> = {
  address: '', region: '', price: undefined, beds: undefined,
  baths: undefined, sqft: undefined, zillow_link: '',
  annual_rev: 0, has_pool: false, tab_label: 'general',
}

export default function AddPropertyModal({ onClose, onAdd }: Props) {
  const [step, setStep] = useState<'url' | 'form'>('url')
  const [inputMode, setInputMode] = useState<'zillow' | 'screenshot'>('zillow')
  const [zillowUrl, setZillowUrl] = useState('')
  const [fetching, setFetching] = useState(false)
  const [fetchMsg, setFetchMsg] = useState('')
  const [form, setForm] = useState<Partial<Property>>(BLANK)
  const [saving, setSaving] = useState(false)

  // Comp-based revenue estimation state
  const [compStatus, setCompStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle')
  const [compInfo, setCompInfo] = useState<{
    annual_rev: number; confidence: string; method: string
    comp_count: number; adr: number; occupancy: number
  } | null>(null)
  const [needAirroi, setNeedAirroi] = useState(false)
  const [airroiPcts, setAirroiPcts] = useState<Record<string, number> | null>(null)
  const [airroiFetching, setAirroiFetching] = useState(false)

  /** Try to estimate revenue from AirROI comps (beds/pool-matched). Falls back to screenshot. */
  const estimateRevenue = async (d: Partial<Property>) => {
    if (!d.address || !d.beds) { setNeedAirroi(true); setCompStatus('failed'); return }
    setCompStatus('loading')
    try {
      const res = await fetch('/api/estimate-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: d.address, beds: d.beds, baths: d.baths,
          has_pool: d.has_pool ?? false,
        }),
      })
      const data = await res.json()
      if (data.available && data.confidence !== 'low') {
        setCompInfo(data)
        setCompStatus('done')
        setNeedAirroi(false)
        setForm(prev => ({
          ...prev,
          annual_rev: data.annual_rev,
          rev_source: `AirROI comps (${data.comp_count} matched, ${data.confidence})`,
        }))
      } else {
        // Low confidence or unavailable → ask for AirROI screenshot
        if (data.available) setCompInfo(data)
        setCompStatus('failed')
        setNeedAirroi(true)
      }
    } catch {
      setCompStatus('failed')
      setNeedAirroi(true)
    }
  }

  /** Extract revenue data from an AirROI screenshot (fallback path) */
  const extractAirroiScreenshot = async (file: File) => {
    setAirroiFetching(true)
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('source', 'airroi')
      const res = await fetch('/api/extract-from-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) { setFetchMsg(`Could not read AirROI screenshot: ${data.error}`); return }
      const pcts: Record<string, number> = {}
      if (data.rev_p25) pcts['25th'] = data.rev_p25
      if (data.rev_p50) pcts['50th'] = data.rev_p50
      if (data.rev_p75) pcts['75th'] = data.rev_p75
      if (data.rev_p90) pcts['90th'] = data.rev_p90
      setAirroiPcts(Object.keys(pcts).length > 1 ? pcts : null)
      if (data.annual_rev) {
        setForm(prev => ({ ...prev, annual_rev: data.annual_rev, rev_source: 'AirROI screenshot' }))
        setFetchMsg(
          `Revenue extracted from AirROI screenshot` +
          (data.adr ? ` — ADR $${data.adr}` : '') +
          (data.occupancy ? `, ${data.occupancy}% occupancy` : '')
        )
        setNeedAirroi(false)
      } else {
        setFetchMsg('Could not find a revenue figure in that screenshot — enter it manually.')
      }
    } catch {
      setFetchMsg("Couldn't read the AirROI screenshot — enter revenue manually.")
    } finally {
      setAirroiFetching(false)
    }
  }

  const fetchZillow = async () => {
    if (!zillowUrl.includes('zillow.com')) { setFetchMsg('Paste a Zillow listing URL'); return }
    setFetching(true); setFetchMsg('')
    try {
      const res = await fetch('/api/zillow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: zillowUrl }),
      })
      const data = await res.json()
      const merged: Partial<Property> = {
        ...form,
        address: data.address ?? form.address,
        price: data.price ?? form.price,
        beds: data.beds ?? form.beds,
        baths: data.baths ?? form.baths,
        sqft: data.sqft ?? form.sqft,
        dom: data.dom ?? form.dom,
        img_url: data.img_url ?? form.img_url,
        zillow_link: zillowUrl,
      }
      setForm(merged)
      if (data.blocked) {
        setFetchMsg("Zillow blocked the request — fill in the details manually below.")
      } else {
        setFetchMsg('Pulled from Zillow! Check the fields below.')
        estimateRevenue(merged)
      }
    } catch {
      setFetchMsg("Couldn't reach Zillow — fill in manually.")
    } finally {
      setFetching(false)
      setStep('form')
    }
  }

  const extractFromScreenshot = async (file: File) => {
    setFetching(true)
    setFetchMsg('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('source', 'zillow')
      const res = await fetch('/api/extract-from-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.error) {
        setFetchMsg(`Could not read screenshot: ${data.error}. Fill in manually.`)
        setStep('form')
        return
      }
      const merged: Partial<Property> = {
        ...form,
        address: data.address ?? form.address,
        price: data.price ?? form.price,
        beds: data.beds ?? form.beds,
        baths: data.baths ?? form.baths,
        sqft: data.sqft ?? form.sqft,
        dom: data.dom ?? form.dom,
        has_pool: data.has_pool ?? form.has_pool,
      }
      setForm(merged)
      setFetchMsg('Extracted from screenshot! Review the fields below.')
      estimateRevenue(merged)
    } catch {
      setFetchMsg("Couldn't read the screenshot — fill in manually.")
    } finally {
      setFetching(false)
      setStep('form')
    }
  }

  const skipToForm = () => { setForm({ ...BLANK, zillow_link: zillowUrl }); setStep('form') }

  const set = (k: keyof Property, v: unknown) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async () => {
    if (!form.address || !form.price) return
    setSaving(true)
    const piti = form.piti ?? (form.price ? estimatePITI(form.price) : 0)
    const down = form.down_payment ?? (form.price ? estimateDown(form.price) : 0)
    const payload = { ...form, piti, down_payment: down }
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const saved = await res.json()
      onAdd(saved)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={OVERLAY_STYLE} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={MODAL_STYLE}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Add Property</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {step === 'url' && (
          <div>
            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid rgba(148,163,184,0.2)', borderRadius: 10, overflow: 'hidden' }}>
              {(['zillow', 'screenshot'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: '0.8rem', fontWeight: 600,
                    border: 'none', cursor: 'pointer',
                    background: inputMode === mode ? '#1d4ed8' : 'transparent',
                    color: inputMode === mode ? '#fff' : '#64748b',
                  }}
                >
                  {mode === 'zillow' ? '🔗 Zillow URL' : '📷 Screenshot'}
                </button>
              ))}
            </div>

            {inputMode === 'zillow' && (
              <>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10 }}>
                  Paste a Zillow listing URL to auto-fill details.
                </p>
                <input
                  type="url"
                  placeholder="https://www.zillow.com/homedetails/..."
                  value={zillowUrl}
                  onChange={e => setZillowUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchZillow()}
                  style={INPUT_STYLE}
                />
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <Btn onClick={fetchZillow} disabled={fetching} primary>
                    {fetching ? 'Fetching…' : 'Fetch from Zillow'}
                  </Btn>
                  <Btn onClick={skipToForm}>Fill in manually</Btn>
                </div>
              </>
            )}

            {inputMode === 'screenshot' && (
              <>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 10 }}>
                  Upload a screenshot of any listing (Zillow, Redfin, AirDNA, Airbnb, etc.) and AI will extract the details.
                </p>
                <label
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 8,
                    border: '2px dashed rgba(148,163,184,0.3)', borderRadius: 12,
                    padding: '28px 20px', cursor: fetching ? 'not-allowed' : 'pointer',
                    background: 'rgba(15,23,42,0.4)', color: '#64748b',
                    fontSize: '0.82rem', textAlign: 'center',
                  }}
                >
                  {fetching ? (
                    <span style={{ color: '#a5b4fc' }}>Reading screenshot…</span>
                  ) : (
                    <>
                      <span style={{ fontSize: '2rem' }}>📎</span>
                      <span>Click to choose a screenshot</span>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>PNG, JPG, WEBP</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={fetching}
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) extractFromScreenshot(file)
                    }}
                  />
                </label>
                <div style={{ marginTop: 14 }}>
                  <Btn onClick={skipToForm}>Skip — fill in manually</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {step === 'form' && (
          <div>
            {fetchMsg && (
              <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#a5b4fc', marginBottom: 14 }}>
                {fetchMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>

              <Field label="Address *" required>
                <input style={INPUT_STYLE} value={form.address ?? ''} onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, CA 12345" />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Price *">
                  <input style={INPUT_STYLE} type="number" value={form.price ?? ''} onChange={e => set('price', +e.target.value)} placeholder="350000" />
                </Field>
                <Field label="Region">
                  <input style={INPUT_STYLE} value={form.region ?? ''} onChange={e => set('region', e.target.value)} placeholder="Joshua Tree" />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <Field label="Beds">
                  <input style={INPUT_STYLE} type="number" value={form.beds ?? ''} onChange={e => set('beds', +e.target.value)} placeholder="2" />
                </Field>
                <Field label="Baths">
                  <input style={INPUT_STYLE} type="number" step="0.5" value={form.baths ?? ''} onChange={e => set('baths', +e.target.value)} placeholder="1" />
                </Field>
                <Field label="Sqft">
                  <input style={INPUT_STYLE} type="number" value={form.sqft ?? ''} onChange={e => set('sqft', +e.target.value)} placeholder="800" />
                </Field>
              </div>

              {/* Comp-based revenue status */}
              {compStatus === 'loading' && (
                <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#93c5fd' }}>
                  Looking up AirROI comps for this property…
                </div>
              )}
              {compStatus === 'done' && compInfo && (
                <div style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: '0.78rem', color: '#86efac' }}>
                  Revenue estimated from comps: <b>${compInfo.annual_rev.toLocaleString()}</b>/yr
                  ({compInfo.method}) — ADR ${compInfo.adr}, {compInfo.occupancy}% occupancy.
                  Adjust below if needed.
                </div>
              )}
              {needAirroi && (
                <div style={{ border: '1px solid rgba(251,191,36,0.35)', borderRadius: 10, padding: 12, background: 'rgba(251,191,36,0.07)' }}>
                  <div style={{ fontSize: '0.78rem', color: '#fcd34d', marginBottom: 8 }}>
                    Couldn&apos;t find a confident comp match automatically. Upload an AirROI
                    screenshot for this address and revenue will be extracted from it.
                  </div>
                  <label style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    border: '2px dashed rgba(251,191,36,0.35)', borderRadius: 10,
                    padding: '14px 12px', cursor: airroiFetching ? 'not-allowed' : 'pointer',
                    color: '#94a3b8', fontSize: '0.8rem',
                  }}>
                    {airroiFetching ? (
                      <span style={{ color: '#fcd34d' }}>Reading AirROI screenshot…</span>
                    ) : (
                      <span>📷 Upload AirROI screenshot</span>
                    )}
                    <input
                      type="file" accept="image/*" disabled={airroiFetching}
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) extractAirroiScreenshot(file)
                      }}
                    />
                  </label>
                </div>
              )}

              <Field label="Annual Revenue (auto from comps, AirROI screenshot, or manual)">
                <input style={INPUT_STYLE} type="number" value={form.annual_rev ?? ''} onChange={e => { set('annual_rev', +e.target.value); set('rev_source', 'manual') }} placeholder="0" />
              </Field>

              {airroiPcts && (
                <div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 6 }}>
                    AirROI scenarios — tap to use:
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(airroiPcts).map(([pct, val]) => (
                      <button
                        key={pct}
                        onClick={() => setForm(prev => ({ ...prev, annual_rev: val, rev_source: `AirROI ${pct} pct` }))}
                        style={{
                          background: form.annual_rev === val ? '#1d4ed8' : '#0f172a',
                          color: form.annual_rev === val ? '#fff' : '#94a3b8',
                          border: '1px solid rgba(148,163,184,0.25)', borderRadius: 20,
                          padding: '5px 12px', fontSize: '0.75rem', cursor: 'pointer',
                        }}
                      >
                        {pct}: ${val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Monthly PITI (auto-estimated if blank)">
                  <input style={INPUT_STYLE} type="number" value={form.piti ?? ''} onChange={e => set('piti', +e.target.value)} placeholder={form.price ? `~$${Math.round(estimatePITI(form.price)).toLocaleString()}` : 'e.g. 2100'} />
                </Field>
                <Field label="Down Payment $ (auto if blank)">
                  <input style={INPUT_STYLE} type="number" value={form.down_payment ?? ''} onChange={e => set('down_payment', +e.target.value)} placeholder={form.price ? `~$${Math.round(estimateDown(form.price)).toLocaleString()}` : 'e.g. 105000'} />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Tab / Group">
                  <select style={INPUT_STYLE} value={form.tab_label ?? 'general'} onChange={e => set('tab_label', e.target.value)}>
                    <option value="general">General</option>
                    <option value="laquinta">La Quinta</option>
                    <option value="bigbear">Big Bear</option>
                    <option value="adu">ADU</option>
                    <option value="duplex">Duplex</option>
                    <option value="money">Money Tab</option>
                    <option value="sold">Sold</option>
                  </select>
                </Field>
                <Field label="Days on Market">
                  <input style={INPUT_STYLE} type="number" value={form.dom ?? ''} onChange={e => set('dom', +e.target.value)} placeholder="e.g. 45" />
                </Field>
              </div>

              <Field label="Zillow Link">
                <input style={INPUT_STYLE} type="url" value={form.zillow_link ?? ''} onChange={e => set('zillow_link', e.target.value)} placeholder="https://www.zillow.com/..." />
              </Field>

              <Field label="Image URL (optional)">
                <input style={INPUT_STYLE} type="url" value={form.img_url ?? ''} onChange={e => set('img_url', e.target.value)} placeholder="https://..." />
              </Field>

              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.has_pool ?? false} onChange={e => set('has_pool', e.target.checked)} style={{ width: 16, height: 16 }} />
                  Has pool (+$250/mo service)
                </label>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.sold ?? false} onChange={e => set('sold', e.target.checked)} style={{ width: 16, height: 16 }} />
                  Already sold
                </label>
              </div>
              {/* Live ROI preview */}
              {(() => {
                if (!form.price || !form.annual_rev || !form.sqft) return null
                const piti = form.piti || estimatePITI(form.price)
                const down = form.down_payment || estimateDown(form.price)
                const f = compute(form.price, form.annual_rev, piti, down, form.sqft, form.has_pool ?? false)
                if (f.no_rev || f.cf === null || f.coc === null) return null
                const good = f.coc >= 10
                return (
                  <div style={{
                    border: `1px solid ${good ? 'rgba(34,197,94,0.35)' : 'rgba(148,163,184,0.25)'}`,
                    borderRadius: 10, padding: 12, background: 'rgba(15,23,42,0.5)',
                  }}>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ROI Preview
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem' }}>Cash-on-Cash</div>
                        <div style={{ color: good ? '#4ade80' : '#f1f5f9', fontWeight: 700 }}>{f.coc.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem' }}>Monthly Cash Flow</div>
                        <div style={{ color: f.cf >= 0 ? '#4ade80' : '#f87171', fontWeight: 700 }}>{fmtMoney(f.cf)}</div>
                      </div>
                      <div>
                        <div style={{ color: '#64748b', fontSize: '0.68rem' }}>Cash to Start</div>
                        <div style={{ color: '#f1f5f9', fontWeight: 700 }}>${Math.round(f.startup).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <Btn onClick={handleSubmit} disabled={saving || !form.address || !form.price} primary>
                {saving ? 'Saving…' : 'Add Property'}
              </Btn>
              <Btn onClick={() => setStep('url')}>Back</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 6, fontWeight: 500 }}>{children}</div>
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </div>
      {children}
    </div>
  )
}

function Btn({ onClick, children, disabled, primary }: {
  onClick: () => void; children: React.ReactNode; disabled?: boolean; primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? '#1d4ed8' : '#1e293b',
        color: primary ? '#fff' : '#94a3b8',
        border: primary ? 'none' : '1px solid rgba(148,163,184,0.2)',
        borderRadius: 10, padding: '9px 18px', fontSize: '0.85rem',
        fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
}

const MODAL_STYLE: React.CSSProperties = {
  background: '#1e293b', borderRadius: 16, padding: 24,
  width: '100%', maxWidth: 560,
  border: '1px solid rgba(148,163,184,0.15)',
  boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: '#0f172a',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8, color: '#f1f5f9',
  fontSize: '0.85rem', padding: '8px 12px', outline: 'none',
}
