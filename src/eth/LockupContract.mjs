import Web3 from "web3";

/* ************************************************************************** */
/* ERC-20 contract Addresses */

const usdtMainnet = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const usdtRopsten = '0x6ee856ae55b6e1a249f04cd3b947141bc146273c';

/* ************************************************************************** */
/* ERC-20 Events */

/*
Transfer(address from, address to, uint256 value)
Emitted when value tokens are moved from one account (from) to another (to).

Note that value may be zero.
*/

const erc20TransferABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "name": "_from",
        "type": "address"
      },
      {
        "indexed": true,
        "name": "_to",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "_value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  }
]

/* ************************************************************************** */
/* Subscriptions for Lockup Events */

// TODO: move this back to relay.js ?

export default class LockupContract {

  constructor (web3, contractAddress, lockupAccountPk) {
    if (!web3) {
      throw Error("missing web3 parameter");
    }
    if (!contractAddress) {
      throw Error("missing contract address parameter");
    }
    if (!lockupAccountPk) {
      throw Error("missing lockup account PK parameter");
    }
    this.web3 = web3;
    this.contractAddress = contractAddress;
    this.lockupAccountPk = lockupAccountPk;
    this.contract = new this.web3.eth.Contract(erc20TransferABI, this.contractAddress);
  }

  // For debugging
  lockupEventsOnce (cb) {
    this.scontract.once('Transfer', {
      filter: { "_to" : this.lockupAccountPk }
    }, cb);
  }

  /* Lockup Events Emitter for a contract and a lockup accont
   */
  lockupEvents () {
    return this.contract.events.Transfer({
      filter: {"_to": this.lockupAccountPk }
    });
  }
}

