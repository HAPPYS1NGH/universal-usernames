# Universal usernames with ENS

Workshop repo for the talk "Who owns your username? Building portable identity with ENS".

Each branch is one step. Check out a branch and follow its README.

| Branch | Step |
| --- | --- |
| `00-app` | A trading app with sealed, in-app usernames |
| `01-adapter` | A read-only endpoint that exposes usernames |
| `02-gateway` | A CCIP-Read gateway that signs answers |
| `03-resolver` | The resolver contract and the ENS setup on mainnet |
| `main` | The finished demo |

## Step 00: the app

Tradepit is a small paper-trading app. You sign up with a username and get $10,000 of demo cash to trade ETH/USD at the live Coinbase price. Every account also gets an embedded wallet: a real Ethereum mainnet address whose private key the server generates and stores encrypted.

### Avatars

Tap your avatar in the top bar to change it. Pick an emoji on a colored circle, or upload a photo. Until you do, you get a generated avatar: your initial on a gradient derived from your username.

Uploads stay in the app. Before uploading, the browser crops the photo to a 512×512 JPEG, which also strips EXIF data like GPS location. The server reads the format and size from the file's bytes and accepts JPEG, PNG, WebP or GIF, up to 512 KB and 64 to 2048 pixels a side. Photos are stored in the SQLite database, on the same volume as everything else, and `/api/avatar/<username>` serves them to the app's pages. Emoji and generated avatars are drawn in the page itself.

### The problem: sealed usernames

Inside the app you can send cash to `@happy`. Outside it, the name means nothing. MetaMask can't send to "happy", so to deposit ETH you copy a 42-character hex address from the wallet page. The username lives in one app's database, and nothing else can read it.

### Prerequisites

