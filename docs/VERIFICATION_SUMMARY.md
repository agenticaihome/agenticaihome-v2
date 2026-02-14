# Verification System — Executive Summary
## AgenticAiHome × Celaut

*For Josemi. February 2026.*

---

## The Problem

When a client pays ERG for AI compute, how do we know the node actually did the work? Without verification, nodes can take payment and deliver nothing, run cheaper models, or return garbage. Reputation alone is insufficient — we need cryptographic and economic guarantees.

## The Solution: Defense in Depth

We use **optimistic execution with funded fraud proofs.** Assume honesty by default, but make dishonesty detectable and expensive. No backends — everything runs on Ergo + IPFS + Celaut P2P.

### Layer 1: Receipt-Gated Payment (Phase 1)
The node cannot claim payment without publishing an execution receipt on-chain. The ErgoScript guard literally requires a ReceiptBox in the same transaction. No receipt = ERG returns to client. This alone eliminates the "take and run" attack.

### Layer 2: Commitment Chain (Phase 1-2)
- **Client commits input hash** before the node sees the task → node can't fake what input was used
- **Client commits received-output hash** before node publishes receipt → node can't send cheap output to client and expensive output to the receipt
- Both commitments are on-chain, immutable, and publicly verifiable

### Layer 3: Node Bonding (Phase 2)
Nodes lock ERG proportional to the maximum task value they can claim. Cheat = lose the bond. Works even without perfect verification — it's pure economic deterrent. A 10 ERG bond with a 5% chance of getting caught (via canaries) means cheating costs 0.5 ERG in expectation per task.

### Layer 4: Canary Tasks (Phase 3)
The network injects fake tasks (5% rate) with known-correct answers. Nodes never know which tasks are canaries. Fail a canary = instant reputation hit + bond slash. This provides continuous quality monitoring without verifying every task. Funded by the insurance pool (0.5% of all task fees).

### Layer 5: Embedding Similarity (Phase 3)
For non-deterministic AI tasks (LLMs with temperature > 0), we measure semantic equivalence using cosine similarity of output embeddings. Threshold: > 0.85 = functionally equivalent. Cost: ~$0.001 per check. This turns "bounded verification" from a vague concept into a concrete, measurable metric.

### Layer 6: Tiered Verification by Task Value (Phase 3)
- **Micro** (< 0.1 ERG): Optimistic + canaries. Near zero overhead.
- **Medium** (0.1-5 ERG): + commitment chain + bounties. ~2.5% overhead.
- **High** (5-50 ERG): Dual execution + embedding comparison. ~100% overhead.
- **Critical** (50+ ERG): Triple execution + deterministic replay if WASM available. ~200% overhead.

### Layer 7: Schelling Point Panels (Phase 4)
For disputes on non-deterministic tasks: randomly selected panel of 3-7 bonded reviewers vote independently (commit-reveal). Majority wins, minority loses stake. Appeals escalate to larger panels. Same mechanism as Kleros.

## Novel: The AIH Inference Verification Protocol

We believe we've found a way to make LLM inference **provably verifiable** by combining three existing primitives in a way nobody has before:

1. **Deterministic seed from blockchain** — `seed = H(block_header || task_id || input_hash)`. Every node makes the same sampling decisions. Eliminates ~90% of LLM non-determinism.
2. **Canonical WASM runtime** — a hash-identified inference binary that produces identical output on any hardware. Nodes run natively for speed, but if disputed, the canonical runtime is the source of truth.
3. **Bisection dispute protocol** — instead of re-running all N tokens, binary search for the single divergent token. Verify ONE step in the canonical runtime. Cost: O(log n) instead of O(n).

For a 1000-token response: ~10 hash comparisons + 1 token verification. Not 1000 forward passes. Happy path overhead: 5-10%. Dispute path: trivial.

**If this works, AIH is the first system to offer provably verifiable LLM execution on any blockchain.** Not reputation-based. Not "ZK someday." Working today.

**Key questions for you:** Does Celaut support state checkpointing during execution? Can containers expose intermediate state hashes? This determines how easy Component 3 is to implement.

## The Nuclear Option: WASM Determinism

**🔴 #1 question for you, Josemi:** If Celaut runs services in WebAssembly, even LLM inference becomes fully reproducible (same binary + same input = same output on ANY hardware). This would eliminate the non-determinism problem entirely — every task becomes a simple re-execute-and-compare verification game, like Truebit. Projects like EZKL and Modulus Labs are already doing this for ML inference.

If WASM is available, layers 5-7 become largely unnecessary. The entire system simplifies dramatically.

## On-Chain Architecture

13 box types total, all in eUTXO model. Key ones:
- **TaskEscrowBox** — client's payment + input commitment + verification tier
- **ReceiptBox** — node's execution proof (required for payment)
- **BondBox** — node's locked collateral (slashable)
- **InsurancePoolBox** — funds canaries + fraud compensation

On-chain footprint per task: ~238 bytes. Happy-path overhead: 2.5% of task value.

## Compatibility with Your Gas Model

Your flow is preserved:
```
Client locks ERG → node claims after deadline → node executes → both rate
```
We add one requirement: the claiming transaction must include a receipt. Rating happens after a verification window (100 blocks). The node still gets paid promptly — the window just allows retroactive fraud detection.

## Implementation: 5 Phases, 20 Weeks

1. **Weeks 1-4:** Receipt-gated payment + input commitments + failure receipts
2. **Weeks 5-8:** Node bonding + verification bounties + reputation tiers
3. **Weeks 9-14:** Canaries + embedding similarity + tiered verification
4. **Weeks 15-20:** Dispute panels + privacy tiers + model fingerprinting
5. **When ready:** WASM deterministic replay + ZK-ML integration

## Honest Limitations

- **Perfect privacy + perfect verifiability** is impossible today. ZK-ML is 2-3 years away for large models.
- **Subtle quality degradation** (quantized weights) is caught statistically over time, not per-task.
- **Panel corruption** is possible if an attacker bribes all randomly-selected members — but exponentially expensive with escalating panel sizes.
- **IPFS data may disappear.** On-chain hashes survive; original data availability is incentivized, not guaranteed.

## The Math

For cheating to be rational, the expected gain must exceed the expected loss:

```
Expected gain = task_payment × P(not_caught)
Expected loss = bond × P(caught) + reputation_cost

With bond = 10 ERG, canary rate = 5%, reputation cost = months of work:
Expected loss per cheat attempt ≈ 0.5 ERG + reputation
```

For any task where payment < expected loss, honest behavior is the dominant strategy. The system is designed so this holds for all realistic task values.

---

*Full technical details: [VERIFICATION_DESIGN.md](./VERIFICATION_DESIGN.md)*
