# Solution

The `TrusterLenderPool` contract is vulnerable as it allows the caller to run arbitrary code here:

```JS
target.functionCall(data);
```

We simply force the contract to call approve() on a token such that to allow us to transfer the
contract balance to the player.

Two solutions are included one using only client-side scripting and the other using a contract that
executes the entire attack in a single transaction.
