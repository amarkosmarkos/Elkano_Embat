/** Cubic bezier easing evaluated in JS, so progress-driven animations get the same curves as CSS transitions.
 *  bezier(x1, y1, x2, y2) returns a function t in [0,1] to eased value in [0,1]. */
export function bezier(x1: number, y1: number, x2: number, y2: number) {
  const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1;
  const b = (a1: number, a2: number) => 3 * a2 - 6 * a1;
  const c = (a1: number) => 3 * a1;
  const calc = (t: number, a1: number, a2: number) => ((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t;
  const slope = (t: number, a1: number, a2: number) => 3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1);
  const solve = (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const s = slope(t, x1, x2);
      if (s === 0) return t;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return t;
  };
  return (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : calc(solve(t), y1, y2));
}

/** Named curves. easeInOut is After Effects' "Easy Ease"; easeOut and easeIn are its one-sided variants. */
export const easing = {
  easeInOut: bezier(.33, 0, .67, 1),
  easeOut: bezier(.22, 1, .36, 1),
  easeIn: bezier(.55, 0, 1, .45),
};

/** Maps progress p to [0,1] across the window [from, to], eased. Keyframe at `from` = 0, keyframe at `to` = 1. */
export const keyframe = (p: number, from: number, to: number, curve: (t: number) => number = easing.easeInOut) =>
  curve(Math.max(0, Math.min(1, (p - from) / (to - from))));
