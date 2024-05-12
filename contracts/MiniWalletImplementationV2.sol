import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "hardhat/console.sol";
import "./Proxy.sol";

pragma solidity 0.8.9;

contract MiniWalletImplementationV2 is ProxyStorage {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // stores balances of different tokens for different users
    mapping(address => mapping(address => uint256)) public accountBalances;
    // price feeds aggregator
    mapping(address => AggregatorV3Interface) public priceFeedMap;

    // uniswap interface
    IUniswapV2Router02 internal uniswapRouter;
    // tokenAddresses set
    EnumerableSet.AddressSet internal tokenAddresses;

    // reentrant lock status
    uint256 private _status;
    address public manager;

    struct TokenBalance {
        address token;
        uint256 balance;
    }

    /**
     * The initialization method is called only once during deployment
     * @param _uniswap the address of uniswap
     */
    function initialize(
        address _uniswap
    ) external onlyOwner {
        require(manager == address(0), "Already initialized");
        manager = msg.sender;
        uniswapRouter = IUniswapV2Router02(_uniswap);
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

    function getUSDValue() external view returns (uint256) {
        uint256 totalUSDValue = 0;
        for (uint256 i = 0; i < tokenAddresses.length(); i++) {
            // get the balance of the corresponding token
            uint256 tokenBalance = accountBalances[msg.sender][tokenAddresses.at(i)];
            // get the price of the corresponding token
            // no need to calculate value if the balance is 0
            if (tokenBalance > 0) {
                // get the price of the corresponding token
                (uint256 tokenPrice, uint8 decimals) = getLatestPrice(tokenAddresses.at(i));
                // calculate the usd value for the token
                // returned result needs to be divided by the token's decimal places (default to 18 for ERC20) to obtain the value x in USD
                totalUSDValue += tokenBalance * tokenPrice / 10**decimals;
            }
        }
        return totalUSDValue;
    }

    function getLatestPrice(address token) public view returns (uint, uint8) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = priceFeedMap[token].latestRoundData();
        uint8 decimals = priceFeedMap[token].decimals();
        return (uint(price), decimals);
    }

    function setPriceFeed(address token, address priceFeed) external onlyManager {
        priceFeedMap[token] = AggregatorV3Interface(priceFeed);
    }
    
    function swapTokenForTokenWithUniswap(address tokenInAddress, uint256 tokenInAmount, address tokenOutAddress, uint256 tokenOutAmount) public payable onlyUsers returns (uint256 outAmount) {
        IERC20 fromToken = IERC20(tokenInAddress);
        fromToken.transferFrom(msg.sender, address(this), tokenInAmount);
        fromToken.approve(address(uniswapRouter), tokenInAmount);

        address[] memory path;
        path = new address[](2);
        path[0] = tokenInAddress;
        path[1] = tokenOutAddress;

        uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(
            tokenInAmount,
            tokenOutAmount,
            path,
            msg.sender,
            block.timestamp
        );
        // amounts[0] is inAmount, amounts[1] is outAmount
        return amounts[1];
    }
    
    function remit(address target, address token, uint256 amount) external payable onlyUsers {
        // balance needs to be greater than the remit amount
        require(accountBalances[msg.sender][token] >= amount, "Insufficient balance");

        if (token == address(0)) {
            // ETH token remit
            accountBalances[msg.sender][address(0)] -= amount;
            accountBalances[target][address(0)] += amount;
        } else {
            // ERC20 token remit
            accountBalances[msg.sender][token] -= amount;
            accountBalances[target][token] += amount;
        }
    }

    function getAllTokenBalances() external view returns (TokenBalance[] memory) {
        TokenBalance[] memory tokenBalances = new TokenBalance[](tokenAddresses.length());
        for (uint256 i = 0; i < tokenAddresses.length(); i++) {
            // get the balance of the corresponding token
            uint256 balance = accountBalances[msg.sender][tokenAddresses.at(i)];
            TokenBalance memory tokenBalance = TokenBalance({token: tokenAddresses.at(i), balance: balance});
            tokenBalances[i] = tokenBalance;
        }
        return tokenBalances;
    }
    
}