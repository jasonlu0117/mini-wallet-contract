import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
pragma solidity 0.8.9;

/**
 * Mock USDT used for testing
 */
contract USDT is ERC20 {
    constructor() ERC20("usdt", "USDT") {}

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return 6;
    }
}
