import path from 'path';
import { JsonStore, Store } from './store';
import { KvStore } from './kvStore';
import { seedProducts } from './seedData';
import { Order, Product, TradeIn } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');

/** На Vercel використовуємо KV (файли ефемерні), локально — JSON-файли. */
const useKv = Boolean(process.env.KV_REST_API_URL);

function makeStore<T extends { id: string }>(name: string): Store<T> {
  return useKv
    ? new KvStore<T>(name)
    : new JsonStore<T>(path.join(DATA_DIR, `${name}.json`));
}

export const products = makeStore<Product>('products');
export const orders = makeStore<Order>('orders');
export const tradeIns = makeStore<TradeIn>('tradeins');

/** Генерація короткого унікального id. */
export function genId(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}${ts}${rnd}`;
}

/** Заповнює каталог початковими товарами, якщо він порожній. */
export async function seedIfEmpty(): Promise<{ seeded: number }> {
  const existing = await products.all();
  if (existing.length > 0) return { seeded: 0 };
  for (const p of seedProducts) {
    await products.add(p);
  }
  return { seeded: seedProducts.length };
}
