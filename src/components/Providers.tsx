"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Toaster } from "sonner";
import { ConfirmProvider } from "./ui/confirm";

// Sonner reads these variables, so toasts match the cream and charcoal palette.
const toastTheme = {
  "--normal-bg": "#fffdf8",
  "--normal-text": "#10141c",
  "--normal-border": "#e0d6be",
  "--success-bg": "#fffdf8",
  "--success-text": "#3d6b4a",
  "--success-border": "#e0d6be",
  "--error-bg": "#fffdf8",
  "--error-text": "#a6432b",
  "--error-border": "#e0d6be",
} as CSSProperties;

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delay={300}>
      <ConfirmProvider>{children}</ConfirmProvider>
      <Toaster position="bottom-center" theme="light" style={toastTheme} />
    </Tooltip.Provider>
  );
}
