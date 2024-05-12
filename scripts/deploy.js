const { constants } = require("buffer");
const { ethers } = require("hardhat");
const BigNumber = require('bignumber.js');

// address of uniswap on sepolia
const uniswap = "0x425141165d3DE9FEC831896C016617a52363b687";

async function main() {

    const [ manager, user, user2 ] = await ethers.getSigners();
    console.log("Deploying contracts with the manager:", manager.address);
    console.log("The user address:", user.address);
    console.log("The user2 address:", user2.address);
    
    // await deployMiniWalletImplementation();
    var miniWalletImplementationAddress = "0x8A6AE815Fc93543c3E0D952180c01cDa4B463DAf";
    
    await deployMiniWallet(miniWalletImplementationAddress);
    // var miniWalletAddress = "0x663C578EAEd13D5809D72dEb9E9211D709F19DD8";

    // await deployMockUSDT();
    // var usdtAddress = "0xEac57585d04f01E055504eE0580e204a0ed68cc1";

    // await deployMiniWalletImplementationV2();
    // var miniWalletImplementationV2Address = "0xd48Fae1A62574A703D32E91306fCFb4B1F98AaF9";
    // await updateMiniWalletImplementation(miniWalletAddress, miniWalletImplementationV2Address);
}

async function deployMiniWalletImplementation() {
    // deploy implementation contract
    console.log("Start to deploy wallet implementation contract.");
    const MiniWalletImplementation = await ethers.getContractFactory("MiniWalletImplementation");
    const miniWalletImplementation = await MiniWalletImplementation.deploy();
    console.log("wallet implementation address:", miniWalletImplementation.address);
}

async function deployMiniWallet(miniWalletImplementationAddress) {
    // deploy contract
    console.log("Start to deploy wallet contract.");
    const MiniWallet = await ethers.getContractFactory("MiniWallet");
    const miniWallet = await MiniWallet.deploy(miniWalletImplementationAddress, uniswap);
    console.log("miniWallet address:", miniWallet.address);
}

async function deployMiniWalletImplementationV2() {
    // deploy implementationV2 contract
    console.log("Start to deploy wallet implementationV2 contract.");
    const MiniWalletImplementationV2 = await ethers.getContractFactory("MiniWalletImplementationV2");
    const miniWalletImplementationV2 = await MiniWalletImplementationV2.deploy();
    console.log("wallet implementationV2 address:", miniWalletImplementationV2.address);
}

async function updateMiniWalletImplementation(miniWalletAddress, miniWalletImplementationV2Address) {
    // update implementation contract
    const MiniWallet = await ethers.getContractFactory("MiniWallet");
    const miniWallet = await MiniWallet.attach(miniWalletAddress);
    console.log("Start to update wallet implementation contract.");
    await miniWallet.updateImplementation(miniWalletImplementationV2Address);
    console.log("miniWallet address:", miniWallet.address);
}

async function deployMockUSDT() {
    // deploy mock usdt contract
    console.log("Start to deploy usdt contract.");
    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.deploy();
    console.log("usdt address:", usdt.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });