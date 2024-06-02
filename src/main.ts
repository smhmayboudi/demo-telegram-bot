import dotenv from 'dotenv';
dotenv.config();

import { bot } from './bot';
import { walletMenuCallbacks } from './connect-wallet-menu';
import {
    handleConnectCommand,
    handleDisconnectCommand,
    handleSendTXCommand,
    handleShowMyWalletCommand
} from './commands-handlers';
import { initRedisClient } from './ton-connect/storage';
import { CallbackQueryContext, Context } from 'grammy';

async function main(): Promise<void> {
    await initRedisClient();

    const callbacks = {
        ...walletMenuCallbacks
    };

    bot.on('callback_query:data', ctx => {
        if (!ctx.callbackQuery.data) {
            return;
        }

        let request: { method: string; data: string };

        try {
            request = JSON.parse(ctx.callbackQuery.data);
        } catch {
            return;
        }

        const method = request.method as keyof typeof callbacks;

        if (!callbacks[method]) {
            return;
        }

        callbacks[method](ctx as CallbackQueryContext<Context>, request.data);
    });

    bot.command('connect', handleConnectCommand);

    bot.command('send_tx', handleSendTXCommand);

    bot.command('disconnect', handleDisconnectCommand);

    bot.command('my_wallet', handleShowMyWalletCommand);

    bot.command('start', ctx => {
        ctx.reply(
            `
This is an example of a telegram bot for connecting to TON wallets and sending transactions with TonConnect.
            
Commands list: 
/connect - Connect to a wallet
/my_wallet - Show connected wallet
/send_tx - Send transaction
/disconnect - Disconnect from the wallet

GitHub: https://github.com/ton-connect/demo-telegram-bot
`
        );
    });

    bot.start();
}

main();
