"use client";

import { useEffect, useState } from "react";
import { Brand } from "./brand";

type SplashPhase = "visible" | "leaving" | "hidden";

export function MobileSplash() {
  const [phase, setPhase] = useState<SplashPhase>("visible");

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setPhase("leaving"), 850);
    const hideTimer = window.setTimeout(() => setPhase("hidden"), 1150);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div className={`mobile-splash ${phase === "leaving" ? "leaving" : ""}`} aria-hidden="true">
      <div className="mobile-splash-content">
        <Brand className="mobile-splash-brand" />
        <p>A little clarity, every day.</p>
        <div className="mobile-splash-progress">
          <span />
        </div>
      </div>
    </div>
  );
}
