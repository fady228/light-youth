import { useState } from 'react';
import { BibleBook, PassageValue } from '../../api';
import { formatRef } from '../../learning';

interface PickerProps {
  books: BibleBook[];
  value: PassageValue | null;
  onChange: (v: PassageValue | null) => void;
  id: string;
  /** Chapter must be chosen (e.g. a devotion's reading). Otherwise "Whole book" is allowed. */
  requireChapter?: boolean;
  /** A verse is needed too (e.g. a key verse). */
  requireVerse?: boolean;
}

const num = (v: string) => (v ? Number(v) : null);

/**
 * Book → chapter → verses, all from dropdowns/limits, so nobody can type "Jhon 3" or "Romans 17".
 * Verse numbers are free (the data set doesn't list every chapter's verse count), but need a chapter first
 * and "to" can't be before "from".
 */
export function PassagePicker({ books, value, onChange, id, requireChapter, requireVerse }: PickerProps) {
  const info = books.find((b) => b.name === value?.book);
  const needChapter = requireChapter || requireVerse;
  const badRange = !!(value?.verseStart && value.verseEnd && value.verseEnd < value.verseStart);

  const set = (patch: Partial<PassageValue>) => value && onChange({ ...value, ...patch });
  const group = (t: 'OT' | 'NT') => books.filter((b) => b.testament === t);

  return (
    <div>
      <div className="passage-picker">
        <select
          id={`${id}-book`}
          className="select"
          aria-label="Book"
          value={value?.book ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? { book: e.target.value, chapter: null, verseStart: null, verseEnd: null } : null)
          }
        >
          <option value="">Book…</option>
          {(['OT', 'NT'] as const).map((t) => (
            <optgroup key={t} label={t === 'OT' ? 'Old Testament' : 'New Testament'}>
              {group(t).map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
            </optgroup>
          ))}
        </select>

        <select
          id={`${id}-chapter`}
          className="select"
          aria-label="Chapter"
          disabled={!info}
          value={value?.chapter ?? ''}
          onChange={(e) => set({ chapter: num(e.target.value), verseStart: null, verseEnd: null })}
        >
          <option value="">{needChapter ? 'Chapter…' : 'Whole book'}</option>
          {info && Array.from({ length: info.chapters }, (_, i) => i + 1).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <input
          className="input num"
          type="number"
          min={1}
          max={176}
          inputMode="numeric"
          placeholder={requireVerse ? 'Verse' : 'Verse (opt.)'}
          aria-label="From verse"
          disabled={!value?.chapter}
          value={value?.verseStart ?? ''}
          onChange={(e) => {
            const v = num(e.target.value);
            set({ verseStart: v, verseEnd: v ? value?.verseEnd ?? null : null });
          }}
        />
        <span className="muted" aria-hidden>–</span>
        <input
          className="input num"
          type="number"
          min={1}
          max={176}
          inputMode="numeric"
          placeholder="to"
          aria-label="To verse"
          disabled={!value?.verseStart}
          value={value?.verseEnd ?? ''}
          onChange={(e) => set({ verseEnd: num(e.target.value) })}
        />
      </div>
      {badRange ? (
        <p className="error" role="alert">The ending verse can't be before the starting verse.</p>
      ) : (
        value && <p className="hint">Selected: <strong>{formatRef(value)}</strong></p>
      )}
    </div>
  );
}

/** Several passages (e.g. for learning content): chips for chosen ones plus a picker to add another. */
export function PassageList({
  books, value, onChange, id, max = 6,
}: { books: BibleBook[]; value: PassageValue[]; onChange: (v: PassageValue[]) => void; id: string; max?: number }) {
  const [draft, setDraft] = useState<PassageValue | null>(null);
  const bad = !!(draft?.verseStart && draft.verseEnd && draft.verseEnd < draft.verseStart);
  const duplicate = !!draft && value.some((p) => formatRef(p) === formatRef(draft));

  const add = () => {
    if (!draft || bad || duplicate) return;
    onChange([...value, draft]);
    setDraft(null);
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="chip-list" aria-label="Chosen passages">
          {value.map((p, i) => (
            <span key={formatRef(p)} className="tag-pill">
              ✝ {formatRef(p)}
              <button type="button" aria-label={`Remove ${formatRef(p)}`} onClick={() => onChange(value.filter((_, j) => j !== i))}>✕</button>
            </span>
          ))}
        </div>
      )}
      {value.length < max ? (
        <div className="passage-add">
          <PassagePicker books={books} value={draft} onChange={setDraft} id={id} />
          <button type="button" className="btn btn-outline btn-small" disabled={!draft || bad || duplicate} onClick={add}>
            {duplicate ? 'Already added' : '+ Add passage'}
          </button>
        </div>
      ) : (
        <p className="hint">That's the maximum of {max} passages.</p>
      )}
    </div>
  );
}
