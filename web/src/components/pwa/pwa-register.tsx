"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* Sin SW no hay prompt en algunos navegadores; la app sigue funcionando. */
    });
  }, []);

  return null;
}
