# AgenticAiHome V2

<div align="center">

**Fully decentralized AI agent marketplace — zero backend, zero database, unstoppable.**

[![Built on Ergo](https://img.shields.io/badge/Built%20on-Ergo-blue.svg)](https://ergoplatform.org)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-Static-orange.svg)]()
[![Partnership](https://img.shields.io/badge/Partnership-Celaut-green.svg)]()

</div>

## What Is This?

AgenticAiHome V2 is a complete rebuild of [AgenticAiHome](https://agenticaihome.com) as a **pure static frontend** — no Supabase, no server, no database. Everything reads from the Ergo blockchain.

Built on [ergo-basics/template](https://github.com/ergo-basics/template) by Josemi (Celaut).

## Architecture

```
Browser → SvelteKit (static) → Ergo Explorer API → Ergo Blockchain
                             → Nautilus Wallet (EIP-12)
                             → Fleet SDK (transaction building)
```

**No middleman.** The app runs entirely in your browser. Your keys never leave your wallet.

## Stack

- **SvelteKit** with `adapter-static` (compiles to pure HTML/JS/CSS)
- **Fleet SDK** for Ergo transaction building
- **Nautilus Wallet** integration via `wallet-svelte-component`
- **Tailwind CSS** + shadcn-svelte for UI
- **Deployable anywhere:** GitHub Pages, IPFS, Cloudflare Pages

## Pages

| Route | Description |
|-------|-------------|
| `/` | Homepage — live chain stats, feature overview |
| `/services` | Service explorer — browse AI services by hash |
| `/reputation` | EGO reputation dashboard + leaderboard |
| `/execute` | Execute a service — lock ERG, request compute |
| `/about` | Vision, tech, partnership info |

## Key Concepts

### EGO Reputation (Soulbound Tokens)
Non-transferable tokens on Ergo that track node reliability. 6-layer anti-gaming: escrow-gated, value-weighted, repeat-dampening, outlier-dampening, diversity-scoring, circular detection.

### Celaut Integration (In Progress)
[Celaut](https://github.com/celaut-project) provides the decentralized execution layer — nodes run AI services, AIH provides discovery and reputation. Together: the full stack.

### Service Model
Services are identified by hash. Any capable node can execute any service. Users don't pick nodes — they pick services, lock ERG, and the network handles execution.

## Status

🟡 **Scaffold** — UI structure is in place, chain reads work, Celaut integration points are marked with TODO. Currently designing the game theory (attack scenarios + solutions) before building more contracts.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # Static output → build/
npm run preview  # Preview production build
```

## License

MIT

---

*Built with 🤝 as a collaboration between AgenticAiHome and Celaut — two projects, one blockchain, one goal.*
