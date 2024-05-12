require("@nomiclabs/hardhat-etherscan");
require('hardhat-contract-sizer');
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    }
  }
};
