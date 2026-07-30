import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';
import { CATEGORIES } from '../catalog';
import { Product } from '../types';
import { config } from '../config';
import { productListLabel } from './format';

export const mainMenu = () =>
  Markup.inlineKeyboard([
    [Markup.button.callback('🗂 Каталог', 'menu:catalog')],
    [
      Markup.button.callback('🔎 Пошук техніки', 'menu:search'),
      Markup.button.callback('🆕 Нові надходження', 'menu:new'),
    ],
    [Markup.button.callback('🔥 Акції', 'menu:promo')],
    [Markup.button.callback('💰 Продати / обміняти техніку', 'menu:sell')],
    [Markup.button.callback('🛡 Гарантія та перевірка', 'menu:warranty')],
    [Markup.button.callback('💬 Зв\'язатися з менеджером', 'menu:contact')],
  ]);

export const catalogMenu = () => {
  const rows = CATEGORIES.map((c) => [
    Markup.button.callback(`${c.emoji} ${c.title}`, `cat:${c.key}`),
  ]);
  rows.push([Markup.button.callback('⬅️ Головне меню', 'menu:main')]);
  return Markup.inlineKeyboard(rows);
};

/** Список товарів як кнопки. */
export const productListMenu = (
  items: Product[],
  backAction: string,
  backLabel = '⬅️ Назад'
) => {
  const rows = items.map((p) => [
    Markup.button.callback(productListLabel(p), `prod:${p.id}`),
  ]);
  rows.push([Markup.button.callback(backLabel, backAction)]);
  return Markup.inlineKeyboard(rows);
};

/** Кнопки під карткою товару для клієнта. */
export const productCardMenu = (p: Product) => {
  const rows: InlineKeyboardButton[][] = [];
  if (p.status === 'available') {
    rows.push([
      Markup.button.callback('📌 Забронювати', `book:${p.id}`),
      Markup.button.callback('🛒 Купити', `buy:${p.id}`),
    ]);
  }
  rows.push([Markup.button.callback('❓ Поставити питання', `ask:${p.id}`)]);
  rows.push([Markup.button.callback('🔁 Схожі товари', `similar:${p.id}`)]);
  rows.push([Markup.button.callback(`⬅️ До категорії`, `cat:${p.category}`)]);
  return Markup.inlineKeyboard(rows);
};

export const backToMain = () =>
  Markup.inlineKeyboard([[Markup.button.callback('⬅️ Головне меню', 'menu:main')]]);

export const contactMenu = () => {
  const rows: InlineKeyboardButton[][] = [];
  if (config.managerUsername) {
    rows.push([Markup.button.url('✍️ Написати менеджеру', `https://t.me/${config.managerUsername}`)]);
  }
  rows.push([Markup.button.callback('❓ Задати питання у боті', 'ask:general')]);
  rows.push([Markup.button.callback('⬅️ Головне меню', 'menu:main')]);
  return Markup.inlineKeyboard(rows);
};

/* ----------------------------- Reply-клавіатури для сцен ----------------------------- */

export const cancelKeyboard = () =>
  Markup.keyboard([['❌ Скасувати']]).resize().oneTime();

export const phoneKeyboard = () =>
  Markup.keyboard([
    [Markup.button.contactRequest('📱 Поділитися номером')],
    ['❌ Скасувати'],
  ])
    .resize()
    .oneTime();

export const deliveryKeyboard = () =>
  Markup.keyboard([['🚚 Доставка', '🏪 Самовивіз'], ['❌ Скасувати']])
    .resize()
    .oneTime();

export const conditionKeyboard = () =>
  Markup.keyboard([
    ['Ідеальний'],
    ['Хороший'],
    ['Є сліди використання'],
    ['❌ Скасувати'],
  ])
    .resize()
    .oneTime();

export const yesNoKeyboard = () =>
  Markup.keyboard([['✅ Так', '❌ Ні'], ['❌ Скасувати']]).resize().oneTime();

export const skipKeyboard = () =>
  Markup.keyboard([['⏭ Пропустити'], ['❌ Скасувати']]).resize().oneTime();

export const removeKeyboard = () => Markup.removeKeyboard();
