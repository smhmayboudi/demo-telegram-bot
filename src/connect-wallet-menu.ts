import { getWalletInfo, getWallets } from './ton-connect/wallets';
import { getConnector } from './ton-connect/connector';
import QRCode from 'qrcode';
import * as fs from 'fs';
import { isTelegramUrl } from '@tonconnect/sdk';
import { addTGReturnStrategy, buildUniversalKeyboard } from './utils';
import { CallbackQueryContext, Context, InputFile } from 'grammy';

export const walletMenuCallbacks = {
    chose_wallet: onChooseWalletClick,
    select_wallet: onWalletClick,
    universal_qr: onOpenUniversalQRClick
};
async function onChooseWalletClick(ctx: CallbackQueryContext<Context>, _: string): Promise<void> {
    const wallets = await getWallets();

    await ctx.editMessageReplyMarkup({
        reply_markup: {
            inline_keyboard: [
                wallets.map(wallet => ({
                    text: wallet.name,
                    callback_data: JSON.stringify({
                        method: 'select_wallet',
                        data: wallet.appName
                    })
                })),
                [
                    {
                        text: '« Back',
                        callback_data: JSON.stringify({
                            method: 'universal_qr'
                        })
                    }
                ]
            ]
        }
    });
}

async function onOpenUniversalQRClick(
    ctx: CallbackQueryContext<Context>,
    _: string
): Promise<void> {
    const query = ctx.callbackQuery;

    const chatId = query.message!.chat.id;
    const wallets = await getWallets();

    const connector = getConnector(chatId);

    const link = connector.connect(wallets);

    await editQR(ctx, link);

    const keyboard = await buildUniversalKeyboard(link, wallets);

    await ctx.editMessageReplyMarkup({
        reply_markup: {
            inline_keyboard: [keyboard]
        }
    });
}

async function onWalletClick(ctx: CallbackQueryContext<Context>, data: string): Promise<void> {
    const query = ctx.callbackQuery;

    const chatId = query.message!.chat.id;
    const connector = getConnector(chatId);

    const selectedWallet = await getWalletInfo(data);
    if (!selectedWallet) {
        return;
    }

    let buttonLink = connector.connect({
        bridgeUrl: selectedWallet.bridgeUrl,
        universalLink: selectedWallet.universalLink
    });

    let qrLink = buttonLink;

    if (isTelegramUrl(selectedWallet.universalLink)) {
        buttonLink = addTGReturnStrategy(buttonLink, process.env.TELEGRAM_BOT_LINK!);
        qrLink = addTGReturnStrategy(qrLink, 'none');
    }

    await editQR(ctx, qrLink);

    await ctx.editMessageReplyMarkup({
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: '« Back',
                        callback_data: JSON.stringify({ method: 'chose_wallet' })
                    },
                    {
                        text: `Open ${selectedWallet.name}`,
                        url: buttonLink
                    }
                ]
            ]
        }
    });
}

async function editQR(ctx: CallbackQueryContext<Context>, link: string): Promise<void> {
    const fileName = 'QRCode-' + Math.round(Math.random() * 10000000000) + '.png';

    const image = await QRCode.toBuffer(link);
    const inputFile = new InputFile(image);

    await ctx.editMessageMedia({
        type: 'photo',
        media: inputFile
    });

    await new Promise(r => fs.rm(`./${fileName}`, r));
}
