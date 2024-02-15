![](cover.png)

**A set of challenges to learn offensive security of smart contracts in Ethereum.**

Featuring flash loans, price oracles, governance, NFTs, lending pools, smart contract wallets, timelocks, and more!

## Play

Visit [damnvulnerabledefi.xyz](https://damnvulnerabledefi.xyz)

## Disclaimer

All Solidity code, practices and patterns in this repository are DAMN VULNERABLE and for educational purposes only.

DO NOT USE IN PRODUCTION.

## Fork Setup

Fork source repo:
```BASH
gh repo fork git@github.com:tinchoabbate/damn-vulnerable-defi.git
```

This will give us the option to immidiately clone the fork. Otherwise:
```BASH
git clone git@github.com:kaxxa123/damn-vulnerable-defi.git
```

Check that the remotes  are set such that origin points to our
fork and upstream points to the fork source

```BASH
git remote -v
```

```
origin  git@github.com:kaxxa123/damn-vulnerable-defi.git (fetch)
origin  git@github.com:kaxxa123/damn-vulnerable-defi.git (push)
upstream        git@github.com:tinchoabbate/damn-vulnerable-defi.git (fetch)
upstream        git@github.com:tinchoabbate/damn-vulnerable-defi.git (push)
```

Switch to latest CTF challenge version v3.0.0
```BASH
git checkout v3.0.0
```

Create our own solutions branch:
```BASH
git checkout -b solutions
```

Install dependencies:
```BASH
yarn install
```

For each challenge check description from: <BR />
https://www.damnvulnerabledefi.xyz/


To test challenge solution:
```BASH
yarn run challenge-name
```
