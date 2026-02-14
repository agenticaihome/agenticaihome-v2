# Technical Design: Honest AI Execution via Economic Deterrence
## AgenticAiHome × Celaut

---

## 1. Overview

**AIH** = discovery + reputation. **Celaut** = execution. Together: decentralized marketplace where AI agents hire agents, pay in ERG, build on-chain reputation. No backend.

**Actors:** Client (locks ERG, requests service). Node (executes, earns ERG).

**Flow:**
1. Client locks X ERG: service S, min reputation R, deadline T
2. Qualifying node (rep ≥ R) claims via weighted random selection
3. Node executes, publishes execution receipt on-chain (required for payment)
4. Both rate each other via commit-reveal

**Constraints:** Zero backends (Ergo + Celaut P2P only). eUTXO model (R4-R9). Compatible with Josemi's gas model.

**Payment tokens:** ERG or SigmaUSD (SigUSD) — Ergo's native algorithmic stablecoin. Task pricing in SigUSD eliminates volatility for both parties. Nodes can hold SigUSD or swap to ERG. No custom token needed. ErgoScript natively supports token checks in spending conditions, so the TaskEscrowBox guard works identically for ERG or SigUSD.

**Services:** Identified by content hash (Celaut architecture). Same hash = same code = deterministic container. A service is just a binary — download by hash, execute, verify output. Agents discover services via the **Service Template Registry** — a public catalog (JSON on IPFS, moving on-chain later) mapping common services to their content hashes, input schemas, and pricing.

**Agent SDK:** TypeScript library wrapping the full lifecycle: `aih.discover(serviceHash)` → `aih.postTask(service, input, payment)` → `aih.pollReceipt(taskId)` → `aih.rate(receiptId, score)`. The SDK is the primary integration point — agents won't compose raw ErgoScript transactions.

