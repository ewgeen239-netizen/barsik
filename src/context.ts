import { Scenes } from 'telegraf';

/** Стан, який передається у сцену бронювання/купівлі. */
export interface BookingState {
  productId: string;
  type: 'booking' | 'purchase';
}

/** Стан для сцени "Поставити питання" (productId необов'язковий). */
export interface AskState {
  productId?: string;
}

/**
 * Єдиний тип контексту бота. Scenes.WizardContext вже містить
 * ctx.scene, ctx.wizard та ctx.session.
 */
export type BotContext = Scenes.WizardContext;
