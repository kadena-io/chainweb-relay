// const { default: Web3 } = require("web3");
// require("@nomiclabs/hardhat-web3");
// require("@nomiclabs/hardhat-ethers");

module.exports = {
  defaultNetwork: "hardhat",
  solidity: {
    version: "0.8.0"
  },
  paths: {
    sources: "./test/eth/contracts/",
    artifacts: "./test/eth/hardhat/artifacts",
    cache: "./test/eth/hardhat/cache",
    tests: "./test/eth/hardhat/tests",
  }
}