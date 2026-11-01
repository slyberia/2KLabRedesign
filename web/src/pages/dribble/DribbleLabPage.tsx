import { useEffect, useState } from "react";
import { ExtLink } from "../../shell/Layout";
import { ControllerVisual, SKINS, type Skin } from "./ControllerVisual";
import { DEFAULT_SETTINGS, demoDuration, instruction, neutral, type InputFrame, type Vec } from "./engine";
import { INPUT_SOURCE, moves } from "./lessons";
import { PracticeSettings } from "./PracticeSettings";
import { StickDetail } from "./StickDetail";
import { usePracticeSession, type Mode } from "./usePracticeSession";
import "./dribble-lab.css";

function initialSelection() {
  const p = new URLSearchParams(location.search);
  return { move: moves.find((m) => m.key === p.get("move"))?.key ?? "in-and-out",
    skin: Object.hasOwn(SKINS, p.get("controller") ?? "") ? p.get("controller") as Skin : "xbox" };
}
export function DribbleLabPage() {
  const [initial] = useState(initialSelection);
  const [moveKey, setMoveKey] = useState(initial.move), [skin, setSkin] = useState<Skin>(initial.skin);
  const [mode, setMode] = useState<Mode>("watch");
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [source, setSource] = useState<"gamepad" | "pointer">("gamepad");
  const [enabled, setEnabled] = useState(false), [device, setDevice] = useState<number | null>(null);
  const [virtual, setVirtual] = useState<InputFrame>(() => neutral());
  const [which, setWhich] = useState<"LS" | "RS">("RS");
  const [showTarget, setShowTarget] = useState(true), [showRaw, setShowRaw] = useState(true), [showResponse, setShowResponse] = useState(true);
  const move = moves.find((m) => m.key === moveKey)!;
  const session = usePracticeSession({ move, mode, settings, source, enabled, device, virtual });
  const { view } = session;
  const simulationOn = settings.deadzoneOn || settings.driftOn || settings.sensitivityOn || settings.lagOn;
  const pointer = mode !== "watch" && source === "pointer" && (view.recording || view.replayTime === 0);
  const ready = source === "pointer" || (enabled && view.connection.startsWith("Connected:"));
  useEffect(() => {
    const params = new URLSearchParams({ move: moveKey, controller: skin });
    history.replaceState(null, "", `${location.pathname}?${params}`);
  }, [moveKey, skin]);
  useEffect(() => { setWhich(move.stick ?? "RS"); setVirtual(neutral()); }, [move, mode, source]);
  const onInput = (v: Vec) => {
    setVirtual((f) => { const axes = [...f.axes], i = which === "LS" ? 0 : 2; axes[i] = v[0]; axes[i + 1] = v[1]; return { ...f, axes }; });
  };
  const virtualButton = (index: number) => setVirtual((f) => {
    const buttons = [...f.buttons]; buttons[index] = (buttons[index] ?? 0) >= .5 ? 0 : 1; return { ...f, buttons };
  });
  const layer = (label: string, checked: boolean, set: (v: boolean) => void, className: string) => (
    <label className={`dl-layer ${className}`}><input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} />{label}</label>
  );
  return (
    <div className="wrap dl-page">
      <div className="crumb"><a href="/">Home</a> / <a href="/game-details#guides">How-To Guides</a> / Dribble Lab</div>
      <div className="pagehead">
        <div className="eyebrow">Learn · Observe · Practice</div>
        <h1>Dribble Lab</h1>
        <p>See the input, try it with your controller, and compare your stick path with the demonstration.</p>
      </div>
      <div className="dl-toolbar">
        <label>Move<select aria-label="Move" value={moveKey} onChange={(e) => setMoveKey(e.target.value)}>{["Basics", "Dribble Moves", "Triple Threat"].map((group) => <optgroup key={group} label={group}>{moves.filter((m) => m.group === group).map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}</optgroup>)}</select></label>
        <label>Controller illustration<select value={skin} onChange={(e) => setSkin(e.target.value as Skin)}>{Object.entries(SKINS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <div className="dl-modes" role="group" aria-label="Lab mode">{([["watch", "Watch"], ["live", "Live input"], ["practice", "Practice"]] as const).map(([key, label]) => <button key={key} type="button" aria-pressed={mode === key} onClick={() => setMode(key)}>{label}</button>)}</div>
      </div>
      <section className="dl-lesson" aria-labelledby="dl-move-title">
        <div><span className="eyebrow">{move.group}</span><h2 id="dl-move-title">{move.name}</h2><p>{skin === "dualsense" || skin === "dualshock" ? instruction(move).replaceAll("RT", "R2").replaceAll("LT", "L2") : instruction(move)}</p>
          <p className="dl-muted">Input directions follow the source&rsquo;s illustrated examples. Ball hand, movement state, and in-game control settings can change the move you get.</p>
        </div>
        <ExtLink href={INPUT_SOURCE}>2KLab instructions &amp; videos</ExtLink>
      </section>
      {mode !== "watch" && <section className="dl-connection" aria-label="Input connection">
        <label>Input source<select value={source} onChange={(e) => setSource(e.target.value as "gamepad" | "pointer")}><option value="gamepad">Connected controller</option><option value="pointer">Mouse / touch / direction buttons</option></select></label>
        {source === "gamepad" && <>
          <button type="button" aria-pressed={enabled} onClick={() => setEnabled((v) => !v)}>{enabled ? "Stop controller input" : "Read controller input"}</button>
          {view.devices.length > 0 && <label>Connected device<select value={device ?? ""} onChange={(e) => setDevice(e.target.value === "" ? null : Number(e.target.value))}><option value="">First available controller</option>{view.devices.map((p) => <option key={p.index} value={p.index}>{p.name}{p.standard ? "" : " (unsupported layout)"}</option>)}</select></label>}
        </>}
        <p role="status">{view.connection}</p>
        <p className="dl-muted">Connect to this browser&rsquo;s device, not only your console. The illustration changes appearance and labels; it does not remap hardware.</p>
      </section>}
      <div className="dl-workspace">
        <section className="dl-controller-panel" aria-label="Controller visualization">
          <div className="dl-panel-title"><h2>{SKINS[skin]}</h2><span>{mode === "watch" ? "Demonstration" : view.replayTime > 0 ? "Recorded replay" : "Live input"}</span></div>
          <ControllerVisual skin={skin} raw={view.raw} response={view.response} frames={view.rawTrail} simulatedFrames={view.responseTrail} showTrail={settings.trailsOn && showRaw} showSimulation={simulationOn && showResponse} move={move} />
          {mode === "watch" ? <div className="dl-playback">
            <button type="button" className="dl-primary" onClick={session.play}>{view.playing ? "Pause demonstration" : "Play demonstration"}</button>
            <button type="button" onClick={session.step}>Step +100 ms</button><button type="button" onClick={session.restart}>Restart</button>
            <progress aria-label="Demonstration progress" max={demoDuration(move)} value={view.phase} />
            <span className="dl-muted">Illustrative pace · playback starts only when requested</span>
          </div> : mode === "practice" ? <div className="dl-playback">
            <button type="button" className="dl-primary" disabled={!ready && !view.recording} onClick={view.recording ? session.finish : () => { setVirtual(neutral()); session.start(); }}>{view.recording ? "Finish attempt" : "Start attempt"}</button>
            <span className="dl-muted">Up to 8 seconds · Assessment: {simulationOn ? "simulated response" : "raw input"}</span>
          </div> : <p className="dl-muted">Press buttons or move either stick to see the input overlay.</p>}
          {pointer && <div className="dl-virtual-buttons" role="group" aria-label="Pointer buttons">
            {[[6, "LT / L2"], [7, "RT / R2"], [13, "D-pad Down"]].map(([index, label]) => <button key={index} type="button" aria-pressed={(virtual.buttons[Number(index)] ?? 0) >= .5} onClick={() => virtualButton(Number(index))}>{label}</button>)}
            <span className="dl-muted">Click to hold; click again to release.</span>
          </div>}
        </section>
        <section className="dl-detail-panel" aria-label="Stick detail">
          <div className="dl-panel-title"><h2>Stick detail</h2><label className="dl-sr-only" htmlFor="dl-stick">Stick to inspect</label><select id="dl-stick" value={which} onChange={(e) => { setWhich(e.target.value as "LS" | "RS"); setVirtual(neutral()); }}><option value="RS">Right stick</option><option value="LS">Left stick</option></select></div>
          <StickDetail move={move} which={which} settings={settings} raw={view.raw} response={view.response} rawTrail={view.rawTrail} responseTrail={view.responseTrail} showTarget={showTarget} showRaw={showRaw} showResponse={simulationOn && showResponse} pointer={pointer} onInput={onInput} />
          <div className="dl-layers" role="group" aria-label="Plot layers">
            {layer("Target", showTarget, setShowTarget, "dl-target-key")}{layer(mode === "watch" ? "Demo input" : "Your input", showRaw, setShowRaw, "dl-raw-key")}
            {simulationOn && layer("Simulated response", showResponse, setShowResponse, "dl-response-key")}
          </div>
          <button type="button" disabled={view.recording} onClick={session.clear}>Clear trace and recording</button>
        </section>
      </div>
      {mode === "practice" && <section className="dl-attempt" aria-label="Attempt review">
        <h2>Attempt review</h2>
        <div aria-live="polite">{view.recording ? <p>Recording. Perform the input, return to neutral, then finish.{settings.lagOn && " Let the delayed response settle before finishing."}</p> : session.feedback ? <><h3 className={session.feedback.passed ? "dl-pass" : ""}>{session.feedback.message}</h3>{session.feedback.details.map((d) => <p key={d}>{d}</p>)}</> : <p>Start an attempt to record your input path.</p>}</div>
        {view.replayLength > 0 && !view.recording && <div className="dl-playback">
          <button type="button" onClick={session.replay}>{view.replaying ? "Pause replay" : "Replay attempt"}</button>
          <label className="dl-replay-slider">Replay position<input aria-label="Replay position" type="range" min="0" max={view.replayLength} value={view.replayTime} step="10" onChange={(e) => session.seek(Number(e.target.value))} /></label>
          <button type="button" onClick={session.live}>Return to live input</button>
        </div>}
        <p className="dl-muted">Practice checks an input pattern, not whether NBA 2K executed a move. Rotation extent, activation thresholds, and demo timing are browser-training references.</p>
      </section>}
      <PracticeSettings value={settings} onChange={setSettings} />
      <p className="dl-provenance">Controls: <ExtLink href={INPUT_SOURCE}>NBA2KLab&rsquo;s 30 public dribbling inputs</ExtLink> · captured 1 Nov 2026. Original controller illustrations. Practice runs on your device; input recordings are kept in memory and cleared when you leave.</p>
    </div>
  );
}
