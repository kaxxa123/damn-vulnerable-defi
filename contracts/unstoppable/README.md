# Solution

Buggy contract: `UnstoppableVault`

Buggy Code:
```JS
function flashLoan(...) {
    //...
    uint256 balanceBefore = totalAssets();
    if (convertToShares(totalSupply) != balanceBefore) revert InvalidBalance(); // enforce ERC4626 requirement
    //...
}
```

* This code is working with two tokens one for `shares` and one for `assets` (see notes on ERC4626).

* `totalAssets()` returns the number of `asset` tokens owned by the `UnstoppableVault` contract.

* `totalSupply` returns the number of `share` tokens.

* The two amounts are initialized to be identical however transferring any additional `asset` tokens to `UnstoppableVault`, will cause `flashLoan` to always fail with `InvalidBalance()`.


## Extra Notes

* Challenge uses [solmate](https://github.com/transmissions11/solmate) which provides
contract building blocks.


* Challenge implements [ERC3156](https://eips.ethereum.org/EIPS/eip-3156#simple-summary) <BR />
    An interface standard for flash loans. <BR />
    A loan is issued and paid back within the same transaction, thus no collateral is required.

* ERC3156 integrates two contracts, the LENDER (`IERC3156FlashLender`) and the RECEIVER (`IERC3156FlashBorrower`) using a callback pattern.


* [ERC4626](https://eips.ethereum.org/EIPS/eip-4626) implements the token to be lent.


* ERC4626 distinguishes between _assets_ and _shares_. Both of these are
implmeneted as ERC20 tokens in this challenge.


* The LENDER, lends out _shares_ each of which is worth some ammount of _assets_.
Hence there exists an exchange rate between the two tokens.


* The ERC4626 contract inherits from ERC20. This token represent the _shares_ to be lent.


* The ERC4626 contract furthermore encapsulates another ERC20 that represent the _assets_. This token is passed as a constructor parameter.


* `convertToShares(asset_amnt)` and `convertToAssets(share_amnt)` provide the exchage rates for converting between the two tokens. This rate is simply based on `Total_Shares:Total_Assets`.


* EIP-4626  includes the concepet of fees and slippage (the difference between _share_ price and amount paid after accounting for fees).
