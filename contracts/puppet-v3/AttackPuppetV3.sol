// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.6;
pragma abicoder v2;

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

//Code based on https://docs.uniswap.org/contracts/v3/guides/swaps/single-swaps
contract AttackPuppetV3 {
    // It should be noted that for the sake of these examples, we purposefully pass
    // in the swap router instead of inherit the swap router for simplicity.
    // More advanced example contracts will detail how to inherit the swap router safely.
    ISwapRouter public immutable swapRouter;

    address public immutable erc20DVT;
    address public immutable erc20WETH;

    // For this example, we will set the pool fee to 0.3%.
    uint24 public constant poolFee = 3000;

    constructor(ISwapRouter _swapRouter, address weth, address dvt) {
        swapRouter = _swapRouter;
        erc20DVT = dvt;
        erc20WETH = weth;
    }

    /// @notice swapExactInputSingle swaps a fixed amount of DVT for a maximum possible amount of WETH
    /// using the DVT/WETH 0.3% pool by calling `exactInputSingle` in the swap router.
    /// @dev The calling address must approve this contract to spend at least `amountIn` worth of its DVT for this function to succeed.
    /// @param amountIn The exact amount of DVT that will be swapped for WETH.
    /// @return amountOut The amount of WETH received.
    function swapExactInputSingle(
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        // msg.sender must approve DVTs for this contract
        // Transfer the specified amount of DVT to this contract.
        TransferHelper.safeTransferFrom(
            erc20DVT,
            msg.sender,
            address(this),
            amountIn
        );

        // Approve the router to spend DVT.
        TransferHelper.safeApprove(erc20DVT, address(swapRouter), amountIn);

        // Naively set amountOutMinimum to 0. In production, use an oracle or other data source
        // to choose a safer value for amountOutMinimum.
        // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: erc20DVT,
                tokenOut: erc20WETH,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        // The call to `exactInputSingle` executes the swap.
        amountOut = swapRouter.exactInputSingle(params);
    }

    /// @notice swapExactOutputSingle swaps a minimum possible amount of DVT for a fixed amount of WETH.
    /// @dev The calling address must approve this contract to spend its DVT for this function to succeed.
    /// As the amount of input DVT is variable, the calling address will need to approve for a slightly
    /// higher amount, anticipating some variance.
    /// @param amountOut The exact amount of WETH to receive from the swap.
    /// @param amountInMaximum The amount of DVT we are willing to spend to receive the specified amount of WETH.
    /// @return amountIn The amount of DVT actually spent in the swap.
    function swapExactOutputSingle(
        uint256 amountOut,
        uint256 amountInMaximum
    ) external returns (uint256 amountIn) {
        // Transfer the specified amount of DVT to this contract.
        TransferHelper.safeTransferFrom(
            erc20DVT,
            msg.sender,
            address(this),
            amountInMaximum
        );

        // Approve the router to spend the specifed `amountInMaximum` of DVT.
        // In production, you should choose the maximum amount to spend based on oracles or other data sources to acheive a better swap.
        TransferHelper.safeApprove(
            erc20DVT,
            address(swapRouter),
            amountInMaximum
        );

        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter
            .ExactOutputSingleParams({
                tokenIn: erc20DVT,
                tokenOut: erc20WETH,
                fee: poolFee,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum,
                sqrtPriceLimitX96: 0
            });

        // Executes the swap returning the amountIn needed to spend to receive the desired amountOut.
        amountIn = swapRouter.exactOutputSingle(params);

        // For exact output swaps, the amountInMaximum may not have all been spent.
        // If the actual amount spent (amountIn) is less than the specified maximum amount, we must refund the msg.sender and approve the swapRouter to spend 0.
        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(erc20DVT, address(swapRouter), 0);
            TransferHelper.safeTransfer(
                erc20DVT,
                msg.sender,
                amountInMaximum - amountIn
            );
        }
    }
}