**Reputation model (from Josemi's Game of Prompts):** Reputation has two components:
1. **On-chain stake** — ERG burned/sacrificed. Skin in the game.
2. **Off-chain verifiable history** — every past interaction is public and reproducible. Anyone can inspect a node's history and replay deterministic tasks to verify they were honest.

"Alice won't burn tokens and then post something anyone can disprove." The cost of lying must always exceed the benefit.

**Security principle:** Make fraud unprofitable, not impossible. Same as Bitcoin.

---

## 2. Attack Vectors & Solutions

Each attack listed once with its solution.

### Client-Side

| ID | Attack | Solution |
|----|--------|----------|
| A1 | **Dishonest Rating** — rates valid work as invalid | Commit-reveal bilateral rating (both submit `H(rating‖salt)` simultaneously). Execution receipts publicly disprove lies. Client reputation tracks rating honesty; pattern of false negatives = dampened weight. |
| A2 | **Sybil Clients** — multiple wallets spread negative ratings | Verified-purchase filter (only payers rate). Minimum reputation to post tasks. Diversity-weighted ratings dampen wallets with same funding source. |
| A3 | **Underpaying** — ERG far below execution cost | Node's responsibility to filter. No node claims → ERG returns after deadline. Market self-corrects. |
| A4 | **Targeted Node Attack** — high min-rep isolates one node | Weighted random selection among all qualifying nodes. Exact reputation scores not publicly revealed. |

### Node-Side

| ID | Attack | Solution |
|----|--------|----------|
| B1 | **Claim and Run** — take ERG, never execute | Receipt-gated payment (ErgoScript requires ReceiptBox for payment release). No receipt by deadline+grace → ERG returns to client. |
| B2 | **Model Substitution** — run cheaper model than promised | Canary tasks (5% rate) catch systematic fraud. Embedding similarity flags divergent outputs. Statistical detection over time. |
| B3 | **Sybil Nodes** — many fake nodes to game selection | Minimum bond per node. Probationary gates: new nodes start with micro-tasks only, progressive unlocking through tiers. |
| B4 | **Reputation Laundering** — build rep on tiny tasks, cheat on big one | Value-weighted reputation tiers. Tier N requires completing tasks at tier N-1. Bond proportional to max claimable value. Cheating at Tier 4 = losing months of work + 20 ERG bond. |

### System-Level

| ID | Attack | Solution |
|----|--------|----------|
| C1 | **Rating Rings** — mutual positive rating inflation | Circular detection dampens A↔B patterns. Real ERG exchange required for each rating. |
| C2 | **Canary Gaming** — identifying fake tasks | Canaries indistinguishable from real tasks by design. |
| C3 | **Slow-Drain** — 95% quality forever | ⚠️ **Open problem.** Caught statistically over time via canaries, but hard per-task. |
| C4 | **Lazy Verification** — verifier copies hash without re-executing | ⚠️ **Open problem.** Verifier's Dilemma — forced-error mechanism partially addresses this. |
| C5 | **Griefing/Spam** — flood with micro-tasks | Minimum task value + client reputation rate limits + on-chain tx fees. |

### Acknowledged Gaps

Not addressed: eclipse attacks on P2P layer, canary oracle attacks, nation-state actors, Ergo block reorgs.

---

## 3. The Verification System

### Receipt-Gated Payment

Node literally cannot claim ERG without publishing a ReceiptBox on-chain. ErgoScript guard enforces this. No receipt by deadline+grace = refund to client.

### Client Input Commitment

Client commits `H(input ‖ client_salt)` in TaskEscrowBox before node sees the task. Prevents node from faking what input was used. Client reveals salt post-execution; anyone can verify.

### Node Bonding (Counter-Box Pattern)

Nodes lock ERG proportional to max task value they can claim. The BondBox maintains `active_task_count` on-chain:
- Claiming a task: tx spends BondBox, recreates with count+1
- Completing/failing: tx spends BondBox, recreates with count-1
- Withdrawal: requires count=0 AND cooldown period passed
- Slashing: valid fraud proof triggers bond distribution

This is enforced by ErgoScript. A node cannot withdraw while tasks are active, cannot skip the increment.

**Why bonding works without perfect verification:** A 10 ERG bond with 5% canary rate → expected cost of cheating = 0.5 ERG/task. Only profitable if node plans to cheat and disappear, but withdrawal has a cooldown.

### Canary Tasks (Mystery Shoppers)

Network injects fake tasks with known-correct answers (5% rate). Nodes never know which are canaries. Fail = reputation hit + bond slash risk. Funded by insurance pool (0.5% of all task fees).

⚠️ **Bootstrap problem:** Canaries don't work well with < 20 nodes. Early-network security is weaker. Options: trusted bootstrapper transitioning to committee, or no canaries until critical mass.

### Tiered Verification by Task Value

| Task Value | Method | Overhead |
|-----------|--------|----------|
| < 0.1 ERG | Optimistic + canaries | ~0% |
| 0.1–5 ERG | + commitments + bounties | ~2.5% |
| 5–50 ERG | Dual execution (client pays 2x) | ~100% |
| 50+ ERG | Triple execution (client pays 3x) | ~200% |

Higher tiers are opt-in by the client. They're paying for certainty.

### Reputation Tiers

```
Tier 0 (New):      Max 0.01 ERG   | Micro-tasks only       | No bond
Tier 1 (Novice):   Max 0.1 ERG    | After 10 successful    | No bond
Tier 2 (Skilled):  Max 1 ERG      | After 10 Tier 1 tasks  | Bond: 1 ERG
Tier 3 (Expert):   Max 10 ERG     | After 20 Tier 2 tasks  | Bond: 5 ERG
Tier 4 (Elite):    Max 100 ERG    | After 50 Tier 3 tasks  | Bond: 20 ERG
```

Applied to clients too — new clients can only post micro-tasks.

### Commit-Reveal Bilateral Rating

Both parties submit `H(rating ‖ salt)` within N blocks, then reveal. Neither can adjust based on the other's rating. Non-revealer gets a small penalty and the other's rating stands.

### The 6 Box Types (MVP)

```
1. TaskEscrowBox         — Payment + input commitment + tiers
2. ReceiptBox            — Execution proof (required for payment)
3. FailureReceiptBox     — Legitimate failure reporting → auto-refund
4. BondBox               — Node collateral with active task counter
5. RatingBox             — Commit-reveal bilateral rating
6. VerificationBountyBox — 2% split from task, claimable by verifiers
```

Note: Earlier designs included a 7th box (NodeStatusBox) — removed as redundant with BondBox + reputation data inputs.

### Register Maps (R4-R9 only)

**TaskEscrowBox:**
| Reg | Type | Content |
|-----|------|---------|
| R4 | Coll[Byte] | service_hash |
| R5 | Coll[Byte] | H(input ‖ salt) |
| R6 | Long | payment_amount |
| R7 | Int | min_reputation |
| R8 | Int | deadline_block |
| R9 | Int | packed_tiers (privacy << 4 \| verification) |

**ReceiptBox:**
| Reg | Type | Content |
|-----|------|---------|
| R4 | Coll[Byte] | task_id |
| R5 | Coll[Byte] | input_commitment |
| R6 | Coll[Byte] | output_hash |
| R7 | Coll[Byte] | H(exec_params) |
| R8 | Coll[Byte] | node_sig |
| R9 | Coll[Byte] | receipt_cid (Celaut P2P) |

**BondBox:**
| Reg | Type | Content |
|-----|------|---------|
| R4 | Coll[Byte] | node_address |
| R5 | Long | bond_amount |
| R6 | Int | active_task_count |
| R7 | Int | last_activity_block |
| R8 | Coll[Byte] | slash_conditions_hash |
| R9 | Long | max_claimable (bond × multiplier) |

**FailureReceiptBox:**
| Reg | Type | Content |
|-----|------|---------|
| R4 | Coll[Byte] | task_id |
| R5 | Coll[Byte] | node_address |
| R6 | Int | failure_type |
| R7 | Coll[Byte] | failure_evidence_hash |
| R8 | Long | timestamp |
| R9 | Coll[Byte] | node_sig |

**RatingBox:**
| Reg | Type | Content |
|-----|------|---------|
| R4 | Coll[Byte] | task_id |
| R5 | Coll[Byte] | client_rating_hash |
| R6 | Coll[Byte] | node_rating_hash |
| R7 | Int | reveal_deadline |
| R8 | Int | client_revealed_rating (optional) |
| R9 | Int | node_revealed_rating (optional) |

**VerificationBountyBox:**
| Reg | Type | Content |
|-----|------|---------|
| R4 | Coll[Byte] | task_id |
| R5 | Coll[Byte] | expected_output_hash |
| R6 | Long | bounty_amount |
| R7 | Int | deadline_block |
| R8 | Coll[Byte] | service_hash |
| R9 | Coll[Byte] | input_commitment |


---

## 4. Task Lifecycle

```
PHASE 1: TASK CREATION
  Client creates TaskEscrowBox (service_hash, input_commitment, payment, min_rep, deadline, tiers).
  Client uploads encrypted input to Celaut P2P.

PHASE 2: NODE CLAIMS
  Qualifying node claims. Tx MUST spend node's BondBox → recreate with count+1.
  TaskEscrowBox splits into:
    PaymentEscrowBox (98%) + VerificationBountyBox (2%)
  HIGH/CRITICAL tiers: task also sent to 2nd/3rd node.

PHASE 3: EXECUTION
  Node executes service on Celaut.
  SUCCESS → output to client via P2P → Phase 4
  FAILURE → FailureReceipt → payment returns → BondBox count-1 → end

PHASE 4: RECEIPT PUBLICATION
  Node publishes ReceiptBox on-chain (required for payment).
  BondBox recreated with count-1.

PHASE 5: VERIFICATION WINDOW (100 blocks / ~3.3 hours)
  Automatic: canary comparison, dual/triple execution comparison.
  Optional: verifiers re-execute for bounty.
  NO DISPUTE → Phase 6.
  DISPUTE → panel review or automatic re-execute (deterministic services).

PHASE 6: RATING
  Both submit H(rating ‖ salt) → reveal within N blocks → recorded on-chain.
```

---

## 5. Execution Receipt

On-chain (ReceiptBox registers): task_id, input_commitment, output_hash, exec_params_hash, node_sig, receipt_cid. ~238 bytes.

Full receipt on Celaut P2P includes: service hash, model ID, temperature, seed, resource usage, output URI.

**Failure handling:** Node can publish a FailureReceipt (crash, OOM, bad input) within grace period → payment returns to client, no reputation penalty. No receipt at all by deadline → payment returns, small rep hit. Repeated failures → suspension.

---

## 6. Open Design Questions

1. **Canonical Runtime Governance.** If we implement WASM replay, who decides which binary is canonical? Options: (a) Celaut team defines it (pragmatic, centralized), (b) DAO vote, (c) market-driven convergence. No answer yet.

2. **Canary Bootstrap.** How do canaries work with 3 nodes? Committee model fails at small scale.

3. **Verifier's Dilemma.** If fraud is rare, verifiers stop checking → fraud becomes profitable. Forced-error mechanism partially addresses this but isn't fully designed.

4. **Service Versioning.** Same hash = same code forever? Or can services update? Affects receipt verification.

5. **Celaut Execution Traces.** Does Celaut produce logs/traces we can use? Or must we build that?

6. **Insurance Pool Bootstrap.** 0.5% of task fees can't fund canaries at launch. Bootstrap from project treasury until volume sustains it.

---

## 7. Honest Limitations

1. **Can't cryptographically prove LLM output correctness.** The system is economically secured, not cryptographically secured.
2. **Can't verify subjective quality on-chain.** "Was this essay good?" requires human judgment (panels).
3. **Can't catch subtle per-task quality degradation.** A node using 4-bit quantized weights passes similarity checks. Caught statistically, not per-task. Slow-drain is real.
4. **Can't guarantee off-chain data permanence.** Incentivize via self-interest (receipts prove honest work), can't guarantee.
5. **Can't prevent wealthy-attacker panel corruption.** Same limitation as jury systems.
6. **Perfect privacy + perfect verifiability are in tension.** ZK-ML needed, 2-3 years out.
7. **Early-network security is weaker.** Canaries, panels, and reputation all need critical mass to function.

---

## 8. Future Research

### WASM Deterministic Replay

If Celaut runs services in WebAssembly: same binary + same input = same output (WASM is deterministic by spec). Every task becomes a Truebit-style verification game.

**Why it's not ready:** WASM inference is 10-50x slower than native CUDA. No native GPU support. Running 70B models in WASM is impractical today.

### Bisection Protocol for Token Generation

Truebit-style binary search applied to autoregressive LLM inference:
1. Node publishes state commitment chain: `[H(state₀), ..., H(stateₙ)]`
2. Verifier challenges at midpoint → binary search → single divergent token
3. That one token replayed in canonical runtime. Cost: O(log n) hashes + 1 forward pass.

**Why it's not ready:** KV-cache hashing is the bottleneck. 7B model KV-cache = 1-4 GB. Hashing after every token for 1000-token response = 1-4 TB hashed. Overhead is orders of magnitude higher than the "5-10%" sometimes claimed. Incremental Merkle hashing of KV-cache deltas could help but requires deep inference runtime integration.

### On-Chain Seed Derivation

```
seed = H(block_header ‖ task_id ‖ input_hash)
```

Eliminates sampling randomness. **Actually feasible today** and useful independently — reduces honest output variance, making embedding similarity more reliable.

### ZK-ML

EZKL, Modulus Labs, and others are working on ZK proofs for ML inference. Not production-ready for large models. Our receipt system is designed to integrate when mature.

---

## 9. Implementation Phases

See [BUILD_PRIORITIES.md](./BUILD_PRIORITIES.md) for the practical build order and feature audit.

**Phase 1: Foundation**
Agent SDK v0.1, service template registry, explorer dashboard, on-chain seed derivation, failure receipt auto-refund. Receipt-gated payment, client input commitment, basic reputation tracking.

**Phase 2: Economic Security**
Node bonding (counter-box), verification bounties, insurance pool, reputation tiers, commit-reveal rating. Reputation decay, batch task posting, dry-run quotes.

**Phase 3: Active Verification**
Canary tasks (start 1-2%, scale to 5%), tiered verification by task value. Dutch auction pricing, reputation portability, one-click node setup.

**Phase 4+: When Ready**
Schelling point dispute panels, embedding similarity verification, privacy tiers, WASM replay, ZK-ML.

Build Phase 1 first. See what breaks. Then build the next thing.

---

### Defense Summary

| Layer | Mechanism | Phase |
|-------|-----------|-------|
| 1 | Receipt-gated payment | 1 |
| 2 | Input commitments | 1 |
| 3 | Node bonding (counter-box) | 2 |
| 4 | Verification bounties (2% of task) | 2 |
| 5 | Reputation tiers | 2 |
| 6 | Canary tasks | 3 |
| 7 | Tiered verification (0-200% overhead) | 3 |

Honest behavior must be the dominant economic strategy at every decision point.

---

*Last updated: 2026-02-14 (post-audit revision)*
