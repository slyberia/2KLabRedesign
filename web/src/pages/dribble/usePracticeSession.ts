import { useEffect, useRef, useState } from "react";
import { delayedInput, demoDuration, demoFrame, evaluateAttempt, neutral, snapshot, trail, transformInput,
  type Feedback, type InputFrame, type Move, type PracticeSettings } from "./engine";

export type Mode = "watch" | "live" | "practice";
interface Options {
  move: Move; settings: PracticeSettings; mode: Mode; source: "gamepad" | "pointer";
  enabled: boolean; device: number | null; virtual: InputFrame;
}
interface Device { index: number; name: string; standard: boolean }
interface View {
  raw: InputFrame; response: InputFrame; rawTrail: InputFrame[]; responseTrail: InputFrame[];
  phase: number; playing: boolean; recording: boolean; replaying: boolean;
  replayTime: number; replayLength: number; devices: Device[]; connection: string;
}
const emptyView = (): View => ({ raw: neutral(), response: neutral(), rawTrail: [], responseTrail: [],
  phase: 0, playing: false, recording: false, replaying: false, replayTime: 0, replayLength: 0, devices: [], connection: "Controller input is off." });
interface Recorded { raw: InputFrame; response: InputFrame }

export function usePracticeSession(options: Options) {
  const current = useRef(options);
  useEffect(() => { current.current = options; });
  const state = useRef({ phase: 0, playing: false, recording: false, replaying: false, replayTime: 0,
    recordingStart: 0, frames: [] as Recorded[], raw: [] as InputFrame[], queue: [] as InputFrame[], response: [] as InputFrame[] });
  const [view, setView] = useState(emptyView);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const finish = () => {
    const s = state.current, o = current.current;
    if (!s.recording) return;
    s.recording = false;
    const simulated = o.settings.deadzoneOn || o.settings.driftOn || o.settings.sensitivityOn || o.settings.lagOn;
    setFeedback(evaluateAttempt(o.move, s.frames.map((f) => simulated ? f.response : f.raw), o.settings));
  };
  const reset = () => {
    Object.assign(state.current, { phase: 0, playing: false, recording: false, replaying: false, replayTime: 0, frames: [], raw: [], queue: [], response: [] });
    setFeedback(null); setView(emptyView());
  };
  // A trace is meaningful only under the lesson, input source, and settings used to record it.
  useEffect(reset, [options.move.key, options.settings, options.mode, options.source, options.device, options.enabled]);

  useEffect(() => {
    let handle = 0, last = performance.now(), published = 0;
    const pause = () => {
      const s = state.current;
      if (s.recording) setFeedback({ passed: false, message: "Attempt paused. Keep this page active, then start a new attempt.", details: [] });
      s.recording = false; s.playing = false; s.replaying = false;
      s.raw = []; s.queue = []; s.response = [];
      setView((v) => ({ ...v, raw: neutral(), response: neutral(), rawTrail: [], responseTrail: [], recording: false, playing: false, replaying: false }));
    };
    const tick = (now: number) => {
      const o = current.current, s = state.current;
      const delta = Math.min(50, now - last); last = now;
      if (!document.hidden && document.hasFocus()) {
        let input = neutral(now), devices: Device[] = [], connection = "Controller input is off.", available = o.source === "pointer" || o.mode === "watch";
        if (o.source === "gamepad" && o.enabled && o.mode !== "watch") {
          if (!navigator.getGamepads) connection = "This browser does not support controller input. Use the pointer pad or watch a demonstration.";
          else {
            try {
              const pads = Array.from(navigator.getGamepads()).filter((p): p is Gamepad => p != null && p.connected);
              devices = pads.map((p) => ({ index: p.index, name: p.id, standard: p.mapping === "standard" }));
              const pad = pads.find((p) => o.device == null || p.index === o.device);
              if (!pad) connection = "Connect a controller to this device and press a button with this page active.";
              else if (pad.mapping !== "standard") connection = "This controller has an unsupported input layout. The artwork selector does not remap it. Use the pointer pad or a standard gamepad.";
              else { input = snapshot(pad, now); available = true; connection = `Connected: ${pad.id}`; }
            } catch { connection = "Controller access is blocked by the browser or page policy. Use the pointer pad or open this page directly."; }
          }
        }
        if (o.mode === "watch") {
          if (s.playing) s.phase = Math.min(demoDuration(o.move), s.phase + delta);
          if (s.phase >= demoDuration(o.move)) s.playing = false;
          input = demoFrame(o.move, s.phase);
        } else if (o.source === "pointer") { input = { ...o.virtual, t: now }; connection = "Pointer pad active. No controller required."; }
        if (!available && s.recording) {
          s.recording = false;
          setFeedback({ passed: false, message: "Controller input was interrupted. Reconnect or choose the pointer pad, then start again.", details: [] });
          s.frames = []; s.raw = []; s.queue = []; s.response = [];
        }
        if (!available) { s.raw = []; s.queue = []; s.response = []; }
        const clock = o.mode === "watch" ? s.phase : now;
        if (s.queue.at(-1)?.t !== clock) s.queue.push(transformInput(input, o.settings));
        s.queue = trail(s.queue, clock, 2);
        const response = delayedInput(s.queue, clock, o.settings.lagOn ? o.settings.lagMs : 0);
        if (s.raw.at(-1)?.t !== clock) { s.raw.push(input); s.response.push(response); }
        s.raw = trail(s.raw, clock, o.settings.trailSeconds); s.response = trail(s.response, clock, o.settings.trailSeconds);
        if (s.recording) {
          s.frames.push({ raw: input, response });
          if (now - s.recordingStart >= 8000) finish();
        }
        let shownRaw = input, shownResponse = response, shownRawTrail = s.raw, shownResponseTrail = s.response;
        const length = s.frames.length > 1 ? s.frames.at(-1)!.raw.t - s.frames[0]!.raw.t : 0;
        if (s.replaying && s.frames.length) {
          s.replayTime = Math.min(length, s.replayTime + delta);
          if (s.replayTime >= length) s.replaying = false;
        }
        // A paused replay remains inspectable until live input or a new attempt is selected.
        if (s.replayTime >= 0 && s.frames.length && !s.recording && (s.replaying || s.replayTime > 0)) {
          const end = s.frames[0]!.raw.t + s.replayTime;
          const before = s.frames.filter((f) => f.raw.t <= end);
          shownRaw = before.at(-1)?.raw ?? s.frames[0]!.raw; shownResponse = before.at(-1)?.response ?? s.frames[0]!.response;
          shownRawTrail = trail(before.map((f) => f.raw), end, o.settings.trailSeconds);
          shownResponseTrail = trail(before.map((f) => f.response), end, o.settings.trailSeconds);
        }
        if (now - published >= 32) {
          published = now;
          setView({ raw: shownRaw, response: shownResponse, rawTrail: shownRawTrail, responseTrail: shownResponseTrail,
            phase: s.phase, playing: s.playing, recording: s.recording, replaying: s.replaying,
            replayTime: s.replayTime, replayLength: length, devices, connection });
        }
      }
      handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    window.addEventListener("blur", pause); document.addEventListener("visibilitychange", pause);
    return () => { cancelAnimationFrame(handle); window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", pause); };
  }, []);

  return { view, feedback,
    play: () => { const s = state.current; if (s.phase >= demoDuration(current.current.move)) s.phase = 0; s.playing = !s.playing; },
    step: () => { state.current.playing = false; state.current.phase = Math.min(demoDuration(current.current.move), state.current.phase + 100); },
    restart: () => { state.current.phase = 0; state.current.playing = false; state.current.raw = []; state.current.queue = []; state.current.response = []; },
    clear: () => { state.current.raw = []; state.current.queue = []; state.current.response = []; state.current.frames = []; state.current.replayTime = 0; state.current.replaying = false; setFeedback(null); },
    start: () => { const s = state.current; s.frames = []; s.raw = []; s.queue = []; s.response = []; s.replayTime = 0; s.replaying = false; s.recording = true; s.recordingStart = performance.now(); setFeedback(null); },
    finish,
    replay: () => { const s = state.current; if (s.replayTime >= (view.replayLength || 0)) s.replayTime = 0; s.replaying = !s.replaying; },
    seek: (time: number) => { state.current.replayTime = Math.max(.001, time); state.current.replaying = false; },
    live: () => { state.current.replayTime = 0; state.current.replaying = false; },
  };
}
