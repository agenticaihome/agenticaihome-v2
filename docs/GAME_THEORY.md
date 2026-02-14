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

#### A1: Dishonest Client (Reputation Damage)
**Attack:** Client receives valid execution, rates it invalid anyway. The node already has the ERG (payment happens before execution in the gas model), so the client does NOT get service for free — but they CAN damage the node's reputation unfairly.

**Why it matters:** This is the #1 attack Josemi identified. If clients can lie with no cost, nodes face reputational erosion despite honest execution.

**Solutions:**
- **Verified-purchase ratings only:** Only clients who actually paid ERG for a service can rate it. Non-payers' opinions carry zero weight. Like online stores marking "verified purchase" on reviews — you can see who actually used the service vs. who's inventing complaints.
- **Commit-reveal ratings:** Both parties submit encrypted rating hashes simultaneously, then reveal. Neither can adjust based on the other's rating. Prevents retaliatory/strategic rating.
- **Bilateral reputation cost:** Rating a node negatively also costs the client reputation points (small amount). A pattern of negative ratings makes the client suspicious. High-reputation nodes refuse low-rep clients.
- **Execution receipts (reproducibility):** Node publishes a signed execution receipt: input hash, output hash, service hash, execution params. For deterministic services, ANYONE can re-execute and verify the node performed correctly. A dishonest client's negative rating can be publicly disproven. (See §Reproducibility below.)
- **Reputation ratio tracking:** Track each client's negative-to-positive rating ratio. Clients who rate negatively more than 2 standard deviations above the network average get flagged and their ratings carry less weight.

#### A2: Sybil Clients
**Attack:** Client creates multiple wallets to spread negative ratings across a node's history, making it look like multiple unhappy clients.

**Solutions:**
- **Verified-purchase filter:** You can see exactly which clients paid ERG for which services. Sybil wallets that never actually paid for a service simply can't rate it. "Simply ignore who is inventing things" — Josemi.
- **Minimum reputation to post tasks:** New wallets can't immediately request services. They need to build minimum client reputation first (perhaps by being a node, or by completing small verified interactions).
- **Diversity-weighted ratings:** The system already detects when ratings come from wallets that interact suspiciously (same funding source, similar timing patterns). These get dampened.
- **Cost of entry:** Each wallet needs minimum ERG to participate. Sybil attacks become expensive.

#### A3: Underpaying (Resource Waste)
**Attack:** Client sets X ERG far below the actual cost of executing service S, wasting node compute resources when they realize it's not worth claiming.

**Solutions:**
- **Node's responsibility:** This is fundamentally a node-side concern. Nodes should filter off-chain to only claim bids that are worth their resources. The cost of that filtering gets priced into their bids. (Josemi's point: "en este caso es problema del nodo.")
- **Market pricing oracle:** Track historical execution costs per service hash. Warn nodes (or auto-reject) when payment is significantly below historical average.
- **Nodes choose:** Nodes aren't forced to claim. If payment is too low, no node claims, and ERG returns to client after deadline. Market self-corrects.
- **Value proposition of AIH:** Running services node-to-node will always be cheaper. AIH's value is enabling DAOs, on-chain systems, and users who want trustless execution without running their own node.

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

## Reproducible Execution — Solving the Verification Problem

*"Hay que buscar una mecánica para que las tareas en AIH tengan una propiedad similar [to Game of Prompts], de forma que podamos ver que otras tareas que se le mandaron a los nodos fueron las correctas."* — Josemi

This is the hardest problem. Josemi's Game of Prompts solves it because games are deterministic: same seed → same game → same result. Anyone can replay and verify. We need the same property for AI services.

### The Two-Component Reputation Model (from GoP)

Reputation is NOT just a number. It has two components:

1. **On-chain stake:** ERG and tokens burned/sacrificed. Skin in the game. Expensive to fake.
2. **Off-chain verifiable history:** A complete, public log of every past interaction — inputs, outputs, ratings given. Anyone can inspect and reproduce.

A rater's reputation depends on BOTH. High ERG burned but a history of provably-wrong ratings = untrustworthy. The burned tokens are a shortcut for lazy observers; the full history is the real truth.

### How Verification Works on AIH

#### Tier 1: Deterministic Services (Celaut's Sweet Spot)
Services identified by content hash → same input ALWAYS produces same output.

**Mechanism:**
- Node publishes an **Execution Receipt** on-chain (or on a public append-only log):
  - `service_hash` — which service was run
  - `input_hash` — hash of the exact input
  - `output_hash` — hash of the exact output
  - `node_signature` — proves this node claims this execution
- **Anyone** can download the service (by hash), feed it the same input, and verify `output_hash` matches
- If a client rates a node negatively but the execution receipt checks out → the client is provably lying
- If a node claims execution but the output hash doesn't match → the node is provably lying

**This is nearly identical to GoP:** bot_id = service_hash, game_seed = input_hash, score = output_hash, logs = execution trace.

**Key insight:** For deterministic services, the verification cost is just "re-run the service." This is Celaut's architectural strength — services ARE deterministic containers.

#### Tier 2: Semi-Deterministic Services (Most AI Tasks)
Many AI tasks use LLMs which are inherently non-deterministic (temperature > 0, different hardware = different float rounding). Exact reproduction isn't always possible.

