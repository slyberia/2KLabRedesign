/** Browser-only input model. Artwork never changes this physical, standard-gamepad ordering. */
export type Vec = readonly [number, number];
export interface InputFrame { t: number; axes: readonly number[]; buttons: readonly number[] }
export interface Move {
  key: string; name: string; group: string; stick?: "LS" | "RS";
  motion?: "any_direction" | "alternate_left_right" | "flick" | "rotate";
  direction?: string; rotation?: string; hold?: string[]; tap?: string[]; repeat?: number;
}
export interface PracticeSettings {
  deadzoneOn: boolean; deadzone: number; sensitivityOn: boolean; sensitivity: number;
  driftOn: boolean; drift: number; driftAngle: number; lagOn: boolean; lagMs: number;
  directionOn: boolean; directionDegrees: number; timingOn: boolean; timingMs: number;
  trailsOn: boolean; trailSeconds: number;
}
export const DEFAULT_SETTINGS: PracticeSettings = {
  deadzoneOn: false, deadzone: .15, sensitivityOn: false, sensitivity: 1,
  driftOn: false, drift: .12, driftAngle: 0, lagOn: false, lagMs: 150,
  directionOn: false, directionDegrees: 25, timingOn: false, timingMs: 250,
  trailsOn: true, trailSeconds: 3,
};
export const BUTTON_INDEX: Record<string, number> = { LT: 6, RT: 7, DPAD_DOWN: 13 };
export const neutral = (t = 0): InputFrame => ({ t, axes: [0, 0, 0, 0], buttons: Array<number>(17).fill(0) });
export const clamp = (v: number, low = -1, high = 1) => Math.max(low, Math.min(high, Number.isFinite(v) ? v : 0));
export const magnitude = (v: Vec) => Math.hypot(...v);
export const stick = (f: InputFrame, which: "LS" | "RS" = "RS"): Vec => {
  const i = which === "LS" ? 0 : 2;
  return [f.axes[i] ?? 0, f.axes[i + 1] ?? 0];
};
export function snapshot(pad: Pick<Gamepad, "axes" | "buttons">, t: number): InputFrame {
  return { t, axes: Array.from({ length: 4 }, (_, i) => clamp(pad.axes[i] ?? 0)),
    buttons: Array.from({ length: 17 }, (_, i) => clamp(pad.buttons[i]?.value ?? 0, 0, 1)) };
}

/** Synthetic effects apply to a copy, preserving the unmodified hardware trace. */
export function transformInput(frame: InputFrame, s: PracticeSettings): InputFrame {
  if (!s.deadzoneOn && !s.driftOn && !s.sensitivityOn) return { ...frame, axes: [...frame.axes], buttons: [...frame.buttons] };
  const axes: number[] = [];
  for (const which of ["LS", "RS"] as const) {
    let [x, y] = stick(frame, which);
    if (s.driftOn) { x += Math.cos(s.driftAngle * Math.PI / 180) * s.drift; y += Math.sin(s.driftAngle * Math.PI / 180) * s.drift; }
    const radius = Math.hypot(x, y);
    const deadzone = s.deadzoneOn ? s.deadzone : 0;
    const scaled = radius <= deadzone ? 0 : Math.min(1, (radius - deadzone) / (1 - deadzone) * (s.sensitivityOn ? s.sensitivity : 1));
    axes.push(radius ? x / radius * scaled : 0, radius ? y / radius * scaled : 0);
  }
  return { t: frame.t, axes, buttons: [...frame.buttons] };
}
export function delayedInput(queue: readonly InputFrame[], now: number, delay: number): InputFrame {
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i]!.t <= now - delay) return { ...queue[i]!, t: now };
  return neutral(now);
}
export function trail(frames: readonly InputFrame[], now: number, seconds: number): InputFrame[] {
  return frames.filter((f) => f.t >= now - seconds * 1000).slice(-600);
}
const DIRECTIONS: Record<string, Vec[]> = {
  up: [[0, -1]], down: [[0, 1]], left: [[-1, 0]], right: [[1, 0]],
  up_left: [[-Math.SQRT1_2, -Math.SQRT1_2]], down_left: [[-Math.SQRT1_2, Math.SQRT1_2]],
  down_right: [[Math.SQRT1_2, Math.SQRT1_2]],
};
export function targets(move: Move): Vec[] {
  if (move.motion === "alternate_left_right") return [[-1, 0], [1, 0]];
  if (move.direction === "up_left_or_left" || move.direction === "left_or_up_left") return [...DIRECTIONS.up_left!, ...DIRECTIONS.left!];
  if (move.direction === "left_or_right") return [...DIRECTIONS.left!, ...DIRECTIONS.right!];
  return DIRECTIONS[move.direction ?? ""] ?? [[1, 0]];
}
export const demoDuration = (move: Move) => move.motion === "rotate" ? 1800 : move.motion === "alternate_left_right" || (move.repeat ?? 0) > 1 ? 1600 : 1000;
export const demoSweep = (move: Move) => move.rotation === "quarter_circle_right_to_up" ? -Math.PI / 2 : (move.rotation === "counter_clockwise" ? -1 : 1) * 2 * Math.PI;

