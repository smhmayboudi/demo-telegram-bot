import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/ton';
import { NFT } from '../wrappers/NFT';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('NFT', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('NFT');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nft: SandboxContract<NFT>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        nft = blockchain.openContract(NFT.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await nft.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nft.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and nft are ready to use
    });
});
