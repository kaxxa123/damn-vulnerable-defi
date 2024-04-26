# Solution

## Deploying GnosisSafe Master Copy and GnosisSafeProxyFactory

`WalletDeployer` is relying on a `GnosisSafeProxyFactory` and `GnosisSafe` Master that are not yet deployed.
The contract is hardcoding the addresses for the factory
`0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B` and the Master
`0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F` by copying the
address of the contracts deployed on Ethereum's mainnet.

To re-deploy these, on our Hardhat network we need to replay the
transactions for deploying these two contracts.

References [here](https://share.zight.com/z8uBKZYr) and [here](https://help.safe.global/en/articles/40812-i-sent-assets-to-a-safe-address-on-the-wrong-network-any-chance-to-recover).


Replaying involves funding the deployer address, and re-running the
deployment transactions. Note that we don't even need to know the private
key of the deployer since we have the raw signed transaction.

The raw transaction to be replayed is available in this github repo.

```
git clone git@github.com:5afe/safe-contract-deployment-replay.git
```

From here copy the [safe111AndFactoryConfig.json](../../test/wallet-mining/safe111AndFactoryConfig.json)
file and also copy and adjust the code of the deployment script over to our test script.

The deployed code is available on etherscan. This is useful as safe contract v1.1.1 is an old version: <BR />
[GnosisSafeProxyFactory solidity](https://etherscan.io/address/0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B#code) <BR />
[GnosisSafe solidity](https://etherscan.io/address/0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F#code)

Note, this replay attack did happen on Optimisim L2, as explained [here](https://systemweakness.com/damn-vulnerable-defi-v3-13-wallet-mining-solution-d5147533fa49):

_Without the private key to this EOA account, it seems we cannot replicate its deployments.
A further search of the EOA account reveals the exact attack that toke place in 2022. The
attacker managed to replay an L1 deployment on the Optimism L2 chain by using the same
raw signed transaction data. Credit to #Coucou who wrote the attack analysis [here](https://mirror.xyz/0xbuidlerdao.eth/lOE5VN-BHI0olGOXe27F0auviIuoSlnou_9t3XRJseY). See
etherscan for signed transaction data of factory deployment [here](https://etherscan.io/getRawTx?tx=0x06d2fa464546e99d2147e1fc997ddb624cec9c8c5e25a050cc381ee8a384eed3). This should be the same
strategy for our challenge._

_...Since EIP-155, a replay attack is protected by the standard of hashing nine encoded elements which include chainId._

<BR />


## Stealing 20 million DVT from hardocded address

Beyond the hardcoded addresses for `GnosisSafeProxyFactory` and `GnosisSafe` Master.
The CTF also makes use of a 3rd hardcoded address to which it transfers 20 million DVT.
The CTF is expecting us to deploy a contract at this address  and steal the DVT balance.

It turns out this is just a Safe wallet instance. To find this out we had to deploy 43 safe
wallets until we found an address match.

Since we are the deployers we are also the wallet owners and hence we could just create
a regular withdrawal transfer call to take out the DVTs once deployed. However to avoid
going thorugh the siging procedure required by Safe we exploited the safe wallet setup
by making a call to `approve` on the token which allowed the player to later `transferFrom`
the DVTs from the sage to itself (the player).

<BR />


## Stealing WalletDeployer Tokens

The wallet deployer gives away 1 token on every safe wallet deployment through
the `drop` function. The CTF requires us to take the `WalletDeployer`'s 43 tokens
available for this token distribution.

However this offer is only available to the `ward` address over which we have
no control.

Thus the player needs a way to become an authorized deployer. Here we have a
number of bugs to exploit.

1. The `WalletDeployer::can()` function bug 1 - Incorrect Signature.

    ```JS
    function can(address u, address a) public view returns (bool)
    ```

    The function is supposed to return false if an address is not authroized.
    However its assembly code `return(0, 0)` is such that no value is returned.

    When `can` is called from the `drop` function, `can` causes `drop` to exit
    without reverting any previous changes. In this case `drop` would have
    already deployed the safe with `createProxy`.

    This sudden termination however blocks us from stealing the DVTs as the
    `transfer` is never invoked.

    This bug is actually misleading in the CTF since exploiting it means we don't
    receive any token from transfer.

1. The `WalletDeployer::can()` function bug 2 - Incorrect `staticcall` handling.

    `WalletDeployer::can()` performs its check by calling `AuthorizerUpgradeable::call()`

    `WalletDeployer::can()` is implemented using inline assembly. This is how
    `AuthorizerUpgradeable::call()` is called:

    ```JS
    if iszero(staticcall(gas(), m, p, 0x44, p, 0x20)) {
        // Return if function failed, return false.
        return(0, 0)
    }
    ```

    The problem with this code is that if the call is done against a non-existing
    function, `staticcall` returns `true`. Thus all we need is a way to delete the
    AuthorizerUpgradeable contract implementation.


1. `AuthorizerUpgradeable` unprotected UUPS implementation initialization bug.

    `AuthorizerUpgradeable` is a UUPS upgradable contract. However this contract is buggy.
    Specifically the implementation contract does not block initialization. UUPS requires
    disabling initialization at the constructor with something like this:

    ```JS
    constructor() {
        _disableInitializers();
    }
    ```

    However `AuthorizerUpgradeable` lacks this constructor.

    Remember that in an upgradable contract we are normally working with the state held
    by the proxy contract but executing functions delegated to the implementation contract.

    The ability to initialze the implementation will allow us to selfdestruct the
    implementation orphaning any proxy of its implementation.
