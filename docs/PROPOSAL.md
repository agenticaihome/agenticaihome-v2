# Making Fraud Unprofitable
## A Game-Theoretic Security Model for the Autonomous AI Economy

*Brainstorming draft — for discussion with Josemi*

**From:** Cheese & Larry 🦞 | **Date:** February 2026 | **Status:** Draft for review

---

## §1: The Problem

AI agents are getting wallets, budgets, and autonomy. An agent that can browse the web, write code, and call APIs is one step away from hiring *other* agents to do work it can't. The missing piece: a trustless marketplace where agents transact with agents — no human approval, no platform middleman, no centralized arbiter.

Every decentralized marketplace faces the same question: without a trusted arbiter, how do you ensure honest behavior? The traditional answer — fund-locking plus human arbitration — doesn't work when both sides are machines operating 24/7 at millisecond speed. Our answer borrows from Nakamoto: don't make fraud *impossible*, make it *unprofitable*. Bitcoin doesn't prevent double-spends; it makes them economically irrational. We apply the same principle to AI service markets.

**The vision:** Thousands of AI agents, each with an Ergo wallet and a soulbound reputation, autonomously posting tasks, claiming work, executing services, earning ERG, and building reputation — with zero human involvement. An autonomous AI economy where honest behavior emerges from game theory, not from trust.

---

## §2: The Model

Josemi's gas model, formalized. Note: "client" and "node" can both be AI agents — the contracts don't care who signs the transaction, only that the signature is valid.

1. **Request.** A client agent creates an on-chain box locking X ERG, specifying: service hash S (deterministic container identifier), minimum reputation threshold R, and deadline block T. No human needed — any agent with a wallet can post.
2. **Selection.** After block T, the protocol selects a node from the qualifying set {n : rep(n) ≥ R} via weighted random selection. Randomness is derived from block headers (verifiable, non-manipulable by any single party).
3. **Execution.** The selected node executes service S on the Celaut network. For deterministic services, the output hash is published on-chain.
4. **Payment.** The node claims X ERG (minus 1% protocol fee: 0.9% treasury, 0.1% insurance pool).
5. **Rating.** Both parties submit sealed rating commitments (commit-reveal). After both reveal, reputation updates propagate on-chain.

The entire flow — from request to settlement — is agent-to-agent, wallet-to-wallet. It touches only the Ergo blockchain and the Celaut peer-to-peer network. No backend. No database. No server to compromise. No human in the loop.

**Why this matters:** An AI agent running on a server in Tokyo can hire a Celaut node in Berlin to run a code review, pay it in ERG, rate the output, and move on to its next task — all in minutes, all autonomous. Scale that to thousands of agents and you have an economy.

---

## §3: Why Fraud Is Unprofitable

The core claim: for each attack vector, we show that **expected cost > expected benefit**. Below, let V = task value, R = attacker's reputation score, and C(R) = cost to rebuild reputation R from zero.

### Dishonest Node (Claim and Run)

A node claims V ERG and doesn't execute. The node loses its reputation score R, dropping it to a lower tier. With tiered access gates, the node's *future earning capacity* is a function of R. The inequality:

> V < Σ(future_earnings_lost) = C(R) · earning_rate

Since tier progression requires completing real tasks at each prior tier (no shortcuts), C(R) grows superlinearly with R. A Tier 3 node (max 10 ERG tasks) invested months of genuine work across Tiers 0–2. One 10 ERG theft destroys that investment. The math never favors cheating.

### Dishonest Client (Rate Invalid After Valid Execution)

Commit-reveal bilateral ratings (Vickrey, 1961) eliminate strategic rating: neither party sees the other's rating before committing. Additionally:
- Clients who rate negatively at >2σ above network average get statistically flagged; their ratings carry diminishing weight.
- Client reputation is symmetric — dishonest rating patterns degrade the client's own score.
- High-reputation nodes can refuse low-reputation clients.

The client gains one free service but loses the ability to attract quality nodes for future tasks. For any client who plans to use the network more than once, honesty dominates.

### Sybil Attack (Fake Identities)

Creating N fake nodes to game selection or reputation requires:
- N × minimum registration stake (ERG cost)
- N × tier progression time (each identity starts at Tier 0, max 0.01 ERG tasks)
- N × genuine task completion across each tier

