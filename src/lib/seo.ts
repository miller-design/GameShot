/**
 * Shared SEO / social meta defaults for GameShot.
 *
 * Absolute URLs for Open Graph / Twitter cards use `VITE_SITE_URL`
 * when set (no trailing slash). Falls back to a relative path so
 * local/dev still has a usable image reference.
 *
 * @example
 * // .env
 * // VITE_SITE_URL=https://gameshot.example.com
 *
 * import { seo } from '#/lib/seo'
 * seo.title // "GameShot — Darts Counter"
 */
const siteUrl = (import.meta.env.VITE_SITE_URL ?? '').replace(/\/$/, '')

/**
 * Builds an absolute asset URL when `VITE_SITE_URL` is set.
 *
 * @param path - Public path starting with `/` (e.g. `/og-image.png`)
 *
 * @example
 * absoluteUrl('/og-image.png')
 * // => "https://gameshot.example.com/og-image.png" or "/og-image.png"
 */
function absoluteUrl(path: string): string {
  return siteUrl ? `${siteUrl}${path}` : path
}

export const seo = {
  title: 'GameShot — Darts Counter',
  description:
    'Local-first matchplay darts counter for 501, 701 and 1001. Named for the winning double — score legs, track history, and finish on the double.',
  siteName: 'GameShot',
  themeColor: '#121212',
  ogImage: absoluteUrl('/og-image.png'),
  ogImageAlt: 'GameShot — Darts Counter',
  twitterCard: 'summary_large_image' as const,
  url: siteUrl || undefined,
}
