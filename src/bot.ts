import { Bot } from 'grammy';
import * as process from 'process';

const token = process.env.TELEGRAM_BOT_TOKEN!;

export const bot = new Bot(token);