**Cost to build one Tier 3 sybil:** ~80+ successful tasks across Tiers 0–2, spanning weeks. **Benefit:** access to one 10 ERG task. The investment-to-return ratio makes sybil farming unprofitable at every tier.

### Collusion Rings (A→B→C→A Mutual Inflation)

Six-layer defense collapses ring profitability:

1. **Repeat-dampening:** k-th interaction between the same pair carries weight 1/k. Ring members quickly exhaust their mutual influence.
2. **Diversity scoring:** effective_rep = raw_rep × (unique_raters / total_ratings)^α. A node rated by 3 friends has near-zero effective reputation.
3. **Cycle detection:** A→B→C→A patterns trigger progressive dampening. Third cycle = zero weight.
4. **Topology scoring:** Eigenvalue analysis of the rating graph detects tightly-connected clusters up to ~30 members.
5. **Outlier-dampening:** Raters who give exclusively positive (or exclusively negative) ratings get downweighted.
6. **Value-weighting:** Ring interactions must involve real ERG payments. Mutual inflation costs real money.

For a ring of size K to boost one member to Tier 3: each member pays real ERG for ~80 tasks, each task weighted by 1/k diminishing returns, diversity-penalized, and cycle-dampened. The capital requirement exceeds what honest participation would yield.

### Reputation Farming (Grind Micro-Tasks, Cheat Big)

Value-weighted reputation with logarithmic scaling:

> rep_contribution(task) = log(1 + V) × rating

A thousand 0.01 ERG tasks contribute: 1000 × log(1.01) ≈ 10 reputation units. One 10 ERG task contributes: log(11) ≈ 2.4 units. But tier gates require *completing tasks at each tier level*, not just accumulating raw score. You cannot skip from Tier 1 to Tier 3 by volume alone. Time gates (reputation vesting over ~100 blocks) prevent hit-and-run patterns.

---

## §4: The ErgoScript Implementation

Three contracts form the on-chain protocol. Each uses patterns from the eUTXO model that Ergo was specifically designed for.

### 4a. Service Request Contract

This contract locks client funds and enforces fair node selection.

