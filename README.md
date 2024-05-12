# MiniWallet contract

## Introduction

This is a simple mini wallet contract. With this contract, you can implement functions such as deposit, withdrawal, remittance, and obtaining USD value.

## Usage

### Setup

1. First, you need to install npm, please refer to the npm official documentation for installation.
2. Clone the repository to your local, navigate to the project directory, and run `npm install` to install the dependencies.

### Unit test

1. Run the `npx hardhat compile` command to compile the contracts.
2. Run `npx hardhat test` to execute all unit test cases and check the results.

### Deployment

1. First, you need to prepare a wallet address for deploying the contracts, then replace the value of `PRIVATE_KEY_MANAGER` in the hardhat.config.js file.
2. Navigate to the deploy.js file, where methods for deploying each contract in the project are prepared. We need to deploy each contract individually in sequence (by commenting out other deployment methods and leaving only the method to be deployed, because the deployment has to wait for some time before the transaction is confirmed and the next transaction can be executed).
3. Comment out other methods, leaving only `await deployMiniWalletImplementation();`. Then run the `npx hardhat run scripts/deploy.js --network sepolia` command to deploy the MiniWalletImplementation contract. When you see the deployed contract address in the logs, take note of the MiniWalletImplementation contract address and assign it to `miniWalletImplementationAddress`.
4. Similarly, comment out other methods and leave `await deployMiniWallet(miniWalletImplementationAddress);`. Then run the `npx hardhat run scripts/deploy.js --network sepolia` command to deploy the MiniWallet contract, and take note of the contract address.
5. Deploy the MockUSDT contract using a similar method, and take note of the contract address.
6. Note that don't deploy and update the miniWalletImplementationV2 contract at this stage.

### Testing deployed contracts via transactions

1. To test the deployed contracts by sending transactions, you need to prepare two additional wallet addresses. Replace the values of `PRIVATE_KEY_USER` and `PRIVATE_KEY_USER2` in the hardhat.config.js file with these addresses.
2. Replace the address values of `miniWalletAddress` and `usdtAddress` in the transactions.js file with miniWalletAddress and usdtAddress deployed.
3. Similar to the deployment script, comment out other methods and keep the methods you want to test. Then, execute the test methods one by one in the transactions.js script. Note that you need to wait for a period of time after calling a contract method for the transaction to confirm before executing the next transaction.
4. Using an example to explain: Comment out other methods and keep `await mintERC20Tokens(user, mintAmount);`, then run the command `npx hardhat run scripts/deploy.js --network sepolia`. After obtaining the transactionId, navigate to the Sepolia Explorer (URL: https://sepolia.etherscan.io), paste the transactionId and search. Wait for the transaction status to change to Success on the page.
Then, execute `await approveERC20TokenAllowance(user, mintAmount);` and `await depositERC20Tokens(user, usdt.address, depositAmount);` using the similar method. Afterwards, execute `await getAccountBalance(user, usdt.address);`, and you should see the balance as 100.
5. If you want to test the `getAllTokenBalances` method, first go to the deploy.js file and sequentially call `await deployMiniWalletImplementationV2();` and `await updateMiniWalletImplementation(miniWalletAddress, miniWalletImplementationV2Address);` methods to update the contract implementation. Then, in the transactions.js file, use miniWalletImplementationV2 to execute `await getAllTokenBalances(user2);` method.

### Reference

MiniWalletImplementation and MiniWallet contracts have been deployed (MiniWalletImplementationV2 is not deployed yet). Anyone can use the following addresses for testing.

MiniWallet contract address: 0xf14d9896ED99896ffc1d342592DC48a25c308d50

MiniWallet contract link: https://sepolia.etherscan.io/address/0xf14d9896ED99896ffc1d342592DC48a25c308d50