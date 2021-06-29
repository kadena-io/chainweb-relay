# Chainweb Relay App

## Setup

Install dependencies

```
npm install
```

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

*   `INFURA_API_TOKEN`
*   `BOND_NAME`
*   `PACT_PRIVATE_KEY`

Usually set via default environment:

*   `ETH_NETWORK_ID`
*   `ETH_CONTRACT_ADDR`
*   `ETH_LOCKUP_PUBLIC_KEY`

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
npm start
```

### Docker

```sh
docker build -t relay-app
docker run -e INFURA_API_TOKEN=... -e BOND_NAME=... -e PACT_PRIVATE_KEY=... relay-app
```

or provide the settings via an local `.env` file:

```sh

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
