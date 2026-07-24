// พยากรณ์ PR ครั้งถัดไปด้วย linear regression ง่ายๆ จากน้ำหนักสูงสุดต่อเซสชัน

import type { Data, Exercise, SetLog } from "./store";

export interface Forecast {
  slopePerWeek: number; // kg ต่อสัปดาห์
  current: number; // น้ำหนักสูงสุดล่าสุด
  in2w: number;
  in4w: number;
  points: number; // จำนวนเซสชันที่ใช้คำนวณ
}

export function forecastPR(data: Data, ex: Exercise): Forecast | null {
  if (ex.type !== "weight") return null;
  const sessions = (data.history[ex.id] || [])
    .map((s) => ({
      date: s.date,
      top: Math.max(0, ...(s.sets.filter(Boolean) as SetLog[]).map((st) => st.weight || 0)),
    }))
    .filter((s) => s.top > 0)
    .slice(-10);
  if (sessions.length < 4) return null;

  const t0 = new Date(sessions[0].date + "T00:00:00").getTime();
  const xs = sessions.map((s) => (new Date(s.date + "T00:00:00").getTime() - t0) / 86400000);
  const ys = sessions.map((s) => s.top);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den; // kg/วัน
  const intercept = my - slope * mx;
  const lastX = xs[n - 1];
  const current = ys[n - 1];
  const inc = ex.inc || 2.5;

  const predict = (days: number) => {
    const raw = intercept + slope * (lastX + days);
    // ปัดตาม increment ของท่า และไม่พยากรณ์ต่ำกว่าน้ำหนักล่าสุด (ขาลงให้ไปดูเทรนด์เอง)
    return Math.max(current, Math.round(raw / (inc / 2)) * (inc / 2));
  };

  return {
    slopePerWeek: +(slope * 7).toFixed(2),
    current,
    in2w: +predict(14).toFixed(1),
    in4w: +predict(28).toFixed(1),
    points: n,
  };
}
