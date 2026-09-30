import { attributeDescriptions } from "../../data/attributeDescriptions";
import { ATTRIBUTES, ATTRIBUTE_CATEGORY, CATEGORIES, CATEGORY_LABEL, type Attribute, type Blueprint } from "../../domain";
import type { Loaded } from "./useBuilder";

function AttrLabel({ name }: { name: Attribute }) {
  const tid = `tt-${name.replace(/[^a-z0-9]/gi, "")}`;
  // Hover or keyboard focus reveals the description; touch devices have no hover, so the CSS
  // gates the reveal to (hover: hover) and (pointer: fine).
  return (
    <span className="attr-label" tabIndex={0} aria-describedby={tid}>
      {name}
      <span className="attr-tooltip" role="tooltip" id={tid}>{attributeDescriptions[name] ?? ""}</span>
    </span>
  );
}

export function AttributeWorkspace(props: {
  loaded: Loaded;
  attrs: Partial<Record<Attribute, number>>;
  onChange: (a: Attribute, v: number) => void;
}) {
  const { loaded, attrs } = props;
  const editable = loaded.type === "blueprint" && loaded.mode === "range";
  const range: Blueprint["attributeRange"] | null = loaded.type === "blueprint" ? loaded.bp.attributeRange : null;
  const hint = editable
    ? "Sliders are bounded to this archetype's published range."
    : loaded.type === "blueprint"
      ? "Only a starting build is published for this archetype, with no ceiling to slide toward, so values are fixed."
      : "Real player card: values are fixed, not editable.";
  const d = loaded.type === "blueprint" ? loaded.bp : loaded.p;

  return (
    <>
      <div className="bodyinfo">
        <span><b>Height</b> {d.height}</span>
        <span><b>Position</b> {d.position}</span>
        {loaded.type === "blueprint" && <span><b>Weight</b> {loaded.bp.weight} lbs</span>}
        <span>{hint}</span>
      </div>
      {CATEGORIES.map((cat) => {
        const list = ATTRIBUTES.filter((a) => ATTRIBUTE_CATEGORY[a] === cat && attrs[a] != null);
        if (!list.length) return null;
        return (
          <div className="attr-group" key={cat} style={{ ["--sk" as string]: `var(--skill-${cat})` }}>
            <div className="attr-group-head"><span className="dot" aria-hidden="true" /><h3>{CATEGORY_LABEL[cat]}</h3></div>
            {list.map((a) => {
              const v = attrs[a]!;
              if (editable && range) {
                const [min, max] = range[a];
                return (
                  <div className="attr-row" key={a}>
                    <div className="al"><AttrLabel name={a} /> <b>{v}</b></div>
                    <input
                      type="range"
                      min={min}
                      max={max ?? min}
                      step={1}
                      value={v}
                      aria-label={`${a}, ${min} to ${max}`}
                      onChange={(e) => props.onChange(a, Number(e.target.value))}
                    />
                    <div className="rangehint">Archetype range: {min}&ndash;{max}</div>
                  </div>
                );
              }
              const reason = loaded.type === "blueprint" ? "fixed, only a floor is published" : "fixed, real player card";
              return (
                <div className="attr-row" key={a}>
                  <div className="al"><AttrLabel name={a} /> <b>{v}</b></div>
                  <input type="range" min={0} max={99} value={v} disabled aria-label={`${a}: ${v} (${reason})`} readOnly />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
