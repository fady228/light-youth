import Markdown from './Markdown';

interface Props {
  passageRef: string;
  verseRef: string | null;
  body: string;
  label?: string;
}

/** The devotion's Bible reading. Shared by the youth page and the admin reading view. */
export default function ReadingCard({ passageRef, verseRef, body, label = 'Reading' }: Props) {
  return (
    <section className="card reading">
      <p className="eyebrow">📖 {label}: {passageRef}</p>
      {verseRef && <p className="verse-ref">{verseRef}</p>}
      <Markdown className="reading-body">{body}</Markdown>
    </section>
  );
}
