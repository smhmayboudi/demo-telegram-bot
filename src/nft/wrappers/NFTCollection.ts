import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    TupleItemInt,
} from '@ton/ton';

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type NFTCollectionConfig = {
    ownerAddress: Address;
    nextItemIndex: number;
    content: Cell;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
};

export function nftCollectionConfigToCell(config: NFTCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextItemIndex, 64)
        .storeRef(config.content)
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeUint(config.royaltyParams.royaltyFactor, 16)
                .storeUint(config.royaltyParams.royaltyBase, 16)
                .storeAddress(config.royaltyParams.royaltyAddress),
        )
        .endCell();
}

export class NFTCollection implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NFTCollection(address);
    }

    static createFromConfig(config: NFTCollectionConfig, code: Cell, workchain = 0): NFTCollection {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NFTCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint): Promise<void> {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMintNFT(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: number;
            amount: bigint; // to send with nft
            itemIndex: number;
            itemOwnerAddress: Address;
            itemContent: Cell;
        },
    ): Promise<void> {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32) // operation code
                .storeUint(opts.queryId, 64)
                .storeUint(opts.itemIndex, 64)
                .storeCoins(opts.amount)
                .storeRef(beginCell().storeAddress(opts.itemOwnerAddress).storeRef(opts.itemContent)) // body
                .endCell(),
        });
    }

    async sendChangeOwner(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            queryId: bigint;
            newOwnerAddress: Address;
        },
    ): Promise<void> {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32) //operation
                .storeUint(opts.queryId, 64)
                .storeAddress(opts.newOwnerAddress)
                .endCell(),
        });
    }

    async getCollectionData(provider: ContractProvider): Promise<{
        nextItem: bigint;
        ownerAddress: Address;
        content: Cell;
    }> {
        const collectionData = await provider.get('get_collection_data', []);
        const stack = await collectionData.stack;
        let nextItem = stack.readBigNumber();
        let content = await stack.readCell();
        let ownerAddress = await stack.readAddress();
        return {
            nextItem,
            content,
            ownerAddress,
        };
    }

    async getItemAddressByIndex(provider: ContractProvider, index: TupleItemInt): Promise<Address> {
        const res = await provider.get('get_nft_address_by_index', [index]);
        const itemAddress = await res.stack.readAddress();
        return itemAddress;
    }

    // async getNFTContent(provider: ContractProvider, index: TupleItemInt, cell: TupleItemCell): Promise<Cell> {
    //     const res = await provider.get('get_nft_content', [index, cell]);
    //     const itemCell = await res.stack.readCell();
    //     return itemCell;
    // }
}
