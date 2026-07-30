import { Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import { BotContext } from '../context';
import { tradeIns, genId } from '../db';
import { config } from '../config';
import { texts } from '../ui/texts';
import {
  cancelKeyboard,
  conditionKeyboard,
  phoneKeyboard,
  removeKeyboard,
  skipKeyboard,
  yesNoKeyboard,
} from '../ui/keyboards';
import { TradeIn } from '../types';

export const SELL_SCENE = 'sell';

interface WizardData {
  model?: string;
  memory?: string;
  condition?: string;
  hasBox?: boolean;
  photoFileId?: string;
  phone?: string;
}

const state = (ctx: BotContext) => ctx.wizard.state as unknown as WizardData;

function looksLikePhone(text: string): boolean {
  const digits = text.replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 15;
}

export const sellScene = new Scenes.WizardScene<BotContext>(
  SELL_SCENE,
  // Крок 0 — вступ + модель
  async (ctx) => {
    await ctx.reply(texts.sellIntro, { parse_mode: 'HTML' });
    await ctx.reply('Яка модель пристрою? (наприклад: iPhone 12 Pro)', cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 1 — модель
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('Напишіть модель текстом.', cancelKeyboard());
      return;
    }
    state(ctx).model = ctx.message.text.trim();
    await ctx.reply("Скільки пам'яті? (наприклад: 128 ГБ)", cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 2 — пам'ять
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply("Вкажіть обсяг пам'яті текстом.", cancelKeyboard());
      return;
    }
    state(ctx).memory = ctx.message.text.trim();
    await ctx.reply('Оберіть стан пристрою:', conditionKeyboard());
    return ctx.wizard.next();
  },

  // Крок 3 — стан
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('Оберіть стан кнопкою нижче.', conditionKeyboard());
      return;
    }
    state(ctx).condition = ctx.message.text.trim();
    await ctx.reply('Чи є коробка та документи?', yesNoKeyboard());
    return ctx.wizard.next();
  },

  // Крок 4 — коробка/документи
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('Оберіть «✅ Так» або «❌ Ні».', yesNoKeyboard());
      return;
    }
    const text = ctx.message.text.trim().toLowerCase();
    state(ctx).hasBox = text.includes('так');
    await ctx.reply(
      'Надішліть фото пристрою або натисніть «⏭ Пропустити».',
      skipKeyboard()
    );
    return ctx.wizard.next();
  },

  // Крок 5 — фото
  async (ctx) => {
    if (ctx.has(message('photo'))) {
      const photos = ctx.message.photo;
      state(ctx).photoFileId = photos[photos.length - 1].file_id;
    } else if (ctx.has(message('text')) && ctx.message.text.trim() === '⏭ Пропустити') {
      // без фото
    } else {
      await ctx.reply('Надішліть фото або натисніть «⏭ Пропустити».', skipKeyboard());
      return;
    }
    await ctx.reply('Останнє — вкажіть контактний номер телефону:', phoneKeyboard());
    return ctx.wizard.next();
  },

  // Крок 6 — телефон + фіналізація
  async (ctx) => {
    let phone: string | undefined;
    if (ctx.has(message('contact'))) {
      phone = ctx.message.contact.phone_number;
    } else if (ctx.has(message('text')) && looksLikePhone(ctx.message.text.trim())) {
      phone = ctx.message.text.trim();
    }
    if (!phone) {
      await ctx.reply('Некоректний номер. Введіть номер або натисніть кнопку.', phoneKeyboard());
      return;
    }

    const st = state(ctx);
    const record: TradeIn = {
      id: genId('TRD-'),
      model: st.model!,
      memory: st.memory!,
      condition: st.condition!,
      hasBox: !!st.hasBox,
      photoFileId: st.photoFileId,
      phone,
      userId: ctx.from!.id,
      username: ctx.from?.username,
      createdAt: new Date().toISOString(),
      status: 'new',
    };
    await tradeIns.add(record);

    await ctx.reply(
      `✅ Анкету прийнято!\n\n№ ${record.id}\n` +
        `Менеджер оцінить ваш пристрій і зв'яжеться з вами. Дякуємо! 🙌`,
      removeKeyboard()
    );

    await notifyAdmin(ctx, record);
    return ctx.scene.leave();
  }
);

async function notifyAdmin(ctx: BotContext, r: TradeIn): Promise<void> {
  const contact = r.username ? `@${r.username}` : `id ${r.userId}`;
  const text =
    `💰 ПРОДАЖ/ОБМІН — нова анкета\n\n` +
    `№ ${r.id}\n` +
    `Модель: ${r.model}\n` +
    `Пам'ять: ${r.memory}\n` +
    `Стан: ${r.condition}\n` +
    `Коробка/док-ти: ${r.hasBox ? 'так' : 'ні'}\n` +
    `Телефон: ${r.phone}\n` +
    `Клієнт: ${contact}`;
  try {
    await ctx.telegram.sendMessage(config.adminId, text);
    if (r.photoFileId) {
      await ctx.telegram.sendPhoto(config.adminId, r.photoFileId, { caption: `Фото до заявки ${r.id}` });
    }
  } catch {
    /* адмін ще не активував бота */
  }
}
