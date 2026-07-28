import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import SiteHeader from '#/components/SiteHeader'
import { seo } from '#/lib/seo'
import { MatchProvider } from '#/store/match'

import mainCss from '../main.css?url'
import styles from './root.module.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: seo.title },
      { name: 'description', content: seo.description },
      { name: 'theme-color', content: seo.themeColor },
      { name: 'application-name', content: seo.siteName },
      // Open Graph
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: seo.siteName },
      { property: 'og:title', content: seo.title },
      { property: 'og:description', content: seo.description },
      { property: 'og:image', content: seo.ogImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: seo.ogImageAlt },
      ...(seo.url ? [{ property: 'og:url', content: seo.url }] : []),
      // Twitter / X
      { name: 'twitter:card', content: seo.twitterCard },
      { name: 'twitter:title', content: seo.title },
      { name: 'twitter:description', content: seo.description },
      { name: 'twitter:image', content: seo.ogImage },
      { name: 'twitter:image:alt', content: seo.ogImageAlt },
    ],
    links: [
      { rel: 'stylesheet', href: mainCss },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', href: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

/**
 * Root layout — match board stays full-bleed; other routes get site chrome.
 */
function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isMatch = pathname.startsWith('/match')

  return (
    <MatchProvider>
      {isMatch ? (
        <Outlet />
      ) : (
        <div className={styles.shell}>
          <SiteHeader />
          <div className={styles.content}>
            <Outlet />
          </div>
          <SiteFooter />
        </div>
      )}
    </MatchProvider>
  )
}

/**
 * HTML document shell for SSR.
 *
 * @example
 * // Provided by TanStack Start — do not call directly
 */
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
