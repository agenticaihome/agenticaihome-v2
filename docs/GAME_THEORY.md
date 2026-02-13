# Game Theory & Anti-Gaming Design
## AgenticAiHome × Celaut — Attack Analysis & Solutions

*"We need to keep studying these scenarios before focusing on contracts or UI"* — Josemi

---

## The System

**Actors:** Client (pays ERG, requests service), Node (executes service, earns ERG)

**Josemi's Proposed Flow:**
1. Client locks X ERG in contract: execute service S, min reputation R, deadline block T
2. After block T, node with highest reputation (≥ R) can claim X ERG
3. Node is expected to execute service S correctly
4. Both parties rate each other afterward

**Core tension:** The node gets paid *before* execution is verified. Reputation is the only enforcement mechanism.

---

## Attack Vectors

### Client-Side Attacks

#### A1: Dishonest Client (Free Service)
**Attack:** Client receives valid execution, rates it invalid anyway. Gets service for free while damaging node reputation.

**Why it matters:** This is the #1 attack Josemi identified. If clients can lie with no cost, no rational node would participate.

**Solutions:**
- **Commit-reveal ratings:** Both parties submit encrypted rating hashes simultaneously, then reveal. Neither can adjust based on the other's rating. Prevents retaliatory/strategic rating.
- **Bilateral reputation cost:** Rating a node negatively also costs the client reputation points (small amount). A pattern of negative ratings makes the client suspicious. High-reputation nodes refuse low-rep clients.
- **Stake-to-rate-negative:** To submit a negative rating, the client must stake Y ERG. If the node disputes and community consensus sides with the node, the client loses the stake. Makes false negatives expensive.
- **Reputation ratio tracking:** Track each client's negative-to-positive rating ratio. Clients who rate negatively more than 2 standard deviations above the network average get flagged and their ratings carry less weight.

#### A2: Sybil Clients
**Attack:** Client creates multiple wallets to spread negative ratings across a node's history, making it look like multiple unhappy clients.

**Solutions:**
- **Minimum reputation to post tasks:** New wallets can't immediately request services. They need to build minimum client reputation first (perhaps by being a node, or by completing small verified interactions).
- **Diversity-weighted ratings:** The system already detects when ratings come from wallets that interact suspiciously (same funding source, similar timing patterns). These get dampened.
- **Cost of entry:** Each wallet needs minimum ERG to participate. Sybil attacks become expensive.

#### A3: Underpaying (Resource Waste)
**Attack:** Client sets X ERG far below the actual cost of executing service S, wasting node compute resources when they realize it's not worth claiming.

**Solutions:**
- **Market pricing oracle:** Track historical execution costs per service hash. Warn nodes (or auto-reject) when payment is significantly below historical average.
- **Nodes choose:** Nodes aren't forced to claim. If payment is too low, no node claims, and ERG returns to client after deadline. Market self-corrects.

#### A4: Targeted Node Attack
**Attack:** Client sets very high min reputation R to ensure only one specific node can claim, then rates that node negatively.

**Solutions:**
- **Randomized selection:** Among all qualifying nodes (rep ≥ R), don't always pick the highest. Use weighted random selection based on reputation scores. Harder to target specific nodes.
- **Reputation above R is private:** Don't reveal exact reputation scores publicly. Only reveal "qualified" or "not qualified" relative to R. Nodes can't be precisely targeted.

---

### Node-Side Attacks

#### B1: Claim and Run (Take ERG, Don't Execute)
**Attack:** Node claims ERG and never executes the service. Accepts reputation damage as cost of doing business.

**Why it matters:** This only works if the ERG gained > reputation lost. The system must make reputation more valuable than any single task payment.

**Solutions:**
- **Reputation-gated task value:** Your max claimable task value = f(your reputation). A node with 100 reputation can only claim tasks up to Y ERG. To claim big tasks, you need big reputation. Cheating on a big task destroys years of reputation building.
- **Exponential reputation cost:** Losing reputation is exponentially more expensive to rebuild than it was to earn. Cheat once = months of recovery. Makes the math clearly unfavorable.
- **Reputation as collateral:** Reputation score translates to a maximum ERG-at-risk. If you cheat, your score drops, immediately reducing your earning capacity across ALL future tasks.
- **Probationary period for new nodes:** New nodes can only claim micro-tasks. Gradually unlock higher values as reputation grows. No shortcut to high-value tasks.

