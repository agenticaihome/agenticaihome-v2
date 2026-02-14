# Verification Design: Economically-Incentivized Honest AI Execution
## AgenticAiHome × Celaut — Execution Integrity System v4

*Post-audit revision. Honest about what's buildable today vs. what's research.*

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [How Other Networks Do It](#how-other-networks-do-it)
3. [The 7 Holes & Their Fixes](#the-7-holes--their-fixes)
4. [Core Mechanisms: Bonding, Canaries, Tiered Verification](#core-mechanisms)
5. [Attack Vectors & Anti-Gaming](#attack-vectors--anti-gaming)
6. [Task Lifecycle](#task-lifecycle)
7. [Execution Receipt Spec](#execution-receipt-spec)
8. [On-Chain Box Architecture (7 Box Types)](#on-chain-box-architecture)
9. [Cost Analysis & Honest Limitations](#cost-analysis--honest-limitations)
10. [Implementation Roadmap (30-38 Weeks)](#implementation-roadmap)
11. [Open Questions for Josemi](#open-questions-for-josemi)
12. [Open Design Questions](#open-design-questions)
13. [Future Research: Deterministic Verification](#future-research)

---

## Design Philosophy

Three constraints shape every decision:

1. **Zero backends.** Ergo blockchain + Celaut P2P (content-addressed storage + execution). No servers, no databases, no indexers we control.
2. **eUTXO model.** Ergo boxes with registers R4-R9 (6 user registers), spent via ErgoScript guard conditions. No global mutable state — everything flows through box chains.
3. **Josemi's gas model compatibility.** Client locks ERG → node claims after deadline → node executes → both rate. We augment this flow; we don't replace it.

### What Actually Secures This System

**The real security of AIH comes from layered economic deterrence, not cryptographic verification of LLM output.** This is an important distinction.

Today, nobody can cheaply prove that an LLM produced a specific output on specific hardware. ZK-ML is years away for large models. Bisection protocols for autoregressive inference have unsolved engineering challenges (see [Future Research](#future-research)).

What we CAN do today:
- **Make fraud unprofitable** via bonding (nodes lose more than they gain by cheating)
- **Detect fraud probabilistically** via canary tasks (mystery shoppers)
- **Build reputation systems** where honest history is worth more than any single cheat
- **Gate task values** so nodes must invest months of honest work before accessing high-value tasks

This is the same security model that makes insurance fraud rare — not because it's impossible, but because the expected cost exceeds the expected gain. The innovation is implementing this on Ergo's eUTXO model in a fully decentralized way.

---

## How Other Networks Do It

### Truebit — Verification Game
- **Model:** Solver executes, Verifier checks. If disagreement, binary search through execution trace to find the single divergent step. That step is adjudicated on-chain.
- **Key insight:** You never re-execute the whole computation on-chain. You narrow down to one step.
- **Limitation:** Requires deterministic execution in a metered VM (WASM). Doesn't directly work for LLMs.
- **What we take:** The "verification game" concept. The "forced error" mechanism.

### iExec — Proof of Contribution (PoCo)
- **Model:** Multiple workers execute the same task. Results are compared. Consensus wins.
- **Key insight:** Redundant execution IS the verification.
- **Limitation:** 3x-5x cost overhead.
- **What we take:** Configurable trust levels — clients choose redundancy.

### Gensyn — Probabilistic Proof of Learning
- **Model:** Verify ML training using optimization metadata (gradient checkpoints, loss curves).
- **Key insight:** You can verify much cheaper than you can execute, with the right probes.
- **Limitation:** Specific to gradient-based ML training. Not directly applicable to inference.
- **What we take:** "Verification probes" — lightweight checks cheaper than full re-execution.

### Ritual — Execute Once, Verify Many Times
- **Model:** Moving toward ZK proofs for AI inference.
- **Limitation:** ZK proofs for large ML models are currently impractical.
- **What we take:** The aspiration. ZK-ML is coming (EZKL, Modulus Labs). Our receipt system should be ready.

### Summary: What's Practical Today

| Approach | LLMs? | Cost Overhead | Practical? |
|----------|-------|---------------|------------|
| Full re-execution | ❌ Non-deterministic | 2x+ | Deterministic only |
| Redundant execution (iExec) | ⚠️ Approximate | 3-5x | ✅ But expensive |
| ZK proofs (Ritual/EZKL) | ❌ Too slow | Proving cost | ❌ Not yet for LLMs |
| Probabilistic probes (Gensyn) | ⚠️ Adaptable | 0.1-0.5x | ⚠️ Task-specific |
| **Optimistic + economic deterrence** | **✅** | **~0 (optimistic)** | **✅ Our approach** |

---

## The 7 Holes & Their Fixes

### Hole 1: No Verifiers — "Anyone Can Verify" But Nobody Does

**Problem:** No incentive to verify. Rational actors free-ride.

**Fix: Funded Verification Bounties + Canary Tasks**

**Mechanism A: Verification Bounties**

1. Every task's payment includes a verification fee (2% of task value), locked in a **VerificationBountyBox**.
2. Any node can claim by re-executing and submitting the result hash on-chain.
   - Match → verifier gets the bounty
   - Mismatch → verifier gets the bounty PLUS triggers slashing process
3. Forced verification (Truebit-style): randomly (1 in 20 tasks via `blake2b(block_header ++ task_id) % 20 == 0`), payment is held until at least one verifier confirms.

**Mechanism B: Canary Tasks (Mystery Shoppers)**

The network injects fake tasks with known-correct answers. See [Canary Tasks](#canary-tasks) in Core Mechanisms.

**On-chain flow for bounties:**
```
TaskEscrowBox → splits into →
  PaymentEscrowBox (98% of payment, claimable by node with receipt)
  VerificationBountyBox (2% of payment, claimable by any verifier)
```

---

### Hole 2: Node Controls the Receipt — Can Fake the Input

**Problem:** Node publishes both `input_hash` and `output_hash`. Can run a cheap computation on dummy input.

**Fix: Client Commits Input Hash On-Chain BEFORE Node Sees It**

1. Client commits `H(input || client_salt)` in TaskEscrowBox.
2. Node executes and publishes receipt with `output_hash`.
3. Client reveals `client_salt` on-chain. Anyone can verify the input commitment matches.

If client never reveals salt: after timeout, node's receipt stands unchallenged.

---

### Hole 3: Off-Chain Data Availability

**Problem:** Receipt data stored off-chain could disappear.

**Fix: Multi-Layer Storage (Celaut P2P, no IPFS)**

- **Layer 1: On-chain hashes** (permanent, ~100 bytes per task on Ergo)
- **Layer 2: Celaut P2P network** (nodes self-interested in keeping their receipts available — receipts prove honest work. Content-addressed by hash.)
- **Layer 3: Client-side archival** (client software archives locally)

**Realistic stance:** Most receipt data matters for ~30 days (dispute window). After that, reputation effects are baked in. On-chain hashes survive permanently.

---

### Hole 4: Receipt Publication is Optional — Node Gets Paid Without Publishing

**Problem:** Node claims payment after deadline with no requirement to execute.

**Fix: Escrow with Receipt-Gated Release**

```
Client locks ERG → node claims task → node executes →
node publishes receipt on-chain → receipt triggers payment release

If no receipt by deadline+grace → ERG returns to client
```

**ErgoScript guard:**
```scala
{
  val nodeClaimsPayment = {
    val receiptBox = OUTPUTS(0)
    receiptBox.R4[Coll[Byte]].get == SELF.id &&
    receiptBox.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get &&
    receiptBox.R6[Coll[Byte]].get.size > 0 &&
    HEIGHT > SELF.R8[Int].get
  }
  
  val clientRefund = {
    HEIGHT > SELF.R8[Int].get + GRACE_PERIOD &&
    OUTPUTS(0).propositionBytes == clientPubKey
  }
  
  nodeClaimsPayment || clientRefund
}
```

No receipt = no payment. Enforceable on-chain, no backend.

---

### Hole 5: Privacy is Dead — Publishing Inputs Exposes Everything

**Problem:** Verification requires data visibility; business use requires privacy.

**Fix: Tiered Privacy**

- **Tier 0: Hash-only (default)** — on-chain: `input_commitment`, `output_hash`. Reveals nothing. Disputes require client to reveal input.
- **Tier 1: Encrypted receipt** — Receipt data encrypted with threshold key. Only decrypted during disputes.
- **Tier 2: Public receipt** — Full data on Celaut P2P. Maximum verifiability.

**What's genuinely impossible today:** Fully private verification (nobody sees input) requires ZK-ML. Not production-ready for large models. 2-3 years out.

---

### Hole 6: LLM Non-Determinism — "Bounded Verification" is Hand-Wavy

**Problem:** Two honest LLM runs produce different outputs. How to verify?

**Fix: Concrete Approaches (with honest caveats)**

**Approach A: Deterministic Pinning (when possible)**
- `seed` parameter + `temperature=0` + same runtime = deterministic
- Verification: re-run with same seed → must get identical output

**Approach B: Embedding Similarity**

⚠️ **Honest caveat:** The thresholds below are NOT empirically validated. They are reasonable starting points based on general embedding model behavior, but real benchmarking across task types is needed before production use. Per-task-type thresholds will likely be necessary. This is Phase 3+ work.

1. Run both outputs through `sentence-transformers/all-MiniLM-L6-v2`
2. Compute cosine similarity
3. Proposed starting threshold: cosine similarity > 0.85 = functionally equivalent
4. Below 0.85 but above 0.60 = suspicious, flag for review
5. Below 0.60 = fraud likely

**Known weaknesses:**
- Code generation: two correct implementations can have cosine similarity < 0.5
- Creative writing: two valid haikus about cats might score 0.6
- The 0.85 threshold would produce false positives (flagging honest variance) and false negatives (accepting model substitution)
- Per-task-type calibration is essential — a global threshold is a starting point, not a solution

**What's needed:** Empirical benchmarking across task types with published ROC curves. This is a research task, not a configuration parameter.

**Approach C: Model Fingerprinting**
- Different models have statistical signatures (vocabulary distribution, perplexity)
- ⚠️ Cited without strong evidence. Academic research exists but reliability is lower than implied, especially for models in the same family or different quantizations of the same model. Treat as supplementary signal, not primary detection.

**Approach D: Client-side Lightweight Verification**
- Client runs a small model locally to sanity-check
- Catches: empty responses, wrong language, garbage, completely off-topic
- Doesn't catch: subtle model substitution (GPT-3.5 vs GPT-4)

---

### Hole 7: No Receipt ≠ Guilt — Legitimate Failures vs Fraud

**Problem:** Nodes fail legitimately (crashes, OOM, timeouts). Can't distinguish from fraud.

**Fix: Failure Receipts + Grace Periods + Escalating Consequences**

```
FailureReceipt {
  task_id, node_id,
  failure_type: SERVICE_CRASH | RESOURCE_EXCEEDED | INPUT_INVALID | 
                NETWORK_FAILURE | HONEST_INABILITY,
  failure_evidence_hash, evidence_uri,
  timestamp, node_sig
}
```

**Flow:**
- **Success:** Receipt → payment released → both rate
- **Failure within grace period:** FailureReceipt → payment returns → no penalty, failure count incremented
- **No receipt at all:** After deadline → payment returns, small reputation hit. 3 consecutive → suspension
- **Repeated failures:** >20% failure rate over last 100 tasks → warning. >40% → suspension

---

## Core Mechanisms

### Node Bonding

Nodes lock ERG proportional to the maximum task value they can claim. This provides **immediate economic penalty** for cheating, independent of verification accuracy.

1. Node creates a **BondBox** on-chain locking B ERG
2. Node can claim tasks up to value B × BOND_MULTIPLIER (e.g., 2x)
3. If caught cheating: bond is slashed
4. Bond withdrawal requires `active_task_count == 0` AND cooldown period passed

**Counter-box pattern for active task tracking:**

The BondBox maintains an `active_task_count` register. This prevents the bypass where a node simply omits active task boxes from data inputs.

```scala
// When claiming a task: tx MUST spend the BondBox and recreate it with count+1
val claimTask = {
  val oldBond = SELF
  val newBond = OUTPUTS(0)
  // Same node, same bond amount, count incremented by exactly 1
  newBond.R4[Coll[Byte]].get == oldBond.R4[Coll[Byte]].get &&
  newBond.R5[Long].get == oldBond.R5[Long].get &&
  newBond.R6[Int].get == oldBond.R6[Int].get + 1 &&
  newBond.propositionBytes == oldBond.propositionBytes
}

// When completing/failing a task: tx MUST spend BondBox and recreate with count-1
val completeTask = {
  val oldBond = SELF
  val newBond = OUTPUTS(0)
  newBond.R4[Coll[Byte]].get == oldBond.R4[Coll[Byte]].get &&
  newBond.R5[Long].get == oldBond.R5[Long].get &&
  newBond.R6[Int].get == oldBond.R6[Int].get - 1 &&
  newBond.R6[Int].get >= 0 &&
  newBond.propositionBytes == oldBond.propositionBytes
}

// Withdrawal: count must be 0 AND cooldown passed
val withdraw = {
  SELF.R6[Int].get == 0 &&
  HEIGHT > SELF.R7[Int].get + COOLDOWN_BLOCKS
}

// Slashing: valid fraud proof in data inputs
val slashed = {
  val fraudProof = CONTEXT.dataInputs(0)
  // ... fraud proof validation logic ...
  val slashTo_challenger = OUTPUTS(0).value >= SELF.value * 50 / 100
  val slashTo_pool = OUTPUTS(1).value >= SELF.value * 30 / 100
  true // simplified — real guard validates fraud proof authenticity
}

sigmaProp(claimTask || completeTask || withdraw || slashed)
```

**Key:** The counter is enforced by ErgoScript. A node cannot withdraw while tasks are active because the counter is on-chain and immutable. They cannot skip the increment because the claim transaction requires spending the BondBox.

**Why bonding works even without perfect verification:**
- A node with 10 ERG bonded can claim up to 20 ERG in tasks
- If caught cheating on ONE task, they lose the entire 10 ERG bond
- With canary rate = 5%: expected cost of cheating = 0.05 × 10 = 0.5 ERG per task
- Only profitable if task value > 0.5 ERG AND the node plans to cheat and disappear — but withdrawal has a cooldown, so they can't run

**BondBox registers:**
```
R4: node_address
R5: bond_amount (locked ERG)
R6: active_task_count (incremented on claim, decremented on complete/fail)
R7: last_activity_block (for cooldown calculation)
R8: slash_conditions_hash
R9: max_claimable = bond_amount * BOND_MULTIPLIER
```

---

### Canary Tasks

The network injects fake tasks with known-correct answers. This is the single most cost-effective quality assurance mechanism.

**How it works:**
1. A canary budget (funded by 0.5% of all task fees) creates canary tasks indistinguishable from real tasks.
2. Canary tasks use real services with pre-computed correct outputs.
3. **5% canary rate** — nodes never know which tasks are canaries.
4. After execution, the canary system compares the node's output against the known-correct answer.
5. Fail a canary = reputation hit + bond slash risk.

**Bootstrap problem (unsolved):** With < 20 nodes, who creates canaries? The committee model (5 high-reputation nodes) doesn't work when there are only 3 nodes. Options:
- Trusted bootstrapper (AIH team) that transitions to committee — pragmatic but centralized
- No canaries until critical mass — honest about the cold-start security gap
- This is an open design question. See [Open Design Questions](#open-design-questions).

**Canary committee centralization risk:** In a young network, committee members might collude, warn friendly nodes, or create distinguishable canaries. The "no single member knows others' canaries" helps but doesn't eliminate the risk with 3/5 collusion.

---

### Tiered Verification by Task Value

Not all tasks need the same security.

| Tier | Task Value | Verification Method | Overhead |
|------|-----------|---------------------|----------|
| **Micro** | < 0.1 ERG | Optimistic + canaries only | ~0% |
| **Medium** | 0.1 - 5 ERG | Optimistic + commitment chain + canaries | ~2% |
| **High** | 5 - 50 ERG | Dual execution + embedding comparison | ~100% |
| **Critical** | 50+ ERG | Triple execution + panel review on disagreement | ~200% |

Client can always opt for a HIGHER tier. Can never opt LOWER than the minimum for their task value.

---

### Reputation Tiers with Progressive Unlocking

```
Tier 0 (New):      Max 0.01 ERG    | Micro-tasks only      | No bond required
Tier 1 (Novice):   Max 0.1 ERG     | After 10 successful   | No bond required
Tier 2 (Skilled):  Max 1 ERG       | After 10 Tier 1 tasks | Bond: 1 ERG
Tier 3 (Expert):   Max 10 ERG      | After 20 Tier 2 tasks | Bond: 5 ERG
Tier 4 (Elite):    Max 100 ERG     | After 50 Tier 3 tasks | Bond: 20 ERG
```

Each tier requires completing tasks at the *previous* tier. The economic cost of cheating at Tier 4 = all genuine work at Tiers 0-3 + 20 ERG bond.

### Reputation Decay
- 1% per epoch without activity
- Forces ongoing participation
- ⚠️ **Caveat:** This can create perverse incentives — nodes may accept tasks they can't properly execute just to maintain reputation. May need a "maintenance mode" that slows decay without requiring task acceptance.

### Commit-Reveal Bilateral Rating
Both parties submit `H(rating || salt)` within N blocks, then reveal. Eliminates strategic/retaliatory rating entirely.

---

## Attack Vectors & Anti-Gaming

### Client-Side Attacks

| Attack | Description | Defense |
|--------|-------------|---------|
| **A1: Dishonest Rating** | Client receives valid execution, rates invalid | Commit-reveal rating + execution receipts disprove lies |
| **A2: Sybil Clients** | Multiple wallets spread negative ratings | Verified-purchase filter + minimum reputation to post tasks |
| **A3: Underpaying** | ERG far below execution cost | Node's responsibility to filter. Market self-corrects. |
| **A4: Targeted Attack** | High min-reputation to isolate specific node | Weighted random selection among qualifying nodes |

### Node-Side Attacks

| Attack | Description | Defense |
|--------|-------------|---------|
| **B1: Claim and Run** | Take ERG, never execute | Receipt-gated payment + bonding |
| **B2: Model Substitution** | Run cheaper model than promised | Canaries + embedding similarity (with caveats) |
| **B3: Sybil Nodes** | Many fake nodes to game selection | Minimum bond per node + probationary gates |
| **B4: Reputation Laundering** | Build rep on tiny tasks, cheat on big one | Value-weighted tiers + bonding proportional to max task value |

### System-Level Attacks

| Attack | Description | Defense |
|--------|-------------|---------|
| **C1: Rating Rings** | A↔B mutual positive ratings | Circular detection + real ERG must be exchanged |
| **C2: Canary Gaming** | Node tries to identify canary tasks | Canaries indistinguishable from real tasks by design |
| **C3: Slow-Drain** | Node provides 95% quality forever | ⚠️ Hard to catch per-task. Caught statistically over time via canaries, but the 0.85 embedding threshold specifically enables this. Open problem. |
| **C4: Lazy Verification** | Verifier copies node's hash without re-executing | ⚠️ Verifier's Dilemma — if fraud is rare, verifiers stop checking. Forced-error mechanism partially addresses this but isn't fully designed. Open problem. |

### Attacks Not Addressed

These are acknowledged gaps:
1. **Eclipse attacks on P2P layer** — attacker controls client's connected nodes
2. **Canary oracle attack** — adversarial examples against the embedding model used for similarity
3. **Nation-state actors** — different incentive model than rational economic actors
4. **Time-bandit attacks** — Ergo's hashrate makes block reorgs theoretically possible

---

## Task Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE TASK LIFECYCLE v4                    │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: TASK CREATION (Client)
═══════════════════════════════
  Client creates TaskEscrowBox:
  ┌──────────────────────────────────────────┐
  │ TaskEscrowBox                            │
  │   R4: service_hash                       │
  │   R5: H(input ‖ client_salt)             │
  │   R6: payment_amount                     │
  │   R7: min_reputation                     │
  │   R8: deadline_block                     │
  │   R9: (privacy_tier, verification_tier)  │
  │       packed as (tier << 4 | ver_tier)   │
  └──────────────────────────────────────────┘
  Client uploads encrypted input to Celaut P2P.

PHASE 2: NODE CLAIMS TASK
═════════════════════════
  Qualifying node (reputation ≥ min, bond ≥ required) claims.
  
  Transaction MUST spend the node's BondBox and recreate it
  with active_task_count + 1 (enforced by ErgoScript).
  
  TaskEscrowBox → splits into:
  ┌─────────────────────────┐  ┌──────────────────────────┐
  │ PaymentEscrowBox        │  │ VerificationBountyBox    │
  │   98% of payment        │  │   2% of payment          │
  └─────────────────────────┘  └──────────────────────────┘
  
  For HIGH/CRITICAL tiers: task also sent to 2nd/3rd node.

PHASE 3: EXECUTION
═══════════════════
  Node executes service on Celaut.
  
  SUCCESS → sends output to client via P2P → Phase 4
  FAILURE → publishes FailureReceipt → payment returns →
            BondBox recreated with count-1 → end

PHASE 4: RECEIPT PUBLICATION
════════════════════════════
  Node publishes ReceiptBox (required for payment release).
  BondBox recreated with active_task_count - 1.

PHASE 5: VERIFICATION WINDOW
═════════════════════════════
  VERIFICATION_WINDOW opens (100 blocks / ~3.3 hours).

  Automatic checks:
  - Canary comparison (if canary task)
  - Dual/triple execution comparison (if high/critical tier)
  
  Optional checks by verifiers:
  - Embedding similarity
  - Full re-execution (bounty-funded)
  
  NO DISPUTE → both rate (commit-reveal) → complete.
  DISPUTE → panel review (Phase 4+) or automatic re-execute for deterministic services.

PHASE 6: RATING (Bilateral Commit-Reveal)
══════════════════════════════════════════
  Both submit H(rating ‖ salt) → reveal → recorded.
```

---

## Execution Receipt Spec

```
ExecutionReceipt_v4 {
  task_id:            ErgoBoxId
  service_hash:       Blake2b256
  node_id:            Address
  input_commitment:   Blake2b256      // H(input ‖ client_salt)
  output_hash:        Blake2b256
  output_uri:         String          // Celaut P2P content address
  exec_params: {
    model_id:         String
    temperature:      Float
    seed:             Optional<Long>
    max_tokens:       Int
  }
  resource_usage: {
    compute_ms:       Long
    memory_mb:        Int
  }
  verification_tier:  Enum {MICRO, MEDIUM, HIGH, CRITICAL}
  status:             Enum {SUCCESS, FAILURE}
  failure_info:       Optional<FailureReceipt>
  privacy_tier:       Int
  node_sig:           Signature
  timestamp:          Long
  storage_proofs: [{
    storage_type:     Enum {CELAUT_P2P}
    content_cid:      String
  }]
}
```

**On-chain footprint (ReceiptBox registers):**
- R4: `task_id` (32 bytes)
- R5: `input_commitment` (32 bytes)
- R6: `output_hash` (32 bytes)
- R7: `H(exec_params)` (32 bytes)
- R8: `node_sig` (64 bytes)
- R9: `receipt_cid` (46 bytes)

**Total on-chain: ~238 bytes per receipt.** Full receipt on Celaut P2P.

---

## On-Chain Box Architecture

### MVP Box Types (7)

```
1. TaskEscrowBox         — Client creates. Payment + input commitment.
2. ReceiptBox            — Node publishes execution proof.
3. FailureReceiptBox     — Node reports legitimate failure.
4. BondBox               — Node's locked collateral with active task counter.
5. RatingBox             — Commit-reveal bilateral rating.
6. VerificationBountyBox — Split from task. Claimable by verifiers.
7. NodeStatusBox         — Tracks completion/failure history.
```

**Deferred to later phases:**
- CanaryTaskBox / CanaryResultBox — canary system complexity warrants separate phase
- PinningBox — durable pinning is nice-to-have
- DisputeBox / ChallengeBox — Schelling point panels are Phase 4+
- OutputCommitBox — client output commitment before receipt is nice-to-have, not critical

### Register Audit

Every box uses R4-R9 only (Ergo has no R10+).

**TaskEscrowBox:**
```
R4: service_hash (Coll[Byte])
R5: input_commitment H(input ‖ salt) (Coll[Byte])
R6: payment_amount (Long)
R7: min_reputation (Int)
R8: deadline_block (Int)
R9: packed_tiers (Int) — privacy_tier in upper nibble, verification_tier in lower nibble
    e.g., privacy=1, verification=2 → R9 = 0x12 = 18
```

**ReceiptBox:**
```
R4: task_id (Coll[Byte])
R5: input_commitment (Coll[Byte])
R6: output_hash (Coll[Byte])
R7: exec_params_hash (Coll[Byte])
R8: node_sig (Coll[Byte])
R9: receipt_cid (Coll[Byte])
```

**FailureReceiptBox:**
```
R4: task_id (Coll[Byte])
R5: node_address (Coll[Byte])
R6: failure_type (Int)
R7: failure_evidence_hash (Coll[Byte])
R8: timestamp (Long)
R9: node_sig (Coll[Byte])
```

**BondBox:**
```
R4: node_address (Coll[Byte])
R5: bond_amount (Long)
R6: active_task_count (Int)
R7: last_activity_block (Int)
R8: slash_conditions_hash (Coll[Byte])
R9: max_claimable (Long) — bond_amount * BOND_MULTIPLIER
```

**RatingBox:**
```
R4: task_id (Coll[Byte])
R5: client_rating_hash H(rating ‖ salt) (Coll[Byte])
R6: node_rating_hash H(rating ‖ salt) (Coll[Byte])
R7: reveal_deadline (Int)
R8: client_revealed_rating (Optional, Int)
R9: node_revealed_rating (Optional, Int)
```

**VerificationBountyBox:**
```
R4: task_id (Coll[Byte])
R5: expected_output_hash (Coll[Byte])
R6: bounty_amount (Long)
R7: deadline_block (Int)
R8: service_hash (Coll[Byte])
R9: input_commitment (Coll[Byte])
```

**NodeStatusBox:**
```
R4: node_address (Coll[Byte])
R5: total_completions (Int)
R6: total_failures (Int)
R7: consecutive_no_receipts (Int)
R8: status (Int) — 0=active, 1=warned, 2=suspended
R9: reputation_tier (Int)
```

⚠️ **NodeStatusBox bottleneck:** In eUTXO, a single status box that gets updated every transaction creates a sequential bottleneck — only one tx can spend it per block. Solutions:
- **Option A: Sharded status boxes** — one NodeStatusBox per epoch/batch, aggregate via data inputs
- **Option B: Compute from receipts** — don't maintain a status box; compute node status from receipt history via data inputs at claim time
- **Recommendation:** Option B for MVP (simpler), Option A if performance requires it

### Key ErgoScript Guards

**TaskEscrowBox guard:**
```scala
{
  val payment = SELF.R6[Long].get
  val packedTiers = SELF.R9[Int].get
  val verTier = packedTiers % 16  // lower nibble
  
  val minTier = if (payment < 100000000L) 0        // < 0.1 ERG
                else if (payment < 5000000000L) 1   // < 5 ERG
                else if (payment < 50000000000L) 2  // < 50 ERG
                else 3                               // 50+ ERG
  val tierValid = verTier >= minTier
  
  val nodeClaimsPayment = {
    val receiptBox = OUTPUTS(0)
    val bountyBox = OUTPUTS(1)
    receiptBox.R4[Coll[Byte]].get == SELF.id &&
    receiptBox.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get &&
    receiptBox.R6[Coll[Byte]].get.size > 0 &&
    bountyBox.value >= payment / 50 &&
    HEIGHT > SELF.R8[Int].get &&
    tierValid
  }
  
  val clientRefund = {
    HEIGHT > SELF.R8[Int].get + GRACE_PERIOD &&
    OUTPUTS(0).propositionBytes == clientPubKey
  }
  
  nodeClaimsPayment || clientRefund
}
```

---

## Cost Analysis & Honest Limitations

### Per-Task Overhead

| Component | Cost | Who Pays | When |
|-----------|------|----------|------|
| Verification bounty | 2% of task value | Client | Always |
| Insurance pool contribution | 0.5% of task value | Client | Always |
| Client input commit tx | ~0.001 ERG | Client | Always |
| Receipt publication tx | ~0.001 ERG | Node | Always |
| Node bond (locked, not spent) | 1-20 ERG | Node | One-time per tier |
| Dual execution (HIGH tier) | +100% of task value | Client | If selected |
| Triple execution (CRITICAL tier) | +200% of task value | Client | If selected |

**Happy path (MICRO/MEDIUM tier):** ~2.5% overhead. Very reasonable.

### What This Design Cannot Do

1. **Perfect privacy + perfect verifiability.** Fundamentally in tension. ZK-ML needed, 2-3 years away.
2. **Verify subjective quality on-chain.** "Was this essay good?" requires human judgment.
3. **Catch subtle quality degradation per-task.** A node using 4-bit quantized weights produces slightly worse output that passes similarity checks. Caught statistically over time, not per-task. The slow-drain attack is real.
4. **Guarantee off-chain data permanence.** Incentivize, can't guarantee.
5. **Prevent wealthy-attacker panel corruption.** Same limitation as jury systems.
6. **Cryptographically prove LLM output correctness.** See [Future Research](#future-research). The system is economically secured, not cryptographically secured.

### Insurance Pool Math at Launch

⚠️ **The insurance pool can't fund canaries at launch.** At 100 tasks/day × 0.5 ERG average × 0.5% = 0.25 ERG/day. Each canary requires real compute. 5% canary rate on 100 tasks = 5 canary tasks/day. The pool can't cover this.

**Mitigation:** Bootstrap canary funding from project treasury or reduce canary rate to 1-2% initially. Be honest that early-network security is weaker.

---

## Implementation Roadmap

### Honest Timeline: 30-38 Weeks for 2 People

The previous estimate of 20 weeks was unrealistic. Here's an honest assessment:

### Phase 1: MVP (Weeks 1-6)
- [ ] Receipt-gated payment (Hole 4) — **most important, prevents take-and-run**
- [ ] Client input commitment (Hole 2)
- [ ] Failure receipts + grace periods (Hole 7)
- [ ] Basic reputation tracking (compute from receipt history, not a status box)

**Why 6 weeks not 4:** First encounter with eUTXO constraints will surface unexpected issues. Budget for learning.

### Phase 2: Economic Security (Weeks 7-14)
- [ ] Node bonding with counter-box pattern (BondBox)
- [ ] Verification bounties
- [ ] Insurance pool (0.5% collection)
- [ ] Reputation tiers with progressive unlocking
- [ ] Commit-reveal bilateral rating (RatingBox)

**Why 8 weeks not 4:** The BondBox counter-box pattern and its interaction with claiming/completing tasks is non-trivial in eUTXO. Every interaction pattern needs explicit coding and testing.

### Phase 3: Active Verification (Weeks 15-24)
- [ ] Canary task system (start at 1-2% rate, scale to 5%)
- [ ] Embedding similarity verification (requires benchmarking — budget time for this)
- [ ] Tiered verification by task value
- [ ] NodeStatusBox (sharded or computed from receipts)

**Why 10 weeks not 6:** Canary system alone is a significant distributed systems problem. Embedding similarity needs real benchmarking across task types to set thresholds.

### Phase 4: Dispute Resolution & Polish (Weeks 25-34)
- [ ] Schelling point panels
- [ ] Privacy tiers (encrypted receipts)
- [ ] Client output commitment (Hole 7 from original — OutputCommitBox)
- [ ] Appeal mechanism

**Why 10 weeks:** Schelling point panels are a project unto themselves. Privacy tiers with threshold encryption require crypto engineering.

### Phase 5: Advanced (When Ready)
- [ ] WASM deterministic replay (pending Josemi's input + feasibility research)
- [ ] ZK-ML integration (when EZKL/Modulus mature)
- [ ] Durable storage pinning contracts

**Strong recommendation:** Build Phase 1, deploy it, learn from it, THEN refine Phase 2 design. Don't design all 5 phases upfront — the lessons from Phase 1 will invalidate assumptions in Phase 3+.

---

## Open Questions for Josemi

1. **Does Celaut run services in WebAssembly?** If yes, deterministic verification becomes much simpler (see Future Research). If no, can it? What's the performance tradeoff?

2. **Service versioning:** Same hash = same code forever? Or can services update?

3. **Execution traces:** Does Celaut produce execution logs/traces?

4. **Resource commitment proofs:** Does Celaut track resource allocation (GPU hours, memory)?

5. **eUTXO constraints:** For the counter-box pattern on BondBox — any Ergo-specific limitations?

6. **Bond amounts:** What ERG amounts are realistic for node operators in the Ergo ecosystem?

7. **Embedding model hosting:** Where does the sentence-transformers model run for similarity checks? Each verifier locally? Or is it a Celaut service?

---

## Open Design Questions

These are hard problems we don't have answers for yet. We're flagging them honestly rather than hand-waving.

### 1. Canonical Runtime Governance

If we ever implement deterministic WASM replay for dispute resolution (see Future Research), someone has to decide which WASM binary is "canonical." This is a governance problem, not a technical one.

**Options:**
- **(a) Josemi / Celaut team defines the canonical runtime.** Pragmatic, fast, centralized. Works for early network. Risk: single point of trust.
- **(b) DAO vote on runtime hash.** Decentralized, slow, requires governance infrastructure. Risk: voter apathy, capture.
- **(c) Multiple accepted runtimes with convergence incentives.** Nodes that use widely-adopted runtimes get preference. Market-driven. Risk: fragmentation.

**Our honest take:** Option (a) for launch, with a roadmap to (b) or (c). Pretending this is solved by "content-addressing" is dishonest — content-addressing solves integrity, not governance.

### 2. Canary Bootstrap

How do canaries work with < 20 nodes? The committee model fails at small scale. No good answer yet.

### 3. Verifier's Dilemma

If fraud is rare, verification bounties are rarely claimed, verifiers stop checking, fraud becomes profitable. Truebit's "forced error" mechanism partially addresses this but introduces its own complexity. Not fully designed.

### 4. Embedding Threshold Calibration

The 0.85 cosine similarity threshold is a guess. It needs empirical validation across task types, model families, and output lengths. This is research work.

---

## Future Research: Deterministic LLM Verification

*This section describes aspirational approaches that are NOT buildable today for production LLM workloads. They are included for completeness and to guide future work. The system's security does NOT depend on these.*

### The WASM Determinism Approach

If Celaut runs services in WebAssembly:
- WASM is fully deterministic by spec. Same binary + same input = same output.
- Every task becomes a Truebit-style verification game.
- Any verifier can re-execute and get a bit-identical result.

**Why it's not ready:**
- **Performance:** WASM inference is 10-50x slower than native CUDA (not 2-5x as sometimes claimed). WebGPU helps but is immature.
- **GPU access:** WASM doesn't natively support GPU. Large LLMs are impractical in pure WASM today.
- **Model size:** Running a 70B model in WASM is currently impractical. Even 7-13B is slow.

### The Bisection Protocol for Token Generation

A Truebit-style binary search applied to autoregressive LLM inference:

1. Node publishes state commitment chain: `[H(state₀), H(state₁), ..., H(stateₙ)]`
2. Verifier challenges at midpoint. Binary search narrows to single divergent token.
3. That ONE token is replayed in canonical WASM runtime.
4. Verification cost: O(log n) hash comparisons + 1 forward pass.

**Why it's not ready:**
- **KV-cache hashing is the bottleneck.** The KV-cache for a 7B model is 1-4 GB. Hashing this after every token means 1000-token response = 1-4 TB of data hashed. Even at Blake2b's ~1 GB/s, that's 1-4 seconds of hashing overhead per token — on top of ~50-100ms actual inference time. The "5-10% overhead" claim is off by 1-2 orders of magnitude.
- **Possible mitigation:** Incremental/Merkle hashing of KV-cache (only hash the delta per token). But this requires deep integration with the inference runtime and significant engineering.
- **Depends on canonical runtime governance** being solved (see Open Design Questions).

### On-Chain Seed Derivation

Deriving LLM sampling seeds from blockchain data:
```
seed = H(block_header ‖ task_id ‖ input_hash)
```
This eliminates sampling randomness. Combined with deterministic float arithmetic (WASM), it would make LLM output fully reproducible.

**This component is actually feasible today** and could be implemented independently. It's useful even without the bisection protocol — it reduces the variance in honest outputs, making embedding similarity more reliable.

### The Honest Assessment

If all three components (WASM determinism + bisection + on-chain seeds) worked for models ≥ 7B, AIH would offer **provably verifiable LLM execution.** That would be genuinely novel.

But today, the KV-cache hashing problem makes the bisection protocol impractical for real models. WASM performance makes full re-execution impractical for large models. These are engineering challenges, not theoretical impossibilities — but they're significant.

**What we claim instead:** AIH proposes a novel architecture for **economically-incentivized honest AI execution**, combining on-chain seed derivation, bonding with active task tracking, canary-based quality assurance, and optimistic execution with funded fraud proofs — all on Ergo's eUTXO model. For deterministic services, verification is exact. For LLM inference, verification is economic rather than mathematical.

That's less sexy but accurate. And it's buildable today.

---

## Defense-in-Depth Matrix

| Layer | Mechanism | Catches | Cost | Phase |
|-------|-----------|---------|------|-------|
| 1 | Receipt-gated payment | Take-and-run | ~0 | 1 |
| 2 | Input commitments | Input faking | ~0.001 ERG | 1 |
| 3 | Node bonding (counter-box) | All fraud (economic deterrent) | Locked capital | 2 |
| 4 | Verification bounties | Systematic fraud | 2% of task value | 2 |
| 5 | Reputation tiers + decay | Long-term gaming | Earned over time | 2 |
| 6 | Canary tasks | Model substitution, lazy fraud | Insurance pool | 3 |
| 7 | Embedding similarity | Non-deterministic fraud | ~$0.001/check | 3 |
| 8 | Tiered verification | Value-appropriate security | 0-200% | 3 |
| 9 | Schelling point panels | Subjective disputes | Panel stakes | 4 |
| 10 | WASM replay (future) | All fraud (if feasible) | Re-execution | 5+ |

**The fundamental principle:** At every decision point, honest behavior must be the dominant economic strategy. No single layer is perfect. Together, they make cheating consistently unprofitable.

---

*This document is designed to be implemented incrementally. Phase 1 closes the most critical hole (take-and-run). Each subsequent phase adds security. The system gets stronger over time.*

*Build Phase 1. Deploy it. Learn from it. Then build Phase 2.*

*Last updated: 2026-02-14 (post-audit revision)*
