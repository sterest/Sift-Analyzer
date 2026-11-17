"use client";

import { useEffect, useState } from "react";

/** Chrome, Edge and Android fire this when the site can be installed. Safari doesn't, so it gets written instructions instead. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return; // Already running as an installed app.
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    // iPhone and iPad (iPadOS reports itself as a Mac with touch).
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    // Reading the user agent has to wait until the page is in the browser, so it can't be set during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(isIos);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (deferred) {
    return (
      <button type="button" className="linkbtn" onClick={async () => {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
      }}>Install the app</button>
    );
  }
  if (ios) {
    return (
      <span className="install-ios">
        <button type="button" className="linkbtn" aria-expanded={showIosHelp} onClick={() => setShowIosHelp((s) => !s)}>Install the app</button>
        {showIosHelp && <span className="install-help">In Safari, tap Share, then Add to Home Screen.</span>}
      </span>
    );
  }
  return null;
}
