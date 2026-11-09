import { ChangeEvent, FormEvent, useState } from 'react';
import { AdminLearning, api, ItemType, LearningInput } from '../../api';
import { useFetch } from '../../hooks';
import { embedFor, TYPE_META } from '../../learning';
import MarkdownField from './MarkdownField';
import { PassageList } from './PassagePicker';
import TagPicker from './TagPicker';

const TYPES: ItemType[] = ['article', 'video', 'sermon'];
const DEFAULT_EMOJI: Record<ItemType, string> = { article: '📖', video: '🎬', sermon: '📄' };
const MAX_PDF_MB = 25;

export const emptyLearning: LearningInput = {
  type: 'article', title: '', summary: '', content: '', videoUrl: '', fileName: null, fileOriginal: null,
  emoji: DEFAULT_EMOJI.article, featured: false, published: true, tags: [], passages: [],
};

/** Turns a saved item into form values (for editing). */
export function toInput(item: AdminLearning): LearningInput {
  return {
    type: item.type,
    title: item.title,
    summary: item.type === 'article' ? '' : item.summary,
    content: item.content ?? '',
    videoUrl: item.videoUrl ?? '',
    fileName: item.fileName,
    fileOriginal: item.fileOriginal,
    emoji: item.emoji,
    featured: item.featured,
    published: item.published,
    tags: item.tags.map((t) => t.name),
    passages: item.passages.map(({ book, chapter, verseStart, verseEnd }) => ({ book, chapter, verseStart, verseEnd })),
  };
}

interface Props {
  initial: LearningInput;
  id: string | null; // null = creating
  onDone: () => void;
  onCancel: () => void;
}

