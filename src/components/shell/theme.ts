"use client";

import * as React from "react";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "md-theme";
const EVENT = "md-theme-change";

function read(): ThemeChoice {
  const value = localStorage.getItem(KEY);
  return value === "light" || value === "dark" ? value : "system";
}

export function applyTheme(choice: ThemeChoice) {
  const dark =
    choice === "dark" ||
    (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(choice: ThemeChoice) {
  localStorage.setItem(KEY, choice);
  applyTheme(choice);
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  const onMedia = () => {
    applyTheme(read());
    callback();
  };
  window.addEventListener(EVENT, callback);
  media.addEventListener("change", onMedia);
  return () => {
    window.removeEventListener(EVENT, callback);
    media.removeEventListener("change", onMedia);
  };
}

export function useTheme(): [ThemeChoice, (choice: ThemeChoice) => void] {
  const theme = React.useSyncExternalStore(subscribe, read, () => "system" as ThemeChoice);
  return [theme, setTheme];
}
