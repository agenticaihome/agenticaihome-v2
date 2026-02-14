// ============================================================================
// AgenticAiHome SDK — ReceiptBox Creation and Parsing
// ============================================================================

import { ExplorerBox, ReceiptBox } from '../types';
import { hexToBytes } from '../utils/crypto';
import { ExplorerClient } from '../utils/explorer';
import { CONTRACT_ADDRESSES } from '../constants';

/**
 * Parse an Explorer box into a typed ReceiptBox.
 * @param box - Raw box from Explorer API
 * @returns Parsed ReceiptBox
 */
export function parseReceiptBox(box: ExplorerBox): ReceiptBox {
  const regs = box.additionalRegisters;
  return {
    boxId: box.boxId,
    transactionId: box.transactionId,
    value: box.value.toString(),
    ergoTree: box.ergoTree,
    taskId: regs.R4?.renderedValue ?? '',
    outputHash: hexToBytes(regs.R5?.renderedValue ?? ''),
    nodePk: hexToBytes(regs.R6?.renderedValue ?? ''),
    executionBlock: parseInt(regs.R7?.renderedValue ?? '0', 10),
  };
}

/**
 * Poll the Explorer for a ReceiptBox matching a given task ID.
 * Checks unspent boxes at the ReceiptBox contract address and filters by R4.
 *
 * @param explorer - Explorer client instance
 * @param taskId - The TaskBox boxId to look for
 * @param maxAttempts - Maximum polling attempts (default 30)
 * @param intervalMs - Milliseconds between polls (default 10000)
 * @returns The matching ReceiptBox, or null if not found after max attempts
 */
export async function pollForReceipt(
  explorer: ExplorerClient,
  taskId: string,
  maxAttempts: number = 30,
  intervalMs: number = 10_000
): Promise<ReceiptBox | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const receipt = await findReceiptByTaskId(explorer, taskId);
    if (receipt) return receipt;

    if (attempt < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }
  return null;
}

/**
 * Single check for a ReceiptBox matching a task ID.
 * @param explorer - Explorer client instance
 * @param taskId - The TaskBox boxId
 * @returns ReceiptBox if found, null otherwise
 */
export async function findReceiptByTaskId(
  explorer: ExplorerClient,
  taskId: string
): Promise<ReceiptBox | null> {
  // Query unspent boxes at the ReceiptBox contract address
  const result = await explorer.getUnspentBoxesByAddress(CONTRACT_ADDRESSES.receiptBox);

  for (const box of result.items) {
    const renderedR4 = box.additionalRegisters.R4?.renderedValue;
    if (renderedR4 === taskId) {
      return parseReceiptBox(box);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
