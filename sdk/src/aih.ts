// ============================================================================
// AgenticAiHome SDK — Main Client
// ============================================================================

import { AIHConfig, PostTaskParams, TaskBox, ReceiptBox, RatingBox } from './types';
import { ExplorerClient } from './utils/explorer';
import { WalletClient } from './utils/wallet';
import { buildTaskBoxTx, parseTaskBox } from './boxes/task-box';
import { pollForReceipt, findReceiptByTaskId } from './boxes/receipt-box';
import { buildRatingCommitTx, buildRatingRevealTx } from './boxes/rating-box';
import {
  EXPLORER_API_MAINNET,
  EXPLORER_API_TESTNET,
  CONTRACT_ADDRESSES,
  DEFAULT_TX_FEE,
} from './constants';

/**
 * AgenticAiHome SDK client.
 * Provides methods for AI agents to interact with the AIH marketplace on Ergo.
 *
 * @example
 * ```ts
 * const aih = new AIH();
 * await aih.connectWallet();
 *
 * const { taskId } = await aih.postTask({
 *   serviceHash: 'image-classification-v1',
 *   input: 'base64-encoded-image-data',
 *   paymentNanoErg: 100_000_000n,
 *   deadlineBlock: 1_200_000,
 * });
 *
 * const receipt = await aih.pollReceipt(taskId);
 * ```
 */
export class AIH {
  readonly explorer: ExplorerClient;
  readonly wallet: WalletClient;
  private txFee: bigint;

  constructor(config: AIHConfig = {}) {
    const baseUrl =
      config.explorerUrl ??
      (config.network === 'testnet' ? EXPLORER_API_TESTNET : EXPLORER_API_MAINNET);
    this.explorer = new ExplorerClient(baseUrl);
    this.wallet = new WalletClient();
    this.txFee = config.txFee ?? DEFAULT_TX_FEE;
  }

  /**
   * Connect to the Nautilus wallet. Required before any on-chain operations.
   */
  async connectWallet(): Promise<void> {
    await this.wallet.connect();
  }

  /**
   * Post a new task to the AIH marketplace.
   * Creates a TaskBox on-chain locking payment with service hash and deadline.
   *
   * @param params - Task parameters (service hash, input, payment, deadline)
   * @returns taskId (the TaskBox boxId), salt used for input commitment, and txId
   */
  async postTask(params: PostTaskParams): Promise<{ taskId: string; salt: Uint8Array; txId: string }> {
    const currentHeight = await this.explorer.getCurrentHeight();
    const inputs = await this.wallet.getUtxos(params.paymentNanoErg.toString());
    const changeAddress = await this.wallet.getChangeAddress();

    const { tx, salt } = buildTaskBoxTx(params, inputs, changeAddress, currentHeight);

    const txId = await this.wallet.signAndSubmit(tx);

    // TaskBox is the first non-change output (index 0)
    const taskId = tx.outputs[0]
      ? computeBoxId(txId, 0)
      : txId; // fallback

    return { taskId, salt, txId };
  }

  /**
   * Poll the blockchain for a ReceiptBox matching a task ID.
   * Checks periodically until found or max attempts reached.
   *
   * @param taskId - The TaskBox boxId to look for
   * @param maxAttempts - Maximum polling attempts (default 30)
   * @param intervalMs - Milliseconds between polls (default 10000)
   * @returns The matching ReceiptBox, or null if not found
   */
  async pollReceipt(
    taskId: string,
    maxAttempts?: number,
    intervalMs?: number
  ): Promise<ReceiptBox | null> {
    return pollForReceipt(this.explorer, taskId, maxAttempts, intervalMs);
  }

  /**
   * Submit a rating for a completed task (commit phase).
   * Creates a RatingBox with H(rating || salt).
   *
   * @param taskId - The task being rated
   * @param rating - Rating value (1-5)
   * @param salt - Optional salt (random if omitted)
   * @returns txId, salt, and commitment
   */
  async rate(
    taskId: string,
    rating: number,
    salt?: Uint8Array
  ): Promise<{ txId: string; salt: Uint8Array; commitment: Uint8Array }> {
    const currentHeight = await this.explorer.getCurrentHeight();
    const inputs = await this.wallet.getUtxos();
    const changeAddress = await this.wallet.getChangeAddress();
    const addresses = await this.wallet.getUsedAddresses();
    const raterPk = addresses[0]; // Use first address as rater identity

    const { tx, salt: actualSalt, commitment } = buildRatingCommitTx(
      taskId,
      rating,
      salt,
      raterPk,
      inputs,
      changeAddress,
      currentHeight
    );

    const txId = await this.wallet.signAndSubmit(tx);
    return { txId, salt: actualSalt, commitment };
  }

