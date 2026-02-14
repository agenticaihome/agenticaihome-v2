# AIH Build Priorities (Draft)

*What to build first, and why. Audited for feasibility — open for discussion.*

*Companion docs: [ONE_PAGER.md](./ONE_PAGER.md) | [TECHNICAL_DESIGN.md](./TECHNICAL_DESIGN.md)*

---

## Phase 1: Foundation (Weeks 1-4)

These five things make AIH usable. Everything else is premature without them.

### 1. Agent SDK v0.1

**The SDK is the product.** Agents won't compose raw ErgoScript transactions. A TypeScript library that wraps the full lifecycle is the #1 unlock.

```
aih.discover(serviceHash)
aih.postTask(service, input, payment)
aih.pollReceipt(taskId)
aih.rate(receiptId, score)
```

Wraps Ergo Explorer API + Nautilus transaction building. Rough is fine — just make it callable.

**Why first:** Without this, only humans use AIH. With it, any agent framework can plug in.

### 2. Explorer Dashboard

One static page combining three views:

- **Node Scorecard** — paste a node address, see: tasks completed, avg rating, tier, active bond, total earnings. All from Explorer API.
- **Task Activity Feed** — recent TaskEscrowBox creations, claims, receipts, ratings. Shows the marketplace has a pulse.
- **Protocol Metrics** — total tasks, total ERG transacted, active nodes, insurance pool balance.

**Why:** Credibility. Operators need to see if running a node is profitable. Partners need to see the marketplace is alive. One afternoon per view.

### 3. Service Template Registry

A JSON file (GitHub → IPFS) mapping common services to their content hashes, input schemas, and suggested pricing:

```json
{
  "llm-chat-7b": {
    "hash": "abc123...",
    "inputSchema": { "prompt": "string", "maxTokens": "number" },
    "suggestedPrice": "0.01 ERG",
    "avgLatency": "2-5s"
  }
}
```

Agents import this as a lookup table. No on-chain storage needed yet — just a convention that agents and nodes agree on. Move on-chain when there are 50+ services.

**Why:** Reduces boilerplate to zero. An agent posts a task by referencing a template ID instead of configuring from scratch. De facto standards create lock-in.

### 4. On-Chain Seed Derivation

```
seed = H(block_header ‖ task_id ‖ input_hash)
```

Derived entirely from on-chain data, used as the random seed for inference. Same task always produces the same output (for deterministic services like embeddings, classification, fixed-temperature LLM).

Encoded in the TaskEscrowBox. Verifier nodes can replay with the same seed and compare outputs bit-for-bit.

**Why:** This is AIH's real technical differentiator. Makes verification of deterministic services nearly free. Already designed in the verification docs — just needs implementation in ErgoScript.

### 5. Failure Receipt Auto-Refund

When a FailureReceiptBox is published (node timeout, execution error, canary mismatch), the client's ERG is automatically refunded. Implemented as either:

- A simple off-chain bot that watches for FailureReceiptBoxes and submits refund transactions
- A convenience method in the SDK: `aih.claimRefund(taskId)`

**Why:** Table stakes. An agent that posts a task and gets stuck on a failure won't come back. Refunds must be frictionless.

---

## What We're NOT Building Yet (and Why)

| Feature | Why Not Now |
|---------|------------|
| Dutch auction pricing | Requires task volume to find equilibrium. With 5 nodes, just set prices manually. |
| EGO staking for priority | Rich-get-richer loop. New nodes can never compete. Needs anti-centralization caps. |
| Subscription channels | Pre-optimizing for recurring relationships that don't exist yet. |
| Output marketplace (cached resale) | Basically building a CDN + search engine. Massive scope. |
| Service chaining / pipelines | Atomic multi-step DAGs hit eUTXO transaction size limits. Research project. |
| Sigma ZK reputation proofs | Solution looking for a problem. Nodes with great rep WANT it public. |
| NIPoPoW light clients | No other UTXO chains with AI marketplaces to bridge to. 2+ years out. |
| Governance voting | Zero EGO holders, no contentious parameters. Just set good defaults. |
| Referral bounties | Sybil magnet. 10 wallets "referring" themselves. |
| Dispute resolution panels | Entire protocol unto itself (see: Kleros). Way later. |

---

## Phase 2: Growth (Months 2-3)

*Build these once Phase 1 is live and you have real usage data:*

- **Reputation decay** — `last_active_block` in reputation boxes, weight decays after N blocks of inactivity
- **Batch task posting** — SDK helper for N tasks in one transaction (save gas on bulk operations)
- **Dry-run / quote endpoint** — agents query "how much would this cost?" via Celaut P2P before posting
- **Composable service templates** — move the registry on-chain once there are enough services to justify it
- **Earnings dashboard for operators** — historical earnings, ROI calculator, hardware benchmarks

## Phase 3: Network Effects (Months 4+)

*Only relevant with 20+ active nodes and consistent task volume:*

- Dutch auction pricing (now you have data for decay rates)
- Reputation portability via NFT (other Ergo dApps can read it)
- One-click Celaut node setup (Josemi)
- Auto-pricing based on network data (Josemi)
- EGO governance for protocol parameters

---

## Design Principle

> Build for 5 nodes and 50 tasks. See what breaks. Then build the next thing.

Features that require volume to work (auctions, governance, subscriptions) are waste until you have volume. Features that CREATE volume (SDK, dashboard, templates) come first.
