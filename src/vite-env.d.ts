/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GAS_WEB_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// React JSX type shim — fixes "JSX.IntrinsicElements does not exist" errors
declare namespace React {
  interface ReactElement {}
  type FC<P = {}> = (props: P) => ReactElement | null;
  type FormEvent<T = Element> = Event & { target: T; preventDefault(): void };
  type ChangeEvent<T = Element> = Event & { target: T & { value: string; files?: FileList | null } };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
  interface IntrinsicAttributes {
    key?: string | number | null;
  }
}
