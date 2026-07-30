import { Condition, Product, ProductStatus } from '../types';
import { productTitle } from '../catalog';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatPrice(value: number): string {
  return value.toLocaleString('uk-UA').replace(/ /g, ' ');
}

const CONDITION_LABELS: Record<Condition, string> = {
  excellent: 'Ідеальний',
  good: 'Хороший',
  used: 'Є сліди використання',
};

const STATUS_LABELS: Record<ProductStatus, string> = {
  available: '🟢 В наявності',
  reserved: '🟡 Заброньовано',
  sold: '🔴 Продано',
};

const STATUS_DOT: Record<ProductStatus, string> = {
  available: '🟢',
  reserved: '🟡',
  sold: '🔴',
};

export function conditionLabel(c: Condition): string {
  return CONDITION_LABELS[c];
}

export function statusLabel(s: ProductStatus): string {
  return STATUS_LABELS[s];
}

export function statusDot(s: ProductStatus): string {
  return STATUS_DOT[s];
}

/** Підпис (caption) картки товару для клієнта. */
export function productCaption(p: Product): string {
  const priceLine =
    p.oldPrice && p.oldPrice > p.price
      ? `💵 <b>${formatPrice(p.price)} грн</b>  <s>${formatPrice(p.oldPrice)} грн</s>`
      : `💵 <b>${formatPrice(p.price)} грн</b>`;

  const lines = [
    `<b>${escapeHtml(productTitle(p))}</b>`,
    p.memory ? `💾 Пам'ять: ${escapeHtml(p.memory)}` : null,
    `✨ Стан: ${conditionLabel(p.condition)}`,
    p.description ? `📝 ${escapeHtml(p.description)}` : null,
    `📦 Комплект: ${escapeHtml(p.kit)}`,
    `🛡 Гарантія: ${escapeHtml(p.warranty)}`,
    `📍 Статус: ${statusLabel(p.status)}`,
    '',
    priceLine,
  ].filter((l): l is string => l !== null);

  return lines.join('\n');
}

/** Короткий рядок товару для списків/кнопок. */
export function productListLabel(p: Product): string {
  return `${statusDot(p.status)} ${productTitle(p)} — ${formatPrice(p.price)} грн`;
}
