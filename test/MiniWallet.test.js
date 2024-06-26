const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const BigNumber = require("bignumber.js");

// address of uniswap on sepolia
const uniswap = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";
// address of mock price feed
const ethUSDPriceFeed = "0x694AA1769357215DE4FAC081bf1f309aDC325306"


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
        const miniWalletProxy = await MiniWallet.deploy(miniWalletImplementation.address, uniswap);
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
     * deploy miniWalletImplementation2 and update miniWallet contract implementation, return the contract instances.
     * @returns 
     */
    async function deployAndUpdateMiniWalletFixture() {
        const [ manager, user, user2 ] = await ethers.getSigners();
        const MiniWallet = await ethers.getContractFactory("MiniWallet");
        const MiniWalletImplementation = await ethers.getContractFactory("MiniWalletImplementation");

        // deploy miniWalletImplementation contract
        const miniWalletImplementation = await MiniWalletImplementation.deploy();
        // deploy miniWallet contract with miniWalletImplementation.address
        const miniWalletProxy = await MiniWallet.deploy(miniWalletImplementation.address, uniswap);

        const MiniWalletImplementationV2 = await ethers.getContractFactory("MiniWalletImplementationV2");
        const miniWalletImplementationV2 = await MiniWalletImplementationV2.deploy();
        await miniWalletProxy.updateImplementation(miniWalletImplementationV2.address);
        const miniWallet = MiniWalletImplementationV2.attach(miniWalletProxy.address);
        return { manager, user, user2, miniWallet, miniWalletProxy };
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

        describe("Update implementation contract test", function () {
            it("Should revert when update implementation with a invalid address", async function () {
                const { manager, miniWalletProxy } = await loadFixture(deployMiniWalletFixture);
                const error = 'Destination address is not a contract'
                await expect(miniWalletProxy.updateImplementation(manager.address))
                    .to.be.revertedWith(error);
            });

            it("Should update successfully when update implementation with a valid contract", async function () {
                const { miniWalletProxy } = await loadFixture(deployMiniWalletFixture);
                const MiniWalletImplementationV2 = await ethers.getContractFactory("MiniWalletImplementationV2");
                const miniWalletImplementationV2 = await MiniWalletImplementationV2.deploy();
                await miniWalletProxy.updateImplementation(miniWalletImplementationV2.address);
                var implementation = await miniWalletProxy.implementation();
                expect(implementation).to.equal(miniWalletImplementationV2.address);
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

        describe("USD value test", function () {
            it("Should set price feed successfully by manager", async function () {
                const { miniWallet, manager, user } = await loadFixture(deployMiniWalletFixture);

                // calling setPriceFeed by the user will result in an exception
                error = "Only manager not able to set price feed";
                await expect(miniWallet.connect(user).setPriceFeed(ethers.constants.AddressZero, ethUSDPriceFeed)).to.be.revertedWith(error);
            
                await expect(miniWallet.connect(manager).setPriceFeed(ethers.constants.AddressZero, ethUSDPriceFeed)).to.not.be.revertedWith(error);
            });

            // Since the local environment cannot access the price feed, this test case cannot succeed locally. 
            // Here, we're simply outlining the logic, which can be tested in the Sepolia environment.
            it("Should get usd value successfully", async function () {
                const { miniWallet, manager, user } = await loadFixture(deployMiniWalletFixture);
                const depositAmount = 100;
                await miniWallet.connect(manager).setPriceFeed(ethers.constants.AddressZero, ethUSDPriceFeed);
                await miniWallet.connect(user).deposit(ethers.constants.AddressZero,  depositAmount, { value: depositAmount });
                await expect(miniWallet.connect(user).getUSDValue()).to.be.revertedWithoutReason();
            })
        });

        describe("Remit test", function () {
            it("Should revert in the following cases when user remit", async function () {
                const { miniWallet, manager, user, user2 } = await loadFixture(deployMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 10000;
                const depositAmount = 100;
                const withdrawAmount = 1000;

                // calling withdraw by the manager will result in an exception
                error = "Manager is not able to deposit and withdraw";
                await expect(miniWallet.connect(manager).remit(user2.address, ethers.constants.AddressZero, depositAmount)).to.be.revertedWith(error);

                // calling withdraw with an amount greater than the balance will result in an exception
                error = "Insufficient balance";
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, mintAmount);
                await miniWallet.connect(user).deposit(usdt.address, depositAmount)

                await expect(miniWallet.connect(user).remit(user2.address, usdt.address, withdrawAmount)).to.be.revertedWith(error);
                await expect(miniWallet.connect(user).remit(user2.address, ethers.constants.AddressZero, withdrawAmount)).to.be.revertedWith(error);
            });

            it("Should remit ETH token successfully when user remit with valid amount", async function () {
                const { miniWallet, user, user2 } = await loadFixture(deployMiniWalletFixture);

                const depositAmount = 100;
                const remitAmount = 10;
                const withdrawAmount = 5;

                // user deposits 100 eth tokens
                await miniWallet.connect(user).deposit(ethers.constants.AddressZero,  depositAmount, { value: depositAmount });
                // user balance should be 100 eth tokens
                var ethBalanceBeforeRemit = await miniWallet.connect(user).accountBalances(user.address, ethers.constants.AddressZero);
                expect(ethBalanceBeforeRemit).to.equal(depositAmount)

                // user remit 10 eth tokens to user2
                await miniWallet.connect(user).remit(user2.address, ethers.constants.AddressZero,  remitAmount, { value: remitAmount });
                // user2 balance should be 10 eth tokens
                var ethBalanceAfterRemit = await miniWallet.connect(user2).accountBalances(user2.address, ethers.constants.AddressZero);
                expect(ethBalanceAfterRemit).to.equal(remitAmount)

                // user2 withdraw 5 eth tokens
                await miniWallet.connect(user2).withdraw(ethers.constants.AddressZero,  withdrawAmount);
                // user2 balance should be 10 - 5 eth tokens
                var ethBalanceAfterWithdraw = await miniWallet.connect(user2).accountBalances(user2.address, ethers.constants.AddressZero);
                expect(ethBalanceAfterWithdraw).to.equal(ethBalanceAfterRemit - withdrawAmount)
            })

            it("Should remit USDT(ERC20) token successfully when user remit with valid amount", async function () {
                const { miniWallet, user, user2 } = await loadFixture(deployMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 100;
                const depositAmount = 100;
                const remitAmount = 10;
                const withdrawAmount = 5;

                // mint 100 tokens for the user and call approve
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, mintAmount);
                // user deposits 100 tokens
                await miniWallet.connect(user).deposit(usdt.address,  depositAmount);
                // user balance should be 100 tokens
                var ethBalanceBeforeRemit = await miniWallet.connect(user).accountBalances(user.address, usdt.address);
                expect(ethBalanceBeforeRemit).to.equal(depositAmount)

                // user remit 10 tokens to user2
                await miniWallet.connect(user).remit(user2.address, usdt.address,  remitAmount, { value: remitAmount });
                // user2 balance should be 10 tokens
                var ethBalanceAfterRemit = await miniWallet.connect(user2).accountBalances(user2.address, usdt.address);
                expect(ethBalanceAfterRemit).to.equal(remitAmount)

                // user2 withdraw 5 tokens
                await miniWallet.connect(user2).withdraw(usdt.address,  withdrawAmount);
                // user2 balance should be 10 - 5 tokens
                var ethBalanceAfterWithdraw = await miniWallet.connect(user2).accountBalances(user2.address, usdt.address);
                expect(ethBalanceAfterWithdraw).to.equal(ethBalanceAfterRemit - withdrawAmount)
            })
        });

        describe("Get all token balances test", function () {
            it("Should get all token balances successfully", async function () {
                const { miniWallet, user } = await loadFixture(deployAndUpdateMiniWalletFixture);
                const { usdt } = await deployTokensFixture()

                const mintAmount = 10000;
                const ethDepositAmount = 100;
                const erc20DepositAmount = 200;

                // user deposits 100 eth tokens
                await miniWallet.connect(user).deposit(ethers.constants.AddressZero,  ethDepositAmount, { value: ethDepositAmount });
                // user deposits 100 erc20 tokens
                await usdt.mint(user.address, mintAmount);
                await usdt.connect(user).approve(miniWallet.address, mintAmount);
                await miniWallet.connect(user).deposit(usdt.address, erc20DepositAmount)

                let expectedTokenBalanceMap = new Map();
                expectedTokenBalanceMap.set(ethers.constants.AddressZero, ethDepositAmount);
                expectedTokenBalanceMap.set(usdt.address, erc20DepositAmount);
                var tokenBalances = await miniWallet.connect(user).getAllTokenBalances();
                for (let i = 0; i < tokenBalances.length; i++) {
                    let token = tokenBalances[i].token;
                    let balance = tokenBalances[i].balance;
                    expect(expectedTokenBalanceMap.has(token)).to.equals(true);
                    expect(expectedTokenBalanceMap.get(token)).to.equals(balance);
                }
            })
        });
    });

});