import GLPK from "glpk.js";
import type { GLPK as GlpkApi } from "glpk.js";

// glpk.js 5: `await GLPK()` in both browser (returns an async worker-backed api)
// and node via the "glpk.js/node" export (sync api). `await glpk.solve()` works for both.
let instance: Promise<GlpkApi> | null = null;

export function getGlpk(): Promise<GlpkApi> {
  if (!instance) instance = GLPK();
  return instance;
}
