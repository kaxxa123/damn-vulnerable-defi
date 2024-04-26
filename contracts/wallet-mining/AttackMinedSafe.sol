// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract AttackMinedSafe {
    function approveSafe(
        address token,
        address spender,
        uint256 amount
    ) external returns (bool) {
        return IERC20(token).approve(spender, amount);
    }
}
