import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';

export const AutoUpdateBanner: React.FC = () => {
  const [initialBuildTime, setInitialBuildTime] = useState<number | null>(null);
  const [newVersionDetected, setNewVersionDetected] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(4);
  const [isManuallyChecking, setIsManuallyChecking] = useState<boolean>(false);

  const getVersionUrl = () => {
    const path = window.location.pathname;
    const dir = path.endsWith('/') ? path : path.substring(0, path.lastIndexOf('/') + 1);
    return `${window.location.origin}${dir}version.json?t=${Date.now()}`;
  };

  // Fetch initial version on mount
  useEffect(() => {
    let isMounted = true;
    const fetchInitialVersion = async () => {
      try {
        const res = await fetch(getVersionUrl(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.buildTime) {
            setInitialBuildTime(data.buildTime);
          }
        }
      } catch (err) {
        // Ignore fetch errors during initial load
      }
    };

    fetchInitialVersion();
    return () => { isMounted = false; };
  }, []);

  // Poll version every 20 seconds
  useEffect(() => {
    if (!initialBuildTime) return;

    const checkVersion = async () => {
      try {
        const res = await fetch(getVersionUrl(), { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.buildTime && data.buildTime > initialBuildTime + 2000) {
            setNewVersionDetected(true);
          }
        }
      } catch (err) {
        // Ignore periodic network errors
      }
    };

    const interval = setInterval(checkVersion, 20000);
    return () => clearInterval(interval);
  }, [initialBuildTime]);

  // Handle countdown and auto-reload when new version is detected
  useEffect(() => {
    if (!newVersionDetected) return;

    if (countdown <= 0) {
      window.location.reload();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [newVersionDetected, countdown]);

  const handleManualCheck = async () => {
    setIsManuallyChecking(true);
    try {
      const res = await fetch(getVersionUrl(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (initialBuildTime && data.buildTime && data.buildTime > initialBuildTime + 2000) {
          setNewVersionDetected(true);
        } else {
          // Hard reload if user explicitly asked
          window.location.reload();
        }
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    } finally {
      setIsManuallyChecking(false);
    }
  };

  if (!newVersionDetected) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 via-emerald-500 to-cyan-500 text-slate-950 px-4 py-2.5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2 text-xs font-black sm:text-sm">
        <Sparkles className="w-4 h-4 text-slate-950 animate-spin" />
        <span>🚀 Nieuwe versie geüpload op GitHub! De pagina wordt over <strong>{countdown} seconden</strong> automatisch vernieuwd...</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-lg transition shadow-md flex items-center gap-1 active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
          <span>Nu Herladen!</span>
        </button>
      </div>
    </div>
  );
};
