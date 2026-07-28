import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useRouterState,
} from '@tanstack/react-router'

import SiteFooter from '#/components/SiteFooter'
import SiteHeader from '#/components/SiteHeader'
import { MatchProvider } from '#/store/match'

import mainCss from '../main.css?url'
import styles from './root.module.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'GameShot — Darts Counter' },
      {
        name: 'theme-color',
        content: '#121212',
      },
    ],
    links: [{ rel: 'stylesheet', href: mainCss }],
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
