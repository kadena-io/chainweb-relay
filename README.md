# Chainweb Relay App


## Setup

1. Install dependencies

```
npm install
```

## Run Relay App on Chainweb Testnet
* To perform Propose and Endorse activities on Chainweb:
  1. Fill in `BOND_NAME` and `PACT_PRIVATE_KEY` in the .env file. (`PACT_PRIVATE_KEY` is the private key of the keypair that guards the bond)
  2. Run `npm start`

## Create Test Transactions on Ethereum Testnet
* Create transfer test transactions
  1. Fill in `INFURA_API_TOKEN`, `ETH_TEST_PUBLIC_KEY`, `ETH_TEST_PRIVATE_KEY`, `ETH_LOCKUP_PUBLIC_KEY`, `ETH_LOCKUP_PRIVATE_KEY` in the .env file.
  2. Run `npm start:tx`
