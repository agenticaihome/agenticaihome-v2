# AIH × Celaut Integration Spec

*How AIH concepts map to Celaut's existing codebase. Written against `celaut-nodo` source.*

---

## 1. Architecture Boundary

AIH owns: task discovery, escrow, reputation, ratings.
Celaut owns: service execution, node networking, resource management, load balancing.

The integration surface is narrow:

```
AIH (Ergo chain)              Celaut (P2P network)
─────────────────              ────────────────────
TaskEscrowBox created    →     Node sees task, calls Gateway.StartService()
Service executes         →     Node gets output from container
ReceiptBox published     ←     Node submits execution proof to chain
Payment released         ←     ErgoScript validates receipt, releases ERG
Both parties rate        →     RatingBox commit-reveal on chain
```

---

## 2. Concept Mapping

| AIH Concept | Celaut Equivalent | Location in Celaut |
|---|---|---|
| Service hash | `Metadata.HashTag.Hash` | `celaut.proto` line ~73 |
| Task posting | Client calls `Gateway.StartService()` | `celaut.proto` Gateway service |
| Node selection | `execution_balancer/` + `estimated_cost_sorter/` | `src/balancers/` |
| Service execution | `local_execution()` or `delegate_execution()` | `src/gateway/launcher/` |
| Payment | `process_payment()` → deposit token → `Payable()` RPC | `src/payment_system/` |
| Reputation | `reputation_proof.es` + `interface.py` | `src/reputation_system/` |
| Gas metering | `GasAmount` protobuf, per-client gas tracking | `celaut.proto`, `manager.py` |

---

## 3. Payment System Integration

### Current Celaut Payment Flow

```
1. Node A wants to run a service on Node B
2. Node A calls B.GenerateDepositToken(client_id) → deposit_token
3. Node A sends ERG to B's auxiliary wallet with deposit_token in R4
4. Node A calls B.Payable(deposit_token, contract, gas_amount)
5. Node B validates: checks unspent box with matching R4 token + correct amount
6. Node B credits gas to client_id's local balance
7. Client spends gas as services execute
```

Source: `src/payment_system/payment_process.py` → `__peer_payment_process()` → `ergo/interface.py` → `process_payment()`

### What AIH Changes

Celaut's current payment is a **simple transfer** — ERG moves from Node A's wallet to Node B's wallet address, validated by checking R4 deposit tokens. There's no escrow. Payment happens before execution.

AIH replaces this with **receipt-gated escrow**:

```
1. Client creates TaskEscrowBox on-chain (ERG locked, service_hash in R4)
2. Node claims task (BondBox counter incremented)
3. Node executes via Celaut (StartService → container → output)
4. Node publishes ReceiptBox on-chain (output_hash, exec_params, node_sig)
5. ErgoScript releases payment: requires ReceiptBox in same TX as spend
6. Both rate via RatingBox commit-reveal
```

### Integration Point

The change is in `src/payment_system/contracts/ergo/interface.py`. Currently:

- `process_payment()` builds a simple send TX with deposit_token in R4
- `payment_process_validator()` checks for unspent box with matching R4

AIH version:

- `process_payment()` → creates a `TaskEscrowBox` with service_hash, input_commitment, payment, deadline
- `claim_task()` → new function, spends TaskEscrowBox + BondBox, creates claimed state
- `publish_receipt()` → new function, creates ReceiptBox with output_hash + node_sig
- `release_payment()` → spends TaskEscrowBox + ReceiptBox atomically, ERG goes to node
- `payment_process_validator()` → checks ReceiptBox exists and matches task

This plugs into the existing `AVAILABLE_PAYMENT_PROCESS` dictionary in `contracts/envs.py`. AIH escrow becomes another payment contract alongside the existing simple-send one. Nodes can support both.

```python
# contracts/envs.py — after integration
AVAILABLE_PAYMENT_PROCESS = {
    ergo.CONTRACT_HASH: ergo.process_payment,          # existing simple send
    aih_escrow.CONTRACT_HASH: aih_escrow.process_payment,  # receipt-gated escrow
}
```

---

## 4. Reputation System Integration

### Current Celaut Reputation

Source: `src/reputation_system/`