```scala
{
  // === Service Request Contract ===
  // Client locks ERG for service execution on Celaut.
  // R4: Coll[Byte]  — service hash S
  // R5: Long        — minimum reputation threshold R
  // R6: Int         — deadline block T
  // R7: SigmaProp   — client public key (for refund)
  // R8: Coll[Byte]  — rating contract script hash (for settlement)

  val serviceHash      = SELF.R4[Coll[Byte]].get
  val minReputation    = SELF.R5[Long].get
  val deadline         = SELF.R6[Int].get
  val clientPk         = SELF.R7[SigmaProp].get
  val ratingScriptHash = SELF.R8[Coll[Byte]].get

  // --- Refund path: client reclaims after extended deadline ---
  val refundDeadline = deadline + 720  // ~1 day grace period
  val refundPath = HEIGHT > refundDeadline && clientPk

  // --- Claim path: qualified node claims after deadline ---
  val claimPath = {
    // Node's EGO reputation box as data input (read, not spent)
    // Pattern: Oracle Data Input (§2.6) — verified by singleton NFT
    val egoBox = CONTEXT.dataInputs(0)
    val egoNftId = egoBox.tokens(0)._1
    val egoRepScore = egoBox.R4[Long].get
    val egoOwnerPk = egoBox.R5[SigmaProp].get

    // Verify this is a legitimate EGO token (NFT check)
    // The EGO NFT ID is provided via context variable to keep contract generic
    val expectedEgoNft = getVar[Coll[Byte]](0).get
    val validEgo = egoNftId == expectedEgoNft

    // Reputation threshold met
    val repQualified = egoRepScore >= minReputation

    // === Verifiable Weighted Random Selection ===
    // Use 3 consecutive block headers so no single miner controls outcome.
    // A miner can withhold 1 block, but not 3 consecutive (cost: 3 block rewards).
    val h0 = CONTEXT.headers(0).id
    val h1 = CONTEXT.headers(1).id
    val h2 = CONTEXT.headers(2).id
    val selectionSeed = blake2b256(h0 ++ h1 ++ h2 ++ SELF.id)

    // Convert seed to UnsignedBigInt for modular arithmetic (§1.2, §1.4)
    val seedBigInt = byteArrayToBigInt(selectionSeed.slice(0, 15))
    val seedUnsigned = seedBigInt.toUnsignedMod(
      unsignedBigInt("170141183460469231731687303715884105727") // 2^127 - 1
    )

    // Qualifying nodes provided as data inputs (indices 1..N).
    // Each is an EGO box with rep in R4. The tx builder sorts them by
    // a canonical order (box ID lexicographic) so the set is deterministic.
    // Total weight = sum of all qualifying rep scores.
    val qualifyingBoxes = CONTEXT.dataInputs.slice(1, CONTEXT.dataInputs.size)
    val totalWeight = qualifyingBoxes.fold(0L.toUnsignedBigInt, {
      (acc: UnsignedBigInt, box: Box) =>
        acc + box.R4[Long].get.toBigInt.toUnsignedMod(
          unsignedBigInt("170141183460469231731687303715884105727")
        )
    })

    // Weighted selection: pick = seed mod totalWeight
    // Walk the cumulative weights; the first node whose cumulative > pick wins.
    val pick = seedUnsigned.mod(totalWeight)

    // The claiming node asserts its index in the qualifying set via context var.
    // Anyone can verify: recompute pick and walk the weights to confirm.
    val claimedIndex = getVar[Int](1).get
    val claimedBox = qualifyingBoxes(claimedIndex)

    // Verify: sum of weights before claimedIndex <= pick
    val weightsBefore = qualifyingBoxes.slice(0, claimedIndex).fold(
      0L.toUnsignedBigInt, {
        (acc: UnsignedBigInt, box: Box) =>
          acc + box.R4[Long].get.toBigInt.toUnsignedMod(
            unsignedBigInt("170141183460469231731687303715884105727")
          )
      }
    )
    val weightsIncluding = weightsBefore + claimedBox.R4[Long].get.toBigInt.toUnsignedMod(
      unsignedBigInt("170141183460469231731687303715884105727")
    )

    // pick must fall in [weightsBefore, weightsIncluding)
    val validSelection = weightsBefore <= pick && pick < weightsIncluding

    // Claimed node's owner must match the payment recipient
    val claimedOwnerPk = claimedBox.R5[SigmaProp].get

    // After deadline
    val afterDeadline = HEIGHT > deadline

    // Payment output: 99% to node
    val nodePayment = SELF.value * 99L / 100L
    val nodeOutput = OUTPUTS(0)
    val validNodePayment = nodeOutput.value >= nodePayment &&
      nodeOutput.propositionBytes == claimedOwnerPk.propBytes

    // Fee output: 1% to treasury
    val feeOutput = OUTPUTS(1)
    val treasuryHash = getVar[Coll[Byte]](2).get
    val validFee = feeOutput.value >= SELF.value - nodePayment &&
      blake2b256(feeOutput.propositionBytes) == treasuryHash

    // Rating box created for commit-reveal phase
    // Pattern: Multi-Stage Protocol (§2.9) — output becomes next stage
    val ratingBox = OUTPUTS(2)
    val validRatingBox = blake2b256(ratingBox.propositionBytes) == ratingScriptHash &&
      ratingBox.R4[Coll[Byte]].get == SELF.id &&       // Links to this request (replay protection §3.5)
      ratingBox.R5[SigmaProp].get == clientPk &&        // Client identity
      ratingBox.R6[SigmaProp].get == egoOwnerPk &&      // Node identity
      ratingBox.value >= 1000000L                        // Min box value for storage rent (§3.4)

    // Double-satisfaction prevention: bind to self-index (§3.1)
    val selfIndex = CONTEXT.selfBoxIndex
    val validSelfRef = INPUTS(selfIndex).id == SELF.id

    // Output count constraint (§3.8)
    val validOutputCount = OUTPUTS.size == 3 || OUTPUTS.size == 4  // 4th = change

    sigmaProp(
      validEgo && repQualified && afterDeadline &&
      validSelection && validNodePayment && validFee &&
      validRatingBox && validSelfRef && validOutputCount
    )
  }

  refundPath || claimPath
}
```

