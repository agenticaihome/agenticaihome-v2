// ============================================================================
// AgenticAiHome SDK — RatingBox Commit-Reveal
// ============================================================================

import { TransactionBuilder, OutputBuilder, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';
import { RatingBox, ExplorerBox, EIP12UnsignedInput } from '../types';
import { CONTRACT_ADDRESSES, DEFAULT_TX_FEE } from '../constants';
import {
  createRatingCommitment,
  randomBytes,
  hexToBytes,
  bytesToHex,
} from '../utils/crypto';

/**
 * Build a commit transaction for rating (phase 1).
 * Creates a RatingBox with H(rating || salt) in R5.
 *
 * @param taskId - The TaskBox ID being rated
 * @param rating - Rating value (1-5)
 * @param salt - Salt for commitment (random if omitted)
 * @param raterPk - Rater's public key hex
 * @param inputs - Wallet UTXOs
 * @param changeAddress - Change address
 * @param currentHeight - Current blockchain height
 * @returns Unsigned transaction, salt, and commitment
 */
export function buildRatingCommitTx(
  taskId: string,
  rating: number,
  salt: Uint8Array | undefined,
  raterPk: string,
  inputs: EIP12UnsignedInput[],
  changeAddress: string,
  currentHeight: number
) {
  const actualSalt = salt ?? randomBytes(32);
  const commitment = createRatingCommitment(rating, actualSalt);

  const phase1Encoded = '04' + encodeZigZagInt(1);
  const ratingOutput = new OutputBuilder(SAFE_MIN_BOX_VALUE, CONTRACT_ADDRESSES.ratingBox)
    .setAdditionalRegisters({
      R4: '0e' + encodeVLQ(taskId.length / 2) + taskId,
      R5: '0e' + encodeVLQ(commitment.length) + bytesToHex(commitment),
      R6: '0e' + encodeVLQ(raterPk.length / 2) + raterPk,
      R7: phase1Encoded, // phase 1 = commit
    });

  const tx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([ratingOutput])
    .sendChangeTo(changeAddress)
    .payFee(DEFAULT_TX_FEE.toString())
    .build()
    .toEIP12Object();

  return { tx, salt: actualSalt, commitment };
}

/**
 * Build a reveal transaction for rating (phase 2).
 * Spends the phase-1 RatingBox and creates a phase-2 RatingBox with revealed rating.
 *
 * @param ratingBox - The phase-1 RatingBox to spend
 * @param rating - Original rating value
 * @param salt - Original salt used in commitment
 * @param inputs - Wallet UTXOs (plus the rating box)
 * @param changeAddress - Change address
 * @param currentHeight - Current blockchain height
 */
export function buildRatingRevealTx(
  ratingBox: EIP12UnsignedInput,
  rating: number,
  salt: Uint8Array,
  inputs: EIP12UnsignedInput[],
  changeAddress: string,
  currentHeight: number
) {
  const allInputs = [ratingBox, ...inputs];
  const regs = ratingBox.additionalRegisters;

  const revealOutput = new OutputBuilder(SAFE_MIN_BOX_VALUE, CONTRACT_ADDRESSES.ratingBox)
    .setAdditionalRegisters({
      R4: regs.R4 ?? '',
      R5: regs.R5 ?? '',
      R6: regs.R6 ?? '',
      R7: '04' + encodeZigZagInt(2), // phase 2
      R8: '04' + encodeZigZagInt(rating), // revealed rating
    });

  const tx = new TransactionBuilder(currentHeight)
    .from(allInputs)
    .to([revealOutput])
    .sendChangeTo(changeAddress)
    .payFee(DEFAULT_TX_FEE.toString())
    .build()
    .toEIP12Object();

  return { tx };
}

/**
 * Parse an Explorer box into a typed RatingBox.
 */
export function parseRatingBox(box: ExplorerBox): RatingBox {
  const regs = box.additionalRegisters;
  const phase = parseInt(regs.R7?.renderedValue ?? '1', 10);
  return {
    boxId: box.boxId,
    transactionId: box.transactionId,
    value: box.value.toString(),
    ergoTree: box.ergoTree,
    taskId: regs.R4?.renderedValue ?? '',
    ratingCommitment: hexToBytes(regs.R5?.renderedValue ?? ''),
    raterPk: hexToBytes(regs.R6?.renderedValue ?? ''),
    phase,
    revealedRating: phase === 2 ? parseInt(regs.R8?.renderedValue ?? '0', 10) : undefined,
  };
}

// Helper encoders (duplicated here for module independence)
function encodeVLQ(n: number): string {
  let result = '';
  while (n >= 0x80) {
    result += ((n & 0x7f) | 0x80).toString(16).padStart(2, '0');
    n >>= 7;
  }
  result += n.toString(16).padStart(2, '0');
  return result;
}

function encodeZigZagInt(n: number): string {
  const zigzag = (n << 1) ^ (n >> 31);
  return encodeVLQ(zigzag >>> 0);
}
