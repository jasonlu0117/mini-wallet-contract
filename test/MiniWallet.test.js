const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require("bignumber.js");

describe("MiniWallet", function () {

    /**
     * deploy miniWalletImplementation and miniWallet contract, return the contract instances.
     * @returns 
     */
    async function deployMiniWalletFixture() {
        const [ manager, user, user2 ] = await ethers.getSigners();
        const MiniWallet = await ethers.getContractFactory("MiniWallet");
        const MiniWalletImplementation = await ethers.getContractFactory("MiniWalletImplementation");

        // deploy miniWalletImplementation contract
        const miniWalletImplementation = await MiniWalletImplementation.deploy();
        // deploy miniWallet contract with miniWalletImplementation.address
        const miniWalletProxy = await MiniWallet.deploy(miniWalletImplementation.address);
        const miniWallet = MiniWalletImplementation.attach(miniWalletProxy.address);
        return { manager, user, user2, miniWallet, miniWalletProxy };
    }

    /**
     * deploy a mock usdt contract, return the contract instance.
     */
    async function deployTokensFixture() {
        const USDT = await ethers.getContractFactory("USDT");
        const usdt = await USDT.deploy();
        return { usdt };
    }


    /**
     * unit tests of deploy
     */
    describe("Deploy test", function () {
        describe("Deploy contract test", function () {
            it("Should the manager address in the contract match the deployer address", async function () {
                const { miniWallet, manager } = await loadFixture(deployMiniWalletFixture);
                expect(await miniWallet.manager()).to.equal(manager.address);
            });
        })
    });

    /**
     * unit tests of action functions
     */
    describe("Action function test", function () {

        describe("Deposit test", function () {
            it("Should revert in the following cases when user deposit", async function () {
                const { miniWallet, manager, user } = await loadFixture(deployMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 100;
                const depositAmount = 1000;

                // calling deposit by the manager will result in an exception
                error = "Manager is not able to deposit and withdraw";
                await expect(miniWallet.deposit(usdt.address, depositAmount)).to.be.revertedWith(error);

                // calling deposit with an amount greater than the balance will result in an exception
                error = "ERC20: insufficient allowance";
                await usdt.mint(user.address, mintAmount);
                await expect(miniWallet.connect(user).deposit(usdt.address, depositAmount)).to.be.revertedWith(error);

                // not calling allowance before deposit will result in an exception
                error = "ERC20: transfer amount exceeds balance";
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, depositAmount);
                await expect(miniWallet.connect(user).deposit(usdt.address, depositAmount)).to.be.revertedWith(error);
            });

            it("Should deposit ETH token successfully when user deposit with valid amount", async function () {
                const { miniWallet, user } = await loadFixture(deployMiniWalletFixture);
                const depositAmount = 100;

                // user deposits 100 eth tokens
                await miniWallet.connect(user).deposit(ethers.constants.AddressZero,  depositAmount, { value: depositAmount });
                // user balance should be 100 eth tokens
                var ethBalance = await miniWallet.connect(user).accountBalances(user.address, ethers.constants.AddressZero);
                expect(ethBalance).to.equal(depositAmount)
            })

            it("Should deposit USDT(ERC20) token successfully when user deposit with valid amount", async function () {
                const { miniWallet, user } = await loadFixture(deployMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 10000;
                const depositAmount = 100;

                // mint 10000 tokens for the user and call approve
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, mintAmount);
                // user deposits 100 tokens
                await miniWallet.connect(user).deposit(usdt.address, depositAmount)
                // user balance should be 100 tokens
                var usdtBalance = await miniWallet.accountBalances(user.address, usdt.address);
                expect(usdtBalance).to.equal(depositAmount)
            })
        });

        describe("Withdraw test", function () {
            it("Should revert in the following cases when user withdraw", async function () {
                const { miniWallet, user } = await loadFixture(deployMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 10000;
                const depositAmount = 100;
                const withdrawAmount = 1000;

                // calling withdraw by the manager will result in an exception
                error = "Manager is not able to deposit and withdraw";
                await expect(miniWallet.withdraw(ethers.constants.AddressZero, depositAmount)).to.be.revertedWith(error);

                // calling withdraw with an amount greater than the balance will result in an exception
                error = "Insufficient balance";
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, mintAmount);
                await miniWallet.connect(user).deposit(usdt.address, depositAmount)

                await expect(miniWallet.connect(user).withdraw(usdt.address, withdrawAmount)).to.be.revertedWith(error);
                await expect(miniWallet.connect(user).withdraw(ethers.constants.AddressZero, withdrawAmount)).to.be.revertedWith(error);
            });

            it("Should withdraw ETH token successfully when user withdraw with valid amount", async function () {
                const { miniWallet, user } = await loadFixture(deployMiniWalletFixture);

                const depositAmount = 100;
                const withdrawAmount = 10;

                // user deposits 100 eth tokens
                await miniWallet.connect(user).deposit(ethers.constants.AddressZero,  depositAmount, { value: depositAmount });
                // user withdraw 10 eth tokens
                await miniWallet.connect(user).withdraw(ethers.constants.AddressZero,  withdrawAmount);
                // user balance should be 100 - 10 eth tokens
                var ethBalance = await miniWallet.connect(user).accountBalances(user.address, ethers.constants.AddressZero);
                expect(ethBalance).to.equal(depositAmount - withdrawAmount);
            })

            it("Should withdraw USDT(ERC20) token successfully when user withdraw with valid amount", async function () {
                const { miniWallet, user } = await loadFixture(deployMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 1000;
                const depositAmount = 100;
                const withdrawAmount = 10;

                // mint 10000 tokens for the user and call approve
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, mintAmount);
                // user deposits 100 tokens
                await miniWallet.connect(user).deposit(usdt.address, depositAmount)
                // user withdraw 10 tokens
                await miniWallet.connect(user).withdraw(usdt.address,  withdrawAmount);
                // user balance should be 100 - 10 tokens
                var usdtBalance = await miniWallet.accountBalances(user.address, usdt.address);
                expect(usdtBalance).to.equal(depositAmount - withdrawAmount);
            })
        });
    });

});