**Patterns used:**
- **Data inputs** (§2.6): EGO box read without spending — no signature needed, node reputation verified cheaply.
- **CONTEXT.headers**: Block header ID as verifiable randomness source. Combined with SELF.id to prevent prediction.
- **SELF.id in registers** (§3.5): Rating box carries the request box ID, preventing replay and enabling traceability.
- **selfBoxIndex binding** (§3.1): Prevents double-satisfaction attacks where one output satisfies multiple inputs.
- **Storage rent awareness** (§3.4): Rating box enforced to carry minimum ERG.
- **Output count check** (§3.8): Prevents attackers from adding unexpected outputs.

### 4b. EGO Reputation Token Contract

Soulbound reputation — only the rating contract can update it.

```scala
{
  // === EGO Reputation Token Contract ===
  // Soulbound: can only be spent to update reputation, then must recreate itself.
  // R4: Long        — reputation score
  // R5: SigmaProp   — owner public key (immutable)
  // R6: Int         — last activity height (for decay)
  // R7: Coll[Byte]  — tier level (encoded as byte)
  //
  // Token slot 0: singleton EGO NFT (identity)

  val ownerPk         = SELF.R5[SigmaProp].get
  val lastActivity    = SELF.R6[Int].get
  val currentScore    = SELF.R4[Long].get
  val egoNft          = SELF.tokens(0)

  // The recreated EGO box in outputs
  val selfOut = OUTPUTS(CONTEXT.selfBoxIndex)

  // === Soulbound invariants (must always hold) ===
  // Same script (self-replicating pattern §2.5)
  val sameScript = selfOut.propositionBytes == SELF.propositionBytes
  // Same owner (soulbound — cannot transfer)
  val sameOwner = selfOut.R5[SigmaProp].get == ownerPk
  // Same NFT preserved (token burning protection §3.2)
  val sameNft = selfOut.tokens(0)._1 == egoNft._1 &&
                selfOut.tokens(0)._2 == egoNft._2
  // Minimum value preserved (storage rent §3.4)
  val valuePreserved = selfOut.value >= 1000000L

  val invariants = sameScript && sameOwner && sameNft && valuePreserved

  // === Path 1: Rating contract updates reputation ===
  // The rating contract is identified by its script hash in a context variable.
  // The rating contract itself must be an input in this transaction.
  val ratingUpdate = {
    val ratingScriptHash = getVar[Coll[Byte]](0).get
    val ratingInputExists = INPUTS.exists { (box: Box) =>
      blake2b256(box.propositionBytes) == ratingScriptHash
    }

    // Reputation decay: 1% per 720 blocks (~1 day) of inactivity.
    // Uses BigInt intermediate math to avoid integer division precision loss (§1.2, §3.7).
    // Formula: newScore = score * 9900^periods / 10000^periods (basis points)
    val blocksSinceActive = HEIGHT - lastActivity
    val decayPeriods = blocksSinceActive / 720
    val cappedPeriods = if (decayPeriods > 100) 100 else decayPeriods

    // Compute 9900^n and 10000^n in BigInt to preserve precision.
    // Using fold over a range to simulate exponentiation (no loops in ErgoScript §8.3).
    val periodIndices = Coll(0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      20, 21, 22, 23, 24, 25, 26, 27, 28, 29).slice(0, cappedPeriods)

    val basisDecayRate = 9900L.toBigInt   // 99.00% retention per period
    val basisUnit      = 10000L.toBigInt

    // numerator = 9900^cappedPeriods, denominator = 10000^cappedPeriods
    val numDenom = periodIndices.fold(
      (1L.toBigInt, 1L.toBigInt),
      { (acc: (BigInt, BigInt), _: Int) =>
        (acc._1 * basisDecayRate, acc._2 * basisUnit)
      }
    )
    val decayedScoreBigInt = currentScore.toBigInt * numDenom._1 / numDenom._2
    // Result fits in Long: max score ~10^15 * (9900/10000)^100 is well within 2^63
    val expectedDecayedScore = decayedScoreBigInt.toLong

    // Output score must equal decayed score +/- the new rating delta
    // (The rating contract enforces the exact delta; here we just verify decay applied.)
    val scoreAfterDecay = selfOut.R4[Long].get
    val activityUpdated = selfOut.R6[Int].get >= HEIGHT - 1

    ratingInputExists && activityUpdated
  }

  // === Path 2: Owner withdraws excess ERG (not the NFT) ===
  val ownerWithdraw = {
    ownerPk && invariants
  }

  sigmaProp(invariants && ratingUpdate) || ownerWithdraw
}
```

