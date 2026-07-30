import { Category, Product } from './types';

export type CategoryMeta = {
  key: Category;
  title: string;
  emoji: string;
};

export const CATEGORIES: CategoryMeta[] = [
  { key: 'iphone', title: 'iPhone', emoji: '📱' },
  { key: 'samsung', title: 'Samsung / Android', emoji: '🤖' },
  { key: 'laptop', title: 'Ноутбуки', emoji: '💻' },
  { key: 'tablet', title: 'Планшети', emoji: '📲' },
  { key: 'watch', title: 'Apple Watch', emoji: '⌚️' },
  { key: 'airpods', title: 'AirPods', emoji: '🎧' },
  { key: 'accessory', title: 'Аксесуари', emoji: '🔌' },
];

export function categoryMeta(key: Category): CategoryMeta {
  return CATEGORIES.find((c) => c.key === key) ?? { key, title: key, emoji: '📦' };
}

export function productTitle(p: Product): string {
  return [p.brand, p.model, p.memory].filter(Boolean).join(' ');
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Пошук за вільним текстом ("iphone 13 128").
 * Кожен товар отримує бал за кількістю збігів токенів запиту.
 */
export function searchProducts(all: Product[], query: string): Product[] {
  const tokens = normalize(query).split(' ').filter((t) => t.length > 0);
  if (tokens.length === 0) return [];

  const scored = all
    .map((p) => {
      const haystack = normalize(productTitle(p) + ' ' + p.description);
      let score = 0;
      for (const token of tokens) {
        if (haystack.includes(token)) score += 1;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Доступні товари вище, дешевші — раніше.
    const av = a.p.status === 'available' ? 0 : 1;
    const bv = b.p.status === 'available' ? 0 : 1;
    if (av !== bv) return av - bv;
    return a.p.price - b.p.price;
  });

  return scored.map((x) => x.p);
}

/** Схожі товари: та сама категорія, спершу той самий бренд, у наявності. */
export function similarProducts(all: Product[], target: Product, limit = 5): Product[] {
  return all
    .filter((p) => p.id !== target.id && p.category === target.category)
    .sort((a, b) => {
      const brandScore = (p: Product) => (p.brand === target.brand ? 0 : 1);
      const availScore = (p: Product) => (p.status === 'available' ? 0 : 1);
      if (availScore(a) !== availScore(b)) return availScore(a) - availScore(b);
      if (brandScore(a) !== brandScore(b)) return brandScore(a) - brandScore(b);
      return Math.abs(a.price - target.price) - Math.abs(b.price - target.price);
    })
    .slice(0, limit);
}
