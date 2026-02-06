/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALIYUN_ACCESS_KEY_ID: string
  readonly VITE_ALIYUN_ACCESS_KEY_SECRET: string
  readonly VITE_ALIYUN_OSS_REGION: string
  readonly VITE_ALIYUN_OSS_BUCKET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
