import { Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import { BotContext, BookingState } from '../context';
import { products, orders, genId } from '../db';
import { productTitle } from '../catalog';
import { config } from '../config';
import { texts } from '../ui/texts';
import {
  cancelKeyboard,
  deliveryKeyboard,
  phoneKeyboard,
  removeKeyboard,
} from '../ui/keyboards';
import { Order } from '../types';

export const BOOKING_SCENE = 'booking';

interface WizardData {
  productId: string;
  type: 'booking' | 'purchase';
  productTitle: string;
  customerName?: string;
  phone?: string;
  delivery?: 'delivery' | 'pickup';
}

const state = (ctx: BotContext) => ctx.wizard.state as unknown as WizardData;

function looksLikePhone(text: string): boolean {
  const digits = text.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export const bookingScene = new Scenes.WizardScene<BotContext>(
  BOOKING_SCENE,
  // Крок 0 — ініціалізація
  async (ctx) => {
    const initial = ctx.scene.state as BookingState;
    const product = initial?.productId ? await products.getById(initial.productId) : undefined;
    if (!product) {
      await ctx.reply('Товар не знайдено.');
      return ctx.scene.leave();
    }
    if (product.status !== 'available') {
      await ctx.reply(texts.notForSale);
      return ctx.scene.leave();
    }
    const st = state(ctx);
    st.productId = product.id;
    st.type = initial.type;
    st.productTitle = productTitle(product);

    const header =
      initial.type === 'purchase'
        ? `🛒 Купівля: <b>${st.productTitle}</b>`
        : `📌 Бронювання: <b>${st.productTitle}</b>`;
    await ctx.reply(`${header}\n\n${texts.bookingIntro}`, { parse_mode: 'HTML' });
    await ctx.reply('Як вас звати?', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 1 — ім'я
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('Напишіть, будь ласка, ваше ім\'я текстом.', cancelKeyboard());
      return;
    }
    const name = ctx.message.text.trim();
    if (name.length < 2) {
      await ctx.reply('Ім\'я закоротке. Спробуйте ще раз.', cancelKeyboard());
      return;
    }
    state(ctx).customerName = name;
    await ctx.reply(
      'Вкажіть контактний номер телефону або поділіться ним кнопкою нижче:',
      phoneKeyboard()
    );
    return ctx.wizard.next();
  },

  // Крок 2 — телефон
  async (ctx) => {
    let phone: string | undefined;
    if (ctx.has(message('contact'))) {
      phone = ctx.message.contact.phone_number;
    } else if (ctx.has(message('text'))) {
      const text = ctx.message.text.trim();
      if (looksLikePhone(text)) phone = text;
    }
    if (!phone) {
      await ctx.reply('Некоректний номер. Введіть номер телефону або натисніть кнопку.', phoneKeyboard());
      return;
    }
    state(ctx).phone = phone;
    await ctx.reply('Оберіть спосіб отримання:', deliveryKeyboard());
    return ctx.wizard.next();
  },

  // Крок 3 — спосіб отримання
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('Оберіть спосіб отримання кнопкою нижче.', deliveryKeyboard());
      return;
    }
    const text = ctx.message.text.trim().toLowerCase();
    let delivery: 'delivery' | 'pickup' | undefined;
    if (text.includes('достав')) delivery = 'delivery';
    else if (text.includes('самовив')) delivery = 'pickup';
    if (!delivery) {
      await ctx.reply('Оберіть «🚚 Доставка» або «🏪 Самовивіз».', deliveryKeyboard());
      return;
    }
    state(ctx).delivery = delivery;
    await ctx.reply(
      'Додайте коментар (адреса, зручний час, запитання) або натисніть «⏭ Пропустити».',
      { reply_markup: { keyboard: [['⏭ Пропустити'], ['❌ Скасувати']], resize_keyboard: true, one_time_keyboard: true } }
    );
    return ctx.wizard.next();
  },

  // Крок 4 — коментар + фіналізація
  async (ctx) => {
    let comment: string | undefined;
    if (ctx.has(message('text'))) {
      const text = ctx.message.text.trim();
      if (text !== '⏭ Пропустити' && text.length > 0) comment = text;
    }

    const st = state(ctx);
    const product = await products.getById(st.productId);
    if (!product || product.status !== 'available') {
      await ctx.reply(texts.notForSale, removeKeyboard());
      return ctx.scene.leave();
    }

    const order: Order = {
      id: genId('ORD-'),
      type: st.type,
      productId: st.productId,
      productTitle: st.productTitle,
      customerName: st.customerName!,
      phone: st.phone!,
      delivery: st.delivery!,
      comment,
      userId: ctx.from!.id,
      username: ctx.from?.username,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    await orders.add(order);
    // Бронювання переводить товар у статус "заброньовано".
    if (st.type === 'booking') {
      await products.update(product.id, { status: 'reserved' });
    }

    await ctx.reply(
      `✅ Заявку прийнято!\n\n` +
        `№ ${order.id}\n` +
        `Товар: ${order.productTitle}\n` +
        `Спосіб: ${order.delivery === 'delivery' ? 'доставка' : 'самовивіз'}\n\n` +
        `Менеджер зв'яжеться з вами найближчим часом. Дякуємо! 🙌`,
      removeKeyboard()
    );

    await notifyAdmin(ctx, order);
    return ctx.scene.leave();
  }
);

async function notifyAdmin(ctx: BotContext, order: Order): Promise<void> {
  const contact = order.username ? `@${order.username}` : `id ${order.userId}`;
  const typeLabel = order.type === 'purchase' ? '🛒 КУПІВЛЯ' : '📌 БРОНЮВАННЯ';
  const text =
    `${typeLabel} — нова заявка\n\n` +
    `№ ${order.id}\n` +
    `Товар: ${order.productTitle}\n` +
    `Ім'я: ${order.customerName}\n` +
    `Телефон: ${order.phone}\n` +
    `Спосіб: ${order.delivery === 'delivery' ? 'доставка' : 'самовивіз'}\n` +
    (order.comment ? `Коментар: ${order.comment}\n` : '') +
    `Клієнт: ${contact}`;
  try {
    await ctx.telegram.sendMessage(config.adminId, text);
  } catch {
    /* адмін ще не активував бота — не критично для клієнта */
  }
}
