import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppContext } from "./AppContext";
import type { Data } from "./lib/store";
import { DAY_TH, JS_DAYS, createDefault, store } from "./lib/store";
import { setSoundEnabled } from "./lib/sound";
import TodayView from "./components/TodayView";
import ProgramView from "./components/ProgramView";
import AnalyzerView from "./components/AnalyzerView";
import ProgressView from "./components/ProgressView";
import ManageView from "./components/ManageView";
import RestTimer from "./components/RestTimer";
import type { RestTimerHandle } from "./components/RestTimer";

type TabId = "today" | "program" | "analyze" | "progress" | "manage";

const TABS: { id: TabId; label: string; icon: ReactNode }[] = [
  { id: "today", label: "วันนี้", icon: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" /> },
  {
    id: "program",
    label: "ตาราง",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
  },
  {
    id: "analyze",
    label: "วิเคราะห์",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 8v4l3 2" />
        <path d="M17 3l4 4-4 0z" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    id: "progress",
    label: "ก้าวหน้า",
    icon: (
      <>
        <path d="M3 17l5-5 4 4 8-8" />
        <path d="M15 8h5v5" />
      </>
    ),
  },
  {
    id: "manage",
    label: "จัดการ",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </>
    ),
  },
];

interface Toast {
  msg: string;
  glow: boolean;
}

export default function App() {
  const [data, setData] = useState<Data>(() => store.load() ?? createDefault());
  const [tab, setTab] = useState<TabId>("today");
  const [toastState, setToastState] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const rest = useRef<RestTimerHandle | null>(null);
  const storageOk = useMemo(() => store.works(), []);

  useEffect(() => {
    store.save(data);
  }, [data]);

  // เปิด/ปิดเสียงตามการตั้งค่า (undefined = เปิด)
  useEffect(() => {
    setSoundEnabled(data.settings.soundEnabled !== false);
  }, [data.settings.soundEnabled]);

  const update = useCallback((fn: (draft: Data) => void) => {
    setData((cur) => {
      const next = structuredClone(cur);
      fn(next);
      return next;
    });
  }, []);

  const toast = useCallback((msg: string, glow = false) => {
    setToastState({ msg, glow });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastState(null), glow ? 2600 : 1900);
  }, []);

  const now = new Date();

  return (
    <AppContext.Provider value={{ data, update, toast, rest }}>
      <div className="mx-auto max-w-[520px] flex flex-col relative" style={{ minHeight: "100dvh" }}>
        <header
          className="px-5 pb-3 flex items-start justify-between gap-3"
          style={{ paddingTop: "calc(18px + env(safe-area-inset-top))" }}
        >
          <div className="min-w-0 flex-1">
            <div className="font-mono2 text-[9.5px] tracking-[.24em] uppercase" style={{ color: "var(--cyan-dim)" }}>
              Hypertrophy System
            </div>
            <h1
              className="font-disp font-bold text-[19px] min-[400px]:text-[22px] leading-tight tracking-wide text-glow break-words"
              style={{ color: "var(--ink)" }}
            >
              GYM TRACKER BY ARTYZ
            </h1>
          </div>
          <div className="text-right shrink-0">
            <div className="font-disp font-semibold text-[14px]" style={{ color: "var(--cyan)" }}>
              {DAY_TH[JS_DAYS[now.getDay()]]}
            </div>
            <div className="font-mono2 text-[9.5px] mt-0.5" style={{ color: "var(--dim)" }}>
              {now.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
            </div>
          </div>
        </header>

        {!storageOk && (
          <div
            className="mx-4 mb-2 px-4 py-2.5 rounded-xl text-[12px] leading-relaxed"
            style={{ background: "rgba(255,107,107,.10)", border: "1px solid rgba(255,107,107,.35)", color: "#FFC9C9" }}
          >
            เบราว์เซอร์นี้เก็บข้อมูลไม่ได้ (อาจอยู่ในโหมดส่วนตัว) — ข้อมูลจะหายเมื่อปิดหน้า
          </div>
        )}

        <main className="flex-1 px-4 pb-[118px]">
          {tab === "today" && <TodayView />}
          {tab === "program" && <ProgramView />}
          {tab === "analyze" && <AnalyzerView />}
          {tab === "progress" && <ProgressView />}
          {tab === "manage" && <ManageView />}
        </main>

        <RestTimer ref={rest} />

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
          <div className="glass flex px-1 py-1.5" style={{ borderRadius: 20 }}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  window.scrollTo({ top: 0 });
                }}
                className="flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl transition-colors"
                style={tab === t.id ? { color: "var(--cyan)", background: "rgba(79,216,255,.10)" } : { color: "var(--dim)" }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-[19px] h-[19px]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {t.icon}
                </svg>
                <span className="font-mono2 text-[8.5px]">{t.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {toastState && (
          <div
            className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
            style={{ bottom: "calc(150px + env(safe-area-inset-bottom))" }}
          >
            <div
              className={`px-5 py-2.5 rounded-full font-disp font-semibold text-[13px] text-center rise ${toastState.glow ? "edge-glow" : ""}`}
              style={{
                background: toastState.glow ? "linear-gradient(180deg,#4FD8FF,#3D9BDC)" : "rgba(10,20,34,.94)",
                color: toastState.glow ? "#03131C" : "var(--cyan)",
                border: toastState.glow ? "none" : "1px solid var(--edge-hi)",
                backdropFilter: "blur(10px)",
                maxWidth: "100%",
              }}
            >
              {toastState.msg}
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}
