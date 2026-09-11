import { create } from "zustand";

export type ToastKind = "info" | "error";

export interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
}

interface ToastState {
  toasts: ToastItem[];
  push: (text: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const TOAST_MS = 2500;

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (text, kind = "info") => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), TOAST_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
