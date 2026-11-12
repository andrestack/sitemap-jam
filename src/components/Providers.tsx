"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { Toaster } from "sonner";
import { ConfirmProvider } from "./ui/confirm";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delay={300}>
      <ConfirmProvider>{children}</ConfirmProvider>
      <Toaster position="bottom-center" theme="light" />
    </Tooltip.Provider>
  );
}
