import { TagCount } from '../api';

interface Props {
  tags: TagCount[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}

/** One chip per tag. Clicking the active chip clears the filter. */
export default function TagBar({ tags, active, onSelect }: Props) {
  if (tags.length === 0) return null;
  return (
    <div className="filter-line" role="group" aria-label="Filter by tag">
      <span className="filter-label">Tags</span>
      <div className="tag-bar">
        {tags.map((t) => (
          <button
            key={t.slug}
            type="button"
            className={`tag-chip${active === t.slug ? ' on' : ''}`}
            aria-pressed={active === t.slug}
            onClick={() => onSelect(active === t.slug ? null : t.slug)}
          >
            {t.name}
            <span className="count">{t.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
