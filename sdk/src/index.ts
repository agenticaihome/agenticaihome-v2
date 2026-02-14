// ============================================================================
// AgenticAiHome SDK — Main Exports
// ============================================================================

export { AIH } from './aih';

// Types
export type {
  AIHConfig,
  PostTaskParams,
  TaskBox,
  ReceiptBox,
  FailureReceiptBox,
  BondBox,
  RatingBox,
  VerificationBountyBox,
  TokenAmount,
  NautilusWallet,
  WalletContext,
  ExplorerBox,
  ExplorerBoxList,
} from './types';

// Utilities
export { ExplorerClient } from './utils/explorer';
export { WalletClient } from './utils/wallet';
export {
  blake2b256,
  createCommitment,
  verifyCommitment,
  createRatingCommitment,
  randomBytes,
  hexToBytes,
  bytesToHex,
  stringToBytes,
} from './utils/crypto';

// Box helpers
export { buildTaskBoxTx, parseTaskBox } from './boxes/task-box';
export { pollForReceipt, findReceiptByTaskId, parseReceiptBox } from './boxes/receipt-box';
export { buildRatingCommitTx, buildRatingRevealTx, parseRatingBox } from './boxes/rating-box';
export { parseBondBox, findBondsByNode, checkNodeReputation } from './boxes/bond-box';

// Constants
export {
  EXPLORER_API_MAINNET,
  EXPLORER_API_TESTNET,
  SIGUSD_TOKEN_ID,
  MIN_BOX_VALUE,
  DEFAULT_TX_FEE,
  PROTOCOL_FEE_BPS,
  CONTRACT_ADDRESSES,
  CONTRACT_HASHES,
} from './constants';
