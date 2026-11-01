import { stick, type InputFrame, type Move } from "./engine";

export type Skin = "xbox" | "dualsense" | "dualshock" | "generic";
export const SKINS: Record<Skin, string> = { xbox: "Xbox Series", dualsense: "DualSense", dualshock: "DualShock 4", generic: "Generic" };
const at = (frames: readonly InputFrame[], which: "LS" | "RS", center: readonly number[], scale: number) => frames.map((f) => {
  const [x, y] = stick(f, which); return `${center[0]! + x * scale},${center[1]! + y * scale}`;
}).join(" ");

/** Original vector illustrations. Button labels and positions are presentation only. */
export function ControllerVisual({ skin, raw, response, frames, simulatedFrames, showTrail, showSimulation, move }: {
  skin: Skin; raw: InputFrame; response: InputFrame; frames: InputFrame[]; simulatedFrames: InputFrame[];
  showTrail: boolean; showSimulation: boolean; move: Move;
}) {
  const ps = skin === "dualsense" || skin === "dualshock";
  const left = ps ? [215, 228] : [164, 155], right = [377, 228], dpad = ps ? [162, 153] : [225, 228];
  const faces = ps ? ["×", "○", "□", "△"] : skin === "generic" ? ["1", "2", "3", "4"] : ["A", "B", "X", "Y"];
  const button = (i: number) => (raw.buttons[i] ?? 0) >= .5 ? " is-pressed" : "";
  return (
    <svg className={`dl-controller dl-${skin}`} viewBox="0 0 600 340" role="img" aria-label={`${SKINS[skin]} controller input overlay`}>
      <path className="dl-shell" d={skin === "dualshock" ? "M154 70 Q115 65 95 125 L57 257 Q48 300 85 306 Q108 310 140 269 L183 247 H417 L460 290 Q498 326 531 296 Q548 280 535 245 L502 129 Q487 70 448 70 Z" : "M154 70 Q108 68 91 131 L57 258 Q51 293 80 303 Q110 313 145 264 L180 246 H420 L455 282 Q485 317 519 299 Q543 288 534 255 L503 131 Q489 71 447 70 Z"} />
      {ps && <rect className="dl-touchpad" x="235" y="91" width="130" height="77" rx={skin === "dualsense" ? 14 : 5} />}
      {[4, 5, 6, 7].map((i) => <g key={i} className={`dl-button${button(i)}`}>
        <rect x={i % 2 ? 405 : 130} y={i < 6 ? 60 : 28} width="65" height="25" rx="8" />
        <text x={i % 2 ? 437 : 162} y={i < 6 ? 77 : 45}>{ps ? ["L1", "R1", "L2", "R2"][i - 4] : ["LB", "RB", "LT", "RT"][i - 4]}</text>
      </g>)}
      {[left, right].map((center, index) => {
        const which = index === 0 ? "LS" : "RS", v = stick(raw, which), simulated = stick(response, which);
        return <g key={which}>
          <circle className="dl-stick-well" cx={center[0]} cy={center[1]} r="39" />
          {showTrail && <polyline className="dl-raw-path" points={at(frames, which, center, 27)} />}
          {showTrail && showSimulation && <polyline className="dl-response-path" points={at(simulatedFrames, which, center, 27)} />}
          <circle className={`dl-stick-cap${move.stick === which ? " dl-selected-stick" : ""}${button(index + 10)}`} cx={center[0]! + v[0] * 27} cy={center[1]! + v[1] * 27} r="17" />
          {showSimulation && <circle className="dl-response-dot" cx={center[0]! + simulated[0] * 27} cy={center[1]! + simulated[1] * 27} r="6" />}
          <text className="dl-stick-label" x={center[0]} y={center[1]! + 58}>{which}</text>
        </g>;
      })}
      {[[0, 0, 22], [1, 22, 0], [2, -22, 0], [3, 0, -22]].map(([i, x, y]) => <g key={i} className={`dl-button${button(i!)}`}>
        <circle cx={440 + x!} cy={150 + y!} r="17" /><text x={440 + x!} y={155 + y!}>{faces[i!]}</text>
      </g>)}
      {[[12, 0, -17], [13, 0, 17], [14, -17, 0], [15, 17, 0]].map(([i, x, y]) => <rect key={i} className={`dl-dpad${button(i!)}`} x={dpad[0]! + x! - 9} y={dpad[1]! + y! - 9} width="18" height="18" rx="3" />)}
      {[8, 9, 16].map((i, n) => <circle key={i} className={`dl-dpad${button(i)}`} cx={275 + n * 25} cy={ps ? 196 : 136} r="7" />)}
    </svg>
  );
}
