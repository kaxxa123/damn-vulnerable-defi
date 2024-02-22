# Solution

* The lending pool contract `SelfiePool` has a function `emergencyExit` that can be exeucted by the `SimpleGovernance` contract. This function will give away the pool's token balance to whoever the governance contract specifies.

* The governance contract allows users to run functions in its name,
to anyone owning +50% of the total supply of the DVT token.


* An attacker can thus do the following:

    1. Take a flash loan of DVT from `SelfiePool` satisfying the +50% ownership condition.

    1. Queue an action to execute `SelfiePool::emergencyExit`.

    1. Refund the loan.


* The attack is concluded after 2 days (since governance actions must be queued for 2 days), at which point the queued action is executed.
