import { Address, toNano } from '@ton/ton';
import { NFTCollection } from '../wrappers/NFTCollection';
import { compile, NetworkProvider } from '@ton/blueprint';
import { buildContentCell, setItemContentCell } from './nftContent/onChain';

const randomSeed = Math.floor(Math.random() * 10000);

export async function run(provider: NetworkProvider) {
    // const nft = provider.open(NFTCollection.createFromConfig({}, await compile('NFTCollection')));
    // await nft.sendDeploy(provider.sender(), toNano('0.05'));
    // await provider.waitForDeploy(nft.address);
    // // run methods on `nft-collection`
    const ui = provider.ui();
    const nftCollection = provider.open(
        NFTCollection.createFromConfig(
            {
                ownerAddress: provider.sender().address!,
                nextItemIndex: 0,
                content: buildContentCell({
                    name: 'مجموعه دکورستان',
                    description: 'هر یک از عکس ها قصه ای در خود دارد.',
                    image: 'https://decorestan.com/wp-content/uploads/2023/12/%D8%A7%D8%AA%D8%A7%D9%82-%D9%86%D8%B4%DB%8C%D9%85%D9%86.webp',
                }),
                nftItemCode: await compile('NftItem'),
                royaltyParams: {
                    royaltyFactor: Math.floor(Math.random() * 500),
                    royaltyBase: 1000,
                    royaltyAddress: provider.sender().address as Address,
                },
            },
            await compile('NftCollection'),
        ),
    );

    provider.ui().write(provider.sender().address!.toString());
    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));
    provider.ui().write('');
    await provider.waitForDeploy(nftCollection.address);
    // await run2(provider, [nftCollection.address.toRawString()]);

    // const ui = provider.ui();
    // const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Collection address'));
    // const nftCollection = provider.open(NFTCollection.createFromAddress(address));
    const mint = await nftCollection.sendMintNFT(provider.sender(), {
        value: toNano('0.02'),
        queryId: randomSeed,
        amount: toNano('0.014'),
        itemIndex: 0,
        itemOwnerAddress: provider.sender().address!,
        itemContent: setItemContentCell({
            name: 'اتاق نشیمن',
            description: 'اتاق نشیمن در سایت دکورستان https://decorestan.com/',
            image: 'https://decorestan.com/wp-content/uploads/2023/12/%D8%A7%D8%AA%D8%A7%D9%82-%D9%86%D8%B4%DB%8C%D9%85%D9%86.webp',
        }),
    });

    provider.ui().write(`NFT Item deployed at https://testnet.tonscan.org/address/${nftCollection.address}`);
}
