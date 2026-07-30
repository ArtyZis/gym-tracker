import { createContext, useContext } from "react";
import type { MutableRefObject } from "react";
import type { Data } from "./lib/store";
import type { RestTimerHandle } from "./components/RestTimer";
import type { SystemNoticeData } from "./components/SystemNotice";

export interface AppCtx {
  data: Data;
  update: (fn: (draft: Data) => void) => void;
  toast: (msg: string, glow?: boolean) => void;
  /** หน้าต่างระบบเต็มจอ — ใช้เฉพาะเหตุการณ์ใหญ่ (PR / เล่นครบวัน) ไม่ใช่แทน toast ทั่วไป */
  notice: (n: SystemNoticeData) => void;
  rest: MutableRefObject<RestTimerHandle | null>;
  goTab: (tab: "today" | "program" | "analyze" | "progress" | "manage") => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export const useApp = () => useContext(AppContext)!;
