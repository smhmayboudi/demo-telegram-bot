import TonConnect from '@tonconnect/sdk';
import { TonConnectStorage } from './storage';

type StoredConnectorData = {
    connector: TonConnect;
    timeout: ReturnType<typeof setTimeout>;
    onConnectorExpired: ((connector: TonConnect) => void)[];
};

const connectors = new Map<number, StoredConnectorData>();

export function getConnector(
    chatId: number,
    onConnectorExpired?: (connector: TonConnect) => void
): TonConnect {
    console.log('getConnector');
    let storedItem: StoredConnectorData;
    if (connectors.has(chatId)) {
        console.log('getConnector connectors.has', chatId);
        storedItem = connectors.get(chatId)!;
        console.log('getConnector connectors.has storedItem', storedItem);
        clearTimeout(storedItem.timeout);
    } else {
        console.log('getConnector !connectors.has', chatId);
        storedItem = {
            connector: new TonConnect({
                manifestUrl: process.env.MANIFEST_URL,
                storage: new TonConnectStorage(chatId)
            }),
            onConnectorExpired: []
        } as unknown as StoredConnectorData;
    }

    if (onConnectorExpired) {
        console.log('getConnector onConnectorExpired');
        storedItem.onConnectorExpired.push(onConnectorExpired);
        console.log('getConnector onConnectorExpired', storedItem);
    }

    storedItem.timeout = setTimeout(() => {
        console.log('getConnector storedItem.timeout');
        if (connectors.has(chatId)) {
            console.log('getConnector storedItem.timeout connectors.has', chatId);
            const storedItem = connectors.get(chatId)!;
            storedItem.connector.pauseConnection();
            storedItem.onConnectorExpired.forEach(callback => callback(storedItem.connector));
            connectors.delete(chatId);
        }
    }, Number(process.env.CONNECTOR_TTL_MS));

    connectors.set(chatId, storedItem);
    return storedItem.connector;
}
