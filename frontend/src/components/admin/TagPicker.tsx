import { useState } from 'react';
import { TagCount } from '../../api';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  existing: TagCount[];
  id: string;
  max?: number;
  /** Shows a warning style while empty (e.g. publishing requires a tag). */
  required?: boolean;
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Pick from tags that already exist (one click) or create a new one. Prevents near-duplicates like "Prayer"/"prayer". */
export default function TagPicker({ value, onChange, existing, id, max = 8, required }: Props) {
  const [text, setText] = useState('');
  const full = value.length >= max;

  const add = (raw: string) => {
    const name = raw.trim().replace(/\s+/g, ' ').slice(0, 30);
    if (!name || full || value.some((v) => same(v, name))) return;
    // typing a name that already exists reuses its exact spelling
    onChange([...value, existing.find((t) => same(t.name, name))?.name ?? name]);
  };
  const remove = (t: string) => onChange(value.filter((v) => v !== t));

  const available = existing.filter((t) => !value.some((v) => same(v, t.name)));
  const typed = text.trim();
  const matchesExisting = !!typed && existing.some((t) => same(t.name, typed));

  return (
    <div className={`tag-picker${required && value.length === 0 ? ' needs' : ''}`}>
      <div className="chip-list" aria-live="polite">
        {value.length === 0 && <span className="muted">{required ? 'No tags yet — add at least one.' : 'No tags yet.'}</span>}
        {value.map((t) => (
          <span key={t} className="tag-pill">
            #{t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => remove(t)}>✕</button>
          </span>
        ))}
      </div>

      {available.length > 0 && !full && (
        <div className="tag-existing">
          <span className="filter-label">Choose existing</span>
          <div className="tag-bar">
            {available.map((t) => (
              <button key={t.slug} type="button" className="tag-chip" onClick={() => add(t.name)} title={`Add #${t.name}`}>
                + {t.name}<span className="count">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!full ? (
        <div className="tag-new">
          <label className="filter-label" htmlFor={`${id}-new`}>Create new</label>
          <input
            id={`${id}-new`}
            className="input"
            placeholder="Type a new tag…"
            value={text}
            maxLength={30}
            onChange={(e) => {
              const v = e.target.value;
              if (!v.includes(',')) return setText(v);
              const parts = v.split(',');
              setText(parts.pop() ?? '');
              parts.forEach(add);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // don't submit the form
                add(text);
                setText('');
              }
            }}
          />
          <button type="button" className="btn btn-outline btn-small" disabled={!typed} onClick={() => { add(text); setText(''); }}>
            {matchesExisting ? 'Add existing' : 'Add new tag'}
          </button>
        </div>
      ) : (
        <p className="hint">That's the maximum of {max} tags.</p>
      )}
    </div>
  );
}
