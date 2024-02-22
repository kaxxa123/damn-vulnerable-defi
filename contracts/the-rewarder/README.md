# Solution

The system is composed of three tokens:
* `DVT` - The token that being lent out by the flash loan pool `FlashLoanerPool`.
This is also the token that must be deposited at the `TheRewarderPool` to claim rewards.

* `Reward Token` - The currency in which rewards are distributed.
Player deposits/whitdraws `DVT` and is awarded `Rewards Token` by the `TheRewarderPool`.

* `Accounting Token` - A token used by the `TheRewarderPool` to track `DVT` deposits.
The token only allows burning/minting.
This is required in order to track deposits at different time snapshots.


Rewards are allocated by locking at the percentage share of `DVT` tokens each user deposits at `TheRewarderPool`.

However `TheRewarderPool` does not enforce a requirment for how long should the `DVT` deposit sticks. Thus it is possible to make a sequence of  [Deposit DVT] -> [Receive Reward] -> [Withdraw DVT] all in a single transaction.

This works if the attacker times the attack perfectly, sending the transaction  __after__ the time to allocate rewards elapses, but __before__ anyone else calls `deposit` or `distributeRewards` on `TheRewarderPool`.

The key vulnerable code is found in `TheRewarderPool::deposit()`.

```
accountingToken.mint(msg.sender, amount);
distributeRewards();
```

This sequence allows the attacker to record its deposit as being part of the previous reward round,
only for the contract to discover that a new reward round has started on calling `distributeRewards`.

If these two lines of code were inverted the attack would not work (altough there might be other vulnerabilities).
