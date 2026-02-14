// ============================================================================
// AgenticAiHome SDK — TaskBox Creation and Parsing
// ============================================================================

import { TransactionBuilder, OutputBuilder, SAFE_MIN_BOX_VALUE } from '@fleet-sdk/core';
import { PostTaskParams, TaskBox, ExplorerBox, EIP12UnsignedInput } from '../types';
import { CONTRACT_ADDRESSES, DEFAULT_TX_FEE, SIGUSD_TOKEN_ID } from '../constants';
import {
  blake2b256,
  createCommitment,
  randomBytes,
  stringToBytes,
  hexToBytes,
  bytesToHex,
} from '../utils/crypto';

/**
 * Build an unsigned transaction that creates a TaskBox on-chain.
 *
 * The TaskBox locks ERG (or SigUSD) with registers:
 *   R4: service_hash, R5: input_commitment, R6: payment_amount,
 *   R7: min_reputation, R8: deadline_block, R9: flags
 *
 * @param params - Task parameters
 * @param inputs - Wallet UTXOs to fund the transaction
 * @param changeAddress - Address for leftover funds
 * @param currentHeight - Current blockchain height
 * @returns Unsigned transaction ready for wallet signing
 */
export function buildTaskBoxTx(
  params: PostTaskParams,
  inputs: EIP12UnsignedInput[],
  changeAddress: string,
  currentHeight: number
) {
  // Compute service hash
  const serviceHashBytes =
    typeof params.serviceHash === 'string'
      ? blake2b256(stringToBytes(params.serviceHash))
      : params.serviceHash;

  // Compute input commitment
  const salt = params.salt ?? randomBytes(32);
  const inputBytes =
    typeof params.input === 'string' ? stringToBytes(params.input) : params.input;
  const commitment = createCommitment(inputBytes, salt);

  // Build the TaskBox output
  const taskOutput = new OutputBuilder(
    params.sigUsdAmount ? SAFE_MIN_BOX_VALUE : params.paymentNanoErg.toString(),
    CONTRACT_ADDRESSES.taskBox
  )
    .setAdditionalRegisters({
      R4: encodeColl(serviceHashBytes),
      R5: encodeColl(commitment),
      R6: encodeLong(params.paymentNanoErg),
      R7: encodeInt(params.minReputation ?? 0),
      R8: encodeInt(params.deadlineBlock),
      R9: encodeColl(params.clientPk ?? new Uint8Array(33)), // TODO: derive from wallet if omitted
    });

  // Add SigUSD token if paying with stablecoin
  if (params.sigUsdAmount) {
    taskOutput.addTokens({
      tokenId: SIGUSD_TOKEN_ID,
      amount: params.sigUsdAmount.toString(),
    });
  }

  const tx = new TransactionBuilder(currentHeight)
    .from(inputs)
    .to([taskOutput])
    .sendChangeTo(changeAddress)
    .payFee(DEFAULT_TX_FEE.toString())
    .build()
    .toEIP12Object();

  return { tx, salt, commitment };
}

/**
 * Parse an Explorer box into a typed TaskBox.
 * @param box - Raw box from Explorer API
 * @returns Parsed TaskBox
 */
export function parseTaskBox(box: ExplorerBox): TaskBox {
  const regs = box.additionalRegisters;
  return {
    boxId: box.boxId,
    transactionId: box.transactionId,
    value: box.value.toString(),
    assets: box.assets.map((a) => ({ tokenId: a.tokenId, amount: a.amount.toString() })),
    ergoTree: box.ergoTree,
    creationHeight: box.creationHeight,
    serviceHash: hexToBytes(decodeCollHex(regs.R4?.serializedValue ?? '')),
    inputCommitment: hexToBytes(decodeCollHex(regs.R5?.serializedValue ?? '')),
    paymentAmount: BigInt(decodeLongValue(regs.R6?.renderedValue ?? '0')),
    minReputation: parseInt(regs.R7?.renderedValue ?? '0', 10),
    deadlineBlock: parseInt(regs.R8?.renderedValue ?? '0', 10),
    clientPk: hexToBytes(decodeCollHex(regs.R9?.serializedValue ?? '')),
  };
}

// ============================================================================
// Register encoding helpers (Sigma serialization format)
// ============================================================================

/** Encode a Coll[Byte] for an additional register (hex-encoded sigma value). */
function encodeColl(bytes: Uint8Array): string {
  // Sigma type prefix: 0e (Coll[Byte]) + VLQ length + data
  const len = encodeVLQ(bytes.length);
  return '0e' + len + bytesToHex(bytes);
}

/** Encode a Long value for an additional register. */
function encodeLong(value: bigint): string {
  // Sigma type prefix: 05 (Long) + ZigZag VLQ encoded value
  return '05' + encodeZigZagLong(value);
}

/** Encode an Int value for an additional register. */
function encodeInt(value: number): string {
  // Sigma type prefix: 04 (Int) + ZigZag VLQ encoded value
  return '04' + encodeZigZagInt(value);
}

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

function encodeZigZagLong(n: bigint): string {
  const zigzag = (n << 1n) ^ (n >> 63n);
  let val = zigzag < 0n ? -zigzag : zigzag;
  let result = '';
  while (val >= 0x80n) {
    result += Number(val & 0x7fn | 0x80n).toString(16).padStart(2, '0');
    val >>= 7n;
  }
  result += Number(val).toString(16).padStart(2, '0');
  return result;
}

function decodeCollHex(serialized: string): string {
  // Skip type byte (0e) and VLQ length
  if (!serialized || serialized.length < 4) return '';
  let pos = 2; // skip 0e
  // Read VLQ length
  let len = 0;
  let shift = 0;
  while (pos < serialized.length) {
    const byte = parseInt(serialized.substring(pos, pos + 2), 16);
    pos += 2;
    len |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return serialized.substring(pos, pos + len * 2);
}

function decodeLongValue(rendered: string): string {
  return rendered;
}
