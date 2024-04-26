slither:
	# Once started, install make to run tests from
	# this make file inside the container.
	# 	sudo apt update
	# 	sudo apt install make
	docker run -it --rm  \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		-w /share \
        trailofbits/eth-security-toolbox

mythril:
	docker run --rm  \
		mythril/myth

slither-unstoppable:
	# run this from slither docker container
	slither /share/contracts/unstoppable/UnstoppableVault.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"

mythril-unstoppable:
	# Mythril hangs on this one (29/02/2024)
	# Hence we specify execution-timeout
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/unstoppable/UnstoppableVault.sol  \
		--solc-json /share/mythril_map.json  \
		--execution-timeout  120 \
		--solv 0.8.24

slither-naive-receiver:
	# run this from slither docker container
	slither /share/contracts/naive-receiver/FlashLoanReceiver.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-naive-receiver:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/naive-receiver/FlashLoanReceiver.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-truster:
	# run this from slither docker container
	slither /share/contracts/truster/TrusterLenderPool.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"


mythril-truster:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/truster/TrusterLenderPool.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-compromised:
	# run this from slither docker container
	slither /share/contracts/compromised/Exchange.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-compromised:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/compromised/Exchange.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-selfie:
	# run this from slither docker container
	slither /share/contracts/selfie/SelfiePool.sol   \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-selfie:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/selfie/SelfiePool.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-the-rewarder:
	# run this from slither docker container
	slither /share/contracts/the-rewarder/TheRewarderPool.sol   \
	     	--truffle-ignore-compile  \
			--exclude-optimization  \
			--exclude-informational \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-the-rewarder:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/the-rewarder/TheRewarderPool.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-side-entrance:
	# run this from slither docker container
	slither /share/contracts/side-entrance/SideEntranceLenderPool.sol   \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-side-entrance:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/side-entrance/SideEntranceLenderPool.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-puppet:
	# run this from slither docker container
	slither /share/contracts/puppet/PuppetPool.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"

mythril-puppet:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/puppet/PuppetPool.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-puppet-v2:
	# run this from slither docker container
	solc-select install 0.6.6
	solc-select use 0.6.6
	slither /share/contracts/puppet-v2/PuppetV2Pool.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"

mythril-puppet-v2:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/puppet-v2/PuppetV2Pool.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.6.6

slither-free-rider:
	# run this from slither docker container
	slither /share/contracts/free-rider/FreeRiderNFTMarketplace.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-free-rider:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/free-rider/FreeRiderNFTMarketplace.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-backdoor:
	# run this from slither docker container
	slither /share/contracts/backdoor/WalletRegistry.sol  \
	     	--truffle-ignore-compile  \
			--exclude-optimization \
			--solc-remaps "@=node_modules/@ solady=node_modules/solady"

mythril-backdoor:
	docker run --rm \
        -v /home/alexubuntu22/code/damn-vulnerable-defi:/share  \
		mythril/myth \
		analyze /share/contracts/backdoor/WalletRegistry.sol \
		--solc-json /share/mythril_map.json  \
		--solv 0.8.24

slither-wallet-mining:
	# Get storage slot numbers for WalletDeployer
	slither /share/contracts/wallet-mining/WalletDeployer.sol \
		--print variable-order \
		--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"

	# Get function-ids WalletDeployer
	slither /share/contracts/wallet-mining/WalletDeployer.sol \
		--print function-id \
		--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"

	# Get storage slot numbers for AuthorizerUpgradeable
	slither /share/contracts/wallet-mining/AuthorizerUpgradeable.sol \
		--print variable-order \
		--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"

	# Get function-ids AuthorizerUpgradeable
	slither /share/contracts/wallet-mining/AuthorizerUpgradeable.sol \
		--print function-id \
		--solc-remaps "@=node_modules/@ solmate=node_modules/solmate"
