# Verification System — Executive Summary
## AgenticAiHome × Celaut

*For Josemi. February 2026. Post-audit revision.*

---

## The Problem

When a client pays ERG for AI compute, how do we know the node actually did the work? Without verification, nodes can take payment and deliver nothing, run cheaper models, or return garbage.

## The Honest Answer

**We can't cryptographically prove that an LLM produced a specific output.** Not today. ZK-ML is years away for large models. Bisection protocols for autoregressive inference have unsolved engineering challenges (KV-cache hashing alone makes them impractical for 7B+ models — see the full design doc's Future Research section).

**What we CAN do:** Make fraud unprofitable. The same way insurance fraud is rare — not because it's impossible, but because the expected cost exceeds the expected gain.

## The Solution: Layered Economic Deterrence

Everything runs on Ergo + Celaut P2P. No backends.

### Layer 1: Receipt-Gated Payment (Phase 1)
The node literally cannot claim payment without publishing an execution receipt on-chain. ErgoScript guard requires a ReceiptBox in the same transaction. No receipt = ERG returns to client. **This alone eliminates the take-and-run attack.**

### Layer 2: Input Commitment (Phase 1)
Client commits `H(input || salt)` before the node sees the task. Node can't fake what input was used.

### Layer 3: Node Bonding with Active Task Counter (Phase 2)
Nodes lock ERG proportional to max task value they can claim. The BondBox tracks `active_task_count` on-chain — incremented when claiming a task, decremented on completion. Withdrawal requires count = 0 AND cooldown. **This is enforced by ErgoScript, not data-input scanning** (which would be bypassable).

A 10 ERG bond with a 5% canary detection rate means cheating costs 0.5 ERG in expectation per task. The math never favors cheating.

### Layer 4: Canary Tasks (Phase 3)
The network injects fake tasks (5% rate) with known-correct answers. Nodes never know which tasks are canaries. Fail one = reputation hit + bond slash risk. Funded by insurance pool (0.5% of all task fees).

⚠️ Bootstrap problem: canaries don't work well with < 20 nodes. We're honest about this — early-network security is weaker.

### Layer 5: Embedding Similarity (Phase 3)
For non-deterministic AI tasks, we measure semantic equivalence via cosine similarity of output embeddings. ⚠️ The 0.85 threshold is a starting point, not empirically validated. Per-task-type calibration is needed. Real benchmarking is Phase 3 work.

### Layer 6: Tiered Verification by Task Value (Phase 3)
- **Micro** (< 0.1 ERG): Optimistic + canaries. ~0% overhead.
- **Medium** (0.1-5 ERG): + commitments + bounties. ~2.5% overhead.
- **High** (5-50 ERG): Dual execution + comparison. ~100% overhead.
- **Critical** (50+ ERG): Triple execution + panel review. ~200% overhead.

### Layer 7: Schelling Point Panels (Phase 4)
For disputes: randomly selected panel of 3-7 bonded reviewers vote independently (commit-reveal). Same mechanism as Kleros.

## On-Chain Architecture

**7 box types for MVP** (down from 13 in the previous design):
- **TaskEscrowBox** — payment + input commitment + verification tier
- **ReceiptBox** — execution proof (required for payment)
- **FailureReceiptBox** — legitimate failure reporting
- **BondBox** — node collateral with active task counter
- **RatingBox** — commit-reveal bilateral rating
- **VerificationBountyBox** — claimable by verifiers
- **NodeStatusBox** — completion/failure tracking

All boxes use registers R4-R9 only (the previous design had an R10 which doesn't exist on Ergo). Privacy tier and verification tier are packed into R9 on TaskEscrowBox.

**On-chain per task: ~238 bytes.** Happy-path overhead: 2.5%.

## What's New vs. Previous Design

**The real innovation:** Making fraud unprofitable via layered economic deterrence on Ergo's eUTXO model. Not cryptographic LLM verification.

**Specifically:**
- Counter-box pattern on BondBox (previous data-input guard was bypassable)
- 7 box types instead of 13 (buildable by a 2-person team)
- Bisection protocol moved to Future Research (honest about infeasibility)
- All register overflows fixed (R10 → packed R9)
- Honest caveats on embedding thresholds, canary bootstrap, timeline

## Compatibility with Your Gas Model

Your flow is preserved:
```
Client locks ERG → node claims → node executes → both rate
```
We add one requirement: the claiming transaction must include a receipt. Rating happens after a verification window (100 blocks). Node still gets paid promptly.

## Timeline: 30-38 Weeks (Honest)

| Phase | Weeks | What |
|-------|-------|------|
| 1: MVP | 1-6 | Receipt-gated payment, input commitments, failure receipts |
| 2: Economic Security | 7-14 | Bonding, bounties, reputation tiers, rating |
| 3: Active Verification | 15-24 | Canaries, embedding similarity, tiered verification |
| 4: Disputes & Polish | 25-34 | Schelling panels, privacy tiers, appeals |
| 5: Advanced | When ready | WASM replay, ZK-ML (future research) |

**Strong recommendation:** Build Phase 1, deploy it, learn from it, THEN refine Phase 2. The lessons from Phase 1 will invalidate assumptions in Phase 3+.

## Open Design Questions (Unsolved)

We're flagging these honestly rather than pretending they're solved:

1. **Canonical runtime governance.** If we ever implement WASM replay, who decides which binary is canonical? Options: (a) you/Celaut define it (pragmatic, centralized), (b) DAO vote (decentralized, slow), (c) market-driven convergence. No answer yet.

2. **Canary bootstrap.** How do canaries work with 3 nodes? Committee model fails at small scale.

3. **Verifier's Dilemma.** If fraud is rare, verifiers stop checking, then fraud becomes profitable. Partially addressed by forced verification, not fully designed.

4. **Embedding threshold calibration.** The 0.85 number is a guess. Needs empirical benchmarking across task types.

## The Math

```
Expected gain from cheating = task_payment × P(not_caught)
Expected loss from cheating = bond × P(caught) + reputation_cost

With bond = 10 ERG, canary rate = 5%, reputation = months of work:
Expected loss per cheat ≈ 0.5 ERG + reputation

For any task where payment < expected loss: honest behavior is dominant strategy.
```

## What We DON'T Claim

- ~~"First verifiable LLM execution on any blockchain"~~ → We offer **economically-incentivized honest execution**, not cryptographic proof
- ~~"5-10% overhead for state commitments"~~ → Bisection protocol KV-cache hashing is orders of magnitude more expensive than claimed. Moved to future research.
- ~~"Working today with existing primitives"~~ → The economic deterrence layers work today. The deterministic verification layers are research.

## What We DO Claim

AIH proposes a novel architecture for **economically-incentivized honest AI execution** on Ergo, combining:
- Receipt-gated escrow payments
- Bond-backed node accountability with on-chain task counting
- Canary-based probabilistic quality assurance
- Tiered verification matched to task value

The innovation is making fraud unprofitable via layered economic deterrence — fully decentralized, no backends, buildable by two people in 30-38 weeks.

---

*Full technical details: [VERIFICATION_DESIGN.md](./VERIFICATION_DESIGN.md)*  
*Audit findings: [AUDIT_REPORT.md](./AUDIT_REPORT.md)*  
*Game theory analysis: [GAME_THEORY.md](./GAME_THEORY.md)*
