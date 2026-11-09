import { FormEvent, useState } from 'react';
import { AdminDevotion, api, NewQuestion, PassageValue } from '../../api';
import { useFetch } from '../../hooks';
import { todayStr } from './dates';
import MarkdownField from './MarkdownField';
import { PassagePicker } from './PassagePicker';

type QType = NewQuestion['type'];
interface Draft {
  key: number;
  type: QType;
  prompt: string;
  points: number;
  options: string[];
  correctIndex: number | null; // multiple choice
  tf: 'true' | 'false'; // true/false
}

let keySeed = 0;
const newDraft = (type: QType): Draft => ({
  key: ++keySeed,
  type,
  prompt: '',
  points: type === 'open' ? 10 : 5,
  options: type === 'multiple_choice' ? ['', '', '', ''] : [],
  correctIndex: null,
  tf: 'true',
});

const typeName: Record<QType, string> = {
  multiple_choice: 'Multiple choice',
  true_false: 'True or false',
  open: 'Your thoughts (open)',
};


export function DevotionForm({
  existing, takenDates, defaultDate, onDone, onCancel,
}: { existing: AdminDevotion | null; takenDates: string[]; defaultDate?: string; onDone: () => void; onCancel: () => void }) {
  const isEdit = !!existing;
  const [title, setTitle] = useState(existing?.title ?? '');
  const [publishDate, setPublishDate] = useState(existing?.publishDate ?? defaultDate ?? todayStr());
  const books = useFetch(() => api.bibleBooks());
  const [passage, setPassage] = useState<PassageValue | null>(
    existing?.book
      ? { book: existing.book, chapter: existing.chapter, verseStart: existing.verseStart, verseEnd: existing.verseEnd }
      : null,
  );
  const [keyVerse, setKeyVerse] = useState<PassageValue | null>(existing?.keyVerse ?? null);
  const [body, setBody] = useState(existing?.body ?? '');
  const [quote, setQuote] = useState(existing?.reflectionQuote ?? '');
  const [author, setAuthor] = useState(existing?.reflectionAuthor ?? '');
  const [drafts, setDrafts] = useState<Draft[]>(isEdit ? [] : [newDraft('multiple_choice'), newDraft('true_false'), newDraft('open')]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const patch = (key: number, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...p } : d)));
  const move = (i: number, dir: -1 | 1) =>
    setDrafts((ds) => {
      const j = i + dir;
      if (j < 0 || j >= ds.length) return ds;
      const c = [...ds];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const buildQuestions = (): NewQuestion[] | string => {
    if (drafts.length === 0) return 'Add at least one question.';
    const out: NewQuestion[] = [];
    for (const [i, d] of drafts.entries()) {
      const n = i + 1;
      const prompt = d.prompt.trim();
      if (!prompt) return `Question ${n} needs a prompt.`;
      if (d.type === 'multiple_choice') {
        const opts = d.options.map((o) => o.trim());
        if (opts.length < 2 || opts.some((o) => !o)) return `Question ${n}: fill in every option (or remove the empty ones).`;
        if (new Set(opts).size !== opts.length) return `Question ${n}: options must be different from each other.`;
        if (d.correctIndex === null) return `Question ${n}: mark the correct option.`;
        out.push({ type: d.type, prompt, points: d.points, options: opts, correctAnswer: opts[d.correctIndex] });
      } else if (d.type === 'true_false') {
        out.push({ type: d.type, prompt, points: d.points, correctAnswer: d.tf });
      } else {
        out.push({ type: d.type, prompt, points: d.points });
      }
    }
    return out;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    if (takenDates.includes(publishDate)) return setErr('Another devotion is already scheduled for that date.');
    if (!passage?.chapter) return setErr('Choose the book and chapter of the reading.');
    if (passage.verseStart && passage.verseEnd && passage.verseEnd < passage.verseStart) return setErr("The reading's ending verse can't be before its starting verse.");
    if (keyVerse && !keyVerse.verseStart) return setErr('Add a verse number for the key verse, or clear it.');
    if (keyVerse?.verseStart && keyVerse.verseEnd && keyVerse.verseEnd < keyVerse.verseStart) return setErr("The key verse's ending verse can't be before its starting verse.");
    const base = { title: title.trim(), publishDate, passage, body: body.trim() };
    setBusy(true);
    try {
      if (isEdit) {
        await api.updateDevotion(existing!.id, {
          ...base, keyVerse, reflectionQuote: quote.trim() || null, reflectionAuthor: author.trim() || null,
        });
      } else {
        const qs = buildQuestions();
        if (typeof qs === 'string') {
          setErr(qs);
          return;
        }
        await api.createDevotion({
          ...base, questions: qs,
          ...(keyVerse ? { keyVerse } : {}),
          ...(quote.trim() ? { reflectionQuote: quote.trim() } : {}),
          ...(author.trim() ? { reflectionAuthor: author.trim() } : {}),
        });
      }
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card admin-form" onSubmit={submit}>
      <h2>{isEdit ? 'Edit devotion' : 'New devotion'}</h2>

      <div className="field-row">
        <div className="field">
          <label htmlFor="d-title">Title</label>
          <input id="d-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </div>
        <div className="field narrow-date">
          <label htmlFor="d-date">Publish date</label>
          <input id="d-date" type="date" className="input" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="d-passage-book">Bible passage (the reading)</label>
        <PassagePicker id="d-passage" books={books.data ?? []} value={passage} onChange={setPassage} requireChapter />
        {isEdit && !existing?.book && <p className="hint">This devotion was created before passages were picked from a list — please choose it again.</p>}
      </div>
      <div className="field">
        <div className="row-between">
          <label htmlFor="d-key-book">Key verse (optional)</label>
          {keyVerse && <button type="button" className="linklike" onClick={() => setKeyVerse(null)}>Clear</button>}
        </div>
        <PassagePicker id="d-key" books={books.data ?? []} value={keyVerse} onChange={setKeyVerse} requireVerse />
      </div>
      <MarkdownField
        id="d-body"
        label="Reading text"
        value={body}
        onChange={setBody}
        rows={8}
        required
        hint="The verse text plus any reflection prompt. Markdown works (**bold**, lists). Check your Bible translation's copyright before pasting."
      />
      <div className="field-row">
        <div className="field">
          <label htmlFor="d-quote">Reflection quote (optional)</label>
          <input id="d-quote" className="input" value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={500} />
        </div>
        <div className="field">
          <label htmlFor="d-author">Quote author</label>
          <input id="d-author" className="input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />
        </div>
      </div>

      <h3 className="form-h">Questions</h3>
      {isEdit ? (
        <>
          <p className="hint">
            Questions are locked after creation so existing answers and points stay valid. To change them, delete this
            devotion and create it again.
          </p>
          <ol className="q-readonly">
            {existing!.questions.map((q) => (
              <li key={q.id}>
                <strong>{q.prompt}</strong> <span className="muted">({typeName[q.type]} · {q.points} pts)</span>
                {q.options && (
                  <ul>
                    {q.options.map((o) => <li key={o}>{o}{o === q.correctAnswer && ' ✓'}</li>)}
                  </ul>
                )}
                {q.type === 'true_false' && <div className="muted">Answer: {q.correctAnswer}</div>}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <>
          <div className="stack">
            {drafts.map((d, i) => (
              <div key={d.key} className="q-draft">
                <div className="row-between">
                  <p className="eyebrow">{i + 1}. {typeName[d.type]}</p>
                  <div className="q-tools">
                    <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                    <button type="button" className="icon-btn" aria-label="Move down" disabled={i === drafts.length - 1} onClick={() => move(i, 1)}>↓</button>
                    <button type="button" className="icon-btn" aria-label={`Remove question ${i + 1}`} onClick={() => setDrafts((ds) => ds.filter((x) => x.key !== d.key))}>✕</button>
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor={`q-${d.key}`}>Prompt</label>
                    <input id={`q-${d.key}`} className="input" value={d.prompt} onChange={(e) => patch(d.key, { prompt: e.target.value })} maxLength={500} />
                  </div>
                  <div className="field narrow">
                    <label htmlFor={`p-${d.key}`}>Points</label>
                    <input id={`p-${d.key}`} type="number" min={0} max={100} className="input" value={d.points} onChange={(e) => patch(d.key, { points: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
                  </div>
                </div>

                {d.type === 'multiple_choice' && (
                  <fieldset className="opts">
                    <legend className="hint">Options — select the correct one</legend>
                    {d.options.map((o, oi) => (
                      <div key={oi} className="opt-row">
                        <input type="radio" name={`c-${d.key}`} aria-label={`Option ${oi + 1} is correct`} checked={d.correctIndex === oi} onChange={() => patch(d.key, { correctIndex: oi })} />
                        <input className="input" placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => patch(d.key, { options: d.options.map((x, xi) => (xi === oi ? e.target.value : x)) })} />
                        {d.options.length > 2 && (
                          <button type="button" className="icon-btn" aria-label={`Remove option ${oi + 1}`} onClick={() => patch(d.key, {
                            options: d.options.filter((_, xi) => xi !== oi),
                            correctIndex: d.correctIndex === null ? null : d.correctIndex === oi ? null : d.correctIndex > oi ? d.correctIndex - 1 : d.correctIndex,
                          })}>✕</button>
                        )}
                      </div>
                    ))}
                    {d.options.length < 6 && (
                      <button type="button" className="btn btn-outline btn-small" onClick={() => patch(d.key, { options: [...d.options, ''] })}>+ Add option</button>
                    )}
                  </fieldset>
                )}

                {d.type === 'true_false' && (
                  <fieldset className="opts">
                    <legend className="hint">Correct answer</legend>
                    <div className="checks">
                      {(['true', 'false'] as const).map((v) => (
                        <label key={v}>
                          <input type="radio" name={`tf-${d.key}`} checked={d.tf === v} onChange={() => patch(d.key, { tf: v })} /> {v === 'true' ? 'True' : 'False'}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                )}

                {d.type === 'open' && <p className="hint">Open answers need 20+ characters and earn full points for a genuine attempt.</p>}
              </div>
            ))}
          </div>
          <div className="add-q">
            {(Object.keys(typeName) as QType[]).map((t) => (
              <button key={t} type="button" className="btn btn-outline btn-small" onClick={() => setDrafts((ds) => [...ds, newDraft(t)])}>
                + {typeName[t]}
              </button>
            ))}
          </div>
        </>
      )}

      {err && <p className="error" role="alert">{err}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Publish devotion'}</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
