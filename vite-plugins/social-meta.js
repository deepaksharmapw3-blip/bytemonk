/**
 * Adds the link-preview image tags, which need an absolute URL (og:image, twitter:image).
 *
 * og:url and a canonical link are deliberately not added: every route serves this same HTML, so a
 * fixed value would make /register or /privacy claim the home page as their address.
 *
 * Social sites ignore relative image paths, and the site's address is only known at deploy time,
 * so it comes from VITE_SITE_URL (for example https://bytemonk.example.com). When the variable is
 * missing or invalid, the page still gets the title and description tags from index.html and
 * simply has no preview image.
 */
export function normalizeSiteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}

export function socialMetaTags(siteUrl) {
  const meta = (attrs) => ({ tag: 'meta', attrs, injectTo: 'head' })
  if (!siteUrl) return [meta({ name: 'twitter:card', content: 'summary' })]

  const image = `${siteUrl}/og-image-official.png`
  return [
    meta({ property: 'og:image', content: image }),
    meta({ property: 'og:image:width', content: '1731' }),
    meta({ property: 'og:image:height', content: '909' }),
    meta({ property: 'og:image:alt', content: 'Official ByteMonk logo and Student Interest Portal preview' }),
    meta({ name: 'twitter:card', content: 'summary_large_image' }),
    meta({ name: 'twitter:image', content: image }),
  ]
}

export default function socialMeta(rawSiteUrl) {
  const siteUrl = normalizeSiteUrl(rawSiteUrl)
  if (rawSiteUrl && !siteUrl) {
    console.warn('VITE_SITE_URL is not a valid http(s) URL, so link-preview image tags were skipped.')
  }
  return {
    name: 'bytemonk-social-meta',
    transformIndexHtml: () => socialMetaTags(siteUrl),
  }
}
