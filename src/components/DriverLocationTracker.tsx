"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, MapPinOff, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/Toast";

const POST_INTERVAL_MS = 25_000; // throttle uploads to ~every 25s

/**
 * Floating GPS control for signed-in drivers. When turned on it uses the
 * browser Geolocation API to watch the device position and uploads it to the
 * server on a throttle, so dispatchers can see where the driver is on the live
 * map. Sharing state is persisted server-side (Driver.gpsEnabled).
 */
export default function DriverLocationTracker({ driverId }: { driverId: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(false); // a real fix is being tracked

  const watchId = useRef<number | null>(null);
  const lastPost = useRef<number>(0);
  const latest = useRef<GeolocationCoordinates | null>(null);

  const send = useCallback(async (coords: GeolocationCoordinates) => {
    lastPost.current = Date.now();
    try {
      await fetch("/api/driver/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: coords.latitude,
          lng: coords.longitude,
          speed: coords.speed,
          heading: coords.heading,
        }),
      });
      setActive(true);
    } catch {
      /* offline — will retry on next fix */
    }
  }, []);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setActive(false);
  }, []);

  const startWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error(t("gpsUnsupported"));
      return;
    }
    if (watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        latest.current = pos.coords;
        if (Date.now() - lastPost.current >= POST_INTERVAL_MS || lastPost.current === 0) {
          send(pos.coords);
        }
      },
      () => {
        toast.error(t("gpsDenied"));
        setActive(false);
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 20_000 }
    );
  }, [send, t, toast]);

  // Load persisted sharing state, resume tracking if it was on.
  useEffect(() => {
    let mounted = true;
    fetch("/api/driver/location")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (mounted && d?.location?.gpsEnabled) {
          setEnabled(true);
          startWatch();
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
      stopWatch();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  // Heartbeat: make sure a fix is uploaded at least every interval.
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      if (latest.current) send(latest.current);
    }, POST_INTERVAL_MS);
    return () => clearInterval(id);
  }, [enabled, send]);

  async function toggle() {
    setBusy(true);
    const next = !enabled;
    try {
      await fetch("/api/driver/location", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      setEnabled(next);
      if (next) {
        startWatch();
        toast.success(t("gpsOn"));
      } else {
        stopWatch();
        toast.success(t("gpsOff"));
      }
    } catch {
      toast.error(t("somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <button
        onClick={toggle}
        disabled={busy}
        className={`flex items-center gap-2 rounded-full py-2.5 pl-3 pr-4 text-sm font-semibold shadow-pop transition-all active:scale-95 ${
          enabled
            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
            : "border border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        }`}
        title={t("gpsSharing")}
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : enabled ? (
            <>
              {active && (
                <span className="absolute inline-flex h-3 w-3 rounded-full bg-white/70 animate-ping2" />
              )}
              <MapPin size={16} />
            </>
          ) : (
            <MapPinOff size={16} />
          )}
        </span>
        {enabled ? t("gpsLive") : t("gpsShareLocation")}
      </button>
    </div>
  );
}
