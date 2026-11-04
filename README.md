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
2. On **Trade**, buy $1,000 of ETH. Portfolio value and PnL update with the price.
3. Open **Leaderboard**. You're ranked by PnL, and transfers don't count toward it.
4. On **Wallet**, send $25 to `@nora`. It works because both usernames live in this app.
5. Still on **Wallet**, look at **Deposit ETH**. To fund this account from MetaMask you have to copy the hex address. Send a small amount on mainnet and watch the onchain balance update; it refreshes every 10 seconds.

Step 5 is the problem the rest of the workshop solves.

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

### Next step: 01-adapter

```sh
git checkout 01-adapter
```

It adds a small read-only API that exposes each username's wallet address and profile, which is what an ENS gateway needs to resolve `happy.<brand>.eth`.
