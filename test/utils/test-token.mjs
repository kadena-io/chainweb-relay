import Web3 from 'web3';

/* ************************************************************************** */
/* Compile with HardHat */

/* requires: 
 * npm install --save-dev @openzepplin/contracts
 */

import hre from "hardhat";

async function compileTestToken() {
  console.debug("compiling TestToken...");
  await hre.run("compile");
  console.debug("...compiled TestToken");
}

/* ************************************************************************** */
/* Deploy Test Token */

async function deployTestToken(web3, from) {

  await compileTestToken();
  console.debug("deploying TestToken...");
  const arts = await hre.artifacts.readArtifact("TestToken");

  const factory = new web3.eth.Contract(arts.abi, { from: from});
  const transaction = factory.deploy({ 
    from: from,
    data: arts.bytecode 
  });

  const pending = transaction.send({
    // from: accounts[0],
    gas: 1500000,
    gasPrice: '30000000000000'
  });

  const contract = await pending;
  contract.defaultAccount = from;
  console.debug("...deployed TestToken")
  return contract;
}

/* ************************************************************************** */
/* create Test Token */

export default async function createTestToken(web3) {
  const accounts = await web3.eth.getAccounts();
  const contract = await deployTestToken(web3, accounts[0]);

  // fund accounts
  for (const r of accounts) {
    await contract.methods.mint(r, 10000).send();
  }

  return {
    contract: contract,
    accounts: accounts,
    address: contract.options.address,
    
    async mint  (to, value) {
      return await contract.methods.mint(to, value ?? 1000).send();
    },

    async transfer(to, value) {
      return await contract.methods.transfer(to, value).send();
    },

    async balanceOf(addr) {
      return await contract.methods.balanceOf(addr).call().then(x => BigInt(x));
    },

    advanceBlock() {
      return new Promise((resolve, reject) => {
        const arg = {
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: new Date().getTime(),
        }
        web3.currentProvider.send(arg, (err, res) => err ? reject(err) : resolve(res));
      });
    },
  };
}
