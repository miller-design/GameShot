/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Add VITE_* env vars here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
