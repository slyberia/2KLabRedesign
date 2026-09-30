export function SearchBox(props: { id: string; value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <label className="search">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 5 1.5-1.5-5-5zm-6 0A4.5 4.5 0 1114 9.5 4.5 4.5 0 019.5 14z" />
      </svg>
      <input type="search" id={props.id} value={props.value} placeholder={props.placeholder} aria-label={props.label} onChange={(e) => props.onChange(e.target.value)} />
    </label>
  );
}
