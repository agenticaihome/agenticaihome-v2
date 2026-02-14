// ============================================================================
// AgenticAiHome SDK — BondBox Management
// ============================================================================

import { ExplorerBox, BondBox } from '../types';
import { hexToBytes } from '../utils/crypto';
import { ExplorerClient } from '../utils/explorer';
import { CONTRACT_ADDRESSES } from '../constants';

/**
 * Parse an Explorer box into a typed BondBox.
 * @param box - Raw box from Explorer API
 * @returns Parsed BondBox
 */
export function parseBondBox(box: ExplorerBox): BondBox {
  const regs = box.additionalRegisters;
  return {
    boxId: box.boxId,
    transactionId: box.transactionId,
    value: box.value.toString(),
    ergoTree: box.ergoTree,
    nodePk: hexToBytes(regs.R4?.renderedValue ?? ''),
    bondAmount: BigInt(regs.R5?.renderedValue ?? '0'),
    activeTaskCount: parseInt(regs.R6?.renderedValue ?? '0', 10),
    reputationScore: parseInt(regs.R7?.renderedValue ?? '0', 10),
  };
}

/**
 * Find BondBoxes for a given node public key.
 * @param explorer - Explorer client
 * @param nodePk - Node public key hex
 * @returns Array of matching BondBoxes
 */
export async function findBondsByNode(
  explorer: ExplorerClient,
  nodePk: string
): Promise<BondBox[]> {
  const result = await explorer.getUnspentBoxesByAddress(CONTRACT_ADDRESSES.bondBox);
  return result.items
    .filter((box) => box.additionalRegisters.R4?.renderedValue === nodePk)
    .map(parseBondBox);
}

/**
 * Check if a node meets minimum reputation requirements.
 * @param explorer - Explorer client
 * @param nodePk - Node public key hex
 * @param minReputation - Minimum required reputation score
 * @returns true if the node has sufficient reputation
 */
export async function checkNodeReputation(
  explorer: ExplorerClient,
  nodePk: string,
  minReputation: number
): Promise<boolean> {
  const bonds = await findBondsByNode(explorer, nodePk);
  if (bonds.length === 0) return false;
  return bonds.some((b) => b.reputationScore >= minReputation);
}