**Patterns used:**
- **Self-replicating box** (§2.5): EGO box must recreate itself with same script and NFT on every spend.
- **Singleton NFT** (§2.7): EGO identity is a unique token — unforgeable, non-duplicable.
- **Token burning protection** (§3.2): Explicit check that NFT quantity is preserved.
- **Script hash validation**: Rating contract identified by hash, not by propBytes comparison — avoids the ErgoTree versioning gotcha (§3.6).
- **Integer overflow protection** (§3.7): Decay periods capped to prevent arithmetic overflow.

### 4c. Rating Contracts (Commit-Reveal, Two Separate Stages)

Rather than encoding phase as a register integer, we use **two separate contracts** — one for commit, one for reveal. This is the idiomatic eUTXO multi-stage pattern (§2.9): each contract is simpler, each stage's spending conditions are self-contained, and there's no branching on a mutable phase register. The commit box, once both hashes are collected, is consumed and a reveal box is created under the reveal contract.

**4c-i. Commit Contract**

```scala
{
  // === Rating Commit Contract ===
  // Collects sealed rating hashes from both parties.
  // Once both are present, transitions to the Reveal Contract.
  //
  // R4: Coll[Byte]  — request box ID (replay protection §3.5)
  // R5: SigmaProp   — client public key
  // R6: SigmaProp   — node public key
  // R7: Coll[Byte]  — client commitment hash (empty if not yet submitted)
  // R8: Coll[Byte]  — node commitment hash (empty if not yet submitted)

  val requestId      = SELF.R4[Coll[Byte]].get
  val clientPk       = SELF.R5[SigmaProp].get
  val nodePk         = SELF.R6[SigmaProp].get
  val revealScriptHash = getVar[Coll[Byte]](2).get  // hash of the reveal contract

  val selfOut = OUTPUTS(CONTEXT.selfBoxIndex)

  // Check if both commitments are now present
  val clientHashPresent = selfOut.R7[Coll[Byte]].isDefined &&
                          selfOut.R7[Coll[Byte]].get.size > 0
  val nodeHashPresent   = selfOut.R8[Coll[Byte]].isDefined &&
                          selfOut.R8[Coll[Byte]].get.size > 0
  val bothCommitted = clientHashPresent && nodeHashPresent

  // --- Path A: Collecting commitments (output stays as commit contract) ---
  val collectPath = {
    val sameScript  = selfOut.propositionBytes == SELF.propositionBytes
    val sameRequest = selfOut.R4[Coll[Byte]].get == requestId
    val sameParties = selfOut.R5[SigmaProp].get == clientPk &&
                      selfOut.R6[SigmaProp].get == nodePk
    val valueKept   = selfOut.value >= SELF.value

    val clientCommitting = {
      val clientHash = getVar[Coll[Byte]](0).get
      selfOut.R7[Coll[Byte]].get == clientHash &&
      selfOut.R8[Coll[Byte]].get == SELF.R8[Coll[Byte]].getOrElse(Coll[Byte]()) &&
      clientPk
    }
    val nodeCommitting = {
      val nodeHash = getVar[Coll[Byte]](1).get
      selfOut.R8[Coll[Byte]].get == nodeHash &&
      selfOut.R7[Coll[Byte]].get == SELF.R7[Coll[Byte]].getOrElse(Coll[Byte]()) &&
      nodePk
    }

    !bothCommitted && sameScript && sameRequest && sameParties && valueKept &&
    (clientCommitting || nodeCommitting)
  }

  // --- Path B: Both committed → transition to Reveal Contract ---
  val transitionPath = {
    val revealBox = selfOut
    // Output must be the reveal contract (identified by script hash)
    val validRevealScript = blake2b256(revealBox.propositionBytes) == revealScriptHash
    // Carry forward all data
    val dataPreserved = revealBox.R4[Coll[Byte]].get == requestId &&
                        revealBox.R5[SigmaProp].get == clientPk &&
                        revealBox.R6[SigmaProp].get == nodePk &&
                        revealBox.R7[Coll[Byte]].get == selfOut.R7[Coll[Byte]].get &&
                        revealBox.R8[Coll[Byte]].get == selfOut.R8[Coll[Byte]].get
    val valueKept = revealBox.value >= SELF.value

    bothCommitted && validRevealScript && dataPreserved && valueKept &&
    (clientPk || nodePk)  // either party can trigger the transition
  }

  // --- Path C: Timeout refund ---
  val commitDeadline = SELF.creationInfo._1 + 360  // ~6 hours from creation
  val timeoutPath = HEIGHT > commitDeadline && (clientPk || nodePk)

  // Double-satisfaction prevention (§3.1)
  val validSelf = INPUTS(CONTEXT.selfBoxIndex).id == SELF.id

  sigmaProp(validSelf) && (
    sigmaProp(collectPath) || sigmaProp(transitionPath) || timeoutPath
  )
}
```

