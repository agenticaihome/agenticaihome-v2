# AIH Verification System — Security Audit Report

**Auditor:** Independent distributed systems security review  
**Date:** 2026-02-14  
**Documents reviewed:** VERIFICATION_DESIGN.md (v3), VERIFICATION_SUMMARY.md, GAME_THEORY.md  
**Verdict:** CONDITIONAL PASS — good architecture, several critical feasibility gaps

---

## 1. Executive Summary

The design is **architecturally sound in concept** — optimistic execution with funded fraud proofs is the right paradigm. The layered defense-in-depth approach is well-reasoned. The game theory for basic attacks (take-and-run, reputation laundering) holds up.

However, the document's **crown jewel — the "novel" AIH Inference Verification Protocol (deterministic seed + canonical WASM + bisection)** — has serious feasibility problems that the authors appear to recognize partially but understate significantly. Several mechanisms that sound rigorous on paper either can't be implemented as described on Ergo's eUTXO model, or rely on assumptions that don't hold for real LLM workloads.

**Bottom line:** Phases 1-2 (receipt-gated payment, bonding, commitments) are solid and buildable. Phase 3+ is where the design starts writing checks the implementation can't cash. The "novel protocol" is more aspirational than practical today.

---

## 2. Critical Issues

### C1: The Bisection Protocol for LLM Token Generation Is Not Practical

**Section:** "Component 3: Bisection Dispute Protocol for Token Generation"

This is presented as the key innovation. The protocol requires:

> `stateᵢ = KV-cache + logits after generating tokenᵢ`

**The KV-cache for a 7B model is approximately 1-4 GB** (depending on sequence length, number of layers, head dimensions, and precision). For a 13B model, double that. Hashing this after every single token generation step means:

- **1000-token response = 1000 hashes of multi-GB state = 1-4 TB of data hashed**
- Even with fast hashing (Blake2b at ~1 GB/s), that's **1-4 seconds of pure hashing overhead per token** — on top of the ~50-100ms actual inference time per token
- The "5-10% overhead" claim for the state commitment chain is **off by 1-2 orders of magnitude**

The doc acknowledges "KV-cache is large" and suggests committing `H(KV-cache)` — but that IS the problem. You still have to hash the full cache.

**Possible mitigation:** Incremental/Merkle hashing of KV-cache (only hash the delta per token). But this requires deep integration with the inference runtime and isn't mentioned anywhere. Even then, each token appends new KV entries across all layers — it's not a trivial delta.

**Verdict:** The bisection protocol is theoretically elegant but practically infeasible for models ≥ 7B with current hashing approaches. This undermines the core "novel contribution" claim.

### C2: Register Overflow — R10 Doesn't Exist on Ergo

**Section:** On-Chain Box Architecture, TaskEscrowBox

The TaskEscrowBox uses:
```
R4: service_hash
R5: input_commitment
R6: payment_amount
R7: min_reputation
R8: deadline_block
R9: privacy_tier
R10: verification_tier    ← DOES NOT EXIST
```

Ergo boxes have registers R4-R9 (6 user registers). **R10 does not exist.** This means either:
- Two fields need to be packed into one register (e.g., tuple in R9)
- The box design needs restructuring

This appears again in the Lifecycle diagram (`R10: verification_tier`). It's not a fatal flaw — packing two bytes into one register is trivial — but it indicates the ErgoScript hasn't been tested against actual Ergo constraints. **How many other designs assume capabilities Ergo doesn't have?**

### C3: BondBox "No Active Tasks" Check Is Impossible as Written

**Section:** BondBox guard

```scala
val noActiveTasks = CONTEXT.dataInputs.forall { di =>
  di.R7[Coll[Byte]].get != SELF.R4[Coll[Byte]].get
}
```

This checks that **none of the data inputs** reference this node. But who provides the data inputs? The node themselves, in the withdrawal transaction. A malicious node simply... doesn't include their active task boxes as data inputs. 

In eUTXO, there's no way to say "check ALL boxes on the blockchain that reference me." You can only check boxes explicitly included in the transaction. This guard is **trivially bypassable**.

**Fix needed:** Active task tracking needs to be done via a chain of boxes (a "task counter" box that increments/decrements), not via data input scanning.

### C4: The Canonical Runtime Governance Problem

**Section:** "Component 2: Canonical Inference Runtime"

> `canonical_runtime_hash = H(wasm_binary)  // published on-chain`