- **Local scoring**: each node tracks peer reputation in its own SQLite DB (`update_peer_reputation`, `update_container_reputation`)
- **On-chain proofs**: `reputation_proof.es` — an ErgoScript contract that manages reputation tokens (R4=type_nft_id, R5=object_data, R6=(isLocked, totalSupply), R7=owner_pk, R8=custom_flag, R9=data)
- **Submission**: `submit_reputation_proof()` creates on-chain TX distributing reputation tokens across proof boxes
- **Two paths**: admin path (owner-signed, can modify) and public top-up path (anyone adds ERG to prevent storage rent)
- **Status**: proof update is disabled (`"Not supported update reputation proofs"` — references GitHub issue #80)

### What AIH Adds

AIH's reputation model is **bilateral** and **task-weighted**:

1. **Commit-reveal rating**: both client and node submit `H(rating ‖ salt)` within N blocks, then reveal. Neither can adjust based on the other's score.
2. **Value-weighted**: a rating on a 10 ERG task counts more than on a 0.01 ERG task.
3. **Anti-gaming layers**: circular detection, diversity scoring, repeat-dampening, outlier-dampening.

### Integration Point

Celaut's `reputation_proof.es` contract already has the right structure — token-based reputation with owner-signed updates and R4-R9 registers. AIH doesn't replace it; AIH **feeds it**.

```
Task completes → RatingBox commit-reveal → scores finalized on-chain
                                         → Celaut node reads scores
                                         → Node calls update_peer_reputation()
                                         → Node calls submit_reputation_proof() with new data
```

The bridge: a function that reads finalized RatingBoxes from the Ergo explorer and converts them into `update_peer_reputation()` calls. This runs on the Celaut node as a periodic job alongside the existing `__manage_interfaces()` loop in `payment_process.py`.

Celaut's `compute_reputation()` currently only considers local observations. AIH on-chain ratings become a second input:

```python
def compute_reputation(peer_id) -> float:
    local_score = sc.get_reputation(peer_id)
    onchain_score = read_aih_ratings(peer_id)  # new: reads RatingBoxes from Explorer
    return weighted_combine(local_score, onchain_score)
```

---

## 5. Service Execution → Receipt Pipeline

### Current Execution Flow

Source: `src/gateway/launcher/local_execution/local_execution.py`

```
1. Gateway receives StartService(service_spec)
2. build.build(service, metadata, service_id) → Docker container built/cached
3. create_container(id, entrypoint) → container running
4. set_config() → writes __config__ file with gateway info, network resolution
5. Container executes, produces output on its API slots
6. Returns ServiceInstance(token, instance) to caller
```

For delegated execution (`delegate_execution.py`):
```
1. Node A calls Node B's Gateway.StartService() via gRPC
2. Node B runs locally (same flow as above)
3. Returns ServiceInstance to Node A
4. Node A stores delegated instance mapping (encrypted_external_token)
```

### What AIH Needs After Execution

Once Celaut finishes executing a service, AIH needs:

1. **output_hash** — `sha3_256(output_bytes)` — goes into ReceiptBox R6
2. **exec_params_hash** — `sha3_256(service_hash ‖ seed ‖ config)` — goes into ReceiptBox R7
3. **node_sig** — node signs `(task_id ‖ output_hash)` with its Ergo key — goes into ReceiptBox R8

### Integration Point

After `local_execution()` returns a `ServiceInstance`, a new step:

```python
# In the AIH payment flow (not in vanilla Celaut)
def post_execution_receipt(task_id, service_instance, output_bytes):
    output_hash = sha3_256(output_bytes).digest()
    exec_params = sha3_256(service_hash + seed + config_bytes).digest()
    node_sig = sign_with_ergo_key(task_id + output_hash)
    
    # Build and submit ReceiptBox TX on Ergo
    publish_receipt_box(
        task_id=task_id,
        input_commitment=original_input_commitment,
        output_hash=output_hash,
        exec_params_hash=exec_params,
        node_sig=node_sig,
        receipt_cid=store_full_receipt_on_p2p(...)
    )
```

This hooks into the `StopService()` flow — when a service completes and returns its output, the AIH module captures the output, builds the receipt, and publishes it before the gas accounting finalizes.

---

## 6. Task Discovery

### Current Celaut Discovery

Nodes discover each other via `IntroducePeer()` gRPC calls. Services are discovered by hash — if a node has the service binary cached (by `Metadata.HashTag.Hash`), it can execute it. If not, it fetches the spec from the requesting node via `GetService()`.

There is no concept of "browsing available tasks." Celaut is push-based: a client sends a service spec to a node and says "run this."

### What AIH Adds

AIH is pull-based: clients post tasks on-chain, nodes scan for tasks they can fulfill.

```
Client posts TaskEscrowBox → service_hash in R4, payment in value
Node monitors chain for TaskEscrowBoxes matching services it can run
Node claims task (weighted random selection among qualifying nodes)
```

### Integration Point

A new module on the Celaut node: **task scanner**. Runs as a thread alongside the existing `__manage_interfaces()` loop.

```python
def task_scanner():
    """Polls Ergo Explorer for unclaimed TaskEscrowBoxes matching our services."""
    while True:
        my_services = get_cached_service_hashes()  # from local Docker cache
        my_reputation = get_my_reputation_score()
        
        unclaimed_tasks = query_explorer_for_tasks(
            service_hashes=my_services,
            min_rep_threshold=my_reputation
        )
        
        for task in unclaimed_tasks:
            if should_claim(task):  # price check, capacity check
                claim_task(task)    # on-chain TX: spend TaskEscrowBox + BondBox
                execute_and_receipt(task)
        
        sleep(BLOCK_TIME)  # ~120 seconds
```

This doesn't change any existing Celaut code. It's an additive module that uses the existing `build.build()` + `local_execution()` pipeline internally.

---

## 7. What We Can Build Now (No Changes to Celaut Core)

| Component | Description | Depends on Josemi |
|---|---|---|
| `aih-ergo-contracts/` | Python module implementing TaskEscrowBox, ReceiptBox, BondBox, RatingBox TX builders using `ergpy` (same lib Celaut uses) | No |
| `aih-task-scanner/` | Thread module that polls Explorer for tasks matching local service hashes | No |
| `aih-receipt-publisher/` | Takes execution output → builds ReceiptBox TX → submits to chain | No |
| `aih-rating-bridge/` | Reads finalized RatingBoxes → feeds `update_peer_reputation()` | No |
| Integration into `contracts/envs.py` | Register AIH escrow as a payment process alongside existing simple-send | Yes — needs testing on a running node |
| Hook into `StopService()` flow | Capture output bytes for receipt hashing after execution completes | Yes — needs access to execution output |

---

## 8. Open Questions for Josemi

1. **Output capture**: After `local_execution()` finishes, is the service output accessible as bytes? Or does it stream directly to the client via `ServiceTunnel()`? We need the raw output to hash it for the ReceiptBox.

2. **Service hash stability**: `Metadata.HashTag.Hash` — is this the sha256 of the full `Service` protobuf? Or just the container filesystem? We need to match this exactly in TaskEscrowBox R4.

3. **Signing with node key**: Celaut has `Gateway.SignPublicKey()` RPC. Can we use this to sign receipt data (`task_id ‖ output_hash`) with the node's Ergo key? Or is the signing key separate from the wallet mnemonic?

4. **Gas → ERG conversion**: `GAS_PER_ERG` in config — is this the canonical pricing unit? AIH tasks are priced in ERG directly. We need to know if Celaut's gas abstraction maps 1:1 or if there's a conversion layer.

5. **Docker vs WASM**: Are services always Docker containers? Or is there a WASM path planned? This affects whether deterministic replay is feasible for verification.

6. **Reputation proof update**: Issue #80 blocks `submit_reputation_proof()` updates. Is this a priority? AIH's rating system generates new reputation data after every task — it needs to be writable.

---

## 9. Proposed File Structure

```
celaut-nodo/
  src/
    payment_system/
      contracts/
        ergo/
          interface.py          ← existing simple-send
        aih/                    ← NEW: receipt-gated escrow
          interface.py          ← TaskEscrowBox, ReceiptBox, BondBox builders
          contracts.es          ← ErgoScript guards (compiled to P2S)
          constants.py          ← contract addresses, fee %, tier thresholds
      contracts/envs.py         ← register aih.CONTRACT_HASH
    reputation_system/
      aih_bridge.py             ← NEW: reads RatingBoxes, feeds update_peer_reputation()
    aih/                        ← NEW: AIH-specific modules
      task_scanner.py           ← polls Explorer for tasks
      receipt_publisher.py      ← builds + submits ReceiptBox
      rating.py                 ← commit-reveal rating logic
```

This adds to Celaut without modifying existing files (except one line in `envs.py` to register the new payment process).

---

*Written against: celaut-nodo @ current main, celaut-paradigm, celaut-libraries, celaut-docs. All code references verified against source.*