/** Playback pacing is an illustrative training reference, never a measured NBA 2K timing window. */
export function demoFrame(move: Move, time: number): InputFrame {
  const duration = demoDuration(move), phase = Math.max(0, Math.min(1, time / duration));
  const f = neutral(time), axes = [...f.axes], buttons = [...f.buttons];
  const active = phase >= .15 && phase <= .85;
  for (const key of move.hold ?? []) buttons[BUTTON_INDEX[key]!] = active ? 1 : 0;
  for (const key of move.tap ?? []) buttons[BUTTON_INDEX[key]!] = phase >= .3 && phase < .5 ? 1 : 0;
  let v: Vec = [0, 0];
  if (active && move.stick) {
    const progress = (phase - .15) / .7;
    if (move.motion === "rotate") v = [Math.cos(progress * demoSweep(move)) * .9, Math.sin(progress * demoSweep(move)) * .9];
    else if (move.motion === "any_direction") v = [.8, 0];
    else {
      const count = move.motion === "alternate_left_right" ? 2 : move.repeat ?? 1;
      const cycle = Math.min(count - 1, Math.floor(progress * count));
      const local = progress * count - cycle;
      const amplitude = local < .65 ? Math.sin(local / .65 * Math.PI) * .95 : 0;
      const target = targets(move)[move.motion === "alternate_left_right" ? cycle % 2 : 0]!;
      v = [target[0] * amplitude, target[1] * amplitude];
    }
    const i = move.stick === "LS" ? 0 : 2;
    axes[i] = v[0]; axes[i + 1] = v[1];
  }
  return { t: time, axes, buttons };
}
export function instruction(move: Move): string {
  const held = move.hold?.length ? `Hold ${move.hold.join(" + ")}. ` : "";
  if (move.tap?.length) return `Tap ${move.tap.join(" + ")}, then release.`;
  if (move.motion === "rotate") return `${held}Rotate ${move.stick} ${move.rotation === "quarter_circle_right_to_up" ? "from right to up" : move.rotation === "counter_clockwise" ? "counterclockwise" : "clockwise"}, then release.`;
  if (move.motion === "alternate_left_right") return `Flick ${move.stick} left, release, then flick right and release.`;
  if (move.motion === "any_direction") return `${held}Move ${move.stick} in any direction.`;
  return `${held}Flick ${move.stick} ${move.direction?.replaceAll("_", " ")}${(move.repeat ?? 1) > 1 ? " twice" : ""}, returning to center after each flick.`;
}
const angleBetween = (a: Vec, b: Vec) => Math.acos(clamp((a[0] * b[0] + a[1] * b[1]) / (magnitude(a) * magnitude(b)))) * 180 / Math.PI;
export interface Feedback { passed: boolean; message: string; details: string[] }
const lastActiveIndex = (frames: readonly InputFrame[], which?: "LS" | "RS") => {
  for (let i = frames.length - 1; i >= 0; i--) if (magnitude(stick(frames[i]!, which)) >= .2) return i;
  return -1;
};
export function evaluateAttempt(move: Move, frames: readonly InputFrame[], settings: PracticeSettings): Feedback {
  const fail = (message: string, details: string[] = []): Feedback => ({ passed: false, message, details });
  if (!frames.length) return fail("No input recorded. Start an attempt and move your stick or press the required button.");
  for (const key of move.tap ?? []) {
    const index = BUTTON_INDEX[key]!;
    const pressed = frames.findIndex((f) => (f.buttons[index] ?? 0) >= .5);
    if (pressed < 0) return fail(`Press ${key} during the attempt.`);
    if (!frames.slice(pressed + 1).some((f) => (f.buttons[index] ?? 0) < .5)) return fail(`Release ${key} to complete the tap.`);
  }
  const active = frames.filter((f) => magnitude(stick(f, move.stick)) >= .35);
  if (move.stick && !active.length) return fail(`Move ${move.stick} farther from center to start the motion.`);
  for (const key of move.hold ?? []) {
    const index = BUTTON_INDEX[key]!;
    if (active.some((f) => (f.buttons[index] ?? 0) < .5)) return fail(`Keep ${key} held throughout the stick motion.`);
  }
  const tolerance = settings.directionOn ? settings.directionDegrees : DEFAULT_SETTINGS.directionDegrees;
  if (move.motion === "rotate") {
    const points = active.map((f) => stick(f, move.stick));
    let sweep = 0, reverse = 0;
    const sign = Math.sign(demoSweep(move));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!, b = points[i]!;
      const delta = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
      if (Math.abs(delta) > Math.PI / 2) return fail("Move through the arc continuously; the stick jumped across the center.");
      if (delta * sign < 0) reverse += Math.abs(delta);
      sweep += delta * sign;
    }
    if (reverse > tolerance * Math.PI / 180) return fail("Rotate in the demonstrated direction without reversing.");
    if (sweep < Math.abs(demoSweep(move)) - tolerance * Math.PI / 180) return fail("Continue around the target arc before releasing.");
    if (points.some((p) => magnitude(p) < .55)) return fail("Keep a wider arc around the outside of the stick range.");
    if (move.rotation === "quarter_circle_right_to_up" && (angleBetween(points[0]!, [1, 0]) > tolerance || angleBetween(points.at(-1)!, [0, -1]) > tolerance)) return fail("Start the quarter arc on the right and finish at the top.");
  } else if (move.motion === "flick" || move.motion === "alternate_left_right") {
    const peaks: Vec[] = [];
    let peak: Vec = [0, 0];
    for (const frame of frames) {
      const v = stick(frame, move.stick);
      if (magnitude(v) > magnitude(peak)) peak = v;
      if (magnitude(v) < .2 && magnitude(peak) >= .65) { peaks.push(peak); peak = [0, 0]; }
    }
    const required = move.motion === "alternate_left_right" ? 2 : move.repeat ?? 1;
    if (peaks.length < required) return fail(`Complete ${required === 1 ? "a full flick" : `${required} flicks`} and return to center after each one.`);
    if (peaks.length > required) return fail("Extra flicks recorded. Follow only the demonstrated sequence.");
    if (peaks.some((p, i) => !targets(move).filter((_, j) => move.motion !== "alternate_left_right" || j === i % 2).some((target) => angleBetween(p, target) <= tolerance))) return fail("Aim closer to the target direction; compare your path with the dashed guide.");
  }
  if (move.motion && move.motion !== "any_direction" && magnitude(stick(frames.at(-1)!, move.stick)) >= .2) return fail("Release the stick back to center to finish.");
  const details = ["Input pattern matched this browser lesson. NBA 2K execution is not verified."];
  if (settings.timingOn && move.motion && move.motion !== "any_direction") {
    const first = frames.findIndex((f) => magnitude(stick(f, move.stick)) >= .2);
    const lastActive = lastActiveIndex(frames, move.stick);
    const end = frames[lastActive + 1] ?? frames[lastActive]!;
    const actual = end.t - frames[first]!.t;
    const reference = Array.from({ length: Math.ceil(demoDuration(move) / 10) + 1 }, (_, i) => demoFrame(move, i * 10));
    const startRef = reference.findIndex((f) => magnitude(stick(f, move.stick)) >= .2);
    const endRef = lastActiveIndex(reference, move.stick);
    const expected = reference[endRef + 1]!.t - reference[startRef]!.t;
    const error = Math.round(actual - expected);
    details.push(`${Math.round(actual)} ms motion; ${Math.round(expected)} ms illustrative reference.`);
    if (Math.abs(error) > settings.timingMs) return fail(error > 0 ? "Try the motion a little faster to follow the demo pace." : "Try the motion a little slower to follow the demo pace.", details);
  }
  return { passed: true, message: "Practice pattern matched", details };
}
