import { useMemo, useRef } from "react";
import { clamp, demoDuration, demoFrame, magnitude, stick, targets, type InputFrame, type Move, type PracticeSettings, type Vec } from "./engine";

const position = (v: Vec) => [150 + v[0] * 112, 150 + v[1] * 112] as const;
const points = (frames: InputFrame[], which: "LS" | "RS") => frames.map((f) => position(stick(f, which)).join(",")).join(" ");
export function StickDetail({ move, which, settings, raw, response, rawTrail, responseTrail, showTarget, showRaw, showResponse, pointer, onInput }: {
  move: Move; which: "LS" | "RS"; settings: PracticeSettings; raw: InputFrame; response: InputFrame;
  rawTrail: InputFrame[]; responseTrail: InputFrame[]; showTarget: boolean; showRaw: boolean; showResponse: boolean;
  pointer: boolean; onInput: (v: Vec) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const path = useMemo(() => Array.from({ length: 101 }, (_, i) => demoFrame(move, demoDuration(move) * i / 100)), [move]);
  const rawPoint = position(stick(raw, which)), responsePoint = position(stick(response, which));
  const pointerAt = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onInput([clamp(((event.clientX - rect.left) / rect.width * 300 - 150) / 112), clamp(((event.clientY - rect.top) / rect.height * 300 - 150) / 112)]);
  };
  const release = () => onInput([0, 0]);
  return (
    <div className="dl-stick-detail">
      <svg ref={svg} className={pointer ? "dl-scope is-interactive" : "dl-scope"} viewBox="0 0 300 300" role="img" aria-label={`${which} movement plot. ${pointer ? "Drag to provide practice input; direction buttons are also available." : "Dashed target, solid input, and dotted simulated response."}`}
        onPointerDown={(e) => { if (pointer) { e.currentTarget.setPointerCapture(e.pointerId); pointerAt(e); } }}
        onPointerMove={(e) => { if (pointer && e.currentTarget.hasPointerCapture(e.pointerId)) pointerAt(e); }}
        onPointerUp={(e) => { if (pointer) { release(); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } }}
        onPointerCancel={release} onLostPointerCapture={() => { if (pointer) release(); }}>
        <circle className="dl-scope-range" cx="150" cy="150" r="112" />
        <path className="dl-scope-axis" d="M150 24V276M24 150H276" />
        {settings.deadzoneOn && <circle className="dl-deadzone" data-testid="deadzone-region" cx="150" cy="150" r={112 * settings.deadzone} />}
        {showTarget && move.stick === which && move.motion === "flick" && targets(move).map((v, i) => {
          const angle = Math.atan2(v[1], v[0]), tolerance = (settings.directionOn ? settings.directionDegrees : 25) * Math.PI / 180;
          const a = position([Math.cos(angle - tolerance), Math.sin(angle - tolerance)]), b = position([Math.cos(angle + tolerance), Math.sin(angle + tolerance)]);
          return <path key={i} className="dl-tolerance" d={`M150 150L${a.join(" ")}A112 112 0 0 1 ${b.join(" ")}Z`} />;
        })}
        {showTarget && move.stick === which && <polyline className="dl-target-path" points={points(path, which)} />}
        {settings.trailsOn && showRaw && <polyline data-testid="raw-trail" className="dl-raw-path" points={points(rawTrail, which)} />}
        {settings.trailsOn && showResponse && <polyline data-testid="response-trail" className="dl-response-path" points={points(responseTrail, which)} />}
        <circle className="dl-center" cx="150" cy="150" r="3" />
        {showRaw && <circle data-testid="raw-marker" className="dl-raw-dot" cx={rawPoint[0]} cy={rawPoint[1]} r="6" />}
        {showResponse && <circle data-testid="response-marker" className="dl-response-dot" cx={responsePoint[0]} cy={responsePoint[1]} r="7" />}
        <text x="150" y="16" textAnchor="middle">Up</text><text x="150" y="294" textAnchor="middle">Down</text>
      </svg>
      <p className="dl-coordinates">{which} · X {stick(raw, which)[0].toFixed(2)} · Y {stick(raw, which)[1].toFixed(2)} · Deflection {Math.round(magnitude(stick(raw, which)) * 100)}%</p>
      {pointer && <>
        <p className="dl-muted">Drag and release, or choose a direction then Center.</p>
        <div className="dl-direction-pad" role="group" aria-label="Pointer stick directions">
          {([[-1, -1, "↖", "Up left"], [0, -1, "↑", "Up"], [1, -1, "↗", "Up right"], [-1, 0, "←", "Left"], [0, 0, "·", "Center"], [1, 0, "→", "Right"], [-1, 1, "↙", "Down left"], [0, 1, "↓", "Down"], [1, 1, "↘", "Down right"]] as const).map(([x, y, glyph, name]) => {
            const scale = Math.hypot(x, y) || 1;
            return <button type="button" key={name} aria-label={`Stick ${name}`} onClick={() => onInput([x / scale * .95, y / scale * .95])}>{glyph}</button>;
          })}
        </div>
      </>}
    </div>
  );
}