**Who publishes this?** Who decides which WASM binary is canonical? Who updates it when bugs are found? The doc says "it's a Celaut service identified by hash. Anyone can host it." But that's the hosting problem, not the governance problem.

If two parties in a dispute disagree about which canonical runtime to use, who arbitrates? If the canonical runtime has a bug that produces wrong results, who patches it and how do existing receipts/disputes get handled?

This is hand-waved as "Content-addressed = decentralized" but content-addressing solves integrity, not governance. **This is a hard social coordination problem disguised as a technical one.**

---

## 3. Major Issues

### M1: Embedding Similarity Threshold (0.85) Is Not Well-Justified

**Section:** "Approach B: Embedding Similarity"

The doc claims:
> Two honest GPT-4 runs typically produce cosine similarity 0.88-0.97. GPT-3.5 on a GPT-4 prompt: 0.70-0.82.

**Where do these numbers come from?** No citation, no benchmark, no dataset. Sentence-transformer cosine similarity varies wildly by:
- Task type (factual Q&A vs creative writing vs code generation)
- Output length (short answers cluster tighter)
- Domain specificity

For code generation, two correct implementations of the same algorithm can have cosine similarity < 0.5 in embedding space. For "write a haiku about cats," two valid outputs might score 0.6. The 0.85 threshold would produce both false positives (flagging honest variance as fraud) and false negatives (accepting model substitution as legitimate).

**What's needed:** Empirical benchmarking across task types with published ROC curves, or this mechanism is hand-wavy.

### M2: Canary Committee Is a Centralization Vector

**Section:** "Canary Tasks (Mystery Shoppers)"

> Canary tasks are created by a Canary Committee — a rotating set of 5 high-reputation nodes selected per epoch.

In a young network, "5 high-reputation nodes" might be 5 out of 10 total nodes. The committee knows which tasks are canaries (they created them). Committee members can:
- Warn friendly nodes about canary tasks
- Create canaries that are easy to distinguish (subtle formatting differences, specific prompt patterns)
- Collude to exempt each other

The "no single committee member knows canaries from OTHER members" claim helps but doesn't eliminate the risk — if 3/5 members collude, they know 60% of canaries.

**Also:** The bootstrap problem (acknowledged in Open Questions) is real. Who creates canaries when the network has 3 nodes?

### M3: Insurance Pool Math Doesn't Scale at Launch

**Section:** Insurance Pool

0.5% of all task fees sounds reasonable at scale. At launch:
- 100 tasks/day × 0.5 ERG average × 0.5% = 0.25 ERG/day in the pool
- A single canary task costs compute resources
- 5% canary rate on 100 tasks = 5 canary tasks/day
- Each canary requires executing a real AI service = real compute cost

The insurance pool can't fund canaries at launch. This creates a chicken-and-egg: you need canaries for security, but you need volume for canary funding.

### M4: Commit-Reveal Client Output (Hole 7) Has a Timing Attack

**Section:** "Client Commits Received-Output Hash BEFORE Node Publishes Receipt"

The flow requires the client to commit `H(received_output || salt2)` BEFORE the node publishes the receipt. But:

1. Client receives output via P2P
2. Client commits hash on-chain (requires an Ergo transaction, ~2 min block time)
3. Node publishes receipt on-chain

What prevents the node from watching the mempool, seeing the client's commitment transaction, and front-running with a matching receipt? The "ordering enforced" claim requires the OutputCommitBox to exist at an **earlier block height** — but with 2-minute blocks, the node has to wait one full block. This is enforceable but adds latency to every task.

More importantly: what if the client is offline or slow? The grace period fallback ("node publishes freely") means this entire mechanism is optional for the client. Most clients won't bother with the extra transaction.

### M5: 13 Box Types Is a Maintenance Nightmare

The system defines 13 box types. Each needs:
- ErgoScript guard logic (tested, audited)
- Transaction builder code
- Off-chain tracking/indexing
- Integration testing with every other box type

For a 2-person team, this is an enormous surface area. Ergo's eUTXO model means every interaction between box types is a separate transaction pattern that needs to be explicitly coded and tested. **The combinatorial complexity of 13 box types interacting is not 13 — it's closer to 13² potential interaction patterns.**

Recommendation: Phase 1 should use 4-5 box types maximum.

---

## 4. Minor Issues

