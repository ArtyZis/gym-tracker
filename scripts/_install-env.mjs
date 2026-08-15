// window/navigator/localStorage ปลอม สำหรับ test-install.mjs
//
// ต้องเป็นไฟล์แยกและ import ก่อน install.ts เสมอ เพราะ install.ts ผูก
// addEventListener ตั้งแต่ตอนโหลดโมดูล ถ้าตั้งของปลอมทีหลังจะไม่มี window ให้ผูก
// (ESM รัน import ตามลำดับที่เขียน — esbuild ก็คงลำดับนี้ตอน bundle)
//
// ทุกค่าอ่านผ่าน getter ที่ชี้มาที่ `env` เพื่อให้เทสต์เปลี่ยนเครื่อง/สถานะได้กลางคัน
// โดยไม่ต้องโหลดโมดูลใหม่ (ซึ่งทำไม่ได้หลัง bundle แล้ว)

export const env = {
  ua: "",
  touch: 0,
  standalone: false, // navigator.standalone ของ iOS
  displayMode: false, // display-mode: standalone ของ Android/desktop
  store: {},
  throws: false, // จำลอง localStorage ที่โยน SecurityError (โหมดส่วนตัว)
  handlers: {},
};

/** ตั้งค่าเครื่องใหม่ทั้งชุด — เรียกก่อนทุกเคสเพื่อไม่ให้ค่าจากเคสก่อนค้าง */
export function setEnv(o = {}) {
  Object.assign(env, { ua: "", touch: 0, standalone: false, displayMode: false, store: {}, throws: false }, o);
}

// Node 24 มี globalThis.navigator ของตัวเองที่เป็น getter อย่างเดียว — กำหนดทับตรงๆ ไม่ได้
const define = (name, value) => Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });

define("localStorage", {
  getItem(k) {
    if (env.throws) throw new Error("SecurityError");
    return k in env.store ? env.store[k] : null;
  },
  setItem(k, v) {
    if (env.throws) throw new Error("SecurityError");
    env.store[k] = String(v);
  },
  removeItem(k) {
    if (env.throws) throw new Error("SecurityError");
    delete env.store[k];
  },
});

define("navigator", {
  get userAgent() {
    return env.ua;
  },
  get maxTouchPoints() {
    return env.touch;
  },
  get standalone() {
    return env.standalone ? true : undefined;
  },
});

define("window", {
  navigator: globalThis.navigator,
  matchMedia: (q) => ({ matches: env.displayMode && q.includes("standalone") }),
  addEventListener: (name, fn) => {
    env.handlers[name] = fn;
  },
});

/** ยิง event ที่ install.ts ผูกไว้ */
export const fire = (name, ev = {}) => env.handlers[name]?.({ preventDefault() {}, ...ev });
