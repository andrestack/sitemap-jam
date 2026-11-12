"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "./button";

type Options = { title: string; description?: string; confirmLabel?: string; destructive?: boolean };
type Confirm = (o: Options) => Promise<boolean>;

const ConfirmCtx = createContext<Confirm | null>(null);

/** Promise-based replacement for window.confirm: `if (await confirm({ title })) …` */
export function useConfirm() {
  const c = useContext(ConfirmCtx);
  if (!c) throw new Error("ConfirmProvider missing");
  return c;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<Options | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((o) => {
    setOpts(o);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={open} onOpenChange={(o) => !o && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-neutral-900/30 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white p-5 shadow-xl transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            <AlertDialog.Title className="text-base font-semibold text-neutral-900">{opts?.title}</AlertDialog.Title>
            {opts?.description && (
              <AlertDialog.Description className="mt-1.5 text-sm text-neutral-600">{opts.description}</AlertDialog.Description>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button variant={opts?.destructive ? "danger" : "primary"} onClick={() => settle(true)}>
                {opts?.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmCtx.Provider>
  );
}
