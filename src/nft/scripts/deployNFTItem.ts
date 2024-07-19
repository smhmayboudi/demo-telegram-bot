import { toNano } from '@ton/ton';
import { NetworkProvider, compile } from '@ton/blueprint';
import { NFTItem } from '../wrappers/NFTItem';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const nft = provider.open(NFTItem.createFromConfig({}, await compile('NFTItem')));

    await nft.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(nft.address);

    // run methods on `nft-item`
}
