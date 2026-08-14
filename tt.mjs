// src/lib/i18n.ts
var current = "th";
function isEN() {
  return current === "en";
}
function t(th, en) {
  return current === "en" ? en : th;
}
function pick(th, en, k) {
  return current === "en" ? en[k] : th[k];
}

// src/lib/store.ts
var DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var DAY_TH = {
  mon: "\u0E08\u0E31\u0E19\u0E17\u0E23\u0E4C",
  tue: "\u0E2D\u0E31\u0E07\u0E04\u0E32\u0E23",
  wed: "\u0E1E\u0E38\u0E18",
  thu: "\u0E1E\u0E24\u0E2B\u0E31\u0E2A",
  fri: "\u0E28\u0E38\u0E01\u0E23\u0E4C",
  sat: "\u0E40\u0E2A\u0E32\u0E23\u0E4C",
  sun: "\u0E2D\u0E32\u0E17\u0E34\u0E15\u0E22\u0E4C"
};
var DAY_EN = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday"
};
var dayName = (d) => pick(DAY_TH, DAY_EN, d);
var uid = () => "ex_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
var todayStr = (d = /* @__PURE__ */ new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var DEFAULT_DAY_LABELS = {
  mon: "",
  tue: "",
  wed: "",
  thu: "",
  fri: "",
  sat: "",
  sun: ""
};
var DEFAULT_EXERCISES = [];
function createDefault() {
  return {
    dayLabels: { ...DEFAULT_DAY_LABELS },
    exercises: DEFAULT_EXERCISES.map((e, i) => ({ ...e, id: uid() + i, order: i })),
    history: {},
    bodyweight: [],
    bodyScans: [],
    settings: { autoRest: true, restDefault: 90, barWeight: 20 }
  };
}
function createEmpty() {
  return {
    dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
    exercises: [],
    history: {},
    historyArchive: {},
    bodyweight: [],
    bodyScans: []
  };
}
var isObj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var MAX_EXERCISES = 500;
var MAX_NAME_LEN = 200;
var MAX_SETS = 50;
var MAX_REPS = 9999;
var MAX_MAKEUP_DAYS = 800;
var MAX_RIR = 5;
var num = (v, lo, hi, dflt) => typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
var str = (v, max = MAX_NAME_LEN) => typeof v === "string" ? v.slice(0, max) : "";
var VALID_TYPES = ["weight", "bodyweight", "time"];
function cleanExercise(e) {
  if (!isObj(e)) return null;
  const id = str(e.id, 120);
  const name = str(e.name);
  if (!id || !name) return null;
  if (!DAYS.includes(e.day)) return null;
  const out = {
    id,
    name,
    day: e.day,
    type: VALID_TYPES.includes(e.type) ? e.type : "weight",
    sets: Math.round(num(e.sets, 1, MAX_SETS, 3)),
    rmin: Math.round(num(e.rmin, 0, MAX_REPS, 8)),
    rmax: Math.round(num(e.rmax, 0, MAX_REPS, 12))
  };
  if (e.inc !== void 0) out.inc = num(e.inc, 0.01, 1e3, 2.5);
  if (e.unit !== void 0) out.unit = str(e.unit, 20);
  if (e.amrap !== void 0) out.amrap = !!e.amrap;
  if (e.order !== void 0) out.order = num(e.order, -1e6, 1e6, 0);
  if (e.restSec !== void 0) out.restSec = Math.round(num(e.restSec, 0, 3600, 90));
  if (e.machine !== void 0) out.machine = !!e.machine;
  if (e.barKg !== void 0) out.barKg = num(e.barKg, 0, 500, 20);
  if (e.seededTarget !== void 0) out.seededTarget = num(e.seededTarget, 0, 1e5, 0);
  return out;
}
var cleanExercises = (arr) => (Array.isArray(arr) ? arr : []).slice(0, MAX_EXERCISES).map(cleanExercise).filter((x) => x !== null);
function cleanSetLog(s) {
  if (s === null || s === void 0) return null;
  if (!isObj(s)) return null;
  const out = {};
  if (s.weight !== void 0) out.weight = num(s.weight, 0, 1e5, 0);
  if (s.reps !== void 0) out.reps = Math.round(num(s.reps, 0, MAX_REPS, 0));
  if (s.duration !== void 0) out.duration = Math.round(num(s.duration, 0, 86400, 0));
  if (s.at !== void 0) out.at = num(s.at, 0, 4e12, 0);
  if (s.rir !== void 0) out.rir = Math.round(num(s.rir, 0, MAX_RIR, 0));
  return out;
}
var cleanSessions = (arr) => (Array.isArray(arr) ? arr : []).filter((s) => isObj(s) && typeof s.date === "string" && Array.isArray(s.sets)).map((s) => ({ date: s.date.slice(0, 32), sets: s.sets.slice(0, MAX_SETS).map(cleanSetLog) }));
function cleanDayLabels(m) {
  const out = { ...DEFAULT_DAY_LABELS };
  if (!isObj(m)) return out;
  for (const k of DAYS) if (typeof m[k] === "string") out[k] = m[k].slice(0, 60);
  return out;
}
function cleanHistoryMap(m) {
  if (!isObj(m)) return {};
  const out = {};
  for (const k of Object.keys(m)) {
    if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
    const sessions = cleanSessions(m[k]);
    if (sessions.length) out[k] = sessions;
  }
  return out;
}
function normalizeData(d) {
  if (!isObj(d) || !Array.isArray(d.exercises)) return null;
  if (!isObj(d.settings)) d.settings = { autoRest: true, restDefault: 90, barWeight: 20 };
  if (typeof d.settings.restDefault !== "number") d.settings.restDefault = 90;
  if (typeof d.settings.barWeight !== "number") d.settings.barWeight = 20;
  d.settings.restDefault = num(d.settings.restDefault, 5, 3600, 90);
  d.settings.barWeight = num(d.settings.barWeight, 0, 500, 20);
  if (d.settings.countBarWeight !== void 0 && typeof d.settings.countBarWeight !== "boolean")
    d.settings.countBarWeight = void 0;
  if (d.settings.minPlateKg !== void 0) d.settings.minPlateKg = num(d.settings.minPlateKg, 0.5, 25, 1.25);
  if (d.settings.accent !== void 0 && typeof d.settings.accent !== "string") d.settings.accent = void 0;
  d.exercises = cleanExercises(d.exercises);
  d.history = cleanHistoryMap(d.history);
  d.historyArchive = cleanHistoryMap(d.historyArchive);
  d.bodyweight = (Array.isArray(d.bodyweight) ? d.bodyweight : []).filter((e) => isObj(e) && typeof e.date === "string" && typeof e.kg === "number" && Number.isFinite(e.kg)).map((e) => ({ date: e.date.slice(0, 32), kg: num(e.kg, 0, 1e3, 0) }));
  d.bodyScans = (Array.isArray(d.bodyScans) ? d.bodyScans : []).filter((e) => isObj(e) && typeof e.date === "string").map((e) => {
    const o = { date: e.date.slice(0, 32) };
    if (typeof e.weightKg === "number") o.weightKg = num(e.weightKg, 0, 1e3, 0);
    if (typeof e.fatPct === "number") o.fatPct = num(e.fatPct, 0, 100, 0);
    if (typeof e.muscleKg === "number") o.muscleKg = num(e.muscleKg, 0, 1e3, 0);
    return o;
  });
  d.savedPrograms = (Array.isArray(d.savedPrograms) ? d.savedPrograms : []).filter((p) => isObj(p) && typeof p.id === "string").slice(0, 100).map((p) => ({
    id: str(p.id, 120),
    name: str(p.name) || t("\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21", "Program"),
    savedAt: str(p.savedAt, 40),
    exercises: cleanExercises(p.exercises),
    dayLabels: cleanDayLabels(p.dayLabels)
  }));
  d.dayLabels = cleanDayLabels(d.dayLabels);
  if (d.swaps !== void 0) {
    if (!isObj(d.swaps) || typeof d.swaps.date !== "string" || !isObj(d.swaps.map)) d.swaps = void 0;
    else if (d.swaps.extras !== void 0 && !Array.isArray(d.swaps.extras)) d.swaps.extras = void 0;
  }
  if (d.profile !== void 0 && !isObj(d.profile)) d.profile = void 0;
  if (d.profile && !Array.isArray(d.profile.injuries)) d.profile.injuries = void 0;
  if (d.constraints !== void 0 && !isObj(d.constraints)) d.constraints = void 0;
  if (d.dayEquip !== void 0 && !isObj(d.dayEquip)) d.dayEquip = void 0;
  else if (d.dayEquip) {
    for (const k of Object.keys(d.dayEquip)) if (!Array.isArray(d.dayEquip[k])) delete d.dayEquip[k];
  }
  if (d.dayWindows !== void 0 && !isObj(d.dayWindows)) d.dayWindows = void 0;
  else if (d.dayWindows)
    for (const k of Object.keys(d.dayWindows)) {
      const w = d.dayWindows[k];
      if (!isObj(w) || typeof w.start !== "string" || typeof w.end !== "string") delete d.dayWindows[k];
    }
  if (!Array.isArray(d.sleepLog)) d.sleepLog = void 0;
  else d.sleepLog = d.sleepLog.filter((s) => isObj(s) && typeof s.date === "string" && typeof s.hours === "number");
  if (!Array.isArray(d.nutritionLog)) d.nutritionLog = void 0;
  else d.nutritionLog = d.nutritionLog.filter((n) => isObj(n) && typeof n.date === "string" && typeof n.hit === "boolean");
  if (d.dayFirstCommitment !== void 0 && !isObj(d.dayFirstCommitment)) d.dayFirstCommitment = void 0;
  else if (d.dayFirstCommitment) {
    for (const k of Object.keys(d.dayFirstCommitment)) if (typeof d.dayFirstCommitment[k] !== "string") delete d.dayFirstCommitment[k];
  }
  if (!isObj(d.dayNotes)) d.dayNotes = void 0;
  else {
    const notes = {};
    for (const k of Object.keys(d.dayNotes)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (typeof d.dayNotes[k] === "string" && d.dayNotes[k].trim()) notes[k.slice(0, 32)] = d.dayNotes[k].slice(0, 2e3);
    }
    d.dayNotes = Object.keys(notes).length ? notes : void 0;
  }
  if (d.loop !== void 0) {
    const ok2 = isObj(d.loop) && typeof d.loop.len === "number" && d.loop.len >= 2 && d.loop.len <= 7 && typeof d.loop.anchor === "string" && Number.isFinite(Date.parse(d.loop.anchor));
    if (!ok2) d.loop = void 0;
  }
  if (!isObj(d.exNames)) d.exNames = void 0;
  else {
    const names = {};
    for (const k of Object.keys(d.exNames).slice(0, MAX_EXERCISES)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      const v = d.exNames[k];
      if (isObj(v) && typeof v.name === "string" && v.name.trim())
        names[k] = { name: v.name.slice(0, MAX_NAME_LEN), unit: typeof v.unit === "string" ? v.unit.slice(0, 12) : void 0 };
    }
    d.exNames = Object.keys(names).length ? names : void 0;
  }
  if (!isObj(d.makeup)) d.makeup = void 0;
  else {
    const mk = {};
    for (const k of Object.keys(d.makeup).slice(0, MAX_MAKEUP_DAYS)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const slots = (Array.isArray(d.makeup[k]) ? d.makeup[k] : []).filter((s) => DAYS.includes(s));
      if (slots.length) mk[k] = [...new Set(slots)];
    }
    d.makeup = Object.keys(mk).length ? mk : void 0;
  }
  if (d.profile && !isObj(d.profile.nutrition)) d.profile.nutrition = void 0;
  if (d.profile?.nutrition && (typeof d.profile.nutrition.kcal !== "number" || typeof d.profile.nutrition.protein !== "number"))
    d.profile.nutrition = void 0;
  if (d.swaps && d.swaps.date !== todayStr()) {
    archiveSwapLogs(d);
    d.swaps = void 0;
  }
  return d;
}
var exercisesForDay = (data, day) => data.exercises.filter((e) => e.day === day).sort((a, b) => (a.order || 0) - (b.order || 0));
var normName = (s) => s.trim().toLowerCase().replace(/\s+/g, " ");
function mergeSessions(a, b) {
  const byDate = /* @__PURE__ */ new Map();
  for (const s of [...a, ...b]) {
    const prev = byDate.get(s.date);
    const cnt = (x) => x.sets.filter(Boolean).length;
    if (!prev || cnt(s) >= cnt(prev)) byDate.set(s.date, s);
  }
  return [...byDate.values()].sort((x, y) => x.date.localeCompare(y.date));
}
function archiveOne(d, ex) {
  const logs = d.history[ex.id];
  if (!logs?.length) return;
  if (!d.historyArchive) d.historyArchive = {};
  const key = normName(ex.name);
  d.historyArchive[key] = mergeSessions(d.historyArchive[key] || [], logs);
}
function restoreHistory(d, ex) {
  const arch = d.historyArchive?.[normName(ex.name)];
  if (arch?.length && !d.history[ex.id]?.length) d.history[ex.id] = structuredClone(arch);
}
var swapIdFor = (origId, name) => origId + "~" + normName(name).replace(/\s+/g, "_");
var extraIdFor = (name) => "x~" + normName(name).replace(/\s+/g, "_");
function archiveSwapLogs(d) {
  if (!d.swaps) return;
  if (!d.historyArchive) d.historyArchive = {};
  const keep = (name, logs) => {
    if (!logs?.length) return;
    const key = normName(name);
    d.historyArchive[key] = mergeSessions(d.historyArchive[key] || [], logs);
  };
  for (const [origId, t2] of Object.entries(d.swaps.map)) keep(t2.name, d.history[swapIdFor(origId, t2.name)]);
  for (const t2 of d.swaps.extras ?? []) keep(t2.name, d.history[extraIdFor(t2.name)]);
}

// src/lib/muscles.ts
var MUSCLE_KEYS = [
  "chest",
  "back",
  "front_delts",
  "side_delts",
  "rear_delts",
  "biceps",
  "triceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core"
];
var MUSCLE_TH = {
  chest: "\u0E2D\u0E01",
  back: "\u0E2B\u0E25\u0E31\u0E07",
  front_delts: "\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E19\u0E49\u0E32",
  side_delts: "\u0E44\u0E2B\u0E25\u0E48\u0E02\u0E49\u0E32\u0E07",
  rear_delts: "\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E25\u0E31\u0E07",
  biceps: "\u0E44\u0E1A\u0E40\u0E0B\u0E1B",
  triceps: "\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B",
  forearms: "\u0E1B\u0E25\u0E32\u0E22\u0E41\u0E02\u0E19",
  quads: "\u0E15\u0E49\u0E19\u0E02\u0E32\u0E2B\u0E19\u0E49\u0E32",
  hamstrings: "\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32",
  glutes: "\u0E01\u0E49\u0E19",
  calves: "\u0E19\u0E48\u0E2D\u0E07",
  core: "\u0E41\u0E01\u0E19\u0E01\u0E25\u0E32\u0E07"
};
var MUSCLE_EN = {
  chest: "Chest",
  back: "Back",
  front_delts: "Front delts",
  side_delts: "Side delts",
  rear_delts: "Rear delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core"
};
var muscleName = (k) => pick(MUSCLE_TH, MUSCLE_EN, k);
var SMALL_MUSCLES = ["calves", "forearms", "rear_delts", "side_delts"];
var INDIRECT_MUSCLES = ["forearms"];
var MAJOR_MUSCLES = ["chest", "back", "quads", "hamstrings", "glutes"];
var MINUTES_PER_SET = {
  high: 4,
  // compound หนัก พัก 2-3 นาที
  moderate: 3,
  // compound ปานกลาง พัก 1.5-2 นาที
  low: 2
  // isolation พัก 60-90 วิ
};
var VOLUME_TARGETS = {
  beginner: { min: 6, max: 12, warnLow: 5, warnHigh: 16 },
  intermediate: { min: 10, max: 18, warnLow: 8, warnHigh: 22 },
  advanced: { min: 14, max: 20, warnLow: 10, warnHigh: 25 }
};
var VOLUME_CEILING_MUL = {
  back: 1.6,
  quads: 1.3,
  glutes: 1.3,
  hamstrings: 1.2
};
var MAX_SETS_PER_MUSCLE_PER_SESSION = 10;
var DEFAULT_MAX_SETS_PER_SESSION = 30;
var DEFAULT_SESSION_TIME_CAP_MINUTES = 90;
var MIN_RECOVERY_HOURS = 48;
var HEAVY_HIT_SETS = 4;

// src/lib/exerciseDB.ts
var tipOf = (tpl) => isEN() ? tpl.tipEn ?? tpl.tip : tpl.tip;
var EXERCISE_DB = [
  // ══════════ อก ══════════
  { name: "Barbell Bench Press", th: "\u0E40\u0E1A\u0E19\u0E0A\u0E4C\u0E40\u0E1E\u0E23\u0E2A", alias: "\u0E19\u0E2D\u0E19\u0E14\u0E31\u0E19\u0E1A\u0E32\u0E23\u0E4C \u0E14\u0E31\u0E19\u0E2D\u0E01", equip: ["barbell", "bench", "rack"], pri: ["chest"], sec: ["triceps", "front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "\u0E2A\u0E30\u0E1A\u0E31\u0E01\u0E2B\u0E38\u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E44\u0E27\u0E49 \u0E25\u0E14\u0E1A\u0E32\u0E23\u0E4C\u0E41\u0E15\u0E30\u0E2D\u0E01\u0E0A\u0E48\u0E27\u0E07\u0E2B\u0E31\u0E27\u0E19\u0E21 \u0E28\u0E2D\u0E01\u0E17\u0E33\u0E21\u0E38\u0E21 ~45\xB0 \u0E01\u0E31\u0E1A\u0E25\u0E33\u0E15\u0E31\u0E27", tipEn: "Shoulder blades pinned back, bar touches at nipple line, elbows ~45\xB0 from the torso." },
  { name: "Incline Barbell Press", th: "\u0E40\u0E1A\u0E19\u0E0A\u0E4C\u0E40\u0E2D\u0E35\u0E22\u0E07 (\u0E2D\u0E01\u0E1A\u0E19)", alias: "\u0E2D\u0E34\u0E19\u0E44\u0E04\u0E25\u0E19\u0E4C \u0E1A\u0E32\u0E23\u0E4C", equip: ["barbell", "bench", "rack"], pri: ["chest"], sec: ["front_delts", "triceps"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, avoid: ["shoulder"], tip: "\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1A\u0E32\u0E30 30-45\xB0 \u0E0A\u0E31\u0E19\u0E40\u0E01\u0E34\u0E19\u0E08\u0E30\u0E01\u0E25\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E25\u0E48\u0E19\u0E44\u0E2B\u0E25\u0E48", tipEn: "Set the bench 30-45\xB0 \u2014 any steeper and it turns into a shoulder press." },
  { name: "Decline Barbell Press", th: "\u0E40\u0E1A\u0E19\u0E0A\u0E4C\u0E2B\u0E31\u0E27\u0E25\u0E07 (\u0E2D\u0E01\u0E25\u0E48\u0E32\u0E07)", alias: "\u0E14\u0E35\u0E44\u0E04\u0E25\u0E19\u0E4C", equip: ["barbell", "bench", "rack"], pri: ["chest"], sec: ["triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01\u0E2A\u0E48\u0E27\u0E19\u0E25\u0E48\u0E32\u0E07 \u0E0A\u0E48\u0E27\u0E07\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E2A\u0E31\u0E49\u0E19\u0E01\u0E27\u0E48\u0E32 \u0E22\u0E01\u0E44\u0E14\u0E49\u0E2B\u0E19\u0E31\u0E01\u0E01\u0E27\u0E48\u0E32\u0E17\u0E48\u0E32\u0E23\u0E32\u0E1A", tipEn: "Hits the lower chest. Shorter range of motion, so you can go heavier than flat." },
  { name: "Dumbbell Bench Press", th: "\u0E40\u0E1A\u0E19\u0E0A\u0E4C\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", alias: "\u0E19\u0E2D\u0E19\u0E14\u0E31\u0E19\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", equip: ["dumbbell", "bench"], pri: ["chest"], sec: ["triceps", "front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 12, tip: "\u0E0A\u0E48\u0E27\u0E07\u0E22\u0E37\u0E14\u0E01\u0E27\u0E49\u0E32\u0E07\u0E01\u0E27\u0E48\u0E32\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25 \u0E25\u0E07\u0E0A\u0E49\u0E32\u0E43\u0E2B\u0E49\u0E2D\u0E01\u0E22\u0E37\u0E14\u0E2A\u0E38\u0E14", tipEn: "Deeper stretch than a barbell \u2014 lower slowly and let the chest open all the way." },
  { name: "Incline DB Press", th: "\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E40\u0E2D\u0E35\u0E22\u0E07 (\u0E2D\u0E01\u0E1A\u0E19)", alias: "\u0E2D\u0E34\u0E19\u0E44\u0E04\u0E25\u0E19\u0E4C\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", equip: ["dumbbell", "bench"], pri: ["chest"], sec: ["front_delts", "triceps"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, tip: "\u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01\u0E1A\u0E19 \u0E2D\u0E22\u0E48\u0E32\u0E43\u0E2B\u0E49\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E0A\u0E19\u0E01\u0E31\u0E19\u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19 \u0E04\u0E07\u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E44\u0E27\u0E49", tipEn: "Upper chest focus. Don't clank the dumbbells together at the top; keep tension on." },
  { name: "Dumbbell Fly", th: "\u0E1F\u0E25\u0E32\u0E22\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25 (\u0E01\u0E32\u0E07\u0E2D\u0E01)", alias: "\u0E01\u0E32\u0E07\u0E2D\u0E01 \u0E1A\u0E34\u0E19\u0E2D\u0E01", equip: ["dumbbell", "bench"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["shoulder"], tip: "\u0E07\u0E2D\u0E28\u0E2D\u0E01\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E04\u0E49\u0E32\u0E07\u0E44\u0E27\u0E49\u0E15\u0E25\u0E2D\u0E14 \u0E19\u0E36\u0E01\u0E20\u0E32\u0E1E\u0E01\u0E2D\u0E14\u0E15\u0E49\u0E19\u0E44\u0E21\u0E49 \u0E2B\u0E49\u0E32\u0E21\u0E07\u0E2D-\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E28\u0E2D\u0E01", tipEn: "Slight elbow bend held throughout \u2014 think hugging a tree, never bend and extend the elbow." },
  { name: "Incline Dumbbell Fly", th: "\u0E1F\u0E25\u0E32\u0E22\u0E40\u0E2D\u0E35\u0E22\u0E07", alias: "\u0E01\u0E32\u0E07\u0E2D\u0E01\u0E1A\u0E19", equip: ["dumbbell", "bench"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, avoid: ["shoulder"], tip: "\u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01\u0E1A\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E22\u0E37\u0E14 \u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E1A\u0E32\u0E01\u0E27\u0E48\u0E32\u0E17\u0E48\u0E32\u0E23\u0E32\u0E1A", tipEn: "Upper chest in the stretched position. Go lighter than the flat version." },
  { name: "Cable Fly", th: "\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25\u0E1F\u0E25\u0E32\u0E22 (\u0E44\u0E02\u0E27\u0E49\u0E2A\u0E32\u0E22)", alias: "\u0E04\u0E23\u0E2D\u0E2A\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C \u0E44\u0E02\u0E27\u0E49\u0E2D\u0E01", equip: ["cable"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E04\u0E07\u0E17\u0E35\u0E48\u0E17\u0E31\u0E49\u0E07\u0E0A\u0E48\u0E27\u0E07 \u0E1A\u0E35\u0E1A\u0E2D\u0E01\u0E04\u0E49\u0E32\u0E07 1 \u0E27\u0E34\u0E15\u0E2D\u0E19\u0E2A\u0E32\u0E22\u0E44\u0E02\u0E27\u0E49\u0E01\u0E31\u0E19", tipEn: "Constant tension through the whole range. Squeeze for a second where the cables cross." },
  { name: "Low Cable Fly", th: "\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25\u0E1F\u0E25\u0E32\u0E22\u0E25\u0E48\u0E32\u0E07\u0E02\u0E36\u0E49\u0E19\u0E1A\u0E19", alias: "\u0E44\u0E02\u0E27\u0E49\u0E2D\u0E01\u0E1A\u0E19", equip: ["cable"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E14\u0E36\u0E07\u0E08\u0E32\u0E01\u0E25\u0E48\u0E32\u0E07\u0E02\u0E36\u0E49\u0E19\u0E1A\u0E19 \u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E19", tipEn: "Pull from low to high to bias the upper chest." },
  { name: "Pec Deck", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E2B\u0E19\u0E35\u0E1A\u0E2D\u0E01", alias: "\u0E40\u0E1E\u0E04\u0E40\u0E14\u0E04 \u0E1A\u0E31\u0E15\u0E40\u0E15\u0E2D\u0E23\u0E4C\u0E1F\u0E25\u0E32\u0E22", equip: ["machine"], pri: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E48\u0E32\u0E1B\u0E34\u0E14\u0E17\u0E49\u0E32\u0E22 \u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E08\u0E31\u0E07\u0E2B\u0E27\u0E30\u0E01\u0E25\u0E31\u0E1A\u0E0A\u0E49\u0E32\u0E46", tipEn: "A good finisher \u2014 control the way back slowly." },
  { name: "Chest Press Machine", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E31\u0E19\u0E2D\u0E01", alias: "\u0E40\u0E0A\u0E2A\u0E40\u0E1E\u0E23\u0E2A", equip: ["machine"], pri: ["chest"], sec: ["triceps", "front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1A\u0E32\u0E30\u0E43\u0E2B\u0E49\u0E21\u0E37\u0E2D\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E01\u0E25\u0E32\u0E07\u0E2D\u0E01 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E01\u0E27\u0E48\u0E32\u0E1F\u0E23\u0E35\u0E40\u0E27\u0E17\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E25\u0E48\u0E19\u0E04\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27", tipEn: "Set the seat so the handles sit mid-chest. Safer than free weights when training alone." },
  { name: "Landmine Press", th: "\u0E41\u0E25\u0E19\u0E14\u0E4C\u0E44\u0E21\u0E19\u0E4C\u0E40\u0E1E\u0E23\u0E2A", alias: "\u0E14\u0E31\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E2D\u0E35\u0E22\u0E07", equip: ["barbell"], pri: ["chest", "front_delts"], sec: ["triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E1B\u0E25\u0E32\u0E22\u0E1A\u0E32\u0E23\u0E4C\u0E1B\u0E31\u0E01\u0E21\u0E38\u0E21\u0E2B\u0E49\u0E2D\u0E07 \u0E14\u0E31\u0E19\u0E02\u0E36\u0E49\u0E19\u0E40\u0E09\u0E35\u0E22\u0E07 \u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E01\u0E31\u0E1A\u0E2B\u0E31\u0E27\u0E44\u0E2B\u0E25\u0E48", tipEn: "Wedge the bar end in a corner and press up at an angle \u2014 very shoulder-friendly." },
  { name: "Push-up", th: "\u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19", alias: "\u0E14\u0E31\u0E19\u0E1E\u0E37\u0E49\u0E19", equip: ["bodyweight"], pri: ["chest"], sec: ["triceps", "front_delts", "core"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 25, avoid: ["wrist"], tip: "\u0E25\u0E33\u0E15\u0E31\u0E27\u0E15\u0E23\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E40\u0E01\u0E23\u0E47\u0E07\u0E17\u0E49\u0E2D\u0E07 \u0E2D\u0E22\u0E48\u0E32\u0E43\u0E2B\u0E49\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E15\u0E01", tipEn: "Body in one straight line, brace the abs, don't let the hips sag." },
  { name: "Wide Push-up", th: "\u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E21\u0E37\u0E2D\u0E01\u0E27\u0E49\u0E32\u0E07", alias: "\u0E14\u0E31\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E01\u0E27\u0E49\u0E32\u0E07", equip: ["bodyweight"], pri: ["chest"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["wrist", "shoulder"], tip: "\u0E21\u0E37\u0E2D\u0E01\u0E27\u0E49\u0E32\u0E07\u0E01\u0E27\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48 ~1.5 \u0E40\u0E17\u0E48\u0E32 \u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01\u0E14\u0E49\u0E32\u0E19\u0E19\u0E2D\u0E01", tipEn: "Hands about 1.5\xD7 shoulder width to bias the outer chest." },
  { name: "Decline Push-up", th: "\u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E40\u0E17\u0E49\u0E32\u0E2A\u0E39\u0E07", alias: "\u0E14\u0E31\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E22\u0E01\u0E02\u0E32", equip: ["bodyweight"], pri: ["chest"], sec: ["front_delts", "triceps"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["wrist"], tip: "\u0E22\u0E01\u0E40\u0E17\u0E49\u0E32\u0E2A\u0E39\u0E07\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01\u0E1A\u0E19 \u0E22\u0E34\u0E48\u0E07\u0E2A\u0E39\u0E07\u0E22\u0E34\u0E48\u0E07\u0E2B\u0E19\u0E31\u0E01", tipEn: "Feet elevated to hit the upper chest \u2014 the higher the feet, the harder it gets." },
  { name: "Dip", th: "\u0E14\u0E34\u0E1B (\u0E22\u0E31\u0E19\u0E15\u0E31\u0E27\u0E1A\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E04\u0E39\u0E48)", alias: "\u0E22\u0E31\u0E19\u0E15\u0E31\u0E27", equip: ["other", "bodyweight"], pri: ["chest", "triceps"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "high", type: "bodyweight", sets: 3, rmin: 6, rmax: 15, avoid: ["shoulder"], tip: "\u0E42\u0E19\u0E49\u0E21\u0E15\u0E31\u0E27\u0E44\u0E1B\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E19\u0E49\u0E19\u0E2D\u0E01 \u0E15\u0E31\u0E49\u0E07\u0E15\u0E31\u0E27\u0E15\u0E23\u0E07\u0E40\u0E19\u0E49\u0E19\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B", tipEn: "Lean forward for chest, stay upright for triceps." },
  // ══════════ หลัง ══════════
  { name: "Deadlift", th: "\u0E40\u0E14\u0E14\u0E25\u0E34\u0E1F\u0E15\u0E4C", alias: "\u0E14\u0E36\u0E07\u0E1E\u0E37\u0E49\u0E19 \u0E22\u0E01\u0E1A\u0E32\u0E23\u0E4C\u0E08\u0E32\u0E01\u0E1E\u0E37\u0E49\u0E19", equip: ["barbell"], pri: ["back", "glutes", "hamstrings"], sec: ["forearms", "quads"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 3, rmax: 6, avoid: ["lower_back"], tip: "\u0E2B\u0E25\u0E31\u0E07\u0E15\u0E23\u0E07\u0E15\u0E25\u0E2D\u0E14 \u0E14\u0E31\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22\u0E02\u0E32 \u0E1A\u0E32\u0E23\u0E4C\u0E0A\u0E34\u0E14\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E02\u0E49\u0E07 \u2014 \u0E17\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E01\u0E2A\u0E38\u0E14 \u0E1E\u0E31\u0E01\u0E43\u0E2B\u0E49\u0E40\u0E15\u0E47\u0E21", tipEn: "Flat back throughout, push the floor away with your legs, bar close to the shins \u2014 the heaviest lift here, rest fully." },
  { name: "Sumo Deadlift", th: "\u0E40\u0E14\u0E14\u0E25\u0E34\u0E1F\u0E15\u0E4C\u0E02\u0E32\u0E01\u0E27\u0E49\u0E32\u0E07", alias: "\u0E0B\u0E39\u0E42\u0E21\u0E48", equip: ["barbell"], pri: ["glutes", "back"], sec: ["quads", "hamstrings", "forearms"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 4, rmax: 6, avoid: ["lower_back"], tip: "\u0E22\u0E37\u0E19\u0E01\u0E27\u0E49\u0E32\u0E07 \u0E08\u0E31\u0E1A\u0E43\u0E19\u0E27\u0E07\u0E02\u0E32 \u0E25\u0E33\u0E15\u0E31\u0E27\u0E15\u0E31\u0E49\u0E07\u0E01\u0E27\u0E48\u0E32\u0E40\u0E14\u0E14\u0E1B\u0E01\u0E15\u0E34 \u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E01\u0E31\u0E1A\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07\u0E01\u0E27\u0E48\u0E32", tipEn: "Wide stance, hands inside the legs, more upright than conventional \u2014 easier on the lower back." },
  { name: "Rack Pull", th: "\u0E41\u0E23\u0E47\u0E04\u0E1E\u0E39\u0E25 (\u0E40\u0E14\u0E14\u0E04\u0E23\u0E36\u0E48\u0E07\u0E1A\u0E19)", alias: "\u0E14\u0E36\u0E07\u0E08\u0E32\u0E01\u0E41\u0E23\u0E47\u0E04", equip: ["barbell", "rack"], pri: ["back"], sec: ["glutes", "forearms"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E32\u0E01\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E40\u0E02\u0E48\u0E32 \u0E40\u0E19\u0E49\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E1A\u0E19\u0E02\u0E2D\u0E07\u0E40\u0E14\u0E14\u0E25\u0E34\u0E1F\u0E15\u0E4C \u0E22\u0E01\u0E2B\u0E19\u0E31\u0E01\u0E01\u0E27\u0E48\u0E32\u0E1B\u0E01\u0E15\u0E34\u0E44\u0E14\u0E49", tipEn: "Start from knee height to train the top half of the deadlift \u2014 you can go heavier than usual." },
  { name: "Barbell Row", th: "\u0E42\u0E23\u0E27\u0E4C\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25 (\u0E14\u0E36\u0E07\u0E2B\u0E25\u0E31\u0E07)", alias: "\u0E40\u0E1A\u0E19\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E42\u0E23\u0E27\u0E4C", equip: ["barbell"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "high", type: "weight", sets: 4, rmin: 6, rmax: 10, avoid: ["lower_back"], tip: "\u0E42\u0E19\u0E49\u0E21\u0E15\u0E31\u0E27 ~45\xB0 \u0E14\u0E36\u0E07\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E17\u0E49\u0E2D\u0E07\u0E19\u0E49\u0E2D\u0E22 \u0E1A\u0E35\u0E1A\u0E2A\u0E30\u0E1A\u0E31\u0E01\u0E2A\u0E38\u0E14", tipEn: "Torso at ~45\xB0, pull the bar to your lower stomach, squeeze the shoulder blades hard." },
  { name: "Pendlay Row", th: "\u0E40\u0E1E\u0E19\u0E14\u0E4C\u0E40\u0E25\u0E22\u0E4C\u0E42\u0E23\u0E27\u0E4C", alias: "\u0E42\u0E23\u0E27\u0E4C\u0E27\u0E32\u0E07\u0E1E\u0E37\u0E49\u0E19", equip: ["barbell"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "\u0E27\u0E32\u0E07\u0E1A\u0E32\u0E23\u0E4C\u0E41\u0E15\u0E30\u0E1E\u0E37\u0E49\u0E19\u0E17\u0E38\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07 \u0E23\u0E30\u0E40\u0E1A\u0E34\u0E14\u0E41\u0E23\u0E07\u0E02\u0E36\u0E49\u0E19\u0E40\u0E23\u0E47\u0E27 \u0E2B\u0E25\u0E31\u0E07\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19", tipEn: "Reset the bar on the floor every rep, explode up, back parallel to the ground." },
  { name: "T-Bar Row", th: "\u0E17\u0E35\u0E1A\u0E32\u0E23\u0E4C\u0E42\u0E23\u0E27\u0E4C", alias: "\u0E42\u0E23\u0E27\u0E4C\u0E17\u0E35\u0E1A\u0E32\u0E23\u0E4C \u0E14\u0E36\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E01\u0E14\u0E31\u0E19\u0E41\u0E1C\u0E48\u0E19\u0E23\u0E2D\u0E07 \u0E15\u0E31\u0E14\u0E01\u0E32\u0E23\u0E42\u0E01\u0E07\u0E14\u0E49\u0E27\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07 \u0E40\u0E19\u0E49\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E01\u0E25\u0E32\u0E07", tipEn: "Chest against the pad kills lower-back cheating \u2014 pure mid-back work." },
  { name: "Dumbbell Row", th: "\u0E42\u0E23\u0E27\u0E4C\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E02\u0E49\u0E32\u0E07\u0E40\u0E14\u0E35\u0E22\u0E27", alias: "\u0E14\u0E36\u0E07\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", equip: ["dumbbell", "bench"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E28\u0E2D\u0E01\u0E44\u0E1B\u0E14\u0E49\u0E32\u0E19\u0E2B\u0E25\u0E31\u0E07 \u0E2D\u0E22\u0E48\u0E32\u0E1A\u0E34\u0E14\u0E25\u0E33\u0E15\u0E31\u0E27\u0E0A\u0E48\u0E27\u0E22", tipEn: "Drive the elbow back and don't twist the torso to help." },
  { name: "Seated Cable Row", th: "\u0E42\u0E23\u0E27\u0E4C\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25\u0E19\u0E31\u0E48\u0E07\u0E14\u0E36\u0E07", alias: "\u0E14\u0E36\u0E07\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25\u0E19\u0E31\u0E48\u0E07", equip: ["cable"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E2D\u0E01\u0E15\u0E31\u0E49\u0E07 \u0E14\u0E36\u0E07\u0E40\u0E02\u0E49\u0E32\u0E17\u0E49\u0E2D\u0E07 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E01\u0E25\u0E31\u0E1A\u0E43\u0E2B\u0E49\u0E2A\u0E30\u0E1A\u0E31\u0E01\u0E22\u0E37\u0E14\u0E2A\u0E38\u0E14", tipEn: "Chest tall, pull to the stomach, let the shoulder blades stretch on the way out." },
  { name: "Chest Supported Row", th: "\u0E42\u0E23\u0E27\u0E4C\u0E1E\u0E34\u0E07\u0E2D\u0E01", alias: "\u0E42\u0E23\u0E27\u0E4C\u0E40\u0E1A\u0E32\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E07", equip: ["machine", "bench"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E2D\u0E01\u0E41\u0E19\u0E1A\u0E40\u0E1A\u0E32\u0E30 \u0E15\u0E31\u0E14\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E2A\u0E21\u0E01\u0E32\u0E23 \u0E40\u0E25\u0E48\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E49\u0E27\u0E19", tipEn: "Chest on the pad takes the lower back out of the equation \u2014 back only." },
  { name: "Machine Row", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E36\u0E07\u0E2B\u0E25\u0E31\u0E07", alias: "\u0E42\u0E23\u0E27\u0E4C\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "horizontal_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E04\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19 \u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E16\u0E39\u0E01\u0E07\u0E48\u0E32\u0E22\u0E01\u0E27\u0E48\u0E32\u0E1F\u0E23\u0E35\u0E40\u0E27\u0E17", tipEn: "Good for beginners \u2014 much easier to get the form right than free weights." },
  { name: "Lat Pulldown", th: "\u0E41\u0E25\u0E17\u0E1E\u0E39\u0E25\u0E14\u0E32\u0E27\u0E19\u0E4C (\u0E14\u0E36\u0E07\u0E1A\u0E19\u0E25\u0E07\u0E25\u0E48\u0E32\u0E07)", alias: "\u0E14\u0E36\u0E07\u0E1A\u0E32\u0E23\u0E4C\u0E25\u0E07 \u0E14\u0E36\u0E07\u0E1A\u0E19", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E28\u0E2D\u0E01\u0E25\u0E07\u0E2B\u0E32\u0E2A\u0E30\u0E42\u0E1E\u0E01 \u0E2D\u0E22\u0E48\u0E32\u0E40\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E21\u0E32\u0E01\u0E40\u0E01\u0E34\u0E19", tipEn: "Drive the elbows down toward your hips, don't lean back too far." },
  { name: "Close Grip Pulldown", th: "\u0E1E\u0E39\u0E25\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E08\u0E31\u0E1A\u0E41\u0E04\u0E1A", alias: "\u0E14\u0E36\u0E07\u0E1A\u0E19\u0E21\u0E37\u0E2D\u0E0A\u0E34\u0E14", equip: ["machine"], pri: ["back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E08\u0E31\u0E1A\u0E41\u0E04\u0E1A/\u0E2B\u0E07\u0E32\u0E22\u0E21\u0E37\u0E2D \u0E40\u0E19\u0E49\u0E19\u0E41\u0E25\u0E17\u0E0A\u0E48\u0E27\u0E07\u0E25\u0E48\u0E32\u0E07\u0E41\u0E25\u0E30\u0E44\u0E1A\u0E40\u0E0B\u0E1B", tipEn: "Narrow or supinated grip biases the lower lats and biceps." },
  { name: "Pull-up", th: "\u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1E (\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E48\u0E33\u0E21\u0E37\u0E2D)", alias: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D \u0E42\u0E2B\u0E19\u0E1A\u0E32\u0E23\u0E4C \u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1B", equip: ["pullup_bar", "bodyweight"], pri: ["back"], sec: ["biceps", "forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true, tip: "\u0E08\u0E31\u0E1A\u0E01\u0E27\u0E49\u0E32\u0E07\u0E01\u0E27\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22 \u0E14\u0E36\u0E07\u0E08\u0E19\u0E04\u0E32\u0E07\u0E1E\u0E49\u0E19\u0E1A\u0E32\u0E23\u0E4C \u0E25\u0E07\u0E0A\u0E49\u0E32\u0E08\u0E19\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07\u0E2A\u0E38\u0E14", tipEn: "Grip slightly wider than shoulders, chin over the bar, lower slowly to full arm extension." },
  { name: "Wide Grip Pull-up", th: "\u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1E\u0E08\u0E31\u0E1A\u0E01\u0E27\u0E49\u0E32\u0E07 (\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D)", alias: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D \u0E42\u0E2B\u0E19\u0E1A\u0E32\u0E23\u0E4C", equip: ["pullup_bar", "bodyweight"], pri: ["back"], sec: ["biceps", "forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 4, rmin: 1, rmax: 999, amrap: true, tip: "\u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E32\u0E01\u0E41\u0E02\u0E27\u0E19\u0E2A\u0E38\u0E14 \u0E14\u0E36\u0E07\u0E08\u0E19\u0E04\u0E32\u0E07\u0E1E\u0E49\u0E19\u0E1A\u0E32\u0E23\u0E4C \u0E25\u0E07\u0E0A\u0E49\u0E32", tipEn: "Start from a dead hang, pull until the chin clears the bar, lower slowly." },
  { name: "Chin-up", th: "\u0E0A\u0E34\u0E19\u0E2D\u0E31\u0E1E (\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E2B\u0E07\u0E32\u0E22\u0E21\u0E37\u0E2D)", alias: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E2B\u0E07\u0E32\u0E22", equip: ["pullup_bar", "bodyweight"], pri: ["back", "biceps"], sec: ["forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, avoid: ["elbow"], tip: "\u0E2B\u0E07\u0E32\u0E22\u0E21\u0E37\u0E2D \u0E44\u0E14\u0E49\u0E44\u0E1A\u0E40\u0E0B\u0E1B\u0E40\u0E22\u0E2D\u0E30\u0E01\u0E27\u0E48\u0E32\u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1E", tipEn: "Underhand grip brings in a lot more biceps than a pull-up." },
  { name: "Neutral Grip Pull-up", th: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E2B\u0E31\u0E19\u0E40\u0E02\u0E49\u0E32", alias: "\u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1E\u0E19\u0E34\u0E27\u0E17\u0E23\u0E31\u0E25", equip: ["pullup_bar", "bodyweight"], pri: ["back"], sec: ["biceps", "forearms"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "\u0E1D\u0E48\u0E32\u0E21\u0E37\u0E2D\u0E2B\u0E31\u0E19\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E32\u0E01\u0E31\u0E19 \u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E01\u0E31\u0E1A\u0E02\u0E49\u0E2D\u0E44\u0E2B\u0E25\u0E48\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14", tipEn: "Palms facing each other \u2014 the friendliest version for your shoulders." },
  { name: "Australian Row", th: "\u0E42\u0E23\u0E27\u0E4C\u0E19\u0E2D\u0E19 (\u0E14\u0E36\u0E07\u0E15\u0E31\u0E27\u0E43\u0E15\u0E49\u0E1A\u0E32\u0E23\u0E4C)", alias: "\u0E2D\u0E34\u0E19\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E15\u0E47\u0E14\u0E42\u0E23\u0E27\u0E4C", equip: ["pullup_bar", "bodyweight"], pri: ["back"], sec: ["biceps", "rear_delts"], pattern: "horizontal_pull", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E17\u0E48\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E44\u0E1B\u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1E \u0E22\u0E34\u0E48\u0E07\u0E15\u0E31\u0E27\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E22\u0E34\u0E48\u0E07\u0E2B\u0E19\u0E31\u0E01", tipEn: "The stepping stone to pull-ups \u2014 the more horizontal you are, the harder it gets." },
  { name: "Straight Arm Pulldown", th: "\u0E14\u0E36\u0E07\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07", alias: "\u0E1E\u0E39\u0E25\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07", equip: ["cable"], pri: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07\u0E15\u0E25\u0E2D\u0E14 \u0E40\u0E19\u0E49\u0E19\u0E41\u0E25\u0E17\u0E25\u0E49\u0E27\u0E19 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E44\u0E1A\u0E40\u0E0B\u0E1B", tipEn: "Arms locked straight \u2014 lats only, no biceps." },
  { name: "Dumbbell Pullover", th: "\u0E1E\u0E39\u0E25\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C", alias: "\u0E22\u0E01\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E02\u0E49\u0E32\u0E21\u0E2B\u0E31\u0E27", equip: ["dumbbell", "bench"], pri: ["back"], sec: ["chest"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["shoulder"], tip: "\u0E22\u0E37\u0E14\u0E0B\u0E35\u0E48\u0E42\u0E04\u0E23\u0E07\u0E41\u0E25\u0E30\u0E41\u0E25\u0E17 \u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E0A\u0E48\u0E27\u0E07\u0E25\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E28\u0E35\u0E23\u0E29\u0E30", tipEn: "Stretches the ribcage and lats. Control the lowering phase behind your head." },
  { name: "Cable Pullover", th: "\u0E1E\u0E39\u0E25\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25 (\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07)", alias: "\u0E2A\u0E40\u0E15\u0E23\u0E17\u0E2D\u0E32\u0E23\u0E4C\u0E21\u0E1E\u0E39\u0E25\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C \u0E14\u0E36\u0E07\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07\u0E2A\u0E32\u0E22", equip: ["cable"], pri: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E41\u0E02\u0E19\u0E15\u0E23\u0E07\u0E15\u0E25\u0E2D\u0E14 \u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E04\u0E07\u0E17\u0E35\u0E48\u0E17\u0E38\u0E01\u0E0A\u0E48\u0E27\u0E07 \u0E40\u0E19\u0E49\u0E19\u0E41\u0E25\u0E17\u0E25\u0E49\u0E27\u0E19\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E44\u0E1A\u0E40\u0E0B\u0E1B", tipEn: "Arms stay straight, tension is constant throughout \u2014 lats only, no biceps." },
  { name: "Barbell Shrug", th: "\u0E0A\u0E23\u0E31\u0E01\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25 (\u0E22\u0E31\u0E01\u0E44\u0E2B\u0E25\u0E48)", alias: "\u0E22\u0E31\u0E01\u0E44\u0E2B\u0E25\u0E48 \u0E17\u0E23\u0E32\u0E1E\u0E35\u0E40\u0E0B\u0E35\u0E22\u0E2A", equip: ["barbell"], pri: ["back"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E22\u0E31\u0E01\u0E15\u0E23\u0E07\u0E02\u0E36\u0E49\u0E19 \u0E04\u0E49\u0E32\u0E07 1 \u0E27\u0E34 \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E21\u0E38\u0E19\u0E44\u0E2B\u0E25\u0E48", tipEn: "Shrug straight up, hold a second at the top \u2014 no shoulder rolling." },
  { name: "Dumbbell Shrug", th: "\u0E0A\u0E23\u0E31\u0E01\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", alias: "\u0E22\u0E31\u0E01\u0E44\u0E2B\u0E25\u0E48\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", equip: ["dumbbell"], pri: ["back"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 20, tip: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E2D\u0E34\u0E2A\u0E23\u0E30\u0E01\u0E27\u0E48\u0E32\u0E1A\u0E32\u0E23\u0E4C \u0E22\u0E31\u0E01\u0E43\u0E2B\u0E49\u0E2A\u0E38\u0E14", tipEn: "Freer range than a bar \u2014 shrug all the way up." },
  // ══════════ ไหล่ ══════════
  { name: "Overhead Press", th: "\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E2E\u0E14\u0E40\u0E1E\u0E23\u0E2A (\u0E14\u0E31\u0E19\u0E1A\u0E48\u0E32)", alias: "\u0E14\u0E31\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E2B\u0E31\u0E27 \u0E21\u0E34\u0E25\u0E34\u0E17\u0E32\u0E23\u0E35\u0E40\u0E1E\u0E23\u0E2A", equip: ["barbell", "rack"], pri: ["front_delts"], sec: ["triceps", "side_delts", "core"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "\u0E40\u0E01\u0E23\u0E47\u0E07\u0E01\u0E49\u0E19\u0E41\u0E25\u0E30\u0E17\u0E49\u0E2D\u0E07 \u0E14\u0E31\u0E19\u0E02\u0E36\u0E49\u0E19\u0E15\u0E23\u0E07\u0E2B\u0E31\u0E27 \u0E2B\u0E25\u0E31\u0E07\u0E44\u0E21\u0E48\u0E41\u0E2D\u0E48\u0E19", tipEn: "Squeeze glutes and abs, press straight overhead, don't arch the back." },
  { name: "Overhead Press (DB)", th: "\u0E14\u0E31\u0E19\u0E44\u0E2B\u0E25\u0E48\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", alias: "\u0E14\u0E31\u0E19\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E2B\u0E31\u0E27 shoulder press dumbbell shoulder press seated shoulder press", equip: ["dumbbell"], pri: ["front_delts"], sec: ["triceps", "side_delts"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["shoulder"], tip: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E04\u0E25\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E2B\u0E27\u0E2D\u0E34\u0E2A\u0E23\u0E30\u0E01\u0E27\u0E48\u0E32\u0E1A\u0E32\u0E23\u0E4C \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E01\u0E31\u0E1A\u0E04\u0E19\u0E44\u0E2B\u0E25\u0E48\u0E15\u0E34\u0E14", tipEn: "Freer path than a barbell \u2014 better if your shoulders are stiff." },
  { name: "Arnold Press", th: "\u0E2D\u0E32\u0E23\u0E4C\u0E42\u0E19\u0E25\u0E14\u0E4C\u0E40\u0E1E\u0E23\u0E2A", alias: "\u0E14\u0E31\u0E19\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E21\u0E38\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D", equip: ["dumbbell"], pri: ["front_delts", "side_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["shoulder"], tip: "\u0E2B\u0E21\u0E38\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E14\u0E31\u0E19 \u0E42\u0E14\u0E19\u0E44\u0E2B\u0E25\u0E48\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E41\u0E25\u0E30\u0E01\u0E25\u0E32\u0E07", tipEn: "Rotate the wrists as you press to hit both front and side delts." },
  { name: "Push Press", th: "\u0E1E\u0E38\u0E0A\u0E40\u0E1E\u0E23\u0E2A (\u0E43\u0E0A\u0E49\u0E02\u0E32\u0E0A\u0E48\u0E27\u0E22)", alias: "\u0E14\u0E31\u0E19\u0E1A\u0E48\u0E32\u0E43\u0E0A\u0E49\u0E02\u0E32", equip: ["barbell", "rack"], pri: ["front_delts"], sec: ["triceps", "quads"], pattern: "vertical_push", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["shoulder"], tip: "\u0E22\u0E48\u0E2D\u0E40\u0E02\u0E48\u0E32\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27\u0E23\u0E30\u0E40\u0E1A\u0E34\u0E14\u0E02\u0E36\u0E49\u0E19 \u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32\u0E40\u0E1E\u0E23\u0E2A\u0E1B\u0E01\u0E15\u0E34\u0E44\u0E14\u0E49", tipEn: "Small dip with the knees then explode up \u2014 lets you handle more than a strict press." },
  { name: "Lateral Raise", th: "\u0E01\u0E32\u0E07\u0E02\u0E49\u0E32\u0E07 (\u0E44\u0E2B\u0E25\u0E48\u0E01\u0E25\u0E32\u0E07)", alias: "\u0E22\u0E01\u0E02\u0E49\u0E32\u0E07 \u0E44\u0E0B\u0E14\u0E4C\u0E40\u0E23\u0E2A", equip: ["dumbbell"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "\u0E22\u0E01\u0E41\u0E04\u0E48\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E44\u0E2B\u0E25\u0E48 \u0E40\u0E2D\u0E35\u0E22\u0E07\u0E19\u0E34\u0E49\u0E27\u0E01\u0E49\u0E2D\u0E22\u0E02\u0E36\u0E49\u0E19\u0E19\u0E34\u0E14 \u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E1A\u0E32\u0E41\u0E15\u0E48\u0E04\u0E38\u0E21\u0E43\u0E2B\u0E49\u0E19\u0E34\u0E48\u0E07", tipEn: "Only to shoulder height, pinky tilted slightly up. Go light and control it." },
  { name: "Cable Lateral Raise", th: "\u0E01\u0E32\u0E07\u0E02\u0E49\u0E32\u0E07\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25", alias: "\u0E22\u0E01\u0E02\u0E49\u0E32\u0E07\u0E2A\u0E32\u0E22", equip: ["cable"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E04\u0E07\u0E17\u0E35\u0E48\u0E15\u0E25\u0E2D\u0E14\u0E0A\u0E48\u0E27\u0E07 \u0E14\u0E35\u0E01\u0E27\u0E48\u0E32\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E15\u0E23\u0E07\u0E0A\u0E48\u0E27\u0E07\u0E25\u0E48\u0E32\u0E07", tipEn: "Constant tension across the range \u2014 better than dumbbells at the bottom." },
  { name: "Machine Lateral Raise", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E01\u0E32\u0E07\u0E44\u0E2B\u0E25\u0E48", alias: "\u0E44\u0E2B\u0E25\u0E48\u0E01\u0E25\u0E32\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["side_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E04\u0E38\u0E21\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E07\u0E48\u0E32\u0E22 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E40\u0E25\u0E48\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E15\u0E2D\u0E19\u0E25\u0E49\u0E32\u0E41\u0E25\u0E49\u0E27", tipEn: "Easy to keep form, so you can push hard even when fatigued." },
  { name: "Front Raise", th: "\u0E22\u0E01\u0E2B\u0E19\u0E49\u0E32 (\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E19\u0E49\u0E32)", alias: "\u0E1F\u0E23\u0E2D\u0E19\u0E15\u0E4C\u0E40\u0E23\u0E2A", equip: ["dumbbell"], pri: ["front_delts"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E19\u0E49\u0E32\u0E21\u0E31\u0E01\u0E44\u0E14\u0E49\u0E1E\u0E2D\u0E41\u0E25\u0E49\u0E27\u0E08\u0E32\u0E01\u0E17\u0E48\u0E32\u0E14\u0E31\u0E19\u0E2D\u0E01 \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E25\u0E48\u0E19\u0E40\u0E22\u0E2D\u0E30", tipEn: "Front delts usually get plenty from pressing already \u2014 you don't need much of this." },
  { name: "Face Pull", th: "\u0E40\u0E1F\u0E0B\u0E1E\u0E39\u0E25 (\u0E14\u0E36\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E19\u0E49\u0E32)", alias: "\u0E14\u0E36\u0E07\u0E2B\u0E19\u0E49\u0E32 \u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E25\u0E31\u0E07", equip: ["cable"], pri: ["rear_delts"], sec: ["back"], pattern: "horizontal_pull", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E14\u0E36\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E1C\u0E32\u0E01 \u0E01\u0E32\u0E07\u0E28\u0E2D\u0E01\u0E2D\u0E2D\u0E01 \u0E41\u0E01\u0E49\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E48\u0E2D\u0E44\u0E14\u0E49\u0E14\u0E35\u0E21\u0E32\u0E01", tipEn: "Pull toward your forehead with elbows flared \u2014 excellent for rounded shoulders." },
  { name: "Rear Delt Fly", th: "\u0E01\u0E32\u0E07\u0E2B\u0E25\u0E31\u0E07 (\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E25\u0E31\u0E07)", alias: "\u0E23\u0E35\u0E40\u0E27\u0E34\u0E23\u0E4C\u0E2A\u0E1F\u0E25\u0E32\u0E22 \u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E25\u0E31\u0E07", equip: ["dumbbell"], pri: ["rear_delts"], sec: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E42\u0E19\u0E49\u0E21\u0E15\u0E31\u0E27\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19 \u0E22\u0E01\u0E2D\u0E2D\u0E01\u0E02\u0E49\u0E32\u0E07 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E02\u0E36\u0E49\u0E19\u0E1A\u0E19", tipEn: "Torso parallel to the floor, raise out to the sides, not upward." },
  { name: "Reverse Pec Deck", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E01\u0E32\u0E07\u0E2B\u0E25\u0E31\u0E07", alias: "\u0E40\u0E1E\u0E04\u0E40\u0E14\u0E04\u0E01\u0E25\u0E31\u0E1A\u0E14\u0E49\u0E32\u0E19 \u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["rear_delts"], sec: ["back"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E19\u0E31\u0E48\u0E07\u0E01\u0E25\u0E31\u0E1A\u0E14\u0E49\u0E32\u0E19\u0E01\u0E31\u0E1A\u0E17\u0E48\u0E32\u0E2B\u0E19\u0E35\u0E1A\u0E2D\u0E01 \u0E40\u0E19\u0E49\u0E19\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E49\u0E27\u0E19", tipEn: "Sit facing the pad \u2014 rear delts only." },
  { name: "Upright Row", th: "\u0E2D\u0E31\u0E1E\u0E44\u0E23\u0E17\u0E4C\u0E42\u0E23\u0E27\u0E4C (\u0E14\u0E36\u0E07\u0E15\u0E31\u0E49\u0E07)", alias: "\u0E14\u0E36\u0E07\u0E1A\u0E32\u0E23\u0E4C\u0E02\u0E36\u0E49\u0E19\u0E15\u0E23\u0E07", equip: ["barbell"], pri: ["side_delts"], sec: ["back", "biceps"], pattern: "isolation", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["shoulder"], tip: "\u0E08\u0E31\u0E1A\u0E01\u0E27\u0E49\u0E32\u0E07\u0E2B\u0E19\u0E48\u0E2D\u0E22\u0E25\u0E14\u0E01\u0E32\u0E23\u0E1A\u0E35\u0E1A\u0E02\u0E49\u0E2D\u0E44\u0E2B\u0E25\u0E48 \u0E14\u0E36\u0E07\u0E41\u0E04\u0E48\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E2D\u0E01", tipEn: "A slightly wider grip eases the shoulder impingement. Only pull to chest height." },
  { name: "Shoulder Press Machine", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E31\u0E19\u0E44\u0E2B\u0E25\u0E48", alias: "\u0E44\u0E2B\u0E25\u0E48\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["front_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, tip: "\u0E1B\u0E23\u0E31\u0E1A\u0E40\u0E1A\u0E32\u0E30\u0E43\u0E2B\u0E49\u0E21\u0E37\u0E2D\u0E08\u0E31\u0E1A\u0E23\u0E30\u0E14\u0E31\u0E1A\u0E2B\u0E39 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E40\u0E25\u0E48\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E04\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27", tipEn: "Set the seat so the handles are at ear height. Safe for heavy solo work." },
  { name: "Pike Push-up", th: "\u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E01\u0E49\u0E19\u0E42\u0E14\u0E48\u0E07", alias: "\u0E44\u0E1E\u0E04\u0E4C \u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E44\u0E2B\u0E25\u0E48", equip: ["bodyweight"], pri: ["front_delts"], sec: ["triceps"], pattern: "vertical_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, avoid: ["wrist", "shoulder"], tip: "\u0E22\u0E01\u0E01\u0E49\u0E19\u0E2A\u0E39\u0E07 \u0E28\u0E35\u0E23\u0E29\u0E30\u0E25\u0E07\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E21\u0E37\u0E2D \u2014 \u0E17\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E49\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C", tipEn: "Hips high, head lowers between the hands \u2014 a shoulder press with no equipment." },
  // ══════════ ไบเซป ══════════
  { name: "Barbell Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25", alias: "\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E1A\u0E32\u0E23\u0E4C \u0E21\u0E49\u0E27\u0E19\u0E41\u0E02\u0E19", equip: ["barbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["wrist", "elbow"], tip: "\u0E02\u0E49\u0E2D\u0E28\u0E2D\u0E01\u0E41\u0E19\u0E1A\u0E25\u0E33\u0E15\u0E31\u0E27 \u0E2B\u0E49\u0E32\u0E21\u0E40\u0E2B\u0E27\u0E35\u0E48\u0E22\u0E07\u0E2B\u0E25\u0E31\u0E07", tipEn: "Elbows against your sides, no swinging from the back." },
  { name: "EZ Bar Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E2B\u0E22\u0E31\u0E01", alias: "\u0E2D\u0E35\u0E0B\u0E35\u0E48\u0E1A\u0E32\u0E23\u0E4C", equip: ["barbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E1A\u0E32\u0E23\u0E4C\u0E2B\u0E22\u0E31\u0E01\u0E25\u0E14\u0E41\u0E23\u0E07\u0E1A\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E04\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E40\u0E08\u0E47\u0E1A\u0E08\u0E32\u0E01\u0E1A\u0E32\u0E23\u0E4C\u0E15\u0E23\u0E07", tipEn: "The bend cuts wrist torque \u2014 better if a straight bar bothers your wrists." },
  { name: "Dumbbell Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", alias: "\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", equip: ["dumbbell"], pri: ["biceps"], sec: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E2B\u0E07\u0E32\u0E22\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E15\u0E2D\u0E19\u0E02\u0E36\u0E49\u0E19\u0E2A\u0E38\u0E14 \u0E1A\u0E35\u0E1A\u0E44\u0E1A\u0E40\u0E0B\u0E1B\u0E04\u0E49\u0E32\u0E07", tipEn: "Supinate the wrist at the top and squeeze the biceps." },
  { name: "Incline DB Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E40\u0E2D\u0E35\u0E22\u0E07 (\u0E22\u0E37\u0E14\u0E44\u0E1A\u0E40\u0E0B\u0E1B)", alias: "\u0E2D\u0E34\u0E19\u0E44\u0E04\u0E25\u0E19\u0E4C\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25", equip: ["dumbbell", "bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E40\u0E1A\u0E32\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E07 45\xB0 \u0E41\u0E02\u0E19\u0E2B\u0E49\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E33\u0E15\u0E31\u0E27 = \u0E22\u0E37\u0E14\u0E44\u0E1A\u0E40\u0E0B\u0E1B\u0E2A\u0E38\u0E14", tipEn: "Bench at 45\xB0 with arms hanging behind you = maximum biceps stretch." },
  { name: "Hammer Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E04\u0E49\u0E2D\u0E19", alias: "\u0E41\u0E2E\u0E21\u0E40\u0E21\u0E2D\u0E23\u0E4C\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25", equip: ["dumbbell"], pri: ["biceps", "forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E08\u0E31\u0E1A\u0E41\u0E19\u0E27\u0E15\u0E31\u0E49\u0E07\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E16\u0E37\u0E2D\u0E04\u0E49\u0E2D\u0E19 \u0E42\u0E14\u0E19\u0E41\u0E02\u0E19\u0E17\u0E48\u0E2D\u0E19\u0E25\u0E48\u0E32\u0E07\u0E14\u0E49\u0E27\u0E22", tipEn: "Neutral grip like holding a hammer \u2014 hits the forearms too." },
  { name: "Preacher Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E1E\u0E32\u0E14\u0E40\u0E1A\u0E32\u0E30", alias: "\u0E1E\u0E23\u0E35\u0E0A\u0E40\u0E0A\u0E2D\u0E23\u0E4C", equip: ["barbell", "bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["elbow"], tip: "\u0E41\u0E02\u0E19\u0E1E\u0E32\u0E14\u0E40\u0E1A\u0E32\u0E30\u0E15\u0E25\u0E2D\u0E14 \u0E15\u0E31\u0E14\u0E01\u0E32\u0E23\u0E42\u0E01\u0E07 \u0E40\u0E19\u0E49\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E25\u0E48\u0E32\u0E07", tipEn: "Arms stay on the pad the whole time, no cheating, strong in the bottom range." },
  { name: "Cable Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25", alias: "\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E2A\u0E32\u0E22", equip: ["cable"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E44\u0E21\u0E48\u0E2B\u0E32\u0E22\u0E15\u0E2D\u0E19\u0E02\u0E36\u0E49\u0E19\u0E2A\u0E38\u0E14 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E1B\u0E34\u0E14\u0E17\u0E49\u0E32\u0E22", tipEn: "Tension doesn't disappear at the top \u2014 a good finisher." },
  { name: "Concentration Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E1E\u0E32\u0E14\u0E40\u0E02\u0E48\u0E32", alias: "\u0E04\u0E2D\u0E19\u0E40\u0E0B\u0E19\u0E40\u0E17\u0E23\u0E0A\u0E31\u0E48\u0E19", equip: ["dumbbell"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E28\u0E2D\u0E01\u0E22\u0E31\u0E19\u0E15\u0E49\u0E19\u0E02\u0E32 \u0E1A\u0E35\u0E1A\u0E2A\u0E38\u0E14\u0E15\u0E2D\u0E19\u0E1A\u0E19 \u0E40\u0E19\u0E49\u0E19\u0E1E\u0E35\u0E04\u0E44\u0E1A\u0E40\u0E0B\u0E1B", tipEn: "Elbow braced on the thigh, squeeze hard at the top for the biceps peak." },
  { name: "Spider Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E04\u0E27\u0E48\u0E33\u0E2B\u0E19\u0E49\u0E32", alias: "\u0E2A\u0E44\u0E1B\u0E40\u0E14\u0E2D\u0E23\u0E4C\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25", equip: ["dumbbell", "bench"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E19\u0E2D\u0E19\u0E04\u0E27\u0E48\u0E33\u0E1A\u0E19\u0E40\u0E1A\u0E32\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E07 \u0E41\u0E02\u0E19\u0E2B\u0E49\u0E2D\u0E22\u0E15\u0E23\u0E07 \u0E15\u0E31\u0E14\u0E01\u0E32\u0E23\u0E42\u0E01\u0E07\u0E2B\u0E21\u0E14", tipEn: "Face down on an incline bench with arms hanging straight \u2014 no cheating possible." },
  { name: "Machine Curl", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E21\u0E49\u0E27\u0E19\u0E41\u0E02\u0E19", alias: "\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E04\u0E38\u0E21\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E07\u0E48\u0E32\u0E22 \u0E14\u0E31\u0E19\u0E16\u0E36\u0E07\u0E08\u0E38\u0E14\u0E25\u0E49\u0E32\u0E44\u0E14\u0E49\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22", tipEn: "Easy to hold form, so you can safely push to failure." },
  // ══════════ ไตรเซป ══════════
  { name: "Close Grip Bench Press", th: "\u0E40\u0E1A\u0E19\u0E0A\u0E4C\u0E08\u0E31\u0E1A\u0E41\u0E04\u0E1A", alias: "\u0E42\u0E04\u0E25\u0E2A\u0E01\u0E23\u0E34\u0E1B \u0E14\u0E31\u0E19\u0E41\u0E04\u0E1A", equip: ["barbell", "bench", "rack"], pri: ["triceps"], sec: ["chest", "front_delts"], pattern: "horizontal_push", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["elbow"], tip: "\u0E08\u0E31\u0E1A\u0E01\u0E27\u0E49\u0E32\u0E07\u0E40\u0E17\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48 \u0E28\u0E2D\u0E01\u0E41\u0E19\u0E1A\u0E25\u0E33\u0E15\u0E31\u0E27 \u2014 \u0E17\u0E48\u0E32\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E17\u0E35\u0E48\u0E22\u0E01\u0E2B\u0E19\u0E31\u0E01\u0E44\u0E14\u0E49\u0E2A\u0E38\u0E14", tipEn: "Shoulder-width grip, elbows tucked \u2014 the heaviest triceps lift there is." },
  { name: "Tricep Pushdown", th: "\u0E01\u0E14\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B", alias: "\u0E1E\u0E38\u0E0A\u0E14\u0E32\u0E27\u0E19\u0E4C \u0E01\u0E14\u0E2A\u0E32\u0E22", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E28\u0E2D\u0E01\u0E25\u0E47\u0E2D\u0E01\u0E02\u0E49\u0E32\u0E07\u0E25\u0E33\u0E15\u0E31\u0E27 \u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E2A\u0E38\u0E14\u0E41\u0E25\u0E49\u0E27\u0E1A\u0E35\u0E1A 1 \u0E27\u0E34", tipEn: "Elbows locked at your sides, full extension, squeeze for a second." },
  { name: "Rope Pushdown", th: "\u0E01\u0E14\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E14\u0E49\u0E27\u0E22\u0E40\u0E0A\u0E37\u0E2D\u0E01", alias: "\u0E1E\u0E38\u0E0A\u0E14\u0E32\u0E27\u0E19\u0E4C\u0E40\u0E0A\u0E37\u0E2D\u0E01", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E01\u0E32\u0E07\u0E40\u0E0A\u0E37\u0E2D\u0E01\u0E2D\u0E2D\u0E01\u0E15\u0E2D\u0E19\u0E25\u0E48\u0E32\u0E07\u0E2A\u0E38\u0E14 \u0E1A\u0E35\u0E1A\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E43\u0E2B\u0E49\u0E2A\u0E38\u0E14", tipEn: "Spread the rope at the bottom and squeeze the triceps all the way." },
  { name: "Overhead Tricep Extension", th: "\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E2B\u0E31\u0E27", alias: "\u0E40\u0E2D\u0E47\u0E01\u0E0B\u0E4C\u0E40\u0E17\u0E19\u0E0A\u0E31\u0E48\u0E19\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E2B\u0E31\u0E27", equip: ["dumbbell"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["elbow"], tip: "\u0E41\u0E02\u0E19\u0E2D\u0E22\u0E39\u0E48\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E2B\u0E31\u0E27 = \u0E22\u0E37\u0E14\u0E2B\u0E31\u0E27\u0E22\u0E32\u0E27\u0E02\u0E2D\u0E07\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E2A\u0E38\u0E14", tipEn: "Arms overhead puts the long head of the triceps in full stretch." },
  { name: "Cable Overhead Extension", th: "\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25\u0E40\u0E2B\u0E19\u0E37\u0E2D\u0E2B\u0E31\u0E27", alias: "\u0E42\u0E2D\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E40\u0E2E\u0E14\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25", equip: ["cable"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E04\u0E07\u0E17\u0E35\u0E48\u0E43\u0E19\u0E0A\u0E48\u0E27\u0E07\u0E22\u0E37\u0E14 \u0E14\u0E35\u0E01\u0E27\u0E48\u0E32\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", tipEn: "Constant tension in the stretched position \u2014 better than dumbbells here." },
  { name: "Skull Crusher", th: "\u0E2A\u0E01\u0E31\u0E25\u0E04\u0E23\u0E31\u0E0A\u0E40\u0E0A\u0E2D\u0E23\u0E4C", alias: "\u0E44\u0E25\u0E2D\u0E34\u0E49\u0E07\u0E40\u0E2D\u0E47\u0E01\u0E0B\u0E4C\u0E40\u0E17\u0E19\u0E0A\u0E31\u0E48\u0E19", equip: ["barbell", "bench"], pri: ["triceps"], pattern: "isolation", fatigue: "moderate", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["elbow"], tip: "\u0E25\u0E14\u0E1A\u0E32\u0E23\u0E4C\u0E25\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E1C\u0E32\u0E01 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E17\u0E35\u0E48\u0E08\u0E21\u0E39\u0E01 \u0E28\u0E2D\u0E01\u0E19\u0E34\u0E48\u0E07", tipEn: "Lower the bar behind your forehead, not to your nose, and keep the elbows still." },
  { name: "Tricep Kickback", th: "\u0E04\u0E34\u0E01\u0E41\u0E1A\u0E47\u0E01 (\u0E40\u0E15\u0E30\u0E2B\u0E25\u0E31\u0E07)", alias: "\u0E40\u0E15\u0E30\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B", equip: ["dumbbell"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E15\u0E49\u0E19\u0E41\u0E02\u0E19\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E19\u0E34\u0E48\u0E07 \u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E41\u0E04\u0E48\u0E02\u0E49\u0E2D\u0E28\u0E2D\u0E01", tipEn: "Upper arm parallel to the floor and locked \u2014 only the elbow moves." },
  { name: "Machine Tricep Extension", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B", alias: "\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["triceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E14\u0E31\u0E19\u0E16\u0E36\u0E07\u0E08\u0E38\u0E14\u0E25\u0E49\u0E32\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E25\u0E31\u0E27\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E1E\u0E31\u0E07", tipEn: "Great for pushing to failure without worrying about form breaking down." },
  { name: "Diamond Push-up", th: "\u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E21\u0E37\u0E2D\u0E0A\u0E34\u0E14 (\u0E40\u0E1E\u0E0A\u0E23)", alias: "\u0E44\u0E14\u0E21\u0E2D\u0E19\u0E14\u0E4C \u0E27\u0E34\u0E14\u0E1E\u0E37\u0E49\u0E19\u0E44\u0E15\u0E23\u0E40\u0E0B\u0E1B", equip: ["bodyweight"], pri: ["triceps"], sec: ["chest"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 20, avoid: ["wrist", "elbow"], tip: "\u0E21\u0E37\u0E2D\u0E0A\u0E34\u0E14\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E32\u0E21\u0E40\u0E2B\u0E25\u0E35\u0E48\u0E22\u0E21 \u0E28\u0E2D\u0E01\u0E41\u0E19\u0E1A\u0E15\u0E31\u0E27", tipEn: "Hands together in a triangle, elbows tucked." },
  { name: "Bench Dip", th: "\u0E14\u0E34\u0E1B\u0E40\u0E01\u0E49\u0E32\u0E2D\u0E35\u0E49", alias: "\u0E22\u0E31\u0E19\u0E40\u0E01\u0E49\u0E32\u0E2D\u0E35\u0E49", equip: ["bench", "bodyweight"], pri: ["triceps"], sec: ["front_delts"], pattern: "horizontal_push", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 20, avoid: ["shoulder"], tip: "\u0E21\u0E37\u0E2D\u0E27\u0E32\u0E07\u0E02\u0E2D\u0E1A\u0E40\u0E1A\u0E32\u0E30 \u0E25\u0E07\u0E08\u0E19\u0E28\u0E2D\u0E01 90\xB0 \u0E2D\u0E22\u0E48\u0E32\u0E25\u0E07\u0E25\u0E36\u0E01\u0E08\u0E19\u0E44\u0E2B\u0E25\u0E48\u0E40\u0E08\u0E47\u0E1A", tipEn: "Hands on the bench edge, lower to 90\xB0 at the elbow \u2014 don't go so deep it hurts the shoulder." },
  // ══════════ ต้นขาหน้า ══════════
  { name: "Barbell Squat", th: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25", alias: "\u0E41\u0E1A\u0E01\u0E1A\u0E32\u0E23\u0E4C\u0E22\u0E48\u0E2D \u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E2B\u0E25\u0E31\u0E07", equip: ["barbell", "rack"], pri: ["quads"], sec: ["glutes", "hamstrings", "core"], pattern: "squat", fatigue: "high", type: "weight", sets: 4, rmin: 5, rmax: 8, avoid: ["lower_back", "knee"], tip: "\u0E40\u0E17\u0E49\u0E32\u0E01\u0E27\u0E49\u0E32\u0E07\u0E40\u0E17\u0E48\u0E32\u0E44\u0E2B\u0E25\u0E48 \u0E22\u0E48\u0E2D\u0E08\u0E19\u0E15\u0E49\u0E19\u0E02\u0E32\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19 \u0E40\u0E02\u0E48\u0E32\u0E44\u0E1B\u0E17\u0E32\u0E07\u0E1B\u0E25\u0E32\u0E22\u0E40\u0E17\u0E49\u0E32", tipEn: "Feet shoulder-width, descend until the thighs are parallel, knees track over the toes." },
  { name: "Front Squat", th: "\u0E1F\u0E23\u0E2D\u0E19\u0E15\u0E4C\u0E2A\u0E04\u0E27\u0E2D\u0E17 (\u0E41\u0E1A\u0E01\u0E2B\u0E19\u0E49\u0E32)", alias: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E2B\u0E19\u0E49\u0E32", equip: ["barbell", "rack"], pri: ["quads"], sec: ["glutes", "core"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 6, rmax: 10, avoid: ["wrist", "knee"], tip: "\u0E1A\u0E32\u0E23\u0E4C\u0E27\u0E32\u0E07\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E2B\u0E25\u0E48 \u0E28\u0E2D\u0E01\u0E0A\u0E35\u0E49\u0E02\u0E36\u0E49\u0E19 \u0E25\u0E33\u0E15\u0E31\u0E27\u0E15\u0E31\u0E49\u0E07\u0E15\u0E23\u0E07\u0E01\u0E27\u0E48\u0E32\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E2B\u0E25\u0E31\u0E07", tipEn: "Bar racked on the front delts, elbows up, torso far more upright than a back squat." },
  { name: "Box Squat", th: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E19\u0E31\u0E48\u0E07\u0E01\u0E25\u0E48\u0E2D\u0E07", alias: "\u0E1A\u0E47\u0E2D\u0E01\u0E0B\u0E4C\u0E2A\u0E04\u0E27\u0E2D\u0E17", equip: ["barbell", "rack", "bench"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 5, rmax: 8, avoid: ["lower_back"], tip: "\u0E19\u0E31\u0E48\u0E07\u0E41\u0E15\u0E30\u0E01\u0E25\u0E48\u0E2D\u0E07\u0E41\u0E25\u0E49\u0E27\u0E14\u0E31\u0E19\u0E02\u0E36\u0E49\u0E19 \u0E1D\u0E36\u0E01\u0E04\u0E27\u0E32\u0E21\u0E25\u0E36\u0E01\u0E43\u0E2B\u0E49\u0E2A\u0E21\u0E48\u0E33\u0E40\u0E2A\u0E21\u0E2D", tipEn: "Sit to the box and drive up \u2014 trains a consistent depth every rep." },
  { name: "Smith Machine Squat", th: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E2A\u0E21\u0E34\u0E18\u0E41\u0E21\u0E0A\u0E0A\u0E35\u0E19", alias: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["knee"], tip: "\u0E1A\u0E32\u0E23\u0E4C\u0E27\u0E34\u0E48\u0E07\u0E43\u0E19\u0E23\u0E32\u0E07 \u0E17\u0E23\u0E07\u0E15\u0E31\u0E27\u0E07\u0E48\u0E32\u0E22 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E40\u0E25\u0E48\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E04\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27", tipEn: "The bar runs on rails so balance is easy \u2014 good for going heavy alone." },
  { name: "Leg Press", th: "\u0E40\u0E25\u0E01\u0E40\u0E1E\u0E23\u0E2A (\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E14\u0E31\u0E19\u0E02\u0E32)", alias: "\u0E14\u0E31\u0E19\u0E02\u0E32", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "\u0E2D\u0E22\u0E48\u0E32\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E40\u0E02\u0E48\u0E32\u0E25\u0E47\u0E2D\u0E01\u0E2A\u0E38\u0E14 \u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07\u0E41\u0E19\u0E1A\u0E40\u0E1A\u0E32\u0E30\u0E15\u0E25\u0E2D\u0E14", tipEn: "Don't lock the knees out, and keep the lower back flat against the pad." },
  { name: "Hack Squat", th: "\u0E41\u0E2E\u0E04\u0E2A\u0E04\u0E27\u0E2D\u0E17", alias: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E40\u0E2D\u0E35\u0E22\u0E07", equip: ["machine"], pri: ["quads"], sec: ["glutes"], pattern: "squat", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["knee"], tip: "\u0E40\u0E19\u0E49\u0E19\u0E15\u0E49\u0E19\u0E02\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E19\u0E31\u0E01\u0E01\u0E27\u0E48\u0E32\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E1B\u0E01\u0E15\u0E34 \u0E25\u0E07\u0E25\u0E36\u0E01\u0E44\u0E14\u0E49\u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22", tipEn: "Hammers the quads harder than a regular squat, and you can go deep safely." },
  { name: "Bulgarian Split Squat", th: "\u0E1A\u0E31\u0E25\u0E41\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E2A\u0E04\u0E27\u0E2D\u0E17 (\u0E02\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27)", alias: "\u0E22\u0E48\u0E2D\u0E02\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27\u0E40\u0E17\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E07\u0E2A\u0E39\u0E07", equip: ["bodyweight", "bench"], pri: ["quads", "glutes"], sec: ["hamstrings"], pattern: "lunge", fatigue: "high", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "\u0E40\u0E17\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E07\u0E27\u0E32\u0E07\u0E2A\u0E39\u0E07 \u0E25\u0E07\u0E15\u0E23\u0E07\u0E46 \u2014 \u0E42\u0E2B\u0E14\u0E01\u0E27\u0E48\u0E32\u0E17\u0E35\u0E48\u0E04\u0E34\u0E14 \u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E32\u0E01\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E15\u0E31\u0E27\u0E01\u0E48\u0E2D\u0E19", tipEn: "Rear foot elevated, drop straight down \u2014 brutal, start with bodyweight." },
  { name: "Walking Lunge", th: "\u0E25\u0E31\u0E19\u0E08\u0E4C\u0E40\u0E14\u0E34\u0E19", alias: "\u0E40\u0E14\u0E34\u0E19\u0E22\u0E48\u0E2D\u0E02\u0E32", equip: ["dumbbell"], pri: ["quads", "glutes"], sec: ["hamstrings"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["knee"], tip: "\u0E01\u0E49\u0E32\u0E27\u0E22\u0E32\u0E27\u0E1E\u0E2D\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E48\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E44\u0E21\u0E48\u0E40\u0E25\u0E22\u0E1B\u0E25\u0E32\u0E22\u0E40\u0E17\u0E49\u0E32 \u0E25\u0E33\u0E15\u0E31\u0E27\u0E15\u0E31\u0E49\u0E07\u0E15\u0E23\u0E07", tipEn: "Step long enough that the front knee doesn't pass the toes. Stay upright." },
  { name: "Reverse Lunge", th: "\u0E25\u0E31\u0E19\u0E08\u0E4C\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07", alias: "\u0E22\u0E48\u0E2D\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07", equip: ["dumbbell"], pri: ["quads", "glutes"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E01\u0E49\u0E32\u0E27\u0E16\u0E2D\u0E22\u0E2B\u0E25\u0E31\u0E07 \u0E40\u0E1B\u0E47\u0E19\u0E21\u0E34\u0E15\u0E23\u0E01\u0E31\u0E1A\u0E40\u0E02\u0E48\u0E32\u0E01\u0E27\u0E48\u0E32\u0E25\u0E31\u0E19\u0E08\u0E4C\u0E40\u0E14\u0E34\u0E19\u0E2B\u0E19\u0E49\u0E32", tipEn: "Stepping backward is easier on the knees than a forward lunge." },
  { name: "Goblet Squat", th: "\u0E01\u0E47\u0E2D\u0E1A\u0E40\u0E25\u0E15\u0E2A\u0E04\u0E27\u0E2D\u0E17 (\u0E2D\u0E38\u0E49\u0E21\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25)", alias: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E2D\u0E38\u0E49\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E01", equip: ["dumbbell"], pri: ["quads"], sec: ["glutes", "core"], pattern: "squat", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E2D\u0E38\u0E49\u0E21\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E2B\u0E19\u0E49\u0E32\u0E2D\u0E01 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E1D\u0E36\u0E01\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E43\u0E2B\u0E49\u0E16\u0E39\u0E01\u0E01\u0E48\u0E2D\u0E19\u0E43\u0E0A\u0E49\u0E1A\u0E32\u0E23\u0E4C", tipEn: "Hold a dumbbell at the chest \u2014 great for grooving squat form before you touch a bar." },
  { name: "Step-up", th: "\u0E2A\u0E40\u0E15\u0E47\u0E1B\u0E2D\u0E31\u0E1E (\u0E01\u0E49\u0E32\u0E27\u0E02\u0E36\u0E49\u0E19\u0E01\u0E25\u0E48\u0E2D\u0E07)", alias: "\u0E01\u0E49\u0E32\u0E27\u0E02\u0E36\u0E49\u0E19\u0E21\u0E49\u0E32", equip: ["dumbbell", "bench"], pri: ["quads", "glutes"], pattern: "lunge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E14\u0E31\u0E19\u0E14\u0E49\u0E27\u0E22\u0E2A\u0E49\u0E19\u0E40\u0E17\u0E49\u0E32\u0E02\u0E32\u0E1A\u0E19 \u0E2D\u0E22\u0E48\u0E32\u0E16\u0E35\u0E1A\u0E02\u0E32\u0E25\u0E48\u0E32\u0E07\u0E0A\u0E48\u0E27\u0E22", tipEn: "Drive through the heel of the top leg, don't push off with the bottom one." },
  { name: "Leg Extension", th: "\u0E40\u0E25\u0E01\u0E40\u0E2D\u0E47\u0E01\u0E0B\u0E4C\u0E40\u0E17\u0E19\u0E0A\u0E31\u0E48\u0E19 (\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E02\u0E32)", alias: "\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E40\u0E02\u0E48\u0E32\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["quads"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, avoid: ["knee"], tip: "\u0E17\u0E48\u0E32 isolation \u0E1B\u0E34\u0E14\u0E17\u0E49\u0E32\u0E22 \u0E1A\u0E35\u0E1A\u0E04\u0E49\u0E32\u0E07\u0E15\u0E2D\u0E19\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E2A\u0E38\u0E14 1 \u0E27\u0E34", tipEn: "An isolation finisher \u2014 squeeze for a second at full extension." },
  { name: "Sissy Squat", th: "\u0E0B\u0E34\u0E2A\u0E0B\u0E35\u0E48\u0E2A\u0E04\u0E27\u0E2D\u0E17", alias: "\u0E2A\u0E04\u0E27\u0E2D\u0E17\u0E40\u0E2D\u0E19\u0E2B\u0E25\u0E31\u0E07", equip: ["bodyweight"], pri: ["quads"], pattern: "isolation", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, avoid: ["knee"], tip: "\u0E40\u0E2D\u0E19\u0E15\u0E31\u0E27\u0E44\u0E1B\u0E2B\u0E25\u0E31\u0E07\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E22\u0E48\u0E2D \u0E22\u0E37\u0E14\u0E15\u0E49\u0E19\u0E02\u0E32\u0E2B\u0E19\u0E49\u0E32\u0E2A\u0E38\u0E14 \u0E43\u0E0A\u0E49\u0E21\u0E37\u0E2D\u0E08\u0E31\u0E1A\u0E17\u0E35\u0E48\u0E22\u0E36\u0E14\u0E0A\u0E48\u0E27\u0E22", tipEn: "Lean back as you descend for a huge quad stretch. Hold something for balance." },
  { name: "Wall Sit", th: "\u0E19\u0E31\u0E48\u0E07\u0E1E\u0E34\u0E07\u0E01\u0E33\u0E41\u0E1E\u0E07", alias: "\u0E27\u0E2D\u0E25\u0E25\u0E4C\u0E0B\u0E34\u0E17", equip: ["bodyweight"], pri: ["quads"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "\u0E15\u0E49\u0E19\u0E02\u0E32\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19 \u0E04\u0E49\u0E32\u0E07\u0E44\u0E27\u0E49 \u2014 \u0E1D\u0E36\u0E01\u0E04\u0E27\u0E32\u0E21\u0E17\u0E19\u0E02\u0E2D\u0E07\u0E15\u0E49\u0E19\u0E02\u0E32\u0E2B\u0E19\u0E49\u0E32", tipEn: "Thighs parallel to the floor and hold \u2014 builds quad endurance." },
  // ══════════ หลังขา / ก้น ══════════
  { name: "Romanian Deadlift", th: "\u0E2D\u0E32\u0E23\u0E4C\u0E14\u0E35\u0E41\u0E2D\u0E25 (\u0E40\u0E14\u0E14\u0E02\u0E32\u0E15\u0E36\u0E07)", alias: "\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32 \u0E1A\u0E32\u0E19\u0E1E\u0E31\u0E1A\u0E2A\u0E30\u0E42\u0E1E\u0E01", equip: ["barbell"], pri: ["hamstrings", "glutes"], sec: ["back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "\u0E14\u0E31\u0E19\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E44\u0E1B\u0E2B\u0E25\u0E31\u0E07 \u0E40\u0E02\u0E48\u0E32\u0E07\u0E2D\u0E19\u0E34\u0E14\u0E40\u0E14\u0E35\u0E22\u0E27 \u0E23\u0E39\u0E49\u0E2A\u0E36\u0E01\u0E15\u0E36\u0E07\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32 \u0E2D\u0E22\u0E48\u0E32\u0E22\u0E48\u0E2D\u0E40\u0E1B\u0E47\u0E19\u0E2A\u0E04\u0E27\u0E2D\u0E17", tipEn: "Push the hips back with only a slight knee bend. You should feel the hamstrings stretch \u2014 don't turn it into a squat." },
  { name: "Stiff Leg Deadlift", th: "\u0E40\u0E14\u0E14\u0E02\u0E32\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14", alias: "\u0E2A\u0E15\u0E34\u0E1F\u0E40\u0E25\u0E01", equip: ["barbell"], pri: ["hamstrings"], sec: ["glutes", "back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "\u0E02\u0E32\u0E15\u0E23\u0E07\u0E01\u0E27\u0E48\u0E32 RDL \u0E22\u0E37\u0E14\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32\u0E2A\u0E38\u0E14 \u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E1A\u0E32\u0E01\u0E27\u0E48\u0E32", tipEn: "Straighter legs than an RDL for a deeper hamstring stretch. Use less weight." },
  { name: "Dumbbell RDL", th: "\u0E2D\u0E32\u0E23\u0E4C\u0E14\u0E35\u0E41\u0E2D\u0E25\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", alias: "\u0E40\u0E14\u0E14\u0E02\u0E32\u0E15\u0E36\u0E07\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25 \u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32", equip: ["dumbbell"], pri: ["hamstrings", "glutes"], pattern: "hip_hinge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 15, avoid: ["lower_back"], tip: "\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E1A\u0E32\u0E01\u0E27\u0E48\u0E32\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E40\u0E25\u0E48\u0E19\u0E17\u0E35\u0E48\u0E1A\u0E49\u0E32\u0E19", tipEn: "A lighter version of the barbell RDL \u2014 good for home training." },
  { name: "Barbell Hip Thrust", th: "\u0E2E\u0E34\u0E1B\u0E17\u0E23\u0E31\u0E2A (\u0E14\u0E31\u0E19\u0E2A\u0E30\u0E42\u0E1E\u0E01)", alias: "\u0E14\u0E31\u0E19\u0E01\u0E49\u0E19 \u0E2A\u0E30\u0E42\u0E1E\u0E01", equip: ["barbell", "bench"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "moderate", type: "weight", sets: 3, rmin: 10, rmax: 12, tip: "\u0E2A\u0E30\u0E1A\u0E31\u0E01\u0E1E\u0E32\u0E14\u0E40\u0E1A\u0E32\u0E30 \u0E14\u0E31\u0E19\u0E08\u0E19\u0E25\u0E33\u0E15\u0E31\u0E27\u0E02\u0E19\u0E32\u0E19\u0E1E\u0E37\u0E49\u0E19 \u0E1A\u0E35\u0E1A\u0E01\u0E49\u0E19\u0E04\u0E49\u0E32\u0E07 1 \u0E27\u0E34", tipEn: "Shoulder blades on the bench, drive up until the torso is parallel, squeeze the glutes for a second." },
  { name: "Dumbbell Hip Thrust", th: "\u0E2E\u0E34\u0E1B\u0E17\u0E23\u0E31\u0E2A\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", alias: "\u0E14\u0E31\u0E19\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25", equip: ["dumbbell", "bench"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E27\u0E32\u0E07\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E1A\u0E19\u0E2A\u0E30\u0E42\u0E1E\u0E01 \u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E40\u0E1A\u0E32\u0E01\u0E27\u0E48\u0E32\u0E1A\u0E32\u0E23\u0E4C\u0E40\u0E1A\u0E25", tipEn: "Dumbbell across the hips \u2014 the lighter version of the barbell thrust." },
  { name: "Lying Leg Curl", th: "\u0E40\u0E25\u0E01\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E19\u0E2D\u0E19 (\u0E07\u0E2D\u0E02\u0E32)", alias: "\u0E07\u0E2D\u0E02\u0E32\u0E19\u0E2D\u0E19 \u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["hamstrings"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E04\u0E27\u0E1A\u0E04\u0E38\u0E21\u0E02\u0E32\u0E01\u0E25\u0E31\u0E1A\u0E0A\u0E49\u0E32\u0E46 \u0E0A\u0E48\u0E27\u0E07\u0E25\u0E07\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E01\u0E27\u0E48\u0E32\u0E0A\u0E48\u0E27\u0E07\u0E07\u0E2D", tipEn: "Control the way back down \u2014 the lowering matters more than the curl." },
  { name: "Seated Leg Curl", th: "\u0E40\u0E25\u0E01\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E19\u0E31\u0E48\u0E07", alias: "\u0E07\u0E2D\u0E02\u0E32\u0E19\u0E31\u0E48\u0E07", equip: ["machine"], pri: ["hamstrings"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E07\u0E32\u0E19\u0E27\u0E34\u0E08\u0E31\u0E22\u0E0A\u0E35\u0E49\u0E27\u0E48\u0E32\u0E42\u0E14\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32\u0E14\u0E35\u0E01\u0E27\u0E48\u0E32\u0E17\u0E48\u0E32\u0E19\u0E2D\u0E19\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22", tipEn: "Research suggests it hits the hamstrings slightly better than the lying version." },
  { name: "Good Morning", th: "\u0E01\u0E39\u0E49\u0E14\u0E21\u0E2D\u0E23\u0E4C\u0E19\u0E34\u0E48\u0E07", alias: "\u0E01\u0E49\u0E21\u0E41\u0E1A\u0E01\u0E1A\u0E32\u0E23\u0E4C", equip: ["barbell", "rack"], pri: ["hamstrings"], sec: ["glutes", "back"], pattern: "hip_hinge", fatigue: "high", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["lower_back"], tip: "\u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E1A\u0E32 \u0E2B\u0E25\u0E31\u0E07\u0E15\u0E23\u0E07\u0E15\u0E25\u0E2D\u0E14 \u0E40\u0E19\u0E49\u0E19\u0E1A\u0E32\u0E19\u0E1E\u0E31\u0E1A\u0E2A\u0E30\u0E42\u0E1E\u0E01", tipEn: "Go light, keep the back flat, and focus on hinging at the hip." },
  { name: "Glute Bridge", th: "\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E01\u0E49\u0E19", alias: "\u0E22\u0E01\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E1E\u0E37\u0E49\u0E19", equip: ["bodyweight"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E1E\u0E37\u0E49\u0E19\u0E02\u0E2D\u0E07\u0E2E\u0E34\u0E1B\u0E17\u0E23\u0E31\u0E2A \u0E1A\u0E35\u0E1A\u0E01\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19", tipEn: "The floor version of a hip thrust \u2014 squeeze the glutes hard at the top." },
  { name: "Single Leg Glute Bridge", th: "\u0E2A\u0E30\u0E1E\u0E32\u0E19\u0E01\u0E49\u0E19\u0E02\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27", alias: "\u0E22\u0E01\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E02\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27", equip: ["bodyweight"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E17\u0E33\u0E17\u0E35\u0E25\u0E30\u0E02\u0E49\u0E32\u0E07 \u0E41\u0E01\u0E49\u0E01\u0E49\u0E19\u0E02\u0E49\u0E32\u0E07\u0E17\u0E35\u0E48\u0E2D\u0E48\u0E2D\u0E19\u0E01\u0E27\u0E48\u0E32", tipEn: "One side at a time to fix the weaker glute." },
  { name: "Nordic Curl", th: "\u0E19\u0E2D\u0E23\u0E4C\u0E14\u0E34\u0E01\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25", alias: "\u0E25\u0E49\u0E21\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E02\u0E48\u0E32\u0E04\u0E38\u0E01", equip: ["bodyweight"], pri: ["hamstrings"], pattern: "isolation", fatigue: "high", type: "bodyweight", sets: 3, rmin: 5, rmax: 10, avoid: ["knee"], tip: "\u0E42\u0E04\u0E15\u0E23\u0E2B\u0E19\u0E31\u0E01 \u0E43\u0E0A\u0E49\u0E21\u0E37\u0E2D\u0E0A\u0E48\u0E27\u0E22\u0E23\u0E31\u0E1A\u0E15\u0E2D\u0E19\u0E25\u0E07 \u0E1B\u0E49\u0E2D\u0E07\u0E01\u0E31\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32\u0E09\u0E35\u0E01\u0E44\u0E14\u0E49\u0E14\u0E35\u0E21\u0E32\u0E01", tipEn: "Brutally hard \u2014 catch yourself with your hands on the way down. Excellent hamstring-tear insurance." },
  { name: "Back Extension", th: "\u0E41\u0E1A\u0E47\u0E01\u0E40\u0E2D\u0E47\u0E01\u0E0B\u0E4C\u0E40\u0E17\u0E19\u0E0A\u0E31\u0E48\u0E19 (\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07)", alias: "\u0E44\u0E2E\u0E40\u0E1B\u0E2D\u0E23\u0E4C\u0E40\u0E2D\u0E47\u0E01\u0E0B\u0E4C\u0E40\u0E17\u0E19\u0E0A\u0E31\u0E48\u0E19", equip: ["other", "bodyweight"], pri: ["glutes", "hamstrings"], sec: ["back"], pattern: "hip_hinge", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 15, avoid: ["lower_back"], tip: "\u0E02\u0E36\u0E49\u0E19\u0E41\u0E04\u0E48\u0E25\u0E33\u0E15\u0E31\u0E27\u0E15\u0E23\u0E07 \u0E2D\u0E22\u0E48\u0E32\u0E41\u0E2D\u0E48\u0E19\u0E40\u0E01\u0E34\u0E19", tipEn: "Come up only to a straight torso, don't hyperextend." },
  { name: "Cable Pull Through", th: "\u0E1E\u0E39\u0E25\u0E17\u0E23\u0E39\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25", alias: "\u0E14\u0E36\u0E07\u0E2A\u0E32\u0E22\u0E25\u0E2D\u0E14\u0E02\u0E32", equip: ["cable"], pri: ["glutes"], sec: ["hamstrings"], pattern: "hip_hinge", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E1D\u0E36\u0E01\u0E1A\u0E32\u0E19\u0E1E\u0E31\u0E1A\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E44\u0E14\u0E49\u0E14\u0E35 \u0E41\u0E23\u0E07\u0E15\u0E36\u0E07\u0E04\u0E07\u0E17\u0E35\u0E48 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E01\u0E31\u0E1A\u0E2B\u0E25\u0E31\u0E07", tipEn: "Great for learning the hip hinge \u2014 constant tension and easy on the back." },
  { name: "Cable Kickback", th: "\u0E40\u0E15\u0E30\u0E01\u0E49\u0E19\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25", alias: "\u0E01\u0E25\u0E39\u0E17\u0E04\u0E34\u0E01\u0E41\u0E1A\u0E47\u0E01", equip: ["cable"], pri: ["glutes"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E40\u0E15\u0E30\u0E44\u0E1B\u0E2B\u0E25\u0E31\u0E07\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E1A\u0E35\u0E1A\u0E01\u0E49\u0E19 \u0E25\u0E33\u0E15\u0E31\u0E27\u0E19\u0E34\u0E48\u0E07 \u0E2D\u0E22\u0E48\u0E32\u0E41\u0E2D\u0E48\u0E19\u0E2B\u0E25\u0E31\u0E07", tipEn: "Kick back and squeeze the glute, torso still, no arching the back." },
  { name: "Hip Abduction Machine", th: "\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E01\u0E32\u0E07\u0E2A\u0E30\u0E42\u0E1E\u0E01", alias: "\u0E01\u0E32\u0E07\u0E02\u0E32\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 \u0E01\u0E49\u0E19\u0E02\u0E49\u0E32\u0E07", equip: ["machine"], pri: ["glutes"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E42\u0E19\u0E49\u0E21\u0E15\u0E31\u0E27\u0E44\u0E1B\u0E2B\u0E19\u0E49\u0E32\u0E40\u0E25\u0E47\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E08\u0E30\u0E42\u0E14\u0E19\u0E01\u0E49\u0E19\u0E14\u0E49\u0E32\u0E19\u0E02\u0E49\u0E32\u0E07\u0E21\u0E32\u0E01\u0E02\u0E36\u0E49\u0E19", tipEn: "Lean forward slightly to hit more of the side glute." },
  // ══════════ น่อง ══════════
  { name: "Standing Calf Raise", th: "\u0E40\u0E02\u0E22\u0E48\u0E07\u0E19\u0E48\u0E2D\u0E07\u0E22\u0E37\u0E19", alias: "\u0E22\u0E01\u0E2A\u0E49\u0E19\u0E22\u0E37\u0E19", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 4, rmin: 12, rmax: 20, tip: "\u0E25\u0E07\u0E43\u0E2B\u0E49\u0E2A\u0E49\u0E19\u0E15\u0E48\u0E33\u0E2A\u0E38\u0E14 \u0E02\u0E36\u0E49\u0E19\u0E2A\u0E38\u0E14 \u0E04\u0E49\u0E32\u0E07\u0E1A\u0E19 1 \u0E27\u0E34 \u2014 \u0E19\u0E48\u0E2D\u0E07\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E0A\u0E48\u0E27\u0E07\u0E22\u0E37\u0E14\u0E40\u0E15\u0E47\u0E21", tipEn: "All the way down, all the way up, hold a second at the top \u2014 calves need the full stretch." },
  { name: "Seated Calf Raise", th: "\u0E40\u0E02\u0E22\u0E48\u0E07\u0E19\u0E48\u0E2D\u0E07\u0E19\u0E31\u0E48\u0E07", alias: "\u0E22\u0E01\u0E2A\u0E49\u0E19\u0E19\u0E31\u0E48\u0E07", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E40\u0E02\u0E48\u0E32\u0E07\u0E2D = \u0E40\u0E19\u0E49\u0E19\u0E19\u0E48\u0E2D\u0E07\u0E21\u0E31\u0E14\u0E25\u0E48\u0E32\u0E07 (soleus) \u0E04\u0E27\u0E23\u0E21\u0E35\u0E04\u0E39\u0E48\u0E01\u0E31\u0E1A\u0E17\u0E48\u0E32\u0E22\u0E37\u0E19", tipEn: "Bent knee biases the soleus \u2014 pair it with a standing version." },
  { name: "Leg Press Calf Raise", th: "\u0E40\u0E02\u0E22\u0E48\u0E07\u0E19\u0E48\u0E2D\u0E07\u0E1A\u0E19\u0E40\u0E25\u0E01\u0E40\u0E1E\u0E23\u0E2A", alias: "\u0E14\u0E31\u0E19\u0E19\u0E48\u0E2D\u0E07\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07", equip: ["machine"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, tip: "\u0E43\u0E0A\u0E49\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E40\u0E25\u0E01\u0E40\u0E1E\u0E23\u0E2A \u0E14\u0E31\u0E19\u0E14\u0E49\u0E27\u0E22\u0E1B\u0E25\u0E32\u0E22\u0E40\u0E17\u0E49\u0E32 \u0E40\u0E02\u0E48\u0E32\u0E40\u0E2B\u0E22\u0E35\u0E22\u0E14\u0E40\u0E01\u0E37\u0E2D\u0E1A\u0E15\u0E23\u0E07", tipEn: "On the leg press, push through the toes with the knees nearly straight." },
  { name: "Calf Raise", th: "\u0E40\u0E02\u0E22\u0E48\u0E07\u0E19\u0E48\u0E2D\u0E07 (\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E15\u0E31\u0E27)", alias: "\u0E22\u0E01\u0E2A\u0E49\u0E19\u0E40\u0E17\u0E49\u0E32", equip: ["bodyweight"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "bodyweight", sets: 4, rmin: 15, rmax: 25, tip: "\u0E22\u0E37\u0E19\u0E02\u0E2D\u0E1A\u0E02\u0E31\u0E49\u0E19\u0E1A\u0E31\u0E19\u0E44\u0E14\u0E43\u0E2B\u0E49\u0E2A\u0E49\u0E19\u0E2B\u0E49\u0E2D\u0E22 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E0A\u0E48\u0E27\u0E07\u0E22\u0E37\u0E14", tipEn: "Stand on a step edge with the heels hanging off for more stretch." },
  { name: "Single Leg Calf Raise", th: "\u0E40\u0E02\u0E22\u0E48\u0E07\u0E19\u0E48\u0E2D\u0E07\u0E02\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27", alias: "\u0E22\u0E01\u0E2A\u0E49\u0E19\u0E02\u0E32\u0E40\u0E14\u0E35\u0E22\u0E27", equip: ["bodyweight"], pri: ["calves"], pattern: "isolation", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 20, tip: "\u0E17\u0E35\u0E25\u0E30\u0E02\u0E49\u0E32\u0E07\u0E2B\u0E19\u0E31\u0E01\u0E01\u0E27\u0E48\u0E32\u0E40\u0E17\u0E48\u0E32\u0E15\u0E31\u0E27 \u0E41\u0E01\u0E49\u0E19\u0E48\u0E2D\u0E07\u0E2A\u0E2D\u0E07\u0E02\u0E49\u0E32\u0E07\u0E44\u0E21\u0E48\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E19", tipEn: "One leg is more than twice as hard \u2014 fixes side-to-side imbalance." },
  // ══════════ แกนกลาง ══════════
  { name: "Plank", th: "\u0E41\u0E1E\u0E25\u0E07\u0E01\u0E4C (\u0E44\u0E21\u0E49\u0E01\u0E23\u0E30\u0E14\u0E32\u0E19)", alias: "\u0E17\u0E48\u0E32\u0E41\u0E1E\u0E25\u0E07\u0E04\u0E4C", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "\u0E25\u0E33\u0E15\u0E31\u0E27\u0E40\u0E1B\u0E47\u0E19\u0E40\u0E2A\u0E49\u0E19\u0E15\u0E23\u0E07 \u0E40\u0E01\u0E23\u0E47\u0E07\u0E01\u0E49\u0E19\u0E41\u0E25\u0E30\u0E17\u0E49\u0E2D\u0E07 \u0E2D\u0E22\u0E48\u0E32\u0E43\u0E2B\u0E49\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E15\u0E01\u0E2B\u0E23\u0E37\u0E2D\u0E42\u0E14\u0E48\u0E07", tipEn: "Body in a straight line, squeeze glutes and abs, hips neither sagging nor piked." },
  { name: "Side Plank", th: "\u0E41\u0E1E\u0E25\u0E07\u0E01\u0E4C\u0E02\u0E49\u0E32\u0E07", alias: "\u0E41\u0E1E\u0E25\u0E07\u0E04\u0E4C\u0E15\u0E30\u0E41\u0E04\u0E07", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "\u0E40\u0E19\u0E49\u0E19\u0E02\u0E49\u0E32\u0E07\u0E25\u0E33\u0E15\u0E31\u0E27 \u0E17\u0E33\u0E17\u0E31\u0E49\u0E07\u0E2A\u0E2D\u0E07\u0E02\u0E49\u0E32\u0E07\u0E40\u0E17\u0E48\u0E32\u0E01\u0E31\u0E19", tipEn: "Targets the obliques \u2014 do both sides equally." },
  { name: "Hollow Body Hold", th: "\u0E2E\u0E2D\u0E25\u0E42\u0E25\u0E27\u0E4C\u0E42\u0E2E\u0E25\u0E14\u0E4C", alias: "\u0E04\u0E49\u0E32\u0E07\u0E15\u0E31\u0E27\u0E40\u0E23\u0E37\u0E2D", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 45, tip: "\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07\u0E41\u0E19\u0E1A\u0E1E\u0E37\u0E49\u0E19\u0E15\u0E25\u0E2D\u0E14 \u0E22\u0E01\u0E44\u0E2B\u0E25\u0E48\u0E41\u0E25\u0E30\u0E02\u0E32\u0E1E\u0E49\u0E19\u0E1E\u0E37\u0E49\u0E19", tipEn: "Lower back pressed to the floor the whole time, shoulders and legs lifted." },
  { name: "Hanging Knee Raise", th: "\u0E2B\u0E49\u0E2D\u0E22\u0E22\u0E01\u0E40\u0E02\u0E48\u0E32", alias: "\u0E42\u0E2B\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E22\u0E01\u0E40\u0E02\u0E48\u0E32", equip: ["pullup_bar", "bodyweight"], pri: ["core"], sec: ["forearms"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E21\u0E49\u0E27\u0E19\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E02\u0E36\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E41\u0E04\u0E48\u0E22\u0E01\u0E40\u0E02\u0E48\u0E32 \u0E2D\u0E22\u0E48\u0E32\u0E41\u0E01\u0E27\u0E48\u0E07", tipEn: "Curl the pelvis up too, not just the knees \u2014 and don't swing." },
  { name: "Hanging Leg Raise", th: "\u0E2B\u0E49\u0E2D\u0E22\u0E22\u0E01\u0E02\u0E32\u0E15\u0E23\u0E07", alias: "\u0E42\u0E2B\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E22\u0E01\u0E02\u0E32", equip: ["pullup_bar", "bodyweight"], pri: ["core"], sec: ["forearms"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 15, tip: "\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E22\u0E32\u0E01\u0E02\u0E2D\u0E07\u0E22\u0E01\u0E40\u0E02\u0E48\u0E32 \u0E02\u0E32\u0E15\u0E23\u0E07\u0E15\u0E25\u0E2D\u0E14", tipEn: "The hard version of knee raises \u2014 legs stay straight." },
  { name: "Toes to Bar", th: "\u0E22\u0E01\u0E40\u0E17\u0E49\u0E32\u0E41\u0E15\u0E30\u0E1A\u0E32\u0E23\u0E4C", alias: "\u0E17\u0E39\u0E2A\u0E17\u0E39\u0E1A\u0E32\u0E23\u0E4C", equip: ["pullup_bar", "bodyweight"], pri: ["core"], sec: ["forearms", "back"], pattern: "core", fatigue: "high", type: "bodyweight", sets: 3, rmin: 5, rmax: 12, tip: "\u0E02\u0E31\u0E49\u0E19\u0E2A\u0E39\u0E07\u0E2A\u0E38\u0E14\u0E02\u0E2D\u0E07\u0E22\u0E01\u0E02\u0E32 \u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E41\u0E23\u0E07\u0E1A\u0E35\u0E1A\u0E21\u0E37\u0E2D\u0E41\u0E25\u0E30\u0E41\u0E01\u0E19\u0E01\u0E25\u0E32\u0E07\u0E41\u0E02\u0E47\u0E07\u0E41\u0E23\u0E07", tipEn: "The top of the leg-raise progression \u2014 needs real grip and core strength." },
  { name: "Lying Leg Raise", th: "\u0E19\u0E2D\u0E19\u0E22\u0E01\u0E02\u0E32", alias: "\u0E22\u0E01\u0E02\u0E32\u0E1E\u0E37\u0E49\u0E19", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 12, rmax: 20, avoid: ["lower_back"], tip: "\u0E21\u0E37\u0E2D\u0E2A\u0E2D\u0E14\u0E43\u0E15\u0E49\u0E01\u0E49\u0E19 \u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07\u0E41\u0E19\u0E1A\u0E1E\u0E37\u0E49\u0E19 \u0E25\u0E07\u0E0A\u0E49\u0E32\u0E2D\u0E22\u0E48\u0E32\u0E43\u0E2B\u0E49\u0E02\u0E32\u0E41\u0E15\u0E30\u0E1E\u0E37\u0E49\u0E19", tipEn: "Hands under the glutes, lower back flat, lower slowly without touching the floor." },
  { name: "Cable Crunch", th: "\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25\u0E04\u0E23\u0E31\u0E19\u0E0A\u0E4C (\u0E21\u0E49\u0E27\u0E19\u0E17\u0E49\u0E2D\u0E07)", alias: "\u0E21\u0E49\u0E27\u0E19\u0E17\u0E49\u0E2D\u0E07\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25", equip: ["cable"], pri: ["core"], pattern: "core", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E21\u0E49\u0E27\u0E19\u0E01\u0E23\u0E30\u0E14\u0E39\u0E01\u0E2A\u0E31\u0E19\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E07 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E01\u0E49\u0E21\u0E2A\u0E30\u0E42\u0E1E\u0E01 \u2014 \u0E17\u0E49\u0E2D\u0E07\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E44\u0E14\u0E49\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E01\u0E25\u0E49\u0E32\u0E21\u0E2D\u0E37\u0E48\u0E19", tipEn: "Curl the spine down, don't hinge at the hips \u2014 abs respond to added weight like any other muscle." },
  { name: "Crunch", th: "\u0E04\u0E23\u0E31\u0E19\u0E0A\u0E4C (\u0E21\u0E49\u0E27\u0E19\u0E17\u0E49\u0E2D\u0E07)", alias: "\u0E0B\u0E34\u0E17\u0E2D\u0E31\u0E1E \u0E25\u0E38\u0E01\u0E19\u0E31\u0E48\u0E07", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 15, rmax: 25, tip: "\u0E22\u0E01\u0E41\u0E04\u0E48\u0E2A\u0E30\u0E1A\u0E31\u0E01\u0E1E\u0E49\u0E19\u0E1E\u0E37\u0E49\u0E19 \u0E44\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E2A\u0E38\u0E14 \u0E2D\u0E22\u0E48\u0E32\u0E14\u0E36\u0E07\u0E04\u0E2D", tipEn: "Lift only until the shoulder blades clear the floor. Don't pull on your neck." },
  { name: "Bicycle Crunch", th: "\u0E1B\u0E31\u0E48\u0E19\u0E08\u0E31\u0E01\u0E23\u0E22\u0E32\u0E19\u0E2D\u0E32\u0E01\u0E32\u0E28", alias: "\u0E04\u0E23\u0E31\u0E19\u0E0A\u0E4C\u0E1A\u0E34\u0E14\u0E15\u0E31\u0E27", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, tip: "\u0E28\u0E2D\u0E01\u0E41\u0E15\u0E30\u0E40\u0E02\u0E48\u0E32\u0E1D\u0E31\u0E48\u0E07\u0E15\u0E23\u0E07\u0E02\u0E49\u0E32\u0E21 \u0E0A\u0E49\u0E32\u0E46 \u0E43\u0E2B\u0E49\u0E23\u0E39\u0E49\u0E2A\u0E36\u0E01\u0E17\u0E49\u0E2D\u0E07\u0E02\u0E49\u0E32\u0E07", tipEn: "Elbow to the opposite knee, slowly, until you feel the obliques." },
  { name: "Russian Twist", th: "\u0E23\u0E31\u0E2A\u0E40\u0E0B\u0E35\u0E22\u0E19\u0E17\u0E27\u0E34\u0E2A\u0E15\u0E4C (\u0E1A\u0E34\u0E14\u0E15\u0E31\u0E27)", alias: "\u0E1A\u0E34\u0E14\u0E40\u0E2D\u0E27", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 20, rmax: 30, avoid: ["lower_back"], tip: "\u0E1A\u0E34\u0E14\u0E08\u0E32\u0E01\u0E25\u0E33\u0E15\u0E31\u0E27 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E41\u0E04\u0E48\u0E41\u0E01\u0E27\u0E48\u0E07\u0E41\u0E02\u0E19", tipEn: "Rotate from the torso, not just by swinging the arms." },
  { name: "Ab Wheel Rollout", th: "\u0E25\u0E49\u0E2D\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E49\u0E2D\u0E07", alias: "\u0E41\u0E2D\u0E1A\u0E27\u0E35\u0E25 \u0E25\u0E39\u0E01\u0E01\u0E25\u0E34\u0E49\u0E07", equip: ["other"], pri: ["core"], pattern: "core", fatigue: "moderate", type: "bodyweight", sets: 3, rmin: 8, rmax: 12, avoid: ["lower_back"], tip: "\u0E40\u0E01\u0E23\u0E47\u0E07\u0E17\u0E49\u0E2D\u0E07\u0E2B\u0E49\u0E32\u0E21\u0E43\u0E2B\u0E49\u0E2B\u0E25\u0E31\u0E07\u0E41\u0E2D\u0E48\u0E19 \u0E40\u0E23\u0E34\u0E48\u0E21\u0E08\u0E32\u0E01\u0E04\u0E38\u0E01\u0E40\u0E02\u0E48\u0E32\u0E23\u0E30\u0E22\u0E30\u0E2A\u0E31\u0E49\u0E19\u0E01\u0E48\u0E2D\u0E19", tipEn: "Brace the abs so the back never arches. Start from your knees with a short range." },
  { name: "Dead Bug", th: "\u0E40\u0E14\u0E14\u0E1A\u0E31\u0E01", alias: "\u0E41\u0E21\u0E25\u0E07\u0E15\u0E32\u0E22", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "low", type: "bodyweight", sets: 3, rmin: 10, rmax: 15, tip: "\u0E2B\u0E25\u0E31\u0E07\u0E25\u0E48\u0E32\u0E07\u0E41\u0E19\u0E1A\u0E1E\u0E37\u0E49\u0E19\u0E15\u0E25\u0E2D\u0E14 \u0E1B\u0E25\u0E2D\u0E14\u0E20\u0E31\u0E22\u0E01\u0E31\u0E1A\u0E2B\u0E25\u0E31\u0E07 \u0E40\u0E2B\u0E21\u0E32\u0E30\u0E04\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E15\u0E49\u0E19", tipEn: "Lower back stays flat the whole time \u2014 very back-safe and great for beginners." },
  { name: "Mountain Climber", th: "\u0E44\u0E15\u0E48\u0E40\u0E02\u0E32", alias: "\u0E40\u0E21\u0E32\u0E19\u0E4C\u0E40\u0E17\u0E19\u0E44\u0E04\u0E25\u0E21\u0E4C\u0E40\u0E1A\u0E2D\u0E23\u0E4C", equip: ["bodyweight"], pri: ["core"], pattern: "core", fatigue: "moderate", type: "time", sets: 3, rmin: 30, rmax: 45, avoid: ["wrist"], tip: "\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E19\u0E34\u0E48\u0E07 \u0E2A\u0E25\u0E31\u0E1A\u0E40\u0E02\u0E48\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2D\u0E01 \u0E40\u0E23\u0E47\u0E27\u0E41\u0E15\u0E48\u0E04\u0E38\u0E21\u0E1F\u0E2D\u0E23\u0E4C\u0E21", tipEn: "Hips steady, alternate knees to the chest \u2014 fast but controlled." },
  { name: "Pallof Press", th: "\u0E1E\u0E32\u0E25\u0E2D\u0E1F\u0E40\u0E1E\u0E23\u0E2A (\u0E15\u0E49\u0E32\u0E19\u0E1A\u0E34\u0E14)", alias: "\u0E14\u0E31\u0E19\u0E15\u0E49\u0E32\u0E19\u0E41\u0E23\u0E07\u0E1A\u0E34\u0E14", equip: ["cable"], pri: ["core"], pattern: "core", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E22\u0E37\u0E19\u0E02\u0E49\u0E32\u0E07\u0E40\u0E04\u0E40\u0E1A\u0E34\u0E25 \u0E14\u0E31\u0E19\u0E2D\u0E2D\u0E01\u0E2B\u0E19\u0E49\u0E32\u0E42\u0E14\u0E22\u0E44\u0E21\u0E48\u0E43\u0E2B\u0E49\u0E25\u0E33\u0E15\u0E31\u0E27\u0E1A\u0E34\u0E14 \u2014 \u0E1D\u0E36\u0E01\u0E04\u0E27\u0E32\u0E21\u0E21\u0E31\u0E48\u0E19\u0E04\u0E07", tipEn: "Stand side-on to the cable and press out without letting the torso rotate \u2014 anti-rotation work." },
  // ══════════ ปลายแขน ══════════
  { name: "Wrist Curl (DB)", th: "\u0E21\u0E49\u0E27\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D", alias: "\u0E23\u0E34\u0E2A\u0E15\u0E4C\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, avoid: ["wrist"], tip: "\u0E1E\u0E32\u0E14\u0E41\u0E02\u0E19\u0E1A\u0E19\u0E40\u0E02\u0E48\u0E32 \u0E1B\u0E25\u0E48\u0E2D\u0E22\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E25\u0E07\u0E2A\u0E38\u0E14\u0E41\u0E25\u0E49\u0E27\u0E21\u0E49\u0E27\u0E19\u0E02\u0E36\u0E49\u0E19", tipEn: "Forearms on your knees, let the wrists drop fully, then curl up." },
  { name: "Reverse Wrist Curl (DB)", th: "\u0E21\u0E49\u0E27\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E04\u0E27\u0E48\u0E33", alias: "\u0E23\u0E34\u0E2A\u0E15\u0E4C\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25\u0E01\u0E25\u0E31\u0E1A", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 15, rmax: 20, avoid: ["wrist"], tip: "\u0E04\u0E27\u0E48\u0E33\u0E21\u0E37\u0E2D \u0E40\u0E19\u0E49\u0E19\u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19\u0E1B\u0E25\u0E32\u0E22\u0E41\u0E02\u0E19 \u0E43\u0E0A\u0E49\u0E19\u0E49\u0E33\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E1A\u0E32\u0E21\u0E32\u0E01", tipEn: "Palms down for the top of the forearm. Use very light weight." },
  { name: "Reverse Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E04\u0E27\u0E48\u0E33\u0E21\u0E37\u0E2D", alias: "\u0E23\u0E35\u0E40\u0E27\u0E34\u0E23\u0E4C\u0E2A\u0E40\u0E04\u0E34\u0E23\u0E4C\u0E25", equip: ["barbell"], pri: ["forearms"], sec: ["biceps"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 12, rmax: 15, tip: "\u0E04\u0E27\u0E48\u0E33\u0E21\u0E37\u0E2D\u0E21\u0E49\u0E27\u0E19\u0E02\u0E36\u0E49\u0E19 \u0E42\u0E14\u0E19\u0E1B\u0E25\u0E32\u0E22\u0E41\u0E02\u0E19\u0E14\u0E49\u0E32\u0E19\u0E1A\u0E19\u0E41\u0E25\u0E30\u0E44\u0E1A\u0E40\u0E0B\u0E1B\u0E21\u0E31\u0E14\u0E25\u0E48\u0E32\u0E07", tipEn: "Overhand curl \u2014 hits the top of the forearm and the brachialis." },
  { name: "Pronation Curl", th: "\u0E21\u0E49\u0E27\u0E19\u0E1A\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D", alias: "\u0E42\u0E1B\u0E23\u0E40\u0E19\u0E0A\u0E31\u0E48\u0E19", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "weight", sets: 3, rmin: 10, rmax: 12, avoid: ["wrist"], tip: "\u0E1A\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E04\u0E27\u0E48\u0E33-\u0E2B\u0E07\u0E32\u0E22\u0E17\u0E27\u0E19\u0E41\u0E23\u0E07 \u0E40\u0E2A\u0E23\u0E34\u0E21\u0E01\u0E25\u0E49\u0E32\u0E21\u0E2B\u0E21\u0E38\u0E19\u0E1B\u0E25\u0E32\u0E22\u0E41\u0E02\u0E19", tipEn: "Rotate the wrist against resistance to build the forearm rotators." },
  { name: "Farmer's Walk", th: "\u0E1F\u0E32\u0E23\u0E4C\u0E40\u0E21\u0E2D\u0E23\u0E4C\u0E27\u0E2D\u0E25\u0E4C\u0E01 (\u0E2B\u0E34\u0E49\u0E27\u0E40\u0E14\u0E34\u0E19)", alias: "\u0E2B\u0E34\u0E49\u0E27\u0E14\u0E31\u0E21\u0E40\u0E1A\u0E25\u0E40\u0E14\u0E34\u0E19", equip: ["dumbbell"], pri: ["forearms"], sec: ["core", "back"], pattern: "isolation", fatigue: "moderate", type: "time", sets: 3, rmin: 30, rmax: 60, tip: "\u0E2B\u0E34\u0E49\u0E27\u0E2B\u0E19\u0E31\u0E01\u0E40\u0E14\u0E34\u0E19 \u0E44\u0E2B\u0E25\u0E48\u0E15\u0E31\u0E49\u0E07 \u2014 \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E23\u0E07\u0E1A\u0E35\u0E1A\u0E21\u0E37\u0E2D\u0E41\u0E25\u0E30\u0E41\u0E01\u0E19\u0E01\u0E25\u0E32\u0E07\u0E44\u0E1B\u0E1E\u0E23\u0E49\u0E2D\u0E21\u0E01\u0E31\u0E19", tipEn: "Carry heavy and walk tall \u2014 builds grip and core at the same time." },
  { name: "Dead Hang", th: "\u0E2B\u0E49\u0E2D\u0E22\u0E1A\u0E32\u0E23\u0E4C", alias: "\u0E42\u0E2B\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E04\u0E49\u0E32\u0E07", equip: ["pullup_bar", "bodyweight"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 60, tip: "\u0E2B\u0E49\u0E2D\u0E22\u0E19\u0E34\u0E48\u0E07\u0E46 \u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E23\u0E07\u0E1A\u0E35\u0E1A\u0E41\u0E25\u0E30\u0E22\u0E37\u0E14\u0E2B\u0E31\u0E27\u0E44\u0E2B\u0E25\u0E48", tipEn: "Just hang \u2014 builds grip and decompresses the shoulders." },
  { name: "Towel Pull-up", th: "\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E1C\u0E49\u0E32\u0E02\u0E19\u0E2B\u0E19\u0E39", alias: "\u0E42\u0E2B\u0E19\u0E1C\u0E49\u0E32", equip: ["pullup_bar", "bodyweight"], pri: ["forearms", "back"], sec: ["biceps"], pattern: "vertical_pull", fatigue: "high", type: "bodyweight", sets: 3, rmin: 1, rmax: 999, amrap: true, tip: "\u0E1E\u0E32\u0E14\u0E1C\u0E49\u0E32\u0E1A\u0E19\u0E1A\u0E32\u0E23\u0E4C\u0E41\u0E25\u0E49\u0E27\u0E08\u0E31\u0E1A \u2014 \u0E41\u0E23\u0E07\u0E1A\u0E35\u0E1A\u0E42\u0E2B\u0E14\u0E01\u0E27\u0E48\u0E32\u0E08\u0E31\u0E1A\u0E1A\u0E32\u0E23\u0E4C\u0E21\u0E32\u0E01", tipEn: "Drape a towel over the bar and grip that \u2014 far harder on the grip than the bar." },
  { name: "Wrist Isometric Hold", th: "\u0E40\u0E01\u0E23\u0E47\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D\u0E04\u0E49\u0E32\u0E07", alias: "\u0E04\u0E49\u0E32\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D", equip: ["dumbbell"], pri: ["forearms"], pattern: "isolation", fatigue: "low", type: "time", sets: 3, rmin: 20, rmax: 30, avoid: ["wrist"], tip: "\u0E16\u0E37\u0E2D\u0E04\u0E49\u0E32\u0E07\u0E43\u0E19\u0E21\u0E38\u0E21\u0E17\u0E35\u0E48\u0E2D\u0E48\u0E2D\u0E19\u0E41\u0E23\u0E07 \u0E1D\u0E36\u0E01\u0E04\u0E27\u0E32\u0E21\u0E17\u0E19\u0E02\u0E2D\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E37\u0E2D", tipEn: "Hold in the position where you're weakest to build wrist endurance." }
];
function unitFor(t2) {
  if (t2.type === "time") return "\u0E27\u0E34";
  if (t2.type === "bodyweight") return void 0;
  return t2.equip.includes("dumbbell") ? "kg/\u0E02\u0E49\u0E32\u0E07" : "kg";
}
function incFor(t2) {
  if (t2.type !== "weight") return void 0;
  if (t2.equip.includes("dumbbell")) return 1;
  if (t2.equip.includes("machine") || t2.equip.includes("cable")) return 5;
  if (t2.equip.includes("band")) return 1;
  return 2.5;
}
var isMachineEx = (t2) => t2.equip.includes("machine") || t2.equip.includes("cable");
function musclesOf(t2) {
  return [...t2.pri.map((m) => ({ m, w: 1 })), ...(t2.sec ?? []).map((m) => ({ m, w: 0.5 }))];
}
var WORD_ALIAS = {
  db: "dumbbell",
  dbs: "dumbbell",
  bb: "barbell",
  ez: "ezbar",
  ohp: "overhead press",
  bw: "bodyweight",
  // รูปพหูพจน์ -> เอกพจน์ (คลังใช้เอกพจน์ทั้งหมด)
  dips: "dip",
  curls: "curl",
  rows: "row",
  presses: "press",
  press_es: "press",
  raises: "raise",
  extensions: "extension",
  flyes: "fly",
  flies: "fly",
  flys: "fly",
  pulldowns: "pulldown",
  pushdowns: "pushdown",
  squats: "squat",
  lunges: "lunge",
  crunches: "crunch",
  planks: "plank",
  pullovers: "pullover",
  shrugs: "shrug"
};
var PHRASE_ALIAS = [
  [/\bshoulder press\b/g, "overhead press"],
  // ดันไหล่ = ดันเหนือหัว
  [/\bmilitary press\b/g, "overhead press"],
  [/\bbarbell back squat\b/g, "barbell squat"]
  // back squat = squat ปกติ (ตรงข้าม front squat)
];
function nameTokens(name) {
  let cleaned = name.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[-_/,]/g, " ").replace(/[^\p{L}\p{N} ]/gu, " ");
  for (const [re, to] of PHRASE_ALIAS) cleaned = cleaned.replace(re, to);
  const out = [];
  for (const raw of cleaned.split(/\s+/)) {
    if (!raw) continue;
    const mapped = WORD_ALIAS[raw] ?? raw;
    for (const w of mapped.split(" ")) if (w) out.push(w);
  }
  return out;
}
var tokenKey = (name) => nameTokens(name).slice().sort().join(" ");
var EXACT_INDEX = /* @__PURE__ */ new Map();
var TOKEN_INDEX = /* @__PURE__ */ new Map();
for (const t2 of EXERCISE_DB) {
  EXACT_INDEX.set(t2.name.trim().toLowerCase(), t2);
  const k = tokenKey(t2.name);
  if (!TOKEN_INDEX.has(k)) TOKEN_INDEX.set(k, t2);
}
function findTemplate(name) {
  const n = name.trim().toLowerCase();
  const exact = EXACT_INDEX.get(n);
  if (exact) return exact;
  const qTokens = nameTokens(name);
  if (!qTokens.length) return void 0;
  const sameSet = TOKEN_INDEX.get(qTokens.slice().sort().join(" "));
  if (sameSet) return sameSet;
  const qSet = new Set(qTokens);
  let best;
  let bestLen = 0;
  for (const t2 of EXERCISE_DB) {
    const tTokens = nameTokens(t2.name);
    if (tTokens.length <= bestLen) continue;
    if (tTokens.every((w) => qSet.has(w))) {
      best = t2;
      bestLen = tTokens.length;
    }
  }
  return best;
}
var EXERCISE_COUNT = EXERCISE_DB.length;
var TIER_S = /* @__PURE__ */ new Set([
  // ดัน
  "Barbell Bench Press",
  "Incline Barbell Press",
  "Incline DB Press",
  "Dumbbell Bench Press",
  "Overhead Press",
  "Overhead Press (DB)",
  "Dip",
  "Push-up",
  // ดึง
  "Deadlift",
  "Barbell Row",
  "Dumbbell Row",
  "Seated Cable Row",
  "Lat Pulldown",
  "Wide Grip Pull-up",
  "Chin-up",
  "Chest Supported Row",
  // ขา
  "Barbell Squat",
  "Front Squat",
  "Leg Press",
  "Romanian Deadlift",
  "Bulgarian Split Squat",
  "Barbell Hip Thrust",
  "Lying Leg Curl",
  "Seated Leg Curl",
  // เจาะจงที่จำเป็นจริง (กล้ามมัดที่ compound ให้ไม่พอ)
  "Lateral Raise",
  "Cable Lateral Raise",
  "Face Pull",
  "Standing Calf Raise",
  "Seated Calf Raise",
  "Barbell Curl",
  "Dumbbell Curl",
  "Tricep Pushdown",
  "Overhead Tricep Extension",
  "Hanging Knee Raise",
  "Cable Crunch",
  "Plank"
]);
var TIER_A = /* @__PURE__ */ new Set([
  "Decline Barbell Press",
  "Cable Fly",
  "Dumbbell Fly",
  "Pec Deck",
  "Chest Press Machine",
  "Pendlay Row",
  "T-Bar Row",
  "Machine Row",
  "Close Grip Pulldown",
  "Neutral Grip Pull-up",
  "Australian Row",
  "Straight Arm Pulldown",
  "Barbell Shrug",
  "Arnold Press",
  "Shoulder Press Machine",
  "Machine Lateral Raise",
  "Rear Delt Fly",
  "Reverse Pec Deck",
  "EZ Bar Curl",
  "Incline DB Curl",
  "Hammer Curl",
  "Preacher Curl",
  "Cable Curl",
  "Close Grip Bench Press",
  "Rope Pushdown",
  "Skull Crusher",
  "Cable Overhead Extension",
  "Hack Squat",
  "Smith Machine Squat",
  "Goblet Squat",
  "Walking Lunge",
  "Reverse Lunge",
  "Leg Extension",
  "Stiff Leg Deadlift",
  "Dumbbell RDL",
  "Good Morning",
  "Glute Bridge",
  "Cable Pull Through",
  "Nordic Curl",
  "Calf Raise",
  "Leg Press Calf Raise",
  "Hanging Leg Raise",
  "Lying Leg Raise",
  "Ab Wheel Rollout",
  "Crunch",
  "Wrist Curl (DB)",
  "Reverse Curl",
  "Farmer's Walk"
]);
var tierOf = (name) => TIER_S.has(name) ? "S" : TIER_A.has(name) ? "A" : "B";
var TIER_RANK = { S: 0, A: 1, B: 2 };

// src/lib/profile.ts
var ALL_EQUIP = [
  "barbell",
  "dumbbell",
  "cable",
  "machine",
  "bench",
  "rack",
  "pullup_bar",
  "bodyweight",
  "band",
  "kettlebell",
  "other"
];
var getExperience = (d) => d.profile?.experience ?? "intermediate";
var getInjuries = (d) => d.profile?.injuries ?? [];
var getTimeCap = (d) => d.constraints?.sessionTimeCapMinutes ?? DEFAULT_SESSION_TIME_CAP_MINUTES;
var DEFAULT_WINDOW_BUFFER_MIN = 10;
function parseHHMM(s) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = +m[1];
  const min = +m[2];
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
function windowMinutes(d, day) {
  const w = d.dayWindows?.[day];
  if (!w) return null;
  const a = parseHHMM(w.start);
  const b = parseHHMM(w.end);
  if (a == null || b == null) return null;
  const span = b > a ? b - a : b + 24 * 60 - a;
  const usable = span - (w.bufferMin ?? DEFAULT_WINDOW_BUFFER_MIN);
  return usable > 0 ? usable : null;
}
var getDayTimeCap = (d, day) => windowMinutes(d, day) ?? getTimeCap(d);
var getMaxSetsPerSession = (d) => d.constraints?.maxSetsPerSession ?? DEFAULT_MAX_SETS_PER_SESSION;
var getVolumeTarget = (d) => VOLUME_TARGETS[getExperience(d)];
var getDayEquip = (d, day) => d.dayEquip?.[day] ?? ALL_EQUIP;
var canDoWithEquip = (need, have) => need.every((e) => have.includes(e));

// src/lib/blueprint.ts
var DAY_TYPE_SHORT = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  upper: "Upper",
  lower: "Lower",
  full: "Full Body"
};
var SPLITS = {
  1: [{ day: "mon", type: "full" }],
  2: [
    { day: "mon", type: "full" },
    { day: "thu", type: "full" }
  ],
  3: [
    { day: "mon", type: "push" },
    { day: "wed", type: "pull" },
    { day: "fri", type: "legs" }
  ],
  4: [
    { day: "mon", type: "upper" },
    { day: "tue", type: "lower" },
    { day: "thu", type: "upper" },
    { day: "fri", type: "lower" }
  ],
  5: [
    { day: "mon", type: "push" },
    { day: "tue", type: "pull" },
    { day: "thu", type: "legs" },
    { day: "fri", type: "upper" },
    { day: "sat", type: "lower" }
  ]
};
var SLOTS = {
  push: [
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "front_delts", sets: 4, pattern: "vertical_push" },
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "side_delts", sets: 4 },
    { muscle: "triceps", sets: 4 },
    { muscle: "side_delts", sets: 3 },
    { muscle: "calves", sets: 4 }
  ],
  pull: [
    { muscle: "back", sets: 4, pattern: "vertical_pull" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "rear_delts", sets: 4 },
    { muscle: "biceps", sets: 4 },
    { muscle: "biceps", sets: 3 },
    { muscle: "forearms", sets: 3 }
  ],
  legs: [
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "hamstrings", sets: 4, pattern: "hip_hinge" },
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "glutes", sets: 4 },
    { muscle: "hamstrings", sets: 4 },
    { muscle: "calves", sets: 4 },
    { muscle: "core", sets: 4 }
  ],
  upper: [
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "front_delts", sets: 3, pattern: "vertical_push" },
    { muscle: "back", sets: 3, pattern: "vertical_pull" },
    { muscle: "side_delts", sets: 4 },
    { muscle: "rear_delts", sets: 3 },
    { muscle: "biceps", sets: 3 },
    { muscle: "triceps", sets: 3 }
  ],
  lower: [
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "hamstrings", sets: 4, pattern: "hip_hinge" },
    { muscle: "glutes", sets: 4 },
    { muscle: "quads", sets: 3 },
    { muscle: "calves", sets: 4 },
    { muscle: "core", sets: 3 }
  ],
  full: [
    { muscle: "quads", sets: 4, pattern: "squat" },
    { muscle: "chest", sets: 4, pattern: "horizontal_push" },
    { muscle: "back", sets: 4, pattern: "horizontal_pull" },
    { muscle: "hamstrings", sets: 4, pattern: "hip_hinge" },
    { muscle: "front_delts", sets: 3, pattern: "vertical_push" },
    { muscle: "back", sets: 3, pattern: "vertical_pull" },
    { muscle: "side_delts", sets: 4 },
    { muscle: "biceps", sets: 3 },
    { muscle: "triceps", sets: 3 },
    { muscle: "calves", sets: 4 },
    { muscle: "core", sets: 3 }
  ]
};
function pickForSlot(data, day, slot, used) {
  const equip = getDayEquip(data, day);
  const pool = EXERCISE_DB.filter(
    (t2) => t2.pri.includes(slot.muscle) && !used.has(t2.name.toLowerCase()) && canDoWithEquip(t2.equip, equip) && (!slot.pattern || t2.pattern === slot.pattern)
  ).sort((a, b) => {
    const tier = TIER_RANK[tierOf(a.name)] - TIER_RANK[tierOf(b.name)];
    if (tier) return tier;
    return a.pri.indexOf(slot.muscle) - b.pri.indexOf(slot.muscle);
  });
  if (pool.length) return pool[0];
  if (slot.pattern) return pickForSlot(data, day, { ...slot, pattern: void 0 }, used);
  return null;
}
function buildDayExercises(data, day, type) {
  const used = new Set(data.exercises.map((e) => e.name.toLowerCase()));
  const out = [];
  let order = 0;
  for (const slot of SLOTS[type]) {
    const t2 = pickForSlot(data, day, slot, used);
    if (!t2) continue;
    used.add(t2.name.toLowerCase());
    out.push({
      id: uid() + order,
      name: t2.name,
      day,
      type: t2.type,
      sets: slot.sets,
      rmin: t2.rmin,
      rmax: t2.rmax,
      inc: incFor(t2),
      unit: unitFor(t2),
      amrap: t2.amrap ?? false,
      machine: isMachineEx(t2) || void 0,
      order: order++
    });
  }
  return out;
}
function buildFullProgram(data, dayCount) {
  const split = SPLITS[dayCount] ?? SPLITS[4];
  const used = /* @__PURE__ */ new Set();
  const exercises = [];
  const labels = {};
  for (const { day, type } of split) {
    labels[day] = DAY_TYPE_SHORT[type];
    const picked = [];
    for (const slot of SLOTS[type]) {
      const t2 = pickForSlot(data, day, slot, used);
      if (!t2) continue;
      used.add(t2.name.toLowerCase());
      picked.push({ t: t2, sets: slot.sets });
    }
    const rank = { high: 0, moderate: 1, low: 2 };
    const isFinisher = (t2) => t2.pri.includes("core") || t2.pri.includes("calves");
    picked.sort((a, b) => {
      const fin = (isFinisher(a.t) ? 1 : 0) - (isFinisher(b.t) ? 1 : 0);
      return fin || rank[a.t.fatigue] - rank[b.t.fatigue];
    });
    picked.forEach(({ t: t2, sets }, order) => {
      exercises.push({
        id: uid() + exercises.length,
        name: t2.name,
        day,
        type: t2.type,
        sets,
        rmin: t2.rmin,
        rmax: t2.rmax,
        inc: incFor(t2),
        unit: unitFor(t2),
        amrap: t2.amrap ?? false,
        machine: isMachineEx(t2) || void 0,
        order
      });
    });
  }
  return { exercises, labels };
}
var OFFERED_SPLITS = [3, 4, 5];
var splitSummary = (dayCount) => {
  const split = SPLITS[dayCount] ?? SPLITS[4];
  return split.map((s) => DAY_TYPE_SHORT[s.type]).join(" \xB7 ");
};
var splitDays = (dayCount) => (SPLITS[dayCount] ?? SPLITS[4]).map((s) => s.day);

// src/lib/loop.ts
var MIN_LOOP_LEN = 2;
var MAX_LOOP_LEN = 7;
var isLoop = (d) => !!d.loop && d.loop.len >= MIN_LOOP_LEN;
var cycleLen = (d) => isLoop(d) ? Math.min(MAX_LOOP_LEN, d.loop.len) : 7;
var activeDays = (d) => isLoop(d) ? DAYS.slice(0, cycleLen(d)) : DAYS;
var slotName = (d, day) => isLoop(d) ? t(`\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${DAYS.indexOf(day) + 1}`, `Day ${DAYS.indexOf(day) + 1}`) : dayName(day);

// src/lib/recovery.ts
var MS_DAY = 864e5;
var dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / MS_DAY);
var SHORT_NIGHT_HOURS = 7;
var UNDER_RECOVERED_HOURS = 6.5;
var UNDER_RECOVERED_DAYS = 5;
function sleepSummary(data) {
  const log = data.sleepLog ?? [];
  const today = todayStr();
  const recent = log.filter((s) => {
    const ago = dayDiff(s.date, today);
    return ago >= 0 && ago <= 6;
  });
  const avg7 = recent.length ? +(recent.reduce((a, s) => a + s.hours, 0) / recent.length).toFixed(1) : null;
  const last5 = log.filter((s) => {
    const ago = dayDiff(s.date, today);
    return ago >= 0 && ago < UNDER_RECOVERED_DAYS;
  }).sort((a, b) => a.date.localeCompare(b.date));
  const underRecovered = last5.length >= UNDER_RECOVERED_DAYS && last5.reduce((a, s) => a + s.hours, 0) / last5.length < UNDER_RECOVERED_HOURS;
  return {
    avg7,
    shortNights: recent.filter((s) => s.hours < SHORT_NIGHT_HOURS).length,
    days: log.length,
    underRecovered
  };
}

// src/lib/analyzer.ts
function muscleMap(name) {
  const tpl = findTemplate(name);
  if (tpl) return musclesOf(tpl);
  const t2 = name.toLowerCase();
  const hits = [];
  const add = (m, w) => {
    if (!hits.some((h) => h.m === m)) hits.push({ m, w });
  };
  if (/bench|chest|fly|pec|dip|push.?up|ดันอก|วิดพื้น|เบนช์/.test(t2)) {
    add("chest", 1);
    add("triceps", 0.5);
    add("front_delts", 0.5);
  }
  if (/overhead press|shoulder press|ohp|military|pike|arnold|ดันไหล่|ดันบ่า/.test(t2)) {
    add("front_delts", 1);
    add("triceps", 0.5);
  }
  if (/lateral raise|side raise|กางข้าง|ยกข้าง/.test(t2)) add("side_delts", 1);
  if (/front raise|ยกหน้า/.test(t2)) add("front_delts", 1);
  if (/upright row|อัพไรท์/.test(t2)) {
    add("side_delts", 1);
    add("back", 0.5);
  }
  if (/face pull|rear delt|reverse fly|reverse pec|เฟซพูล|ไหล่หลัง|กางหลัง/.test(t2)) {
    add("rear_delts", 1);
    add("back", 0.5);
  }
  if (/pull.?up|chin.?up|pulldown|row|pullover|โรว์|ดึงข้อ|พูลดาวน์|ดึงหลัง/.test(t2)) {
    add("back", 1);
    add("biceps", 0.5);
    if (/row|โรว์/.test(t2)) add("rear_delts", 0.5);
    if (/towel|ผ้า/.test(t2)) add("forearms", 1);
  }
  if (/shrug|ยักไหล่|ชรัก/.test(t2)) add("back", 1);
  if (/curl/.test(t2) && !/wrist|leg|pronation|ข้อมือ|งอขา/.test(t2)) {
    add("biceps", 1);
    if (/hammer|reverse|แฮมเมอร์|คว่ำมือ/.test(t2)) add("forearms", 0.5);
  }
  if (/tricep|pushdown|skull|kickback|diamond|ไตรเซป|กดสาย/.test(t2) && !/leg|back/.test(t2)) add("triceps", 1);
  if (/extension/.test(t2) && /tricep|overhead|เหยียดไตรเซป/.test(t2)) add("triceps", 1);
  if (/squat|leg press|hack|lunge|step.?up|สควอท|ย่อขา|ลันจ์|ดันขา/.test(t2)) {
    add("quads", 1);
    add("glutes", 0.5);
  }
  if (/leg extension|เหยียดขา|sissy|wall sit/.test(t2)) add("quads", 1);
  if (/rdl|romanian|stiff leg|good morning|leg curl|nordic|hamstring|หลังขา|งอขา|กู้ดมอร์นิ่ง/.test(t2)) {
    add("hamstrings", 1);
    if (/rdl|romanian|good morning|อาร์ดีแอล/.test(t2)) add("glutes", 0.5);
  }
  if (/hip thrust|glute|bridge|kickback|abduction|สะพานก้น|ดันสะโพก|เตะก้น|ก้น/.test(t2)) add("glutes", 1);
  if (/deadlift|เดดลิฟต์|ดึงพื้น/.test(t2)) {
    add("back", 1);
    add("glutes", 1);
    add("hamstrings", 1);
    add("forearms", 0.5);
  }
  if (/back extension|hyperextension|แบ็กเอ็กซ์เทน/.test(t2)) {
    add("glutes", 1);
    add("hamstrings", 0.5);
  }
  if (/calf|น่อง|เขย่ง/.test(t2)) add("calves", 1);
  if (/plank|crunch|sit.?up|knee raise|leg raise|hollow|l.?sit|ab |core|dead bug|russian|twist|แพลงก์|ครันช์|ยกเข่า|ยกขา|ท้อง/.test(t2))
    add("core", 1);
  if (/wrist|pronation|farmer|grip|hang|ข้อมือ|ห้อยบาร์|หิ้ว/.test(t2)) add("forearms", 1);
  return hits;
}
function fatigueOf(ex) {
  const tpl = findTemplate(ex.name);
  if (tpl) return tpl.fatigue;
  if (ex.type !== "weight") return "low";
  return ex.rmax <= 8 ? "high" : ex.rmax <= 12 ? "moderate" : "low";
}
var patternOf = (ex) => findTemplate(ex.name)?.pattern ?? null;
function estimateMinutes(exs) {
  return Math.round(exs.reduce((a, ex) => a + ex.sets * MINUTES_PER_SET[fatigueOf(ex)], 0));
}
var DAY_IDX = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };
function hoursBetween(a, b, len = 7) {
  return ((DAY_IDX[b] - DAY_IDX[a]) % len + len) % len * 24;
}
function minGapHours(a, b, len = 7) {
  if (a === b) return 0;
  return Math.min(hoursBetween(a, b, len), hoursBetween(b, a, len));
}
function trainingDays(data) {
  return activeDays(data).filter((d) => exercisesForDay(data, d).length > 0);
}
function maxConsecutiveDays(train, len = 7) {
  const arr = DAYS.slice(0, len).map((d) => train.has(d));
  if (arr.every(Boolean)) return len;
  if (!arr.some(Boolean)) return 0;
  let max = 0;
  let cur = 0;
  for (const t2 of [...arr, ...arr]) {
    if (t2) {
      cur++;
      if (cur > max) max = cur;
    } else cur = 0;
  }
  return Math.min(len, max);
}
var W = { volume: 0.4, patterns: 0.2, recovery: 0.2, sessionCap: 0.1, order: 0.1 };
function analyzeProgram(data) {
  const target = getVolumeTarget(data);
  const maxSets = getMaxSetsPerSession(data);
  const timeCap = getTimeCap(data);
  const train = trainingDays(data);
  const len = cycleLen(data);
  const vol = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]));
  const volByDay = Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]))])
  );
  const daysHit = Object.fromEntries(MUSCLE_KEYS.map((m) => [m, /* @__PURE__ */ new Set()]));
  const priByDay = Object.fromEntries(
    DAYS.map((d) => [d, Object.fromEntries(MUSCLE_KEYS.map((m) => [m, 0]))])
  );
  const patternSets = /* @__PURE__ */ new Map();
  for (const day of activeDays(data))
    for (const ex of exercisesForDay(data, day)) {
      const heavyLift = fatigueOf(ex) === "high";
      for (const { m, w } of muscleMap(ex.name)) {
        vol[m] += ex.sets * w;
        volByDay[day][m] += ex.sets * w;
        if (w >= 1 && heavyLift) priByDay[day][m] += ex.sets;
        daysHit[m].add(day);
      }
      const p = patternOf(ex);
      if (p) patternSets.set(p, (patternSets.get(p) ?? 0) + ex.sets);
    }
  const achievableFreq = maxIndependentDays(train, len);
  const issues = [];
  const blockedInsights = [];
  const stats = MUSCLE_KEYS.map((m) => {
    const sets = Math.round(10 * vol[m]) / 10;
    const days = daysHit[m].size;
    const small = SMALL_MUSCLES.includes(m);
    const ceilHigh = target.warnHigh * (VOLUME_CEILING_MUL[m] ?? 1);
    const indirect = INDIRECT_MUSCLES.includes(m);
    const status = sets === 0 ? "missing" : !indirect && sets < target.warnLow ? "low" : !small && sets > ceilHigh ? "high" : "good";
    const wantDays = Math.min(2, achievableFreq);
    const blocked = status !== "missing" && days < wantDays && achievableFreq < 2;
    return {
      muscle: m,
      sets,
      days,
      target: [target.min, target.max],
      status,
      achievableDays: achievableFreq,
      blockedBy: blocked ? t("\u0E27\u0E31\u0E19\u0E1D\u0E36\u0E01\u0E2B\u0E48\u0E32\u0E07\u0E01\u0E31\u0E19\u0E44\u0E21\u0E48\u0E1E\u0E2D", "training days are too close together") : void 0
    };
  });
  const dayLoads = train.map((day) => {
    const exs = exercisesForDay(data, day);
    const sets = exs.reduce((a, e) => a + e.sets, 0);
    const minutes = estimateMinutes(exs);
    return { day, sets, exercises: exs.length, minutes, overSets: sets > maxSets, overTime: minutes > getDayTimeCap(data, day) };
  });
  const recovery = [];
  for (let i = 0; i < train.length; i++)
    for (let j = i + 1; j < train.length; j++) {
      const a = train[i];
      const b = train[j];
      const gap = minGapHours(a, b, len);
      if (gap >= MIN_RECOVERY_HOURS) continue;
      for (const m of MUSCLE_KEYS)
        if (priByDay[a][m] >= HEAVY_HIT_SETS && priByDay[b][m] >= HEAVY_HIT_SETS)
          recovery.push({ muscle: m, a, b, gapHours: gap });
    }
  const patterns = [...patternSets.entries()].map(([pattern, sets]) => ({ pattern, sets }));
  const pat = (p) => patternSets.get(p) ?? 0;
  let volHit = 0;
  let volCeil = 0;
  const scored = stats.filter((s) => !INDIRECT_MUSCLES.includes(s.muscle));
  for (const s of scored) {
    const inRange = s.status === "good";
    volHit += inRange ? 1 : s.status === "missing" ? 0 : 0.5;
    volCeil += 1;
    if (s.status === "missing" && MAJOR_MUSCLES.includes(s.muscle))
      issues.push(t(`\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E48\u0E32\u0E42\u0E14\u0E19${muscleName(s.muscle)}\u0E40\u0E25\u0E22`, `Nothing hits ${muscleName(s.muscle).toLowerCase()} at all`));
    else if (s.status === "low")
      issues.push(
        t(`${muscleName(s.muscle)} ${s.sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u2014 \u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E49\u0E32 ${target.min}`, `${muscleName(s.muscle)} ${s.sets} sets/week \u2014 below the ${target.min} target`)
      );
    else if (s.status === "high")
      issues.push(t(`${muscleName(s.muscle)} ${s.sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u2014 \u0E40\u0E01\u0E34\u0E19\u0E42\u0E0B\u0E19\u0E04\u0E38\u0E49\u0E21\u0E04\u0E48\u0E32`, `${muscleName(s.muscle)} ${s.sets} sets/week \u2014 past the useful zone`));
  }
  const volumeScore = scored.length ? volHit / scored.length : 1;
  const hPush = pat("horizontal_push");
  const hPull = pat("horizontal_pull");
  const allPull = hPull + pat("vertical_pull");
  const allPush = hPush + pat("vertical_push");
  const rearDeltSets = vol.rear_delts;
  const balanced = hPull >= hPush * 0.8 || allPull >= allPush * 0.8 && rearDeltSets >= 8;
  const checks = [
    {
      ok: balanced,
      msg: t(
        `\u0E17\u0E48\u0E32\u0E14\u0E36\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E32\u0E15\u0E31\u0E27 ${hPull} \u0E40\u0E0B\u0E15 \u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E17\u0E48\u0E32\u0E14\u0E31\u0E19\u0E2D\u0E2D\u0E01\u0E2B\u0E19\u0E49\u0E32 ${hPush} \u0E40\u0E0B\u0E15 \u2014 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E48\u0E2D`,
        `Horizontal pulling (${hPull} sets) trails horizontal pushing (${hPush} sets) \u2014 rounded shoulders risk`
      )
    },
    { ok: pat("vertical_pull") >= 1, msg: t("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E48\u0E32\u0E14\u0E36\u0E07\u0E25\u0E07\u0E25\u0E48\u0E32\u0E07\u0E40\u0E25\u0E22 (\u0E1E\u0E39\u0E25\u0E2D\u0E31\u0E1E/\u0E1E\u0E39\u0E25\u0E14\u0E32\u0E27\u0E19\u0E4C)", "No vertical pulling at all (pull-ups/pulldowns)") },
    { ok: hPull >= 1, msg: t("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E48\u0E32\u0E14\u0E36\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E32\u0E15\u0E31\u0E27\u0E40\u0E25\u0E22 (\u0E42\u0E23\u0E27\u0E4C)", "No horizontal pulling at all (rows)") },
    { ok: pat("hip_hinge") >= 3, msg: t("\u0E17\u0E48\u0E32\u0E1A\u0E32\u0E19\u0E1E\u0E31\u0E1A\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E40\u0E01\u0E34\u0E19 (RDL/\u0E2E\u0E34\u0E1B\u0E17\u0E23\u0E31\u0E2A) \u2014 \u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32\u0E41\u0E25\u0E30\u0E01\u0E49\u0E19\u0E08\u0E30\u0E02\u0E32\u0E14", "Too little hip hinging (RDL/hip thrust) \u2014 hamstrings and glutes fall short") }
  ];
  for (const c of checks) if (!c.ok) issues.push(c.msg);
  const patternScore = checks.filter((c) => c.ok).length / checks.length;
  const consecutive = maxConsecutiveDays(new Set(train), len);
  let recPenalty = Math.min(0.75, recovery.length * 0.15);
  for (const r of recovery)
    issues.push(
      t(
        `${muscleName(r.muscle)}\u0E42\u0E14\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E17\u0E31\u0E49\u0E07${slotName(data, r.a)}\u0E41\u0E25\u0E30${slotName(data, r.b)} \u0E2B\u0E48\u0E32\u0E07\u0E41\u0E04\u0E48 ${r.gapHours} \u0E0A\u0E21. \u2014 \u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23 ${MIN_RECOVERY_HOURS} \u0E0A\u0E21.`,
        `${muscleName(r.muscle)} gets hit hard on both ${slotName(data, r.a)} and ${slotName(data, r.b)}, only ${r.gapHours}h apart \u2014 needs ${MIN_RECOVERY_HOURS}h`
      )
    );
  if (consecutive > 3) issues.push(t(`\u0E1D\u0E36\u0E01\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E01\u0E31\u0E19 ${consecutive} \u0E27\u0E31\u0E19\u0E44\u0E21\u0E48\u0E1E\u0E31\u0E01`, `${consecutive} days in a row with no rest`));
  const recoveryScore = Math.max(0, 1 - recPenalty);
  const recoveryCeil = 1;
  const overDays = dayLoads.filter((d) => d.overSets || d.overTime);
  for (const d of overDays)
    issues.push(
      d.overTime ? t(
        `${slotName(data, d.day)}\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E23\u0E32\u0E27 ${d.minutes} \u0E19\u0E32\u0E17\u0E35 \u0E40\u0E01\u0E34\u0E19\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49 ${timeCap} \u0E19\u0E32\u0E17\u0E35`,
        `${slotName(data, d.day)} runs about ${d.minutes} min, over your ${timeCap} min limit`
      ) : t(`${slotName(data, d.day)}\u0E21\u0E35 ${d.sets} \u0E40\u0E0B\u0E15 \u0E40\u0E01\u0E34\u0E19\u0E40\u0E1E\u0E14\u0E32\u0E19 ${maxSets}`, `${slotName(data, d.day)} has ${d.sets} sets, over the ${maxSets} cap`)
    );
  const sessionScore = dayLoads.length ? 1 - overDays.length / dayLoads.length : 1;
  const orderScore = scoreOrder(data, train);
  if (orderScore < 1)
    issues.push(t("\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E17\u0E48\u0E32\u0E43\u0E19\u0E1A\u0E32\u0E07\u0E27\u0E31\u0E19\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30 \u2014 \u0E17\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E01\u0E04\u0E27\u0E23\u0E21\u0E32\u0E01\u0E48\u0E2D\u0E19\u0E17\u0E48\u0E32\u0E40\u0E08\u0E32\u0E30\u0E08\u0E07", "Some days are ordered awkwardly \u2014 heavy lifts should come before isolation"));
  const breakdown = {
    volume: volumeScore,
    patterns: patternScore,
    recovery: recoveryScore,
    sessionCap: sessionScore,
    order: orderScore
  };
  const execution = Math.round(
    100 * (W.volume * volumeScore + W.patterns * patternScore + W.recovery * recoveryScore + W.sessionCap * sessionScore + W.order * orderScore)
  );
  const volCeilScore = volCeil ? Math.min(1, capacityFor(data, train, maxSets, target.min, scored.length)) : 1;
  const ceiling = Math.round(
    100 * (W.volume * volCeilScore + W.patterns * 1 + W.recovery * recoveryCeil + W.sessionCap * 1 + W.order * 1)
  );
  if (achievableFreq < 2 && train.length > 0) {
    const lowFreq = stats.filter((s) => s.status !== "missing" && s.days < 2 && MAJOR_MUSCLES.includes(s.muscle));
    if (lowFreq.length)
      blockedInsights.push({
        issue: t(
          `${lowFreq.map((s) => muscleName(s.muscle)).slice(0, 3).join(", ")}\u0E42\u0E14\u0E19\u0E41\u0E04\u0E48 1 \u0E04\u0E23\u0E31\u0E49\u0E07/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C`,
          `${lowFreq.map((s) => muscleName(s.muscle)).slice(0, 3).join(", ")} only gets hit once a week`
        ),
        whyCannotFix: t(
          `\u0E1D\u0E36\u0E01 ${train.map((d) => slotName(data, d)).join("+")} \u2014 \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2B\u0E48\u0E32\u0E07\u0E01\u0E31\u0E19\u0E44\u0E21\u0E48\u0E16\u0E36\u0E07 ${MIN_RECOVERY_HOURS} \u0E0A\u0E21. \u0E08\u0E36\u0E07\u0E01\u0E23\u0E30\u0E08\u0E32\u0E22\u0E40\u0E1B\u0E47\u0E19 2 \u0E27\u0E31\u0E19\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49`,
          `You train ${train.map((d) => slotName(data, d)).join("+")} \u2014 those days sit less than ${MIN_RECOVERY_HOURS}h apart, so it can't be split across two`
        ),
        realSolution: t(
          "\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E27\u0E31\u0E19\u0E1D\u0E36\u0E01\u0E01\u0E25\u0E32\u0E07\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E23\u0E27\u0E21\u0E43\u0E19\u0E27\u0E31\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27\u0E44\u0E1B\u0E01\u0E48\u0E2D\u0E19 (\u0E22\u0E31\u0E07\u0E44\u0E14\u0E49\u0E1C\u0E25\u0E16\u0E49\u0E32\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19\u0E40\u0E1E\u0E14\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E27\u0E31\u0E19)",
          "Add a mid-week training day, or take the whole volume in one session for now (still works as long as you stay under the daily cap)"
        )
      });
  }
  const headline = execution >= ceiling - 2 ? ceiling >= 95 ? t("\u0E15\u0E32\u0E23\u0E32\u0E07\u0E2A\u0E21\u0E14\u0E38\u0E25\u0E14\u0E35\u0E21\u0E32\u0E01", "Really well balanced") : t("\u0E14\u0E35\u0E17\u0E35\u0E48\u0E2A\u0E38\u0E14\u0E40\u0E17\u0E48\u0E32\u0E17\u0E35\u0E48\u0E15\u0E32\u0E23\u0E32\u0E07\u0E19\u0E35\u0E49\u0E17\u0E33\u0E44\u0E14\u0E49\u0E41\u0E25\u0E49\u0E27", "As good as this program can get") : execution >= 70 ? t("\u0E42\u0E14\u0E22\u0E23\u0E27\u0E21\u0E14\u0E35 \u0E21\u0E35\u0E08\u0E38\u0E14\u0E40\u0E2A\u0E23\u0E34\u0E21\u0E44\u0E14\u0E49", "Solid overall, a few gaps to fill") : execution >= 50 ? t("\u0E43\u0E0A\u0E49\u0E44\u0E14\u0E49 \u0E41\u0E15\u0E48\u0E21\u0E35\u0E0A\u0E48\u0E2D\u0E07\u0E42\u0E2B\u0E27\u0E48\u0E04\u0E27\u0E23\u0E2D\u0E38\u0E14", "Workable, but there are holes worth closing") : t("\u0E04\u0E27\u0E23\u0E1B\u0E23\u0E31\u0E1A\u0E2B\u0E25\u0E32\u0E22\u0E08\u0E38\u0E14", "Several things need fixing");
  return {
    stats,
    score: execution,
    execution,
    ceiling,
    headline,
    issues,
    consecutive,
    dayLoads,
    recovery,
    patterns,
    blockedInsights,
    breakdown
  };
}
function maxIndependentDays(train, len = 7) {
  if (train.length <= 1) return train.length;
  let best = 1;
  const n = train.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    const pick2 = [];
    for (let i = 0; i < n; i++) if (mask & 1 << i) pick2.push(train[i]);
    let ok2 = true;
    for (let i = 0; i < pick2.length && ok2; i++)
      for (let j = i + 1; j < pick2.length; j++)
        if (minGapHours(pick2[i], pick2[j], len) < MIN_RECOVERY_HOURS) {
          ok2 = false;
          break;
        }
    if (ok2 && pick2.length > best) best = pick2.length;
  }
  return best;
}
function capacityFor(data, train, maxSets, minTarget, muscleCount) {
  if (!train.length) return 0;
  const capacity = train.reduce((a, d) => {
    const byTime = Math.floor(getDayTimeCap(data, d) / MINUTES_PER_SET.moderate);
    return a + Math.min(maxSets, byTime);
  }, 0);
  const needed = minTarget * muscleCount * 0.6;
  return needed ? Math.min(1, capacity / needed) : 1;
}
function scoreOrder(data, train) {
  const rank = { high: 0, moderate: 1, low: 2 };
  const isFinisher = (ex) => muscleMap(ex.name).some((h) => h.w >= 1 && (h.m === "core" || h.m === "calves"));
  let pairs = 0;
  let good = 0;
  for (const day of train) {
    const exs = exercisesForDay(data, day);
    let slack = 1;
    for (let i = 0; i + 1 < exs.length; i++) {
      pairs++;
      const a = exs[i];
      const b = exs[i + 1];
      if (isFinisher(a) && !isFinisher(b)) continue;
      if (isFinisher(b) && !isFinisher(a)) {
        good++;
        continue;
      }
      if (rank[fatigueOf(a)] <= rank[fatigueOf(b)]) good++;
      else if (slack > 0) {
        slack--;
        good++;
      }
    }
  }
  return pairs ? good / pairs : 1;
}
function checkFilters(data, tpl, day, addSets) {
  const exs = exercisesForDay(data, day);
  if (tpl?.avoid) {
    const hit = tpl.avoid.filter((a) => getInjuries(data).includes(a));
    if (hit.length)
      return {
        ok: false,
        reason: t("\u0E17\u0E48\u0E32\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E01\u0E31\u0E1A\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E17\u0E35\u0E48\u0E41\u0E08\u0E49\u0E07\u0E44\u0E27\u0E49", "This lift isn't a good fit for the injuries you listed"),
        fix: t("\u0E1B\u0E23\u0E36\u0E01\u0E29\u0E32\u0E41\u0E1E\u0E17\u0E22\u0E4C/\u0E19\u0E31\u0E01\u0E01\u0E32\u0E22\u0E20\u0E32\u0E1E\u0E01\u0E48\u0E2D\u0E19\u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E1D\u0E36\u0E01\u0E17\u0E48\u0E32\u0E19\u0E35\u0E49", "Check with a doctor or physio before training this again")
      };
  }
  if (tpl && !canDoWithEquip(tpl.equip, getDayEquip(data, day))) {
    return {
      ok: false,
      reason: t(`${slotName(data, day)}\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E17\u0E48\u0E32\u0E19\u0E35\u0E49\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E0A\u0E49`, `${slotName(data, day)} doesn't have the equipment this needs`),
      fix: t(
        "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E17\u0E48\u0E32\u0E17\u0E35\u0E48\u0E43\u0E0A\u0E49\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E17\u0E35\u0E48\u0E21\u0E35 \u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E01\u0E49\u0E2D\u0E38\u0E1B\u0E01\u0E23\u0E13\u0E4C\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E31\u0E49\u0E19\u0E43\u0E19\u0E41\u0E17\u0E47\u0E1A\u0E08\u0E31\u0E14\u0E01\u0E32\u0E23",
        "Pick a lift that uses what you have, or update that day's equipment on the Manage tab"
      )
    };
  }
  const curSets = exs.reduce((a, e) => a + e.sets, 0);
  if (curSets + addSets > getMaxSetsPerSession(data))
    return {
      ok: false,
      reason: t(`${slotName(data, day)}\u0E08\u0E30\u0E40\u0E01\u0E34\u0E19\u0E40\u0E1E\u0E14\u0E32\u0E19 ${getMaxSetsPerSession(data)} \u0E40\u0E0B\u0E15`, `${slotName(data, day)} would pass the ${getMaxSetsPerSession(data)}-set cap`),
      fix: t("\u0E22\u0E49\u0E32\u0E22\u0E1A\u0E32\u0E07\u0E17\u0E48\u0E32\u0E44\u0E1B\u0E27\u0E31\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E01\u0E48\u0E2D\u0E19", "Move something to another day first")
    };
  const addMin = tpl ? addSets * MINUTES_PER_SET[tpl.fatigue] : addSets * MINUTES_PER_SET.moderate;
  if (estimateMinutes(exs) + addMin > getDayTimeCap(data, day))
    return {
      ok: false,
      reason: t(`${slotName(data, day)}\u0E21\u0E35\u0E40\u0E27\u0E25\u0E32\u0E41\u0E04\u0E48 ${getDayTimeCap(data, day)} \u0E19\u0E32\u0E17\u0E35 \u0E40\u0E15\u0E47\u0E21\u0E41\u0E25\u0E49\u0E27`, `${slotName(data, day)} only has ${getDayTimeCap(data, day)} min and it's full`),
      fix: t("\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E27\u0E25\u0E32\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E31\u0E49\u0E19 \u0E2B\u0E23\u0E37\u0E2D\u0E43\u0E2A\u0E48\u0E17\u0E48\u0E32\u0E19\u0E35\u0E49\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E21\u0E35\u0E40\u0E27\u0E25\u0E32\u0E40\u0E2B\u0E25\u0E37\u0E2D", "Give that day more time, or put this on a day with room left")
    };
  const primary = tpl?.pri[0];
  if (primary) {
    let cur = 0;
    for (const ex of exs) for (const h of muscleMap(ex.name)) if (h.m === primary) cur += ex.sets * h.w;
    if (cur + addSets > MAX_SETS_PER_MUSCLE_PER_SESSION)
      return {
        ok: false,
        reason: t(
          `${muscleName(primary)}\u0E43\u0E19${slotName(data, day)}\u0E08\u0E30\u0E40\u0E01\u0E34\u0E19 ${MAX_SETS_PER_MUSCLE_PER_SESSION} \u0E40\u0E0B\u0E15`,
          `${muscleName(primary)} on ${slotName(data, day)} would pass ${MAX_SETS_PER_MUSCLE_PER_SESSION} sets`
        ),
        fix: t("\u0E01\u0E23\u0E30\u0E08\u0E32\u0E22\u0E44\u0E1B\u0E27\u0E31\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E17\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E31\u0E14\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E27\u0E31\u0E19\u0E40\u0E14\u0E35\u0E22\u0E27", "Spread it across days instead of stacking one")
      };
  }
  if (primary) {
    for (const other of trainingDays(data)) {
      if (other === day) continue;
      let load = 0;
      for (const ex of exercisesForDay(data, other)) for (const h of muscleMap(ex.name)) if (h.m === primary) load += ex.sets * h.w;
      if (load < HEAVY_HIT_SETS) continue;
      const gap = minGapHours(other, day, cycleLen(data));
      if (gap < MIN_RECOVERY_HOURS)
        return {
          ok: false,
          reason: t(
            `${muscleName(primary)}\u0E42\u0E14\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27\u0E43\u0E19${slotName(data, other)} \u0E2B\u0E48\u0E32\u0E07\u0E01\u0E31\u0E19\u0E41\u0E04\u0E48 ${gap} \u0E0A\u0E21.`,
            `${muscleName(primary)} already gets hit hard on ${slotName(data, other)}, only ${gap}h apart`
          ),
          fix: t(`\u0E40\u0E27\u0E49\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 ${MIN_RECOVERY_HOURS} \u0E0A\u0E21. \u2014 \u0E43\u0E2A\u0E48\u0E27\u0E31\u0E19\u0E2D\u0E37\u0E48\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E27\u0E31\u0E19\u0E1D\u0E36\u0E01`, `Leave at least ${MIN_RECOVERY_HOURS}h \u2014 use another day or add one`)
        };
    }
  }
  return { ok: true };
}
var ADHERENCE_WEEKS = 3;
var ADHERENCE_LOW_PCT = 75;
function adherence(data) {
  const perWeek = trainingDays(data).length;
  const weeks = ADHERENCE_WEEKS;
  const planned = perWeek * weeks;
  if (!planned) return { planned: 0, done: 0, pct: 100, weeks, low: false };
  const cutoff = Date.now() - weeks * 7 * 864e5;
  const daysWithLogs = /* @__PURE__ */ new Set();
  for (const sessions of Object.values(data.history))
    for (const s of sessions) {
      const t2 = Date.parse(s.date);
      if (Number.isFinite(t2) && t2 >= cutoff && s.sets.some(Boolean)) daysWithLogs.add(s.date);
    }
  const done = daysWithLogs.size;
  const pct = Math.round(100 * done / planned);
  return { planned, done, pct, weeks, low: pct < ADHERENCE_LOW_PCT };
}
function candidatesFor(muscle) {
  return EXERCISE_DB.filter((t2) => t2.pri.includes(muscle)).sort(
    (a, b) => TIER_RANK[tierOf(a.name)] - TIER_RANK[tierOf(b.name)] || a.pri.length + (a.sec?.length ?? 0) - (b.pri.length + (b.sec?.length ?? 0))
  ).map((t2) => ({
    name: t2.name,
    muscle,
    type: t2.type,
    sets: t2.sets,
    rmin: t2.rmin,
    rmax: t2.rmax,
    reason: tipOf(t2),
    tpl: t2
  }));
}
function exerciseFromTemplate(t2, day, order, id) {
  return {
    id,
    name: t2.name,
    day,
    type: t2.type,
    sets: t2.sets,
    rmin: t2.rmin,
    rmax: t2.rmax,
    inc: incFor(t2),
    unit: unitFor(t2),
    amrap: t2.amrap ?? false,
    machine: isMachineEx(t2) || void 0,
    order
  };
}
var MIN_SETS_PER_EX = 3;
var MAX_SETS_PER_EX = 5;
var MAX_RECOMMENDATIONS = 3;
var MUSCLE_TO_TYPE = {
  chest: "push",
  front_delts: "push",
  side_delts: "push",
  triceps: "push",
  back: "pull",
  rear_delts: "pull",
  biceps: "pull",
  forearms: "pull",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs"
};
function canIncreaseSets(data, ex) {
  if (ex.sets >= MAX_SETS_PER_EX) return false;
  const exs = exercisesForDay(data, ex.day);
  const curSets = exs.reduce((a, e) => a + e.sets, 0);
  if (curSets + 1 > getMaxSetsPerSession(data)) return false;
  if (estimateMinutes(exs) + MINUTES_PER_SET[fatigueOf(ex)] > getDayTimeCap(data, ex.day)) return false;
  const primary = muscleMap(ex.name).find((h) => h.w >= 1)?.m;
  if (primary) {
    let cur = 0;
    for (const e of exs) for (const h of muscleMap(e.name)) if (h.m === primary) cur += e.sets * h.w;
    if (cur + 1 > MAX_SETS_PER_MUSCLE_PER_SESSION) return false;
  }
  return true;
}
function predictedScore(data, rec) {
  return predictedAnalysis(data, rec).execution;
}
function blockedInsight(analysis, insight) {
  if (analysis.blockedInsights.some((b) => b.issue === insight.issue)) return;
  analysis.blockedInsights.push(insight);
}
function predictedAnalysis(data, rec) {
  const clone = structuredClone(data);
  applyRecommendation(clone, rec);
  const a = analyzeProgram(clone);
  return { execution: a.execution, ceiling: a.ceiling, breakdown: a.breakdown };
}
function dayCategories(data, day) {
  const cats = /* @__PURE__ */ new Set();
  for (const ex of exercisesForDay(data, day))
    for (const h of muscleMap(ex.name)) {
      if (h.w < 1) continue;
      const t2 = MUSCLE_TO_TYPE[h.m];
      if (t2) cats.add(t2);
    }
  return cats;
}
function findValidDay(data, tpl, sets) {
  const days = trainingDays(data);
  const primary = tpl.pri[0];
  const targetType = MUSCLE_TO_TYPE[primary];
  const anyMatchingDay = days.some((day) => {
    const cats = dayCategories(data, day);
    return cats.size > 0 && (!targetType || cats.has(targetType));
  });
  const hasSameRole = (day) => exercisesForDay(data, day).some((ex) => {
    const t2 = findTemplate(ex.name);
    return !!t2 && t2.pattern === tpl.pattern && t2.pri[0] === tpl.pri[0];
  });
  const trainsMuscle = (day) => {
    if (hasSameRole(day)) return false;
    const cats = dayCategories(data, day);
    if (!cats.size) return false;
    if (targetType && cats.has(targetType)) return true;
    return !anyMatchingDay;
  };
  const load = (day) => exercisesForDay(data, day).reduce((x, e) => x + e.sets, 0);
  const sorted = [...days].sort((a, b) => {
    const fit = (trainsMuscle(a) ? 0 : 1) - (trainsMuscle(b) ? 0 : 1);
    return fit || load(a) - load(b);
  });
  for (const day of sorted) {
    if (!trainsMuscle(day)) continue;
    const v = checkFilters(data, tpl, day, sets);
    if (v.ok) return { day, verdict: v };
  }
  return null;
}
function buildRecommendations(data, analysis) {
  const recs = [];
  const existing = new Set(data.exercises.map((e) => normName(e.name)));
  const target = getVolumeTarget(data);
  let n = 0;
  const mkId = () => "rec" + n++;
  const adh = adherence(data);
  if (adh.low && adh.planned > 0) {
    const realistic = Math.max(1, Math.round(adh.done / adh.weeks));
    blockedInsight(analysis, {
      issue: t(
        `${adh.weeks} \u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E25\u0E48\u0E32\u0E2A\u0E38\u0E14\u0E17\u0E33\u0E44\u0E14\u0E49 ${adh.done}/${adh.planned} \u0E04\u0E23\u0E31\u0E49\u0E07 (${adh.pct}%)`,
        `Over the last ${adh.weeks} weeks you hit ${adh.done}/${adh.planned} sessions (${adh.pct}%)`
      ),
      whyCannotFix: t(
        `\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49 ${trainingDays(data).length} \u0E27\u0E31\u0E19/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E41\u0E15\u0E48\u0E17\u0E33\u0E44\u0E14\u0E49\u0E08\u0E23\u0E34\u0E07\u0E23\u0E32\u0E27 ${realistic} \u0E27\u0E31\u0E19`,
        `The plan says ${trainingDays(data).length} days/week but you actually manage about ${realistic}`
      ),
      realSolution: t(
        `\u0E15\u0E32\u0E23\u0E32\u0E07\u0E17\u0E35\u0E48\u0E17\u0E33\u0E44\u0E14\u0E49\u0E04\u0E23\u0E1A ${realistic} \u0E27\u0E31\u0E19\u0E43\u0E2B\u0E49\u0E1C\u0E25\u0E14\u0E35\u0E01\u0E27\u0E48\u0E32\u0E15\u0E32\u0E23\u0E32\u0E07 ${trainingDays(data).length} \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E02\u0E32\u0E14\u0E1B\u0E23\u0E30\u0E08\u0E33 \u2014 \u0E25\u0E2D\u0E07\u0E22\u0E49\u0E32\u0E22\u0E17\u0E48\u0E32\u0E2A\u0E33\u0E04\u0E31\u0E0D\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E02\u0E32\u0E14\u0E1A\u0E48\u0E2D\u0E22\u0E44\u0E1B\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E44\u0E1B\u0E44\u0E14\u0E49\u0E41\u0E19\u0E48`,
        `A ${realistic}-day plan you finish beats a ${trainingDays(data).length}-day plan you keep missing \u2014 move the important lifts off the days you skip onto the ones you always make`
      )
    });
  }
  const sleep = sleepSummary(data);
  if (sleep.underRecovered) {
    blockedInsight(analysis, {
      issue: t(`\u0E19\u0E2D\u0E19\u0E40\u0E09\u0E25\u0E35\u0E48\u0E22 ${sleep.avg7 ?? "<6.5"} \u0E0A\u0E21./\u0E04\u0E37\u0E19 \u0E15\u0E34\u0E14\u0E01\u0E31\u0E19\u0E2B\u0E25\u0E32\u0E22\u0E27\u0E31\u0E19`, `Averaging ${sleep.avg7 ?? "<6.5"}h of sleep a night for several days`),
      whyCannotFix: t(
        "\u0E1F\u0E37\u0E49\u0E19\u0E15\u0E31\u0E27\u0E44\u0E21\u0E48\u0E17\u0E31\u0E19 \u2014 \u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13\u0E15\u0E2D\u0E19\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E17\u0E33\u0E43\u0E2B\u0E49\u0E42\u0E15\u0E02\u0E36\u0E49\u0E19 \u0E41\u0E15\u0E48\u0E25\u0E49\u0E32\u0E2A\u0E30\u0E2A\u0E21\u0E41\u0E25\u0E30\u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E1A\u0E32\u0E14\u0E40\u0E08\u0E47\u0E1A",
        "You're not recovering \u2014 adding volume now won't build anything, it just piles on fatigue and injury risk"
      ),
      realSolution: t(
        "\u0E04\u0E2D\u0E02\u0E27\u0E14\u0E2D\u0E22\u0E39\u0E48\u0E17\u0E35\u0E48\u0E01\u0E32\u0E23\u0E19\u0E2D\u0E19 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E32\u0E23\u0E32\u0E07 \u2014 \u0E19\u0E2D\u0E19\u0E43\u0E2B\u0E49\u0E16\u0E36\u0E07 7 \u0E0A\u0E21. \u0E2A\u0E31\u0E01 1 \u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C\u0E01\u0E48\u0E2D\u0E19\u0E04\u0E48\u0E2D\u0E22\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E1B\u0E23\u0E34\u0E21\u0E32\u0E13",
        "Sleep is the bottleneck, not the program \u2014 get to 7h for a week before adding volume"
      )
    });
  }
  if (data.exercises.length === 0) {
    for (const dayCount of OFFERED_SPLITS) {
      const built = buildFullProgram(data, dayCount);
      if (!built.exercises.length) continue;
      const sets = built.exercises.reduce((a, e) => a + e.sets, 0);
      const days = splitDays(dayCount);
      const restDays = DAYS.filter((d) => !days.includes(d));
      const probe = { ...data, exercises: built.exercises, dayLabels: { ...data.dayLabels, ...built.labels } };
      const predicted = analyzeProgram(probe).execution;
      recs.push({
        id: mkId(),
        kind: "buildProgram",
        splitDays: dayCount,
        title: t(`\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E42\u0E1B\u0E23\u0E41\u0E01\u0E23\u0E21 ${dayCount} \u0E27\u0E31\u0E19/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C`, `Build a ${dayCount}-day program`),
        detail: t(
          `${splitSummary(dayCount)} \u2014 ${built.exercises.length} \u0E17\u0E48\u0E32 ${sets} \u0E40\u0E0B\u0E15 \xB7 \u0E1E\u0E31\u0E01${restDays.map((d) => slotName(data, d)).join(" ")}`,
          `${splitSummary(dayCount)} \u2014 ${built.exercises.length} exercises, ${sets} sets \xB7 rest ${restDays.map((d) => slotName(data, d)).join(" ")}`
        ),
        reason: t(
          `\u0E1D\u0E36\u0E01${days.map((d) => slotName(data, d)).join(" ")} \xB7 \u0E01\u0E25\u0E49\u0E32\u0E21\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E01\u0E25\u0E38\u0E48\u0E21\u0E40\u0E14\u0E34\u0E21\u0E2B\u0E48\u0E32\u0E07\u0E01\u0E31\u0E19\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 48 \u0E0A\u0E21. \u2014 \u0E04\u0E32\u0E14\u0E27\u0E48\u0E32\u0E08\u0E30\u0E44\u0E14\u0E49 ${predicted} \u0E04\u0E30\u0E41\u0E19\u0E19`,
          `Train ${days.map((d) => slotName(data, d)).join(" ")} \xB7 same muscle group always 48h+ apart \u2014 should score ${predicted}`
        ),
        gain: predicted,
        priority: "high"
      });
    }
    return recs.sort((a, b) => b.gain - a.gain).slice(0, 3);
  }
  for (const dl of analysis.dayLoads.filter((d) => d.overSets || d.overTime)) {
    blockedInsight(analysis, {
      issue: dl.overTime ? t(
        `${slotName(data, dl.day)}\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E23\u0E32\u0E27 ${dl.minutes} \u0E19\u0E32\u0E17\u0E35 (\u0E21\u0E35\u0E40\u0E27\u0E25\u0E32 ${getDayTimeCap(data, dl.day)})`,
        `${slotName(data, dl.day)} runs about ${dl.minutes} min (you have ${getDayTimeCap(data, dl.day)})`
      ) : t(
        `${slotName(data, dl.day)}\u0E21\u0E35 ${dl.sets} \u0E40\u0E0B\u0E15 (\u0E40\u0E1E\u0E14\u0E32\u0E19 ${getMaxSetsPerSession(data)})`,
        `${slotName(data, dl.day)} has ${dl.sets} sets (cap is ${getMaxSetsPerSession(data)})`
      ),
      whyCannotFix: t("\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E41\u0E19\u0E48\u0E19\u0E40\u0E01\u0E34\u0E19\u0E40\u0E1E\u0E14\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49 \u2014 \u0E40\u0E0B\u0E15\u0E17\u0E49\u0E32\u0E22\u0E46 \u0E08\u0E30\u0E44\u0E14\u0E49\u0E41\u0E23\u0E07\u0E44\u0E21\u0E48\u0E40\u0E15\u0E47\u0E21", "That day is over your own limit \u2014 the last sets won't get your full effort"),
      realSolution: t("\u0E22\u0E49\u0E32\u0E22\u0E17\u0E48\u0E32\u0E17\u0E49\u0E32\u0E22\u0E44\u0E1B\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E27\u0E48\u0E32\u0E07\u0E08\u0E23\u0E34\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E14\u0E40\u0E0B\u0E15\u0E17\u0E48\u0E32\u0E17\u0E35\u0E48\u0E0B\u0E49\u0E33\u0E0B\u0E49\u0E2D\u0E19\u0E25\u0E07", "Move the tail end to a day you're genuinely free, or trim sets from the redundant lifts")
    });
  }
  for (const r of analysis.recovery.slice(0, 2)) {
    blockedInsight(analysis, {
      issue: t(
        `${muscleName(r.muscle)}\u0E42\u0E14\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E17\u0E31\u0E49\u0E07${slotName(data, r.a)}\u0E41\u0E25\u0E30${slotName(data, r.b)} \u0E2B\u0E48\u0E32\u0E07\u0E01\u0E31\u0E19\u0E41\u0E04\u0E48 ${r.gapHours} \u0E0A\u0E21.`,
        `${muscleName(r.muscle)} gets hit hard on both ${slotName(data, r.a)} and ${slotName(data, r.b)}, only ${r.gapHours}h apart`
      ),
      whyCannotFix: t(`\u0E01\u0E25\u0E49\u0E32\u0E21\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23 ${MIN_RECOVERY_HOURS} \u0E0A\u0E21. \u0E01\u0E48\u0E2D\u0E19\u0E42\u0E14\u0E19\u0E2B\u0E19\u0E31\u0E01\u0E0B\u0E49\u0E33`, `Muscle needs ${MIN_RECOVERY_HOURS}h before taking another hard session`),
      realSolution: t(
        `\u0E16\u0E49\u0E32\u0E2A\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E35\u0E49\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49 \u0E43\u0E2B\u0E49\u0E25\u0E14\u0E40\u0E0B\u0E15${muscleName(r.muscle)}\u0E43\u0E19\u0E27\u0E31\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E25\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E2A\u0E25\u0E31\u0E1A\u0E40\u0E1B\u0E47\u0E19\u0E17\u0E48\u0E32\u0E40\u0E1A\u0E32\u0E01\u0E27\u0E48\u0E32`,
        `If those two days are fixed, cut ${muscleName(r.muscle).toLowerCase()} sets on one of them or swap in something lighter`
      )
    });
  }
  if (analysis.breakdown.order < 0.85) {
    blockedInsight(analysis, {
      issue: t("\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E17\u0E48\u0E32\u0E43\u0E19\u0E1A\u0E32\u0E07\u0E27\u0E31\u0E19\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30", "Some days aren't in a great order"),
      whyCannotFix: t("\u0E21\u0E35\u0E17\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E01\u0E2D\u0E22\u0E39\u0E48\u0E2B\u0E25\u0E31\u0E07\u0E17\u0E48\u0E32\u0E40\u0E08\u0E32\u0E30\u0E08\u0E07 \u0E17\u0E33\u0E43\u0E2B\u0E49\u0E17\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E01\u0E44\u0E14\u0E49\u0E41\u0E23\u0E07\u0E44\u0E21\u0E48\u0E40\u0E15\u0E47\u0E21", "A heavy lift sits after isolation work, so it doesn't get your full strength"),
      realSolution: t(
        "\u0E40\u0E23\u0E35\u0E22\u0E07\u0E17\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E01/compound \u0E44\u0E27\u0E49\u0E15\u0E49\u0E19\u0E27\u0E31\u0E19 \u0E41\u0E25\u0E49\u0E27\u0E40\u0E01\u0E47\u0E1A\u0E17\u0E48\u0E32\u0E40\u0E08\u0E32\u0E30\u0E08\u0E07 \u0E17\u0E49\u0E2D\u0E07 \u0E19\u0E48\u0E2D\u0E07 \u0E44\u0E27\u0E49\u0E1B\u0E34\u0E14\u0E17\u0E49\u0E32\u0E22",
        "Put the heavy compounds first and save isolation, abs, and calves for the end"
      )
    });
  }
  const patSets = new Map(analysis.patterns.map((p) => [p.pattern, p.sets]));
  const patVal = (p) => patSets.get(p) ?? 0;
  const hPush2 = patVal("horizontal_push");
  const hPull2 = patVal("horizontal_pull");
  const patternNeeds = [];
  if (hPull2 < hPush2 * 0.8 || hPull2 < 1)
    patternNeeds.push({
      pattern: "horizontal_pull",
      muscle: "back",
      why: t("\u0E17\u0E48\u0E32\u0E14\u0E36\u0E07\u0E40\u0E02\u0E49\u0E32\u0E2B\u0E32\u0E15\u0E31\u0E27\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E17\u0E48\u0E32\u0E14\u0E31\u0E19\u0E2D\u0E2D\u0E01\u0E2B\u0E19\u0E49\u0E32 \u2014 \u0E40\u0E2A\u0E35\u0E48\u0E22\u0E07\u0E44\u0E2B\u0E25\u0E48\u0E2B\u0E48\u0E2D", "Less horizontal pulling than pushing \u2014 rounded shoulders risk")
    });
  if (patVal("vertical_pull") < 1)
    patternNeeds.push({ pattern: "vertical_pull", muscle: "back", why: t("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E48\u0E32\u0E14\u0E36\u0E07\u0E25\u0E07\u0E25\u0E48\u0E32\u0E07\u0E40\u0E25\u0E22", "No vertical pulling at all") });
  if (patVal("hip_hinge") < 3)
    patternNeeds.push({
      pattern: "hip_hinge",
      muscle: "hamstrings",
      why: t("\u0E17\u0E48\u0E32\u0E1A\u0E32\u0E19\u0E1E\u0E31\u0E1A\u0E2A\u0E30\u0E42\u0E1E\u0E01\u0E19\u0E49\u0E2D\u0E22\u0E40\u0E01\u0E34\u0E19 \u2014 \u0E2B\u0E25\u0E31\u0E07\u0E02\u0E32\u0E41\u0E25\u0E30\u0E01\u0E49\u0E19\u0E08\u0E30\u0E02\u0E32\u0E14", "Too little hip hinging \u2014 hamstrings and glutes fall short")
    });
  for (const need of patternNeeds) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const cands = candidatesFor(need.muscle).filter((c) => !existing.has(normName(c.name)) && c.tpl?.pattern === need.pattern);
    let bestPat = null;
    for (const c of cands) {
      if (!c.tpl) continue;
      const spot = findValidDay(data, c.tpl, MIN_SETS_PER_EX);
      if (!spot) continue;
      const candidateRec = {
        id: mkId(),
        kind: "add",
        template: c,
        day: spot.day,
        title: t(`\u0E40\u0E1E\u0E34\u0E48\u0E21 ${c.name}`, `Add ${c.name}`),
        detail: t(
          `\u0E43\u0E2A\u0E48\u0E40\u0E02\u0E49\u0E32${slotName(data, spot.day)} ${MIN_SETS_PER_EX} \u0E40\u0E0B\u0E15 \u2014 ${c.reason}`,
          `${MIN_SETS_PER_EX} sets on ${slotName(data, spot.day)} \u2014 ${c.reason}`
        ),
        reason: need.why,
        gain: 0,
        priority: "high"
      };
      const predicted = predictedScore(data, candidateRec);
      if (!bestPat || predicted > bestPat.predicted) bestPat = { rec: candidateRec, predicted };
      if (bestPat.predicted >= 100) break;
    }
    if (bestPat && bestPat.predicted >= analysis.execution) {
      bestPat.rec.gain = bestPat.predicted - analysis.execution;
      recs.push(bestPat.rec);
    }
  }
  const gaps = analysis.stats.filter((s) => s.status === "missing" || s.status === "low").sort((a, b) => {
    const majA = MAJOR_MUSCLES.includes(a.muscle) ? 1 : 0;
    const majB = MAJOR_MUSCLES.includes(b.muscle) ? 1 : 0;
    return majB - majA || a.sets - b.sets;
  });
  for (const s of gaps) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const cands = candidatesFor(s.muscle).filter((c) => !existing.has(normName(c.name)));
    const blockedReasons = [];
    let bestOption = null;
    const consider = (rec, predicted, ceiling) => {
      if (predicted < analysis.execution) return;
      if (!bestOption || ceiling > bestOption.ceiling || ceiling === bestOption.ceiling && predicted > bestOption.predicted)
        bestOption = { rec, predicted, ceiling };
    };
    for (const c of cands) {
      if (!c.tpl) continue;
      const spot = findValidDay(data, c.tpl, MIN_SETS_PER_EX);
      if (!spot) {
        const v = checkFilters(data, c.tpl, trainingDays(data)[0] ?? "mon", MIN_SETS_PER_EX);
        blockedReasons.push(v);
        continue;
      }
      const candidateRec = {
        id: mkId(),
        kind: "add",
        template: c,
        day: spot.day,
        title: t(`\u0E40\u0E1E\u0E34\u0E48\u0E21 ${c.name}`, `Add ${c.name}`),
        detail: t(
          `\u0E43\u0E2A\u0E48\u0E40\u0E02\u0E49\u0E32${slotName(data, spot.day)} ${MIN_SETS_PER_EX} \u0E40\u0E0B\u0E15 \u2014 ${c.reason}`,
          `${MIN_SETS_PER_EX} sets on ${slotName(data, spot.day)} \u2014 ${c.reason}`
        ),
        reason: t(
          `${muscleName(s.muscle)}\u0E44\u0E14\u0E49 ${s.sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E49\u0E32 ${target.min}`,
          `${muscleName(s.muscle)} gets ${s.sets} sets/week, below the ${target.min} target`
        ),
        gain: 0,
        priority: s.status === "missing" && MAJOR_MUSCLES.includes(s.muscle) ? "high" : "medium"
      };
      const { execution: predicted, ceiling } = predictedAnalysis(data, candidateRec);
      consider(candidateRec, predicted, ceiling);
    }
    const bumpable = data.exercises.filter(
      (ex) => canIncreaseSets(data, ex) && muscleMap(ex.name).some((h) => h.m === s.muscle && h.w >= 1)
    );
    for (const bump of bumpable) {
      const candidateRec = {
        id: mkId(),
        kind: "increaseSets",
        exerciseId: bump.id,
        title: t(`\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E0B\u0E15 ${bump.name}`, `Add a set to ${bump.name}`),
        detail: t(
          `\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E08\u0E32\u0E01 ${bump.sets} \u0E40\u0E1B\u0E47\u0E19 ${bump.sets + 1} \u0E40\u0E0B\u0E15 \u2014 \u0E17\u0E48\u0E32\u0E19\u0E35\u0E49\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27 \u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E16\u0E36\u0E07\u0E40\u0E1E\u0E14\u0E32\u0E19\u0E15\u0E48\u0E2D\u0E17\u0E48\u0E32`,
          `${bump.sets} \u2192 ${bump.sets + 1} sets \u2014 it's already in the program and under the per-exercise cap`
        ),
        reason: t(
          `${muscleName(s.muscle)}\u0E44\u0E14\u0E49 ${s.sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E15\u0E48\u0E33\u0E01\u0E27\u0E48\u0E32\u0E40\u0E1B\u0E49\u0E32 ${target.min}`,
          `${muscleName(s.muscle)} gets ${s.sets} sets/week, below the ${target.min} target`
        ),
        gain: 0,
        priority: "medium"
      };
      const { execution: predicted, ceiling } = predictedAnalysis(data, candidateRec);
      consider(candidateRec, predicted, ceiling);
    }
    let placed = false;
    if (bestOption) {
      const chosen = bestOption;
      chosen.rec.gain = chosen.predicted - analysis.execution;
      recs.push(chosen.rec);
      placed = true;
    }
    if (!placed) {
      const top = blockedReasons[0];
      const already = analysis.blockedInsights.some((b) => b.issue.includes(muscleName(s.muscle)));
      if (!already)
        blockedInsight(analysis, {
          issue: t(
            `${muscleName(s.muscle)}\u0E44\u0E14\u0E49 ${s.sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C (\u0E40\u0E1B\u0E49\u0E32 ${target.min}-${target.max})`,
            `${muscleName(s.muscle)} gets ${s.sets} sets/week (target ${target.min}-${target.max})`
          ),
          whyCannotFix: top?.reason ?? t("\u0E27\u0E31\u0E19\u0E1D\u0E36\u0E01\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E35\u0E48\u0E27\u0E48\u0E32\u0E07\u0E17\u0E35\u0E48\u0E40\u0E2B\u0E21\u0E32\u0E30\u0E01\u0E31\u0E1A\u0E01\u0E25\u0E49\u0E32\u0E21\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E01\u0E25\u0E38\u0E48\u0E21\u0E19\u0E35\u0E49", "None of your current days have room that suits this muscle group"),
          realSolution: top?.fix ?? t(
            `\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E0B\u0E15${muscleName(s.muscle)}\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E04\u0E38\u0E13\u0E27\u0E48\u0E32\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E41\u0E17\u0E19\u0E17\u0E48\u0E32\u0E17\u0E35\u0E48\u0E0B\u0E49\u0E33\u0E0B\u0E49\u0E2D\u0E19\u0E14\u0E49\u0E27\u0E22\u0E17\u0E48\u0E32\u0E02\u0E2D\u0E07\u0E01\u0E25\u0E38\u0E48\u0E21\u0E19\u0E35\u0E49`,
            `Add ${muscleName(s.muscle).toLowerCase()} sets on a day you're free, or swap a redundant lift for one that hits it`
          )
        });
    }
  }
  for (const s of analysis.stats.filter((s2) => s2.status === "high")) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const weightOf = (ex) => muscleMap(ex.name).find((h) => h.m === s.muscle)?.w ?? 0;
    const contributors = data.exercises.filter((ex) => weightOf(ex) > 0).sort((a, b) => weightOf(b) - weightOf(a) || b.sets - a.sets);
    const cut = contributors.find((ex) => ex.sets > MIN_SETS_PER_EX);
    if (!cut) continue;
    const candidateRec = {
      id: mkId(),
      kind: "reduceSets",
      exerciseId: cut.id,
      title: t(`\u0E25\u0E14\u0E40\u0E0B\u0E15 ${cut.name}`, `Cut a set from ${cut.name}`),
      detail: t(
        `\u0E25\u0E14\u0E40\u0E2B\u0E25\u0E37\u0E2D ${cut.sets - 1} \u0E40\u0E0B\u0E15 \u2014 \u0E40\u0E2D\u0E32\u0E40\u0E27\u0E25\u0E32\u0E44\u0E1B\u0E40\u0E15\u0E34\u0E21\u0E01\u0E25\u0E49\u0E32\u0E21\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E02\u0E32\u0E14\u0E04\u0E38\u0E49\u0E21\u0E01\u0E27\u0E48\u0E32`,
        `Down to ${cut.sets - 1} sets \u2014 that time is worth more on a muscle that's short`
      ),
      reason: t(
        `${muscleName(s.muscle)}\u0E44\u0E14\u0E49 ${s.sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C \u0E40\u0E01\u0E34\u0E19\u0E02\u0E2D\u0E1A\u0E1A\u0E19 ${target.warnHigh}`,
        `${muscleName(s.muscle)} gets ${s.sets} sets/week, past the ${target.warnHigh} ceiling`
      ),
      gain: 4,
      priority: "low"
    };
    const predicted = predictedScore(data, candidateRec);
    const stillOver = s.sets - 1 > target.warnHigh * (VOLUME_CEILING_MUL[s.muscle] ?? 1);
    if (predicted <= analysis.execution && !stillOver) continue;
    candidateRec.gain = Math.max(1, predicted - analysis.execution);
    recs.push(candidateRec);
  }
  {
    const lacking = analysis.stats.filter((s) => s.status === "low" || s.status === "missing").sort((a, b) => (MAJOR_MUSCLES.includes(b.muscle) ? 1 : 0) - (MAJOR_MUSCLES.includes(a.muscle) ? 1 : 0));
    const freeDays = activeDays(data).filter((day) => exercisesForDay(data, day).length === 0);
    if (lacking.length && freeDays.length >= 2 && recs.length === 0) {
      const dayType = MUSCLE_TO_TYPE[lacking[0].muscle] ?? "full";
      if (dayType) {
        const day = freeDays[0];
        const candidateRec = {
          id: mkId(),
          kind: "addDay",
          day,
          dayType,
          title: t(`\u0E40\u0E1B\u0E34\u0E14\u0E27\u0E31\u0E19${DAY_TYPE_SHORT[dayType]}\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E17\u0E35\u0E48${slotName(data, day)}`, `Open a ${DAY_TYPE_SHORT[dayType]} day on ${slotName(data, day)}`),
          detail: t(
            `\u0E27\u0E31\u0E19\u0E1D\u0E36\u0E01\u0E17\u0E35\u0E48\u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E40\u0E15\u0E47\u0E21\u0E41\u0E25\u0E49\u0E27 \u2014 \u0E40\u0E1B\u0E34\u0E14\u0E27\u0E31\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2A\u0E48\u0E17\u0E48\u0E32${muscleName(lacking[0].muscle)}\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E02\u0E32\u0E14`,
            `Your current days are full \u2014 a new one makes room for the ${muscleName(lacking[0].muscle).toLowerCase()} work you're missing`
          ),
          reason: t(
            `${muscleName(lacking[0].muscle)}\u0E44\u0E14\u0E49 ${lacking[0].sets} \u0E40\u0E0B\u0E15/\u0E2A\u0E31\u0E1B\u0E14\u0E32\u0E2B\u0E4C (\u0E40\u0E1B\u0E49\u0E32 ${target.min}-${target.max}) \u0E41\u0E25\u0E30\u0E27\u0E31\u0E19\u0E40\u0E14\u0E34\u0E21\u0E44\u0E21\u0E48\u0E21\u0E35\u0E17\u0E35\u0E48\u0E27\u0E48\u0E32\u0E07\u0E41\u0E25\u0E49\u0E27`,
            `${muscleName(lacking[0].muscle)} gets ${lacking[0].sets} sets/week (target ${target.min}-${target.max}) and there's no room left`
          ),
          gain: 6,
          priority: "medium"
        };
        const predicted = predictedScore(data, candidateRec);
        if (predicted > analysis.execution) {
          candidateRec.gain = predicted - analysis.execution;
          recs.push(candidateRec);
        }
      }
    }
  }
  if (analysis.breakdown.order < 1)
    for (const day of trainingDays(data)) {
      if (recs.length >= MAX_RECOMMENDATIONS) break;
      const candidateRec = {
        id: mkId(),
        kind: "reorder",
        day,
        title: t(`\u0E08\u0E31\u0E14\u0E25\u0E33\u0E14\u0E31\u0E1A\u0E17\u0E48\u0E32\u0E27\u0E31\u0E19${slotName(data, day)}\u0E43\u0E2B\u0E21\u0E48`, `Reorder ${slotName(data, day)}`),
        detail: t(
          "\u0E40\u0E23\u0E35\u0E22\u0E07\u0E17\u0E48\u0E32\u0E2B\u0E19\u0E31\u0E01\u0E44\u0E27\u0E49\u0E15\u0E49\u0E19\u0E27\u0E31\u0E19 \u0E17\u0E48\u0E32\u0E40\u0E08\u0E32\u0E30\u0E08\u0E07\u0E41\u0E25\u0E30\u0E2B\u0E19\u0E49\u0E32\u0E17\u0E49\u0E2D\u0E07/\u0E19\u0E48\u0E2D\u0E07\u0E44\u0E27\u0E49\u0E17\u0E49\u0E32\u0E22 \u2014 \u0E44\u0E21\u0E48\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E25\u0E14\u0E17\u0E48\u0E32\u0E43\u0E14\u0E46",
          "Heavy lifts first, isolation and abs/calves last \u2014 nothing added or removed"
        ),
        reason: t("\u0E17\u0E48\u0E32\u0E17\u0E35\u0E48\u0E25\u0E49\u0E32\u0E2A\u0E39\u0E07\u0E04\u0E27\u0E23\u0E17\u0E33\u0E15\u0E2D\u0E19\u0E41\u0E23\u0E07\u0E22\u0E31\u0E07\u0E40\u0E15\u0E47\u0E21 \u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E2D\u0E19\u0E2B\u0E21\u0E14\u0E41\u0E23\u0E07\u0E41\u0E25\u0E49\u0E27", "The most fatiguing lifts deserve your fresh energy, not your leftovers"),
        gain: 3,
        priority: "low"
      };
      if (sameOrderAfterSort(data, day)) continue;
      const after = predictedAnalysis(data, candidateRec);
      if (after.breakdown.order <= analysis.breakdown.order) continue;
      candidateRec.gain = Math.max(1, after.execution - analysis.execution);
      recs.push(candidateRec);
    }
  for (const d of analysis.dayLoads.filter((x) => x.overSets || x.overTime)) {
    if (recs.length >= MAX_RECOMMENDATIONS) break;
    const canSplit = exercisesForDay(data, d.day).length >= 4;
    const freeDays = canSplit ? activeDays(data).filter((day) => exercisesForDay(data, day).length === 0) : [];
    if (freeDays.length <= 1) {
      const inDay = exercisesForDay(data, d.day).filter((ex) => ex.sets > MIN_SETS_PER_EX).sort((a, b) => b.sets - a.sets)[0];
      if (!inDay) continue;
      const trim = {
        id: mkId(),
        kind: "reduceSets",
        exerciseId: inDay.id,
        title: t(`\u0E25\u0E14\u0E40\u0E0B\u0E15 ${inDay.name}`, `Cut a set from ${inDay.name}`),
        detail: t(
          `\u0E25\u0E14\u0E40\u0E2B\u0E25\u0E37\u0E2D ${inDay.sets - 1} \u0E40\u0E0B\u0E15 \u2014 \u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E08\u0E30\u0E08\u0E1A\u0E43\u0E19\u0E40\u0E27\u0E25\u0E32\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49`,
          `Down to ${inDay.sets - 1} sets \u2014 ${slotName(data, d.day)} then fits the time you have`
        ),
        reason: d.overTime ? t(`\u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E23\u0E32\u0E27 ${d.minutes} \u0E19\u0E32\u0E17\u0E35 \u0E40\u0E01\u0E34\u0E19\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49`, `${slotName(data, d.day)} runs about ${d.minutes} min, over your limit`) : t(`\u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E21\u0E35 ${d.sets} \u0E40\u0E0B\u0E15 \u0E40\u0E01\u0E34\u0E19\u0E40\u0E1E\u0E14\u0E32\u0E19`, `${slotName(data, d.day)} has ${d.sets} sets, over the cap`),
        gain: 4,
        priority: "medium"
      };
      const p = predictedScore(data, trim);
      if (p > analysis.execution || d.overTime || d.overSets) {
        trim.gain = Math.max(1, p - analysis.execution);
        recs.push(trim);
      }
      continue;
    }
    const free = freeDays[0];
    const candidateRec = {
      id: mkId(),
      kind: "splitDay",
      fromDay: d.day,
      toDay: free,
      title: t(`\u0E41\u0E1A\u0E48\u0E07\u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E44\u0E1B${slotName(data, free)}`, `Split ${slotName(data, d.day)} into ${slotName(data, free)}`),
      detail: t(
        `\u0E22\u0E49\u0E32\u0E22\u0E17\u0E48\u0E32\u0E17\u0E49\u0E32\u0E22\u0E46 \u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E44\u0E1B\u0E27\u0E31\u0E19${slotName(data, free)}\u0E17\u0E35\u0E48\u0E22\u0E31\u0E07\u0E27\u0E48\u0E32\u0E07`,
        `Move the tail end of ${slotName(data, d.day)} onto ${slotName(data, free)}, which is free`
      ),
      reason: d.overTime ? t(`\u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E23\u0E32\u0E27 ${d.minutes} \u0E19\u0E32\u0E17\u0E35 \u0E40\u0E01\u0E34\u0E19\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E44\u0E27\u0E49`, `${slotName(data, d.day)} runs about ${d.minutes} min, over your limit`) : t(`\u0E27\u0E31\u0E19${slotName(data, d.day)}\u0E21\u0E35 ${d.sets} \u0E40\u0E0B\u0E15 \u0E40\u0E01\u0E34\u0E19\u0E40\u0E1E\u0E14\u0E32\u0E19`, `${slotName(data, d.day)} has ${d.sets} sets, over the cap`),
      gain: 5,
      priority: "medium"
    };
    const predicted = predictedScore(data, candidateRec);
    if (predicted <= analysis.execution) continue;
    candidateRec.gain = predicted - analysis.execution;
    recs.push(candidateRec);
  }
  const out = sleep.underRecovered ? recs.filter((r) => r.kind !== "add" && r.kind !== "increaseSets") : recs;
  return out.sort((a, b) => b.gain - a.gain).slice(0, MAX_RECOMMENDATIONS);
}
function sameOrderAfterSort(d, day) {
  const before = exercisesForDay(d, day).map((e) => e.id);
  const copy = structuredClone(d);
  reorderDay(copy, day);
  const after = exercisesForDay(copy, day).map((e) => e.id);
  return before.join(",") === after.join(",");
}
function reorderDay(d, day) {
  const rank = { high: 0, moderate: 1, low: 2 };
  const isFinisher = (ex) => muscleMap(ex.name).some((h) => h.m === "core" || h.m === "calves");
  const exs = exercisesForDay(d, day);
  exs.sort((a, b) => {
    const fin = (isFinisher(a) ? 1 : 0) - (isFinisher(b) ? 1 : 0);
    return fin || rank[fatigueOf(a)] - rank[fatigueOf(b)];
  }).forEach((ex, i) => {
    const target = d.exercises.find((e) => e.id === ex.id);
    if (target) target.order = i;
  });
}
function applyRecommendation(d, rec) {
  if (rec.kind === "buildProgram" && rec.splitDays) {
    const built = buildFullProgram(d, rec.splitDays);
    for (const ex of built.exercises) {
      d.exercises.push(ex);
      restoreHistory(d, ex);
    }
    for (const [day, label] of Object.entries(built.labels)) d.dayLabels[day] = label;
  } else if (rec.kind === "addDay" && rec.day && rec.dayType) {
    const exs = buildDayExercises(d, rec.day, rec.dayType);
    for (const ex of exs) {
      d.exercises.push(ex);
      restoreHistory(d, ex);
    }
    if (!d.dayLabels[rec.day]) d.dayLabels[rec.day] = DAY_TYPE_SHORT[rec.dayType];
  } else if (rec.kind === "add" && rec.template?.tpl && rec.day) {
    const tail = exercisesForDay(d, rec.day).length;
    const newEx = exerciseFromTemplate(rec.template.tpl, rec.day, tail, uid() + d.exercises.length);
    newEx.sets = MIN_SETS_PER_EX;
    d.exercises.push(newEx);
    restoreHistory(d, newEx);
    reorderDay(d, rec.day);
  } else if (rec.kind === "increaseSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex && ex.sets < MAX_SETS_PER_EX) ex.sets += 1;
  } else if (rec.kind === "reduceSets" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex && ex.sets > MIN_SETS_PER_EX) ex.sets -= 1;
  } else if (rec.kind === "removeExercise" && rec.exerciseId) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex) {
      archiveOne(d, ex);
      d.exercises = d.exercises.filter((e) => e.id !== ex.id);
      delete d.history[ex.id];
    }
  } else if (rec.kind === "moveExercise" && rec.exerciseId && rec.day) {
    const ex = d.exercises.find((e) => e.id === rec.exerciseId);
    if (ex) {
      ex.day = rec.day;
      ex.order = exercisesForDay(d, rec.day).length;
    }
  } else if (rec.kind === "splitDay" && rec.fromDay && rec.toDay) {
    const exs = exercisesForDay(d, rec.fromDay);
    if (exs.length >= 2) {
      const half = Math.floor(exs.length / 2);
      for (let i = exs.length - half; i < exs.length; i++) {
        const ex = d.exercises.find((e) => e.id === exs[i].id);
        if (!ex) continue;
        ex.day = rec.toDay;
        ex.order = exercisesForDay(d, rec.toDay).length;
      }
    }
  } else if (rec.kind === "restDay" && rec.fromDay && rec.toDay) {
    for (const ex of d.exercises) if (ex.day === rec.fromDay) ex.day = rec.toDay;
    if (d.dayLabels[rec.fromDay] && !d.dayLabels[rec.toDay]) {
      d.dayLabels[rec.toDay] = d.dayLabels[rec.fromDay];
      d.dayLabels[rec.fromDay] = "";
    }
  } else if (rec.kind === "reorder" && rec.day) {
    reorderDay(d, rec.day);
  }
}

// scripts/test-timewindow.mjs
var pass = 0;
var fail = 0;
var ok = (name, cond, extra = "") => {
  if (cond) {
    pass++;
    console.log(`  \u2705 ${name}`);
  } else {
    fail++;
    console.log(`  \u274C ${name}${extra ? "  << " + extra : ""}`);
  }
};
var mkEx = (name, day, sets, rmin, rmax, order) => ({
  id: uid() + Math.random(),
  name,
  day,
  type: "weight",
  sets,
  rmin,
  rmax,
  inc: 2.5,
  unit: "kg",
  order
});
console.log("\u2550\u2550\u2550 \u0E41\u0E1B\u0E25\u0E07\u0E40\u0E27\u0E25\u0E32 \u2550\u2550\u2550");
ok("parseHHMM 12:30 = 750 \u0E19\u0E32\u0E17\u0E35", parseHHMM("12:30") === 750, String(parseHHMM("12:30")));
ok("parseHHMM \u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E1C\u0E34\u0E14\u0E04\u0E37\u0E19 null", parseHHMM("25:00") === null && parseHHMM("abc") === null);
{
  const d = Object.assign(createDefault(), createEmpty());
  d.exercises = [];
  d.dayWindows = { thu: { start: "11:30", end: "12:45" } };
  ok("\u0E0A\u0E48\u0E27\u0E07 11:30\u201312:45 \u0E2B\u0E31\u0E01 buffer \u0E41\u0E25\u0E49\u0E27\u0E44\u0E14\u0E49 65 \u0E19\u0E32\u0E17\u0E35", windowMinutes(d, "thu") === 65, String(windowMinutes(d, "thu")));
  ok("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E15\u0E31\u0E49\u0E07\u0E0A\u0E48\u0E2D\u0E07\u0E40\u0E27\u0E25\u0E32 \u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E02\u0E2D\u0E07\u0E27\u0E31\u0E19\u0E19\u0E31\u0E49\u0E19", getDayTimeCap(d, "thu") === 65, String(getDayTimeCap(d, "thu")));
  ok("\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E15\u0E31\u0E49\u0E07 \u0E43\u0E0A\u0E49\u0E04\u0E48\u0E32\u0E01\u0E25\u0E32\u0E07\u0E40\u0E14\u0E34\u0E21", getDayTimeCap(d, "mon") === getTimeCap(d), `${getDayTimeCap(d, "mon")} vs ${getTimeCap(d)}`);
  d.dayWindows = { fri: { start: "22:00", end: "00:30" } };
  ok("\u0E02\u0E49\u0E32\u0E21\u0E40\u0E17\u0E35\u0E48\u0E22\u0E07\u0E04\u0E37\u0E19\u0E44\u0E14\u0E49 (22:00\u201300:30 = 150-10 = 140)", windowMinutes(d, "fri") === 140, String(windowMinutes(d, "fri")));
}
console.log("\n\u2550\u2550\u2550 \u0E40\u0E04\u0E2A 1: \u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E21\u0E35\u0E40\u0E27\u0E25\u0E32 75 \u0E19\u0E32\u0E17\u0E35 + \u0E17\u0E48\u0E32\u0E40\u0E15\u0E47\u0E21\u0E41\u0E25\u0E49\u0E27 -> \u0E15\u0E49\u0E2D\u0E07\u0E1A\u0E25\u0E47\u0E2D\u0E01 \u2550\u2550\u2550");
{
  const d = Object.assign(createDefault(), createEmpty());
  d.dayWindows = { thu: { start: "11:30", end: "12:45" } };
  d.exercises = [
    mkEx("Incline Barbell Press", "thu", 4, 8, 10, 0),
    mkEx("Overhead Press (DB)", "thu", 3, 10, 12, 1),
    mkEx("Cable Fly", "thu", 3, 12, 15, 2),
    mkEx("Dip", "thu", 3, 10, 12, 3),
    mkEx("Cable Lateral Raise", "thu", 4, 15, 20, 4),
    mkEx("Tricep Pushdown", "thu", 3, 15, 20, 5),
    mkEx("Rope Pushdown", "thu", 3, 15, 20, 6)
    // ท่าที่ 7 ดันให้เกิน 65 นาทีจริง
  ];
  const used = estimateMinutes(exercisesForDay(d, "thu"));
  console.log(`  \u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E43\u0E0A\u0E49\u0E40\u0E27\u0E25\u0E32\u0E23\u0E32\u0E27 ${used} \u0E19\u0E32\u0E17\u0E35 \xB7 \u0E21\u0E35\u0E40\u0E27\u0E25\u0E32\u0E22\u0E01\u0E08\u0E23\u0E34\u0E07 ${windowMinutes(d, "thu")} \u0E19\u0E32\u0E17\u0E35`);
  const v = checkFilters(d, findTemplate("Lateral Raise"), "thu", 3);
  ok("checkFilters \u0E1A\u0E25\u0E47\u0E2D\u0E01\u0E14\u0E49\u0E27\u0E22\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E40\u0E23\u0E37\u0E48\u0E2D\u0E07\u0E40\u0E27\u0E25\u0E32", !v.ok && /เวลา/.test(v.reason ?? ""), JSON.stringify(v));
  const a = analyzeProgram(d);
  const thu = a.dayLoads.find((x) => x.day === "thu");
  ok("analyzeProgram \u0E23\u0E39\u0E49\u0E27\u0E48\u0E32\u0E27\u0E31\u0E19\u0E1E\u0E24\u0E2B\u0E31\u0E2A\u0E40\u0E01\u0E34\u0E19\u0E40\u0E27\u0E25\u0E32", thu?.overTime === true, JSON.stringify(thu));
  const recs = buildRecommendations(d, a);
  ok(
    "\u0E44\u0E21\u0E48\u0E40\u0E2A\u0E19\u0E2D\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E17\u0E48\u0E32/\u0E40\u0E1E\u0E34\u0E48\u0E21\u0E40\u0E0B\u0E15\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E15\u0E47\u0E21\u0E41\u0E25\u0E49\u0E27",
    !recs.some((r) => r.day === "thu" && (r.kind === "add" || r.kind === "increaseSets")),
    recs.map((r) => `${r.kind}@${r.day}`).join(", ")
  );
}
console.log("\n\u2550\u2550\u2550 \u0E40\u0E04\u0E2A 2: \u0E44\u0E21\u0E48\u0E15\u0E31\u0E49\u0E07\u0E0A\u0E48\u0E2D\u0E07\u0E40\u0E27\u0E25\u0E32 -> \u0E1C\u0E25\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E2B\u0E21\u0E37\u0E2D\u0E19\u0E40\u0E14\u0E34\u0E21\u0E17\u0E38\u0E01\u0E1B\u0E23\u0E30\u0E01\u0E32\u0E23 (regression) \u2550\u2550\u2550");
{
  const build = () => {
    const d = Object.assign(createDefault(), createEmpty());
    d.exercises = [
      mkEx("Barbell Bench Press", "mon", 4, 6, 10, 0),
      mkEx("Barbell Row", "mon", 4, 6, 10, 1),
      mkEx("Barbell Squat", "wed", 4, 6, 10, 0),
      mkEx("Romanian Deadlift", "wed", 3, 8, 12, 1)
    ];
    return d;
  };
  const noWin = analyzeProgram(build());
  const withEmptyWin = (() => {
    const d = build();
    d.dayWindows = void 0;
    return analyzeProgram(d);
  })();
  ok("\u0E04\u0E30\u0E41\u0E19\u0E19\u0E40\u0E17\u0E48\u0E32\u0E40\u0E14\u0E34\u0E21", noWin.execution === withEmptyWin.execution, `${noWin.execution} vs ${withEmptyWin.execution}`);
  ok("\u0E40\u0E1E\u0E14\u0E32\u0E19\u0E40\u0E17\u0E48\u0E32\u0E40\u0E14\u0E34\u0E21", noWin.ceiling === withEmptyWin.ceiling, `${noWin.ceiling} vs ${withEmptyWin.ceiling}`);
  ok("\u0E44\u0E21\u0E48\u0E21\u0E35\u0E27\u0E31\u0E19\u0E44\u0E2B\u0E19\u0E16\u0E39\u0E01\u0E21\u0E2D\u0E07\u0E27\u0E48\u0E32\u0E40\u0E01\u0E34\u0E19\u0E40\u0E27\u0E25\u0E32", noWin.dayLoads.every((x) => !x.overTime));
}
console.log("\n\u2550\u2550\u2550 \u0E40\u0E04\u0E2A 3: migration \u2014 \u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E01\u0E48\u0E32\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E21\u0E35 dayWindows \u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E1E\u0E31\u0E07 \u2550\u2550\u2550");
{
  const old = normalizeData({
    dayLabels: { mon: "", tue: "", wed: "", thu: "", fri: "", sat: "", sun: "" },
    exercises: [{ id: "x1", name: "Bench Press", day: "mon", type: "weight", sets: 4, rmin: 8, rmax: 10, order: 0 }],
    history: { x1: [{ date: "2026-07-01", sets: [{ weight: 60, reps: 8 }] }] },
    settings: { autoRest: true, restDefault: 90, barWeight: 20 }
  });
  ok("\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E40\u0E01\u0E48\u0E32\u0E1C\u0E48\u0E32\u0E19 normalize \u0E44\u0E14\u0E49", old !== null);
  ok("\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E40\u0E14\u0E34\u0E21\u0E22\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48\u0E04\u0E23\u0E1A", old.history.x1?.[0]?.sets[0]?.weight === 60);
  ok("dayWindows \u0E40\u0E1B\u0E47\u0E19 undefined (\u0E44\u0E21\u0E48\u0E1A\u0E31\u0E07\u0E04\u0E31\u0E1A\u0E2A\u0E23\u0E49\u0E32\u0E07)", old.dayWindows === void 0);
  const junk = normalizeData({
    dayLabels: {},
    exercises: [],
    history: {},
    settings: {},
    dayWindows: { mon: { start: "bad" }, tue: "PWNED", wed: { start: "10:00", end: "11:30" } }
  });
  ok(
    "dayWindows \u0E17\u0E35\u0E48 shape \u0E1C\u0E34\u0E14\u0E16\u0E39\u0E01\u0E17\u0E34\u0E49\u0E07 \u0E41\u0E15\u0E48\u0E15\u0E31\u0E27\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E22\u0E31\u0E07\u0E2D\u0E22\u0E39\u0E48",
    junk.dayWindows.mon === void 0 && junk.dayWindows.tue === void 0 && junk.dayWindows.wed?.end === "11:30",
    JSON.stringify(junk.dayWindows)
  );
}
console.log(`
\u2550\u2550\u2550 \u0E2A\u0E23\u0E38\u0E1B: \u0E1C\u0E48\u0E32\u0E19 ${pass} \xB7 \u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19 ${fail} \u2550\u2550\u2550`);
process.exit(fail ? 1 : 0);
