// ============================================================================
// AgenticAiHome SDK — Type Definitions
// ============================================================================

/** EIP-12 Nautilus wallet context */
export interface EIP12UnsignedTransaction {
  inputs: EIP12UnsignedInput[];
  dataInputs: DataInput[];
  outputs: OutputCandidate[];
}

export interface EIP12UnsignedInput {
  boxId: string;
  transactionId: string;
  index: number;
  ergoTree: string;
  creationHeight: number;
  value: string;
  assets: TokenAmount[];
  additionalRegisters: Record<string, string>;
  extension: Record<string, string>;
}

export interface DataInput {
  boxId: string;
}

export interface OutputCandidate {
  value: string;
  ergoTree: string;
  creationHeight: number;
  assets: TokenAmount[];
  additionalRegisters: Record<string, string>;
}

export interface TokenAmount {
  tokenId: string;
  amount: string;
}

/** Nautilus wallet interface (window.ergoConnector.nautilus) */
export interface NautilusWallet {
  connect(): Promise<boolean>;
  getContext(): Promise<WalletContext>;
  isConnected(): Promise<boolean>;
}

export interface WalletContext {
  get_utxos(amount?: string, tokenId?: string): Promise<EIP12UnsignedInput[]>;
  get_balance(tokenId?: string): Promise<string>;
  get_change_address(): Promise<string>;
  get_used_addresses(): Promise<string[]>;
  sign_tx(tx: EIP12UnsignedTransaction): Promise<SignedTransaction>;
  submit_tx(tx: SignedTransaction): Promise<string>;
}

export interface SignedTransaction {
  id: string;
  inputs: unknown[];
  dataInputs: unknown[];
  outputs: unknown[];
}

// ============================================================================
// Box Types
// ============================================================================

/** TaskBox — locks payment with service hash, input commitment, and deadline */
export interface TaskBox {
  boxId: string;
  transactionId: string;
  value: string;
  assets: TokenAmount[];
  ergoTree: string;
  creationHeight: number;
  /** R4: service_hash — identifies what service to run */
  serviceHash: Uint8Array;
  /** R5: input_commitment H(input || salt) */
  inputCommitment: Uint8Array;
  /** R6: payment_amount (nanoERG or token units) */
  paymentAmount: bigint;
  /** R7: min_reputation required for service node */
  minReputation: number;
  /** R8: deadline_block — refund allowed after this height */
  deadlineBlock: number;
  /** R9: client_pk bytes (for refund path) */
  clientPk: Uint8Array;
}

/** Parameters to create a new TaskBox */
export interface PostTaskParams {
  /** Identifier for the service to run (will be hashed) */
  serviceHash: string | Uint8Array;
  /** Raw input data (will be committed with salt) */
  input: string | Uint8Array;
  /** Salt for input commitment (random if omitted) */
  salt?: Uint8Array;
  /** Payment in nanoERG */
  paymentNanoErg: bigint;
  /** Optional: pay with SigUSD token instead of ERG */
  sigUsdAmount?: bigint;
  /** Minimum reputation score for service node */
  minReputation?: number;
  /** Deadline as absolute block height */
  deadlineBlock: number;
  /** Client public key bytes (for refund — auto-derived from wallet if omitted) */
  clientPk?: Uint8Array;
}

/** ReceiptBox — proof that a service node executed a task */
export interface ReceiptBox {
  boxId: string;
  transactionId: string;
  value: string;
  ergoTree: string;
  /** R4: task_id (boxId of the TaskBox) */
  taskId: string;
  /** R5: output_hash H(output) */
  outputHash: Uint8Array;
  /** R6: node_pk (service node public key) */
  nodePk: Uint8Array;
  /** R7: execution_block */
  executionBlock: number;
}

/** FailureReceiptBox — legitimate failure, triggers auto-refund */
export interface FailureReceiptBox {
  boxId: string;
  transactionId: string;
  value: string;
  ergoTree: string;
  /** R4: task_id */
  taskId: string;
  /** R5: failure_reason_hash */
  failureReasonHash: Uint8Array;
  /** R6: node_pk */
  nodePk: Uint8Array;
  /** R7: failure_block */
  failureBlock: number;
}

/** BondBox — node collateral with active task counter */
export interface BondBox {
  boxId: string;
  transactionId: string;
  value: string;
  ergoTree: string;
  /** R4: node_pk */
  nodePk: Uint8Array;
  /** R5: bond_amount (nanoERG) */
  bondAmount: bigint;
  /** R6: active_task_count */
  activeTaskCount: number;
  /** R7: reputation_score */
  reputationScore: number;
}

/** RatingBox — commit-reveal bilateral rating */
export interface RatingBox {
  boxId: string;
  transactionId: string;
  value: string;
  ergoTree: string;
  /** R4: task_id */
  taskId: string;
  /** R5: rating_commitment H(rating || salt) */
  ratingCommitment: Uint8Array;
  /** R6: rater_pk */
  raterPk: Uint8Array;
  /** R7: phase (1 = commit, 2 = revealed) */
  phase: number;
  /** R8: revealed_rating (only in phase 2) */
  revealedRating?: number;
}

/** VerificationBountyBox — claimable by verifiers */
export interface VerificationBountyBox {
  boxId: string;
  transactionId: string;
  value: string;
  ergoTree: string;
  /** R4: task_id */
  taskId: string;
  /** R5: bounty_amount */
  bountyAmount: bigint;
  /** R6: verification_deadline */
  verificationDeadline: number;
}

// ============================================================================
// Explorer API Types
// ============================================================================

export interface ExplorerBox {
  boxId: string;
  transactionId: string;
  blockId: string;
  value: number;
  index: number;
  creationHeight: number;
  ergoTree: string;
  assets: { tokenId: string; amount: number }[];
  additionalRegisters: Record<string, { serializedValue: string; sigmaType: string; renderedValue: string }>;
  spentTransactionId: string | null;
}

export interface ExplorerBoxList {
  items: ExplorerBox[];
  total: number;
}

/** AIH client configuration */
export interface AIHConfig {
  /** Explorer API base URL (default: mainnet) */
  explorerUrl?: string;
  /** Network type */
  network?: 'mainnet' | 'testnet';
  /** Transaction fee in nanoERG (default: 1100000) */
  txFee?: bigint;
}
