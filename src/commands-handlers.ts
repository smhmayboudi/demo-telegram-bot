import { CHAIN, isTelegramUrl, toUserFriendlyAddress, UserRejectsError } from '@tonconnect/sdk';
import { getWallets, getWalletInfo } from './ton-connect/wallets';
import QRCode from 'qrcode';
import { getConnector } from './ton-connect/connector';
import { addTGReturnStrategy, buildUniversalKeyboard, pTimeout, pTimeoutException } from './utils';
import { CommandContext, Context, InputFile } from 'grammy';
import PinataSDK from '@pinata/sdk';
import fs from 'fs';
// import { createHelia } from 'helia';
// import { unixfs } from '@helia/unixfs';

let newConnectRequestListenersMap = new Map<number, () => void>();

export async function handleConnectCommand(ctx: CommandContext<Context>): Promise<void> {
    const chatId = ctx.chat.id;
    let messageWasDeleted = false;

    newConnectRequestListenersMap.get(chatId)?.();

    const connector = getConnector(chatId, () => {
        unsubscribe();
        newConnectRequestListenersMap.delete(chatId);
        deleteMessage();
    });

    await connector.restoreConnection();
    if (connector.connected) {
        const connectedName =
            (await getWalletInfo(connector.wallet!.device.appName))?.name ||
            connector.wallet!.device.appName;
        await ctx.reply(
            `You have already connect ${connectedName} wallet\nYour address: ${toUserFriendlyAddress(
                connector.wallet!.account.address,
                connector.wallet!.account.chain === CHAIN.TESTNET
            )}\n\n Disconnect wallet firstly to connect a new one`
        );

        return;
    }

    const unsubscribe = connector.onStatusChange(async wallet => {
        if (wallet) {
            await deleteMessage();

            const walletName =
                (await getWalletInfo(wallet.device.appName))?.name || wallet.device.appName;
            await ctx.reply(`${walletName} wallet connected successfully`);
            unsubscribe();
            newConnectRequestListenersMap.delete(chatId);
        }
    });

    const wallets = await getWallets();

    const link = connector.connect(wallets);
    const image = await QRCode.toBuffer(link);
    const inputFile = new InputFile(image);

    const keyboard = await buildUniversalKeyboard(link, wallets);

    const botMessage = await ctx.replyWithPhoto(inputFile, {
        reply_markup: {
            inline_keyboard: [keyboard]
        }
    });

    const deleteMessage = async (): Promise<void> => {
        if (!messageWasDeleted) {
            messageWasDeleted = true;
            await ctx.api.deleteMessage(chatId, botMessage.message_id);
        }
    };

    newConnectRequestListenersMap.set(chatId, async () => {
        unsubscribe();

        await deleteMessage();

        newConnectRequestListenersMap.delete(chatId);
    });
}

export async function handleSendTXCommand(ctx: CommandContext<Context>): Promise<void> {
    const chatId = ctx.chat.id;

    const connector = getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await ctx.reply('Connect wallet to send transaction');
        return;
    }

    pTimeout(
        connector.sendTransaction({
            validUntil: Math.round(
                (Date.now() + Number(process.env.DELETE_SEND_TX_MESSAGE_TIMEOUT_MS)) / 1000
            ),
            messages: [
                {
                    amount: '1000000',
                    address: '0:0000000000000000000000000000000000000000000000000000000000000000'
                }
            ]
        }),
        Number(process.env.DELETE_SEND_TX_MESSAGE_TIMEOUT_MS)
    )
        .then(() => {
            ctx.reply(`Transaction sent successfully`);
        })
        .catch(e => {
            if (e === pTimeoutException) {
                ctx.reply(`Transaction was not confirmed`);
                return;
            }

            if (e instanceof UserRejectsError) {
                ctx.reply(`You rejected the transaction`);
                return;
            }

            ctx.reply(`Unknown error happened`);
        })
        .finally(() => connector.pauseConnection());

    let deeplink = '';
    const walletInfo = await getWalletInfo(connector.wallet!.device.appName);
    if (walletInfo) {
        deeplink = walletInfo.universalLink;
    }

    if (isTelegramUrl(deeplink)) {
        const url = new URL(deeplink);
        url.searchParams.append('startattach', 'tonconnect');
        deeplink = addTGReturnStrategy(url.toString(), process.env.TELEGRAM_BOT_LINK!);
    }

    await ctx.reply(
        `Open ${walletInfo?.name || connector.wallet!.device.appName} and confirm transaction`,
        {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: `Open ${walletInfo?.name || connector.wallet!.device.appName}`,
                            url: deeplink
                        }
                    ]
                ]
            }
        }
    );
}

export async function handleDisconnectCommand(ctx: CommandContext<Context>): Promise<void> {
    const chatId = ctx.chat.id;

    const connector = getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await ctx.reply("You didn't connect a wallet");
        return;
    }

    await connector.disconnect();

    await ctx.reply('Wallet has been disconnected');
}

export async function handleShowMyWalletCommand(ctx: CommandContext<Context>): Promise<void> {
    const chatId = ctx.chat.id;

    const connector = getConnector(chatId);

    await connector.restoreConnection();
    if (!connector.connected) {
        await ctx.reply("You didn't connect a wallet");
        return;
    }

    const walletName =
        (await getWalletInfo(connector.wallet!.device.appName))?.name ||
        connector.wallet!.device.appName;

    await ctx.reply(
        `Connected wallet: ${walletName}\nYour address: ${toUserFriendlyAddress(
            connector.wallet!.account.address,
            connector.wallet!.account.chain === CHAIN.TESTNET
        )}`
    );
}

export async function handleUploadCommand(ctx: CommandContext<Context>): Promise<void> {
    const readableStreamForFile = fs.createReadStream('./hi.jpeg');
    const pinataSDK = new PinataSDK({ pinataJWTKey: process.env.PINATA_JWT });
    const { IpfsHash } = await pinataSDK.pinFileToIPFS(readableStreamForFile, {
        pinataMetadata: {
            name: 'hi.jpeg'
        },
        pinataOptions: {
            cidVersion: 0
        }
    });
    await ctx.reply(
        `https://ipfs.io/ipfs/${IpfsHash} OR curl ipfs://${IpfsHash} --ipfs-gateway ipfs.io
        \nhttps://gateway.pinata.cloud/ipfs/${IpfsHash} OR curl ipfs://${IpfsHash} --ipfs-gateway gateway.pinata.cloud`
    );
}