- Node.js 22.18 or newer, the `engines` range in `package.json`
- pnpm through Corepack, which ships with Node. Run `corepack enable` once, because the root scripts call `pnpm` directly.
- OpenSSL, to generate the encryption key
- [Foundry](https://getfoundry.sh) (`cast` and `forge`), from step 02 onward

### Setup

```sh
corepack enable
pnpm install
cp app/.env.example app/.env
openssl rand -hex 32   # paste the output into WALLET_ENCRYPTION_KEY in app/.env
pnpm db:seed           # creates the SQLite database and 7 demo traders
pnpm dev               # http://localhost:3000
```

The database is created on first use at `app/data/app.db`. It holds encrypted wallet keys, so it stays out of git, and so does `app/.env`. If you lose `WALLET_ENCRYPTION_KEY`, you lose access to any ETH sent to the embedded wallets.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BRAND_NAME` | `Tradepit` | App name shown in the UI |
| `DATABASE_PATH` | `./data/app.db` | SQLite file, relative to `app/` |
| `WALLET_ENCRYPTION_KEY` | none, required | 32-byte hex key for AES-256-GCM encryption of wallet keys |
| `RPC_URL` | `https://ethereum-rpc.publicnode.com` | Ethereum mainnet RPC for deposit balances |
| `APP_URL` | `http://localhost:3000` | Public URL of the app |

### Demo script

1. Open `/` and create an account, for example `happy`.
2. Tap your avatar in the top bar and pick an emoji or a photo.
3. On **Trade**, buy $1,000 of ETH. Portfolio value and PnL update with the price.
4. Open **Leaderboard**. You're ranked by PnL, and transfers don't count toward it.
5. On **Wallet**, send $25 to `@nora`. It works because both usernames live in this app.
6. Still on **Wallet**, look at **Deposit ETH**. To fund this account from MetaMask you have to scan the QR code or copy the hex address. Send a small amount on mainnet and watch the onchain balance update; it refreshes every 10 seconds.

Step 6 is the problem the rest of the workshop solves.

### Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the app in development mode |
| `pnpm db:seed` | Create demo traders (skips ones that exist) |
| `pnpm test` | Run the unit tests |
| `pnpm check` | Lint, typecheck and test |
| `pnpm --filter app build` | Production build (`output: "standalone"`) |
| `pnpm wallet:sweep <username> <toAddress> [--yes]` | Send a user's whole embedded-wallet balance on mainnet to `toAddress`. Prints a dry run unless you pass `--yes` |

`wallet:sweep` decrypts a real private key and moves real mainnet ETH: run the dry run first and check the destination address.

### Run it in production

`app/Dockerfile` packages the standalone server. Any Docker host that serves HTTPS works, Fly.io for example. Build from the repository root:

```sh
docker build -f app/Dockerfile -t tradepit-app .
docker run -d --name tradepit -p 3000:3000 -v tradepit-data:/data \
  -e WALLET_ENCRYPTION_KEY=<64 hex characters> \
  -e APP_URL=https://tradepit.example.com \
  tradepit-app
docker exec tradepit node scripts/seed.cjs   # optional: the demo traders
```

| Variable | In production |
| --- | --- |
| `WALLET_ENCRYPTION_KEY` | Required. Back it up: without it, ETH sent to the embedded wallets is lost |
| `DATABASE_PATH` | The image sets `/data/app.db`. It must be an absolute path on a persistent volume |
| `APP_URL` | The app's public HTTPS URL |
| `RPC_URL` | Optional. Your own mainnet RPC |
| `BRAND_NAME` | Optional. Defaults to `Tradepit` |

Why absolute: `server.js` switches to its own folder when it starts, so a relative path quietly creates a new, empty database inside the container. That's also why `app/.env` can't go to `--env-file` as is: its `DATABASE_PATH` is relative.

The container runs as the `node` user (uid 1000), and the volume must be writable by it. The image has no tsx. The seed script is bundled as `scripts/seed.cjs` instead: run it inside the app container, like the `docker exec` line above.

## Step 01: the username adapter

This step adds one public endpoint, `GET /api/ens/{label}`. Given a username, it returns the records ENS needs: the wallet address and a few text records. The CCIP-Read gateway in the next step calls it to answer queries for `happy.<brand>.eth`.

The adapter is read-only and narrow on purpose. The gateway never touches the database. It only sees what this endpoint returns, and everything it returns ends up public through ENS anyway. Private keys, cash balances and trade history stay in the app. The app is still the system of record, and nothing about usernames goes onchain.

```sh
curl -s http://localhost:3000/api/ens/hodl-queen
```

```json
{
  "name": "hodl-queen",
  "address": "0xC4E135d0B6F041DFB342cf94E0C4123f7304cb5e",
  "texts": {
    "description": "Rank #1 on Tradepit · +25.6% PnL",
    "url": "http://localhost:3000/u/hodl-queen",
    "avatar": "http://localhost:3000/api/avatar/hodl-queen"
  }
}
```

Your seeded wallets have their own addresses, and PnL moves with the ETH price, so your output will differ.

| Response | When |
| --- | --- |
| `200` with the body above, `Cache-Control: public, max-age=30` | The username exists |
| `404 {"error":"not_found"}` | Valid label, no such user |
| `400 {"error":"invalid_label"}` | The label breaks the username rules (3 to 20 characters, `a-z`, `0-9`, single inner hyphens, not reserved) |

Two routes back the text records:

- `GET /api/avatar/{label}` returns the avatar the user picked in step 00: their uploaded photo, or their emoji drawn on its color as SVG. Everyone else gets a generated SVG whose colors come from a hash of the username. Once a user picks an avatar, `texts.avatar` ends in `?v=<timestamp>`, so the record changes with the picture and ENS apps don't keep showing a cached one.
- `/u/{username}` is a public profile page with rank, PnL, portfolio value and wallet address. On your own profile, tapping the avatar changes it.

Usernames on the leaderboard now link to their profile pages.

### Next step: 02-gateway

```sh
git checkout 02-gateway
```

It adds the CCIP-Read gateway, which turns ENS queries into calls to this adapter and signs the answers.

## Step 02: the CCIP-Read gateway

This step adds `gateway/`, a small server that answers ENS lookups for `<username>.<parent>.eth`. A wallet sends it the original `resolve(name, data)` call. The gateway checks the name, asks the adapter from step 01 for the profile, ABI-encodes the record the wallet asked for and signs it with an expiry. The resolver contract in step 03 accepts only answers signed by this key.

The gateway never touches the database. It only knows what `/api/ens/{label}` returns.

### Setup

```sh
pnpm install
cp gateway/.env.example gateway/.env
cast wallet new        # dedicated signer: put the private key in SIGNER_PRIVATE_KEY
```

Set `ENS_PARENT_NAME` to the name you own. Keep the signer address: the resolver needs it in step 03. The signer is not your deployer or owner key.

### Run it next to the app

```sh
pnpm dev               # app on http://localhost:3000
pnpm dev:gateway       # gateway on http://localhost:8080
```

### Try it

Build the calldata a resolver would send for `addr(nora.tradepit.eth)` and ask the gateway. `nora` is one of the traders `pnpm db:seed` created:

```sh
DNS_NAME=0x$(printf '\004nora\010tradepit\003eth\000' | od -An -tx1 | tr -d ' \n')
CALL=$(cast calldata "resolve(bytes,bytes)" $DNS_NAME $(cast calldata "addr(bytes32)" $(cast namehash nora.tradepit.eth)))
curl -s http://localhost:8080/0x5615deb798bb3e4dfa0139dfa1b3d433cc23b72f/$CALL.json
```

The response is `{"data": abi.encode(result, expires, signature)}`. [gateway/README.md](gateway/README.md) explains the request flow, what each record returns, the error rules and how to deploy the gateway with Docker.

### Next step: 03-resolver

```sh
git checkout 03-resolver
```

It adds the resolver contract and the mainnet setup that points your parent name at this gateway.

## Step 03: the resolver and the mainnet setup

This step adds `contracts/OffchainResolver.sol`, an [ENSIP-10](https://docs.ens.domains/ensip/10) wildcard resolver. You set it once on your parent name. It sends wallets to the gateway with an `OffchainLookup` error and accepts an answer only if it hasn't expired and the gateway's signer signed it. That makes two onchain transactions for the whole app, and none per user.

It works on ENSv1 and ENSv2. The resolver interface didn't change in ENSv2. What changes is which contract you call to set the resolver on the parent, and the `parent-setup` script works that out for you.

### 1. Put the app and the gateway on HTTPS

Wallets call the gateway from browsers, and some go through ENS's hosted batch gateway. Both need a public HTTPS URL. The gateway also needs to reach the app's `/api/ens/{label}`. [gateway/README.md](gateway/README.md#deploy) has the Docker setup.

### 2. Deploy the resolver

```sh
cd contracts
forge soldeer install
cast wallet import deployer --interactive    # owner key, kept in a Foundry keystore
cp .env.example .env                         # GATEWAY_URL, SIGNER_ADDRESS, MAINNET_RPC_URL
forge script script/Deploy.s.sol --rpc-url mainnet                                  # dry run
forge script script/Deploy.s.sol --rpc-url mainnet --account deployer --broadcast  # deploy
```

`GATEWAY_URL` is `https://<gateway host>/{sender}/{data}.json`, with the placeholders kept as they are.

### 3. Point the parent name at it

```sh
MAINNET_RPC_URL=<rpc> pnpm parent-setup tradepit.eth <resolver address>
```

This read-only script works out whether the name is ENSv1 unwrapped, ENSv1 wrapped or ENSv2, and prints the exact `cast send` to run from the wallet that owns the name. You can also set a custom resolver in [app.ens.domains](https://app.ens.domains).

> [!WARNING]
> Migrating a name to ENSv2 clears its ENSv1 resolver. If you migrate later, set the resolver again in the migration or right after it.

### 4. Check it

```sh
MAINNET_RPC_URL=<rpc> pnpm check-name happy.tradepit.eth
```

This resolves the name through the ENS Universal Resolver, the same way a wallet does, and prints the address and text records.

### 5. Show the ENS name in the app

Set `ENS_PARENT_NAME=tradepit.eth` in `app/.env` and restart the app. The wallet page now shows `happy.tradepit.eth` above the hex deposit address, and the leaderboard and profiles show each user's full name.

Every new sign-up now has a working ENS name the moment its row is written.

[contracts/README.md](contracts/README.md) has the details: Etherscan verification, every `setResolver` variant, why the resolver works on both ENS versions, and how to move the gateway or rotate the signer.
