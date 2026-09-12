"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
};

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(
  async () => false
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<(v: boolean) => void>(() => () => {});

  const confirm = useCallback((o: ConfirmOptions) => {
    setState(o);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const finish = (v: boolean) => {
    resolver(v);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 animate-in">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  state.danger
                    ? "bg-red-100 text-red-600 dark:bg-red-500/15"
                    : "bg-amber-100 text-amber-600 dark:bg-amber-500/15"
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              {state.title && (
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {state.title}
                </h3>
              )}
            </div>
            <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
              {state.message}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => finish(false)} className="btn-secondary">
                {t("cancel")}
              </button>
              <button
                onClick={() => finish(true)}
                className={state.danger ? "btn-danger" : "btn-primary"}
              >
                {state.confirmText ?? t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
