// React type shims — fixes all TypeScript errors without @types/react
// To permanently fix: stop dev server → npm i -D @types/react @types/react-dom → restart

declare module 'react' {
  // ── Named exports (for: import { useState, useEffect } from 'react') ──
  export function useState<S>(init: S | (() => S)): [S, (v: S | ((p: S) => S)) => void];
  export function useState<S = undefined>(): [S | undefined, (v: S | undefined | ((p: S | undefined) => S | undefined)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function useCallback<T extends (...a: any[]) => any>(fn: T, deps: readonly any[]): T;
  export function useRef<T>(init: T): { current: T };
  export function useRef<T>(init: T | null): { current: T | null };
  export function useRef<T = undefined>(): { current: T | undefined };
  export function useContext<T>(ctx: Context<T>): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function createElement(type: any, props?: any, ...children: any[]): ReactElement;

  export interface Context<T> { Provider: any; Consumer: any; }
  export const Fragment: unique symbol;

  // ── Types (for: import type { FC } from 'react') ──
  export type FC<P = Record<string, any>> = (props: P & { children?: ReactNode }) => ReactElement | null;
  export type ReactNode = ReactElement | string | number | boolean | null | undefined;
  export interface ReactElement { type: any; props: any; key: any; }
  export type FormEvent<T = Element> = { preventDefault(): void; stopPropagation(): void; target: EventTarget & T; currentTarget: EventTarget & T; };
  export type ChangeEvent<T = Element> = { target: EventTarget & T & { value: string; checked?: boolean; files?: FileList | null }; currentTarget: EventTarget & T; };
  export type MouseEvent<T = Element, E = Event> = { preventDefault(): void; stopPropagation(): void; target: EventTarget & T; };
  export type KeyboardEvent<T = Element> = { key: string; code: string; preventDefault(): void; target: EventTarget & T; };
  export type Dispatch<A> = (action: A) => void;
  export type SetStateAction<S> = S | ((prevState: S) => S);
  export type CSSProperties = Record<string, string | number | undefined>;
  export type RefObject<T> = { readonly current: T | null };

  // ── Default export  (for: import React from 'react' → React.FC, React.FormEvent) ──
  const _React: {
    useState: typeof useState;
    useEffect: typeof useEffect;
    useMemo: typeof useMemo;
    useCallback: typeof useCallback;
    useRef: typeof useRef;
    useContext: typeof useContext;
    createContext: typeof createContext;
    createElement: typeof createElement;
    Fragment: typeof Fragment;
    // type aliases as any so React.FC / React.FormEvent / React.ChangeEvent work in annotations
    FC: any;
    ReactNode: any;
    ReactElement: any;
    FormEvent: any;
    ChangeEvent: any;
    MouseEvent: any;
    KeyboardEvent: any;
    Dispatch: any;
    SetStateAction: any;
    CSSProperties: any;
  };
  export default _React;
}

declare module 'react-dom/client' {
  export function createRoot(
    container: Element | Document | DocumentFragment | null,
    options?: { onRecoverableError?: (error: unknown) => void }
  ): { render(children: any): void; unmount(): void };
}

declare module 'react-dom' {
  export { createRoot } from 'react-dom/client';
  export function render(element: any, container: Element | null, callback?: () => void): void;
  export function unmountComponentAtNode(container: Element): boolean;
}

declare module 'react/jsx-runtime' {
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}

declare module 'react/jsx-dev-runtime' {
  export function jsxDEV(type: any, props: any, key: any, isStaticChildren: boolean, source?: any, self?: any): any;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
  export const Fragment: any;
}
