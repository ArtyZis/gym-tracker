// รูปแบบการสั่นต่างกันตามเหตุการณ์ (iOS Safari ไม่รองรับ navigator.vibrate — จะเงียบเฉยๆ)

function vib(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ไม่รองรับก็ข้าม */
  }
}

export const haptics = {
  tick: () => vib(30), // ติ๊กเซตปกติ
  exerciseDone: () => vib([60, 40, 60]), // ครบทุกเซตของท่า
  pr: () => vib([40, 60, 40, 60, 140]), // ทำ PR ใหม่
  restDone: () => vib([120, 80, 120]), // พักครบ
};
