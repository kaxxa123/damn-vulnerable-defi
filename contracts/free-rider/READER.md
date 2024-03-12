# Solution

The `FreeRiderNFTMarketplace` is badly broken because of these two bugs:

1. The `FreeRiderNFTMarketplace` instead of transferring payments to the seller, transfer payments to the buyer. This happens because of the call sequence:

    ```JS
    // transfer from seller to buyer
    DamnValuableNFT _token = token; // cache for gas savings
    _token.safeTransferFrom(_token.ownerOf(tokenId), msg.sender, tokenId);

    // pay seller using cached token
    payable(_token.ownerOf(tokenId)).sendValue(priceToPay);
    ```

    Note how sendValue is called after transferring the token to the buyer which updates the token owner.


1. Consider this call sequence `buyMany -> _buyOne`.

    `buyMany` calls `_buyOne` in a loop to sell multiple NFTs. However `_buyOne` only checks if there is enough payment credit using this check:

    ```JS
        if (msg.value < priceToPay)
            revert InsufficientPayment();
    ```

    This test is incorrect as it does not take into account the fact that multiple NFTs are being sold. Indeed it allows an attacker to buy all NFTs for the price of one.

    Slither catches this bug:

    ```
    INFO:Detectors:
    FreeRiderNFTMarketplace._buyOne(uint256) (contracts/free-rider/FreeRiderNFTMarketplace.sol#88-106) use msg.value in a loop: msg.value < priceToPay (contracts/free-rider/FreeRiderNFTMarketplace.sol#93)
    Reference: https://github.com/crytic/slither/wiki/Detector-Documentation/#msgvalue-inside-a-loop
    ```

<BR />

## Attack Plan

1. Execute a flash swap to take a loan of 15 WETH (price for 1 NFT) from the Uniswap V2 Pair.

1. Cashout the WETH for ETH

1. Call `buyMany` to buy all 6 NFTs, whilst only passing the value of 1 NFT as `msg.value` (15 ETH).

    The marketplace has an initial balance of 90 ETH. This is enough for the attack to work.

    The marketplace will effectively end up paying for 5 of the NFTs, from its own balance.


1. Cash the bounty by transfering the 6 NFTs to the bounty contract `FreeRiderRecovery`.

    This will return us 45 ETH.


1. Convert 15 ETH + fees to WETH


1. Payback the flash swap WETH amount.


## Notes

* Solution requires executing a [flash swap](https://docs.uniswap.org/contracts/v2/guides/smart-contract-integration/using-flash-swaps).

* The Uniswap V2 `swap` function operates in two modes depending on the `data` parameter:

    ```JS
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data);
    ```

    If `data` has a zero length, a regular swap is carried out. Otherwise a flash swap is performed.


* In a flash swap the exchange:
    1. Sends the `msg.sender` the token amounts requested in `amount0Out` and `amount1Out`.

    1. Calls:
        ```JS
        (msg.sender).function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data);
        ```

    1. Checks that the Exchange has been paid back the loan plus fee.


* Sample flash swap code: <BR />
    https://github.com/Uniswap/v2-periphery/blob/master/contracts/examples/ExampleFlashSwap.sol
