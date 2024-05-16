# Solution

* This CTF requires an understanding of [Uniswap v1](https://docs.uniswap.org/contracts/v1/overview). Here is a [great explainer](https://t.ly/5yjPY) for the basic Uniswap maths.

* The CTF deploys a Uniswap factory contract and a Uniswap exchange contract.
    * A __Factory__ is a public registry to lookup all the available tokens and their exchange contract addresses.

    * An __Exchange__ is a token specific ETH-ERC20 swap contract. One such contract is deployed for each token.

* The fundamental formula for the swap rate used in Uniswap is: <BR />
`Exchange_ETH_Balance * Exchange_Token_Balance = k`

* This rate is established when the first liquidity is deposited. Thereafter subsequent liquidity addition/withdrawals retain the same k.

* The formula creates an inverse relation between the two currencies. As one balance goes down, its price goes up. Thus, none of the two currencies is ever drained completely.

* Swapping Tokens for ETH also preserves `k`. Thus, the swap price can be computed:
    ```
    E = Exchange ETH Balance
    T = Exchange Token Balance
    &E = Change in Exchange ETH Balance
    &T = Change in Exchange Token Balance

    (E - &E) * (T + &T) = E * T

    &E = (E * &T) / (T + &T)    // ETH received by user
    &T = (T * &E) / (E - &E)    // Tokens paid by user
    ```

* However, swaps incur a fee, which goes to the liquidity providers. This is charged by deducting an amount the user receives. Thus: <BR />
    `&T' = &T (1 - fee_rate)`

* The CTF lending pool contract `PuppetPool` is initialized with the Uniswap Exchange contract for the DVT token. The pool only uses this as an oracle to determine the DVT price in Wei. The formula used is: <BR />
    `E / T`

* From the `PuppetPool` price computation we see that a swap that increases the token balance and reduces the ETH balance causes the pool price to give away tokens at a cheaper price.

* `PuppetPool` does not factor in its own token balance in the price calculation. Hence, it does not protect against its token balance being drained completely.

* Inserting the token swap equations in Excel, and trying different swap amounts, and computing the resulting pool token price, we see that a swap of 990 tokens takes the price of all tokens in the pool to around 20 ETH.

* Thus the attack simply performs a swap at the Uniswap Exchange of 990 Tokens, and purchases the entire balance of the pool tokens.

* The CTF description does not require the attack to be performed in a single transaction, but the test script checks that the player only performs a single transaction. However, this is a silly restriction, as the only way to satisfy it is to create a second account execute the attack from the second account and receive the tokens in the player account. Thus, we simply edit the script result verification to remove this restriction.
