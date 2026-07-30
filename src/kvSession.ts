import { kv } from '@vercel/kv';

/**
 * Сховок сесій Telegraf на базі Vercel KV.
 * Потрібен на serverless (Vercel), бо стан не переживає окремі виклики функції,
 * а майстри (бронювання/продаж/додавання товару) розбиті на кілька кроків.
 *
 * Значення сесії типізуємо як any — Telegraf підставляє власний тип сесії
 * через дженерик SessionStore<S>.
 */
export const kvSessionStore = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async get(name: string): Promise<any> {
    return (await kv.get(`sess:${name}`)) ?? undefined;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async set(name: string, value: any): Promise<void> {
    await kv.set(`sess:${name}`, value);
  },
  async delete(name: string): Promise<void> {
    await kv.del(`sess:${name}`);
  },
};
