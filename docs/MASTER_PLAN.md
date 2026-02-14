# AgenticAiHome × Celaut: Brainstorming Doc
## Ideas & Rough Thinking for the Decentralized AI Service Network

**From:** Cheese (AIH) & Larry 🦞 (AI Ops)  
**For:** Josemi (Celaut Creator)  
**Date:** February 13, 2026  
**Status:** 🧠 Brainstorming — none of this is final, just thinking out loud

---

> *Hey Josemi — this is just us brainstorming. Your architecture is the foundation and we're riffing on how discovery, reputation, and security could layer on top of Celaut. Nothing here is set in stone — tear it apart, push back, tell us what's wrong. We'd rather get it right together than build the wrong thing fast.*

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Smart Contract Architecture](#2-smart-contract-architecture)
3. [Security Hardening — The Unbreakable Layer](#3-security-hardening--the-unbreakable-layer)
4. [Reputation System — Mathematical Foundation](#4-reputation-system--mathematical-foundation)
5. [Execution Verification](#5-execution-verification)
6. [Economic Model](#6-economic-model)
7. [Indexer Architecture](#7-indexer-architecture)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [Known Limitations & Open Risks](#9-known-limitations--open-risks)
10. [Open Questions for Josemi](#10-open-questions-for-josemi)

---

## 1. System Overview

### Architecture: Two Layers, One Network

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│  SvelteKit (static) — deployable on IPFS, GitHub Pages, etc.   │
│  No backend. No database. Unstoppable.                          │
└──────────┬────────────────────────┬─────────────────────────────┘
           │                        │
           ▼                        ▼
┌──────────────────────┐  ┌──────────────────────────────────────┐
│   ERGO BLOCKCHAIN    │  │         CELAUT NODE NETWORK          │
│                      │  │                                      │
│  • Service Request   │  │  • Nodo instances (Ubuntu nodes)     │
│    Boxes (on-chain)  │  │  • Deterministic containers          │
│  • EGO Reputation    │  │  • P2P service orchestration         │
│    Tokens (on-chain) │  │  • gRPC communication                │
│  • Payment Resolution│  │  • Gas-based resource pricing        │
│    (on-chain)        │  │  • Load balancing across peers       │
│  • Delivery Bonds    │  │  • Dependency management             │
│    (on-chain)        │  │                                      │
│  • Insurance Pool    │  │                                      │
│    (on-chain)        │  │                                      │
│  • Treasury fees     │  │                                      │
│    (on-chain)        │  │                                      │
└──────────────────────┘  └──────────────────────────────────────┘

     AgenticAiHome                      Celaut
  (Discovery + Reputation)           (Execution)
```

### Key Principle (from Josemi)

> "The node doesn't know what task it's performing — you can only judge if it provides the resources it says it does."

Services are identified by **hash**, not by name. Nodes are interchangeable commodity compute providers. The node's job is to allocate resources faithfully. The service's job is to produce correct output given those resources.

### Data Flow: Service Request to Completion

```
Step 1: CLIENT                    Step 2: ERGO CHAIN
┌──────────────┐                 ┌──────────────────────┐
│ Choose service│                │ Service Request Box   │
│ hash S        │───creates───▶  │ R4: Service Hash S    │
│ Set payment X │                │ R5: Payment X nanoERG │
│ Set min rep R │                │ R6: Min Reputation R  │
│ Set deadline T│                │ R7: Deadline Block T  │
│               │                │ R8: Client Address    │
└──────────────┘                 └──────────┬───────────┘
                                            │
                                            │ Nodes scan chain
                                            ▼
Step 3: NODE SELECTION            Step 4: EXECUTION
┌──────────────────────┐         ┌──────────────────────┐
│ After block T:        │         │ Selected node runs    │
│ Weighted random       │         │ service S on Celaut   │
│ selection among       │────────▶│ via Nodo framework    │
│ qualifying nodes      │         │ Posts delivery bond   │
│ (rep ≥ R)             │         │ Deterministic exec    │
└──────────────────────┘         └──────────┬───────────┘
                                            │
                                            ▼
Step 5: SETTLEMENT                Step 6: REPUTATION
┌──────────────────────┐         ┌──────────────────────┐
│ Payment resolves:     │         │ Batched rating:       │
│ 99% → Node           │         │ Both parties sign     │
│ 0.9% → Treasury      │         │ rating commitments    │
│ 0.1% → Insurance Pool│         │ off-chain. Settled    │
│ + Gas consumed by     │         │ on-chain periodically │
│   Celaut node         │         │ (every ~100 blocks).  │
│ Bond returned to node │         │ EGO tokens updated.   │
└──────────────────────┘         └──────────────────────┘
```

### What Lives Where

| Data | Location | Why |
|------|----------|-----|
| Service Request (S, X, R, T) | Ergo chain (UTXO box) | Trustless, censorship-resistant |
| EGO Reputation scores | Ergo chain (token boxes) | Verifiable by all, tamper-proof |
| Payment resolution | Ergo chain (contract) | Atomic, no intermediary |
| Delivery bonds | Ergo chain (contract) | Ensures node accountability |
| Insurance pool | Ergo chain (contract) | Funds cross-validation |
| Service binary/container | Celaut network (P2P) | Distributed, hash-addressed |
| Execution runtime | Celaut Nodo instance | Deterministic, resource-metered |
| Service output | Off-chain (client ↔ node) | Too large for chain; hash posted |
| Rating commitments | Off-chain (signed), settled on-chain in batches | Cost-efficient |
| Frontend UI | Static hosting (IPFS/GH Pages) | Unstoppable, no server |

---

## 2. Smart Contract Architecture

### Overview of Required Contracts

We need 7 core ErgoScript contracts. Each is a spending condition on a UTXO box.

### Contract 1: Service Request Box

**Purpose:** Client locks ERG to request execution of service S. Node selection uses **weighted random selection** — probability of winning proportional to reputation among qualifying nodes.

**⚠️ Critical: Payment timing depends on task value.**
- **Tier 0-1 (≤0.1 ERG):** Atomic claim+pay via `claimPath` below. Bond optional. Low stakes make the UX-simplicity tradeoff acceptable.
- **Tier 2+ (>0.1 ERG):** Claim creates a **Payment Resolution Box** (Contract 4) holding the payment in escrow. Payment releases only after delivery confirmation via the **Delivery Bond** (Contract 6). This prevents the "claim and run" attack at scale.

```
┌─────────────────────────────────────────┐
│ SERVICE REQUEST BOX                      │
│                                          │
│ Value:  X nanoERG (payment + fees)       │
│ R0:     Value (auto)                     │
│ R1:     Guard script (this contract)     │
│ R2:     Tokens (empty)                   │
│ R3:     Creation info (auto)             │
│ R4:     Coll[Byte] — Service Hash S      │
│ R5:     Long — Payment amount (nanoERG)  │
│ R6:     Long — Min reputation threshold R│
│ R7:     Int — Deadline block height T    │
│ R8:     SigmaProp — Client public key    │
│ R9:     Coll[Byte] — Parameters hash     │
│         (optional: encrypted task params)│
└─────────────────────────────────────────┘
```

**Spending conditions (ErgoScript logic):**

```scala
{
  val deadline = SELF.R7[Int].get
  val minRep = SELF.R6[Long].get
  val payment = SELF.R5[Long].get
  val clientPk = SELF.R8[SigmaProp].get
  val treasuryAddr = TREASURY_BYTES
  val insuranceAddr = INSURANCE_POOL_BYTES
  
  // --- Weighted Random Selection ---
  // The claim window opens at block T and lasts W blocks.
  // During the window, qualifying nodes register intent via 
  // a commit tx (hash of their address + secret).
  // At block T+W, selection uses the NEXT block header hash
  // as verifiable randomness seed.
  //
  // Selection probability for node_i:
  //   P(node_i) = rep_i / Σ(rep_j) for all qualifying j
  //
  // Implementation: sort qualifying nodes by cumulative rep sum,
  // map randomness into [0, Σrep), select the node whose 
  // cumulative range contains the random value.
  // This is verified on-chain via data inputs of all claimants'
  // EGO boxes + the block header.
  
  val claimPath = {
    HEIGHT >= deadline &&
    HEIGHT < deadline + CLAIM_WINDOW &&
    // Data input 0: claimant's EGO reputation box
    // CRITICAL: verify claimant owns the referenced EGO box
    val claimantPk = CONTEXT.dataInputs(0).R4[SigmaProp].get
    CONTEXT.dataInputs(0).tokens.exists { t =>
      t._1 == EGO_TOKEN_ID && t._2 >= minRep
    } &&
    // Verifiable randomness: use block header at HEIGHT as seed
    // Selection verified by the claim transaction structure
    // (off-chain computed, on-chain verified)
    
    // Payment distribution (0.9% treasury, 0.1% insurance)
    OUTPUTS(0).value >= (payment * 99 / 100) &&          // node
    OUTPUTS(1).value >= (payment * 9 / 1000) &&           // treasury
    OUTPUTS(1).propositionBytes == treasuryAddr &&
    OUTPUTS(2).value >= (payment / 1000) &&               // insurance
    OUTPUTS(2).propositionBytes == insuranceAddr
  } && claimantPk  // claimant must sign (sigma protocol — evaluated separately from boolean checks)
  
  // Client reclaims after extended deadline (T + W + grace)
  val reclaimPath = {
    HEIGHT >= (deadline + CLAIM_WINDOW + GRACE_BLOCKS) &&
    clientPk
  }
  
  claimPath || reclaimPath
}
```

**Weighted random selection explained:**

The "highest rep wins" model creates a monopoly where top nodes capture all work. Instead, we use **reputation-proportional random selection**:

- Let qualifying nodes be {n₁, n₂, ..., nₖ} with reputations {r₁, r₂, ..., rₖ} where each rᵢ ≥ R (the minimum threshold).
- **P(nᵢ wins) = rᵢ / Σⱼrⱼ** for all qualifying nodes j.
- A node with 2× the reputation of another has 2× the probability — but never a guarantee. New nodes with minimum reputation still get a chance.
- **Verifiable randomness** comes from the Ergo block header hash at block T+W+1 (the first block after the claim window closes). Block headers contain the `nonce` and `extensionHash` which are unpredictable before mining. We use `hash(blockHeader || taskBoxId)` as the seed, ensuring per-task uniqueness.
- The selection is deterministic given the seed — any observer can verify the winner.

**System constants (referenced throughout contracts):**

| Constant | Value | Rationale |
|----------|-------|-----------|
| CLAIM_WINDOW | 30 blocks (~1h) | Long enough for global propagation, short enough to avoid stale tasks |
| GRACE_BLOCKS | 60 blocks (~2h) | Gives client time to reclaim after failed selection |
| DECAY_PERIOD | 64,800 blocks (~90 days) | Matches reputation half-life; inactive = stale |
| DECAY_REWARD | 0.0005 ERG | Covers triggerer's tx fee (~0.001 ERG) with small margin; sustainable from box's 0.01 ERG over many cycles |
| MIN_ERG | 0.001 ERG | Minimum task value — below this, tx fees dominate |
| RESPONSE_WIN (R) | 720 blocks (~24h) | Client response window for delivery bond |
| EXEC_WINDOW (E) | 720 blocks (~24h) | Default execution deadline (overridable per task) |

**Tiebreaker for equal reputation:** When two or more nodes have exactly equal reputation in weighted random selection, the randomness seed deterministically resolves selection — equal-weight nodes get equal probability (no separate tiebreaker needed since the hash maps into a continuous range).

**Why this is better than winner-take-all:** It creates a healthy market where reputation is an advantage, not an absolute barrier. New entrants can still win tasks (at lower probability), preventing ossification. This follows the **proportional selection** mechanism used in proof-of-stake systems (Kiayias et al., 2017 — Ouroboros).

### Contract 2: EGO Reputation Token Box

**Purpose:** Soulbound token tracking an address's cumulative reputation score.

```
┌─────────────────────────────────────────┐
│ EGO REPUTATION BOX                       │
│                                          │
│ Value:  0.01 ERG (covers decades of     │
│         storage rent — see §6.5)         │
│ R0:     Value (auto)                     │
│ R1:     Guard script (reputation contract)│
│ R2:     Tokens: [(EGO_TOKEN_ID, score)]  │
│ R3:     Creation info (auto)             │
│ R4:     SigmaProp — Owner public key     │
│ R5:     Long — Cumulative value transacted│
│ R6:     Long — Tier level (0-4)          │
│ R7:     Int — Last activity block height │
│ R8:     Coll[Byte] — Rating history hash │
│         (Merkle root of all ratings)     │
│ R9:     (Long, Long, Int) — Packed:      │
│         (client_rep, node_rep,           │
│          first_active_block)             │
└─────────────────────────────────────────┘
```

**Spending conditions:**

```scala
{
  // EGO boxes can ONLY be spent by the Rating Resolution contract
  // or the Decay mechanism. Soulbound — owner cannot transfer.
  
  val isRatingResolution = {
    OUTPUTS(0).tokens(0)._1 == EGO_TOKEN_ID &&
    OUTPUTS(0).R4[SigmaProp].get == SELF.R4[SigmaProp].get && // same owner
    OUTPUTS(0).propositionBytes == SELF.propositionBytes // same contract
  }
  
  // Decay path: anyone can trigger if inactive for >DECAY_PERIOD blocks
  // Triggerer pays tx fee, receives DECAY_REWARD from the box value
  val decayPath = {
    val lastActive = SELF.R7[Int].get
    val currentScore = SELF.R2[Coll[(Coll[Byte], Long)]].get(0)._2
    val newScore = currentScore * 99 / 100  // 1% decay
    
    HEIGHT > lastActive + DECAY_PERIOD &&
    // Output 0: recreated EGO box with decayed score
    OUTPUTS(0).R2[Coll[(Coll[Byte], Long)]].get(0)._2 == newScore &&
    OUTPUTS(0).R4[SigmaProp].get == SELF.R4[SigmaProp].get &&
    OUTPUTS(0).propositionBytes == SELF.propositionBytes &&
    OUTPUTS(0).value >= SELF.value - DECAY_REWARD &&
    // Output 1: reward to triggerer (incentivized maintenance)
    OUTPUTS(1).value >= DECAY_REWARD
  }
  
  // Top-up path: owner can add ERG to cover future storage rent
  val topUpPath = {
    val ownerPk = SELF.R4[SigmaProp].get
    OUTPUTS(0).value > SELF.value &&  // strictly more ERG
    OUTPUTS(0).tokens == SELF.tokens &&
    OUTPUTS(0).R4[SigmaProp].get == SELF.R4[SigmaProp].get &&
    OUTPUTS(0).propositionBytes == SELF.propositionBytes &&
    ownerPk  // owner must sign
  }
  
  // Migration path: treasury multi-sig can migrate EGO boxes to new contract
  // Gated by time-lock: migration tx must reference a "migration announcement"
  // box that was created at least MIGRATION_DELAY (1000 blocks ≈ ~3.5 days) ago.
  // This gives users time to exit if they disagree with the migration.
  val migrationPath = {
    val migrationBox = CONTEXT.dataInputs(1)  // migration announcement box
    val migrationAge = HEIGHT - migrationBox.R7[Int].get  // announcement block stored in R7
    migrationAge >= 1000 &&  // time-lock: 1000 blocks minimum
    OUTPUTS(0).R4[SigmaProp].get == SELF.R4[SigmaProp].get && // same owner
    OUTPUTS(0).tokens(0)._1 == EGO_TOKEN_ID &&  // preserve token
    OUTPUTS(0).tokens(0)._2 == SELF.tokens(0)._2 &&  // preserve score
    atLeast(2, Coll(TREASURY_PK1, TREASURY_PK2, TREASURY_PK3))  // multi-sig
  }
  
  isRatingResolution || decayPath || topUpPath || migrationPath
}
```

**Storage rent strategy (§6.5):** EGO boxes are initialized with 0.01 ERG — enough for ~50 years of storage rent at current rates. The `topUpPath` lets owners add more ERG if needed. Active participants naturally keep their boxes alive through rating updates. The decay mechanism doubles as garbage collection: truly abandoned boxes eventually lose all value and get collected by storage rent.

**Decay trigger incentive:** Anyone can trigger decay on any EGO box inactive for >DECAY_PERIOD blocks. The triggerer pays the transaction fee (~0.001 ERG) but receives DECAY_REWARD (e.g., 0.0005 ERG) from the box. This creates a self-sustaining maintenance economy — bots can profitably scan for decayable boxes and keep the reputation system clean.

### Contract 3: Rating Resolution (Batched Settlement)

**Purpose:** Cost-efficient rating system using off-chain signed commitments with periodic on-chain settlement.

**The problem with naive commit-reveal:** A full commit-reveal per task requires 4 transactions (2 commits + 2 reveals). At ~0.001 ERG per tx, that's 0.004 ERG overhead per task — significant for Tier 0 tasks worth 0.01 ERG (40% overhead!).

**Solution: Batched rating with sigma-protocol signatures.**

```
Off-Chain Phase (continuous):
  After each task, both parties create signed rating commitments:
    commitment_C = Sign_C(taskId || hash(rating_C || salt_C))
    commitment_N = Sign_N(taskId || hash(rating_N || salt_N))
  
  Commitments are exchanged off-chain (via Celaut P2P or direct).
  Both parties store their counterparty's signed commitment.

On-Chain Settlement (every ~100 blocks, or when batch is full):
  A single settlement transaction includes:
    - Multiple (commitment, reveal) pairs batched together
    - All corresponding EGO box updates
    - Sigma protocol verification of all signatures
  
  Settlement transaction structure:
    Inputs:  [Rating Batch Box] + [EGO Box 1] + [EGO Box 2] + ...
    Outputs: [Updated EGO Box 1] + [Updated EGO Box 2] + ...
    Data Inputs: [Block header for randomness if needed]
```

```
┌─────────────────────────────────────────┐
│ RATING BATCH BOX                         │
│                                          │
│ Value:  Accumulated rating stakes        │
│ R4:     Coll[Byte] — Batch Merkle root   │
│         (root of all commitment pairs)   │
│ R5:     Int — Number of ratings in batch │
│ R6:     Int — Settlement deadline block  │
│ R7:     Coll[Byte] — Aggregated reveals  │
└─────────────────────────────────────────┘
```

**Fallback for non-cooperation:** If one party refuses to provide their signed commitment off-chain, the other party can submit a single on-chain commit-reveal (2 tx) as a fallback. The non-cooperating party receives a default neutral rating and a small reputation penalty for forcing the expensive path.

**Why batching works:** Amortizes the per-task overhead across many tasks. If 50 ratings settle in one batch, the cost per rating drops from ~0.004 ERG to ~0.0001 ERG. Ergo's multi-input/multi-output transactions make this natural — we update many EGO boxes in a single tx.

**Sigma protocol usage:** Ergo's native sigma protocols (Schnorr signatures, AND/OR/THRESHOLD compositions) let us verify that each commitment was genuinely signed by the claimed party without revealing the rating until settlement. The signature proves: "this rating was committed at time T by key K" — preventing post-hoc fabrication.

### Contract 4: Payment Resolution Box

**Purpose:** Holds payment in escrow until delivery is confirmed. **Mandatory for Tier 2+ tasks** (>0.1 ERG). Payment releases only when the client confirms delivery via the Delivery Bond contract (Contract 6), or when the client timeout expires (anti-griefing). Contract 1's `claimPath` handles atomic claim+pay only for Tier 0-1 tasks where the low stakes don't justify the extra step.

```scala
{
  // nodeAddress is embedded at box creation (set during claim)
  val nodeAddress = SELF.R4[Coll[Byte]].get
  val nodePayment = SELF.value * 99 / 100
  val treasuryFee = SELF.value * 9 / 1000    // 0.9%
  val insuranceFee = SELF.value / 1000         // 0.1%
  
  OUTPUTS(0).value >= nodePayment &&
  OUTPUTS(0).propositionBytes == nodeAddress &&
  OUTPUTS(1).value >= treasuryFee &&
  OUTPUTS(1).propositionBytes == TREASURY_BYTES &&
  OUTPUTS(2).value >= insuranceFee &&
  OUTPUTS(2).propositionBytes == INSURANCE_POOL_BYTES
}
```

### Contract 5: Treasury Multi-Sig Box

**Purpose:** 2-of-3 multi-sig holding accumulated platform fees (0.9% of task value).

```scala
{
  val cheese = PK("9f...")
  val josemi = PK("9e...")
  val community = PK("9d...")
  
  atLeast(2, Coll(cheese, josemi, community))
}
```

### Contract 6: Delivery Bond Box

**Purpose:** Node posts a small ERG bond when claiming a task, guaranteeing execution. Prevents "claim and run" attacks with concrete economic penalties.

```
┌─────────────────────────────────────────┐
│ DELIVERY BOND BOX                        │
│                                          │
│ Value:  Bond amount (% of task value)    │
│ R4:     Coll[Byte] — Task ID (request   │
│         box tx hash)                     │
│ R5:     SigmaProp — Node public key      │
│ R6:     SigmaProp — Client public key    │
│ R7:     Int — Execution deadline block   │
│ R8:     Int — Client response deadline   │
│         (= exec deadline + RESPONSE_WIN) │
└─────────────────────────────────────────┘
```

```scala
{
  val nodePk = SELF.R5[SigmaProp].get
  val clientPk = SELF.R6[SigmaProp].get
  val execDeadline = SELF.R7[Int].get
  val responseDeadline = SELF.R8[Int].get
  
  // Store node/client addresses as Coll[Byte] for output matching
  // (SigmaProp cannot be directly compared to propositionBytes;
  //  we use proveDlog and match via sigmaPropBytes serialization)
  val nodeAddr = SELF.R5[SigmaProp].get
  val clientAddr = SELF.R6[SigmaProp].get
  
  // Path 1: Client confirms delivery → bond returned to node
  // Only client signature needed — node address is already in the box (R5)
  // so the contract can enforce OUTPUTS(0) goes to node without node signing
  val deliveryConfirmed = {
    clientPk &&  // client signs confirmation
    OUTPUTS(0).propositionBytes == sigmaPropBytes(nodePk) // bond to node
  }
  
  // Path 2: Client flags non-delivery after exec deadline
  // → bond forfeited to client
  val nonDelivery = {
    HEIGHT > execDeadline &&
    HEIGHT <= responseDeadline &&
    clientPk  // client must sign the flag
    // Bond value goes to OUTPUTS(0) — client constructs the tx
  }
  
  // Path 3: Client doesn't respond by response deadline
  // → bond auto-returns to node (prevents client griefing)
  val clientTimeout = {
    HEIGHT > responseDeadline
    // Anyone can trigger — bond goes to node's address
    // Node address is embedded in the box at creation time
  }
  
  deliveryConfirmed || nonDelivery || clientTimeout
}
```

**Bond sizing (tier-scaled):**

| Tier | Max Task Value | Bond % | Bond Amount | Rationale |
|------|---------------|--------|-------------|-----------|
| 0 | 0.01 ERG | 5% | 0.0005 ERG | Minimal — low stakes |
| 1 | 0.1 ERG | 10% | 0.01 ERG | Moderate deterrent |
| 2 | 1 ERG | 15% | 0.15 ERG | Meaningful capital at risk |
| 3 | 10 ERG | 25% | 2.5 ERG | Serious commitment |
| 4 | 100 ERG | 50% | 50 ERG | Near-equal skin in the game |

The bond percentage **increases with tier** because at higher values the incentive to cheat scales linearly while reputation loss is fixed. A flat 5% bond at Tier 4 would leave a 94 ERG profit from stealing a 100 ERG task — totally inadequate. At 50%, stealing a 100 ERG task yields only ~49 ERG minus destroyed reputation, making it unprofitable (see §9.7 whale-scale analysis).

**Anti-griefing:** The `clientTimeout` path is critical — without it, a malicious client could claim non-delivery, wait forever, and hold the node's bond hostage. The response window (e.g., 720 blocks ≈ 24h) forces the client to act or forfeit their claim.

**Timeline:**
```
Block T+W:     Node wins selection, posts delivery bond
Block T+W+E:   Execution deadline — node must deliver by here
Block T+W+E+R: Response deadline — client must confirm/flag by here
               If client silent → bond returns to node automatically
```

### Contract 7: Insurance Pool Box

**Purpose:** Accumulates 0.1% of all task payments to fund cross-validation re-executions.

```scala
{
  // Spending conditions:
  // 1. Fund a verification re-execution (requires multi-sig or automated trigger)
  // 2. Compensate aggrieved party in unresolvable disputes
  
  // Verification rate adapts to pool balance:
  //   If pool > 10 ERG: verify 5% of tasks
  //   If pool 1-10 ERG: verify 2% of tasks  
  //   If pool < 1 ERG: verify 0.5% of tasks
  //
  // Selection of which tasks to verify uses block header randomness
  // (same mechanism as node selection — verifiable, unpredictable)
  
  val isVerificationSpend = {
    // Must reference a completed task box via data input
    // Must send payment to a second execution node
    // Requires treasury multi-sig approval
    atLeast(2, Coll(cheese, josemi, community))
  }
  
  val isDisputeResolution = {
    // Compensate aggrieved party — requires multi-sig
    atLeast(2, Coll(cheese, josemi, community))
  }
  
  isVerificationSpend || isDisputeResolution
}
```

### Register Layout Summary

| Contract | R4 | R5 | R6 | R7 | R8 | R9 |
|----------|----|----|----|----|----|----|
| Service Request | Service Hash (Coll[Byte]) | Payment (Long) | Min Rep (Long) | Deadline (Int) | Client PK (SigmaProp) | Params Hash (Coll[Byte]) |
| EGO Reputation | Owner PK (SigmaProp) | Cumulative Value (Long) | Tier Level (Long) | Last Active (Int) | Rating Merkle (Coll[Byte]) | (client_rep, node_rep, first_active) (Long, Long, Int) |
| Rating Batch | Batch Merkle (Coll[Byte]) | Batch Count (Int) | Settlement Deadline (Int) | Agg. Reveals (Coll[Byte]) | — | — |
| Delivery Bond | Task ID (Coll[Byte]) | Node PK (SigmaProp) | Client PK (SigmaProp) | Exec Deadline (Int) | Response Deadline (Int) | — |
| Treasury | — | — | — | — | — | — |
| Insurance Pool | — | — | — | — | — | — |

---

## 3. Security Hardening — The Unbreakable Layer

We analyze 12 attack vectors. For each: the attack, why it's dangerous, the defense, and why the defense works.

### 3.1 Sybil Attacks

**Attack:** An adversary creates N fake wallets to manipulate reputation, spam ratings, or dominate node selection.

**Defense — Multi-layered identity cost:**

1. **Minimum stake to register:** Both nodes and clients must lock a minimum ERG deposit. Creating 100 Sybil identities costs 100× the deposit.

2. **Progressive reputation tiers (value-based):** New identities start at Tier 0. Tier progression requires cumulative value transacted AND time gates (see §4.6). The economic cost of bootstrapping a Sybil identity exceeds the potential gain.

3. **Graph analysis (off-chain, fed into reputation):** Detect clusters of addresses with common funding sources, synchronized activity, and mutual rating patterns.

**Why it works:** Let C_sybil = cost to bootstrap one fake identity to Tier k. With value-based tiers:

```
C_sybil(Tier 2) = stake + 1 ERG cumulative transacted + 2000 blocks waiting
                ≈ 0.01 + 1 ERG + ~3 days minimum
                ≈ 1.01 ERG + opportunity cost

V_attack(Tier 2) = max single task at Tier 2 = 1 ERG
```

The cost exceeds the benefit before accounting for detection penalties.

### 3.2 Collusion Rings

**Attack:** Group of M actors coordinate: A requests service from B, B "executes," both rate positively. Repeat across ring members to inflate all reputations.

**Defense — 4-layer detection:**

1. **Repeat-dampening:** The k-th rating between the same pair carries weight 1/k. Enforced by checking the Merkle root of rating history (R8 in EGO box).

2. **Diversity scoring:**
   ```
   diversity_factor = unique_raters / total_ratings
   effective_rep = raw_rep × diversity_factor^α   (α ≈ 0.5)
   ```

3. **Economic cost:** Every "fake" task costs real ERG (task value + 1% fee). Value-based tiers mean farming with micro-tasks doesn't help — you need real cumulative value.

4. **Circular detection:** Rating graph cycles (A→B→C→A) receive progressive dampening via off-chain graph analysis.

**Game theory:** Collusion rings are coordination games with unstable Nash equilibria as M grows. Any member can defect. Meanwhile, value-based tier requirements make the ring's cost proportional to the reputation gained — no shortcuts.

### 3.3 Dishonest Client (Josemi's #1 Concern)

**Attack:** Client receives valid execution, rates it invalid. Gets service for free while damaging node's reputation.

**Defense — 5-mechanism stack:**

1. **Commit-reveal bilateral rating** (via batched settlement): Both rate independently before seeing each other's rating.

2. **Client reputation at stake:** Pattern of negative ratings flags the client. High-rep nodes can refuse low-rep clients.

3. **Stake-to-rate-negative:** Negative rating requires staking Y ERG. If cross-validation sides with node, client loses stake.

4. **Statistical anomaly detection:** Clients with negative-to-positive ratio >2σ above average get flagged; future ratings carry reduced weight (Bayesian update with skeptical prior).

5. **For deterministic services:** Re-execution produces matching output hash → client's claim is provably false. Automatic resolution. Funded by insurance pool (§6.1).

### 3.4 Dishonest Node (Claim and Run)

**Attack:** Node claims ERG and either never executes or delivers garbage output.

**Defense — Delivery Bond + Reputation as collateral:**

1. **Delivery bond (Contract 6):** Node must post a bond (5% of task value) when claiming. Bond is forfeited to client if node doesn't deliver. This creates immediate economic cost for non-execution — no need to wait for reputation effects.

2. **Tiered task access with value-based progression:** Reaching Tier 3 requires 10 ERG cumulative transacted + 5000 blocks active. Cheating on one task destroys that investment.

3. **Time-locked reputation vesting:** Reputation from a completed task vests over 100 blocks (~3 hours). During vesting, a dispute can claw it back.

### 3.5 Front-Running (MEV)

**Attack:** A miner or observer sees a node's claim transaction in the mempool and submits their own claim first.

**Defense — Weighted random selection eliminates front-running incentive:**

1. **Reputation-proportional randomness:** The winner is determined by verifiable randomness from the block header, not by who submits first. Front-running a claim tx is pointless — you can't change your probability of winning.

2. **Claim window + random selection:** During the claim window, nodes register intent. After the window closes, the next block header provides the randomness seed. No one can predict or manipulate the selection before the block is mined.

3. **Ergo's UTXO model advantage:** Transactions specify exact inputs. No global state manipulation — a transaction either spends a specific box or fails.

### 3.6 Reputation Farming

**Attack:** Build reputation cheaply on many micro-tasks, then exploit it on one high-value task.

**Defense — Value-weighted tiers with time gates:**

1. **Cumulative value transacted:** Tier progression requires actual ERG value, not task count. 1000 micro-tasks at 0.001 ERG = 1 ERG cumulative — the same as 1 task at 1 ERG. No shortcut via micro-task spam.

2. **Time gates:** Minimum blocks between tier promotions prevent speed-running.

3. **Tier structure:** See §4.6 for full tier table with thresholds and time gates.

4. **Why this resists micro-task farming:** To reach Tier 2, you need 1 ERG cumulative regardless of how many tasks that takes. The 1% fee means you paid 0.01 ERG to the platform along the way. Time gates add a minimum ~3 days. No volume of 0.001 ERG tasks gets you there faster than the economic reality allows.

### 3.7 Eclipse Attacks

**Attack:** Isolate a node from seeing service requests by controlling its network peers.

**Defense:**

1. **On-chain requests:** Service requests are Ergo UTXO boxes — visible to anyone running an Ergo node. Eclipse attacks on P2P only delay visibility, not prevent it.

2. **Multiple data sources:** Nodes should query multiple Ergo nodes and Explorer endpoints.

3. **Claim window margin:** The claim window ensures temporary delays don't cause missed opportunities.

**Open question for Josemi:** Does Nodo already have peer diversity mechanisms?

### 3.8 Griefing

**Attack:** Lock ERG with impossible parameters to waste node resources evaluating the request.

**Defense:**

1. **Minimum task value** enforced by contract (MIN_ERG ≈ 0.001 ERG).
2. **Ergo transaction fees** make spam expensive.
3. **Lazy evaluation:** Nodes filter client-side — skip unknown service hashes, skip unreasonable parameters. Cost to griefer scales linearly; cost to nodes scales sublinearly.

### 3.9 Race Conditions

**Attack:** Multiple nodes try to claim the same job simultaneously.

**Defense — Weighted random selection eliminates races:**

With the weighted random mechanism, there is no race. All qualifying nodes register during the claim window. Selection is deterministic given the randomness seed. There's exactly one winner per task. Failed claim transactions in Ergo's UTXO model cost nothing (tx simply not included).

### 3.10 Time Manipulation

**Attack:** A miner manipulates block timestamps to game deadline conditions.

**Defense:**

1. **Use block HEIGHT, not timestamp.** Block height is monotonically increasing and consensus-validated. Miners cannot forge block heights.

2. **Reasonable deadline margins** (minimum 60 blocks ≈ 2 hours).

### 3.11 Reputation Laundering

**Attack:** Build reputation on Address A, transfer benefits to Address B.

**Defense:**

1. **Soulbound EGO tokens:** Contract enforces EGO boxes can only be recreated at the same owner address.
2. **Execution address binding:** Claiming node's address must match EGO token owner.
3. **Subcontracting detection:** Consistent A→B payments trigger diversity score reduction.

### 3.12 Free-Riding

**Attack:** Benefit from the network without contributing (e.g., never rating, only taking high-value tasks).

**Defense:**

1. **Rating required for reputation update:** Both parties must participate in rating for either to receive credit.
2. **Activity-based reputation decay:** 1% decay per DECAY_PERIOD blocks without activity. Passive participants lose tier status. Decay can be triggered by anyone (incentivized — see Contract 2).
3. **Value-based tiers:** You can't skip lower tiers. Natural incentive to participate at all levels.

### 3.13 Miner Randomness Manipulation

**Attack:** A miner who is also a node could manipulate the block header to win task selection, since the randomness comes from the block they mine.

**Defense:**

1. **Multi-block randomness:** Instead of a single block header, use `hash(header[T+W+1] || header[T+W+2])` — the XOR or hash of two consecutive block headers. A miner would need to control two consecutive blocks to manipulate selection, which is extremely unlikely.

2. **Economic analysis:** Even if a miner controls one block, they can only bias selection for tasks in that specific claim window. The expected value of winning one additional task (minus the opportunity cost of potentially mining a suboptimal block) makes this attack unprofitable for all but the most valuable tasks.

3. **For high-value tasks (Tier 3+):** Use a longer randomness window (3+ block headers) to make manipulation impractical.

---

## 4. Reputation System — Mathematical Foundation

### 4.1 The Reputation Formula

```
EGO(address) = Σᵢ [ ratingᵢ × value_weightᵢ × diversity_factorᵢ × freshness_factorᵢ × dampening_factorᵢ ]
```

Where for each completed task i:

| Component | Formula | Purpose |
|-----------|---------|---------|
| ratingᵢ | ∈ {-1, 0, +1} | Counterparty's revealed rating |
| value_weightᵢ | log(1 + Vᵢ / V_base) | Higher-value tasks count more |
| diversity_factorᵢ | 1 / count(same_counterparty) | Repeated pairs dampened |
| freshness_factorᵢ | λ^(H_current - Hᵢ) | Older ratings decay (λ ≈ 0.9999/block) |
| dampening_factorᵢ | min(1, outlier_check) | Extreme raters dampened |

### 4.2 Bilateral Ratings Create Nash Equilibrium

Both parties rate each other. Honest rating is a weakly dominant strategy:

```
                    Node Rates Honestly    Node Rates Dishonestly
Client Rates     ┌─────────────────────┬─────────────────────────┐
Honestly         │  (+rep, +rep)       │  (+rep, -rep + stake)   │
                 │  BEST OUTCOME       │  Node loses stake       │
                 ├─────────────────────┼─────────────────────────┤
Client Rates     │  (-rep + stake,     │  (-rep - stake,         │
Dishonestly      │   +rep)             │   -rep - stake)         │
                 │  Client loses stake │  WORST OUTCOME          │
                 └─────────────────────┴─────────────────────────┘
```

This is a **Prisoner's Dilemma with punishment** — the commit-reveal mechanism prevents the coordination needed to sustain mutual dishonesty.

### 4.3 Batched Commit-Reveal Scheme

```
Off-Chain Phase (per task):
  1. Task completes
  2. Client creates: sig_C = Sign(clientKey, taskId || hash(rating_C || salt_C))
  3. Node creates:   sig_N = Sign(nodeKey, taskId || hash(rating_N || salt_N))
  4. Both exchange signed commitments via P2P
  5. After exchange, both reveal ratings + salts to each other off-chain
  6. Both store the full (commitment, reveal) tuple for batch submission

On-Chain Settlement (batched, every ~100 blocks):
  Anyone can submit a batch settlement transaction containing:
  - N (commitment, reveal) pairs with valid signatures
  - Updates to all affected EGO boxes
  - Contract verifies all hashes and signatures in one tx

Fallback (non-cooperation):
  If counterparty refuses to exchange commitments:
  - Submit single on-chain commit (1 tx)
  - Reveal after N blocks (1 tx)  
  - Non-cooperating party gets neutral rating + penalty
  - Cost: 2 tx instead of amortized batch cost
```

**Why sealed-bid style works:** From auction theory (Vickrey 1961, extended by Myerson 1981), sealed-bid mechanisms prevent strategic behavior when participants can't observe each other's actions before committing.

### 4.4 Reputation Decay Function

```
EGO_effective(t) = EGO_raw × λ^(t - t_last_active)
```

Where:
- λ = 0.9999935 per block (≈ half-life of ~90 days)
- t_last_active = block height of last completed task

**Properties:**
- Half-life: ~106,000 blocks ≈ ~90 days of inactivity
- After 30 days (~21,600 blocks): ~87% remains
- After 90 days (~64,800 blocks): ~66% remains
- After 1 year (~262,800 blocks): ~3% remains

**Note on continuous vs discrete decay:** The on-chain decay mechanism (Contract 2) uses a discrete 1% step (`newScore * 99 / 100`) triggered every DECAY_PERIOD blocks. The continuous λ model above is for the indexer's `freshness_factor` calculation. Both decay paths stack: the indexer downweights old ratings continuously, while the on-chain mechanism periodically reduces the stored EGO score for inactive addresses.

**Decay triggering:** Anyone can trigger decay on any inactive EGO box. The triggerer pays the tx fee but receives DECAY_REWARD from the box (see Contract 2). This creates an incentivized maintenance layer — bots can profitably keep the reputation graph clean.

### 4.5 Stake-Weighted Ratings

```
rating_impact = base_impact × log(1 + task_value / 0.01)

Examples:
  0.01 ERG task: impact ≈ 0.69 × base
  0.1 ERG task:  impact ≈ 2.4 × base
  1 ERG task:    impact ≈ 4.6 × base
  10 ERG task:   impact ≈ 6.9 × base
```

Logarithmic scale: high-value tasks count more, but not linearly. Prevents whales from dominating.

### 4.6 Tier System — Economic Modeling

Tiers are based on **cumulative value transacted** and **time active**, not task count. This makes micro-task farming economically equivalent to normal participation.

```
Tier 0 (Open):    max 0.01 ERG  — no requirements
Tier 1 (Novice):  max 0.1 ERG   — 0.1 ERG cumulative + 500 blocks (~17h)
Tier 2 (Skilled): max 1 ERG     — 1 ERG cumulative + 2000 blocks (~3d)
Tier 3 (Expert):  max 10 ERG    — 10 ERG cumulative + 5000 blocks (~7d)
Tier 4 (Elite):   max 100 ERG   — 100 ERG cumulative + 15000 blocks (~21d)
```

**Why cumulative value, not count:**
- 1000 tasks × 0.001 ERG = 1 ERG cumulative = same progress as 1 task × 1 ERG
- No advantage to gaming via micro-transactions
- Time gates prevent rapid artificial progression even with capital
- Positive reputation required — negative-rated tasks don't count toward cumulative value

**On-chain verification:** The EGO box stores cumulative value transacted in R5 and first active block in R9. Tier eligibility is computed as:
```
eligible_for_tier(k) = (R5 >= tier_value_threshold[k]) && 
                       (HEIGHT - R9.first_active >= tier_time_threshold[k]) &&
                       (effective_rep > 0)  // must have net positive reputation
```

### 4.7 Cross-Validation Sampling

For non-deterministic services:

- **Random duplication** funded by insurance pool (§6.1). Verification rate adapts to pool balance.
- **Rater consistency scoring:** Track rating patterns over time. Addresses whose ratings align with cross-validation results get higher weight. This creates a **proper scoring rule** (Brier 1950).

### 4.8 The 6 Anti-Gaming Layers

| Layer | Mechanism | What It Prevents |
|-------|-----------|-----------------|
| 1. Escrow-Gated | Can only rate after real payment + execution | Fake reviews |
| 2. Value-Weighted | Higher-value tasks = more reputation impact | Micro-task farming |
| 3. Repeat-Dampened | k-th interaction with same party: weight 1/k | Self-dealing rings |
| 4. Outlier-Dampened | Extreme raters (all 5s or all 1s) downweighted | Manipulation bots |
| 5. Diversity-Scored | Diverse counterparties = higher effective rep | Collusion clusters |
| 6. Circular-Detected | A→B→C→A rating cycles = progressive dampening | Coordinated rings |

---

## 5. Execution Verification

### 5.1 Deterministic Services (Celaut's Core Strength)

```
Verification Flow:
1. Service request specifies: hash(S), input parameters P
2. Node executes: output O = S(P)
3. Node publishes: hash(O) on-chain (in the claim transaction)
4. Verification: ANY observer can re-execute S(P) and check hash(O)
5. If hash mismatch → node penalized (no dispute needed)
```

**Open question for Josemi:** How cheaply can we trigger a verification re-execution on the Celaut network?

### 5.2 Non-Deterministic Services (LLMs, Creative Work)

1. **Quality bounds verification:** Even non-deterministic services have quality bounds.

2. **Cross-validation sampling:** Random subset of tasks re-executed on a second node. **Funded by the insurance pool** (0.1% of all task payments). Verification rate adapts to pool balance:
   - Pool > 10 ERG: verify 5% of tasks
   - Pool 1-10 ERG: verify 2% of tasks
   - Pool < 1 ERG: verify 0.5% of tasks

3. **Client reputation as proxy:** For subjective quality, the bilateral reputation game provides incentive-compatible rating.

4. **Resource commitment proofs:** Per Josemi's insight — verify that the node committed claimed resources (CPU, GPU, memory) through Celaut's resource tracking.

### 5.3 Timeout and Fallback

```
Timeline:
  Block H₀:      Service request created
  Block T:        Deadline — claim window opens
  Block T+W:      Claim window closes, random selection at T+W+1
  Block T+W+E:    Execution deadline (E ≈ 720 blocks ≈ 24h)
  Block T+W+E+R:  Response deadline for delivery bond (R ≈ 720 blocks)
  Block T+W+E+R+G: Final grace period for reclaim

  If no node claims by T+W: Client reclaims ERG
  If node claims but doesn't deliver by T+W+E: Client flags via bond contract
  If client doesn't respond by T+W+E+R: Bond returns to node automatically
```

### 5.4 Dispute Resolution Flow

```
1. Node delivers output → Client receives it off-chain
2. Both enter rating process (off-chain signed commitments)
3. If client rates negative:
   a. For deterministic services: automatic re-execution check
      → Match: client penalized   → Mismatch: node penalized
   b. For non-deterministic services:
      → Cross-validation triggered (funded by insurance pool)
      → If unresolvable: insurance pool compensates aggrieved party
4. Reputation updated via batched settlement
```

---

## 6. Economic Model

### 6.1 Fee Structure

| Platform | Fee | Our Advantage |
|----------|-----|---------------|
| SingularityNET | 20%+ | No backend costs |
| Fetch.ai | 15-25% | No centralized infrastructure |
| Bittensor | Variable | No validator bottleneck |
| **AgenticAiHome** | **1%** | **Static site + blockchain = near-zero overhead** |

**Fee breakdown (the 1% split):**
- **0.9% → Treasury** (multi-sig, funds development)
- **0.1% → Insurance Pool** (funds cross-validation and dispute resolution)

The treasury accumulates from volume, not margins. The insurance pool creates a self-funding verification layer.

### 6.2 Revenue Flows

```
For a 10 ERG task (Tier 3 — escrow path):

Client pays:    10 ERG (locked in service request)
                + gas deposit (to Celaut node, separate)
Node posts:     2.5 ERG delivery bond (25% — Tier 3 rate)

On claim: 10 ERG moves to Payment Resolution Box (escrow — NOT to node yet)
On delivery confirmation by client:
  Node receives:  9.9 ERG (99%)
  Treasury:       0.09 ERG (0.9%)
  Insurance Pool: 0.01 ERG (0.1%)
  Bond returned:  2.5 ERG (back to node)
  Gas consumed:   Variable (goes to Celaut node operator)
  Gas refund:     Unused gas → back to client

If node doesn't deliver:
  Client flags → bond (2.5 ERG) forfeited to client
  Escrowed 10 ERG returns to client
  Node loses bond + reputation
```

### 6.3 Cost of Attack vs Benefit Analysis

**Standard scale (≤10 ERG tasks):**

| Attack | Cost to Attacker | Max Benefit | Ratio |
|--------|------------------|-------------|-------|
| Sybil (Tier 2) | ≥1 ERG + 3 days | 1 ERG (one task) | ≥1:1 |
| Collusion ring (10 members) | ≥10 ERG value + weeks | Reputation inflation | Diminishing returns |
| Dishonest client | rating stake + reputation | 1 free task | >2:1 |
| Dishonest node (Tier 3) | 2.5 ERG bond + escrowed payment + months of rep | Nothing (payment escrowed) | ∞:1 |
| Reputation farming | linear cost (value-based) | — | No shortcut |
| Front-running | — | — | Impossible (random selection) |
| Miner manipulation | Opportunity cost of suboptimal block | 1 task selection bias | Unprofitable |

**Whale scale (10-100 ERG tasks):**

| Attack | Cost to Attacker | Max Benefit | Defense |
|--------|------------------|-------------|---------|
| Dishonest node (Tier 4, 100 ERG task) | 50 ERG bond + escrowed payment + 15000 blocks rep | Nothing — payment held in escrow until delivery confirmed | Escrow + tier-scaled bond |
| Long con (build rep → steal one task) | 100 ERG cumulative + 21 days + 1 ERG fees | Payment escrowed — must deliver to collect | Escrow makes it pointless |
| Whale Sybil (10,000 ERG capital) | See §9.7 Simulation 4 | Probability-limited by diversity dampening | Anti-Sybil stack |
| Miner + whale node | 30 ERG block reward opportunity cost × blocks needed | Bias selection for one 100 ERG task | Multi-block randomness |

**Why escrow changes everything:** With Tier 2+ mandatory escrow (Contract 4), the "claim and run" attack is impossible — the node never holds the payment until delivery is confirmed. The bond is now pure deterrent against wasting time (theirs and the client's), not the sole defense against theft.

### 6.4 Minimum Viable Stake

```
min_stake > max_single_task_value(Tier 0) × expected_fraud_rate

At Tier 0: max_task = 0.01 ERG, fraud rate ~10%
min_stake > 0.001 ERG → we set min_stake = 0.01 ERG
```

### 6.5 Storage Rent Management

Ergo charges storage rent (~0.00013 ERG per box per 4 years). EGO boxes must persist long-term.

**Strategy: Initialize with sufficient ERG + top-up mechanism.**

- EGO boxes are created with 0.01 ERG — enough for ~300 years of storage rent at current rates.
- The `topUpPath` in Contract 2 lets owners add more ERG if needed (future-proofing against rate changes).
- Active participants naturally refresh their boxes through rating updates (each update recreates the box with current value).
- Abandoned boxes with decayed reputation eventually get collected by storage rent — this is **desired behavior**, not a bug. Dead identities should be cleaned up.

**Why not insurance pool for rent:** Using the pool for rent creates a subsidy that benefits inactive participants. Better to let each identity bear its own storage cost — it's negligible for active participants and appropriately punitive for abandoned ones.

### 6.6 Positive-Sum Game

1. **Honest nodes** build reputation → access higher-value tasks → earn more
2. **Honest clients** build reputation → attract better nodes → get better service
3. **The network** grows → more tasks → more fees → bigger treasury + insurance pool
4. **Dishonest actors** lose bonds, lose reputation, lose access → naturally exit

This is an **evolutionary stable strategy** (Maynard Smith, 1982) — honest behavior cannot be invaded by a small number of dishonest mutants.

---

## 7. Indexer Architecture

### The Decentralization Requirement

Reputation scores must be independently verifiable without trusting any single party. The core claim mechanism uses **data inputs** to reference EGO boxes directly on-chain — no indexer needed for contract execution.

### What Indexers Do (and Don't Do)

**Indexers are NOT needed for:**
- Node selection (contracts reference EGO boxes via data inputs)
- Payment resolution (pure on-chain)
- Bond mechanics (pure on-chain)
- Rating settlement (pure on-chain)

**Indexers ARE needed for:**
- UI: displaying leaderboards, search, service discovery
- Analytics: network statistics, health monitoring
- Convenience: aggregating reputation history for display

### Multi-Indexer Design

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Indexer A   │  │  Indexer B   │  │  Indexer C   │
│  (AIH team)  │  │  (Community) │  │  (Josemi)    │
│              │  │              │  │              │
│  Scans Ergo  │  │  Scans Ergo  │  │  Scans Ergo  │
│  blockchain  │  │  blockchain  │  │  blockchain  │
│              │  │              │  │              │
│  Computes    │  │  Computes    │  │  Computes    │
│  reputation  │  │  reputation  │  │  reputation  │
│  scores      │  │  scores      │  │  scores      │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       ▼                 ▼                 ▼
   All three MUST produce identical results
   (same chain data → same deterministic computation)
   Discrepancies indicate a bug or malicious indexer
```

**Key properties:**

1. **Deterministic computation:** Given the same blockchain state, every indexer MUST compute identical reputation scores. The reputation formula (§4.1) is fully deterministic — no external data or randomness.

2. **Independent operation:** Each indexer scans Ergo independently. No communication between indexers needed. Any disagreement is immediately detectable by comparing outputs.

3. **Permissionless:** Anyone can run an indexer. The computation requires only an Ergo node (or Explorer API access) and the published reputation formula.

4. **Client-side verification:** The static frontend can query multiple indexers and alert the user if results disagree. For critical operations (large task claims), the client can verify the reputation score themselves by scanning the relevant EGO boxes.

5. **No consensus needed:** Indexers don't vote or agree — they independently compute the same deterministic function. If they disagree, at least one has a bug. The chain is the source of truth.

### Indexer API (Standardized)

```
GET /reputation/{address}     → { score, tier, cumulative_value, last_active }
GET /leaderboard?tier={k}     → [{ address, score, tier }]
GET /service/{hash}/providers → [{ address, score, tier, gas_price }]
GET /health                   → { block_height, total_egos, total_tasks }
```

Any indexer implementing this API is compatible with the AIH frontend. Users can switch indexers or run their own.

---

## 8. Implementation Roadmap

### Phase 1: Core Contracts (Weeks 1-4)

**Deliverables:**
- [ ] Service Request Box contract (with weighted random selection) — testnet
- [ ] EGO Reputation Box contract (with decay + top-up) — testnet
- [ ] Delivery Bond contract — testnet
- [ ] Payment Resolution contract (with 0.9%/0.1% split) — testnet
- [ ] Treasury Multi-sig — testnet
- [ ] Insurance Pool Box — testnet
- [ ] Basic claim flow: create → select → bond → execute → settle
- [ ] Unit tests for all spending conditions

**Dependency on Josemi:** We need to agree on the register layouts (§2). Does the proposed structure work with Celaut's existing Ergo payment system?

### Phase 2: Reputation Bootstrap (Weeks 5-8)

**Deliverables:**
- [ ] EGO token minting contract
- [ ] Batched rating settlement contract
- [ ] Reputation indexer (reference implementation, open source)
- [ ] AIH frontend integration: view reputation, submit ratings
- [ ] Tier system implementation (value + time based)

**The cold-start solution:** No genesis reputation needed. Tier 0 requires NO reputation — anyone can claim Tier 0 tasks immediately. Both parties know the node is unreputed. Reputation builds organically:

```
Day 1:  Node joins. Reputation = 0. Can claim Tier 0 tasks (max 0.01 ERG).
Day 2:  Completes 10 Tier 0 tasks. Cumulative value = 0.1 ERG.
        After 500 blocks active → eligible for Tier 1.
Week 2: Completes Tier 1 tasks. Cumulative value reaches 1 ERG.
        After 2000 blocks active → eligible for Tier 2.
...and so on organically.
```

No manual minting. No privileged genesis participants. No admin keys. Fully permissionless from block 0.

### Phase 3: Full Celaut Integration (Weeks 9-16)

**Deliverables:**
- [ ] End-to-end flow: AIH request → Celaut execution → on-chain settlement
- [ ] Gas deposit bridge (AIH escrow → Celaut gas payment)
- [ ] Service hash discovery (browsing available Celaut services)
- [ ] Output hash publication on-chain
- [ ] Deterministic verification (re-execution check via insurance pool)
- [ ] Second indexer deployment (community or Josemi-operated)
- [ ] Mainnet deployment

**Dependency on Josemi:** Close collaboration needed — running Nodo testnet, gas pricing integration, service mapping.

### Phase 4: Advanced Features (Months 4-12)

- [ ] Cross-validation sampling for non-deterministic services
- [ ] Graph analysis for collusion detection
- [ ] Private bidding (sealed envelopes for task execution)
- [ ] Sigma protocol integration (ZK proofs for private reputation — proving "rep ≥ R" without revealing exact score)
- [ ] Cross-chain bridges (if demand)
- [ ] Advanced dispute resolution with multi-party arbitration

**Sigma protocol opportunity:** Ergo's native sigma protocols enable zero-knowledge proofs. A node could prove "I have reputation ≥ R" without revealing their exact score. This is a significant differentiator — no other decentralized AI platform offers ZK-reputation.

---

## 9. Known Limitations & Open Risks

### 9.1 Privacy Considerations

EGO boxes are fully public on-chain. This means:
- **Deanonymization risk:** An address's full task history, counterparties, and transaction volumes are visible. Combined with timing analysis, this could link pseudonymous addresses to real identities.
- **Competitive intelligence:** Nodes can see exactly how much business competitors are doing.
- **Mitigation (Phase 4):** Sigma protocol ZK-reputation (proving "rep ≥ R" without revealing exact score) addresses part of this. Full transaction privacy would require stealth addresses or mixers, which are out of scope for v1 but should be on the roadmap.

### 9.2 Regulatory Risk

- This system facilitates payments between parties for compute services. Depending on jurisdiction, this could be classified as a **money transmitter** or payment processor.
- The treasury accumulates funds under multi-sig control — this has DAO treasury regulatory implications.
- **Mitigation:** The system is permissionless and non-custodial (funds move directly between parties via smart contract, not through an intermediary). The 1% fee is collected by a contract, not a company. Legal review recommended before mainnet.

### 9.3 Small Network Dynamics (N < 10 Nodes)

When the network is small:
- **Weighted random selection degenerates:** With 3 qualifying nodes, the "market" is thin. One node with 2× reputation of others wins ~50% of tasks.
- **Collusion is easier:** 3 of 5 nodes colluding can dominate the reputation graph.
- **Cross-validation is weak:** If the verifier node is also the only other option, independence is questionable.
- **Mitigation:** Tier 0 has intentionally low stakes (max 0.01 ERG) so small-network dynamics have limited blast radius. As the network grows, these issues naturally resolve. The bootstrap phase (§8 Phase 2) should set expectations accordingly.

### 9.4 ERG Price Volatility

Tier thresholds are denominated in ERG, not USD. If ERG price moves dramatically:
- **ERG moons (10×):** Tier 0 max of 0.01 ERG could be worth $1+ — no longer "trivial." Tier 4 max of 100 ERG could be $10K+.
- **ERG crashes:** Tier thresholds become trivially cheap to farm, weakening Sybil resistance.
- **Mitigation:** Tier thresholds should be governance-adjustable (treasury multi-sig can update via a config contract). This is a known centralization trade-off — pure on-chain oracle-based pricing adds complexity and attack surface. For v1, periodic manual adjustment is pragmatic.

### 9.5 Contract Upgrade Path

ErgoScript contracts are immutable once deployed. If bugs are found:
- **Migration pattern:** Deploy new contracts, create a migration transaction that moves EGO boxes from old contract to new contract (requires a migration path in the original contract).
- **⚠️ We should add a migration spending path to Contract 2 (EGO box)** gated by treasury multi-sig + time-lock. This is a safety valve — not ideal for decentralization, but critical for a v1 system that may have bugs.
- **Long-term:** Once contracts are battle-tested, deploy final immutable versions without migration paths.

### 9.6 Mechanism Edge Cases

**minReputation = 0 bypass:** A client can set R6 (min reputation) to 0, allowing any node — including brand-new Sybil identities — to claim their task. This is **by design** for Tier 0: low-value tasks should be open to new entrants. However, the tier system caps the maximum task value per tier, so a minRep=0 task is limited to 0.01 ERG. For higher tiers, the contract should enforce a minimum minRep floor:
```
// In Contract 1: enforce tier-appropriate minimum reputation
val tierMinRep = if (payment <= 10000000L) 0L          // Tier 0: ≤0.01 ERG
                 else if (payment <= 100000000L) 10L    // Tier 1: ≤0.1 ERG
                 else if (payment <= 1000000000L) 100L  // Tier 2: ≤1 ERG
                 else 1000L                             // Tier 3+
minRep >= tierMinRep
```

**EGO box race condition (decay vs claim):** If a triggerer submits a decay transaction on an EGO box at the same time the owner submits a task claim referencing that box as a data input, Ergo's UTXO model handles this cleanly: the claim uses the EGO box as a **data input** (not spent), while decay **spends** the box. Both transactions can be valid — the claim reads the pre-decay score, and the decay recreates the box with reduced score. If the decay tx is confirmed first, the claim's data input reference becomes stale and the claim tx is invalidated. The node would need to resubmit referencing the new (decayed) EGO box. This is a minor UX delay, not a security issue.

**Insurance pool at zero:** If the insurance pool drops below 0.01 ERG (minimum viable for a verification spend), cross-validation pauses — no tasks are randomly selected for re-execution. This means the network operates on pure reputation incentives without active verification. **This is acceptable short-term** because: (1) the pool refills automatically from the 0.1% fee on every task, (2) the bilateral rating game still functions, and (3) delivery bonds still protect against non-delivery. However, prolonged pool exhaustion weakens deterrence against non-deterministic service fraud. The adaptive rate (§5.2) prevents pool exhaustion by reducing verification frequency as the balance drops.

**In-flight tasks during contract migration:** Tasks already in progress (service request created, node selected, execution underway) reference specific contract box IDs. A migration cannot invalidate in-flight tasks because: (1) service request boxes are independent contracts — migration only affects EGO boxes, (2) the migration time-lock (1000 blocks ≈ 3.5 days) provides a wind-down period, and (3) both old and new EGO contracts can coexist during transition. **Recommendation:** The migration announcement should include a "freeze block" after which no new tasks are created against old contracts, while existing tasks complete normally.

### 9.7 Adversarial Simulations

**Simulation 1: Sybil farming to steal a Tier 2 task (attacker has 100 ERG)**

```
Goal: Win a 1 ERG task using fake reputation.
Step 1: Create 10 wallets. Cost: 10 × 0.01 ERG (EGO registration) = 0.1 ERG.
Step 2: Each wallet needs 1 ERG cumulative + 2000 blocks for Tier 2.
        Create circular tasks between wallets: Wallet A → B, B → C, etc.
        Each task: 0.1 ERG × 10 tasks per wallet = 1 ERG per wallet.
        Total: 10 ERG circulated (not lost — but 1% fee = 0.1 ERG lost).
        Time: 2000 blocks minimum = ~3 days.
Step 3: After 3 days, all 10 wallets are Tier 2 with ~1 ERG cumulative.
Step 4: Target a 1 ERG task. Combined probability = 10 × rep / Σrep.

Defense check:
- Repeat-dampening: each wallet pair only interacts once → weight 1/1 ✓
- Diversity factor: each wallet has only 1-2 unique counterparties 
  → diversity_factor ≈ 0.2 → effective_rep crushed by 55% (α=0.5)
- Circular detection: A→B→C→...→A is a textbook ring → progressive dampening
- Net cost: 0.1 ERG fees + 3 days + 10 wallets managed
- Net gain if successful: 1 ERG task (minus 1% fee) = 0.99 ERG
- Net gain with diversity penalty: probability of winning ≈ near-zero 
  (effective rep after dampening is negligible vs honest nodes)

Result: DEFENSE HOLDS. Cost ≈ benefit even without detection; 
with detection, attacker's effective reputation is near-zero.
```

**Simulation 2: Dishonest client steals service (attacker has 100 ERG)**

```
Goal: Get a 10 ERG service for free by claiming non-delivery.
Step 1: Create a service request for 10 ERG task. Lock 10 ERG.
Step 2: Node wins selection, posts 0.5 ERG delivery bond, executes.
Step 3: Receive output. Rate negative ("didn't deliver").
Step 4: For deterministic service → automatic re-execution proves client lied.
        For non-deterministic → cross-validation triggered.

Defense check:
- Stake-to-rate-negative: client must stake Y ERG with negative rating.
- If cross-validation/re-execution sides with node: client loses stake.
- Client reputation damaged → future nodes refuse to serve them.
- Node still has the delivery bond to reclaim if client doesn't respond.
- Timeline: client must flag within RESPONSE_WIN (720 blocks).
  If they flag, dispute process activates. If they don't, bond returns to node.

For deterministic services: attack provably fails (re-execution matches).
For non-deterministic: depends on cross-validation result, but client 
burns stake + reputation either way if fraudulent.

Result: DEFENSE HOLDS for deterministic services (provable).
PARTIAL for non-deterministic (relies on cross-validation + reputation cost).
```

**Simulation 3: Miner manipulates randomness to win tasks (attacker has 100 ERG + mining hardware)**

```
Goal: Control block header to deterministically win task selection.
Step 1: Attacker runs a mining node and has a Tier 2+ AIH identity.
Step 2: A high-value task's claim window is closing at block T+W.
Step 3: Attacker needs to mine block T+W+1 to control the randomness seed.
        With multi-block randomness (hash of 2+ headers), attacker needs 
        to mine T+W+1 AND T+W+2.

Defense check:
- Ergo hashrate: attacker's share = their hashrate / total hashrate.
- Mining one specific block: probability = attacker's hashrate fraction.
  For a small miner: ~1%. For 2 consecutive blocks: ~0.01%.
- Even if they mine the block, they can only try different nonces.
  Each nonce gives a different selection outcome. They'd need to 
  discard valid blocks where they don't win (opportunity cost: block reward).
- Ergo block reward ≈ 30 ERG. Discarding a valid block to win a 
  1 ERG task selection = net loss of ~29 ERG.

Result: DEFENSE HOLDS. Multi-block randomness makes this require 
consecutive block control. Even single-block manipulation is unprofitable 
for any task worth less than the block reward (~30 ERG).
```

**Simulation 4: Whale Sybil attack (attacker has 10,000 ERG, targets a 100 ERG Tier 4 task)**

```
Goal: Maximize probability of winning a 100 ERG task via Sybil reputation.
Capital: 10,000 ERG (~$3,000 at $0.30/ERG, ~$500,000 at $50/ERG).

Step 1: Create N Sybil identities, each needing Tier 4 status.
        Tier 4 requires: 100 ERG cumulative + 15000 blocks (~21 days).
        
Step 2: Fund each identity to Tier 4. Options:
  A) Self-dealing: Circulate ERG among own wallets.
     100 wallets × 100 ERG cumulative = 10,000 ERG circulated.
     Fee cost: 1% × 10,000 = 100 ERG in platform fees.
     Time: 15000 blocks minimum (~21 days) — cannot be parallelized 
     per identity (each needs 15000 blocks of activity).
     
  B) Legitimate work: Actually provide services to build rep.
     This costs time but not ERG (you earn ERG doing real work).
     Slower but builds legitimate-looking reputation.

Step 3: After 21+ days, attacker has up to 100 Tier 4 identities.
        Combined selection probability = 100 × rep / Σrep.

Defense check:
- Diversity factor CRUSHES self-dealing (option A):
  Each wallet interacts with only the attacker's other wallets.
  With 100 wallets: each has ~2-3 unique counterparties out of 99.
  diversity_factor = 3/100 = 0.03 → effective_rep = raw × 0.03^0.5 = raw × 0.17
  → 83% reputation reduction per identity.
  
- Circular detection: 100-node ring is trivially detectable.
  Progressive dampening reduces further.

- After all dampening: 100 identities × 0.17 effective rep each ≈ 
  17 "effective identities" worth of reputation.
  Against a network with 50 honest Tier 4 nodes (each with 
  diversity_factor ~0.8 → effective rep = raw × 0.89):
  Attacker's share ≈ 17 / (17 + 50×0.89) ≈ 17 / 61.5 ≈ 28%.

- Even at 28%: this is a PROBABILITY, not a guarantee.
  72% of the time, an honest node wins. And:
  
- CRITICAL: Even if attacker wins, payment is ESCROWED.
  To collect 99 ERG, attacker must actually deliver the service.
  If they don't deliver: lose 50 ERG bond (Tier 4 rate = 50%) 
  + payment returns to client + all 100 identities flagged.
  
- Net cost of failed attempt: 100 ERG fees + 50 ERG bond + 
  21 days + 100 identities burned = ~150 ERG + massive time.
- Net gain of stealing: 0 ERG (payment is escrowed, never released).

Result: DEFENSE HOLDS. Escrow makes the attack pointless even if 
selection is won. The Sybil investment is pure waste. The attacker 
spent 100 ERG in fees and 21 days to win a 28% chance at... 
delivering a service legitimately (the only way to get paid).
```

**Simulation 5: The Long Con (patient attacker, 10,000 ERG, targets a single 100 ERG task)**

```
Goal: Build LEGITIMATE reputation over months, then steal one massive task.

Step 1: Operate honestly for 6 months as a real node.
        Complete 500+ tasks across all tiers, diverse counterparties.
        Build Tier 4 status with high reputation, high diversity score.
        Cost: 6 months of compute + electricity. Revenue: earned back 
        through legitimate task payments (possibly net positive).

Step 2: Win a 100 ERG task through legitimate high reputation.
        P(winning) is high — legitimately earned reputation.

Step 3: Claim task, post 50 ERG bond (Tier 4 rate).
        Payment moves to escrow (Payment Resolution Box).

Step 4: Attempt to steal.
  Option A: Don't deliver. 
    → Client flags. Bond (50 ERG) forfeited. 
    → Escrowed payment (100 ERG) returns to client.
    → Net: LOSE 50 ERG + 6 months reputation destroyed.
    
  Option B: Deliver garbage.
    → For deterministic service: re-execution proves fraud. 
      Automatic penalty. Lose bond + reputation.
    → For non-deterministic: client rates negative.
      Cross-validation triggered. If fraud detected: lose bond + rep.
      If fraud not detected: gain 99 ERG but reputation damaged.
      Future earning potential destroyed.

Step 5: Economic analysis of Option B (non-deterministic, fraud undetected):
  Gain: 99 ERG (one task payment)
  Loss: 50 ERG bond + future earnings.
  A Tier 4 node earning 5% of tasks at avg 10 ERG/task, 
  10 tasks/day = 0.5 tasks/day × 9.9 ERG = ~5 ERG/day.
  6 months remaining honest earnings ≈ 900 ERG.
  Fraud NPV: 99 - 50 - 900 = -851 ERG.

Result: DEFENSE HOLDS. The long con is irrational because:
1. Escrow prevents immediate theft.
2. The bond makes non-delivery expensive.
3. Destroyed reputation costs far more in future earnings 
   than any single task is worth.
4. For deterministic services: fraud is provable, attack is impossible.
5. Rational node: "I've built a 5 ERG/day income stream. 
   Why would I burn it for 49 ERG net?"
```

**Simulation 6: Coordinated cartel attack (5 well-funded actors, 50,000 ERG total)**

```
Goal: Monopolize high-value tasks on the platform.

Step 1: 5 actors each build legitimate Tier 4 reputation over 3+ months.
        Each operates honestly, builds diverse counterparties.
        Total capital deployed: 50,000 ERG across the group.

Step 2: Cartel members accumulate significant share of total Tier 4 
        reputation. In a network of 50 Tier 4 nodes, 5 cartel members 
        = 10% of nodes. But with higher-than-average reputation 
        (they invested heavily): maybe 20-30% of selection probability.

Step 3: Attack vector A — Price manipulation:
  Cartel members claim tasks and deliver, but at inflated gas prices.
  Defense: Clients choose gas price in the service request. Nodes 
  compete on gas pricing. Cartel would need >50% of qualifying nodes 
  to force clients to accept inflated prices. At 10% of nodes, 
  clients simply get served by the other 90%.
  Result: FAILS — insufficient market share.

Step 4: Attack vector B — Reputation sabotage:
  Cartel members systematically rate honest competitors negatively 
  when they interact as clients.
  Defense: 
  - Commit-reveal prevents strategic rating (can't see node's rating first).
  - Stake-to-rate-negative: each false negative costs staked ERG.
  - Statistical anomaly detection: 5 actors all rating the same 
    nodes negatively = obvious cluster, auto-dampened.
  - Cross-validation can disprove false negative ratings.
  Cost: 5 actors × Y ERG stake per false rating × many ratings = expensive.
  Result: FAILS — too expensive and too detectable.

Step 5: Attack vector C — Selective non-delivery for competitors' clients:
  Cartel wins tasks from specific high-value clients, delivers garbage 
  to drive them away from the platform.
  Defense:
  - Escrow: payment not released. Cartel loses bonds.
  - Bond at Tier 4 = 50%: each sabotage attempt costs 50% of task value.
  - Reputation damage: each failed delivery hurts cartel's rep.
  - 10 sabotage attempts at avg 50 ERG task = 250 ERG in lost bonds.
  Result: FAILS — self-destructive. Cartel burns its own reputation 
  and capital faster than it damages competitors.

Step 6: Attack vector D — Corner the market legitimately:
  Cartel members operate honestly but aggressively, undercutting on 
  gas price to win more tasks and build more reputation.
  Defense: This is... just competition. This is the system working 
  as intended. If they provide good service at low prices, everyone 
  benefits. The weighted random selection ensures they can't capture 
  100% even with high reputation.
  Result: NOT AN ATTACK — this is market competition.

Overall cartel result: No viable attack vector. The escrow system, 
tier-scaled bonds, and reputation-proportional (not winner-take-all) 
selection make coordinated attacks either unprofitable, detectable, 
or indistinguishable from legitimate competition.
```

### 9.8 Whale-Scale Economic Limits

**Does the tier system hold at whale scale?**

The current Tier 4 cap is 100 ERG. The system intentionally does NOT support tasks >100 ERG in v1. Reasoning:

1. **100 ERG is significant** — at $0.30/ERG = $30, at $50/ERG = $5,000. This covers the vast majority of compute tasks.
2. **Tasks >100 ERG should be split.** A 5,000 ERG job is really 50 × 100 ERG subtasks, with progress payments along the way. Splitting reduces single-point-of-failure risk for both parties.
3. **If we ever need Tier 5+:** The governance mechanism (treasury multi-sig config contract, §9.4) can add higher tiers with even stricter requirements — e.g., Tier 5: max 1000 ERG, 1000 ERG cumulative, 50000 blocks (~70 days), 75% bond. But this should be demand-driven, not speculative.

**Does the delivery bond create enough deterrent?**

With tier-scaled bonds (5% → 50% as tiers increase), the deterrent math at Tier 4:
- Steal attempt on 100 ERG task: lose 50 ERG bond + payment returns to client (escrowed) = net loss of 50 ERG + reputation.
- Honest completion: earn 99 ERG + keep bond + keep/grow reputation.
- The honest payoff exceeds the dishonest payoff by **149 ERG** (99 earned vs -50 lost). Deterrent ratio: ~3:1 in favor of honesty.

**Can someone build massive reputation specifically to win one huge task?**

Yes — and they should! Building massive reputation means months of reliable service delivery. By the time they can win a 100 ERG task, they have a proven track record and a profitable business. The "one big heist" is irrational because escrow means they can't take the money without delivering, and their ongoing income stream exceeds any single-task theft (see Simulation 5).

**The ultimate defense is architectural:** Payment escrow for Tier 2+ means the node NEVER has the client's money until delivery is confirmed. You can't steal what you never hold. The bond is additional deterrent on top of an already-secure base.

### 9.9 Cross-Contract Composition Risk (eUTXO-Specific)

Ergo's eUTXO model allows composing transactions that interact with multiple contracts simultaneously. Potential risks:
- A malicious transaction could reference an EGO box as a data input while simultaneously spending it in another input — the data input would reflect stale state. **Mitigation:** Data inputs are read at transaction validation time from the UTXO set, so a box cannot be both a data input and a regular input in the same transaction (Ergo protocol rule).
- **Flash loan equivalent:** Not possible in eUTXO — there's no concept of borrowing within a transaction the way EVM flash loans work. EGO tokens are soulbound and can't be temporarily transferred.

---

## 10. Open Questions for Josemi

### Architecture Questions

**Q1: Deterministic verification cost.** How cheaply can we trigger a re-execution for verification? If verification is cheap, most attack vectors become provably solvable.

**Q2: Resource commitment proofs.** Does Nodo track resource consumption (CPU, GPU, memory, time) programmatically? Crucial for non-deterministic service verification.

**Q3: Service versioning.** When a service is updated, does it get a new hash? Is hash(service) = hash(container binary)?

**Q4: Gas ↔ ERG bridging.** Which aligns best with Celaut's existing payment model: separate gas deposit, combined in service request box, or node-fronted gas?

### Game Theory Questions

**Q5: Gas pricing and reputation.** Should higher-reputation nodes charge more, or should reputation only gate access?

**Q6: Weighted random selection.** We've implemented probability-proportional selection (P = rep_i / Σrep) with multi-block randomness for manipulation resistance (§3.13). The adversarial simulations in §9.7 show this holds from 100 ERG to 50,000 ERG whale-scale attackers. Do you see edge cases we missed — particularly with Ergo's block header structure?

**Q7: Batched ratings.** The off-chain commit + batched settlement pattern reduces per-task cost from ~0.004 ERG to ~0.0001 ERG. Does this work with Ergo's multi-input transaction limits?

### Implementation Questions

**Q8: Testnet Nodo.** Can we get a test instance for integration testing?

**Q9: Service packaging.** Can we test our TypeScript agent packager against a real Nodo instance?

**Q10: Multi-sig treasury.** Would you be a signer? Proposed: Cheese (AIH), Josemi (Celaut), Community Advisor (TBD).

### Philosophical Questions

**Q11: How decentralized is decentralized enough?** With the multi-indexer architecture (§7), indexers are now fully permissionless and verifiable. The only remaining centralization point is the treasury multi-sig — and even that is 2-of-3 with diverse signers. Is this sufficient?

**Q12: Your biggest concern.** What attack vector keeps you up at night? We've analyzed 13 attack vectors in §3 (including miner randomness manipulation) and 6 known limitations in §9, but you know the execution layer better. What have we missed?

---

## Appendix A: Referenced Academic Concepts

| Concept | Reference | Where Used |
|---------|-----------|------------|
| Sealed-bid auctions | Vickrey (1961) | Commit-reveal rating |
| Incentive compatibility | Myerson (1981) | Dishonest client defense |
| Proper scoring rules | Brier (1950) | Cross-validation scoring |
| Evolutionary stable strategies | Maynard Smith (1982) | Positive-sum dynamics |
| Sybil resistance | Douceur (2002) | Identity cost analysis |
| Mechanism design | Hurwicz (1960) | Overall system design |
| Nash equilibrium | Nash (1950) | Bilateral rating game |
| VCG mechanism | Vickrey-Clarke-Groves | Future: private bidding |
| Zero-knowledge proofs | Goldwasser et al. (1985) | Sigma protocol reputation |
| Proportional selection | Kiayias et al. (2017) | Weighted random node selection |

## Appendix B: ErgoScript Registers Quick Reference

Every Ergo box has mandatory registers R0-R3 and optional R4-R9:

| Register | Type | Content |
|----------|------|---------|
| R0 | Long | Value in nanoERG |
| R1 | Coll[Byte] | Guard script (the smart contract) |
| R2 | Coll[(Coll[Byte], Long)] | Tokens: (tokenId, amount) pairs |
| R3 | (Coll[Byte], Int) | Creation info: (txId, outputIndex) |
| R4-R9 | Any | Custom data — our design space |

## Appendix C: Glossary

| Term | Meaning |
|------|---------|
| **Service Hash** | SHA-256 hash identifying a Celaut service (container binary). Nodes are interchangeable. |
| **EGO Token** | Soulbound reputation token on Ergo. Cannot be transferred. Tracks cumulative reputation. |
| **Gas Model** | Josemi's term: nodes price compute resources, clients pay proportionally. Market-driven. |
| **Delivery Bond** | ERG deposit posted by node when claiming a task. Returned on delivery, forfeited on non-delivery. |
| **Insurance Pool** | On-chain pool funded by 0.1% of task payments. Funds cross-validation and dispute resolution. |
| **Weighted Random Selection** | Node selection proportional to reputation: P(nᵢ) = repᵢ / Σrepⱼ. Prevents monopoly. |
| **Reputation-Gated Execution** | Only nodes with sufficient reputation can claim tasks. Higher reputation = higher probability + higher-value access. |
| **Nodo** | Celaut's node software. Handles execution, peer discovery, load balancing, dependencies. |
| **Commit-Reveal** | Two-phase protocol preventing strategic behavior. Off-chain commits, batched on-chain settlement. |
| **Data Input** | Ergo eUTXO feature: reference a box for data without spending it. Used to verify reputation. |
| **Batched Settlement** | Amortizing multiple rating resolutions into a single on-chain transaction for cost efficiency. |

---

*This is a living document. Every mechanism needs stress-testing before implementation. We've tried to be honest about what we know, what we don't, and where we need your expertise.*

*The fundamental principle: at every decision point, the rational choice must be honest behavior. If the math works, the system works.*

**Let's build this together.** 🦞
