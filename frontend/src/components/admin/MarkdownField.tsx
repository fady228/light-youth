import { useState } from 'react';
import Markdown from '../Markdown';

interface Props {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  required?: boolean;
  hint?: string;
}

/** A textarea with Write / Preview tabs, so authors see exactly how the text will look to readers. */
export default function MarkdownField({ id, label, value, onChange, rows = 8, required, hint }: Props) {
  const [preview, setPreview] = useState(false);
  return (
    <div className="field">
      <div className="row-between">
        <label htmlFor={id}>{label}</label>
        <div className="seg" role="tablist" aria-label={`${label} view`}>
          <button type="button" role="tab" aria-selected={!preview} className={!preview ? 'on' : ''} onClick={() => setPreview(false)}>Write</button>
          <button type="button" role="tab" aria-selected={preview} className={preview ? 'on' : ''} onClick={() => setPreview(true)}>Preview</button>
        </div>
      </div>
      {preview ? (
        <div className="md-preview">
          {value.trim() ? <Markdown>{value}</Markdown> : <p className="muted">Nothing to preview yet.</p>}
        </div>
      ) : (
        <textarea id={id} className="input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
      )}
      <p className="hint">
        {hint ?? 'Formatting works: **bold**, *italic*, # headings, - bullet lists, 1. numbered lists. Blank line = new paragraph.'}
      </p>
    </div>
  );
}
