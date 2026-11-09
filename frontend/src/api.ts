const BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'ly_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    // An expired token on a protected call logs the user out; a wrong password on /auth/* does not.
    if (res.status === 401 && token && !path.startsWith('/auth/')) {
      setToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }
    const msg = Array.isArray(body?.message) ? body.message.join('. ') : body?.message;
    throw new Error(msg || 'Something went wrong. Please try again.');
  }
  return body as T;
}

// ---------- types ----------
export interface Me {
  id: string;
  email: string;
  displayName: string;
  avatarEmoji: string;
  role: 'user' | 'admin';
  points: number;
  streak: number;
  rank: number;
  totalUsers: number;
  nextReward: { name: string; pointsRequired: number } | null;
}
/**
 * done = answered on its day · late = a missed day answered afterwards (0 points) · missed = not answered ·
 * open = today's, not answered yet · archive = from before you joined (never "missed")
 */
export type DevotionStatus = 'done' | 'late' | 'missed' | 'open' | 'archive';
export interface DevotionSummary {
  id: string;
  title: string;
  publishDate: string;
  passageRef: string;
  book: string | null;
  completed: boolean;
  late: boolean;
  status: DevotionStatus;
  reflectionQuote: string | null;
  reflectionAuthor: string | null;
}
export interface DevotionList {
  items: DevotionSummary[];
  counts: { all: number; open: number; done: number; missed: number };
  books: { book: string; count: number }[];
}
export interface DevotionFilter {
  status?: 'open' | 'done' | 'missed';
  book?: string;
  q?: string;
}
export interface Question {
  id: string;
  position: number;
  type: 'multiple_choice' | 'true_false' | 'open';
  prompt: string;
  options: string[] | null;
  points: number;
}
export interface AnswerResult {
  questionId: string;
  answer: string;
  isCorrect: boolean | null;
  pointsEarned: number;
  correctAnswer: string | null;
}
export interface SubmissionResult {
  pointsEarned: number;
  late: boolean;
  totalPossible: number;
  answers: AnswerResult[];
}
export interface DevotionDetail extends DevotionSummary {
  verseRef: string | null;
  body: string;
  questions: Question[];
  submission: SubmissionResult | null;
}
export type ItemType = 'article' | 'video' | 'sermon';
export interface TagRef {
  slug: string;
  name: string;
}
export interface TagCount extends TagRef {
  count: number;
}
/** A passage as picked in the dropdowns. */
export interface PassageValue {
  book: string;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
}
export interface BibleBook {
  name: string;
  chapters: number;
  testament: 'OT' | 'NT';
}
export interface PassageRef extends PassageValue {
  reference: string; // as displayed, e.g. "John 3:16-21"
}
export interface LearningFilter {
  q?: string;
  type?: ItemType;
  passage?: string;
  tag?: string;
  featured?: boolean;
}
export interface LearningItem {
  id: string;
  type: ItemType;
  title: string;
  summary: string;
  emoji: string;
  featured: boolean;
  saved: boolean;
  tags: TagRef[];
  passages: PassageRef[];
  createdAt: string;
}
export interface LearningDetail extends LearningItem {
  content: string | null;
  videoUrl: string | null;
  fileUrl: string | null; // "/files/<uuid>.pdf"
  fileOriginal: string | null;
}
/** Filter options with counts. */
export interface Facets {
  types: { type: ItemType; count: number }[];
  passages: { book: string; count: number }[];
  tags: TagCount[];
}
export interface LeaderboardRow {
  rank: number;
  id: string;
  displayName: string;
  avatarEmoji: string;
  points: number;
  isMe: boolean;
}
export interface PastAnswer {
  id: string;
  devotionId: string;
  title: string;
  publishDate: string;
  passageRef: string;
  book: string | null;
  pointsEarned: number;
  late: boolean;
  createdAt: string;
}
export interface PastAnswers {
  items: PastAnswer[];
  total: number;
  counts: { all: number; done: number; late: number };
  books: { book: string; count: number }[];
}
export interface PastAnswersFilter {
  book?: string;
  q?: string;
  status?: 'done' | 'late';
  limit?: number;
  offset?: number;
}

