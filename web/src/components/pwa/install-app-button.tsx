"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandaloneDisplay());
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
      setHint(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onInstall = useCallback(async () => {
    setHint(null);
    if (installEvent) {
      setBusy(true);
      try {
        await installEvent.prompt();
        const choice = await installEvent.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
          setInstallEvent(null);
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setHint("En iPhone/iPad: botón Compartir → «Añadir a pantalla de inicio».");
      return;
    }
    if (/firefox/.test(ua)) {
      setHint("En Firefox: menú ≡ → Instalar.");
      return;
    }
    setHint(
      "En Chrome o Edge: menú ⋮ (arriba a la derecha) → «Instalar aplicación» o «Instalar BORDADOS ANSERMA»."
    );
  }, [installEvent]);

  if (installed) return null;

  return (
    <section className="card card-pad flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent)]">
          <Smartphone className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-[15px] font-bold tracking-tight text-[var(--ink)]">Instalar app</h2>
          <p className="mt-0.5 text-[13px] text-[var(--muted)]">
            Acceso directo en Android o PC, como una app sin pasar por la tienda.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
        <Button type="button" variant="accent" size="sm" className="h-10" disabled={busy} onClick={() => void onInstall()}>
          <Download className="h-4 w-4" aria-hidden />
          {busy ? "Abriendo…" : "Instalar app"}
        </Button>
        {hint && <p className="max-w-xs text-xs text-[var(--muted)] sm:text-right">{hint}</p>}
      </div>
    </section>
  );
}