export function LearningForm({ initial, id, onDone, onCancel }: Props) {
  const [f, setF] = useState<LearningInput>(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const facets = useFetch(() => api.adminFacets());
  const books = useFetch(() => api.bibleBooks());
  const set = <K extends keyof LearningInput>(k: K, v: LearningInput[K]) => setF((s) => ({ ...s, [k]: v }));

  const changeType = (type: ItemType) =>
    setF((s) => ({
      ...s,
      type,
      // keep a custom emoji, but follow the default when the admin hasn't changed it
      emoji: s.emoji === DEFAULT_EMOJI[s.type] ? DEFAULT_EMOJI[type] : s.emoji,
    }));

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setErr('Please choose a PDF file.');
    if (file.size > MAX_PDF_MB * 1024 * 1024) return setErr(`That PDF is larger than ${MAX_PDF_MB} MB.`);
    setErr('');
    setUploading(true);
    try {
      const up = await api.uploadPdf(file);
      setF((s) => ({ ...s, fileName: up.fileName, fileOriginal: up.fileOriginal }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (f.type === 'sermon' && !f.fileName) return setErr('Upload the sermon PDF first.');
    if (f.type !== 'article' && !f.summary?.trim()) return setErr('Add a short summary so people can find this in search.');
    if (f.published && f.tags.length === 0) {
      return setErr('Add at least one tag to publish this, or untick "Published" to save it as a draft.');
    }
    const payload: LearningInput = {
      ...f,
      title: f.title.trim(),
      summary: f.type === 'article' ? null : f.summary!.trim(), // articles get an automatic preview from their text
      content: f.content?.trim() || null,
      videoUrl: f.type === 'video' ? f.videoUrl?.trim() || null : null,
      fileName: f.type === 'sermon' ? f.fileName : null,
      fileOriginal: f.type === 'sermon' ? f.fileOriginal : null,
    };
    setBusy(true);
    try {
      if (id) await api.updateLearning(id, payload);
      else await api.createLearning(payload);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const embed = f.type === 'video' && f.videoUrl?.trim() ? embedFor(f.videoUrl.trim()) : null;

  return (
    <form className="card admin-form" onSubmit={submit}>
      <h2>{id ? 'Edit learning content' : 'Add learning content'}</h2>

      <div className="field">
        <span className="field-label" id="type-label">Type</span>
        <div className="tag-bar" role="radiogroup" aria-labelledby="type-label">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={f.type === t}
              className={`tag-chip${f.type === t ? ' on' : ''}`}
              onClick={() => changeType(t)}
            >
              {TYPE_META[t].icon} {TYPE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field narrow">
          <label htmlFor="l-emoji">Emoji</label>
          <input id="l-emoji" className="input" value={f.emoji} onChange={(e) => set('emoji', e.target.value)} maxLength={16} required />
        </div>
        <div className="field">
          <label htmlFor="l-title">Title</label>
          <input id="l-title" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} maxLength={200} required />
        </div>
      </div>

      {f.type !== 'article' && (
        <div className="field">
          <label htmlFor="l-summary">Summary</label>
          <textarea id="l-summary" className="input" rows={3} value={f.summary ?? ''} onChange={(e) => set('summary', e.target.value)} maxLength={2000} required />
          <p className="hint">Shown on the card and on the page, and searched. Say what it's about, since there's no article text to search.</p>
        </div>
      )}

      {f.type === 'video' && (
        <div className="field">
          <label htmlFor="l-video">Video link</label>
          <input id="l-video" className="input" type="url" placeholder="https://www.youtube.com/watch?v=…" value={f.videoUrl ?? ''}
            onChange={(e) => set('videoUrl', e.target.value)} maxLength={500} required />
          {embed && (
            <p className="hint">
              {embed.kind === 'link'
                ? 'This link will open in a new tab. Only YouTube, Vimeo and direct .mp4/.webm links play on the page.'
                : '✓ This will play right on the page.'}
            </p>
          )}
        </div>
      )}

      {f.type === 'sermon' && (
        <div className="field">
          <span className="field-label">Sermon PDF</span>
          <div className="file-box">
            {f.fileName ? (
              <span>📄 <strong>{f.fileOriginal || 'sermon.pdf'}</strong> <span className="muted">· uploaded</span></span>
            ) : (
              <span className="muted">No file yet</span>
            )}
            <label className={`btn btn-outline btn-small file-btn${uploading ? ' disabled' : ''}`}>
              {uploading ? 'Uploading…' : f.fileName ? 'Replace PDF' : 'Choose PDF'}
              <input type="file" accept="application/pdf,.pdf" onChange={onFile} disabled={uploading} />
            </label>
          </div>
          <p className="hint">PDF only, up to {MAX_PDF_MB} MB. The file is saved when you save this item.</p>
        </div>
      )}

      <MarkdownField
        id="l-content"
        label={f.type === 'article' ? 'Article text' : f.type === 'video' ? 'Notes or transcript (optional)' : 'Notes or sermon text (optional)'}
        value={f.content ?? ''}
        onChange={(v) => set('content', v)}
        rows={f.type === 'article' ? 14 : 6}
        required={f.type === 'article'}
        hint={
          f.type === 'article'
            ? 'Use the Preview tab to check how it will look. **bold**, # headings, - bullet lists and 1. numbered lists all work. A short preview for the cards is made from this text automatically.'
            : 'Shown under the video or PDF, and searched. Great for key points or a transcript.'
        }
      />

      <div className="field">
        <span className="field-label">Bible passages</span>
        <PassageList id="l-passages" books={books.data ?? []} value={f.passages} onChange={(v) => set('passages', v)} />
        <p className="hint">Chosen from the list so every item is filed consistently. Youth can filter by book.</p>
      </div>

      <div className="field">
        <span className="field-label">Tags <span className="req">required to publish</span></span>
        <TagPicker id="l-tags" value={f.tags} onChange={(v) => set('tags', v)} existing={facets.data?.tags ?? []} required={f.published} />
      </div>

      <div className="checks">
        <label><input type="checkbox" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured on Home</label>
        <label><input type="checkbox" checked={f.published} onChange={(e) => set('published', e.target.checked)} /> Published</label>
      </div>

      {err && <p className="error" role="alert">{err}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy || uploading}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
