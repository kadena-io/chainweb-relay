// test/eth/contracts/TestToken.sol
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor() ERC20("TestToken", "TT") {}

    function mint(address to, uint256 value) public returns (bool) {
        _mint(to, value);
        return true;
    } 
}