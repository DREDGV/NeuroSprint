import { useEffect, useMemo, useState } from "react";

type PromptOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: PromptOutcome; platform: string }>;
}

function detectStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  const viaDisplayMode =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  return Boolean(viaDisplayMode || nav.standalone);
}

function detectIosPlatform(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

export function PwaStatusBar() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(detectStandalone);
  const [isIos] = useState(detectIosPlatform);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener(
      "beforeinstallprompt",
      onBeforeInstallPrompt as EventListener
    );

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener(
        "beforeinstallprompt",
        onBeforeInstallPrompt as EventListener
      );
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(!isInstalled && deferredPrompt),
    [deferredPrompt, isInstalled]
  );

  const showStatus = !isOnline || canInstall || (!isInstalled && isIos);

  async function handleInstallClick() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  if (!showStatus) {
    return null;
  }

  const statusText = !isOnline
    ? "Офлайн режим: интернет недоступен, приложение работает из локального кеша."
    : canInstall
      ? "Можно установить NeuroSprint на устройство."
      : "iPhone/iPad: Safari → Поделиться → На экран Домой.";

  return (
    <section
      className={`pwa-status-bar ${isOnline ? "is-online" : "is-offline"}`}
      data-testid="pwa-status-bar"
    >
      <p className="pwa-status-text">{statusText}</p>
      {canInstall ? (
        <button
          type="button"
          className="btn-secondary pwa-install-btn"
          onClick={() => void handleInstallClick()}
        >
          Установить приложение
        </button>
      ) : null}
    </section>
  );
}
