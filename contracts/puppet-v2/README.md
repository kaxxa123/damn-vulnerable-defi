# Solution

The vulnerability is very similar to puppet (v1), except that the CTF now uses Uniswap V2.

Again at the Uniswap exchange, we swap tokens for WETH. This lowers the token price at the pool allowing us to withdraw the entire token balance.


## Uniswap V2

* CTF uses [Uniswap V2](https://docs.uniswap.org/contracts/v2/overview).

* Uniswap V2 introduces:
    * ERC20/ERC20 pairs without the need for ETH as a base currency.
    * A new price oracle system, levereging existing liquidity pools.
    * Flash swaps - Borrow tokens, with the condition to return the amount plus fees
      (or equivalent in another token) by the end of the transaction.

* The `x*y = k` relation is now also true for the case when `x` and `y` are both tokens.

* Applies 0.3% fees which increases `k`. However these fees are withdrawn when liquidity providers, withdraw their reserves.

* Core is composed of a singelton factory and many pair contracts.

* Additional helper (periphery) contracts are also provided to help working with the core contracts. CTF initializes [Router2](https://docs.uniswap.org/contracts/v2/reference/smart-contracts/router-02) periphery contract.

* In Uniswap v1, tokens are transferred to the DEX using the `approve` + `transferFrom` pattern. However v2 requires users to directly `transfer` the tokens. The DEX then discovers the amount by comparing its token balance against its previous balance. This is true except for Flash Swaps.

* The Uniswap v2 direct `transfer` mechanisim means that a swap should only be performed by a contract that atomically packages the calls to `transfer` and `swap`.

* Uniswap v2 does not directly support ETH. Instead WETH is used to achieve ERC20 <> ERC20 pair. Periphery contracts render this transparent allowing users to use ETH.

* The first liquidity deposit burns the amount defined by `MINIMUM_LIQUIDITY()`.

* The first liquidity provider LP is incentivized to provide an equivalent amount of the two tokens. Otherwise the pool would immidiately create an arbitrage opportunity for others to profit from.

* The first LP receives SQRT(x * y) liquidity tokens. Liquidity tokens are minted on depositing liquidity and burned on withdrawing.

* Flash swaps may be paid back either:
  * with the correspoding paired ERC20 token.
  * with the same token borrowed (plus a small fee)
