/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_YANDEX_METRICA_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