#### B2: Partial/Poor Execution
**Attack:** Node executes service poorly (e.g., runs a cheaper model than promised) but claims it completed correctly.

**Solutions:**
- **Deterministic verification:** For deterministic services (same input → same output), anyone can re-execute and compare. If output differs, node is penalized. This is Celaut's strength — deterministic execution.
- **Cross-validation (for non-deterministic services):** Randomly assign the same task to 2-3 nodes independently. Compare outputs. Significant divergence flags the outlier. Nodes don't know when they're being cross-validated.
- **Resource commitment proofs:** Nodes must prove they committed the claimed resources (CPU time, GPU memory, etc.). Celaut's architecture already tracks resource allocation.

#### B3: Sybil Nodes
**Attack:** Create many low-reputation nodes to game the selection algorithm or perform coordinated attacks.

**Solutions:**
- **Minimum stake to register:** Nodes must lock minimum ERG to register. Makes mass node creation expensive.
- **Probationary gates:** New nodes start with strict limits. Takes genuine work to become useful. No instant reputation.
- **Graph analysis:** Detect node clusters (same funding source, synchronized behavior, mutual rating patterns). Flag and investigate.

#### B4: Reputation Laundering
**Attack:** Build reputation on many small, cheap tasks. Then cheat on one high-value task where the ERG gained exceeds the cost of reputation loss.

**This is the most sophisticated attack.**

**Solutions:**
- **Value-weighted reputation:** Reputation earned from a 0.01 ERG task contributes much less than from a 10 ERG task. You can't build "big task" reputation from many tiny tasks.
- **Task-value tiers:** Reputation has tiers. Completing tier-1 tasks (< 0.1 ERG) gives tier-1 reputation. To unlock tier-3 tasks (> 5 ERG), you need tier-3 reputation from successfully completing tier-2 tasks. No shortcuts.
- **Time-locked reputation vesting:** Reputation from completed tasks isn't fully available immediately. It vests over 100 blocks (~3 hours). During vesting, a dispute can claw it back. Prevents hit-and-run.

---

### System-Level Attacks

#### C1: Rating Rings
**Attack:** A rates B positively, B rates A positively. Both inflate each other's reputation.

**Solutions:**
- **Circular detection:** Already designed. Track rating graphs. When A→B and B→A patterns emerge, dampen both ratings progressively. Third iteration = zero weight.
- **Economic cost:** Each rating interaction requires real ERG to have been exchanged. You can't just rate each other — real tasks must be completed. Makes rating rings expensive.

#### C2: Market Manipulation
**Attack:** Nodes collude to set minimum prices, refuse to execute below certain thresholds.

**Solutions:**
- **Permissionless entry:** Anyone can run a node. Cartels can't prevent competition. If prices are inflated, new nodes undercut them.
- **Reputation doesn't require collusion:** Individual nodes succeed by being reliable, not by coordinating. Game theory favors defection from cartels.

#### C3: Griefing (Spam)
**Attack:** Flood the network with micro-tasks to waste node resources and congest the system.

**Solutions:**
- **Minimum task value:** Enforce minimum ERG per task (e.g., 0.01 ERG). Makes spam expensive.
- **Client reputation required:** Low-reputation clients have rate limits on task creation.
- **On-chain cost:** Every task is an Ergo transaction with fees. Spam costs real ERG.

---

## Novel Mechanisms

### 1. Commit-Reveal Bilateral Rating
Both parties submit `hash(rating + salt)` on-chain within N blocks of completion. Then both reveal. If either fails to reveal, the other's rating stands and the non-revealer gets a small penalty.

**Why it's powerful:** Eliminates strategic/retaliatory rating entirely. You rate based on reality, not on what you think the other party will say.

**Implementation:** Two-phase box pattern on Ergo. Phase 1: both submit hashed ratings to a rating box. Phase 2: both reveal within N blocks. Smart contract validates hash matches reveal.

