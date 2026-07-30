import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Не задано змінну середовища ${name}. Скопіюйте .env.example у .env та заповніть.`);
  }
  return value.trim();
}

const adminIdRaw = required('ADMIN_ID');
const adminId = Number(adminIdRaw);
if (!Number.isFinite(adminId)) {
  throw new Error(`ADMIN_ID має бути числом, отримано: "${adminIdRaw}"`);
}

export const config = {
  botToken: required('BOT_TOKEN'),
  adminId,
  managerUsername: (process.env.MANAGER_USERNAME || '').replace(/^@/, '').trim(),
};

export function isAdmin(userId?: number): boolean {
  return userId === config.adminId;
}
