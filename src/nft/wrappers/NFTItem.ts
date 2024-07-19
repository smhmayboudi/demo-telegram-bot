import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/ton';

export type NFTItemConfig = {
    index: number;
    collectionAddress: Address;
    ownerAddress: Address;
    itemContent: Cell;
};

export function nftItemConfigToCell(config: NFTItemConfig): Cell {
    return beginCell()
        .storeUint(config.index, 64)
        .storeAddress(config.collectionAddress)
        .storeAddress(config.ownerAddress)
        .storeRef(config.itemContent) // body
        .endCell();
}

export class NFTItem implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NFTItem(address);
    }

    static createFromConfig(config: NFTItemConfig, code: Cell, workchain = 0): NFTItem {
        const data = nftItemConfigToCell(config);
        const init = { code, data };
        return new NFTItem(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void> {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getNFTData(provider: ContractProvider): Promise<{
        init: bigint | null;
        index: bigint;
        collectionAddress: Address;
        ownerAddress: Address;
        content: Cell;
    }> {
        const nftData = await provider.get('get_nft_data', []);
        const stack = await nftData.stack;
        let init = stack.readBigNumberOpt();
        let index = stack.readBigNumber();
        let collectionAddress = stack.readAddress();
        let ownerAddress = stack.readAddress();
        let content = await stack.readCell();
        return {
            init,
            index,
            collectionAddress,
            ownerAddress,
            content,
        };
    }
}
