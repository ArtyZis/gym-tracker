import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AppContext } from "./AppContext";
import type { Data } from "./lib/store";
import { DAYS, JS_DAYS, createDefault, dayName, store } from "./lib/store";
import { locale, setLang, t } from "./lib/i18n";
import { setSoundEnabled } from "./lib/sound";
import { resolveAccent } from "./lib/accent";
import { ensureStartedAt } from "./lib/premium";
import { readProgramFromUrl } from "./lib/programLink";
import { cycleLen, isLoop, todaySlot } from "./lib/loop";
import IncomingProgram from "./components/IncomingProgram";
import TodayView from "./components/TodayView";
import ProgramView from "./components/ProgramView";
import AnalyzerView from "./components/AnalyzerView";
import ProgressView from "./components/ProgressView";
import ManageView from "./components/ManageView";
import RestTimer from "./components/RestTimer";
import SystemNotice from "./components/SystemNotice";
import type { SystemNoticeData } from "./components/SystemNotice";
import type { RestTimerHandle } from "./components/RestTimer";

type TabId = "today" | "program" | "analyze" | "progress" | "manage";

// label เป็นฟังก์ชันเพราะต้องอ่านภาษา ณ ตอน render ไม่ใช่ตอนโหลดโมดูล
const TABS: { id: TabId; label: () => string; icon: ReactNode }[] = [
  { id: "today", label: () => t("วันนี้", "Today"), icon: <path d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" /> },
  {
    id: "program",
    label: () => t("ตาราง", "Program"),
    icon: (
      <>
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M8 2v4M16 2v4M3 10h18" />
      </>
    ),
  },
  {
    id: "analyze",
    label: () => t("วิเคราะห์", "Analyze"),
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
    label: () => t("ก้าวหน้า", "Progress"),
    icon: (
      <>
        <path d="M3 17l5-5 4 4 8-8" />
        <path d="M15 8h5v5" />
      </>
    ),
  },
  {
    id: "manage",
    label: () => t("จัดการ", "Manage"),
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
  const [noticeState, setNoticeState] = useState<SystemNoticeData | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const rest = useRef<RestTimerHandle | null>(null);
  const storageOk = useMemo(() => store.works(), []);
  // เปิดแอปมาจากลิงก์โปรแกรมของโค้ช — อ่านครั้งเดียวตอน mount
  const [incoming, setIncoming] = useState<string | null>(() => readProgramFromUrl());

  // ตั้งภาษาให้โมดูล i18n ก่อนลูกทุกตัว render — ตั้งใจทำใน render body ไม่ใช่ useEffect
  //
  // useEffect ทำงาน "หลัง" ลูก render เสร็จ ถ้ารอ effect เฟรมแรกหลังสลับภาษาจะยังเป็น
  // ภาษาเก่าแล้วค่อยกระพริบเปลี่ยน การเซ็ตตัวแปรค่าเดิมซ้ำๆ ไม่มีผลข้างเคียง (idempotent)
  // จึงปลอดภัยที่จะทำตรงนี้
  setLang(data.settings.lang ?? "th");

  useEffect(() => {
    store.save(data);
  }, [data]);

  // บอกเบราว์เซอร์/screen reader ว่าหน้านี้ภาษาอะไร — มีผลกับการตัดคำและการอ่านออกเสียง
  useEffect(() => {
    document.documentElement.lang = data.settings.lang ?? "th";
  }, [data.settings.lang]);

  // ตั้งวันเริ่มใช้ครั้งแรก — ใช้นับช่วงทดลองรุ่น pro
  useEffect(() => {
    if (!data.settings.startedAt) setData((cur) => structuredClone({ ...cur, settings: { ...cur.settings, startedAt: new Date().toISOString() } }));
  }, [data.settings.startedAt]);

  // เปิด/ปิดเสียงตามการตั้งค่า (undefined = เปิด)
  useEffect(() => {
    setSoundEnabled(data.settings.soundEnabled !== false);
  }, [data.settings.soundEnabled]);

  // สีธีม (accent) — set ลง --acc ที่ root, undefined = cyan เดิม
  useEffect(() => {
    document.documentElement.style.setProperty("--acc", resolveAccent(data.settings.accent));
  }, [data.settings.accent]);

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

  const notice = useCallback((n: SystemNoticeData) => setNoticeState(n), []);

  const goTab = useCallback((t: TabId) => {
    setTab(t);
    window.scrollTo({ top: 0 });
  }, []);

  const now = new Date();

  return (
    <AppContext.Provider value={{ data, update, toast, notice, rest, goTab }}>
      <div className="mx-auto max-w-[520px] flex flex-col relative" style={{ minHeight: "100dvh" }}>
        <header
          className="px-4 pb-3 flex items-center justify-between gap-2"
          style={{ paddingTop: "calc(18px + env(safe-area-inset-top))" }}
        >
          <div className="min-w-0 flex-1 flex items-center gap-2.5">
            {/* โลโก้ tile + glow — ไอคอนบาร์เบลชุดเดียวกับ favicon */}
            <div
              className="w-[38px] h-[38px] rounded-xl shrink-0 flex items-center justify-center"
              style={{
                background: "linear-gradient(150deg,#0e1a2e,#060b14)",
                border: "1px solid color-mix(in srgb, var(--acc) 22%, transparent)",
                boxShadow: "0 0 16px var(--acc-18), inset 0 1px 0 #bfe6ff26",
              }}
            >
              <svg viewBox="0 0 180 180" width="22" height="22">
                <g stroke="var(--acc)" strokeWidth="12" strokeLinecap="round" fill="none" style={{ filter: "drop-shadow(0 0 3px var(--acc))" }}>
                  <path d="M50 70v40M130 70v40M32 82v16M148 82v16M50 90h80" />
                </g>
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-mono2 text-[8.5px] tracking-[.28em] uppercase" style={{ color: "#4b8bb0" }}>
                Hypertrophy System
              </div>
              <h1 className="font-disp font-bold text-[17px] leading-none tracking-wide" style={{ color: "var(--ink)" }}>
                RANK<span style={{ color: "var(--acc)" }}>FORGE</span>
              </h1>
            </div>
          </div>
          {/* สลับภาษาอยู่บนหัวแอป ไม่ได้ซ่อนในหน้าตั้งค่า —
              คนที่เปิดมาแล้วอ่านไทยไม่ออกจะหาปุ่มที่อยู่ใต้เมนูชื่อ "จัดการ" ไม่เจอ
              ปุ่มโชว์ภาษา "อีกอัน" ที่จะได้ กดครั้งเดียวจบ ไม่ต้องมีเมนูให้เลือก */}
          <button
            onClick={() =>
              update((d) => {
                d.settings.lang = (d.settings.lang ?? "th") === "th" ? "en" : "th";
              })
            }
            className="font-mono2 text-[10px] font-bold shrink-0 px-2.5 py-[7px] tracking-wider"
            style={{
              clipPath: "var(--cut-path-sm)",
              background: "rgba(10,20,31,.5)",
              border: "1px solid var(--edge)",
              color: "var(--mut)",
              backdropFilter: "blur(8px)",
            }}
            /* ป้ายบอกว่ากดแล้วจะได้ภาษาอะไร จึงเขียนด้วย "ภาษาปลายทาง" ไม่ใช่ภาษาปัจจุบัน */
            aria-label={t("Switch to English", "เปลี่ยนเป็นภาษาไทย")} // i18n-ok
          >
            {t("EN", "ไทย")} {/* i18n-ok — ปุ่มภาษาเขียนด้วยภาษาที่จะเปลี่ยนไป */}
          </button>

          <div
            className="text-center shrink-0"
            style={{
              padding: "6px 11px",
              clipPath: "var(--cut-path-sm)",
              background: "rgba(10,20,31,.5)",
              border: "1px solid var(--edge)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div className="font-disp font-bold text-[14px] leading-none" style={{ color: "var(--ink)" }}>
              {isLoop(data)
                ? t(`วันที่ ${DAYS.indexOf(todaySlot(data)) + 1}/${cycleLen(data)}`, `Day ${DAYS.indexOf(todaySlot(data)) + 1}/${cycleLen(data)}`)
                : dayName(JS_DAYS[now.getDay()])}
            </div>
            <div className="font-mono2 text-[8.5px] mt-[3px]" style={{ color: "var(--dim)" }}>
              {now.toLocaleDateString(locale(), { day: "numeric", month: "short", year: "2-digit" })}
            </div>
          </div>
        </header>

        {!storageOk && (
          <div
            className="mx-4 mb-2 px-4 py-2.5 rounded-xl text-[12px] leading-relaxed"
            style={{ background: "rgba(255,107,107,.10)", border: "1px solid rgba(255,107,107,.35)", color: "#FFC9C9" }}
          >
            {t(
              "เบราว์เซอร์นี้เก็บข้อมูลไม่ได้ (อาจอยู่ในโหมดส่วนตัว) — ข้อมูลจะหายเมื่อปิดหน้า",
              "This browser can't save data (private mode?) — everything is lost when you close the tab",
            )}
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

        <SystemNotice notice={noticeState} onClose={() => setNoticeState(null)} />

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[520px] z-30 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
          <div className="glass flex gap-0.5 p-[7px]">
            {TABS.map((tb) => {
              const on = tab === tb.id;
              return (
                <button
                  key={tb.id}
                  onClick={() => {
                    setTab(tb.id);
                    window.scrollTo({ top: 0 });
                  }}
                  className="flex-1 flex flex-col items-center gap-1 py-2 cut-sm transition-all"
                  style={
                    on
                      ? {
                          color: "var(--acc)",
                          background: "linear-gradient(180deg, var(--acc-24), color-mix(in srgb, var(--blue) 7%, transparent))",
                          boxShadow: "inset 0 0 0 1px var(--acc-40), 0 0 16px -2px var(--acc-40)",
                        }
                      : { color: "#48607e" }
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {tb.icon}
                  </svg>
                  <span className="font-mono2 text-[8px] tracking-[.02em]">{tb.label()}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {incoming && <IncomingProgram code={incoming} onClose={() => setIncoming(null)} />}

        {toastState && (
          <div
            className="fixed left-0 right-0 z-50 flex justify-center px-4 pointer-events-none"
            style={{ bottom: "calc(150px + env(safe-area-inset-bottom))" }}
          >
            <div
              className={`px-5 py-2.5 rounded-full font-disp font-semibold text-[13px] text-center rise ${toastState.glow ? "edge-glow" : ""}`}
              style={{
                background: toastState.glow ? "linear-gradient(180deg, var(--acc), var(--acc-2))" : "rgba(10,20,34,.94)",
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
