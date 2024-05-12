const { checkResultErrors } = require("@ethersproject/abi");
const { config } = require("dotenv");
const { ethers } = require("hardhat");

// address of uniswap on sepolia
const uniswap = "0x425141165d3DE9FEC831896C016617a52363b687";
// address of price feed (eth/usd)
const ethUSDPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306"

const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const DAI = "0xb4f1737af37711e9a5890d9510c9bb60e170cb0d";

async function main() {
    
    const [ manager, user, user2 ] = await ethers.getSigners();
    console.log("Deploying contracts with the manager:", manager.address);
    console.log("The user address:", user.address);
    console.log("The user2 address:", user2.address);

    var miniWalletAddress = "0xf14d9896ED99896ffc1d342592DC48a25c308d50";
    var usdtAddress = "0xEac57585d04f01E055504eE0580e204a0ed68cc1";
    var mintAmount = 10000;
    var depositAmount = 100;
    var withdrawAmount = 20;
    var remitAmount = 30;

    // Retrieve the contract instance by using the proxy contract address
    const MiniWalletImplementation = await ethers.getContractFactory("MiniWalletImplementation");
    const miniWalletImplementation = await MiniWalletImplementation.attach(miniWalletAddress);

    // After deploying implementationV2, use this contract instance again
    const MiniWalletImplementationV2 = await ethers.getContractFactory("MiniWalletImplementationV2");
    const miniWalletImplementationV2 = await MiniWalletImplementationV2.attach(miniWalletAddress);

    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.attach(usdtAddress);

    // deposit and withdraw testing

    // await mintERC20Tokens(user, mintAmount);
    // await approveERC20TokenAllowance(user, mintAmount);
    // await depositERC20Tokens(user, usdt.address, depositAmount); // deposit 100
    // await getAccountBalance(user, usdt.address); // balance should be 100
    // await withdrawERC20Tokens(user, usdt.address, withdrawAmount); // withdraw 20
    // await getAccountBalance(user, usdt.address); // balance should be 80

    // await depositETHTokens(user, depositAmount); // deposit 100
    // await getAccountBalance(user, ethers.constants.AddressZero); // balance should be 100

    // remit and get all balances testing
    
    // await remitETHTokens(user, user2, remitAmount); // remit 30
    // await remitERC20Tokens(user, user2, usdt.address, remitAmount); // remit 30

    // await getAllTokenBalances(user2); // balance should be 30
    // await withdrawETHTokens(user2, withdrawAmount); // withdraw 20
    // await withdrawERC20Tokens(user2, usdt.address, withdrawAmount); // withdraw 20
    // await getAllTokenBalances(user2); // balance should be 10

    // await withdrawERC20Tokens(user2, usdt.address, 30); // withdraw 10
    // await depositETHTokens(user2, 100000000000000); // deposit 100000000000000

    // await setEthUsdPriceFeed();
    // await getUSDValue(user2);


    async function mintERC20Tokens(account, mintAmount) {
        console.log("Start mint erc20 token...");
        var transaction = await usdt.mint(account.address, mintAmount);
        console.log("transactionId: ", transaction.hash);
    }

    async function approveERC20TokenAllowance(account, mintAmount) {
        console.log("Start approve erc20 token...");
        var transaction = await usdt.connect(account).approve(miniWalletAddress, mintAmount);
        console.log("transactionId: ", transaction.hash);
    }

    async function depositERC20Tokens(account, tokenAddress, depositAmount) {
        console.log("Start deposit erc20 token...");
        var transaction = await miniWalletImplementation.connect(account).deposit(tokenAddress, depositAmount)
        console.log("transactionId: ", transaction.hash);
    }

    async function withdrawERC20Tokens(account, tokenAddress, withdrawAmount) {
        console.log("Start withdraw erc20 token...");
        var transaction = await miniWalletImplementation.connect(account).withdraw(tokenAddress, withdrawAmount)
        console.log("transactionId: ", transaction.hash);
    }

    async function depositETHTokens(account, depositAmount) {
        console.log("Start deposit eth token...");
        var transaction = await miniWalletImplementation.connect(account).deposit(ethers.constants.AddressZero,  depositAmount, { value: depositAmount });
        console.log("transactionId: ", transaction.hash);
    }

    async function withdrawETHTokens(account, withdrawAmount) {
        console.log("Start withdraw eth token...");
        var transaction = await miniWalletImplementation.connect(account).withdraw(ethers.constants.AddressZero, withdrawAmount)
        console.log("transactionId: ", transaction.hash);
    }

    async function remitETHTokens(sourceAccount, targetAccount, remitAmount) {
        console.log("Start remit eth token...");
        var transaction = await miniWalletImplementation.connect(sourceAccount).remit(targetAccount.address, ethers.constants.AddressZero, remitAmount)
        console.log("transactionId: ", transaction.hash);
    }

    async function remitERC20Tokens(sourceAccount, targetAccount, tokenAddress, remitAmount) {
        console.log("Start remit erc20 token...");
        var transaction = await miniWalletImplementation.connect(sourceAccount).remit(targetAccount.address, tokenAddress, remitAmount)
        console.log("transactionId: ", transaction.hash);
    }

    async function getAccountBalance(account, tokenAddress) {
        var balance = await miniWalletImplementation.connect(account).accountBalances(account.address, tokenAddress);
        console.log("balance: ", balance);
    }

    async function getAllTokenBalances(account) {
        var balances = await miniWalletImplementationV2.connect(account).getAllTokenBalances();
        console.log("balances: ", balances);
    }

    async function setEthUsdPriceFeed() {
        var transaction = await miniWalletImplementation.setPriceFeed(ethers.constants.AddressZero, ethUSDPriceFeed);
        console.log("transactionId: ", transaction.hash);
    }

    async function getUSDValue(account) {
        var usdValue = await miniWalletImplementation.connect(account).getUSDValue();
        console.log("usdValue: ", usdValue);
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });