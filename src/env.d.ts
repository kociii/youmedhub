/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Aliyun OSS
  readonly VITE_ALIYUN_ACCESS_KEY_ID: string
  readonly VITE_ALIYUN_ACCESS_KEY_SECRET: string
  readonly VITE_ALIYUN_OSS_REGION: string
  readonly VITE_ALIYUN_OSS_BUCKET: string
  // Supabase
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
