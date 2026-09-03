"use client";

import { useEffect } from "react";

// Evita loop de reload caso algo dê errado (ex.: SW falhando em cadeia).
const RELOAD_FLAG = "sw-reloaded-once";

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("Falha ao registrar Service Worker:", err));

    // Sem isso, a 1ª carga da página (ou qualquer carga após o SW ser
    // atualizado) NÃO é controlada pelo Service Worker ainda — então a
    // busca de BIN do Payment Brick vai direto para api.mercadopago.com,
    // ignorando o proxy /api/mercadopago/bin-search, e cai no bloqueio da
    // rede corporativa (causa raiz do "malformed_card_bin_settings").
    //
    // Recarregamos UMA vez assim que o SW assume o controle, para garantir
    // que toda chamada de bin-search já passe pelo proxy.
    if (!navigator.serviceWorker.controller) {
      const onControllerChange = () => {
        if (sessionStorage.getItem(RELOAD_FLAG)) return;
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        onControllerChange
      );
      return () =>
        navigator.serviceWorker.removeEventListener(
          "controllerchange",
          onControllerChange
        );
    }
  }, []);

  return null;
}
