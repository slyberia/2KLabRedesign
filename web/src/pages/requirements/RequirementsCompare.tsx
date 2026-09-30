import { animations } from "../../data/animations";
import { badges } from "../../data/badges";
import { ATTRIBUTE_CATEGORY, SUBTYPE_LABEL, badgeCategory, type Attribute } from "../../domain";
import { CompareGrid } from "../../components/Compare";

const dash = "—";
const byIds = <T extends { id: string }>(all: readonly T[], ids: string[]) =>
  ids.map((id) => all.find((x) => x.id === id)).filter((x): x is T => !!x);

export function RequirementsCompareCards(props: { badgeIds: string[]; animIds: string[]; onUnpin: (kind: "badge" | "anim", id: string) => void }) {
  return (
    <>
      {byIds(badges, props.badgeIds).map((b) => (
        <div className="mini-preset" key={b.id} style={{ ["--sk" as string]: `var(--skill-${badgeCategory(b)})` }}>
          <button type="button" className="mp-remove" aria-label={`Remove ${b.name}`} onClick={() => props.onUnpin("badge", b.id)}>&times;</button>
          <div className="mp-name">{b.name}<span className="mp-type">Badge</span></div>
          <div className="mp-meta">{b.conditions[0]!.attribute}{b.operator !== "SINGLE" ? ` ${b.operator}` : ""}</div>
        </div>
      ))}
      {byIds(animations, props.animIds).map((a) => {
        const first = Object.keys(a.thresholds)[0] as Attribute | undefined;
        return (
          <div className="mini-preset" key={a.id} style={{ ["--sk" as string]: `var(--skill-${first ? ATTRIBUTE_CATEGORY[first] : "physical"})` }}>
            <button type="button" className="mp-remove" aria-label={`Remove ${a.animationName}`} onClick={() => props.onUnpin("anim", a.id)}>&times;</button>
            <div className="mp-name">{a.animationName}<span className="mp-type">{SUBTYPE_LABEL[a.subtype]}</span></div>
            <div className="mp-meta">{a.minHeight}&ndash;{a.maxHeight}</div>
          </div>
        );
      })}
    </>
  );
}

/** Badges and animations are compared in two separate sections, never merged. */
export function RequirementsCompareFull(props: { badgeIds: string[]; animIds: string[] }) {
  const bs = byIds(badges, props.badgeIds);
  const as = byIds(animations, props.animIds);
  const attrUnion = [...new Set(as.flatMap((a) => Object.keys(a.thresholds) as Attribute[]))];
  return (
    <>
      {bs.length > 0 && (
        <CompareGrid
          title={`Badges (${bs.length})`}
          names={bs.map((b) => b.name)}
          rows={[
            ["Attribute", bs.map((b) => b.conditions.map((c) => c.attribute).join(b.operator === "AND" ? " + " : " / ") + (b.operator !== "SINGLE" ? ` (${b.operator})` : ""))],
            ["Bronze", bs.map((b) => b.conditions[0]!.bronze ?? dash)],
            ["Silver", bs.map((b) => b.conditions[0]!.silver ?? dash)],
            ["Gold", bs.map((b) => b.conditions[0]!.gold ?? dash)],
            ["HoF", bs.map((b) => b.conditions[0]!.hof ?? dash)],
            ["Height", bs.map((b) => `${b.minHeight}–${b.maxHeight}`)],
          ]}
        />
      )}
      {as.length > 0 && (
        <CompareGrid
          title={`Animations (${as.length})`}
          first={bs.length === 0}
          vertical
          names={as.map((a) => a.animationName)}
          rows={[
            ["Type", as.map((a) => SUBTYPE_LABEL[a.subtype])],
            ...attrUnion.map((attr): [string, string[]] => [attr, as.map((a) => (a.thresholds[attr] == null ? `${dash} not required` : `${a.thresholds[attr]}+`))]),
            ["Height", as.map((a) => `${a.minHeight}–${a.maxHeight}`)],
          ]}
        />
      )}
    </>
  );
}