export interface AdminQuestion {
  id: string;
  position: number;
  type: Question['type'];
  prompt: string;
  options: string[] | null;
  correctAnswer: string | null;
  points: number;
}
export interface AdminDevotion {
  id: string;
  title: string;
  publishDate: string;
  passageRef: string;
  verseRef: string | null;
  book: string | null;
  chapter: number | null;
  verseStart: number | null;
  verseEnd: number | null;
  keyVerse: PassageValue | null;
  body: string;
  reflectionQuote: string | null;
  reflectionAuthor: string | null;
  questions: AdminQuestion[];
}
export interface NewQuestion {
  type: Question['type'];
  prompt: string;
  points: number;
  options?: string[];
  correctAnswer?: string;
}
export interface DevotionInput {
  title: string;
  publishDate: string;
  passage: PassageValue;
  keyVerse?: PassageValue | null;
  body: string;
  reflectionQuote?: string | null;
  reflectionAuthor?: string | null;
}
export interface AdminLearning {
  id: string;
  type: ItemType;
  title: string;
  summary: string; // generated from the text for articles
  content: string | null;
  videoUrl: string | null;
  fileName: string | null;
  fileUrl: string | null;
  fileOriginal: string | null;
  emoji: string;
  featured: boolean;
  published: boolean;
  tags: TagRef[];
  passages: PassageRef[];
  createdAt: string;
}
/** Tags are sent as plain names (the server creates/links them); passages as picked book/chapter/verses. */
export interface LearningInput {
  type: ItemType;
  title: string;
  summary: string | null;
  content: string | null;
  videoUrl: string | null;
  fileName: string | null;
  fileOriginal: string | null;
  emoji: string;
  featured: boolean;
  published: boolean;
  tags: string[];
  passages: PassageValue[];
}

// ---------- endpoints ----------
const qs = (p: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v !== undefined && v !== false && v !== '') s.set(k, String(v));
  const t = s.toString();
  return t ? `?${t}` : '';
};

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const api = {
  login: (email: string, password: string) =>
    post<{ accessToken: string }>('/auth/login', { email, password }),
  register: (displayName: string, email: string, password: string) =>
    post<{ accessToken: string }>('/auth/register', { displayName, email, password }),
  google: (accessToken: string) => post<{ accessToken: string }>('/auth/google', { accessToken }),

  me: () => request<Me>('/users/me'),
  myAnswers: (f: PastAnswersFilter = {}) => request<PastAnswers>(`/users/me/answers${qs({ ...f })}`),
  leaderboard: () => request<LeaderboardRow[]>('/leaderboard'),

  devotions: (f: DevotionFilter = {}) => request<DevotionList>(`/devotions${qs({ ...f })}`),
  todayDevotion: () => request<{ devotion: DevotionSummary | null }>('/devotions/today'),
  devotion: (id: string) => request<DevotionDetail>(`/devotions/${id}`),
  submit: (id: string, answers: { questionId: string; answer: string }[]) =>
    post<SubmissionResult>(`/devotions/${id}/submit`, { answers }),

  learning: (f: LearningFilter = {}) => request<LearningItem[]>(`/learning${qs({ ...f })}`),
  facets: () => request<Facets>('/learning/facets'),
  savedLearning: () => request<LearningItem[]>('/learning/saved'),
  learningItem: (id: string) => request<LearningDetail>(`/learning/${id}`),
  setSaved: (id: string, saved: boolean) =>
    request(`/learning/${id}/save`, { method: saved ? 'POST' : 'DELETE' }),

  // ----- admin -----
  adminDevotions: () => request<AdminDevotion[]>('/devotions/admin/all'),
  adminDevotion: (id: string) => request<AdminDevotion>(`/devotions/admin/${id}`),
  createDevotion: (d: DevotionInput & { questions: NewQuestion[] }) => post<AdminDevotion>('/devotions', d),
  updateDevotion: (id: string, d: Partial<DevotionInput>) =>
    request<AdminDevotion>(`/devotions/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deleteDevotion: (id: string) => request(`/devotions/${id}`, { method: 'DELETE' }),

  adminLearning: (f: LearningFilter = {}) => request<AdminLearning[]>(`/learning/admin/all${qs({ ...f })}`),
  adminFacets: () => request<Facets>('/learning/admin/facets'),
  adminLearningItem: (id: string) => request<AdminLearning>(`/learning/admin/${id}`),
  bibleBooks: () => request<BibleBook[]>('/bible/books'),
  createLearning: (b: LearningInput) => post<AdminLearning>('/learning', b),
  updateLearning: (id: string, b: Partial<LearningInput>) =>
    request<AdminLearning>(`/learning/${id}`, { method: 'PATCH', body: JSON.stringify(b) }),
  deleteLearning: (id: string) => request(`/learning/${id}`, { method: 'DELETE' }),

  /** Step 1 of adding a sermon: upload the PDF, then save the item with the returned fileName. */
  uploadPdf: async (file: File) => {
    const body = new FormData();
    body.append('file', file);
    const token = getToken();
    const res = await fetch(`${BASE}/learning/upload`, {
      method: 'POST',
      body, // the browser sets the multipart Content-Type (with boundary) itself
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || 'Upload failed. Please try again.');
    return data as { fileName: string; fileOriginal: string; size: number };
  },
};
