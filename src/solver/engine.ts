import type { GLPK as GlpkApi } from "glpk.js";

// glpk.js 5: `await GLPK()` in both browser (returns an async worker-backed api)
// and node via the "glpk.js/node" export (sync api). `await glpk.solve()` works for both.
// The package (wasm inlined, ~340 kB) is imported lazily so it stays out of the
// initial bundle until the first Optimize.
let instance: Promise<GlpkApi> | null = null;

export function getGlpk(): Promise<GlpkApi> {
  if (!instance) instance = import("glpk.js").then((m) => m.default());
  return instance;
}
