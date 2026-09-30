import { useRef, type KeyboardEvent } from "react";

export interface TabDef<T extends string> {
  id: T;
  label: string;
  /** DOM id of the tab button (defaults to `tab-${id}`). */
  tabId?: string;
  panelId?: string;
  /** Optional category color: shown as a dot and exposed to CSS as --sk. */
  color?: string;
}

export const tabDomId = <T extends string>(t: TabDef<T>) => t.tabId ?? `tab-${t.id}`;
export const panelDomId = <T extends string>(t: TabDef<T>) => t.panelId ?? `panel-${t.id}`;

/**
 * ARIA tablist with a roving tabindex: one tab stop for the group, arrow keys move and select
 * (Home/End jump). Vertical lists use Up/Down.
 */
export function Tabs<T extends string>(props: {
  tabs: readonly TabDef<T>[];
  selected: T;
  onSelect: (t: T) => void;
  label: string;
  className?: string;
  vertical?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const { tabs, selected, onSelect } = props;
  const onKey = (e: KeyboardEvent, i: number) => {
    const prev = props.vertical ? "ArrowUp" : "ArrowLeft";
    const next = props.vertical ? "ArrowDown" : "ArrowRight";
    let j: number | null = null;
    if (e.key === next) j = (i + 1) % tabs.length;
    else if (e.key === prev) j = (i + tabs.length - 1) % tabs.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = tabs.length - 1;
    if (j == null) return;
    e.preventDefault();
    refs.current[j]?.focus();
    onSelect(tabs[j]!.id);
  };
  return (
    <div
      className={props.className ?? "tabs"}
      role="tablist"
      aria-label={props.label}
      aria-orientation={props.vertical ? "vertical" : undefined}
    >
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => { refs.current[i] = el; }}
          role="tab"
          type="button"
          id={tabDomId(t)}
          aria-selected={t.id === selected}
          aria-controls={panelDomId(t)}
          tabIndex={t.id === selected ? 0 : -1}
          onClick={() => onSelect(t.id)}
          onKeyDown={(e) => onKey(e, i)}
          style={t.color ? { ["--sk" as string]: t.color } : undefined}
        >
          {t.color && <span className="cdot" aria-hidden="true" />}
          {t.label}
        </button>
      ))}
    </div>
  );
}
