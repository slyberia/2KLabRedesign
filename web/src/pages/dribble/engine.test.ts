import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS as defaults, delayedInput, demoDuration, demoFrame, evaluateAttempt, neutral, snapshot, trail, transformInput, type InputFrame, type Move } from "./engine";
import { moves } from "./lessons";
const frame = (t: number, x: number, y: number, trigger = 0): InputFrame => ({ t, axes: [0, 0, x, y], buttons: [0, 0, 0, 0, 0, 0, 0, trigger] });
const up: Move = { key: "up", name: "Flick up", group: "Test", stick: "RS", motion: "flick", direction: "up" };

describe("controller input and simulated response", () => {
  it("copies mutable browser snapshots, fills absent controls and sanitizes invalid values", () => {
    const axes = [NaN, Infinity, .4, -.8], buttons = [{ value: .8, pressed: true, touched: true }];
    const result = snapshot({ axes, buttons }, 20); axes[2] = -.5; buttons[0]!.value = 0;
    expect(result.axes).toEqual([0, 0, .4, -.8]); expect(result.buttons).toHaveLength(17); expect(result.buttons[0]).toBe(.8);
  });
  it("keeps raw input intact while drift, dead zone and sensitivity affect the response", () => {
    const raw = frame(0, .1, 0), copy = JSON.stringify(raw);
    expect(transformInput(raw, { ...defaults, deadzoneOn: true, deadzone: .2 }).axes[2]).toBe(0);
    expect(transformInput(neutral(), { ...defaults, driftOn: true, drift: .1 }).axes[2]).toBeCloseTo(.1);
    expect(transformInput(neutral(), { ...defaults, driftOn: true, drift: .1, deadzoneOn: true, deadzone: .2 }).axes[2]).toBe(0);
    expect(transformInput(frame(0, .4, 0), { ...defaults, sensitivityOn: true, sensitivity: 2 }).axes[2]).toBeCloseTo(.8);
    expect(JSON.stringify(raw)).toBe(copy);
    expect(transformInput(raw, defaults)).toEqual(raw);
  });
  it("delays both buttons and sticks without inventing a prior pressed state", () => {
    const queue = [frame(0, 0, 0), frame(100, 1, 0, 1)];
    expect(delayedInput(queue, 100, 150).axes).toEqual([0, 0, 0, 0]);
    expect(delayedInput(queue, 200, 150).buttons[7]).toBe(0);
    expect(delayedInput(queue, 250, 150)).toMatchObject({ t: 250, axes: [0, 0, 1, 0] });
    expect(delayedInput(queue, 250, 150).buttons[7]).toBe(1);
  });
  it("bounds the trail by time and sample count", () => {
    const frames = Array.from({ length: 10000 }, (_, t) => neutral(t));
    expect(trail(frames, 10000, 6)).toHaveLength(600);
    expect(trail(frames, 10000, .1)[0]!.t).toBe(9900);
  });
});

describe("practice feedback", () => {
  it("accepts a complete directional flick, rejects wrong direction and unreleased input", () => {
    expect(evaluateAttempt(up, [frame(0, 0, 0), frame(100, 0, -.9), frame(200, 0, 0)], defaults).passed).toBe(true);
    expect(evaluateAttempt(up, [frame(0, 0, 0), frame(100, .9, 0), frame(200, 0, 0)], defaults).message).toContain("direction");
    expect(evaluateAttempt(up, [frame(0, 0, 0), frame(100, 0, -.9)], defaults).passed).toBe(false);
  });
  it("requires a held trigger throughout movement and a release after a tap", () => {
    const escape = { ...up, hold: ["RT"] };
    expect(evaluateAttempt(escape, [frame(0, 0, 0), frame(100, 0, -.9), frame(200, 0, 0)], defaults).message).toContain("RT");
    expect(evaluateAttempt(escape, [frame(0, 0, 0), frame(100, 0, -.9, 1), frame(200, 0, 0)], defaults).passed).toBe(true);
    const tap: Move = { key: "tap", name: "Tap", group: "Test", tap: ["RT"] };
    expect(evaluateAttempt(tap, [frame(0, 0, 0), frame(100, 0, 0, 1)], defaults).message).toContain("Release");
    expect(evaluateAttempt(tap, [frame(0, 0, 0), frame(100, 0, 0, 1), frame(200, 0, 0)], defaults).passed).toBe(true);
  });
  it("distinguishes direction tolerance from optional demo timing", () => {
    const tilted = [frame(0, 0, 0), frame(100, .5, -.8), frame(200, 0, 0)];
    expect(evaluateAttempt(up, tilted, defaults).passed).toBe(false);
    expect(evaluateAttempt(up, tilted, { ...defaults, directionOn: true, directionDegrees: 45 }).passed).toBe(true);
    const slow = [frame(0, 0, 0), frame(100, 0, -.9), frame(3000, 0, 0)];
    expect(evaluateAttempt(up, slow, defaults).passed).toBe(true);
    expect(evaluateAttempt(up, slow, { ...defaults, timingOn: true }).message).toContain("faster");
  });
  it("rejects reversed rotations and arcs cut through the center", () => {
    const rotation: Move = { ...up, motion: "rotate", rotation: "clockwise" };
    const arc = (sign: number, radius: number) => [neutral(0), ...Array.from({ length: 61 }, (_, i) => frame(i * 20 + 20, Math.cos(i / 60 * Math.PI * 2 * sign) * radius, Math.sin(i / 60 * Math.PI * 2 * sign) * radius)), neutral(1300)];
    expect(evaluateAttempt(rotation, arc(1, .9), defaults).passed).toBe(true);
    expect(evaluateAttempt(rotation, arc(-1, .9), defaults).message).toContain("direction");
    expect(evaluateAttempt(rotation, arc(1, .4), defaults).message).toContain("wider arc");
  });
  it("keeps all 30 lesson definitions valid and demonstrable", () => {
    expect(moves).toHaveLength(30); expect(new Set(moves.map((m) => m.key)).size).toBe(30);
    for (const move of moves) {
      const frames = Array.from({ length: demoDuration(move) / 10 + 1 }, (_, i) => demoFrame(move, i * 10));
      expect(frames.every((f) => f.axes.every(Number.isFinite)), move.key).toBe(true);
      expect(evaluateAttempt(move, frames, defaults).passed, move.key).toBe(true);
    }
  });
});
