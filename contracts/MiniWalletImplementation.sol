import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";
import "./Proxy.sol";

pragma solidity 0.8.9;

contract MiniWalletImplementation is ProxyStorage {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // stores balances of different tokens for different users
    mapping(address => mapping(address => uint256)) public accountBalances;

    // tokenAddresses set
    EnumerableSet.AddressSet internal tokenAddresses;

    // reentrant lock status
    uint256 private _status;
    address public manager;

    /**
     * The initialization method is called only once during deployment
     */
    function initialize() external onlyOwner {
        require(manager == address(0), "Already initialized");
        manager = msg.sender;
    }

    /**
     * reentrant lock
     */ 
    modifier nonReentrant() {
        // when the method is called for the first time, status is 0
        require(_status == 0, "ReentrancyGuard: reentrant call");
        // all call will fail after that, status change to 1
        _status = 1;
        _;
        // complete call, status return to 0
        _status = 0;
    }

    modifier onlyUsers() {
        require(msg.sender != manager, "Manager is not able to deposit and withdraw");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Only manager not able to set price feed");
        _;
    }

    function deposit(address token, uint256 amount) external payable onlyUsers {
        if (token == address(0)) {
            // ETH token deposit
            require(amount == msg.value, "Invalid deposit amount");
            accountBalances[msg.sender][address(0)] += msg.value;
            if (!tokenAddresses.contains(address(0))) {
                tokenAddresses.add(address(0));
            }
        } else {
            // ERC20 token deposit
            require(amount > 0, "Invalid deposit amount");
            // transfer token to contract
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            accountBalances[msg.sender][token] += amount;
            // store the token contract address
            if (!tokenAddresses.contains(token)) {
                tokenAddresses.add(token);
            }
        }
    }

    function withdraw(address token, uint256 amount) nonReentrant external onlyUsers {
        // balance needs to be greater than the withdrawal amount
        require(accountBalances[msg.sender][token] >= amount, "Insufficient balance");

        if (token == address(0)) {
            // ETH token withdraw
            payable(msg.sender).transfer(amount);
            accountBalances[msg.sender][address(0)] -= amount;
        } else {
            // ERC20 token withdraw
            IERC20(token).safeTransfer(msg.sender, amount);
            accountBalances[msg.sender][token] -= amount;
        }
    }
    
}