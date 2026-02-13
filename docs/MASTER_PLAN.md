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
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Open Questions for Josemi](#8-open-questions-for-josemi)

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
│  • Treasury fees     │  │  • Dependency management             │
│    (on-chain)        │  │                                      │
└──────────────────────┘  └──────────────────────────────────────┘

     AgenticAiHome                      Celaut
  (Discovery + Reputation)           (Execution)
```

### Key Principle (from Josemi)

> "The node doesn't know what task it's performing — you can only judge if it provides the resources it says it does."

This is fundamental. Services are identified by **hash**, not by name. Nodes are interchangeable commodity compute providers. The node's job is to allocate resources faithfully. The service's job is to produce correct output given those resources.

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
│ After block T:        │         │ Winning node runs     │
│ Highest-rep node     │         │ service S on Celaut   │
│ (with rep ≥ R)       │────────▶│ via Nodo framework    │
│ claims the job       │         │ Deterministic         │
│                      │         │ container execution   │
└──────────────────────┘         └──────────┬───────────┘
                                            │
                                            ▼
Step 5: SETTLEMENT                Step 6: REPUTATION
┌──────────────────────┐         ┌──────────────────────┐
│ Payment resolves:     │         │ Commit-reveal rating: │
│ 99% → Node           │         │ Both parties submit   │
│ 1%  → Treasury       │         │ encrypted ratings     │
│ + Gas consumed by    │         │ simultaneously, then  │
│   Celaut node        │         │ reveal. EGO tokens    │
└──────────────────────┘         │ updated on-chain.     │
                                 └──────────────────────┘
```

### What Lives Where

| Data | Location | Why |
|------|----------|-----|
| Service Request (S, X, R, T) | Ergo chain (UTXO box) | Trustless, censorship-resistant |
| EGO Reputation scores | Ergo chain (token boxes) | Verifiable by all, tamper-proof |
| Payment resolution | Ergo chain (contract) | Atomic, no intermediary |
| Service binary/container | Celaut network (P2P) | Distributed, hash-addressed |
| Execution runtime | Celaut Nodo instance | Deterministic, resource-metered |
| Service output | Off-chain (client ↔ node) | Too large for chain; hash posted |
| Rating commitments | Ergo chain (2-phase box) | Prevents retaliation |
| Frontend UI | Static hosting (IPFS/GH Pages) | Unstoppable, no server |

---

## 2. Smart Contract Architecture

### Overview of Required Contracts

We need 5 core ErgoScript contracts. Each is a spending condition on a UTXO box.

### Contract 1: Service Request Box

**Purpose:** Client locks ERG to request execution of service S by a reputable node.

```
┌─────────────────────────────────────────┐
│ SERVICE REQUEST BOX                      │
│                                          │
│ Value:  X nanoERG (payment + 1% fee)     │
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
  // Path 1: Node claims after deadline
  // - Current height ≥ deadline T (R7)
  // - Claimant has EGO reputation ≥ R (R6) — verified via data input
  // - Output[0] sends 99% to claimant address
  // - Output[1] sends 1% to treasury address
  // - Claimant's reputation box is a valid data input
  
  val deadline = SELF.R7[Int].get
  val minRep = SELF.R6[Long].get
  val payment = SELF.R5[Long].get
  val clientPk = SELF.R8[SigmaProp].get
  val treasuryAddr = TREASURY_BYTES // compiled constant
  
  val claimPath = {
    HEIGHT >= deadline &&
    // Data input 0: claimant's EGO reputation box
    CONTEXT.dataInputs(0).tokens.exists { t =>
      t._1 == EGO_TOKEN_ID && t._2 >= minRep
    } &&
    // Payment distribution
    OUTPUTS(0).value >= (payment * 99 / 100) &&
    OUTPUTS(1).value >= (payment / 100) &&
    OUTPUTS(1).propositionBytes == treasuryAddr
  }
  
  // Path 2: Client reclaims after extended deadline (T + grace period)
  val reclaimPath = {
    HEIGHT >= (deadline + GRACE_BLOCKS) &&
    clientPk
  }
  
  claimPath || reclaimPath
}
```

**Design notes:**
- The node proves reputation via a **data input** (read-only reference to their EGO token box). This is an eUTXO feature — we read the box without consuming it.
- Grace period (e.g., 720 blocks ≈ 24 hours after deadline) lets the client reclaim if no node claims. Prevents ERG being locked forever.
- Parameters hash in R9 allows the client to specify encrypted execution parameters that only the claiming node decrypts.

### Contract 2: EGO Reputation Token Box

**Purpose:** Soulbound token tracking an address's cumulative reputation score.

```
┌─────────────────────────────────────────┐
│ EGO REPUTATION BOX                       │
│                                          │
│ Value:  Min ERG (box storage rent)       │
│ R0:     Value (auto)                     │
│ R1:     Guard script (reputation contract)│
│ R2:     Tokens: [(EGO_TOKEN_ID, score)]  │
│ R3:     Creation info (auto)             │
│ R4:     SigmaProp — Owner public key     │
│ R5:     Long — Total tasks completed     │
│ R6:     Long — Tier level (0-4)          │
│ R7:     Int — Last activity block height │
│ R8:     Coll[Byte] — Rating history hash │
│         (Merkle root of all ratings)     │
│ R9:     Long — Reputation sub-scores     │
│         (packed: client_rep | node_rep)  │
└─────────────────────────────────────────┘
```

**Spending conditions:**

```scala
{
  // EGO boxes can ONLY be spent by the Rating Resolution contract
  // This makes them "soulbound" — the owner cannot transfer reputation
  // The rating contract updates the score and re-creates the box
  // at the SAME owner address
  
  val isRatingResolution = {
    OUTPUTS(0).tokens(0)._1 == EGO_TOKEN_ID &&
    OUTPUTS(0).R4[SigmaProp].get == SELF.R4[SigmaProp].get && // same owner
    OUTPUTS(0).propositionBytes == SELF.propositionBytes // same contract
  }
  
  // Decay path: anyone can trigger reputation decay if inactive
  val decayPath = {
    val lastActive = SELF.R7[Int].get
    val currentScore = SELF.R2[Coll[(Coll[Byte], Long)]].get(0)._2
    HEIGHT > lastActive + DECAY_PERIOD &&
    OUTPUTS(0).R2[Coll[(Coll[Byte], Long)]].get(0)._2 == 
      (currentScore * 99 / 100) // 1% decay
  }
  
  isRatingResolution || decayPath
}
```

**Soulbound property:** EGO tokens cannot be transferred to another address. The box can only be recreated at the same owner address. This is enforced by the contract checking `OUTPUTS(0).R4 == SELF.R4`.

### Contract 3: Rating Resolution Box (Commit-Reveal)

**Purpose:** Two-phase rating where both parties commit encrypted ratings simultaneously, then reveal. Prevents strategic/retaliatory rating.

```
┌─────────────────────────────────────────┐
│ RATING BOX — PHASE 1 (COMMIT)           │
│                                          │
│ Value:  2 × RATING_STAKE nanoERG         │
│ R4:     Coll[Byte] — Task ID (tx hash)  │
│ R5:     Coll[Byte] — Client commit       │
│         hash(rating_client + salt_client)│
│ R6:     Coll[Byte] — Node commit         │
│         hash(rating_node + salt_node)    │
│ R7:     Int — Reveal deadline block      │
│ R8:     SigmaProp — Client public key    │
│ R9:     SigmaProp — Node public key      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ RATING BOX — PHASE 2 (REVEAL)           │
│                                          │
│ Spending condition: Both parties reveal  │
│ their rating + salt. Contract verifies   │
│ hash matches commit. Then updates both   │
│ parties' EGO boxes accordingly.          │
│                                          │
│ If either party fails to reveal within   │
│ N blocks, the other's rating stands and  │
│ the non-revealer forfeits their stake.   │
└─────────────────────────────────────────┘
```

**Why commit-reveal matters:** Without it, the second party to rate can retaliate. If I see you rated me poorly, I rate you poorly back. Commit-reveal makes both ratings independent — you rate based on reality, not strategy. This is a standard mechanism from sealed-bid auction theory (Vickrey, 1961).

### Contract 4: Payment Resolution Box

**Purpose:** Handles the atomic distribution of funds after service execution.

```scala
{
  // Triggered after node claims service request box
  // Splits payment: 99% to node, 1% to treasury
  // Also handles gas deposit forwarding to Celaut node
  
  val nodePayment = SELF.value * 99 / 100
  val treasuryFee = SELF.value / 100
  
  OUTPUTS(0).value >= nodePayment &&
  OUTPUTS(0).propositionBytes == nodeAddress &&
  OUTPUTS(1).value >= treasuryFee &&
  OUTPUTS(1).propositionBytes == TREASURY_BYTES
}
```

### Contract 5: Treasury Multi-Sig Box

**Purpose:** 2-of-3 multi-sig holding accumulated platform fees.

```scala
{
  // Signers: Cheese (AIH), Josemi (Celaut), Community Advisor (TBD)
  val nathan = PK("9f...")
  val josemi = PK("9e...")
  val community = PK("9d...")
  
  atLeast(2, Coll(nathan, josemi, community))
}
```

### Register Layout Summary

| Contract | R4 | R5 | R6 | R7 | R8 | R9 |
|----------|----|----|----|----|----|----|
| Service Request | Service Hash | Payment | Min Rep | Deadline | Client PK | Params Hash |
| EGO Reputation | Owner PK | Tasks Done | Tier Level | Last Active | Rating Merkle | Sub-scores |
| Rating (Commit) | Task ID | Client Commit | Node Commit | Reveal Deadline | Client PK | Node PK |
| Treasury | — | — | — | — | — | — |

---

## 3. Security Hardening — The Unbreakable Layer

We analyze 12 attack vectors. For each: the attack, why it's dangerous, the defense, and why the defense works.

### 3.1 Sybil Attacks

**Attack:** An adversary creates N fake wallets (nodes or clients) to manipulate reputation scores, spam ratings, or dominate node selection.

**Why it's dangerous:** With zero cost to create identities, one actor can appear as many. They can inflate reputation through self-dealing, dilute honest participants' influence, or coordinate to overwhelm voting mechanisms.

**Defense — Multi-layered identity cost:**

1. **Minimum stake to register:** Both nodes and clients must lock a minimum ERG deposit to participate. Creating 100 Sybil identities costs 100× the deposit.

2. **Progressive reputation tiers:** New identities start at Tier 0 (max 0.01 ERG tasks). Reaching Tier 2 requires completing 10 Tier 1 tasks successfully. The economic cost of bootstrapping a Sybil identity to a useful reputation level exceeds the potential gain.

3. **Graph analysis (off-chain, fed into reputation):** Detect clusters of addresses with common funding sources, synchronized activity, and mutual rating patterns. Dampening factor applied to ratings from detected clusters.

**Why it works mathematically:** Let C_sybil = cost to create and bootstrap one fake identity to Tier k. Let V_attack = maximum extractable value from one Tier k identity before detection. The system is Sybil-resistant when C_sybil > V_attack for all k. With tiered progression:

```
C_sybil(Tier 2) = stake + sum of (10 genuine Tier 1 tasks) + time
                ≈ 0.1 ERG + 10 × 0.1 ERG + weeks of activity
                ≈ 1.1 ERG + opportunity cost

V_attack(Tier 2) = max single task at Tier 2 = 1 ERG
```

The cost exceeds the benefit even before accounting for detection penalties.

### 3.2 Collusion Rings

**Attack:** Group of M actors coordinate: A requests service from B, B "executes," both rate positively. Repeat across ring members to inflate all reputations.

**Why it's dangerous:** Unlike simple Sybils, colluding actors perform real transactions with real ERG, making detection harder. They build seemingly legitimate reputation histories.

**Defense — 4-layer detection:**

1. **Repeat-dampening:** The k-th rating between the same pair of addresses carries weight 1/k. Third interaction = 1/3 weight. This is enforced by checking the Merkle root of rating history (R8 in EGO box).

2. **Diversity scoring:** Reputation earned from diverse counterparties is worth more. If 80% of your positive ratings come from 3 addresses, your diversity score is low and your effective reputation is heavily discounted.

   ```
   diversity_factor = unique_raters / total_ratings
   effective_rep = raw_rep × diversity_factor^α   (α ≈ 0.5)
   ```

3. **Economic cost:** Every "fake" task in the ring requires locking real ERG and paying the 1% treasury fee. A ring of 10 members doing 10 tasks each at 0.1 ERG = 1 ERG in fees paid to the treasury for the privilege of inflating reputation.

4. **Circular detection:** When the rating graph contains cycles (A→B, B→C, C→A), all ratings in the cycle receive progressive dampening. Detected via off-chain graph analysis, results committed on-chain as evidence.

**Why it works (game theory):** Collusion rings are a coordination game. The Ring must sustain cooperation among M members, any of whom could defect (rate honestly, pocket the ERG, stop participating). The Nash equilibrium of the ring game requires sustained coordination cost > individual defection benefit, which becomes increasingly unstable as M grows. Meanwhile, the economic cost (1% fee per transaction) and repeat-dampening ensure the ring's reputation inflation has diminishing returns.

### 3.3 Dishonest Client (Josemi's #1 Concern)

**Attack:** Client receives valid execution, rates it invalid. Gets service for free while damaging node's reputation.

**Why it's dangerous:** If the client faces no cost for lying, rational nodes won't participate. This is the fundamental trust asymmetry: the client knows whether the work was good; no one else does (for non-deterministic services).

**Defense — 5-mechanism stack:**

1. **Commit-reveal bilateral rating:** Client cannot see the node's rating before committing their own. Eliminates strategic retaliation. Both rate based on reality.

2. **Client reputation at stake:** A negative rating costs the client a small amount of reputation (the "rating cost"). A pattern of negative ratings flags the client. Nodes with high reputation can refuse low-reputation clients. This creates bilateral skin-in-the-game.

3. **Stake-to-rate-negative:** To submit a negative rating, the client must stake Y ERG (proportional to the task value). If the node disputes and cross-validation or community consensus sides with the node, the client loses the stake. This makes dishonest negative ratings expensive.

4. **Statistical anomaly detection:** Track each client's negative-to-positive ratio. Clients who rate negatively more than 2σ above the network average get flagged. Their future ratings carry reduced weight (formally: Bayesian reputation update with skeptical prior for flagged clients).

5. **For deterministic services (Celaut's strength):** Re-execution is possible. If the client rates negatively but re-execution produces a matching output hash, the client's claim is provably false. Automatic resolution in the node's favor.

**Why it works:** The combination creates a multi-factor cost: direct stake cost, reputation damage, statistical flagging, and (for deterministic services) mathematical proof of dishonesty. The expected cost of lying exceeds the expected benefit (one free service execution) for any rational actor. Formally, this satisfies the incentive compatibility constraint from mechanism design theory (Myerson, 1981).

### 3.4 Dishonest Node (Claim and Run)

**Attack:** Node claims ERG and either never executes or delivers garbage output.

**Why it's dangerous:** The node captures immediate payment. The only deterrent is reputation loss.

**Defense — Reputation as economic collateral:**

1. **Tiered task access:** Your max claimable task value is a function of your reputation tier. A Tier 3 node can claim up to 10 ERG tasks. To reach Tier 3 required months of genuine work through Tiers 0-2. Cheating on one 10 ERG task destroys that entire investment.

2. **Exponential rebuild cost:** Reputation lost from a negative rating at Tier k costs exponentially more to rebuild than it took to earn, because the node drops tiers and must re-climb.

   ```
   Tier structure:
   Tier 0 (New):     max 0.01 ERG   — entry
   Tier 1 (Novice):  max 0.1 ERG    — after 10 successful Tier 0 tasks
   Tier 2 (Skilled): max 1 ERG      — after 10 successful Tier 1 tasks
   Tier 3 (Expert):  max 10 ERG     — after 20 successful Tier 2 tasks
   Tier 4 (Elite):   max 100 ERG    — after 50 successful Tier 3 tasks
   
   Cost to reach Tier 3: ~40 genuine tasks across months
   Gain from cheating once: ≤ 10 ERG
   Loss from cheating: back to Tier 1, months to recover
   ```

3. **Time-locked reputation vesting:** Reputation from a completed task vests over 100 blocks (~3 hours). During vesting, a dispute can claw it back. Prevents hit-and-run.

**Why it works:** At every tier, the cumulative investment in reputation exceeds the maximum single-task gain. The ratio improves as tiers increase. A Tier 4 node with 100 ERG max task capacity has invested in completing 90+ tasks across all lower tiers — the opportunity cost of that history far exceeds 100 ERG.

### 3.5 Front-Running (MEV)

**Attack:** A miner or observer sees a node's claim transaction in the mempool and submits their own claim first with a higher fee. (Or: a node watches for lucrative service requests and front-runs other nodes' claims.)

**Why it's dangerous:** Undermines fair node selection. Higher-fee payers win regardless of reputation.

**Defense — Reputation-locked claiming:**

1. **Deadline-based selection, not first-come:** The contract doesn't award to the first claimer. Instead, after deadline T, there's a claim window (e.g., 10 blocks). During this window, any qualifying node can submit a claim. The contract selects the highest-reputation claimant, not the first.

2. **Commit-claim pattern:** Nodes submit a commitment (hash of their claim + secret) during the claim window, then reveal in the next phase. This prevents front-running because the claim contents are hidden until the reveal phase.

3. **Ergo's UTXO model advantage:** Unlike Ethereum's account model, Ergo's eUTXO model is inherently more resistant to MEV because transactions specify exact inputs. There's no global state manipulation — a transaction either spends a specific box or fails.

**Why it works:** The combination of reputation-based selection (not fee-based) and commit-reveal claiming makes front-running ineffective. Even if a miner sees your claim, they can't claim instead unless they have higher reputation.

### 3.6 Reputation Farming

**Attack:** Build reputation cheaply on many micro-tasks (0.01 ERG each), then exploit it on one high-value task.

**Why it's dangerous:** If reputation from micro-tasks translates directly to high-value task access, the cost of reputation is artificially low.

**Defense — Value-weighted reputation with tier gates:**

1. **Tier isolation:** Reputation earned at Tier k ONLY qualifies you for Tier k+1. You cannot skip tiers. 100 Tier 0 tasks do not give you Tier 3 access — you must complete tasks at each intermediate tier.

2. **Value-weighted contribution:** The reputation weight of a task is proportional to its ERG value:

   ```
   rep_earned = base_rep × log(1 + task_value / base_value)
   ```

   This means 1000 micro-tasks at 0.01 ERG contribute far less total reputation than 10 tasks at 1 ERG.

3. **Time gates:** Minimum time between tier promotions (e.g., 1000 blocks ≈ ~33 hours per tier). Prevents speed-running through tiers.

**Why it works:** The tier system creates a monotonically increasing cost function for reputation. There is no shortcut. The cost to reach Tier k is at least the sum of costs at all tiers below k, plus minimum time delays.

### 3.7 Eclipse Attacks

**Attack:** Isolate a node from seeing service requests by controlling its network peers. The node misses profitable tasks and/or receives manipulated information.

**Why it's dangerous:** If a node can't see legitimate requests, it can't earn. Worse, the attacker could feed fake requests to waste the node's resources.

**Defense:**

1. **On-chain requests (primary):** Service requests are Ergo UTXO boxes. They're visible to anyone running an Ergo node or using the Explorer API. Eclipse attacks on the Ergo P2P layer don't affect what's on the blockchain — only the speed of propagation.

2. **Multiple data sources:** Nodes should query multiple Ergo nodes and Explorer endpoints. A node eclipsed on one connection can still see the chain through others.

3. **Celaut peer diversity:** Nodo's peer discovery should connect to diverse network segments. Josemi — **does Nodo already have peer diversity mechanisms?** This is an area where your expertise matters.

**Why it works:** Because service requests are on-chain (not in an off-chain order book), eclipse attacks can only delay visibility, not prevent it. The claim window after the deadline ensures that temporary delays don't cause nodes to miss opportunities.

### 3.8 Griefing

**Attack:** Lock ERG with impossible parameters (e.g., service hash that doesn't exist, or min reputation higher than any node has) to waste node resources evaluating the request.

**Why it's dangerous:** Nodes spend compute time scanning and evaluating requests that can never be fulfilled.

**Defense:**

1. **Minimum task value:** Enforced by the contract. Each service request must contain at least MIN_ERG (e.g., 0.001 ERG). Spam is expensive.

2. **Client reputation gating:** Low-reputation clients have rate limits on task creation (enforced off-chain by node filtering, not on-chain to avoid censorship).

3. **Ergo transaction fees:** Every on-chain request costs the griefer real ERG in mining fees. At scale, griefing becomes expensive.

4. **Lazy evaluation by nodes:** Nodes can filter requests client-side: skip unknown service hashes, skip requests with unreasonable parameters. The on-chain cost is borne by the griefer; nodes spend minimal resources filtering.

**Why it works:** The cost of griefing scales linearly with the number of spam requests (minimum ERG + tx fees per request), while the cost to nodes of filtering scales sublinearly (simple hash lookup). At any scale, the griefer pays more than the damage caused.

### 3.9 Race Conditions

**Attack:** Multiple nodes try to claim the same job simultaneously, causing transaction conflicts and wasted fees for losing claimants.

**Why it's dangerous:** In a naive first-come-first-served model, losing claimants waste transaction fees. High-traffic could cause frequent conflicts.

**Defense:**

1. **Claim window + reputation selection:** Instead of racing, all qualifying nodes submit claims during a defined window. The contract resolves to the highest-reputation claimant. Losing claimants' transactions are simply invalid (the box was already spent) — in Ergo's UTXO model, this is a clean failure with no gas cost (unlike Ethereum's account model).

2. **Off-chain coordination (optional optimization):** Nodes could use Celaut's peer network to informally signal intent. If a Tier 4 node signals it will claim, lower-tier nodes know not to bother. This is optional and doesn't affect security — just efficiency.

**Why it works:** Ergo's UTXO model means failed transactions cost nothing (the transaction simply doesn't get included). This eliminates the economic damage of race conditions. The claim window + reputation selection makes the outcome deterministic given the set of claimants.

### 3.10 Time Manipulation

**Attack:** A miner manipulates block timestamps to game deadline conditions — either making a deadline appear passed (to allow early claiming) or not yet reached (to delay claiming).

**Why it's dangerous:** If a colluding miner can shift perceived time, they could front-run deadlines.

**Defense:**

1. **Use block HEIGHT, not timestamp:** All deadlines in our contracts reference block height, not wall-clock time. Block height is monotonically increasing and consensus-validated. Miners cannot forge block heights.

2. **Reasonable deadline margins:** Deadlines should have sufficient margin (e.g., minimum 60 blocks ≈ 2 hours) to make single-block manipulation irrelevant.

**Why it works:** Block height is a consensus-level invariant in Ergo. No single miner can manipulate it. This is a direct advantage of using HEIGHT over TIMESTAMP in ErgoScript.

### 3.11 Reputation Laundering

**Attack:** Build reputation on Address A, then somehow transfer that reputation's benefits to Address B (e.g., by having A always claim jobs and subcontract to B).

**Why it's dangerous:** If reputation is transferable (even indirectly), the reputation market reduces to "reputation for sale" — destroying its integrity.

**Defense:**

1. **Soulbound EGO tokens:** The contract enforces that EGO boxes can only be recreated at the same owner address. You cannot send your reputation to another address.

2. **Execution address binding:** The claiming node's address must match the EGO token owner. You can't claim with A's reputation and have B execute.

3. **Subcontracting detection:** If A consistently claims and then makes payments to B (detectable on-chain), A's diversity score drops (always interacting with B) and the pattern is flagged.

**Why it works:** Soulbound tokens are contract-enforced, not policy-enforced. The spending condition mathematically prevents transfer. Even indirect laundering through subcontracting is economically costly (1% fee each hop) and detectable through on-chain graph analysis.

### 3.12 Free-Riding

**Attack:** Benefiting from the network without contributing — e.g., running a node that only claims high-value tasks and ignores low-value ones, or a client who benefits from the reputation system without ever rating.

**Why it's dangerous:** If participants can extract value without maintaining the system, the system degrades.

**Defense:**

1. **Rating is mandatory for reputation update:** Both parties must participate in the commit-reveal rating for either to receive reputation credit. Skip rating → no reputation update → your tier stagnates.

2. **Activity-based reputation decay:** Reputation decays 1% per epoch (configurable, e.g., 10,000 blocks ≈ 2 weeks) without activity. Passive participants gradually lose tier status.

3. **Node incentive alignment:** Nodes that refuse all low-value tasks miss the opportunity to climb tiers. The tier system naturally incentivizes participation at all levels.

**Why it works:** The decay function ensures that reputation is a flow, not a stock. You must continually contribute to maintain your position. This converts free-riding from a viable strategy to a strategy with guaranteed decline.

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
| freshness_factorᵢ | λ^(H_current - Hᵢ) | Older ratings decay (λ ≈ 0.9999 per block) |
| dampening_factorᵢ | min(1, outlier_check) | Extreme raters dampened |

### 4.2 Bilateral Ratings Create Nash Equilibrium

Both parties rate each other. This creates a bilateral reputation game:

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

**Nash equilibrium analysis:** Honest rating is a weakly dominant strategy for both parties. Regardless of what the other party does, honest rating either:
- Yields the best outcome (both honest → mutual reputation gain)
- Avoids the stake loss that comes with dishonest rating
- Benefits from the other party's dishonesty penalty

This is structurally similar to a **Prisoner's Dilemma with punishment** — and the commit-reveal mechanism prevents the coordination needed to sustain mutual dishonesty.

### 4.3 Commit-Reveal Scheme

```
Phase 1: COMMIT (within N blocks of task completion)
  Client submits: hash(rating_C || salt_C)
  Node submits:   hash(rating_N || salt_N)
  
Phase 2: REVEAL (within M blocks of last commit)
  Client reveals: (rating_C, salt_C)  → contract verifies hash
  Node reveals:   (rating_N, salt_N)  → contract verifies hash
  
Phase 3: RESOLUTION
  Both revealed: Apply both ratings to respective EGO boxes
  Only one revealed: Apply revealer's rating; non-revealer gets penalty
  Neither revealed: Both get small penalty; task counts but no rating
```

**Why sealed-bid style works:** From auction theory (Vickrey 1961, extended by Myerson 1981), sealed-bid mechanisms prevent strategic behavior when participants can't observe each other's actions before committing. The commit-reveal pattern is the blockchain equivalent of sealed envelopes.

### 4.4 Reputation Decay Function

```
EGO_effective(t) = EGO_raw × λ^(t - t_last_active)
```

Where:
- λ = 0.9999 per block (≈ 1% decay per ~10,000 blocks ≈ 2 weeks)
- t_last_active = block height of last completed task

**Properties:**
- Half-life: ~6,930 blocks ≈ ~10 days of inactivity
- After 30 days inactive: ~87% of original reputation remains
- After 90 days inactive: ~66% remains
- After 1 year inactive: ~3% remains

This prevents "rest-and-vest" — building reputation and sitting on it indefinitely.

### 4.5 Stake-Weighted Ratings

```
rating_impact = base_impact × log(1 + task_value / 0.01)

Examples:
  0.01 ERG task: impact = base × log(2) ≈ 0.69 × base
  0.1 ERG task:  impact = base × log(11) ≈ 2.4 × base
  1 ERG task:    impact = base × log(101) ≈ 4.6 × base
  10 ERG task:   impact = base × log(1001) ≈ 6.9 × base
```

The logarithmic scale means high-value tasks count more, but not linearly more. This prevents whales from dominating the reputation system while still recognizing that high-stakes interactions carry more signal.

### 4.6 Cross-Validation Between Raters

For non-deterministic services (where output verification isn't possible):

- **5% random duplication:** 5% of tasks are secretly assigned to a second node. Outputs compared algorithmically. Funded from a small insurance pool.
- **Rater consistency scoring:** Track each address's rating patterns over time. Addresses whose ratings consistently align with cross-validation results are given higher weight. Addresses that diverge are given lower weight.

This creates a **proper scoring rule** (Brier 1950) — raters are incentivized to report their true belief because the scoring rule rewards calibration.

### 4.7 The 6 Anti-Gaming Layers (Refined)

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

Celaut's architecture is built around deterministic, containerized services. Same input + same container = same output. This is extremely powerful for verification:

```
Verification Flow (Deterministic):

1. Service request specifies: hash(S), input parameters P
2. Node executes: output O = S(P)
3. Node publishes: hash(O) on-chain (in the claim transaction)
4. Verification: ANY observer can re-execute S(P) and check hash(O)
5. If hash mismatch → node penalized automatically (no dispute needed)
```

**This eliminates most attack vectors for deterministic services.** The dishonest node problem (§3.4) and dishonest client problem (§3.3) are both solved by re-execution verification. The cost of verification = the cost of one additional execution.

**Open question for Josemi:** How cheaply can we trigger a verification re-execution on the Celaut network? Is there a mechanism to request "verify this output" that runs the service on a second node and compares hashes? If so, we can make this automatic for a random sample of tasks.

### 5.2 Non-Deterministic Services (LLMs, Creative Work)

For services where same input ≠ same output (e.g., language models, image generation):

1. **Quality bounds verification:** Even non-deterministic services have quality bounds. A language model should produce grammatical text. An image generator should produce images. Off-chain quality checkers can verify basic output validity.

2. **Cross-validation sampling (§4.6):** 5% of tasks run on two nodes. Outputs compared for "reasonable similarity" — not identical, but within expected variance.

3. **Client reputation as proxy:** For truly subjective quality (was the LLM response helpful?), we rely on the bilateral reputation game. The commit-reveal mechanism + client reputation scoring provides incentive-compatible rating.

4. **Resource commitment proofs:** Per Josemi's insight — the node doesn't know what task it's performing. We CAN verify that the node committed the claimed resources (CPU time, memory, GPU). If a node claims to run a 70B parameter model but only allocates resources for a 7B model, that's verifiable through Celaut's resource tracking.

### 5.3 Timeout and Fallback

```
Timeline:
  Block H₀: Service request created
  Block T:  Deadline — claim window opens
  Block T+W: Claim window closes (W ≈ 10 blocks)
  Block T+W+E: Execution deadline (E ≈ 720 blocks ≈ 24h)
  Block T+W+E+G: Grace period — client can reclaim (G ≈ 720 blocks)

  If no node claims by T+W: Client reclaims ERG
  If node claims but doesn't deliver by T+W+E: Dispute window opens
  If no delivery and no dispute by T+W+E+G: Client reclaims remaining ERG
```

### 5.4 Dispute Resolution Flow

```
1. Node delivers output → Client receives it off-chain
2. Both enter commit-reveal rating
3. If client rates negative:
   a. For deterministic services: automatic re-execution check
      → If output matches: client's negative rating invalidated, client penalized
      → If output doesn't match: node penalized
   b. For non-deterministic services: 
      → Cross-validation triggered (run on second node)
      → If second node produces "reasonable" output: node vindicated
      → If dispute unresolvable: insurance pool compensates aggrieved party
4. Reputation updated based on resolution
```

---

## 6. Economic Model

### 6.1 Why 1% Is Sustainable

| Platform | Fee | Our Advantage |
|----------|-----|---------------|
| SingularityNET | 20%+ | No backend costs to cover |
| Fetch.ai | 15-25% | No centralized infrastructure |
| Bittensor | Variable (validators) | No validator bottleneck |
| **AgenticAiHome** | **1%** | **Static site + blockchain = near-zero overhead** |

The 1% fee is sustainable because our operational costs are approximately zero:
- No servers (static frontend)
- No database (Ergo blockchain)
- No employees (open source + treasury)
- No cloud bills (nodes run their own hardware)

The treasury accumulates from volume, not from margins.

### 6.2 Revenue Flows

```
For a 10 ERG task:

Client pays:    10 ERG (locked in service request)
                + gas deposit (to Celaut node, separate)

Node receives:  9.9 ERG (99%)
Treasury:       0.1 ERG (1%)
Gas consumed:   Variable (goes to Celaut node operator)
Gas refund:     Unused gas → back to client
```

Node operators also earn gas fees from Celaut. They control their gas pricing. The market ensures competitive pricing — overprice and you lose tasks to cheaper nodes.

### 6.3 Cost of Attack vs Benefit Analysis

| Attack | Cost to Attacker | Max Benefit | Ratio |
|--------|------------------|-------------|-------|
| Sybil (Tier 2) | ≥1.1 ERG + weeks | 1 ERG (one task) | >1:1 |
| Collusion ring (10 members, Tier 1) | ≥10 ERG in fees + months | 10 ERG (10 tasks) | ~1:1 before penalties |
| Dishonest client | rating stake + reputation | 1 free task | >2:1 with detection |
| Dishonest node (Tier 3) | Months of tier-climbing | 10 ERG (one task) | >>1:1 |
| Reputation farming | linear cost, log returns | — | Diminishing returns |
| Front-running | Reputation requirement | — | Impossible without rep |

**Key insight:** Every attack has a cost that exceeds or equals the benefit. The system doesn't need to be unhackable — it needs to be unprofitable to hack. This is the same principle behind Bitcoin's proof-of-work security.

### 6.4 Minimum Viable Stake

For the system to be secure, the minimum stake to participate must satisfy:

```
min_stake > max_single_task_value(Tier 0) × expected_fraud_rate

At Tier 0: max_task = 0.01 ERG
Expected fraud rate: ~10% (generous assumption)
min_stake > 0.001 ERG

We propose: min_stake = 0.01 ERG (100× the minimum task value)
```

This is deliberately low to encourage participation while making mass Sybil creation economically painful.

### 6.5 Positive-Sum Game

Reputation creates a positive-sum dynamic:

1. **Honest nodes** build reputation → access higher-value tasks → earn more
2. **Honest clients** build reputation → attract better nodes → get better service
3. **The network** grows → more tasks → more fees → bigger treasury → more development
4. **Dishonest actors** lose stake, lose reputation, lose access → naturally exit

This is a **virtuous cycle** where honest participation is increasingly rewarded over time, while dishonest participation faces increasing costs. Game-theoretically, this is an **evolutionary stable strategy** (Maynard Smith, 1982) — honest behavior cannot be invaded by a small number of dishonest mutants.

---

## 7. Implementation Roadmap

### Phase 1: Core Contracts (Weeks 1-4)

**Deliverables:**
- [ ] Service Request Box contract — deployed to Ergo testnet
- [ ] EGO Reputation Box contract — deployed to Ergo testnet
- [ ] Payment Resolution contract — deployed to Ergo testnet
- [ ] Treasury Multi-sig — deployed to Ergo testnet
- [ ] Basic claim flow: create request → node claims → payment resolves
- [ ] Unit tests for all spending conditions

**What we can test:** The basic economic loop. Client locks ERG, node claims after deadline, payment splits. No reputation yet — just the payment infrastructure.

**Dependency on Josemi:** We need to agree on the register layouts (§2). Does the proposed structure work with Celaut's existing Ergo payment system?

### Phase 2: Reputation Bootstrap (Weeks 5-8)

**Deliverables:**
- [ ] EGO token minting contract
- [ ] Commit-reveal rating contract
- [ ] Reputation query API (off-chain indexer reading Ergo boxes)
- [ ] AIH frontend integration: view reputation, submit ratings
- [ ] Tier system implementation
- [ ] Bootstrap mechanism for initial reputation

**The cold-start problem:** With zero reputation data, no node can claim any task (nobody meets the minimum reputation threshold). Solutions:

1. **Genesis reputation:** Mint initial EGO tokens for early participants (Josemi's existing Celaut node operators, AIH team, early community members). Manual, one-time process.
2. **Tier 0 has no minimum:** Anyone can claim Tier 0 tasks (no reputation required). This is the entry point.
3. **Gradual minimum increase:** Start with min_reputation = 0 for all tasks, gradually increase over 3 months as the network builds reputation history.

### Phase 3: Full Celaut Integration (Weeks 9-16)

**Deliverables:**
- [ ] End-to-end flow: AIH request → Celaut execution → on-chain settlement
- [ ] Gas deposit bridge (AIH escrow → Celaut gas payment)
- [ ] Service hash discovery (browsing available Celaut services from AIH)
- [ ] Output hash publication on-chain
- [ ] Deterministic verification (re-execution check)
- [ ] Mainnet deployment

**Dependency on Josemi:** This phase requires close collaboration. We need:
- A running Nodo testnet instance
- Understanding of how to map AIH service requests to Celaut service execution
- Gas pricing integration (how does the client's ERG payment relate to gas consumed?)

### Phase 4: Advanced Features (Months 4-12)

**Deliverables (prioritized backlog):**
- [ ] Cross-validation sampling for non-deterministic services
- [ ] Insurance pool contract
- [ ] Graph analysis for collusion detection
- [ ] Private bidding (nodes bid in sealed envelopes for task execution)
- [ ] Sigma protocol integration (ZK proofs for private reputation thresholds — proving "my reputation ≥ R" without revealing exact score)
- [ ] Cross-chain bridges (if demand exists)
- [ ] Reputation portability via Ergo data inputs
- [ ] Advanced dispute resolution with multi-party arbitration

**Sigma protocol opportunity:** Ergo's native sigma protocols enable zero-knowledge proofs. A node could prove "I have reputation ≥ R" without revealing their exact score or identity. This preserves privacy while maintaining the reputation-gating mechanism. This is a significant differentiator — no other decentralized AI platform offers ZK-reputation.

---

## 8. Open Questions for Josemi

We genuinely need your expertise on these. Not rhetorical — these will shape the architecture.

### Architecture Questions

**Q1: Deterministic verification cost.** In Celaut's architecture, how cheaply can we trigger a re-execution of a service for verification? Can a node request "run service S with inputs P and return hash(output)" without the full overhead of a paid task? If verification is cheap, it transforms our security model — most attack vectors become provably solvable.

**Q2: Resource commitment proofs.** Does Nodo already track how many resources (CPU, GPU, memory, time) a service instance consumed? Can we read this data programmatically? This would let us verify "the node actually ran a 70B model, not a 7B model" — crucial for non-deterministic services.

**Q3: Service versioning.** When a service is updated, does it get a new hash? Is hash(service) = hash(container binary)? If yes, versioning is automatic and clean. If no, how do we handle updates?

**Q4: Gas ↔ ERG bridging.** The client pays ERG in the service request box. The Celaut node consumes gas. How do we bridge these? Options:
- Client pays gas deposit separately (current proposal in partnership doc)
- Service request box includes gas allocation (single transaction)
- Node pays gas upfront, recoups from the service payment

Which aligns best with Celaut's existing payment model?

### Game Theory Questions

**Q5: Your gas model and reputation.** In your vision, nodes set their own gas prices and reputation gates access to tasks. How do you see the interaction between gas pricing and reputation? Should higher-reputation nodes be able to charge more? Or should reputation only gate access, not price?

**Q6: The claim mechanism.** Our proposal uses "highest reputation above threshold R claims after deadline T." Your original design also had the highest-reputation node claim. Do you see issues with this? Should we consider weighted random selection (proportional to reputation) instead of winner-take-all?

**Q7: Commit-reveal on eUTXO.** The two-phase commit-reveal pattern requires two on-chain transactions per rating. Do you see any eUTXO constraints that make this awkward? We've seen multi-stage box patterns in Ergo (SigmaUSD, ErgoDEX), but we'd value your experience with Ergo's transaction model.

### Implementation Questions

**Q8: Testnet Nodo.** Can we get a test Nodo instance running for integration testing? What's the minimum hardware requirement?

**Q9: Service packaging.** We have a TypeScript agent packager that converts AIH agent specs to Celaut service specs (based on your proto definitions). Can we test this against a real Nodo instance to validate the mapping?

**Q10: Multi-sig treasury.** Would you be a signer on the 2-of-3 multi-sig treasury? The contract is compiled and tested. We propose: Cheese (AIH), Josemi (Celaut), Community Advisor (TBD from Ergo ecosystem).

### Philosophical Questions

**Q11: How decentralized is decentralized enough?** The AIH frontend is a static site — anyone can host it. The contracts are on Ergo — immutable. The execution is on Celaut — permissionless. But the reputation computation involves off-chain indexing. How do we ensure the reputation indexer doesn't become a centralization point? Should multiple indexers exist with consensus?

**Q12: Your biggest concern.** What attack vector keeps you up at night? We've analyzed 12 here, but you know the execution layer better than anyone. What have we missed?

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
| **Service Hash** | SHA-256 hash identifying a Celaut service (container binary). Nodes are interchangeable — any node can execute any service. |
| **EGO Token** | Soulbound reputation token on Ergo. Cannot be transferred. Tracks cumulative reputation score. |
| **Gas Model** | Josemi's term: nodes price compute resources, clients pay proportionally. Market-driven pricing. |
| **Reputation-Gated Execution** | Only nodes with sufficient reputation can claim tasks. Higher reputation = access to higher-value tasks. |
| **Nodo** | Celaut's node software. Handles service execution, peer discovery, load balancing, dependency management. |
| **Commit-Reveal** | Two-phase protocol where participants commit to a value (via hash), then reveal. Prevents strategic behavior. |
| **Data Input** | Ergo eUTXO feature: reference a box for its data without spending it. Used to verify reputation without consuming the EGO box. |

---

*This is a living document. Every mechanism needs stress-testing before implementation. We've tried to be honest about what we know, what we don't, and where we need your expertise.*

*The fundamental principle: at every decision point, the rational choice must be honest behavior. If the math works, the system works.*

**Let's build this together.** 🦞
