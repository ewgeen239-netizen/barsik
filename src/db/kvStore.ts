import { kvClient } from './kvClient';
import { Store } from './store';

/**
 * Сховок на базі Vercel KV (Upstash Redis). Кожна колекція — один ключ
 * із JSON-масивом. Придатний для serverless-середовища (Vercel), де
 * файлова система ефемерна.
 */
export class KvStore<T extends { id: string }> implements Store<T> {
  constructor(private readonly key: string) {}

  private async read(): Promise<T[]> {
    return (await kvClient().get<T[]>(this.key)) ?? [];
  }

  private async write(items: T[]): Promise<void> {
    await kvClient().set(this.key, items);
  }

  async all(): Promise<T[]> {
    return this.read();
  }

  async find(predicate: (item: T) => boolean): Promise<T[]> {
    return (await this.read()).filter(predicate);
  }

  async getById(id: string): Promise<T | undefined> {
    return (await this.read()).find((i) => i.id === id);
  }

  async add(item: T): Promise<T> {
    const items = await this.read();
    items.push(item);
    await this.write(items);
    return item;
  }

  async update(id: string, patch: Partial<T>): Promise<T | undefined> {
    const items = await this.read();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return undefined;
    items[idx] = { ...items[idx], ...patch, id };
    await this.write(items);
    return items[idx];
  }

  async remove(id: string): Promise<boolean> {
    const items = await this.read();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    items.splice(idx, 1);
    await this.write(items);
    return true;
  }
}
