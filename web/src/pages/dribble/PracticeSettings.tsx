import { DEFAULT_SETTINGS, type PracticeSettings as Settings } from "./engine";
type BooleanKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];
type NumberKey = Exclude<keyof Settings, BooleanKey>;

export function PracticeSettings({ value, onChange }: { value: Settings; onChange: (settings: Settings) => void }) {
  const set = <K extends keyof Settings>(key: K, v: Settings[K]) => onChange({ ...value, [key]: v });
  const toggle = (key: BooleanKey, name: string) => <label className="dl-toggle"><input type="checkbox" checked={value[key]} onChange={(e) => set(key, e.target.checked)} />{name}</label>;
  const slider = (key: NumberKey, label: string, min: number, max: number, step: number, suffix = "") => (
    <label className="dl-slider">{label}<output>{Number(value[key]).toFixed(step < 1 ? 2 : 0)}{suffix}</output>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value[key]} onChange={(e) => set(key, Number(e.target.value))} />
    </label>
  );
  return (
    <details className="dl-settings">
      <summary>Practice settings <span>Simulations are optional</span></summary>
      <p className="dl-muted">Changes apply to the response layer, never the raw input. Changing a setting clears the current attempt.</p>
      <div className="dl-settings-grid">
        <fieldset><legend>Center response</legend>
          {toggle("deadzoneOn", "Apply dead zone")}{value.deadzoneOn && slider("deadzone", "Dead zone radius", 0, .5, .01)}
          {toggle("sensitivityOn", "Adjust sensitivity")}{value.sensitivityOn && slider("sensitivity", "Sensitivity multiplier", .5, 2, .05, "×")}
        </fieldset>
        <fieldset><legend>Drift simulation</legend>
          {toggle("driftOn", "Simulate stick drift")}{value.driftOn && <>{slider("drift", "Drift strength", .01, .4, .01)}{slider("driftAngle", "Drift direction", 0, 360, 5, "°")}<p className="dl-muted">0° right · 90° down · 180° left · 270° up</p></>}
        </fieldset>
        <fieldset><legend>Latency simulation</legend>
          {toggle("lagOn", "Simulate input lag")}{value.lagOn && slider("lagMs", "Simulated delay", 0, 500, 10, " ms")}
          <p className="dl-muted">Artificial browser delay, not a measurement of game or console latency.</p>
        </fieldset>
        <fieldset><legend>Practice tolerances</legend>
          {toggle("directionOn", "Override direction tolerance")}{value.directionOn && slider("directionDegrees", "Direction tolerance", 5, 60, 1, "°")}
          {toggle("timingOn", "Assess demo timing")}{value.timingOn && slider("timingMs", "Timing tolerance", 50, 1000, 25, " ms")}
          <p className="dl-muted">Default direction tolerance: ±25°. Timing is off by default and follows the illustrative demo pace, not a measured game window.</p>
        </fieldset>
        <fieldset><legend>Movement trails</legend>
          {toggle("trailsOn", "Show movement trails")}{value.trailsOn && slider("trailSeconds", "Trail duration", 1, 6, .5, " s")}
        </fieldset>
      </div>
      <button type="button" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Reset practice settings</button>
    </details>
  );
}
