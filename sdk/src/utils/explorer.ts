// ============================================================================
// AgenticAiHome SDK — Explorer API Wrapper
// ============================================================================

import { ExplorerBox, ExplorerBoxList } from '../types';
import { EXPLORER_API_MAINNET } from '../constants';

/**
 * Wrapper around the Ergo Explorer REST API.
 * All queries are read-only; transaction submission goes through the wallet.
 */
export class ExplorerClient {
  private baseUrl: string;

  constructor(baseUrl: string = EXPLORER_API_MAINNET) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Fetch a box by its ID.
   * @param boxId - The box identifier
   * @returns The box data or null if not found
   */
  async getBox(boxId: string): Promise<ExplorerBox | null> {
    const res = await this.fetch(`/boxes/${boxId}`);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Get unspent boxes by ErgoTree (P2S address).
   * @param ergoTree - Serialized ErgoTree hex
   * @param offset - Pagination offset
   * @param limit - Max results per page
   * @returns List of unspent boxes
   */
  async getUnspentBoxesByErgoTree(
    ergoTree: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<ExplorerBoxList> {
    const res = await this.fetch(
      `/boxes/unspent/byErgoTree/${ergoTree}?offset=${offset}&limit=${limit}`
    );
    if (!res.ok) throw new Error(`Explorer API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  /**
   * Get unspent boxes by address.
   * @param address - Ergo address (P2PK or P2S)
   * @param offset - Pagination offset
   * @param limit - Max results per page
   */
  async getUnspentBoxesByAddress(
    address: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<ExplorerBoxList> {
    const res = await this.fetch(
      `/boxes/unspent/byAddress/${address}?offset=${offset}&limit=${limit}`
    );
    if (!res.ok) throw new Error(`Explorer API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  /**
   * Get current blockchain height.
   */
  async getCurrentHeight(): Promise<number> {
    const res = await this.fetch('/blocks?limit=1&sortBy=height&sortDirection=desc');
    if (!res.ok) throw new Error(`Explorer API error: ${res.status} ${res.statusText}`);
    const data = await res.json();
    return data.items[0].height;
  }

  /**
   * Get transaction by ID.
   */
  async getTransaction(txId: string): Promise<unknown | null> {
    const res = await this.fetch(`/transactions/${txId}`);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Get unspent boxes for a token ID.
   * @param tokenId - The token identifier
   */
  async getUnspentBoxesByTokenId(
    tokenId: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<ExplorerBoxList> {
    const res = await this.fetch(
      `/boxes/unspent/byTokenId/${tokenId}?offset=${offset}&limit=${limit}`
    );
    if (!res.ok) throw new Error(`Explorer API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  private async fetch(path: string): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    return globalThis.fetch(url, {
      headers: { 'Accept': 'application/json' },
    });
  }
}
