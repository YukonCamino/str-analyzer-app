import { NextRequest, NextResponse } from 'next/server'

interface ZillowData {
  address: string
  price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  dom: number | null
  img_url: string | null
  zillow_link: string
  zpid: string | null
}

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || !url.includes('zillow.com')) {
    return NextResponse.json({ error: 'Invalid Zillow URL' }, { status: 400 })
  }

  const zpidMatch = url.match(/\/(\d+)_zpid/)
  const zpid = zpidMatch ? zpidMatch[1] : null

  // Extract address from URL slug as a fallback
  const slugMatch = url.match(/homedetails\/([^/]+)\//)
  const addressFromSlug = slugMatch
    ? slugMatch[1].replace(/-/g, ' ').replace(/\s+CA\s+/, ', CA ').replace(/\s+(\d{5})$/, ' $1')
    : null

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // Try to extract __NEXT_DATA__ JSON blob Zillow embeds
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/)
    if (nextDataMatch) {
      try {
        const nextData = JSON.parse(nextDataMatch[1])
        const props = nextData?.props?.pageProps?.componentProps?.gdpClientCache
        if (props) {
          const cacheKey = Object.keys(props)[0]
          const listing = props[cacheKey]?.property
          if (listing) {
            return NextResponse.json({
              address: listing.streetAddress
                ? `${listing.streetAddress}, ${listing.city}, ${listing.state} ${listing.zipcode}`
                : addressFromSlug,
              price: listing.price ?? null,
              beds: listing.bedrooms ?? null,
              baths: listing.bathrooms ?? null,
              sqft: listing.livingArea ?? null,
              dom: listing.daysOnZillow ?? null,
              img_url: listing.photos?.[0]?.url ?? null,
              zillow_link: url,
              zpid,
            } satisfies ZillowData)
          }
        }
      } catch {}
    }

    // Fallback: try regex on the HTML for key fields
    const priceMatch = html.match(/"price":(\d+)/)
    const bedsMatch = html.match(/"bedrooms":(\d+(?:\.\d+)?)/)
    const bathsMatch = html.match(/"bathrooms":(\d+(?:\.\d+)?)/)
    const sqftMatch = html.match(/"livingArea":(\d+)/)
    const domMatch = html.match(/"daysOnZillow":(\d+)/)
    const imgMatch = html.match(/"url":"(https:\/\/photos\.zillowstatic\.com[^"]+)"/)

    return NextResponse.json({
      address: addressFromSlug,
      price: priceMatch ? parseInt(priceMatch[1]) : null,
      beds: bedsMatch ? parseFloat(bedsMatch[1]) : null,
      baths: bathsMatch ? parseFloat(bathsMatch[1]) : null,
      sqft: sqftMatch ? parseInt(sqftMatch[1]) : null,
      dom: domMatch ? parseInt(domMatch[1]) : null,
      img_url: imgMatch ? imgMatch[1] : null,
      zillow_link: url,
      zpid,
    } satisfies ZillowData)

  } catch {
    // Zillow blocked us — return what we can from the URL itself
    return NextResponse.json({
      address: addressFromSlug,
      price: null,
      beds: null,
      baths: null,
      sqft: null,
      dom: null,
      img_url: null,
      zillow_link: url,
      zpid,
      blocked: true,
    })
  }
}
