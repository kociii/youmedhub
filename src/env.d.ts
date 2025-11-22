/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DASHSCOPE_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
