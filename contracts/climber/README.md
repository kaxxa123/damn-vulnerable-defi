# Solution

* `ClimberVault` is owned by `ClimberTimelock`

* `ClimberVault` is a UUPS upgradable contract.

* Contract upgrades over `ClimberVault` are authorized by the owner `ClimberTimelock`.

* `ClimberTimelock` allows for executing functions in its name using a `schedule` and `execute` function pair.

* `schedule` is executed by senders having the `PROPOSER_ROLE`.

* Scheduled functions can then be executed by anyone.

* The `PROPOSER_ROLE` is administered by the `ClimberTimelock` itself. Giving the contract the right to assign the `PROPOSER_ROLE` to anyone.

* Vulnerable code is located in `ClimberTimelock` | `execute`. This code first executes functions and then checks if it was scheduled by the proposer. This gives the opportunity to run an attack and schedule its own execution, everything from `execute`.

    ```JS
    bytes32 id = getOperationId(targets, values, dataElements, salt);

    for (uint8 i = 0; i < targets.length;) {
        targets[i].functionCallWithValue(dataElements[i], values[i]);
        unchecked {
            ++i;
        }
    }

    if (getOperationState(id) != OperationState.ReadyForExecution) {
        revert NotReadyForExecution(id);
    }
    ```

* The main challenge in this attack is that queuing a call to `schedule` raises a chicken and egg situation when it comes to configuring the parameters.

* To solve this problem, we create the `AttackTimelock` contract. This contract is granted the `PROPOSER_ROLE` and is then invoked to schedule the function calls executed to grant this role.

* Through `AttackTimelock` we can then schedule any other function calls, including the upgrade of the `ClimberVault` to a malicious implementation that allows transferring all the tokens owned by `ClimberVault`.
