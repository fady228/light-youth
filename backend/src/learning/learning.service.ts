import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BOOK_ORDER, formatReference, normalizePassage, parsePassage } from '../bible/bible.util';
import { PassageDto } from '../bible/passage.dto';
import { CreateLearningDto, UpdateLearningDto } from './dto/learning.dto';
import { ITEM_TYPES, ItemType, LearningItem } from './learning-item.entity';
import { Passage } from './passage.entity';
import { SavedItem } from './saved-item.entity';
import { excerptFrom, normalizeTag, searchTerms } from './search.util';
import { Tag } from './tag.entity';
import { removeUpload, uploadExists } from './uploads';

export interface LearningQuery {
  q?: string;
  type?: string;
  passage?: string; // book name or alias, e.g. "John" / "jn"
  tag?: string; // tag slug
  featured?: boolean;
}

const MATCH = 'MATCH(i.title, i.summary, i.content) AGAINST (:bq IN BOOLEAN MODE)';
const TAG_LIKE =
  'EXISTS (SELECT 1 FROM learning_tags lt2 INNER JOIN tags t2 ON t2.id = lt2.tagId WHERE lt2.itemId = i.id AND t2.name LIKE :like)';
const PASSAGE_LIKE =
  'EXISTS (SELECT 1 FROM learning_passages lp2 WHERE lp2.itemId = i.id AND lp2.reference LIKE :like)';