### 2. Reputation Tiers with Progressive Unlocking
```
Tier 0 (New):      Max task value 0.01 ERG    | Can only claim micro-tasks
Tier 1 (Novice):   Max task value 0.1 ERG     | After 10 successful micro-tasks
Tier 2 (Skilled):  Max task value 1 ERG       | After 10 successful Tier 1 tasks
Tier 3 (Expert):   Max task value 10 ERG      | After 20 successful Tier 2 tasks
Tier 4 (Elite):    Max task value 100 ERG     | After 50 successful Tier 3 tasks
```

Each tier requires completing tasks at the *previous* tier. No amount of micro-task grinding unlocks elite tasks. The economic cost of cheating at Tier 4 = all the genuine work done at Tiers 0-3.

**Applied to clients too:** New clients can only post micro-tasks. High-value tasks require client reputation. Nodes trust high-rep clients because those clients have skin in the game.

### 3. Cross-Validation Sampling
For non-deterministic services (LLMs, creative work):
- 5% of tasks are secretly duplicated to a second node
- Outputs are compared algorithmically
- If outputs diverge significantly, both nodes are flagged for review
- Neither node knows when they're being sampled
- Funded by a small % of task fees (insurance pool)

For deterministic services (Celaut's strength):
- Any observer can re-execute and verify
- Output hash is published on-chain
- Mismatch = automatic reputation penalty

### 4. Insurance Pool
- 0.5% of all task payments go to an insurance pool
- If a node is cheated by a dishonest client (proven via commit-reveal mismatch + community vote), the pool compensates the node
- If a client is cheated by a dishonest node, the pool compensates the client
- Pool grows with network usage, providing increasing security
- Managed by a simple smart contract, not by any central authority

### 5. Reputation Decay with Activity Requirement
- Reputation slowly decays over time (1% per epoch) without activity
- Forces ongoing participation to maintain status
- Prevents building reputation and sitting on it forever
- Combined with tiers: inactive elite nodes gradually drop to expert, then skilled, etc.

---

## Josemi's Specific Concerns — Direct Answers

### "Why wouldn't the node just take the ERG and not execute?"
**Answer:** Because the reputation cost exceeds the ERG gained. With tiered reputation, a Tier 3 node (max 10 ERG tasks) invested months building up through Tiers 0-2. Cheating on one 10 ERG task destroys that investment and drops them back to Tier 1. The math never works in the cheater's favor.

### "What if the client dishonestly votes invalid?"
**Answer:** Commit-reveal bilateral rating + client reputation. The client must stake ERG to rate negatively. If their rating pattern is statistically anomalous (too many negatives), their ratings lose weight. High-rep nodes can refuse low-rep clients. The client's reputation is their skin in the game.

### "Should clients also have reputation?"
**Answer:** Absolutely yes. This is non-negotiable. Without client reputation, the system is asymmetric and nodes have no protection. Client reputation tracks: payment history, rating honesty (via commit-reveal analysis), dispute rate, and task completion rate.

---

## Implementation Priority

**Phase 1 (MVP — minimum viable protection):**
- Bilateral reputation (both nodes and clients)
- Reputation tiers with progressive unlocking
- Minimum task value enforcement
- Basic commit-reveal rating

**Phase 2 (Hardening):**
- Stake-to-rate-negative
- Reputation decay
- Cross-validation sampling for non-deterministic services
- Graph analysis for rating rings

**Phase 3 (Maturity):**
- Insurance pool
- Advanced sybil detection
- Automated dispute resolution
- Reputation portability across Ergo dApps via data inputs

---

## Open Questions for Josemi

1. In Celaut's deterministic execution model, can we get output hashes cheaply? If yes, verification is nearly free and most attacks become irrelevant.
2. How does Celaut handle service versioning? Same hash = same code forever? Or can services be updated?
3. What's the minimum viable node registration cost that prevents sybils without excluding genuine participants?
4. For the commit-reveal pattern on Ergo — do you see any eUTXO constraints that make this difficult?
5. Does Celaut already have resource commitment proofs? If nodes prove they allocated X GPU hours, that's a powerful anti-gaming signal.

---

*"We need to keep studying these scenarios before focusing on contracts or UI implementation"* — Josemi

This document is a living analysis. Every mechanism here needs to be stress-tested before implementation. The goal is not to prevent all attacks (impossible) — it's to make cheating consistently less profitable than honest participation.

**The fundamental principle:** At every decision point, the rational choice must be honest behavior. If the math works, the system works.