### m1: WASM Performance Estimate Is Optimistic
The doc claims "2-5x" slowdown for WASM vs native. For LLM inference, real benchmarks show **10-50x** slowdown for pure WASM without SIMD/GPU. WebGPU helps but is immature. The "5-10x" figure in the performance analysis section contradicts the "2-5x" figure in the WASM section. Neither is well-sourced.

### m2: Reputation Decay Creates Perverse Incentives
1% decay per epoch forces nodes to take tasks they might not want, just to maintain reputation. This could lead to nodes accepting tasks they can't properly execute, increasing failure rates.

### m3: The ErgoScript Pseudocode Has Bugs
The CanaryResultBox guard ends with `sigmaProp(passed || /* slash logic */ true)` — this always evaluates to `true`. It's pseudocode, but sloppy pseudocode leads to sloppy implementation.

### m4: "Model Fingerprinting" Is Cited Without Evidence
The claim that "different models have statistical signatures" that are cheaply detectable is stated as fact without citation. Academic research on LLM fingerprinting exists but is far less reliable than implied, especially for models in the same family (GPT-4 vs GPT-4-turbo, or different quantizations of the same model).

### m5: Data Input Usage for NodeStatusBox
The design implies NodeStatusBox is read via data inputs during task claiming, but doesn't address how this box gets updated across potentially hundreds of transactions. In eUTXO, updating a single "status" box creates a sequential bottleneck — only one transaction can spend it per block.

---

## 5. What's Actually Good

### ✅ Receipt-Gated Payment (Hole 4)
Elegant, simple, enforceable on-chain. This alone eliminates the most common attack vector (take-and-run). The ErgoScript is straightforward and correct in principle.

### ✅ Optimistic Execution + Economic Deterrence
The fundamental paradigm is right. Truebit proved this works. The combination of bonding + canaries + reputation tiers creates genuine economic deterrence without requiring perfect verification.

### ✅ Tiered Verification by Task Value
Smart resource allocation. Not every task needs the same security. The tier system is well-thought-out and the thresholds are reasonable.

### ✅ Commit-Reveal Bilateral Rating
Solves the retaliatory rating problem cleanly. This is a known good mechanism (Kleros uses it) applied appropriately.

### ✅ Progressive Reputation Unlocking
The tier-gating of task values is the right answer to reputation laundering. The math on making cheating unprofitable at each tier is sound.

### ✅ Honest Limitations Section
The doc explicitly states what the system cannot do. This is rare and valuable. The acknowledgment that ZK-ML is years away, that off-chain data persistence isn't guaranteed, and that subtle quality degradation is only caught statistically — this is intellectual honesty.

### ✅ Defense-in-Depth Philosophy
No single mechanism is presented as a silver bullet. The layered approach means the system degrades gracefully — even if 2-3 layers fail, the remaining layers provide meaningful security.

---

## 6. Feasibility Assessment

### Timeline: 20 weeks for 2 people?

**Phase 1 (Weeks 1-4): Realistic** — Receipt-gated payment, input commitments, failure receipts. These are standard eUTXO patterns. 4 weeks for 2 experienced Ergo devs is tight but doable.

**Phase 2 (Weeks 5-8): Ambitious but possible** — Bonding and bounties are standard. Reputation tiers require careful design of the box chain. 4 weeks is tight.

**Phase 3 (Weeks 9-14): Unrealistic** — Canary system alone is a significant distributed systems problem. Embedding similarity requires off-chain infrastructure. Tiered verification multiplies the transaction patterns. 6 weeks is not enough.

**Phase 4 (Weeks 15-20): Fantasy** — Schelling point panels are a project unto themselves. Privacy tiers with threshold encryption require crypto engineering. Model fingerprinting is an active research area.

**Honest estimate:** 
- Phase 1-2: 10-12 weeks (not 8)
- Phase 3: 8-10 weeks (not 6)  
- Phase 4: 12-16 weeks (not 6)
- **Total: 30-38 weeks, not 20**

And this assumes no surprises with Ergo's eUTXO constraints, which there WILL be.

### Complexity Assessment

The design document is ~47KB of specification for a system that doesn't exist yet. The ratio of specification to implementation is concerning. The risk is that the team builds to the spec and discovers half the mechanisms don't compose properly in eUTXO.

**Recommendation:** Build Phase 1, deploy it, learn from it, THEN design Phase 2. Don't design all 5 phases upfront — the lessons from Phase 1 will invalidate assumptions in Phase 3+.

