import { promises as fs } from 'fs';
import path from 'path';

/**
 * Простий асинхронний JSON-сховок з кешем у пам'яті та атомарним записом.
 * Придатний для невеликих обсягів даних одного бота (polling).
 */
export class JsonStore<T extends { id: string }> {
  private items: T[] | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly file: string) {}

  private async load(): Promise<T[]> {
    if (this.items) return this.items;
    try {
      const raw = await fs.readFile(this.file, 'utf-8');
      this.items = JSON.parse(raw) as T[];
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        this.items = [];
        await this.persist();
      } else {
        throw err;
      }
    }
    return this.items;
  }

  private async persist(): Promise<void> {
    // Серіалізуємо записи, щоб уникнути гонок під час паралельних оновлень.
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(this.items ?? [], null, 2), 'utf-8');
      await fs.rename(tmp, this.file);
    });
    return this.writeQueue;
  }

  async all(): Promise<T[]> {
    const items = await this.load();
    return [...items];
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    const items = await this.load();
    return items.filter(predicate);
  }

  async getById(id: string): Promise<T | undefined> {
    const items = await this.load();
    return items.find((i) => i.id === id);
  }

  async add(item: T): Promise<T> {
    const items = await this.load();
    items.push(item);
    await this.persist();
    return item;
  }

  async update(id: string, patch: Partial<T>): Promise<T | undefined> {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    items[idx] = { ...items[idx], ...patch, id };
    await this.persist();
    return items[idx];
  }

  async remove(id: string): Promise<boolean> {
    const items = await this.load();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    await this.persist();
    return true;
  }
}
