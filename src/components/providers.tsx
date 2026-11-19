"use client";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { createContext, useContext, useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type Device = {
  online: boolean;
  standalone: boolean;
  iosSafari: boolean;
  install: InstallEvent | null;
};
const DeviceContext = createContext<Device>({
  online: true,
  standalone: false,
  iosSafari: false,
  install: null,
});
export const useDevice = () => useContext(DeviceContext);
export function Providers({ children }: { children: React.ReactNode }) {
  const [device, setDevice] = useState<Device>({
    online: true,
    standalone: false,
    iosSafari: false,
    install: null,
  });
  const [update, setUpdate] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    const media = matchMedia("(display-mode: standalone)");
    const sync = () =>
      setDevice(d => ({
        ...d,
        online: navigator.onLine,
        standalone:
          media.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone,
        iosSafari:
          /iPad|iPhone|iPod/.test(navigator.userAgent) &&
          /Safari/.test(navigator.userAgent) &&
          !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent),
      }));
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    media.addEventListener("change", sync);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setDevice(d => ({ ...d, install: event as InstallEvent }));
    };
    const onInstalled = () => setDevice(d => ({ ...d, install: null, standalone: true }));
    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    let disposed = false;
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then(reg => {
          if (disposed) return;
          if (reg.waiting) setUpdate(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller)
                setUpdate(worker);
            });
          });
          void reg.update().catch(() => {});
        })
        .catch(() => {});
    }
    return () => {
      disposed = true;
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      media.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  function applyUpdate() {
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), {
      once: true,
    });
    update?.postMessage({ type: "SKIP_WAITING" });
  }
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <DeviceContext.Provider value={device}>
          {children}
          {update && (
            <div className="update-banner" role="status">
              <span>A fresh version of Moni is ready.</span>
              <button onClick={applyUpdate}>Update & reload</button>
            </div>
          )}
        </DeviceContext.Provider>
      </MotionConfig>
    </ThemeProvider>
  );
}
