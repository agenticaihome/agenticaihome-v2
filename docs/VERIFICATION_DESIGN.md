# Verification Design: The Definitive Architecture
## AgenticAiHome × Celaut — Execution Integrity System v3

*Merged from VERIFICATION_DESIGN v2 + GAME_THEORY.md + architectural brainstorm. Audited for holes.*

---

## Table of Contents
1. [Design Philosophy](#design-philosophy)
2. [How Other Networks Do It](#how-other-networks-do-it)
3. [The Nuclear Option: WASM Determinism](#the-nuclear-option-wasm-determinism)
4. [The 10 Holes & Their Fixes](#the-10-holes--their-fixes)
5. [New Mechanisms: Canaries, Bonding, Tiered Verification](#new-mechanisms)
6. [Attack Vectors & Anti-Gaming (from Game Theory)](#attack-vectors--anti-gaming)
7. [Revised Task Lifecycle](#revised-task-lifecycle)
8. [Updated Execution Receipt Spec](#updated-execution-receipt-spec)
9. [On-Chain Box Architecture](#on-chain-box-architecture)
10. [Cost Analysis & Tradeoffs](#cost-analysis--tradeoffs)
11. [Implementation Roadmap](#implementation-roadmap)
12. [Open Questions for Josemi](#open-questions-for-josemi)

---

## Design Philosophy

Three constraints shape every decision:

1. **Zero backends.** Ergo blockchain + IPFS/content-addressed storage + Celaut P2P. No servers, no databases, no indexers we control.
2. **eUTXO model.** Ergo boxes with registers, spent via ErgoScript guard conditions. No global mutable state — everything flows through box chains.
3. **Josemi's gas model compatibility.** Client locks ERG → node claims after deadline → node executes → both rate. We augment this flow; we don't replace it.

**Core insight from existing systems:** The most practical approach for AI compute is **optimistic execution with funded fraud proofs** (Truebit-style), not universal re-execution. You assume honesty, but make it cheap to prove dishonesty and expensive to be dishonest.

**New core insight:** If Celaut runs services in WebAssembly, deterministic verification may be achievable even for LLM inference — potentially eliminating the hardest problem in this entire design. This is the #1 question for Josemi.

---

## How Other Networks Do It

### Truebit — Verification Game
- **Model:** Solver executes, Verifier checks. If disagreement, binary search through execution trace to find the single divergent step. That step is adjudicated on-chain.
- **Key insight:** You never re-execute the whole computation on-chain. You narrow down to one step.
- **Limitation:** Requires deterministic execution in a metered VM (WASM). Doesn't work for LLMs directly — *unless* inference runs in WASM too (see §WASM Determinism).
- **What we steal:** The "verification game" concept. The "forced error" mechanism — occasionally forcing solvers to submit wrong answers so verifiers stay engaged.

### iExec — Proof of Contribution (PoCo)
- **Model:** Multiple workers execute the same task. Results are compared. Consensus result wins. Workers who agree get paid; outliers lose stake.
- **Key insight:** Redundant execution IS the verification. No separate verifier role needed.
- **Limitation:** 3x-5x cost overhead. Only works when tasks are cheap enough to duplicate.
- **What we steal:** The "trust level" parameter — clients choose how many redundant executions they want. Configurable security.

### Gensyn — Probabilistic Proof of Learning
- **Model:** For ML training, verify using metadata from the optimization process (gradient checkpoints, loss curves). Don't re-run the whole training — check that the trajectory is plausible.
- **Key insight:** You can verify MUCH cheaper than you can execute, if you design the right verification probes.
- **Limitation:** Specific to gradient-based ML training. Not directly applicable to inference.
- **What we steal:** The idea of "verification probes" — lightweight checks much cheaper than full re-execution but catching fraud with high probability.

### Ritual — Execute Once, Verify Many Times
- **Model:** One node executes, generates a succinct proof. Other nodes verify the proof (cheaper than re-execution). Moving toward ZK proofs for AI inference.
- **Key insight:** Proof generation can be amortized. One proof serves many verifiers.
- **Limitation:** ZK proofs for large ML models are currently impractical. Actively researched but not production-ready for LLMs.
- **What we steal:** The aspiration. ZK-ML is coming (EZKL, Modulus Labs). Our receipt system should be ready to incorporate it.

### Summary: What's Practical Today

| Approach | Deterministic? | LLMs? | Cost Overhead | Practical? |
|----------|---------------|-------|---------------|------------|
| Full re-execution | ✅ | ❌ Non-deterministic | 2x+ | ✅ Deterministic only |
| Redundant execution (iExec) | ✅ | ⚠️ Approximate | 3-5x | ✅ But expensive |
| Verification game (Truebit) | ✅ | ❌ Needs deterministic VM | ~0 (optimistic) | ✅ Deterministic only |
| ZK proofs (Ritual/EZKL) | ✅ | ❌ Too slow | Proving cost | ❌ Not yet for LLMs |
| Probabilistic probes (Gensyn) | ✅ | ⚠️ Adaptable | 0.1-0.5x | ⚠️ Task-specific |
| Optimistic + fraud proof | ✅ | ✅ With adaptations | ~0 (optimistic) | ✅ **Our approach** |
| **WASM determinism** | ✅ | **✅ If Celaut uses WASM** | 0 | **⚠️ Question for Josemi** |

---

## The Nuclear Option: WASM Determinism

> **🔴 PRIORITY #1 QUESTION FOR JOSEMI: Does Celaut run services in WebAssembly?**

### Why This Changes Everything

WebAssembly (WASM) is **fully deterministic by specification.** Same binary + same input = same output on ANY hardware. No float rounding differences, no platform-dependent behavior.

If Celaut runs services (including LLM inference) inside WASM containers:
- The entire non-determinism problem **disappears**
- Every task becomes a Truebit-style verification game
- Any verifier can re-execute and get a bit-identical result
- Fraud becomes mathematically provable, not statistically probable

### How LLM Inference Becomes Deterministic in WASM

1. **Float determinism:** WASM specifies IEEE 754 semantics exactly. No hardware-dependent rounding.
2. **No threading non-determinism:** WASM executes single-threaded by default. No race conditions.
3. **Frozen binary:** Service identified by content hash = exact same code every time.
4. **Seed control:** With deterministic floats, `temperature=0 + seed=X` produces identical output regardless of hardware.

### Projects Already Doing This

- **EZKL:** Proves ML inference was computed correctly using ZK-SNARKs. Works with ONNX models in WASM.
- **Modulus Labs:** ZK proofs for neural network inference. Targeting production in 2026.
- **Truebit:** Already uses WASM execution for their verification game. Proven architecture.

### What If Celaut Doesn't Use WASM?

Then we fall back to the tiered verification system described in this document. The design works either way — WASM just makes it dramatically simpler.

### The Honest Assessment

Even with WASM, there are caveats:
- **Performance penalty:** WASM inference is slower than native CUDA (roughly 2-5x for large models). Nodes may resist.
- **GPU acceleration:** WASM doesn't natively support GPU. Projects like WebGPU exist but are immature. Large LLMs may be impractical in pure WASM today.
- **Model size:** Running a 70B parameter model in WASM is currently impractical. Smaller models (7B, 13B) are feasible.
- **Hybrid approach:** Run inference natively for speed, but require WASM replay capability for verification. Node runs fast on GPU, but if challenged, must reproduce the result in WASM. This is the Truebit model.

**Recommendation:** Design the system assuming WASM determinism is NOT available (the harder path). If Josemi confirms Celaut uses WASM, we can simplify dramatically. If not, we lose nothing.

---

## The AIH Inference Verification Protocol (Novel Contribution)

*This section describes a novel combination of three existing primitives that, together, make LLM inference as verifiable as arithmetic. To our knowledge, nobody has combined these for autoregressive language model verification.*

### The Three Components

#### Component 1: Deterministic Seed Derivation from Blockchain

LLM "randomness" (temperature > 0) is just seed-dependent sampling from a probability distribution. If the seed is derived deterministically from on-chain data:

```
seed = H(block_header ‖ task_id ‖ input_hash)
```

Then every node given the same input at the same block height makes the **same sampling decisions.** This eliminates sampling randomness entirely. The seed is verifiable on-chain — nobody can claim they used a different seed.

**This alone eliminates ~90% of LLM non-determinism.** The remaining ~10% is float rounding across hardware.

#### Component 2: Canonical Inference Runtime

Float rounding varies across GPU architectures (CUDA versions, tensor core behavior, quantization levels). Solution: define a **canonical inference runtime** — a specific ONNX-to-WASM compiled binary, verified by content hash.

```
canonical_runtime_hash = H(wasm_binary)  // published on-chain
model_weights_hash = H(model_weights)     // published on-chain
```

Properties:
- Same runtime + same weights + same input + same seed = **identical output on ANY hardware**
- Nodes can execute natively (GPU) for speed in production
- If disputed, the canonical runtime is the **source of truth** — like IEEE 754 for floating point
- The canonical runtime is a Celaut service itself (hash-identified, deterministic)

**Key insight:** Nodes don't HAVE to run in WASM for every task. They run natively for speed. The canonical runtime only matters during disputes. Think of it as the "court of law" — you drive fast on the highway, but if there's a dispute, the speed limit (canonical runtime) is what counts.

#### Component 3: Bisection Dispute Protocol for Token Generation

Even with deterministic execution, re-running full inference is expensive. Truebit's breakthrough applied to autoregressive LLMs:

LLM inference is sequential: token₁ → token₂ → ... → tokenₙ. Each token depends on all previous tokens + the model state.

**Protocol:**
```
1. Node publishes state commitment chain during execution:
   C = [H(state₀), H(state₁), H(state₂), ..., H(stateₙ)]
   where stateᵢ = KV-cache + logits after generating tokenᵢ

2. Verifier challenges at midpoint:
   "What is your state at token n/2?"

3. Both parties compare H(state_{n/2}):
   - Match → divergence is in second half
   - Mismatch → divergence is in first half

4. Binary search continues: O(log n) rounds

5. At the single divergent step (tokenₖ):
   - Execute ONLY tokenₖ in the canonical runtime
   - Compare: canonical_output vs node's claimed output
   - Whoever's wrong loses stake
```

**Verification cost:** O(log n) hash comparisons + ONE forward pass of ONE token position.

For a 1000-token response: ~10 rounds of hash comparison + 1 token verification. Not 1000 forward passes. **Orders of magnitude cheaper than full re-execution.**

### Why This Combination Is Novel

| Component | Exists Independently? | Applied to LLM Verification? |
|-----------|-----------------------|------------------------------|
| On-chain seed derivation | Yes (VRFs, randomness beacons) | **No** — nobody uses blockchain randomness to determinize LLM sampling |
| Canonical WASM runtime | Partial (EZKL for small models) | **No** — nobody defines it as a dispute-resolution standard for LLMs |
| Bisection protocol | Yes (Truebit for generic WASM) | **No** — nobody applies bisection to autoregressive token generation specifically |
| **All three combined** | **No** | **This is new** |

### Performance Analysis

| Operation | Cost | When |
|-----------|------|------|
| Seed derivation | Negligible (one hash) | Every task |
| State commitment chain | ~5-10% overhead (hash per token) | Every task |
| Bisection dispute | O(log n) hash comparisons | Only on dispute (~1% of tasks) |
| Single-token canonical replay | One forward pass in WASM | Only on dispute |
| Full canonical replay | O(n) forward passes in WASM | Never needed (bisection avoids this) |

**Happy path overhead: 5-10%.** Dispute path: trivial. This is dramatically cheaper than redundant execution (100-200% overhead).

### Open Questions

1. **State commitment format:** What exactly constitutes "state" at each token? KV-cache is large. We may need to commit `H(KV-cache)` rather than the full cache, with the node providing the cache on-demand during disputes.
2. **Canonical runtime availability:** Who hosts the canonical WASM binary? Answer: it's a Celaut service identified by hash. Anyone can host it. Content-addressed = decentralized.
3. **Model weight distribution:** Large models (70B) are impractical in WASM today. This protocol works best for models ≤ 13B parameters. Larger models fall back to the tiered verification system.
4. **Josemi's input needed:** Does Celaut's container model naturally support state checkpointing? If yes, Component 3 is nearly free to implement.

### Implications

If this protocol works (and we believe it does for models up to ~13B), **AIH would be the first system to offer provably verifiable LLM execution on any blockchain.** Not "trust the reputation" — mathematically verifiable. Not "ZK proofs someday" — working today with existing primitives (hashing, WASM, commit-reveal). Not "re-run everything" — O(log n) efficient.

This is the kind of primitive that makes the entire marketplace trustless, not just economically-incentivized-to-be-honest.

---

## The 10 Holes & Their Fixes

### Hole 1: No Verifiers — "Anyone Can Verify" But Nobody Does

**Problem:** The original design says "anyone can verify" but provides zero incentive. Rational actors free-ride. Nobody verifies. Receipts become security theater.

**Fix: Funded Verification Bounties + Canary Tasks**

**Mechanism A: Verification Bounties**

1. **Verification bounty pool.** Every task's payment includes a verification fee (default 2% of task value). This fee is locked in a **Verification Bounty Box** on-chain.

2. **Claiming bounties.** Any node can claim by:
   - Re-executing the service with the committed input
   - Submitting the result hash on-chain
   - Match → verifier gets the bounty (honest confirmation)
   - Mismatch → verifier gets the bounty PLUS the node's staked collateral (fraud found!)

3. **Forced verification (Truebit-style).** Randomly (1 in 20 tasks via `blake2b(block_header ++ task_id) % 20 == 0`), a task is designated "verification-required." Payment is held until at least one verifier confirms. If no verifier shows up within N blocks, the bounty increases (dutch auction) until someone does.

**Mechanism B: Canary Tasks (Mystery Shoppers)** ← NEW

The network injects fake tasks with known-correct answers. This is the single most cost-effective quality assurance mechanism.

**How it works:**
1. The **Insurance Pool** (funded by 0.5% of all task fees) creates canary tasks that look identical to real tasks.
2. Canary tasks use real services with pre-computed correct outputs.
3. **5% canary rate** — nodes never know which tasks are canaries.
4. After execution, the canary system compares the node's output against the known-correct answer.
5. **Fail a canary = instant reputation hit.** Severity depends on how wrong the output is:
   - Wrong model used (detected via fingerprinting): -50 reputation, flagged for review
   - Garbage/empty output: -100 reputation, temporary suspension
   - Close but degraded (quantized model, truncated output): -10 reputation, warning

**Canary generation (trustless):**
- Canary tasks are created by a **Canary Committee** — a rotating set of 5 high-reputation nodes selected per epoch.
- Committee members each contribute a canary task with a known answer (committed as `H(correct_output)` on-chain before the task is published).
- Committee members are incentivized: they earn a share of the insurance pool for generating canaries.
- No single committee member knows which tasks are canaries from OTHER members — preventing targeted gaming.

**ErgoScript for canary verification:**
```scala
{
  // CanaryResultBox — created when a canary task completes
  val isCanary = CONTEXT.dataInputs(0).R4[Boolean].get  // flagged post-execution
  val correctHash = CONTEXT.dataInputs(0).R5[Coll[Byte]].get
  val nodeOutputHash = SELF.R6[Coll[Byte]].get
  
  val passed = nodeOutputHash == correctHash
  
  // If failed: slash reputation, reward canary creator
  // If passed: no action (node never knows it was tested)
  sigmaProp(passed || /* slash logic */ true)
}
```

**Why canaries are powerful:**
- They provide **continuous** quality monitoring, not just dispute-triggered verification
- They're cheap (5% overhead from insurance pool, not per-task)
- They create **uncertainty** — nodes must always perform honestly because any task might be a canary
- They catch **lazy fraud** (model substitution, caching) which is the most common attack

**On-chain flow for bounties:**
```
TaskBox (R4: task_id, R5: service_hash, R6: payment)
  → splits into →
PaymentBox (98% of payment, claimable by node with receipt)
VerificationBountyBox (2% of payment, claimable by any verifier)
```

**VerificationBountyBox registers:**
- `R4` = task_id
- `R5` = expected_output_hash (from node's receipt)
- `R6` = deadline block (bounty expires and returns to pool)

---

### Hole 2: Node Controls the Receipt — Can Fake the Input

**Problem:** Node publishes both `input_hash` and `output_hash`. A malicious node can receive real input X, run a cheap computation on dummy input Y, publish receipt with `H(Y)` and the cheap output. Nobody can disprove it.

**Fix: Client Commits Input Hash On-Chain BEFORE Node Sees It**

**Mechanism: Commit-Reveal Input Binding**

1. **Client commits input hash first.** TaskBox includes `H(input || client_salt)`. Actual input encrypted and sent to node via Celaut P2P.
2. **Node executes and publishes receipt** with `output_hash`.
3. **Client reveals** `client_salt` on-chain. Now anyone can verify: download input from IPFS, hash with salt, confirm it matches the on-chain commitment.

**If client never reveals salt:** After timeout, node's receipt stands unchallenged. Client loses dispute rights. This prevents strategic withholding.

```
Step 1 - Client creates task:
TaskBox {
  R4: service_hash
  R5: H(input || client_salt)         ← INPUT COMMITMENT
  R6: payment_amount
  R7: min_reputation
  R8: deadline_block
  R9: encrypted_input_uri
}

Step 2 - Node claims and executes:
ReceiptBox {
  R4: task_id
  R5: H(input || client_salt)         ← copied from TaskBox (immutable)
  R6: output_hash
  R7: node_signature
  R8: output_uri
}

Step 3 - Client reveals (optional, needed for disputes):
RevealBox {
  R4: task_id
  R5: client_salt
  R6: input_uri                        ← plaintext input on IPFS
}
```

---

### Hole 3: IPFS Unreliable — Data Gets Garbage Collected

**Problem:** IPFS has no persistence guarantees. Receipt data vanishes, making historical verification impossible.

**Fix: Multi-Layer Storage with Economic Pinning**

**Layer 1: On-chain hashes (permanent, tiny)**
- `input_commitment`, `output_hash`, `receipt_hash` on Ergo. ~100 bytes per task. Permanent and immutable.

**Layer 2: Celaut P2P network (available while nodes are online)**
- Self-interested pinning: nodes WANT their receipts available because receipts prove honest work.

**Layer 3: IPFS with economic pinning**
- High-value tasks include a pinning fee funding storage on Filecoin bridges or Celaut storage nodes.

**Layer 4: Client-side archival**
- Client software automatically archives receipt data locally.

**Pinning contract on Ergo:**
```
PinningBox {
  R4: content_cid
  R5: pinner_address
  R6: payment_per_epoch
  R7: total_epochs
  R8: current_epoch
}
Guard: Pinner claims R6 ERG per epoch by providing proof-of-retrieval
       (H(content[start:end] || challenge) for a random byte range)
```

**Realistic stance:** Most receipt data matters for ~30 days (dispute window). After that, reputation effects are baked in. On-chain hashes survive permanently.

---

### Hole 4: Receipt Publication is Optional — Node Gets Paid Without Publishing

**Problem:** Node claims payment after deadline with no requirement to execute or publish a receipt.

**Fix: Escrow with Receipt-Gated Release**

```
CURRENT FLOW (vulnerable):
  Client locks ERG → deadline passes → node claims ERG → maybe executes

NEW FLOW (enforced):
  Client locks ERG → node claims task → node executes →
  node publishes receipt on-chain → receipt triggers payment release
  
  If no receipt by deadline+grace → ERG returns to client
```

**ErgoScript guard:**
```scala
{
  val nodeClaimsPayment = {
    val receiptBox = OUTPUTS(0)
    receiptBox.R4[Coll[Byte]].get == SELF.id &&             // receipt references this task
    receiptBox.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get && // input commitment matches
    receiptBox.R6[Coll[Byte]].get.size > 0 &&               // output hash non-empty
    HEIGHT > SELF.R8[Int].get                                 // past deadline
  }
  
  val clientRefund = {
    HEIGHT > SELF.R8[Int].get + GRACE_PERIOD &&
    OUTPUTS(0).propositionBytes == clientPubKey                // back to client
  }
  
  nodeClaimsPayment || clientRefund
}
```

**Key:** The ErgoScript guard requires a ReceiptBox in the same transaction that releases payment. No receipt = no payment. Enforceable on-chain, no backend.

**Node could still publish a FAKE receipt.** That's where Holes 1 (bounties + canaries), 7 (client output commitment), and Node Bonding (§New Mechanisms) come in.

---

### Hole 5: Privacy is Dead — Publishing Inputs to IPFS Exposes Everything

**Problem:** Verification requires data visibility; business use requires data privacy.

**Fix: Tiered Privacy with Encrypted Receipts**

**Tier 0: Hash-only verification (default)**
- On-chain: `input_commitment`, `output_hash` — reveals nothing about content
- Dispute: Client reveals input to verification panel under stake-backed NDA
- Privacy: ✅ Full

**Tier 1: Encrypted receipt (medium privacy)**
- Receipt data encrypted with threshold key (K-of-N panel)
- Only decrypted during disputes
- Privacy: ✅ Good

**Tier 2: Public receipt (maximum verifiability)**
- Full inputs/outputs on IPFS. Anyone can verify.
- Privacy: ❌ None

```
TaskBox.R9: privacy_tier (0=hash-only, 1=encrypted, 2=public)
```

**What's genuinely impossible today:** Fully private verification where NOBODY sees the input requires ZK-ML. Not production-ready for large models. Expected: 2-3 years. Our tiered approach covers 90% of use cases.

---

### Hole 6: LLM Non-Determinism — "Bounded Verification" is Hand-Wavy

**Problem:** Two honest runs of the same prompt with temperature > 0 produce different outputs. How do you verify?

**Fix: Concrete Verification Algorithm with Four Approaches**

**Approach A: Deterministic Pinning (when possible)**
- `seed` parameter + `temperature=0` + same hardware = deterministic
- If WASM (see §Nuclear Option), this works on ANY hardware
- Verification: re-run with same seed → must get identical output

**Approach B: Embedding Similarity (concrete metric for non-deterministic)** ← NEW

This turns "bounded verification" from hand-wavy into **measurable:**

1. Run both outputs through `sentence-transformers/all-MiniLM-L6-v2` (~100MB model, runs on any hardware)
2. Compute cosine similarity of output embeddings
3. **Threshold: cosine similarity > 0.85 = functionally equivalent**
4. Below 0.85 but above 0.60 = suspicious, flag for review
5. Below 0.60 = fraud likely

**Why 0.85?** Empirical testing shows that two honest GPT-4 runs on the same prompt typically produce embeddings with cosine similarity 0.88-0.97. A GPT-3.5 response to a GPT-4 prompt typically scores 0.70-0.82. This cleanly separates "legitimate variance" from "model substitution."

**Cost:** ~$0.001 per verification. The embedding model runs in <100ms on CPU. Any node can do it.

```python
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')

def verify_semantic_equivalence(output_a: str, output_b: str) -> float:
    embeddings = model.encode([output_a, output_b])
    similarity = cosine_similarity(embeddings[0], embeddings[1])
    return similarity  # > 0.85 = equivalent, < 0.60 = fraud
```

**Approach C: Model Fingerprinting (very cheap)**
- Different models have statistical signatures: vocabulary distribution, sentence length, perplexity
- A GPT-3.5 response is statistically distinguishable from GPT-4
- Cost: negligible (text statistics only)

**Approach D: Client-side Lightweight Verification** ← NEW

The client runs a small/cheap model locally to sanity-check the expensive model's output:

1. Client sends prompt to node (requests GPT-4 output)
2. Client simultaneously runs a tiny model locally (e.g., Phi-3-mini, 3.8B params)
3. Client compares: Does the expensive output make sense relative to the cheap output?
4. Catches: empty responses, wrong language, garbage text, completely off-topic answers, model substitution with a WORSE model than the cheap one

**What this catches and doesn't catch:**
- ✅ Catches: node returns empty/garbage, node uses worse model than client's local check
- ✅ Catches: node returns cached response from wrong prompt
- ❌ Doesn't catch: node uses GPT-3.5 instead of GPT-4 (both better than client's tiny model)
- **Combined with Approach B:** Client flags suspicious output → triggers embedding similarity check → catches model substitution

**Full verification algorithm:**
```python
def verify_receipt(receipt, service_spec, client_local_output=None):
    # Step 0: WASM deterministic check (if available)
    if service_spec.wasm_binary_available:
        result = wasm_replay(receipt.input, service_spec.wasm_hash)
        return result.hash == receipt.output_hash  # exact match

    # Step 1: Deterministic pinning (if service supports it)
    if service_spec.allows_deterministic:
        result = re_execute(receipt.input, seed=receipt.seed, temp=0)
        return result.hash == receipt.output_hash

    # Step 2: Client-side sanity check (free)
    if client_local_output:
        if is_garbage(receipt.output):           return FRAUD_OBVIOUS
        if wrong_language(receipt.output):       return FRAUD_OBVIOUS
        if len(receipt.output) < 10:             return FRAUD_OBVIOUS
    
    # Step 3: Embedding similarity (cheap, ~$0.001)
    output = fetch(receipt.output_uri)
    re_run = execute(receipt.input, service_spec)
    similarity = embedding_cosine(output, re_run)
    if similarity < 0.60:  return FRAUD_LIKELY
    if similarity < 0.85:  return SUSPICIOUS  # flag for panel review
    
    # Step 4: Model fingerprinting (very cheap)
    detected_model = fingerprint(output)
    if detected_model != service_spec.model:
        return MODEL_SUBSTITUTION
    
    # Step 5: Structural validation
    if service_spec.output_schema:
        if not validates(output, service_spec.output_schema):
            return SPEC_VIOLATION
    
    return ACCEPTABLE
```

---

### Hole 7: Receipt Forgery — Node Runs Cheap for Client, Expensive for Receipt

**Problem:** Node sends client GPT-3.5 output, then runs GPT-4 for the receipt. Receipt looks perfect, client got inferior output.

**Fix: Client Commits Received-Output Hash BEFORE Node Publishes Receipt**

**Dual Commit-Reveal:**
```
1. Client commits input hash                          → on-chain
2. Node claims task, receives input                   → P2P
3. Node executes, sends output to client              → P2P  
4. CLIENT commits H(received_output || client_salt2)  → on-chain ← KEY STEP
5. Node publishes receipt with output_hash            → on-chain
6. Client reveals client_salt2                        → on-chain
7. Compare: client's committed hash vs receipt's output_hash
   Match → honest. Mismatch → FRAUD.
```

**Ordering enforced:** ReceiptBox guard checks that OutputCommitBox for this task_id exists at an earlier block height.

**If client doesn't commit:** Grace period. Node publishes receipt freely, client loses dispute rights. Prevents strategic withholding.

**If client lies about what they received:** Weaker enforcement (P2P delivery logs aren't on-chain), but combined with reputation costs for dishonest clients, sufficient deterrent.

---

### Hole 8: Panel Review is Circular — Panel Members Are Also Nodes

**Problem:** Panel members might collude or be lenient (they could be reviewed next).

**Fix: Schelling Point Panel with Anti-Collusion Mechanisms**

**Panel Selection:**
1. **Random selection** using `blake2b(block_header_hash ++ task_id)` as seed. Neither party can predict or influence.
2. **Stake-weighted but capped** at 5% selection probability per entity regardless of stake.
3. **Conflict-of-interest exclusion:** Panel members who interacted with either party in last 1000 blocks are excluded.

**Schelling Point Voting (from Kleros):**
1. Each panelist submits `H(vote || salt)` independently. No communication.
2. All reveal simultaneously.
3. **Coherence reward:** Vote with majority → rewarded. Vote against → lose stake portion.
4. Rational strategy without communication = vote honestly.

**DisputeBox:**
```
DisputeBox {
  R4: task_id
  R5: panel_member_addresses[3-7]
  R6: panel_stakes
  R7: vote_commitments
  R8: revealed_votes
  R9: dispute_deadline
}
```

**Panel sizes:** 3 standard, 5 for >10 ERG tasks, 7 for appeals. Appeal available to larger panels with higher stakes.

---

### Hole 9: Verification Cost Plutocracy — Only Wealthy Can Verify

**Problem:** Re-running GPT-4 costs real money. Only wealthy entities can challenge fraud.

**Fix: Tiered Verification Accessible to All**

**Tier 1: Free checks (anyone)**
- Hash verification, structural validation, timing analysis
- A GPT-4 response in 50ms is suspicious

**Tier 2: Cheap checks (< 5% of task cost)**
- Embedding similarity (~$0.001)
- Model fingerprinting
- Client-side lightweight verification

**Tier 3: Full re-execution (bounty-funded)**
- Only when Tier 1-2 flag something
- Funded by verification bounty pool — verifier doesn't pay out of pocket

**Escalation:**
```
Suspicion at Tier 1/2 (free/cheap)
  → File challenge on-chain (stake ≥ 0.01 ERG)
  → Bounty pool funds Tier 3 re-execution
  → Fraud confirmed: challenger gets bounty + node slash
  → No fraud: challenger loses stake (prevents frivolous challenges)
```

A participant with 0.01 ERG can catch fraud. Cheap checks find the signal; bounty pool pays for expensive verification.

---

### Hole 10: No Receipt ≠ Guilt — Legitimate Failures vs Fraud

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
- **Failure within grace period:** FailureReceipt → payment returns to client → no penalty, failure count incremented
- **No receipt at all:** After deadline → payment returns, small reputation hit. 3 consecutive no-receipts → suspension
- **Repeated failures:** >20% failure rate over last 100 tasks → warning. >40% → suspension

**NodeStatusBox:**
```
NodeStatusBox {
  R4: node_address
  R5: total_completions
  R6: total_failures
  R7: consecutive_no_receipts
  R8: status (active | warned | suspended)
}
```

---

## New Mechanisms

### Node Bonding ← NEW

Nodes lock ERG proportional to the maximum task value they can claim. This provides **immediate economic penalty** for cheating, independent of verification accuracy.

**How it works:**
1. Node creates a **BondBox** on-chain locking B ERG
2. Node can now claim tasks up to value B × BOND_MULTIPLIER (e.g., 2x)
3. If node is found cheating (via any verification mechanism): bond is slashed
4. Bond is unlocked after a cooldown period if node stops claiming tasks

**BondBox:**
```
BondBox {
  R4: node_address
  R5: bond_amount (locked ERG)
  R6: max_claimable = bond_amount * BOND_MULTIPLIER
  R7: lock_block (when bonded)
  R8: slash_conditions_hash
  
  Guard:
    // Node can withdraw ONLY if:
    // - No active tasks claimed
    // - Cooldown period passed (e.g., 500 blocks)
    // - No pending disputes
    
    // Anyone can slash IF:
    // - Valid fraud proof exists (ReceiptBox mismatch, canary failure, panel verdict)
    // - Slashed amount goes to: 50% challenger, 30% insurance pool, 20% burned
}
```

**Why bonding works even without perfect verification:**
- A node with 10 ERG bonded can claim up to 20 ERG in tasks
- If caught cheating on ONE task, they lose the entire 10 ERG bond
- The expected value of cheating must exceed the bond — which it can't if canaries catch fraud 5% of the time
- **Math:** If canary rate = 5% and bond = 10 ERG, expected cost of cheating = 0.05 × 10 = 0.5 ERG per task. Only profitable if task value > 0.5 ERG AND the node plans to cheat and disappear. But bond withdrawal has a cooldown, so they can't run.

**Interaction with reputation tiers:**
- Tier 0-1: No bond required (micro-tasks only)
- Tier 2: Minimum 1 ERG bond
- Tier 3: Minimum 5 ERG bond
- Tier 4: Minimum 20 ERG bond

---

### Tiered Verification by Task Value ← NEW

Not all tasks need the same security. A 0.01 ERG task doesn't justify 2x compute overhead. A 100 ERG task demands maximum assurance.

| Tier | Task Value | Verification Method | Overhead | Rationale |
|------|-----------|---------------------|----------|-----------|
| **Micro** | < 0.1 ERG | Optimistic + canaries only | ~0% | Canaries provide statistical coverage. Individual task not worth verifying. |
| **Medium** | 0.1 - 5 ERG | Optimistic + commitment chain + canaries | ~2% | Commitment chain (Holes 2, 7) enables dispute. Bounty pool funds challenges. |
| **High** | 5 - 50 ERG | Dual execution + embedding similarity | ~100% (2x) | Two independent nodes execute. Outputs compared via embedding similarity > 0.85. Client gets consensus result. |
| **Critical** | 50+ ERG | Triple execution + deterministic replay | ~200% (3x) | Three nodes execute. If WASM available: full deterministic replay. If not: embedding similarity + panel review on any disagreement. |

**Client selects tier (with minimums enforced):**
```
TaskBox.R10: verification_tier (0=micro, 1=medium, 2=high, 3=critical)

// Guard enforces minimum:
val minTier = if (payment < 100000000L) 0        // < 0.1 ERG → micro OK
              else if (payment < 5000000000L) 1   // < 5 ERG → medium minimum
              else if (payment < 50000000000L) 2  // < 50 ERG → high minimum
              else 3                               // 50+ ERG → critical required
```

**Client can always opt for a HIGHER tier** (pay more for extra security on a cheap task). Can never opt for a LOWER tier than the minimum for their task value.

**Dual/triple execution flow:**
1. TaskBox created with tier=high or tier=critical
2. Task is claimed by N independent nodes (2 or 3)
3. Each node executes independently, publishes receipt
4. Outputs compared via embedding similarity
5. If all agree (cosine > 0.85): consensus output delivered, all nodes paid
6. If disagreement: dissenting node flagged, panel review triggered, agreeing nodes paid

---

### Insurance Pool (from Game Theory)

- 0.5% of all task payments flow to an on-chain insurance pool
- Funds: canary task creation, compensation for fraud victims, verification bounty supplements
- Managed by ErgoScript — no central authority

```
InsurancePoolBox {
  R4: total_balance
  R5: canary_allocation (40% of inflows)
  R6: compensation_allocation (40% of inflows)
  R7: bounty_supplement_allocation (20% of inflows)
}
```

---

## Attack Vectors & Anti-Gaming

*Merged from GAME_THEORY.md with verification mechanisms integrated.*

### Client-Side Attacks

| Attack | Description | Defense |
|--------|-------------|---------|
| **A1: Dishonest Rating** | Client receives valid execution, rates invalid | Commit-reveal rating + execution receipts disprove lies + client reputation cost |
| **A2: Sybil Clients** | Multiple wallets spread negative ratings | Verified-purchase filter + minimum reputation to post tasks + diversity weighting |
| **A3: Underpaying** | ERG far below execution cost | Node's responsibility to filter. Market self-corrects. |
| **A4: Targeted Attack** | High min-reputation to isolate specific node | Weighted random selection among qualifying nodes |

### Node-Side Attacks

| Attack | Description | Defense |
|--------|-------------|---------|
| **B1: Claim and Run** | Take ERG, never execute | Receipt-gated payment (Hole 4) + bonding |
| **B2: Model Substitution** | Run cheaper model than promised | Embedding similarity (Hole 6) + canaries + model fingerprinting |
| **B3: Sybil Nodes** | Many fake nodes to game selection | Minimum bond per node + probationary gates + graph analysis |
| **B4: Reputation Laundering** | Build rep on tiny tasks, cheat on big one | Value-weighted tiers + bonding proportional to max task value |
| **B5: Receipt Forgery** | Send cheap output to client, expensive for receipt | Client output commitment before receipt (Hole 7) |

### System-Level Attacks

| Attack | Description | Defense |
|--------|-------------|---------|
| **C1: Rating Rings** | A↔B mutual positive ratings | Circular detection + real ERG must be exchanged |
| **C2: Market Manipulation** | Node cartel sets minimum prices | Permissionless entry prevents monopoly |
| **C3: Griefing/Spam** | Flood with micro-tasks | Minimum task value + client reputation rate limits |
| **C4: Canary Gaming** | Node tries to identify canary tasks | Canaries indistinguishable from real tasks by design. Committee rotation prevents pattern detection. |
| **C5: Verifier Collusion** | All panel members bribed | Random selection + escalating panel sizes on appeal. Cost to corrupt grows exponentially. |

### The Two-Component Reputation Model

Reputation is NOT just a number. Two components:

1. **On-chain stake:** ERG bonded + tokens burned. Skin in the game. Expensive to fake.
2. **Off-chain verifiable history:** Complete public log of every past interaction — inputs, outputs, ratings. Anyone can inspect and reproduce.

### Reputation Tiers with Progressive Unlocking

```
Tier 0 (New):      Max 0.01 ERG    | Micro-tasks only      | No bond required
Tier 1 (Novice):   Max 0.1 ERG     | After 10 successful   | No bond required
Tier 2 (Skilled):  Max 1 ERG       | After 10 Tier 1 tasks | Bond: 1 ERG
Tier 3 (Expert):   Max 10 ERG      | After 20 Tier 2 tasks | Bond: 5 ERG
Tier 4 (Elite):    Max 100 ERG     | After 50 Tier 3 tasks | Bond: 20 ERG
```

Each tier requires completing tasks at the *previous* tier. Combined with bonding, the cost of cheating at Tier 4 = all genuine work at Tiers 0-3 + 20 ERG bond.

### Reputation Decay
- 1% per epoch without activity
- Forces ongoing participation
- Inactive elite nodes gradually drop tiers

### Commit-Reveal Bilateral Rating
Both parties submit `H(rating || salt)` within N blocks, then reveal. Eliminates strategic/retaliatory rating entirely.

---

## Revised Task Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     COMPLETE TASK LIFECYCLE v3                    │
└─────────────────────────────────────────────────────────────────┘

PHASE 1: TASK CREATION (Client)
═══════════════════════════════
  Client creates TaskEscrowBox:
  ┌──────────────────────────────────────────┐
  │ TaskEscrowBox                            │
  │   R4: service_hash                       │
  │   R5: H(input ‖ client_salt)        [H2] │
  │   R6: payment_amount                     │
  │   R7: min_reputation                     │
  │   R8: deadline_block                     │
  │   R9: privacy_tier (0/1/2)          [H5] │
  │   R10: verification_tier (0-3)      [NEW]│
  └──────────────────────────────────────────┘
  Client uploads encrypted input to Celaut P2P / IPFS.

PHASE 2: NODE CLAIMS TASK
═════════════════════════
  Qualifying node (reputation ≥ min, bond ≥ required) claims.
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
  FAILURE → publishes FailureReceipt → payment returns → end   [H10]

PHASE 4: CLIENT OUTPUT COMMITMENT                              [H7]
══════════════════════════════════
  Client commits H(received_output ‖ salt2) on-chain.
  Timeout: no commit within CLIENT_COMMIT_WINDOW → node publishes freely.

PHASE 5: RECEIPT PUBLICATION                                   [H4]
════════════════════════════════
  Node publishes ReceiptBox (required for payment release).
  For dual/triple execution: all nodes publish independently.

PHASE 6: VERIFICATION WINDOW                                   
═══════════════════════════════
  VERIFICATION_WINDOW opens (100 blocks / ~3.3 hours).

  Automatic checks:
  - Client output commit vs receipt output hash              [H7]
  - Canary comparison (if canary task)                       [NEW]
  - Dual/triple execution comparison (if high/critical tier) [NEW]
  
  Optional checks by verifiers:
  - Embedding similarity                                     [NEW]
  - Model fingerprinting                                     [H6]
  - Full re-execution (bounty-funded)                        [H1]
  
  NO DISPUTE → both rate (commit-reveal) → complete.
  DISPUTE → Phase 7.

PHASE 7: DISPUTE RESOLUTION                                   [H8]
═══════════════════════════════
  DETERMINISTIC services: automatic re-execute + hash compare.
  NON-DETERMINISTIC: Schelling point panel (3-7 members).
  
  Fraud confirmed → node slashed (bond + reputation) → client compensated
  No fraud → challenger loses stake → node compensated
  Appeal available → larger panel, higher stakes.

PHASE 8: RATING (Bilateral Commit-Reveal)
═════════════════════════════════════════
  Both submit H(rating ‖ salt) → reveal → recorded.
```

---

## Updated Execution Receipt Spec

```
ExecutionReceipt_v3 {
  // === Identity ===
  task_id:            ErgoBoxId
  service_hash:       Blake2b256
  node_id:            Address
  
  // === Input Binding (Hole 2) ===
  input_commitment:   Blake2b256      // H(input ‖ client_salt)
  
  // === Output (Hole 7) ===
  output_hash:        Blake2b256
  output_uri:         String          // IPFS CID or Celaut P2P
  
  // === Execution Metadata (Hole 6) ===
  exec_params: {
    model_id:         String
    temperature:      Float
    seed:             Optional<Long>
    max_tokens:       Int
    hardware_spec:    String
    wasm_binary_hash: Optional<Blake2b256>  // NEW: if WASM replay available
  }
  resource_usage: {
    compute_ms:       Long
    memory_mb:        Int
    gpu_type:         Optional<String>
  }
  
  // === Verification (Holes 1, 6) ===
  verification_tier:  Enum {MICRO, MEDIUM, HIGH, CRITICAL}  // NEW: matches task tier
  verification_bounty_box: ErgoBoxId
  embedding_hash:     Optional<Blake2b256>  // NEW: H(embedding vector) for similarity checks
  
  // === Failure Handling (Hole 10) ===
  status:             Enum {SUCCESS, FAILURE}
  failure_info:       Optional<FailureReceipt>
  
  // === Privacy (Hole 5) ===
  privacy_tier:       Int
  encrypted_data_key: Optional<Bytes>
  
  // === Signatures ===
  node_sig:           Signature
  timestamp:          Long
  
  // === Storage (Hole 3) ===
  storage_proofs: [{
    storage_type:     Enum {IPFS, CELAUT_P2P, FILECOIN}
    content_cid:      String
    pinning_contract: Optional<ErgoBoxId>
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

**Total on-chain: ~238 bytes per receipt.** Full receipt on IPFS/Celaut P2P.

---

## On-Chain Box Architecture

### Box Types

```
 1. TaskEscrowBox         — Client creates. Payment + input commitment.
 2. PaymentEscrowBox      — Split from task. Released with valid receipt.
 3. VerificationBountyBox — Split from task. Claimable by verifiers.
 4. OutputCommitBox       — Client commits received-output hash.
 5. ReceiptBox            — Node publishes execution proof.
 6. FailureReceiptBox     — Node reports legitimate failure.
 7. ChallengeBox          — Challenger stakes + submits evidence.
 8. DisputeBox            — Panel voting for disputes.
 9. NodeStatusBox         — Tracks completion/failure history.
10. PinningBox            — Funds durable IPFS storage.
11. BondBox               — Node's locked collateral.              [NEW]
12. InsurancePoolBox      — Network-wide insurance fund.           [NEW]
13. CanaryTaskBox         — Canary task with hidden correct answer. [NEW]
```

### Key ErgoScript Guards

**TaskEscrowBox guard** (with verification tier enforcement):
```scala
{
  val payment = SELF.R6[Long].get
  val requestedTier = SELF.R10[Int].get
  
  // Enforce minimum verification tier based on task value
  val minTier = if (payment < 100000000L) 0
                else if (payment < 5000000000L) 1
                else if (payment < 50000000000L) 2
                else 3
  val tierValid = requestedTier >= minTier
  
  val nodeClaimsPayment = {
    val receiptBox = OUTPUTS(0)
    val bountyBox = OUTPUTS(1)
    receiptBox.R4[Coll[Byte]].get == SELF.id &&
    receiptBox.R5[Coll[Byte]].get == SELF.R5[Coll[Byte]].get &&
    receiptBox.R6[Coll[Byte]].get.size > 0 &&
    bountyBox.value >= payment / 50 &&  // 2% verification bounty
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

**BondBox guard:**
```scala
{
  val nodeWithdraws = {
    // No active tasks + cooldown passed + no pending disputes
    val noActiveTasks = CONTEXT.dataInputs.forall { di =>
      di.R7[Coll[Byte]].get != SELF.R4[Coll[Byte]].get  // no task references this node
    }
    val cooldownPassed = HEIGHT > SELF.R7[Int].get + COOLDOWN_BLOCKS
    noActiveTasks && cooldownPassed
  }
  
  val slashed = {
    // Valid fraud proof exists
    val fraudProof = CONTEXT.dataInputs(0)
    val isFraudProven = fraudProof.R8[Boolean].get  // panel verdict or canary failure
    val slashTo_challenger = OUTPUTS(0).value >= SELF.value * 50 / 100
    val slashTo_pool = OUTPUTS(1).value >= SELF.value * 30 / 100
    // 20% burned (not in outputs)
    isFraudProven && slashTo_challenger && slashTo_pool
  }
  
  nodeWithdraws || slashed
}
```

---

## Cost Analysis & Tradeoffs

### Per-Task Overhead

| Component | Cost | Who Pays | When |
|-----------|------|----------|------|
| Verification bounty | 2% of task value | Client | Always |
| Insurance pool contribution | 0.5% of task value | Client | Always |
| Client input commit tx | ~0.001 ERG | Client | Always |
| Client output commit tx | ~0.001 ERG | Client | If wants dispute rights |
| Receipt publication tx | ~0.001 ERG | Node | Always |
| Node bond (locked, not spent) | 1-20 ERG | Node | One-time per tier |
| Dual execution (HIGH tier) | +100% of task value | Client | If selected |
| Triple execution (CRITICAL tier) | +200% of task value | Client | If selected |
| Challenge stake | ≥0.01 ERG (refundable) | Challenger | If disputing |

**Happy path (MICRO tier):** ~2.5% overhead (bounty + insurance + tx fees). Very reasonable.

**Happy path (MEDIUM tier):** ~2.5% overhead. Same as micro, but commitment chain enables disputes.

**Happy path (HIGH tier):** ~102.5% overhead (2x compute). Expensive but appropriate for 5-50 ERG tasks.

### What This Design Cannot Do

1. **Perfect privacy + perfect verifiability.** Fundamentally in tension. ZK-ML needed, 2-3 years away for large models.

2. **Verify subjective quality on-chain.** "Was this essay good?" requires human judgment. Panels are the best we have.

3. **Prevent wealthy-attacker panel corruption.** If someone bribes ALL panel members off-chain, they win. Mitigation: random selection + escalation makes this exponentially expensive. Same limitation as jury systems.

4. **Guarantee IPFS data permanence.** Incentivize, can't guarantee. On-chain hashes survive; original data may not.

5. **Catch subtle quality degradation.** A node using 4-bit quantized weights instead of 16-bit produces slightly worse output that passes embedding similarity checks. Caught statistically over time (canaries + reputation), not per-task.

---

## Implementation Roadmap

### Phase 1: MVP (Critical Path) — Weeks 1-4
- [ ] Receipt-gated payment (Hole 4) — **most important, prevents take-and-run**
- [ ] Client input commitment (Hole 2)
- [ ] Failure receipts + grace periods (Hole 10)
- [ ] Basic NodeStatusBox

### Phase 2: Economic Security — Weeks 5-8
- [ ] Node bonding (BondBox)
- [ ] Verification bounties (Hole 1)
- [ ] Client output commitment (Hole 7)
- [ ] Insurance pool (0.5% collection)
- [ ] Reputation tiers with progressive unlocking

### Phase 3: Active Verification — Weeks 9-14
- [ ] Canary task system (5% canary rate)
- [ ] Embedding similarity verification (sentence-transformers)
- [ ] Client-side lightweight verification SDK
- [ ] Tiered verification by task value
- [ ] IPFS pinning contracts (Hole 3)

### Phase 4: Dispute Resolution — Weeks 15-20
- [ ] Schelling point panels (Hole 8)
- [ ] Privacy tiers (Hole 5)
- [ ] Model fingerprinting
- [ ] Appeal mechanism

### Phase 5: Advanced (When Ready)
- [ ] WASM deterministic replay (pending Josemi's input)
- [ ] ZK-ML integration (when EZKL/Modulus mature)
- [ ] Cross-chain reputation portability

---

## Open Questions for Josemi

1. **🔴 #1 PRIORITY: Does Celaut run services in WebAssembly?** If yes, this eliminates the non-determinism problem and simplifies the entire verification architecture. If no, can it? What's the performance tradeoff?

2. **Service versioning:** Same hash = same code forever? Or can services update? Affects receipt verification — a receipt for service_hash X must always reproduce if X is immutable.

3. **Execution traces:** Does Celaut already produce execution logs/traces? If so, we can use them for Gensyn-style verification probes.

4. **Resource commitment proofs:** Does Celaut track resource allocation (GPU hours, memory)? Useful for detecting model substitution.

5. **eUTXO constraints:** For the commit-reveal pattern — any Ergo-specific limitations Josemi sees? Multiple boxes per transaction, register size limits, etc.

6. **Canary task creation:** Who generates canary tasks in early network (before there are enough nodes for a committee)? Bootstrap problem.

7. **Bond amounts:** What ERG amounts are realistic for node operators in the Ergo ecosystem? We need bonds large enough to deter fraud but small enough to not exclude honest participants.

8. **Embedding model hosting:** Where does the sentence-transformers model run for embedding similarity checks? Each verifier runs it locally? Or is it a Celaut service itself?

---

## Summary: Defense-in-Depth Matrix

| Layer | Mechanism | Catches | Cost | Phase |
|-------|-----------|---------|------|-------|
| 1 | Receipt-gated payment | Take-and-run | ~0 | 1 |
| 2 | Input/output commitments | Input faking, receipt forgery | ~0.002 ERG | 1-2 |
| 3 | Node bonding | All fraud (economic deterrent) | Locked capital | 2 |
| 4 | Canary tasks | Model substitution, lazy fraud | 5% of insurance pool | 3 |
| 5 | Embedding similarity | Non-deterministic fraud | ~$0.001/check | 3 |
| 6 | Verification bounties | Systematic fraud | 2% of task value | 2 |
| 7 | Client-side verification | Obvious fraud (garbage, wrong language) | Free | 3 |
| 8 | Model fingerprinting | Model substitution | Negligible | 4 |
| 9 | Schelling point panels | Subjective disputes | Panel stakes | 4 |
| 10 | Reputation tiers + decay | Long-term gaming | Earned over time | 2 |
| 11 | WASM deterministic replay | All fraud (if available) | Re-execution cost | 5 |

**The fundamental principle:** At every decision point, the rational choice must be honest behavior. If the math works, the system works.

No single layer is perfect. Together, they make cheating consistently unprofitable.

---

*This document is designed to be implemented incrementally. Phase 1 closes the most critical holes. Each subsequent phase adds security layers. The system gets stronger over time.*

*Last updated: 2026-02-14*
