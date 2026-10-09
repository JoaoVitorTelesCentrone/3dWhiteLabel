"use client";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type ToastTone = "success" | "error";
type ToastItem = { id: number; message: string; tone: ToastTone };
const toastEvent = "agencia3d:toast";

export function showToast(message: string, tone: ToastTone = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(toastEvent, { detail: { message, tone } }));
}

export function ToastCenter() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const recent = useRef(new Map<string, number>());

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback((message: string, tone: ToastTone) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;
    const now = Date.now();
    const recentKey = `${tone}:${cleanMessage}`;
    if (now - (recent.current.get(recentKey) ?? 0) < 1200) return;
    recent.current.set(recentKey, now);
    const id = ++nextId.current;
    setItems((current) => [...current.slice(-2), { id, message: cleanMessage, tone }]);
    window.setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string; tone?: ToastTone }>).detail;
      if (detail?.message) addToast(detail.message, detail.tone === "error" ? "error" : "success");
    };
    window.addEventListener(toastEvent, handleToast);
    return () => window.removeEventListener(toastEvent, handleToast);
  }, [addToast]);

  return <div className="toast-viewport" data-toast-viewport aria-live="polite" aria-atomic="false">
    {items.map((item) => <div className={`app-toast app-toast--${item.tone}`} role={item.tone === "error" ? "alert" : "status"} key={item.id}>
      {item.tone === "success" ? <CheckCircle2 aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
      <span>{item.message}</span>
      <button type="button" onClick={() => dismiss(item.id)} aria-label="Fechar notificação"><X aria-hidden="true" /></button>
    </div>)}
  </div>;
}
