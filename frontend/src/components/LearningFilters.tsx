import { Facets, ItemType } from '../api';
import { TYPE_META } from '../learning';
import TagBar from './TagBar';

interface Props {
  facets: Facets | null;
  type: ItemType | null;
  passage: string | null;
  tag: string | null;
  onType: (t: ItemType | null) => void;
  onPassage: (book: string | null) => void;
  onTag: (slug: string | null) => void;
}

/** Content type chips + Bible book dropdown + tag chips. Stateless: the page owns the values. */
export default function LearningFilters({ facets, type, passage, tag, onType, onPassage, onTag }: Props) {
  const total = facets?.types.reduce((s, t) => s + t.count, 0) ?? 0;
  return (
    <div className="filters">
      <div className="filter-line" role="group" aria-label="Filter by content type">
        <span className="filter-label">Type</span>
        <div className="tag-bar">
          <button type="button" className={`tag-chip${type === null ? ' on' : ''}`} aria-pressed={type === null} onClick={() => onType(null)}>
            All<span className="count">{total}</span>
          </button>
          {facets?.types
            .filter((t) => t.count > 0 || t.type === type)
            .map((t) => (
              <button
                key={t.type}
                type="button"
                className={`tag-chip${type === t.type ? ' on' : ''}`}
                aria-pressed={type === t.type}
                onClick={() => onType(type === t.type ? null : t.type)}
              >
                {TYPE_META[t.type].icon} {TYPE_META[t.type].plural}
                <span className="count">{t.count}</span>
              </button>
            ))}
        </div>
      </div>

      {facets && facets.passages.length > 0 && (
        <div className="filter-line">
          <label className="filter-label" htmlFor="passage-filter">Passage</label>
          <select
            id="passage-filter"
            className="select"
            value={passage ?? ''}
            onChange={(e) => onPassage(e.target.value || null)}
          >
            <option value="">Any book of the Bible</option>
            {facets.passages.map((p) => (
              <option key={p.book} value={p.book}>{p.book} ({p.count})</option>
            ))}
          </select>
        </div>
      )}

      <TagBar tags={facets?.tags ?? []} active={tag} onSelect={onTag} />
    </div>
  );
}