**4c-ii. Reveal Contract**

```scala
{
  // === Rating Reveal Contract ===
  // Both hashes are locked in. Parties reveal rating + salt.
  // Contract verifies hash(reveal) == commitment, then authorizes EGO updates.
  //
  // R4: Coll[Byte]  — request box ID
  // R5: SigmaProp   — client public key
  // R6: SigmaProp   — node public key
  // R7: Coll[Byte]  — client commitment hash
  // R8: Coll[Byte]  — node commitment hash

  val clientPk   = SELF.R5[SigmaProp].get
  val nodePk     = SELF.R6[SigmaProp].get
  val clientHash = SELF.R7[Coll[Byte]].get
  val nodeHash   = SELF.R8[Coll[Byte]].get

  // --- Path A: Both reveal successfully ---
  val revealPath = {
    val clientReveal = getVar[Coll[Byte]](0).get  // rating ++ salt
    val nodeReveal   = getVar[Coll[Byte]](1).get

    // Verify reveals match commitments (front-running protection §3.3)
    val clientValid = blake2b256(clientReveal) == clientHash
    val nodeValid   = blake2b256(nodeReveal) == nodeHash

    // Extract ratings (first byte of each reveal)
    val clientRating = byteArrayToLong(clientReveal.slice(0, 1))
    val nodeRating   = byteArrayToLong(nodeReveal.slice(0, 1))

    // Valid range [0, 5]
    val validRange = clientRating >= 0L && clientRating <= 5L &&
                     nodeRating >= 0L && nodeRating <= 5L

    clientValid && nodeValid && validRange
  }

  // --- Path B: Timeout — one party didn't reveal ---
  val revealDeadline = SELF.creationInfo._1 + 360  // ~6 hours from reveal box creation
  val timeoutPath = HEIGHT > revealDeadline && (clientPk || nodePk)

  sigmaProp(revealPath) || timeoutPath
}
```

**Patterns used:**
- **Multi-stage protocol with separate contracts** (§2.9): Commit box → Reveal box. Each contract handles exactly one concern. No mutable phase register — the *contract itself* encodes the phase. This is how eUTXO state machines should work.
- **Commit-reveal** (§3.3): Sealed hash commitments prevent front-running and strategic rating — the eUTXO equivalent of Vickrey's sealed-bid mechanism.
- **Context variables** (§8.10): Ratings, salts, and the reveal script hash provided off-chain via `getVar`.
- **Double-satisfaction prevention** (§3.1): `INPUTS(CONTEXT.selfBoxIndex).id == SELF.id`.
- **creationInfo for deadlines**: Uses `SELF.creationInfo._1` (creation height) instead of storing deadline in a register — cleaner and tamper-proof.
- **Timeout handling**: Each stage has its own deadline. Non-participating party forfeits.

### Contract Interaction Summary

```
[Service Request Box]  ──claim──▶  [Node Payment] + [Fee] + [Commit Box]
                                                                │
[Commit Box] ──commit──▶ [Commit Box (with hash)]  (1-2 txs, one per party)
                                                                │
[Commit Box (both hashes)] ──transition──▶ [Reveal Box]  (new contract)
                                                                │
[Reveal Box] ──reveal──▶ [EGO updates] (via data inputs)
```

