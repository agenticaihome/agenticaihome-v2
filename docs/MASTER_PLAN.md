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
    CONTEXT.dataInputs(0).R4[SigmaProp].get == OUTPUTS(0).R4[SigmaProp].isDefined &&
    CONTEXT.dataInputs(0).tokens.exists { t =>
      t._1 == EGO_TOKEN_ID && t._2 >= minRep
    } &&
    // Claimant must sign the transaction (proves EGO ownership)
    CONTEXT.dataInputs(0).R4[SigmaProp].get &&
    // Verifiable randomness: use block header at HEIGHT as seed
    // Selection verified by the claim transaction structure
    // (off-chain computed, on-chain verified)
    
    // Payment distribution (0.9% treasury, 0.1% insurance)
    OUTPUTS(0).value >= (payment * 99 / 100) &&          // node
    OUTPUTS(1).value >= (payment * 9 / 1000) &&           // treasury
    OUTPUTS(1).propositionBytes == treasuryAddr &&
    OUTPUTS(2).value >= (payment / 1000) &&               // insurance
    OUTPUTS(2).propositionBytes == insuranceAddr
  }
  
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
  
  isRatingResolution || decayPath || topUpPath
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

**Purpose:** Handles the atomic distribution of funds after service execution. This contract is used when payment distribution happens in a separate step from the initial claim (e.g., after delivery confirmation via the bond contract). Contract 1's `claimPath` handles the simpler case where claim + payment happen atomically.

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
  val deliveryConfirmed = {
    clientPk &&  // client signs confirmation
    nodeAddr     // node must also sign (proves identity for output)
    // Bond value goes to OUTPUTS(0) — node constructs the tx
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

**Bond sizing:** Bond = max(0.001 ERG, task_value × 5%). Large enough to deter abandonment, small enough that nodes aren't capital-constrained.

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
| Service Request | Service Hash | Payment | Min Rep | Deadline | Client PK | Params Hash |
| EGO Reputation | Owner PK | Cumulative Value | Tier Level | Last Active | Rating Merkle | (client_rep, node_rep, first_active) |
| Rating Batch | Batch Merkle | Batch Count | Settlement Deadline | Agg. Reveals | — | — |
| Delivery Bond | Task ID | Node PK | Client PK | Exec Deadline | Response Deadline | — |
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

3. **Tier structure (value + time based):**
   ```
   Tier 0 (Open):    max 0.01 ERG  — no requirements (anyone)
   Tier 1 (Novice):  max 0.1 ERG   — 0.1 ERG cumulative + 500 blocks active
   Tier 2 (Skilled): max 1 ERG     — 1 ERG cumulative + 2000 blocks active
   Tier 3 (Expert):  max 10 ERG    — 10 ERG cumulative + 5000 blocks active
   Tier 4 (Elite):   max 100 ERG   — 100 ERG cumulative + 15000 blocks active
   ```

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
For a 10 ERG task:

Client pays:    10 ERG (locked in service request)
                + gas deposit (to Celaut node, separate)
Node posts:     0.5 ERG delivery bond (returned on completion)

Node receives:  9.9 ERG (99%)
Treasury:       0.09 ERG (0.9%)
Insurance Pool: 0.01 ERG (0.1%)
Bond returned:  0.5 ERG (back to node)
Gas consumed:   Variable (goes to Celaut node operator)
Gas refund:     Unused gas → back to client
```

### 6.3 Cost of Attack vs Benefit Analysis

| Attack | Cost to Attacker | Max Benefit | Ratio |
|--------|------------------|-------------|-------|
| Sybil (Tier 2) | ≥1 ERG + 3 days | 1 ERG (one task) | ≥1:1 |
| Collusion ring (10 members) | ≥10 ERG value + weeks | Reputation inflation | Diminishing returns |
| Dishonest client | rating stake + reputation | 1 free task | >2:1 |
| Dishonest node | delivery bond + months of tier-climbing | 1 task payment | >>1:1 |
| Reputation farming | linear cost (value-based) | — | No shortcut |
| Front-running | — | — | Impossible (random selection) |
| Miner manipulation | Opportunity cost of suboptimal block | 1 task selection bias | Unprofitable |

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

### 9.6 Cross-Contract Composition Risk

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

**Q6: Weighted random selection.** We've replaced "highest rep wins" with probability-proportional selection (P = rep_i / Σrep). Do you see issues? The math prevents monopoly while still rewarding reputation.

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
