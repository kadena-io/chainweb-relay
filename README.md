# Chainweb Relay App

## What is it?

This is a small server application to power Kadena bridges. The first iteration
supports bridging transactions from Ethereum. 

The application can:
- Listen to Ethereum token contracts for transfers into a designated "locker" address.
- For selected transfers, retreive header information from Ethereum in order to "propose" it to the relay smart contract on Kadena
- Respond to proposals to validate headers by quering Ethereum and asserting they match. 

## Who needs it?

Bonders in the Kadena Chain Relay need to endorse enough headers in their bond lockup period in order to
- earn a per-endorsement fee
- qualify for risk fees in the form of APY

Thus bonders either need to operate the software themselves, or have a service provider like Flux operate the software on their behalf.

## Prerequisites for running the software

A given instance of the software runs for a single bond, and must be configured with the private key that governs the bond.

### Rotating the bond key

Bonders who have purchased bonds on relay.chainweb.com using their KDA public key should NOT expose their public key to this software.
Instead, bonders should **rotate their bond to a dedicated keypair just for bond administration** as this will protect their KDA account.

Rotating can be achieved by 
1. Generating a keypair
2. Using the "rotate bond" button on relay.chainweb.com for the appropriate bond.


## Usage

### Configuration

Configuration is done either

*   by creating an `.env` file,
*   by setting respective environment variables, or
*   by using docker and providing the settings as environment variables to
    the container.

Default environment:

*   `DEFAULT_ENV` (`production|ropsten|kovan`, default: `kovan`)

Required settings for relay-app:

*   `INFURA_API_TOKEN`: api token for connecting to Infura servers
*   `BOND_NAME`: the bond name as seen in relay.chainweb.com
*   `PACT_PRIVATE_KEY`: the private key for administering the bond, as described above in "Rotating the bond key" section.

Usually set via default environment:

*   `ETH_NETWORK_ID`: network identifier for mainnet or various testnets. Default is `kovan`
*   `ETH_CONTRACT_ADDR`: Contract address for observing transfers.
*   `ETH_LOCKUP_PUBLIC_KEY`: Lockup address for observing transfers.
*   `ETH_CONFIRMATION_DEPTH` (default for mainnet is 20)
*   `PACT_CONFIRMATION_DEPTH` (default for mainnet is 10)

All other settings are mainly for debugging and testing purposes or when
non-default API servers are used (other then infura.io or api.chainweb.com).

Template for `.env` file:

```sh
DEFAULT_ENV=kovan
INFURA_API_TOKEN=

# Relay-app settings
# BOND_NAME=
# PACT_PRIVATE_KEY=

# Only for testing with lockup transfers
ETH_TEST_PRIVATE_KEY=

# For testing with docker compose: second bonder
BOND_NAME_2=
PACT_PRIVATE_KEY_2=
```

### Command Line

```sh

npm install # if needed
npm start

```

### Docker

```sh
docker build -t relay-app
docker run -e INFURA_API_TOKEN=... -e BOND_NAME=... -e PACT_PRIVATE_KEY=... relay-app
```

or provide the settings via an local `.env` file:


```sh
docker run -v "$PWD/.env:/app/.env:ro" relay-app
```

## Generating Test Lockup Transfers

Required settings for testing with lockup transfers

*   `INFURA_API_TOKEN`
*   `ETH_TEST_PRIVATE_KEY`

```sh
npm start:tx
```

or via docker as

```sh
docker build -t lockup-transfers -f test/Dockerfile .
docker run -e INFURA_API_TOKEN=... -e ETH_TEST_PRIVATE_KEY=... lockup-transfers
```

## Testing With Docker Compose

1. Create `.env.test` and fill out the respective settings:

```
INFURA_API_TOKEN=
ETH_TEST_PRIVATE_KEY=

# First bonder
BOND_NAME=
PACT_PRIVATE_KEY=

# Second bonder
BOND_NAME_2=
PACT_PRIVATE_KEY_2=
```

2. Build docker containers

```sh
docker compose build
```

3. Run tests

```sh
docker compose --env-file .env.test up
```
