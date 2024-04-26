// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IGnosisSafeProxyFactory {
    function createProxy(
        address masterCopy,
        bytes calldata data
    ) external returns (address);
}

/**
 * @title  WalletDeployer
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 * @notice A contract that allows deployers of Gnosis Safe wallets (v1.1.1) to be rewarded.
 *         Includes an optional authorization mechanism to ensure only expected accounts
 *         are rewarded for certain deployments.
 */
contract WalletDeployer {
    // Addresses of the Gnosis Safe Factory and Master Copy v1.1.1
    IGnosisSafeProxyFactory public constant fact =
        IGnosisSafeProxyFactory(0x76E2cFc1F5Fa8F6a5b3fC4c8F4788F0116861F9B);
    address public constant copy = 0x34CfAC646f301356fAa8B21e94227e3583Fe3F5F;

    uint256 public constant pay = 1 ether;
    address public immutable chief = msg.sender;
    address public immutable gem;

    address public mom;

    error Boom();

    constructor(address _gem) {
        //Token
        gem = _gem;
    }

    /**
     * @notice Allows the chief to set an authorizer contract.
     * Can only be called once. TODO: double check.
     */
    function rule(address _mom) external {
        if (msg.sender != chief || _mom == address(0) || mom != address(0)) {
            revert Boom();
        }
        // Set to an instance of AuthorizerUpgradeable
        mom = _mom;
    }

    /**
     * @notice Allows the caller to deploy a new Safe wallet and receive a payment in return.
     *         If the authorizer is set, the caller must be authorized to execute the deployment.
     * @param wat initialization data to be passed to the Safe wallet
     * @return aim address of the created proxy
     */
    function drop(bytes memory wat) external returns (address aim) {
        aim = fact.createProxy(copy, wat);

        // If (mom is set) AND (can() is FALSE) revert.
        //   However can() is buggy as instead of returning
        //   FALSE, it returns nothing. This causes the function
        //   to terminate without reverting.
        if (mom != address(0) && !can(msg.sender, aim)) {
            revert Boom();
        }

        //IF Mom is NOT set OR can() returned TRUE
        IERC20(gem).transfer(msg.sender, pay);
    }

    // TODO(0xth3g450pt1m1z0r) put some comments
    //   View is only enforced by the compiler.
    //   A function may still include state changing
    //   code especially within an assembly block
    function can(address u, address a) public view returns (bool) {
        assembly {
            // Load word from storage at key: 0 (mom)
            let m := sload(0)
            // 	Get size of an account’s code
            if iszero(extcodesize(m)) {
                // if the mom code size is zero...
                // end execution, return no data
                return(0, 0)
            }
            // load memory at offset 0x40
            // 0x40 - 0x5f (32 bytes) is reserved for free memory pointer location.
            let p := mload(0x40)
            // p + 0x44 and store result to 0x40
            // Effectively we are reserving 0x44 bytes of memory.
            mstore(0x40, add(p, 0x44))

            // Shift 224-bits left the value 0x4538c4eb
            // and store the 32-byte word to location p
            //
            // 0x4538c4eb - is the function selector of can(address,address).
            //              verify this using the slither function-id printer
            //
            // <----------------------256-bits/32-bytes----------------------->
            // 1234567812345678123456781234567812345678123456781234567812345678
            //                                                         4538c4eb
            // 4538c4eb00000000000000000000000000000000000000000000000000000000
            mstore(p, shl(0xe0, 0x4538c4eb))

            // store address u to location p + 0x04
            // 4538c4eb00000000000000000000000000000000000000000000000000000000
            // 4538c4ebuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuuu
            mstore(add(p, 0x04), u)

            // store address a (32-bytes) to location p + 0x24 = p + 32 + 4
            // This will fill another 0x20 bytes completing the 0x44 bytes
            // that where reserved ealier.
            mstore(add(p, 0x24), a)

            // Call function with state changes dissallowed, passing it:
            // 1. gas
            // 2. contract address m (= mom)
            // 3. Args offset p
            // 4. Args length 0x44
            // 5. Return offset p (0x44)
            // 4. Return length 0x20 (32-bytes)
            //
            // Creates a new sub context and execute the code of the given account,
            // then resumes the current one. Note that an account with no code will
            // return success as true (1).
            if iszero(staticcall(gas(), m, p, 0x44, p, 0x20)) {
                // Return if function failed, return false.
                return(0, 0)
            }

            // I data was returned AND return value is ZERO
            if and(not(iszero(returndatasize())), iszero(mload(p))) {
                return(0, 0)
            }

            //If NO data is returned OR the returned data is NOT zero...
        }
        return true;
    }
}
