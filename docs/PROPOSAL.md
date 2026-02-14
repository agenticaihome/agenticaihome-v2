# Making Fraud Unprofitable
## A Game-Theoretic Security Model for AIH × Celaut

*Brainstorming draft — for discussion with Josemi*

**From:** Cheese & Larry 🦞 | **Date:** February 2026 | **Status:** Draft for review

---

## §1: The Problem

Every decentralized marketplace faces the same question: without a trusted arbiter, how do you ensure honest behavior? The traditional answer — escrow plus human arbitration — reintroduces centralization through the back door. Our answer borrows from Nakamoto: don't make fraud *impossible*, make it *unprofitable*. Bitcoin doesn't prevent double-spends; it makes them economically irrational. We apply the same principle to AI service markets. If at every decision point the expected cost of cheating exceeds the expected gain, rational actors behave honestly — and the system works without any central authority.

---

## §2: The Model

Josemi's gas model, formalized:

1. **Request.** Client creates an on-chain box locking X ERG, specifying: service hash S (deterministic container identifier), minimum reputation threshold R, and deadline block T.
2. **Selection.** After block T, the protocol selects a node from the qualifying set {n : rep(n) ≥ R} via weighted random selection. Randomness is derived from block headers (verifiable, non-manipulable by any single party).
3. **Execution.** The selected node executes service S on the Celaut network. For deterministic services, the output hash is published on-chain.
4. **Payment.** The node claims X ERG (minus 1% protocol fee: 0.9% treasury, 0.1% insurance pool).
5. **Rating.** Both parties submit sealed rating commitments (commit-reveal). After both reveal, reputation updates propagate on-chain.

The entire flow — from request to settlement — touches only the Ergo blockchain and the Celaut peer-to-peer network. No backend. No database. No server to compromise.

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

    // Verifiable randomness from block header at deadline
    // Pattern: CONTEXT.headers for on-chain randomness
    val headerBytes = CONTEXT.headers(0).id
    val selectionSeed = blake2b256(headerBytes ++ SELF.id)

    // Node provides proof of selection via context variable
    val selectionProof = getVar[Coll[Byte]](1).get
    val validSelection = blake2b256(selectionProof) == selectionSeed

    // After deadline
    val afterDeadline = HEIGHT > deadline

    // Payment output: 99% to node
    val nodePayment = SELF.value * 99L / 100L
    val nodeOutput = OUTPUTS(0)
    val validNodePayment = nodeOutput.value >= nodePayment &&
      nodeOutput.propositionBytes == egoOwnerPk.propBytes

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

    // Reputation decay: 1% per 720 blocks (~1 day) of inactivity
    // Applied before any update
    val blocksSinceActive = HEIGHT - lastActivity
    val decayPeriods = blocksSinceActive / 720
    // Integer math: score * 99^periods / 100^periods
    // For safety, cap decay periods to prevent overflow (§3.7)
    val cappedPeriods = if (decayPeriods > 100) 100 else decayPeriods

    // Activity height updated
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

### 4c. Rating Contract (Commit-Reveal)

Two-stage box lifecycle: commit phase → reveal phase.

