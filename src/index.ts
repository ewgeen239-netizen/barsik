import { createBot } from './bot';
import { config } from './config';

async function main(): Promise<void> {
  const bot = createBot();

  // Меню команд у клієнті Telegram.
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Головне меню' },
    { command: 'menu', description: 'Головне меню' },
    { command: 'cancel', description: 'Скасувати поточну дію' },
    { command: 'help', description: 'Довідка' },
  ]);

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  // launch() резолвиться лише після зупинки бота — тому не await.
  bot.launch({ dropPendingUpdates: true }).catch((err) => {
    console.error('❌ Помилка роботи бота:', err);
    process.exit(1);
  });

  console.log('✅ Бота запущено (polling).');
  console.log(`👤 ADMIN_ID: ${config.adminId}`);
}

main().catch((err) => {
  console.error('❌ Не вдалося запустити бота:', err);
  process.exit(1);
});
