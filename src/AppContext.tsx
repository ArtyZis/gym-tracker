import { createContext, useContext } from "react";
import type { MutableRefObject } from "react";
import type { Data } from "./lib/store";
import type { RestTimerHandle } from "./components/RestTimer";

export interface AppCtx {
  data: Data;
  update: (fn: (draft: Data) => void) => void;
  toast: (msg: string, glow?: boolean) => void;
  rest: MutableRefObject<RestTimerHandle | null>;
  goTab: (tab: "today" | "program" | "analyze" | "progress" | "manage") => void;
}

export const AppContext = createContext<AppCtx | null>(null);

export const useApp = () => useContext(AppContext)!;
