// ============================================================================
// AgenticAiHome SDK — Nautilus/EIP-12 Wallet Integration
// ============================================================================

import {
  NautilusWallet,
  WalletContext,
  EIP12UnsignedTransaction,
  EIP12UnsignedInput,
  SignedTransaction,
} from '../types';

declare global {
  interface Window {
    ergoConnector?: {
      nautilus?: NautilusWallet;
    };
    ergo?: WalletContext;
  }
}

/**
 * Manages connection to the Nautilus browser wallet via EIP-12.
 */
export class WalletClient {
  private context: WalletContext | null = null;

  /**
   * Connect to Nautilus wallet. Must be called before any wallet operations.
   * @throws If Nautilus is not installed or user rejects connection
   */
  async connect(): Promise<void> {
    if (typeof window === 'undefined') {
      throw new Error('Wallet connection requires a browser environment');
    }
    const nautilus = window.ergoConnector?.nautilus;
    if (!nautilus) {
      throw new Error('Nautilus wallet not found. Install it from https://nautilus.toolchains.dev/');
    }
    const connected = await nautilus.connect();
    if (!connected) {
      throw new Error('User rejected wallet connection');
    }
    this.context = await nautilus.getContext();
  }

  /**
   * Check if wallet is connected.
   */
  isConnected(): boolean {
    return this.context !== null;
  }

  /**
   * Get the wallet context. Throws if not connected.
   */
  getContext(): WalletContext {
    if (!this.context) throw new Error('Wallet not connected. Call connect() first.');
    return this.context;
  }

  /**
   * Get UTXOs from the wallet, optionally filtered by token.
   * @param amount - Minimum ERG amount in nanoERG
   * @param tokenId - Optional token ID filter
   */
  async getUtxos(amount?: string, tokenId?: string): Promise<EIP12UnsignedInput[]> {
    const ctx = this.getContext();
    return ctx.get_utxos(amount, tokenId);
  }

  /**
   * Get the change address from the wallet.
   */
  async getChangeAddress(): Promise<string> {
    const ctx = this.getContext();
    return ctx.get_change_address();
  }

  /**
   * Get all used addresses from the wallet.
   */
  async getUsedAddresses(): Promise<string[]> {
    const ctx = this.getContext();
    return ctx.get_used_addresses();
  }

  /**
   * Get wallet ERG balance in nanoERG.
   */
  async getBalance(tokenId?: string): Promise<string> {
    const ctx = this.getContext();
    return ctx.get_balance(tokenId);
  }

  /**
   * Sign a transaction with the wallet.
   * @param tx - Unsigned transaction (EIP-12 format)
   * @returns Signed transaction
   */
  async signTransaction(tx: EIP12UnsignedTransaction): Promise<SignedTransaction> {
    const ctx = this.getContext();
    return ctx.sign_tx(tx);
  }

  /**
   * Submit a signed transaction to the network.
   * @param tx - Signed transaction
   * @returns Transaction ID
   */
  async submitTransaction(tx: SignedTransaction): Promise<string> {
    const ctx = this.getContext();
    return ctx.submit_tx(tx);
  }

  /**
   * Sign and submit a transaction in one call.
   * @param tx - Unsigned transaction
   * @returns Transaction ID
   */
  async signAndSubmit(tx: EIP12UnsignedTransaction): Promise<string> {
    const signed = await this.signTransaction(tx);
    return this.submitTransaction(signed);
  }
}
