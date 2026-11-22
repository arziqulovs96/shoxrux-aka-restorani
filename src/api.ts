import type { PublicState, UpdateState } from "./shared/types";

declare global {
  interface Window {
    kassa: {
      call: (name: string, ...args: unknown[]) => Promise<{ ok: true; value: unknown } | { ok: false; error: string }>;
      on: (event: "state" | "update", cb: (v: unknown) => void) => () => void;
    };
  }
}

export class ApiError extends Error {}

export async function call<T = void>(name: string, ...args: unknown[]): Promise<T> {
  const r = await window.kassa.call(name, ...args);
  if (!r.ok) throw new ApiError(r.error);
  return r.value as T;
}

export const onState = (cb: (s: PublicState) => void) => window.kassa.on("state", (v) => cb(v as PublicState));
export const onUpdate = (cb: (s: UpdateState) => void) => window.kassa.on("update", (v) => cb(v as UpdateState));
