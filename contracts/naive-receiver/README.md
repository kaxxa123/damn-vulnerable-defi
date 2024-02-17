# Solution

Buggy contract: `FlashLoanReceiver`

Buggy code: `onFlashLoan()`

The receiver does not check who is initiating the loan. Thus anyone may intiate a loan in its name draining the balance by making the receiver pay the loan fee.

The challenge asks for executing the attack in a single transaction. We do this by coding another contract and put the attack code in the constructor such that the deployment would trigger multiple loan requests until the victim is drained from all its balance.

<BR />

## Extra Notes

* This is another flash loan contract and the notes for [Challenge 01 - Unstoppable](../unstoppable/README.md) may be useful for general flash loan information.

* The contracts in this challenge are simpler as the loan is in ETH and no other tokens are involved.
