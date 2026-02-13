/**
 * Ergo Explorer API Helpers
 * 
 * Generic utilities for interacting with the Ergo blockchain explorer API.
 */

import { PLATFORM_FEE_ADDRESS } from '$lib/common/constants';

const EXPLORER_API_BASE = 'https://api.ergoplatform.com/api/v1';

export interface TokenInfo {
    tokenId: string;
    amount: number;
    decimals: number;
    name?: string;
    description?: string;
}

export interface AddressBalance {
    nanoErgs: number;
    tokens: TokenInfo[];
}

export interface BoxData {
    boxId: string;
    value: number;
    ergoTree: string;
    assets: Array<{
        tokenId: string;
        amount: number;
    }>;
    additionalRegisters: Record<string, string>;
}

/**
 * Get unspent boxes for an address
 */
export async function getBoxesByAddress(address: string): Promise<BoxData[]> {
    try {
        const response = await fetch(`${EXPLORER_API_BASE}/boxes/unspent/byAddress/${address}`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error(`Error fetching boxes for address ${address}:`, error);
        throw new Error('Failed to fetch boxes from explorer API');
    }
}

/**
 * Get token information by tokenId
 */
export async function getTokenInfo(tokenId: string): Promise<any> {
    try {
        const response = await fetch(`${EXPLORER_API_BASE}/tokens/${tokenId}`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching token info for ${tokenId}:`, error);
        throw new Error('Failed to fetch token information');
    }
}

/**
 * Get confirmed balance for an address
 */
export async function getAddressBalance(address: string): Promise<AddressBalance> {
    try {
        const response = await fetch(`${EXPLORER_API_BASE}/addresses/${address}/balance/confirmed`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching balance for address ${address}:`, error);
        throw new Error('Failed to fetch address balance');
    }
}

/**
 * Get the treasury balance (platform fee address)
 */
export async function getTreasuryBalance(): Promise<number> {
    try {
        const balance = await getAddressBalance(PLATFORM_FEE_ADDRESS);
        return balance.nanoErgs;
    } catch (error) {
        console.error('Error fetching treasury balance:', error);
        return 0;
    }
}

/**
 * Get network state (current height, etc.)
 */
export async function getNetworkState(): Promise<any> {
    try {
        const response = await fetch(`${EXPLORER_API_BASE}/networkState`);
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching network state:', error);
        throw new Error('Failed to fetch network state');
    }
}