import { TIER_LABEL, type Attribute, type Badge, type Tier } from "../domain";
import "./badge-requirements.css";

export interface BadgeRequirementPick {
  attribute: Attribute;
  value: number;
  tier: Tier;
}

const TIERS: Tier[] = ["bronze", "silver", "gold", "hof"];

/** Keep every attribute path visible, including tiers absent from the first condition. */
export function BadgeRequirements({ badge, onPick, compact = false }: {
  badge: Badge;
  onPick?: (pick: BadgeRequirementPick) => void;
  compact?: boolean;
}) {
  return (
    <div className={`badge-requirements${compact ? " compact" : ""}`}>
      {badge.conditions.length > 1 && (
        <p className="requirement-rule">
          {badge.operator === "OR" ? "Meet either attribute row for the desired tier." : "Meet both attribute rows for the desired tier."}
        </p>
      )}
      {badge.conditions.map((condition) => (
        <div className="badge-condition" role="group" aria-label={`${condition.attribute} requirements`} key={condition.attribute}>
          <span className="condition-label">{condition.attribute}</span>
          <div className="requirement-legend" aria-hidden="true">
            {TIERS.map((tier) => <span key={tier}>{TIER_LABEL[tier]}</span>)}
          </div>
          <div className="tilerow">
            {TIERS.map((tier) => {
              const value = condition[tier];
              const label = `${TIER_LABEL[tier]}: ${value ?? "not published"}. ${condition.attribute}.`;
              const content = <span className="v" aria-hidden="true">{value ?? "—"}</span>;
              return value != null && onPick ? (
                <button key={tier} type="button" className={`tile t-${tier}`} aria-label={`${label} Show animations unlocked at this rating.`}
                  onClick={() => onPick({ attribute: condition.attribute, value, tier })}>
                  {content}
                </button>
              ) : (
                <span key={tier} className={`tile ${value == null ? "na" : `t-${tier}`}`} role="img" aria-label={label}>
                  {content}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
