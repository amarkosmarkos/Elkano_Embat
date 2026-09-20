"use client";
import { useSyncExternalStore } from "react";

const KEY = "elkano:demo-mode";
const EVENT = "elkano:demo-mode";

const subscribe = (callback: () => void) => {
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", callback); };
};
const read = () => localStorage.getItem(KEY) === "1";

/** Presentation mode is the default; demo mode survives slide changes and reloads on this browser. */
export function useDemoMode() {
  const demo = useSyncExternalStore(subscribe, read, () => false);
  const setDemo = (value: boolean) => { localStorage.setItem(KEY, value ? "1" : "0"); window.dispatchEvent(new Event(EVENT)); };
  return [demo, setDemo] as const;
}
