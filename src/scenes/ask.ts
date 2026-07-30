import { Scenes } from 'telegraf';
import { message } from 'telegraf/filters';
import { BotContext, AskState } from '../context';
import { products } from '../db';
import { productTitle } from '../catalog';
import { config } from '../config';
import { texts } from '../ui/texts';
import { cancelKeyboard, removeKeyboard } from '../ui/keyboards';

export const ASK_SCENE = 'ask';

interface WizardData {
  productId?: string;
  productTitle?: string;
}

const state = (ctx: BotContext) => ctx.wizard.state as unknown as WizardData;

export const askScene = new Scenes.WizardScene<BotContext>(
  ASK_SCENE,
  // Крок 0 — запросити питання
  async (ctx) => {
    const initial = (ctx.scene.state as AskState) || {};
    const st = state(ctx);
    if (initial.productId) {
      const product = await products.getById(initial.productId);
      if (product) {
        st.productId = product.id;
        st.productTitle = productTitle(product);
      }
    }
    await ctx.reply(st.productId ? texts.askPromptProduct : texts.askPromptGeneral, cancelKeyboard());
    return ctx.wizard.next();
  },

  // Крок 1 — прийняти питання і переслати адміну
  async (ctx) => {
    if (!ctx.has(message('text'))) {
      await ctx.reply('Напишіть, будь ласка, ваше запитання текстом.', cancelKeyboard());
      return;
    }
    const question = ctx.message.text.trim();
    const st = state(ctx);
    const contact = ctx.from?.username ? `@${ctx.from.username}` : `id ${ctx.from?.id}`;
    const header = st.productTitle ? `❓ Питання щодо: ${st.productTitle}` : '❓ Загальне питання';
    const text =
      `${header}\n\n` +
      `${question}\n\n` +
      `Клієнт: ${contact}` +
      (ctx.from?.id ? ` (tg://user?id=${ctx.from.id})` : '');

    try {
      await ctx.telegram.sendMessage(config.adminId, text);
    } catch {
      /* адмін ще не активував бота */
    }

    await ctx.reply(texts.askSent, removeKeyboard());
    return ctx.scene.leave();
  }
);
