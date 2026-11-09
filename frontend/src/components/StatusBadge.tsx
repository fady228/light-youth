import { DevotionStatus } from '../api';

const META: Record<DevotionStatus, { label: string; cls: string } | null> = {
  open: { label: 'To do today', cls: 'st-open' },
  done: { label: 'Done ✓', cls: 'st-done' },
  late: { label: 'Missed · answered late', cls: 'st-late' },
  missed: { label: 'Missed', cls: 'st-missed' },
  archive: null,
};

/** Small coloured pill for a devotion's status. Archive (before you joined) shows nothing unless answered. */
export default function StatusBadge({ status, completed }: { status: DevotionStatus; completed?: boolean }) {
  const m = META[status] ?? (completed ? { label: 'Answered · no points', cls: 'st-late' } : null);
  if (!m) return null;
  return <span className={`badge status ${m.cls}`}>{m.label}</span>;
}