---

## 7. The "First Verifiable LLM" Claim

> "AIH would be the first system to offer provably verifiable LLM execution on any blockchain."

**Is it defensible?** Partially.

**What's true:**
- The combination of on-chain seed derivation + canonical WASM runtime + bisection is genuinely novel *as a design*
- Nobody else has published this specific combination for autoregressive LLM verification
- The approach is theoretically sound for small models with deterministic execution

**What's not true:**
- It doesn't work "today with existing primitives" — the KV-cache hashing problem (C1) makes the bisection protocol impractical for real models
- EZKL and Modulus Labs are closer to actual provable ML inference (for small models) than this design
- Gensyn's probabilistic proofs are actually deployed; this is a whitepaper
- "Provably verifiable" implies mathematical proof — the embedding similarity fallback for non-deterministic tasks is explicitly NOT provable, it's probabilistic

**Defensible version of the claim:** "AIH proposes a novel architecture for economically-incentivized honest LLM execution, combining on-chain seed derivation, canonical runtime dispute resolution, and optimistic execution with funded fraud proofs. For deterministic services, verification is exact. For LLM inference, verification is economic rather than mathematical."

That's less sexy but accurate.

---

## 8. Recommendations (Prioritized)

### P0: Fix Before Building

1. **Fix the R10 register overflow** — pack verification_tier and privacy_tier into R9 as a tuple. Audit ALL box designs against Ergo's 6-register limit.

2. **Fix the BondBox guard** — replace data-input scanning with a counter-box pattern (or similar eUTXO-compatible approach for tracking active tasks).

3. **Drop the bisection protocol from Phase 1-4** — it's not feasible today. Keep it as a "Phase 5: When Ready" aspiration alongside ZK-ML. The system works fine without it via the economic deterrence layers.

### P1: Fix Before Phase 2

4. **Benchmark embedding similarity thresholds** — run actual experiments across task types. Publish the ROC curves. Pick thresholds per-task-type, not globally.

5. **Solve the NodeStatusBox bottleneck** — design a scalable approach for tracking node state in eUTXO (sharded status boxes, or compute-on-read from receipt history).

6. **Reduce box types to 7-8 for MVP** — merge InsurancePool into a simpler fee mechanism, defer CanaryTaskBox and PinningBox.

### P2: Fix Before Phase 3

7. **Design canary bootstrap mechanism** — how do canaries work with < 20 nodes? Consider a trusted-bootstrapper model that transitions to committee.

8. **Address the canonical runtime governance problem** — define who publishes, who updates, and how disputes about the runtime itself are handled. Consider a DAO or multisig.

### P3: Nice to Have

9. **Add formal game-theoretic analysis** — the current "math" is back-of-envelope. For a system handling real money, model it properly (Nash equilibria, not just expected value).

10. **Threat model nation-state attacks explicitly** — the current attack analysis focuses on rational economic actors. A state actor who wants to discredit the network has different incentives.

11. **Consider the Verifier's Dilemma** — Truebit's biggest unsolved problem. If fraud is rare, verifiers stop checking (no rewards). If verifiers stop, fraud becomes profitable. The "forced error" mechanism is mentioned but not fully designed.

---

## Appendix: Attack Vectors Not Addressed

1. **Eclipse attacks on P2P layer** — if an attacker controls the nodes a client connects to, they can intercept tasks and return garbage while appearing legitimate on-chain.

2. **Time-bandit attacks** — Ergo has relatively low hashrate. A sufficiently motivated attacker could reorg blocks to undo slashing transactions. Not unique to this system but worth noting.

3. **Canary oracle attack** — if the embedding model used for similarity checking (all-MiniLM-L6-v2) has adversarial examples, a node could craft outputs that score high on similarity but are semantically wrong. Adversarial attacks on embedding models are well-documented.

4. **Lazy verification attack** — a "verifier" claims the bounty by simply copying the node's claimed output hash without re-executing. The system assumes verifiers actually re-execute, but there's no proof-of-computation for the verification itself. This is the Verifier's Dilemma.

5. **Slow-drain attack** — a node provides 95% quality (slightly quantized model) forever. Never fails a canary because the output is "close enough." Over thousands of tasks, clients collectively lose value but no individual task triggers detection. The 0.85 threshold specifically enables this.

---

*End of audit. The bones are good. The muscles need work. Ship Phase 1, learn, iterate.*
