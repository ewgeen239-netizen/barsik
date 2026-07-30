import path from 'path';
import { JsonStore } from './store';
import { Order, Product, TradeIn } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');

export const products = new JsonStore<Product>(path.join(DATA_DIR, 'products.json'));
export const orders = new JsonStore<Order>(path.join(DATA_DIR, 'orders.json'));
export const tradeIns = new JsonStore<TradeIn>(path.join(DATA_DIR, 'tradeins.json'));

/** Генерація короткого унікального id. */
export function genId(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  const ts = Date.now().toString(36).slice(-4);
  return `${prefix}${ts}${rnd}`;
}
