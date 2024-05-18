# Solution

* Challenge uses [Uniswap V3](https://docs.uniswap.org/contracts/v3/overview) as a price oracle.

* [Uniswap V3 contract addresses](https://docs.uniswap.org/contracts/v3/reference/deployments/ethereum-deployments)

* [Uniswap core contracts](https://github.com/Uniswap/v3-core).

* [IUniswapV3PoolActions](https://github.com/Uniswap/v3-core/blob/main/contracts/interfaces/pool/IUniswapV3PoolActions.sol)

* The `PuppetV3Pool` contract exposes a sigle external function `borrow`.

* `borrow` swaps tokens for WETH. There is no borrowing going on since its really just a swap.

* `borrow` uses UniswapV3 _arithmetic mean_ to determine the price in WETH for selling DVT tokens. It asks for the _arithmetic mean_ over the last 10 minutes and obtains a quote in WETH multiplied by 3.

* The CTF requires us to manipulate the price quoted by Uniswap. The solution is fairly obvious. The challenge is mostly about understanding how to influnce the quoted price by performing swaps.

* We determined this through experimentation. A better approach would have been to find the exact formula applied.

* From the tests we saw how the _arithmetic mean_ factors in: <BR />
    - The price based on how much it owns of each token<BR />
    - The length of time over which this price was true.

* Basically we need to increase the amount of DVTs owned by the Uniswap pair such that to lower the price quoted in WETH. But on top of that we must retain this favorable price point for long enough. The longer we keep the price point the greater its _wieght_ when computing the _arithmetic mean_.

* We can just make one swap however. The pool for the DVT:WETH pair was just created and we start the test
without any swaps effected agains the pair. We rather have to make a small swap and a large swap and
retain the imbalance caused by the large swap for a long enough time.

* The following is a set of test results from which we concluded that: <BR />
    - The small swap had to be at least of 0.7 DVT.
    - The small and large swap can be performed back to back (without any wait in between).
    - The large swap had to be the latest for around 114 seconds

```
Time 0:00 | Swap 1000000000000000000 DVT -> WETH
Time 0:33 (33)
Time 0:33 | 1 Token :       3000000000000000000 Wei
Time 0:33 | Swap 100000000000000000000 DVT -> WETH
Time 0:33 | 1 Token :       3000000000000000000 Wei
Time 1:04 (64)
Time 1:04 | 1 Token :         35526871999426662 Wei
Time 1:34 (94)
Time 1:34 | 1 Token :           420677476940187 Wei
Time 2:04 (124)
Time 2:04 | 1 Token :             4981784958765 Wei
Time 2:04 | 1000000000000000000000000 DVT :
                  4981784958765275184 Wei
                   123456789012345678

Time 0:00 | Swap 1000000000000000000 DVT -> WETH
Time 0:23 (23)
Time 0:23 | 1 Token :       3000000000000000000 Wei
Time 0:23 | Swap 100000000000000000000 DVT -> WETH
Time 0:23 | 1 Token :       3000000000000000000 Wei
Time 0:54 (54)
Time 0:54 | 1 Token :         35526871999426662 Wei
Time 1:24 (84)
Time 1:24 | 1 Token :           420677476940187 Wei
Time 1:54 (114)
Time 1:54 | 1 Token :             4981784958765 Wei
Time 1:54 | 1000000000000000000000000 DVT :
                  4981784958765275184 Wei
                   123456789012345678

Time 0:00 | Swap 1000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:00 | Swap 100000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:35 (35)
Time 0:35 | 1 Token :         30642770517398736 Wei
Time 1:05 (65)
Time 1:05 | 1 Token :           362880595293141 Wei
Time 1:35 (95)
Time 1:35 | 1 Token :             4296907795905 Wei
Time 1:35 | 1000000000000000000000000 DVT :
                  4296907795905494574 Wei
                   123456789012345678

Time 0:00 | Swap 2000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:00 | Swap 100000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:35 (35)
Time 0:35 | 1 Token :         30642770517398736 Wei
Time 1:05 (65)
Time 1:05 | 1 Token :           362880595293141 Wei
Time 1:35 (95)
Time 1:35 | 1 Token :             4296907795905 Wei
Time 1:35 | 1000000000000000000000000 DVT :
                  4296907795905494574 Wei
                   123456789012345678

Time 0:00 | Swap 900000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:00 | Swap 100000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:34 (34)
Time 0:34 | 1 Token :         35526871999426662 Wei
Time 1:04 (64)
Time 1:04 | 1 Token :           420677476940187 Wei
Time 1:35 (95)
Time 1:35 | 1 Token :             4296907795905 Wei
Time 1:35 | 1000000000000000000000000 DVT :
                  4296907795905494574 Wei
                   123456789012345678


Time 0:00 | Swap 700000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:00 | Swap 100000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:35 (35)
Time 0:35 | 1 Token :         30642770517398736 Wei
Time 1:05 (65)
Time 1:05 | 1 Token :           362880595293141 Wei
Time 1:35 (95)
Time 1:35 | 1 Token :             4296907795905 Wei
Time 1:35 | 1000000000000000000000000 DVT :
                  4296907795905494574 Wei
                   123456789012345678


Time 0:00 | Swap 600000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:00 | Swap 100000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:34 (34)
Time 0:34 | 1 Token :       2999400089988001497 Wei
Time 1:04 (64)
Time 1:04 | 1 Token :       2998500449895020994 Wei
Time 1:35 (95)
Time 1:35 | 1 Token :       2997601079640098976 Wei
Time 1:35 | 1000000000000000000000000 DVT :
            2997601079640098976245145 Wei
                   123456789012345678

Time 0:00 | Swap 1000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:00 | Swap 109000000000000000000 DVT -> WETH
Time 0:00 | 1 Token :       3000000000000000000 Wei
Time 0:34 (34)
Time 0:34 | 1 Token :         35526871999426662 Wei
Time 1:04 (64)
Time 1:04 | 1 Token :           420677476940187 Wei
Time 1:34 (94)
Time 1:34 | 1 Token :             4981784958765 Wei
Time 1:54 (114)
Time 1:54 | 1 Token :              258809275239 Wei
Time 1:54 | 1000000000000000000000000 DVT :
                   258809275239840624 Wei
                   123456789012345678
                  1000000000000000000 = 1 ETH
```
