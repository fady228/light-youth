interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}

export default function SearchBox({ value, onChange, placeholder = 'Search…', label = 'Search' }: Props) {
  return (
    <div className="search" role="search">
      <span className="search-icon" aria-hidden>🔍</span>
      <input
        className="input pill"
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={100}
      />
      {value && (
        <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onChange('')}>
          ✕
        </button>
      )}
    </div>
  );
}
