/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Canonical site origin for Open Graph / Twitter absolute URLs (no trailing slash). */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
