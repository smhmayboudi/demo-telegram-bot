import { IStorage } from '@tonconnect/sdk';
import { createClient } from 'redis';

const client = createClient({ url: process.env.REDIS_URL });

client.on('error', err => console.log('Redis Client Error', err));

export async function initRedisClient(): Promise<void> {
    await client.connect();
}
export class TonConnectStorage implements IStorage {
    constructor(private readonly chatId: number) {}

    private getKey(key: string): string {
        console.log('getKey', key);
        return this.chatId.toString() + key;
    }

    async removeItem(key: string): Promise<void> {
        key = this.getKey(key);
        console.log('removeItem');
        await client.del(key);
        console.log('removeItem done');
    }

    async setItem(key: string, value: string): Promise<void> {
        key = this.getKey(key);
        console.log('setItem', key, value);
        await client.set(key, value);
        console.log('setItem done', key, value);
    }

    async getItem(key: string): Promise<string | null> {
        key = this.getKey(key);
        console.log('getItem', key);
        const value = await client.get(key);
        console.log('getItem', key, value);
        return value;
    }
}