**Mechanism: Bounded Verification**
- Node publishes execution receipt WITH full execution log:
  - `input` (the actual prompt/request)
  - `output` (the actual response)
  - `model_id`, `parameters` (temperature, seed if available)
  - `resource_usage` (compute time, memory)
- Verification isn't "did you produce the EXACT same output?" but "given this input and these parameters, is this output REASONABLE?"
- **Challenge protocol:** If a client rates negatively, any third party can inspect the receipt:
  - Did the node use the right model? (Verifiable from logs)
  - Is the output quality consistent with the service spec? (Re-run with same params → similar quality)
  - Did the node actually spend the claimed resources? (Celaut resource proofs)
- **Statistical verification:** Over many tasks, a node's outputs form a distribution. A node that consistently delivers low-quality outputs (cheap model, truncated responses) will show a statistical signature that diverges from honest execution.

#### Tier 3: Non-Deterministic / Creative Services
For truly subjective outputs (creative writing, design), exact verification is impossible.

**Mechanism: Reputation-Weighted Panel Review**
- High-value non-deterministic tasks require **panel validation**: 2-3 independent high-reputation nodes review the output
- Panel members are randomly selected (can't be bribed in advance)
- Panel's assessment overrides bilateral ratings if there's a dispute
- Panel members stake reputation on their review — dishonest panel members get caught when THEIR past reviews are inspected (the GoP recursion: "I can check if Alice's past judgments were honest")

### Making It Concrete: The Execution Receipt Standard

**Zero backends. Zero databases. Zero servers.** The entire verification layer runs on Ergo + Celaut P2P. No central infrastructure to compromise or maintain.

Every task completion on AIH produces a public **Execution Receipt**:

```
ExecutionReceipt {
  task_id:        ErgoBoxId       // the original task box
  service_hash:   Hash            // content-addressed service identifier
  node_id:        Address         // executing node
  input_hash:     Hash            // H(input data)
  output_hash:    Hash            // H(output data)
  input_uri:      URI             // where to download full input (Celaut P2P)
  output_uri:     URI             // where to download full output (Celaut P2P)
  exec_params:    JSON            // model, temperature, seed, resource limits
  exec_log_uri:   URI             // optional: full execution trace
  timestamp:      Long            // block height at completion
  node_sig:       Signature       // node signs this receipt
}
```

**Storage — fully decentralized:**
- **On-chain (Ergo):** Compact receipt hash stored in the transaction's registers. Tiny, cheap, permanent, immutable.
- **Off-chain (Celaut P2P):** Full receipt data (inputs, outputs, logs) stored content-addressed. No server needed — data lives on the peer network. Content hash = built-in integrity check.
- **Verification:** Pure client-side. Anyone downloads the receipt from Celaut P2P, downloads the service by hash, re-executes with the same input, compares output hashes. No backend involved. Same way Bitcoin nodes independently validate blocks.

**No backend needed because:**
- Ergo blockchain IS the database (receipt hashes, reputation state, task boxes)
- Celaut P2P IS the file storage (receipt data, execution logs)
- Celaut P2P IS the compute layer (service execution, re-verification)
- Rating dampening is computed independently by each participant (like Bitcoin consensus)

Anyone can:
1. Download the service by `service_hash`
2. Download the input by `input_uri`
3. Re-execute and compare against `output_hash`
4. If mismatch → node lied. If match → client who rated negatively lied.

**Josemi's principle applies:** "Alice no querrá quemar tokens y despues subir algo que cualquiera puede ver que no es cierto." — Nobody wants to burn tokens and then post something anyone can disprove.

### Why This Solves All the Rating Problems

| Attack | How Receipt Solves It |
|--------|----------------------|
| Client rates valid work as invalid | Receipt proves work was done correctly. Client's negative rating is publicly disprovable. |
| Node claims execution but didn't do it | No receipt, or receipt with wrong output hash. Provably caught. |
| Node uses cheaper model than promised | exec_params show model used. Anyone can re-run and compare quality. |
| Sybil clients mass-downvote | Their ratings conflict with verifiable receipts. Auto-dampened. |
| Reputation laundering | Full history of receipts is public. Quality at each tier is verifiable. |

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

1. ~~In Celaut's deterministic execution model, can we get output hashes cheaply?~~ **ANSWERED: Yes — Execution Receipts solve this. Output hashes published on-chain/Celaut P2P.**
2. How does Celaut handle service versioning? Same hash = same code forever? Or can services be updated? *(Still open — affects receipt verification)*
3. What's the minimum viable node registration cost that prevents sybils without excluding genuine participants?
4. For the commit-reveal pattern on Ergo — do you see any eUTXO constraints that make this difficult?
5. Does Celaut already have resource commitment proofs? If nodes prove they allocated X GPU hours, that's a powerful anti-gaming signal.
6. **NEW:** For the Execution Receipt standard — does Celaut already produce execution logs/traces that we can use? Or do we need to build that layer?
7. **NEW:** For semi-deterministic services (LLMs), what level of "bounded verification" does Josemi think is practical? Exact output match vs. statistical quality check?
8. **NEW:** Storage for receipts — Celaut P2P or Ergo extension blocks?

---

*"We need to keep studying these scenarios before focusing on contracts or UI implementation"* — Josemi

This document is a living analysis. Every mechanism here needs to be stress-tested before implementation. The goal is not to prevent all attacks (impossible) — it's to make cheating consistently less profitable than honest participation.

**The fundamental principle:** At every decision point, the rational choice must be honest behavior. If the math works, the system works.