@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(LearningItem) private items: Repository<LearningItem>,
    @InjectRepository(SavedItem) private saved: Repository<SavedItem>,
    @InjectRepository(Tag) private tags: Repository<Tag>,
    @InjectRepository(Passage) private passages: Repository<Passage>,
  ) {}

  // ---------- reading (youth side) ----------

  async list(userId: string, query: LearningQuery) {
    const rows = await this.find(query, false);
    const savedIds = await this.savedIds(userId, rows.map((i) => i.id));
    return rows.map((i) => this.card(i, savedIds.has(i.id)));
  }

  async savedList(userId: string) {
    const rows = await this.saved.find({
      where: { userId },
      relations: { item: { tags: true, passages: true } },
      order: { createdAt: 'DESC' },
    });
    return rows.filter((r) => r.item.published).map((r) => this.card(r.item, true));
  }

  async get(id: string, userId: string) {
    const item = await this.items.findOne({
      where: { id, published: true },
      relations: { tags: true, passages: true },
    });
    if (!item) throw new NotFoundException('Not found');
    const saved = await this.saved.exist({ where: { userId, itemId: id } });
    return {
      ...this.card(item, saved),
      content: item.content,
      videoUrl: item.videoUrl,
      fileUrl: item.fileName ? `/files/${item.fileName}` : null,
      fileOriginal: item.fileOriginal,
    };
  }

  async save(userId: string, itemId: string) {
    if (!(await this.items.exist({ where: { id: itemId, published: true } }))) {
      throw new NotFoundException('Not found');
    }
    await this.saved.save({ userId, itemId });
    return { saved: true };
  }

  async unsave(userId: string, itemId: string) {
    await this.saved.delete({ userId, itemId });
    return { saved: false };
  }

  // ---------- facets (the filter options, with counts) ----------

  async facets(admin = false) {
    const [types, passages, tags] = await Promise.all([this.typeCounts(admin), this.passageCounts(admin), this.tagCounts(admin)]);
    return { types, passages, tags };
  }

  private async typeCounts(admin: boolean) {
    const qb = this.items.createQueryBuilder('i').select('i.type', 'type').addSelect('COUNT(*)', 'count').groupBy('i.type');
    if (!admin) qb.where('i.published = :pub', { pub: true });
    const rows = await qb.getRawMany<{ type: ItemType; count: string }>();
    const by = new Map(rows.map((r) => [r.type, Number(r.count)]));
    return ITEM_TYPES.map((type) => ({ type, count: by.get(type) ?? 0 }));
  }

  /** Books in Bible order with the number of items that reference them. */
  private async passageCounts(admin: boolean) {
    const rows = await this.passages
      .createQueryBuilder('p')
      .innerJoin('p.item', 'i', admin ? '1 = 1' : 'i.published = :pub', { pub: true })
      .select('p.book', 'book')
      .addSelect('COUNT(DISTINCT i.id)', 'count')
      .groupBy('p.book')
      .getRawMany<{ book: string; count: string }>();
    return rows
      .map((r) => ({ book: r.book, count: Number(r.count) }))
      .sort((a, b) => (BOOK_ORDER.get(a.book) ?? 999) - (BOOK_ORDER.get(b.book) ?? 999));
  }

  private async tagCounts(admin: boolean) {
    const rows = await this.tags
      .createQueryBuilder('t')
      .innerJoin('t.items', 'i', admin ? '1 = 1' : 'i.published = :pub', { pub: true })
      .select('t.slug', 'slug')
      .addSelect('t.name', 'name')
      .addSelect('COUNT(i.id)', 'count')
      .groupBy('t.id')
      .addGroupBy('t.slug')
      .addGroupBy('t.name')
      .orderBy('count', 'DESC')
      .addOrderBy('t.name', 'ASC')
      .getRawMany<{ slug: string; name: string; count: string }>();
    return rows.map((r) => ({ slug: r.slug, name: r.name, count: Number(r.count) }));
  }

  // ---------- search & filter ----------

  /**
   * Filters (type, passage book, tag, featured) combine with AND, and with full-text search:
   * MariaDB/MySQL FULLTEXT in boolean mode over title + summary + content, with prefix matching.
   * Every meaningful word must appear; a tag name or passage reference containing the whole query also matches.
   * Ranked by relevance, then featured, then newest.
   */
  private async find(query: LearningQuery, admin: boolean): Promise<LearningItem[]> {
    const qb = this.items.createQueryBuilder('i').select('i.id', 'id');

    if (!admin) qb.andWhere('i.published = :pub', { pub: true });
    if (query.featured) qb.andWhere('i.featured = :feat', { feat: true });

    if (query.type) {
      if (!ITEM_TYPES.includes(query.type as ItemType)) throw new BadRequestException('Unknown content type');
      qb.andWhere('i.type = :type', { type: query.type });
    }
    if (query.passage) {
      const book = parsePassage(query.passage)?.book;
      if (!book) throw new BadRequestException('Unknown Bible book');
      qb.andWhere('EXISTS (SELECT 1 FROM learning_passages lp WHERE lp.itemId = i.id AND lp.book = :book)', { book });
    }
    if (query.tag) {
      qb.andWhere(
        'EXISTS (SELECT 1 FROM learning_tags lt INNER JOIN tags t ON t.id = lt.tagId WHERE lt.itemId = i.id AND t.slug = :tag)',
        { tag: query.tag.toLowerCase() },
      );
    }

    let byScore = false;
    const q = (query.q ?? '').trim().slice(0, 100);
    const { tokens, significant } = searchTerms(q);
    if (tokens.length) {
      const like = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      if (significant.length) {
        const bq = significant.map((t) => `+${t}*`).join(' ');
        qb.addSelect(MATCH, 'score').andWhere(`(${MATCH} OR ${TAG_LIKE} OR ${PASSAGE_LIKE})`, { bq, like });
        byScore = true;
      } else {
        // Only short/common words: FULLTEXT can't help, fall back to LIKE.
        qb.andWhere(`(i.title LIKE :like OR i.summary LIKE :like OR ${TAG_LIKE} OR ${PASSAGE_LIKE})`, { like });
      }
    }

    if (byScore) qb.orderBy('score', 'DESC').addOrderBy('i.featured', 'DESC');
    else qb.orderBy('i.featured', 'DESC');
    qb.addOrderBy('i.createdAt', 'DESC').limit(100);

    const ids = (await qb.getRawMany<{ id: string }>()).map((r) => r.id);
    if (!ids.length) return [];
    const rows = await this.items.find({ where: { id: In(ids) }, relations: { tags: true, passages: true } });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((i): i is LearningItem => !!i);
  }

  // ---------- admin ----------

  /** Everything including drafts, with the same search/filters. */
  async adminList(query: LearningQuery) {
    return (await this.find(query, true)).map((i) => this.adminShape(i));
  }

  async adminGet(id: string) {
    const item = await this.items.findOne({ where: { id }, relations: { tags: true, passages: true } });
    if (!item) throw new NotFoundException('Not found');
    return this.adminShape(item);
  }

  async create(dto: CreateLearningDto) {
    const { tags, passages, ...rest } = dto;
    const item = this.items.create(rest as Partial<LearningItem>);
    item.published = dto.published ?? true;
    this.applyTypeRules(item);
    item.tags = await this.resolveTags(tags ?? []);
    item.passages = this.buildPassages(passages ?? []);
    this.requireTagToPublish(item);
    return this.adminShape(await this.items.save(item));
  }

  async update(id: string, dto: UpdateLearningDto) {
    const item = await this.items.findOne({ where: { id }, relations: { tags: true, passages: true } });
    if (!item) throw new NotFoundException('Not found');
    const oldFile = item.fileName;
    const { tags, passages, ...rest } = dto;
    Object.assign(item, rest);
    this.applyTypeRules(item);
    if (tags !== undefined) item.tags = await this.resolveTags(tags);
    if (passages !== undefined) item.passages = this.buildPassages(passages);
    this.requireTagToPublish(item);
    const saved = await this.items.save(item);
    if (oldFile && oldFile !== saved.fileName) removeUpload(oldFile);
    await this.pruneTags();
    return this.adminShape(saved);
  }

  async remove(id: string) {
    const item = await this.items.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Not found');
    await this.items.delete(id);
    removeUpload(item.fileName);
    await this.pruneTags();
    return { deleted: true };
  }

  // ---------- helpers ----------

  /** Each type needs its own field; fields that don't belong to the type are cleared. */
  private applyTypeRules(item: LearningItem) {
    item.content = item.content?.trim() ? item.content : null;
    item.videoUrl = item.videoUrl || null;
    item.fileName = item.fileName || null;
    item.fileOriginal = item.fileOriginal || null;

    if (item.type === 'article') {
      if (!item.content) throw new BadRequestException('Articles need text content');
      item.summary = excerptFrom(item.content); // articles have no hand-written summary
      item.videoUrl = null;
      item.fileName = item.fileOriginal = null;
    } else if (item.type === 'video') {
      this.requireSummary(item);
      if (!item.videoUrl) throw new BadRequestException('Videos need a video link');
      item.fileName = item.fileOriginal = null;
    } else {
      this.requireSummary(item);
      if (!item.fileName) throw new BadRequestException('Sermons need a PDF file');
      if (!uploadExists(item.fileName)) throw new BadRequestException('The uploaded PDF was not found — upload it again');
      item.videoUrl = null;
    }
  }

  private requireSummary(item: LearningItem) {
    item.summary = (item.summary ?? '').trim();
    if (!item.summary) throw new BadRequestException('Add a short summary so people can find this in search.');
  }

  /** Published content must have at least one tag; drafts may be untagged. */
  private requireTagToPublish(item: LearningItem) {
    if (item.published && (item.tags ?? []).length === 0) {
      throw new BadRequestException('Add at least one tag before publishing (or save it as a draft).');
    }
  }

  private buildPassages(dtos: PassageDto[]): Passage[] {
    const seen = new Set<string>();
    const out: Passage[] = [];
    for (const dto of dtos) {
      const p = normalizePassage(dto);
      const reference = formatReference(p);
      if (seen.has(reference.toLowerCase())) continue;
      seen.add(reference.toLowerCase());
      out.push(this.passages.create({ ...p, reference, position: out.length }));
    }
    return out;
  }

  private async resolveTags(names: string[]): Promise<Tag[]> {
    const wanted = new Map<string, string>();
    for (const n of names) {
      const { name, slug } = normalizeTag(n);
      if (slug && !wanted.has(slug)) wanted.set(slug, name);
    }
    if (!wanted.size) return [];
    const existing = await this.tags.find({ where: { slug: In([...wanted.keys()]) } });
    const bySlug = new Map(existing.map((t) => [t.slug, t]));
    const result: Tag[] = [];
    for (const [slug, name] of wanted) {
      result.push(bySlug.get(slug) ?? (await this.tags.save(this.tags.create({ slug, name }))));
    }
    return result;
  }

  private async pruneTags() {
    await this.tags.createQueryBuilder().delete().where('id NOT IN (SELECT tagId FROM learning_tags)').execute();
  }

  private tagRefs(i: LearningItem) {
    return [...(i.tags ?? [])].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ slug: t.slug, name: t.name }));
  }

  private passageRefs(i: LearningItem) {
    return [...(i.passages ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ book: p.book, reference: p.reference, chapter: p.chapter, verseStart: p.verseStart, verseEnd: p.verseEnd }));
  }

  private card(i: LearningItem, saved: boolean) {
    return {
      id: i.id,
      type: i.type,
      title: i.title,
      summary: i.summary,
      emoji: i.emoji,
      featured: i.featured,
      createdAt: i.createdAt,
      tags: this.tagRefs(i),
      passages: this.passageRefs(i),
      saved,
    };
  }

  private adminShape(i: LearningItem) {
    return {
      id: i.id,
      type: i.type,
      title: i.title,
      summary: i.summary,
      content: i.content,
      videoUrl: i.videoUrl,
      fileName: i.fileName,
      fileOriginal: i.fileOriginal,
      fileUrl: i.fileName ? `/files/${i.fileName}` : null,
      emoji: i.emoji,
      featured: i.featured,
      published: i.published,
      createdAt: i.createdAt,
      tags: this.tagRefs(i),
      passages: this.passageRefs(i),
    };
  }

  private async savedIds(userId: string, ids: string[]) {
    if (!ids.length) return new Set<string>();
    const rows = await this.saved.find({ where: { userId, itemId: In(ids) } });
    return new Set(rows.map((r) => r.itemId));
  }
}
