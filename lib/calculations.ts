export interface Financials {
  mo_rev: number
  piti: number
  cleaning: number
  pool: number
  cf: number | null
  coc: number | null
  down: number
  furnishing: number
  buyer_agent: number
  closing: number
  startup: number
  annual_rev: number
  no_rev: boolean
}

export interface Property {
  id?: string
  user_id?: string
  address: string
  region?: string
  price: number
  original_price?: number
  beds?: number
  baths?: number
  sqft?: number
  dom?: number
  zillow_link?: string
  airbnb_link?: string
  img_url?: string
  annual_rev?: number
  piti?: number
  down_payment?: number
  has_pool?: boolean
  rev_source?: string
  sold?: boolean
  notes?: string
  tab_label?: string
  created_at?: string
}

export interface Comp {
  id?: string
  user_id?: string
  property_id?: string | null
  address?: string
  listing_name?: string
  annual_rev?: number
  adr?: number
  occupancy?: number
  rating?: number
  reviews?: number
  airbnb_link?: string
  notes?: string
  created_at?: string
}

/**
 * Recreates the compute() function from gen_html3.py.
 * down_payment: actual dollar amount (30% of price by default)
 * piti: monthly mortgage + tax + insurance payment
 */
export function compute(
  price: number,
  annual_rev: number,
  piti: number,
  down_payment: number,
  sqft: number,
  has_pool = false
): Financials {
  const furnishing = sqft * 16
  const buyer_agent = price * 0.025
  const closing = price * 0.02
  const startup = down_payment + furnishing + buyer_agent + closing

  if (!annual_rev || annual_rev <= 0) {
    return {
      mo_rev: 0, piti, cleaning: 0, pool: has_pool ? 250 : 0,
      cf: null, coc: null,
      down: down_payment, furnishing, buyer_agent, closing, startup,
      annual_rev: annual_rev || 0, no_rev: true
    }
  }

  const mo = annual_rev / 12
  const cleaning = mo * 0.23
  const pool = has_pool ? 250 : 0
  const cf = mo - piti - cleaning - pool
  const coc = startup > 0 ? (cf * 12) / startup * 100 : 0

  return {
    mo_rev: mo, piti, cleaning, pool, cf, coc,
    down: down_payment, furnishing, buyer_agent, closing, startup,
    annual_rev, no_rev: false
  }
}

/** Derive financials from a Property row */
export function getFinancials(p: Property): Financials | null {
  if (!p.price || !p.piti || !p.down_payment || !p.sqft) return null
  return compute(p.price, p.annual_rev ?? 0, p.piti, p.down_payment, p.sqft, p.has_pool ?? false)
}

/** Default PITI estimate: 30-yr fixed at 7.5%, 30% down, includes tax+ins estimate */
export function estimatePITI(price: number): number {
  const down = price * 0.30
  const loan = price - down
  const rate = 0.075 / 12
  const n = 360
  const mortgage = loan * (rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1)
  const taxIns = (price * 0.0125) / 12
  return Math.round((mortgage + taxIns) * 100) / 100
}

export function estimateDown(price: number): number {
  return Math.round(price * 0.30)
}

export function fmtMoney(v: number | null): string {
  if (v === null || v === undefined) return 'N/A'
  const neg = v < 0
  const s = `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  return neg ? `-${s}` : `+${s}`
}

export function fmtPlain(v: number | null): string {
  if (v === null || v === undefined) return 'N/A'
  return `$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
