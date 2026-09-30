import { useCallback, useEffect, useState, type ReactNode } from "react";
import "./compare.css";

export function useCompareView() {
  const [trayExpanded, setTrayExpanded] = useState(false);
  const [sideExpanded, setSideExpanded] = useState(false);
  /** Call after a pin is added, with the new total. */
  const pinAdded = useCallback((total: number) => {
    setTrayExpanded(true);
    if (total === 1) setSideExpanded(false);
  }, []);
  const reset = useCallback(() => { setTrayExpanded(false); setSideExpanded(false); }, []);
  return { trayExpanded, setTrayExpanded, sideExpanded, setSideExpanded, pinAdded, reset };
}

export type CompareView = ReturnType<typeof useCompareView>;

/**
 * Pinned-item comparison. Phones get a bottom tray; wider screens get a side panel that reflows
 * the page (body padding) rather than overlaying it, so it never covers the picker.
 */
export function Compare(props: {
  view: CompareView;
  count: number;
  label: string;
  /** Condensed cards for the side panel. */
  cards: ReactNode;
  /** The full comparison (grids). */
  full: ReactNode;
  onClear: () => void;
  /** Shown in the side panel while only one item is pinned. */
  hint?: string;
}) {
  const { view, count } = props;
  const trayOpen = view.trayExpanded && count > 0;
  const sideOpen = view.sideExpanded && count > 0;

  useEffect(() => {
    document.body.classList.toggle("side-has-items", count > 0);
    document.body.classList.toggle("side-extended", sideOpen);
    return () => document.body.classList.remove("side-has-items", "side-extended");
  }, [count, sideOpen]);

  const clear = () => { props.onClear(); view.reset(); };

  return (
    <>
      <div className={`comparetray${count ? " has-items" : ""}${trayOpen ? " expanded" : ""}`}>
        <button className="ct-handle" type="button" aria-expanded={trayOpen} aria-controls="ctBody" onClick={() => view.setTrayExpanded(!view.trayExpanded)}>
          <span>Compare ({count})</span>
          <span className="hint">Tap to view</span>
          <span className="chev" aria-hidden="true">&#9650;</span>
        </button>
        <div className="ct-body" id="ctBody">
          {count > 0 && (
            <>
              <button type="button" className="ct-clear" onClick={clear}>Clear all</button>
              {props.full}
            </>
          )}
        </div>
      </div>
      <aside className={`side-panel${count ? " has-items" : ""}${sideOpen ? " extended" : ""}`} aria-label={props.label}>
        <div className="sp-head">
          <span>Compare ({count})</span>
          <button type="button" className="sp-clear" onClick={clear}>Clear</button>
        </div>
        <div className="sp-body" id="spBody">
          {count > 0 && (
            <>
              <div className="sp-cards">{props.cards}</div>
              {sideOpen && count >= 2 ? props.full : count === 1 ? <p className="sp-hint">{props.hint ?? "Pin one more to compare them side by side."}</p> : null}
            </>
          )}
        </div>
        <button
          type="button"
          className="sp-toggle"
          aria-expanded={sideOpen}
          aria-controls="spBody"
          disabled={count < 2}
          onClick={() => view.setSideExpanded(!view.sideExpanded)}
        >
          {view.sideExpanded ? "Show Condensed" : "View Full Comparison →"}
        </button>
      </aside>
    </>
  );
}

/** A label column plus one column per item. `rows` are [label, cell per item]. */
export function CompareGrid(props: { title: string; names: ReactNode[]; rows: [ReactNode, ReactNode[]][]; vertical?: boolean; first?: boolean; cellClass?: (row: number, col: number) => string }) {
  const n = props.names.length;
  return (
    <>
      <div className="ct-cell lbl ct-section" style={props.first === false ? { margin: "var(--space-4) 0 .3rem" } : undefined}>{props.title}</div>
      <div className={`ct-grid${props.vertical ? " vertical" : ""}`} style={{ gridTemplateColumns: `120px repeat(${n},1fr)` }} role="table">
        <div role="row" style={{ display: "contents" }}>
          <div className="ct-cell lbl" role="columnheader" />
          {props.names.map((nm, i) => <div key={i} className="ct-cell name" role="columnheader">{nm}</div>)}
        </div>
        {props.rows.map(([lbl, cells], r) => (
          <div role="row" key={r} style={{ display: "contents" }}>
            <div className="ct-cell lbl" role="rowheader">{lbl}</div>
            {cells.map((c, i) => <div key={i} className={`ct-cell ${props.cellClass?.(r, i) ?? ""}`} role="cell">{c}</div>)}
          </div>
        ))}
      </div>
    </>
  );
}
