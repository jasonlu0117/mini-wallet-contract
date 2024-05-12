require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
require("@nomicfoundation/hardhat-toolbox");

const RPC_API_KEY = "arDGQcmyCggKeO3wibKbMeimPLKrDrw4"
const ETHERSCAN_API_KEY = "X5MTFTJVKGJ33SZIJS8C1PEZIZXTBG3H86"
const PRIVATE_KEY_MANAGER = "1111111111111111111111111111111111111111111111111111111111111111";
const PRIVATE_KEY_USER = "1111111111111111111111111111111111111111111111111111111111111111";
const PRIVATE_KEY_USER2 = "1111111111111111111111111111111111111111111111111111111111111111";

module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/" + RPC_API_KEY,
      chainId: 11155111,
      accounts: [PRIVATE_KEY_MANAGER, PRIVATE_KEY_USER, PRIVATE_KEY_USER2]
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY
    }
  }
};