  /**
   * Claim a refund for a task whose deadline has passed with no receipt.
   * Spends the TaskBox back to the client's wallet.
   *
   * @param taskId - The TaskBox boxId to refund
   * @returns Transaction ID of the refund
   */
  async claimRefund(taskId: string): Promise<string> {
    const currentHeight = await this.explorer.getCurrentHeight();
    const changeAddress = await this.wallet.getChangeAddress();

    // Fetch the TaskBox
    const taskBoxRaw = await this.explorer.getBox(taskId);
    if (!taskBoxRaw) throw new Error(`TaskBox ${taskId} not found`);
    if (taskBoxRaw.spentTransactionId) throw new Error(`TaskBox ${taskId} already spent`);

    const taskBox = parseTaskBox(taskBoxRaw);
    if (currentHeight <= taskBox.deadlineBlock) {
      throw new Error(
        `Deadline not reached. Current height: ${currentHeight}, deadline: ${taskBox.deadlineBlock}`
      );
    }

    // Check no receipt exists
    const receipt = await findReceiptByTaskId(this.explorer, taskId);
    if (receipt) throw new Error(`Receipt already exists for task ${taskId}`);

    // Get additional UTXOs for tx fee
    const feeInputs = await this.wallet.getUtxos(this.txFee.toString());

    // Build refund: spend TaskBox + fee inputs, send everything to change address
    const { TransactionBuilder, OutputBuilder } = await import('@fleet-sdk/core');

    const taskInput = {
      boxId: taskBoxRaw.boxId,
      transactionId: taskBoxRaw.transactionId,
      index: 0,
      ergoTree: taskBoxRaw.ergoTree,
      creationHeight: taskBoxRaw.creationHeight,
      value: taskBoxRaw.value.toString(),
      assets: taskBoxRaw.assets.map((a) => ({
        tokenId: a.tokenId,
        amount: a.amount.toString(),
      })),
      additionalRegisters: Object.fromEntries(
        Object.entries(taskBoxRaw.additionalRegisters).map(([k, v]) => [k, v.serializedValue])
      ),
      extension: {},
    };

    const refundValue =
      BigInt(taskBoxRaw.value) + sumInputValues(feeInputs) - this.txFee;

    const refundOutput = new OutputBuilder(refundValue.toString(), changeAddress);

    // Add any tokens from TaskBox
    for (const asset of taskBoxRaw.assets) {
      refundOutput.addTokens({
        tokenId: asset.tokenId,
        amount: asset.amount.toString(),
      });
    }

    const tx = new TransactionBuilder(currentHeight)
      .from([taskInput, ...feeInputs])
      .to([refundOutput])
      .sendChangeTo(changeAddress)
      .payFee(this.txFee.toString())
      .build()
      .toEIP12Object();

    return this.wallet.signAndSubmit(tx);
  }

  /**
   * Discover available TaskBoxes on the marketplace.
   * Optionally filter by service hash.
   *
   * @param serviceHash - Optional service identifier to filter by
   * @returns Array of available TaskBoxes
   */
  async discover(serviceHash?: string): Promise<TaskBox[]> {
    const result = await this.explorer.getUnspentBoxesByAddress(
      CONTRACT_ADDRESSES.taskBox
    );

    let tasks = result.items.map(parseTaskBox);

    if (serviceHash) {
      const { blake2b256, stringToBytes, bytesToHex } = await import('./utils/crypto');
      const targetHash = bytesToHex(blake2b256(stringToBytes(serviceHash)));
      tasks = tasks.filter((t) => bytesToHex(t.serviceHash) === targetHash);
    }

    return tasks;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute a box ID from transaction ID and output index.
 * In Ergo, boxId = blake2b256(tx_id || output_index_as_short).
 *
 * NOTE: This is a placeholder. In practice, the box ID is returned by the
 * Explorer API after the transaction is confirmed. Use explorer.getTransaction(txId)
 * to get the actual output box IDs after submission.
 */
function computeBoxId(txId: string, index: number): string {
  return `${txId}_${index}`;
}

function sumInputValues(inputs: { value: string }[]): bigint {
  return inputs.reduce((sum, input) => sum + BigInt(input.value), 0n);
}
