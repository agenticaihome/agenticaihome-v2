// ============================================================================
// AgenticAiHome SDK — Constants
// ============================================================================

/** Explorer API base URLs */
export const EXPLORER_API_MAINNET = 'https://api.ergoplatform.com/api/v1';
export const EXPLORER_API_TESTNET = 'https://api-testnet.ergoplatform.com/api/v1';

/** SigUSD token ID on Ergo mainnet */
export const SIGUSD_TOKEN_ID = '03faf2cb329f2e90d6d23b58d91bbb6c046aa143261cc21f52fbe2824bfcbf04';

/** Minimum box value in nanoERG */
export const MIN_BOX_VALUE = BigInt(1_000_000);

/** Default transaction fee in nanoERG */
export const DEFAULT_TX_FEE = BigInt(1_100_000);

/** Protocol fee percentage (basis points, 100 = 1%) */
export const PROTOCOL_FEE_BPS = 200; // 2%

/** Minimum bond amount in nanoERG */
export const MIN_BOND_AMOUNT = BigInt(1_000_000_000); // 1 ERG

/**
 * ErgoTree hashes for contract identification.
 * These are blake2b256 hashes of the compiled P2S ErgoTrees.
 * TODO: Replace with actual compiled contract hashes after ErgoScript compilation.
 */
export const CONTRACT_HASHES = {
  /** TaskBox guard script hash */
  taskBox: 'PLACEHOLDER_TASK_BOX_ERGOTREE_HASH',
  /** ReceiptBox script hash */
  receiptBox: 'PLACEHOLDER_RECEIPT_BOX_ERGOTREE_HASH',
  /** FailureReceiptBox script hash */
  failureReceiptBox: 'PLACEHOLDER_FAILURE_RECEIPT_BOX_ERGOTREE_HASH',
  /** RatingBox script hash */
  ratingBox: 'PLACEHOLDER_RATING_BOX_ERGOTREE_HASH',
  /** BondBox script hash */
  bondBox: 'PLACEHOLDER_BOND_BOX_ERGOTREE_HASH',
  /** VerificationBountyBox script hash */
  verificationBountyBox: 'PLACEHOLDER_VERIFICATION_BOUNTY_BOX_ERGOTREE_HASH',
} as const;

/**
 * Compiled ErgoTree addresses (P2S).
 * TODO: Replace after compiling .es contracts.
 */
export const CONTRACT_ADDRESSES = {
  taskBox: 'PLACEHOLDER_TASK_BOX_ADDRESS',
  receiptBox: 'PLACEHOLDER_RECEIPT_BOX_ADDRESS',
  failureReceiptBox: 'PLACEHOLDER_FAILURE_RECEIPT_BOX_ADDRESS',
  ratingBox: 'PLACEHOLDER_RATING_BOX_ADDRESS',
  bondBox: 'PLACEHOLDER_BOND_BOX_ADDRESS',
  verificationBountyBox: 'PLACEHOLDER_VERIFICATION_BOUNTY_BOX_ADDRESS',
} as const;
