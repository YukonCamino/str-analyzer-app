import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

/**
 * POST /api/estimate-revenue
 * Body: { address: string, beds: number, baths?: number, guests?: number, has_pool?: boolean }
 *
 * Flow:
 * 1. Geocode address via US Census geocoder (free, US only)
 * 2. Call AirROI /calculator/estimate for occupancy, ADR, and comparable listings
 * 3. Filter comps to matching bedroom count, pick revenue percentile
 *    (pool → 65th pct, no pool → 50th pct) and return with confidence level
 *
 * Returns { available: false, reason } when no AirROI key is set or lookup fails,
 * so the UI can fall back to the AirROI screenshot upload.
 */

interface CompSummary {
  name: string | null
  bedrooms: number | null
  ttm_revenue: number
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url =
      'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?' +
      new URLSearchParams({
        address,
        benchmark: 'Public_AR_Current',
        format: 'json',
      })
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const data = await res.json()
    const match = data?.result?.addressMatches?.[0]
    if (!match?.coordinates) return null
    return { lat: match.coordinates.y, lng: match.coordinates.x }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.AIRROI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ available: false, reason: 'no_api_key' })
  }

  let body: { address?: string; beds?: number; baths?: number; guests?: number; has_pool?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { address, beds, baths, guests, has_pool } = body
  if (!address || !beds) {
    return NextResponse.json({ error: 'address and beds are required' }, { status: 400 })
  }

  const coords = await geocode(address)
  if (!coords) {
    return NextResponse.json({ available: false, reason: 'geocode_failed' })
  }

  try {
    const params = new URLSearchParams({
      lat: String(coords.lat),
      lng: String(coords.lng),
      bedrooms: String(beds),
      baths: String(baths ?? beds),
      guests: String(guests ?? beds * 2),
    })
    const res = await fetch(`https://api.airroi.com/calculator/estimate?${params}`, {
      headers: { 'x-api-key': apiKey },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('AirROI API error:', res.status, err)
      return NextResponse.json({ available: false, reason: `airroi_error_${res.status}` })
    }

    const data = await res.json()
    const occupancy: number = data.occupancy ?? 0
    const adr: number = data.average_daily_rate ?? 0
    const baseline = Math.round(occupancy * adr * 365)

    // Comps matching the exact bedroom count, with real trailing revenue
    const allComps: unknown[] = Array.isArray(data.comparable_listings) ? data.comparable_listings : []
    const matched: CompSummary[] = allComps
      .map((c) => {
        const comp = c as {
          listing_info?: { listing_name?: string; bedrooms?: number }
          performance_metrics?: { ttm_revenue?: number }
        }
        return {
          name: comp.listing_info?.listing_name ?? null,
          bedrooms: comp.listing_info?.bedrooms ?? null,
          ttm_revenue: comp.performance_metrics?.ttm_revenue ?? 0,
        }
      })
      .filter((c) => c.ttm_revenue > 0 && c.bedrooms === beds)

    const revs = matched.map((c) => c.ttm_revenue).sort((a, b) => a - b)

    // Pool homes command a premium → use a higher percentile of comp revenue
    const pct = has_pool ? 0.65 : 0.5
    let annual_rev: number
    let confidence: 'high' | 'medium' | 'low'
    let method: string

    if (revs.length >= 10) {
      annual_rev = Math.round(percentile(revs, pct))
      confidence = 'high'
      method = `${revs.length} bedroom-matched comps, ${has_pool ? '65th' : '50th'} percentile`
    } else if (revs.length >= 5) {
      annual_rev = Math.round(percentile(revs, pct))
      confidence = 'medium'
      method = `${revs.length} bedroom-matched comps, ${has_pool ? '65th' : '50th'} percentile`
    } else if (baseline > 0) {
      annual_rev = has_pool ? Math.round(baseline * 1.1) : baseline
      confidence = 'low'
      method = 'market ADR × occupancy (too few bedroom-matched comps)'
    } else {
      return NextResponse.json({ available: false, reason: 'no_data' })
    }

    return NextResponse.json({
      available: true,
      annual_rev,
      confidence,
      method,
      occupancy: Math.round(occupancy * 1000) / 10, // percent, 1 decimal
      adr: Math.round(adr),
      comp_count: revs.length,
      total_comps: allComps.length,
      comps: matched
        .sort((a, b) => b.ttm_revenue - a.ttm_revenue)
        .slice(0, 5),
    })
  } catch (err) {
    console.error('estimate-revenue error:', err)
    return NextResponse.json({ available: false, reason: 'request_failed' })
  }
}
