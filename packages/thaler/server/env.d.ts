interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  [key: string]: any;
  MODE: string;
  DEV: boolean;
  PROD: boolean;
}
