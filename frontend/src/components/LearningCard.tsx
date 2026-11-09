import { Link } from 'react-router-dom';
import { LearningItem } from '../api';
import { TYPE_META } from '../learning';

interface Props {
  item: LearningItem;
  onToggleSave?: (item: LearningItem) => void;
  showBadge?: boolean;
}

export default function LearningCard({ item, onToggleSave, showBadge = true }: Props) {
  const meta = TYPE_META[item.type];
  return (
    <Link to={`/learning/${item.id}`} className="card learn-card">
      <div className="learn-card-top">
        <span className="learn-emoji" aria-hidden>{item.emoji}</span>
        <span className="learn-card-actions">
          {showBadge && item.featured && <span className="badge">Featured</span>}
          <span className="badge type-badge">{meta.icon} {meta.label}</span>
          {onToggleSave && (
            <button
              className={`save-btn${item.saved ? ' on' : ''}`}
              aria-label={item.saved ? 'Remove from saved' : 'Save'}
              aria-pressed={item.saved}
              onClick={(e) => {
                e.preventDefault();
                onToggleSave(item);
              }}
            >
              {item.saved ? '🔖' : '🏷️'}
            </button>
          )}
        </span>
      </div>
      <h3>{item.title}</h3>
      <p className="muted summary-clamp">{item.summary}</p>
      {(item.passages.length > 0 || item.tags.length > 0) && (
        <p className="tags" aria-label="Passages and tags">
          {item.passages.map((p) => (
            <span key={p.reference} className="tag passage">✝ {p.reference}</span>
          ))}
          {item.tags.map((t) => (
            <span key={t.slug} className="tag">#{t.name}</span>
          ))}
        </p>
      )}
    </Link>
  );
}