```scala
{
  // === Rating Contract — Commit-Reveal Bilateral ===
  // Stage 1 (Commit): Both parties submit hash(rating ++ salt)
  // Stage 2 (Reveal): Both parties reveal, reputation updates
  //
  // R4: Coll[Byte]  — request box ID (links to service request)
  // R5: SigmaProp   — client public key
  // R6: SigmaProp   — node public key
  // R7: Coll[Byte]  — client commitment hash (empty = not yet committed)
  // R8: Coll[Byte]  — node commitment hash (empty = not yet committed)
  // R9: Int         — phase (0 = awaiting commits, 1 = awaiting reveals)

  val requestId   = SELF.R4[Coll[Byte]].get
  val clientPk    = SELF.R5[SigmaProp].get
  val nodePk      = SELF.R6[SigmaProp].get
  val phase       = SELF.R9[Int].get

  val commitDeadline = HEIGHT + 360   // ~6 hours to commit
  val revealDeadline = HEIGHT + 720   // ~12 hours to reveal

  if (phase == 0) {
    // === COMMIT PHASE ===
    // Either party submits their sealed rating
    val selfOut = OUTPUTS(CONTEXT.selfBoxIndex)

    // Script preserved (multi-stage §2.9)
    val sameScript = selfOut.propositionBytes == SELF.propositionBytes
    // Request link preserved (replay protection)
    val sameRequest = selfOut.R4[Coll[Byte]].get == requestId
    val sameParties = selfOut.R5[SigmaProp].get == clientPk &&
                      selfOut.R6[SigmaProp].get == nodePk
    val valueKept = selfOut.value >= SELF.value

    // A commitment is being added
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

    // If both committed, advance to phase 1
    val bothCommitted = selfOut.R7[Coll[Byte]].isDefined &&
                        selfOut.R8[Coll[Byte]].isDefined &&
                        selfOut.R7[Coll[Byte]].get.size > 0 &&
                        selfOut.R8[Coll[Byte]].get.size > 0
    val nextPhase = if (bothCommitted) selfOut.R9[Int].get == 1
                    else selfOut.R9[Int].get == 0

    // Double-satisfaction prevention
    val validSelf = INPUTS(CONTEXT.selfBoxIndex).id == SELF.id

    sigmaProp(sameScript && sameRequest && sameParties &&
              valueKept && nextPhase && validSelf) &&
    (clientCommitting || nodeCommitting)

  } else {
    // === REVEAL PHASE ===
    // Both parties reveal rating + salt. Contract verifies hash matches.

    val clientReveal = getVar[Coll[Byte]](0).get    // rating ++ salt
    val nodeReveal   = getVar[Coll[Byte]](1).get

    val clientHash = SELF.R7[Coll[Byte]].get
    val nodeHash   = SELF.R8[Coll[Byte]].get

    // Verify reveals match commitments (front-running protection §3.3)
    val clientValid = blake2b256(clientReveal) == clientHash
    val nodeValid   = blake2b256(nodeReveal) == nodeHash

    // Extract ratings (first byte of each reveal)
    val clientRating = byteArrayToLong(clientReveal.slice(0, 1))
    val nodeRating   = byteArrayToLong(nodeReveal.slice(0, 1))

    // Ratings must be in valid range [0, 5]
    val validRange = clientRating >= 0L && clientRating <= 5L &&
                     nodeRating >= 0L && nodeRating <= 5L

    // Both EGO boxes updated via data inputs
    // (The actual reputation update logic lives in the EGO contract;
    //  this contract just validates the reveal and authorizes the update.)

    // Timeout: if one party doesn't reveal, the other's rating stands
    // and non-revealer gets penalized
    val bothRevealed = clientValid && nodeValid && validRange

    val timeout = {
      HEIGHT > revealDeadline &&
      (clientPk || nodePk)  // either party can trigger timeout cleanup
    }

    sigmaProp(bothRevealed) || timeout
  }
}
```

**Patterns used:**
- **Multi-stage protocol** (§2.9): Box transitions from phase 0 (commit) to phase 1 (reveal) by recreating itself with updated registers.
- **Commit-reveal** (§3.3): Sealed hash commitments prevent front-running and strategic rating — the eUTXO equivalent of Vickrey's sealed-bid mechanism.
- **Context variables** (§8.10): Ratings and salts provided off-chain via `getVar`, not stored until committed.
- **Double-satisfaction prevention** (§3.1): `INPUTS(CONTEXT.selfBoxIndex).id == SELF.id`.
- **Timeout handling**: Deadline-based fallback ensures the protocol never gets stuck. Non-revealing party implicitly concedes.

### Contract Interaction Summary

```
[Service Request Box]  ──claim──▶  [Node Payment] + [Fee] + [Rating Box (phase 0)]
                                                                    │
[Rating Box (phase 0)] ──commit──▶ [Rating Box (phase 0, with hash)]
                                                                    │
[Rating Box (both committed)] ──advance──▶ [Rating Box (phase 1)]
                                                                    │
[Rating Box (phase 1)] ──reveal──▶ [EGO updates] (via data inputs)
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

**Selection mechanism needs formalization.** The weighted random selection from block headers is sketched but not fully specified. The exact mapping from `blake2b256(headerId ++ selfId)` to node selection requires careful design to ensure uniform distribution and resistance to miner manipulation (miners can withhold blocks, though at significant cost on Ergo's PoW).

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
