# Solution

* The `Exchange` contract buys/sells NFTs based on price information provided by the `TrustfulOracle`.

* The `TrustfulOracle` in turn determines the price based on three quotations that are initially set to 999ETH.

* These quotations may be changed by three "sources" identified by three ethereum addresses hardcoded in the `compromised.challenge.js`

* Effectively the solution requires discovering the private keys to which these addresses correspond, such that to be able to manipulate the quotations.

* The private keys are hidden in an HTTP response given in the challenge description:

    ```
    HTTP/2 200 OK
    content-type: text/html
    content-language: en
    vary: Accept-Encoding
    server: cloudflare

    4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30
    4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34
    4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68
    59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69
    5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d
    4e 44 63 7a 4e 57 45 35

    4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68
    59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32
    4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c
    5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c
    4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a
    4e 44 42 69 59 6a 51 34
    ```

* We thus need to discover how to convert this hex data into the private keys. This is done by first converting the two hex blocks to ascii using some [online tool](https://www.rapidtables.com/convert/number/hex-to-ascii.html). The conversion returns:

    ```
    MHhjNjc4ZWYxYWE0NTZkYTY1YzZmYzU4NjFkNDQ4OTJjZGZhYzBjNmM4YzI1NjBiZjBjOWZiY2RhZTJmNDczNWE5
    MHgyMDgyNDJjNDBhY2RmYTllZDg4OWU2ODVjMjM1NDdhY2JlZDliZWZjNjAzNzFlOTg3NWZiY2Q3MzYzNDBiYjQ4
    ```

* Next each string must be [base64 decoded](https://www.base64decode.org/). We thus get:
    ```
    0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a9
    0x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48
    ```

* Using these two accounts we solve the CTF as follows:

    1. From the two oracle source accounts set the price of the NFT to zero.

    1. Player 1 buys the NFT for 0 ETH.

    1. From the two oracle source accounts set the price of the NFT to the total Exchange ETH balance.

    1. Player 1 sells the NFT to the exchange.