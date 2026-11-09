export const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

/** Today if no devotion uses it, otherwise the next free day. */
export function nextFreeDate(taken: string[]) {
  let d = todayStr();
  while (taken.includes(d)) {
    const x = new Date(`${d}T00:00:00Z`);
    x.setUTCDate(x.getUTCDate() + 1);
    d = x.toISOString().slice(0, 10);
  }
  return d;
}