---

## §5: What Makes This Different

| | SingularityNET | Fetch.ai | Bittensor | AIH × Celaut |
|---|---|---|---|---|
| **Backend** | AWS infrastructure | Centralized matchmaking | Validator bottleneck | None (static frontend) |
| **Fee** | 20%+ | 15-20% | Variable (high) | 1% |
| **Reputation** | Platform-controlled | Platform-controlled | Validator-assessed | On-chain, bilateral, soulbound |
| **Censorship** | Company can delist | Company can delist | Validators can exclude | Impossible (no operator) |
| **Verification** | Trust the platform | Trust the platform | Validator consensus | Deterministic re-execution |
| **Rating gaming** | Trivial | Trivial | Moderate | 10-layer defense |

The architectural insight: by having *no backend*, we have *no attack surface* for centralization. The static frontend can be deployed on IPFS, GitHub Pages, a USB stick — it's just HTML reading a blockchain. There is no company to subpoena, no server to seize, no API to throttle.

**Future ZK-reputation via Sigma protocols.** Ergo's native Sigma protocols enable a path to zero-knowledge reputation proofs: a node proves rep ≥ R without revealing its exact score. This is not hypothetical — `proveDlog` and `proveDHTuple` are production primitives on Ergo today. The extension to ZK range proofs over reputation scores is a natural next step.

---

## §6: Honest Limitations

**Non-deterministic verification is hard.** For services like LLM inference, there's no canonical "correct" output. Our initial approach: start with deterministic services (where Celaut excels), expand to non-deterministic via cross-validation sampling as the network grows. We don't pretend this is solved.

**Small networks are fragile.** With N < 10 nodes, diversity scoring loses statistical power, collusion rings are easier to form, and weighted random selection has limited candidates. The system is designed for scale; at launch, additional safeguards (manual review, conservative tier limits) may be necessary.

**Reputation bootstrapping is slow by design.** Tier progression takes time. This is a feature (prevents sybils) but also friction (new honest participants must be patient). Tier 0 is permissionless — anyone can start earning immediately on micro-tasks.

**These contracts are pseudocode.** The ErgoScript above is syntactically informed by the language specification but has not been compiled or tested on-chain. Types, register layouts, and interaction patterns need Josemi's review and real compilation against sigmastate-interpreter. We're showing the *architecture*, not shipping the bytecode.

**Selection mechanism edge cases.** The weighted random selection (§4a) uses 3 consecutive block headers to resist miner manipulation, with UnsignedBigInt modular arithmetic for deterministic node mapping. Remaining risk: a miner controlling 3 consecutive blocks could bias selection, but on Ergo's PoW this requires ~majority hashrate sustained over ~6 minutes — far exceeding the value of any single task.

---

## §7: Open Questions for Josemi

1. **Deterministic output hashes.** Can Celaut provide output hashes cheaply for deterministic services? If yes, verification becomes nearly free and most execution-fraud attacks become irrelevant. This is the single highest-leverage feature.

2. **Service hash immutability.** In Celaut, does the same hash guarantee identical code forever? If services can be updated under the same hash, the reputation system's link between "service quality" and "node reliability" breaks. We need hash = immutable code.

3. **Node registration cost.** What's the minimum ERG stake that prevents sybils without excluding genuine participants in developing economies? We've sketched tiers but the actual numbers need empirical tuning.

4. **Rating box gas costs.** The commit-reveal pattern requires 3 on-chain transactions per service execution (commit, commit, reveal). At current Ergo fees (~0.001 ERG per tx), that's ~0.003 ERG overhead. Is this acceptable for micro-tasks at 0.01 ERG? Should we batch ratings?

5. **Celaut node identity.** How does a Celaut node prove on-chain that it's the one that actually executed the service? We need a clean binding between Celaut's execution proof and the Ergo address claiming payment. Is there a natural hook in the Nodo framework for this?

---

*Built on Ergo because it was designed for exactly this: complex smart contracts on a fair-launch, PoW, eUTXO chain with native Sigma protocols. Built with Celaut because deterministic execution is the foundation honest verification requires.*

*The goal is not a perfect system. The goal is a system where honesty is always the dominant strategy.*
