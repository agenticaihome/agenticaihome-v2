/**
 * EGO Token Utilities
 * 
 * Functions for interacting with the soulbound EGO reputation system.
 */

import { SOULBOUND_EGO_CONTRACT } from '$lib/common/constants';
import { getBoxesByAddress } from './explorer';

export interface EgoToken {
    tokenId: string;
    amount: number;
    owner: string;
    metadata?: {
        name?: string;
        description?: string;
        score?: number;
    };
}

export interface LeaderboardEntry {
    address: string;
    totalEgo: number;
    tokens: EgoToken[];
}

/**
 * Query EGO tokens for a specific address
 * TODO: This will need to be updated once we have the actual contract implementation
 * and know how the soulbound tokens are structured in the registers
 */
export async function getEgoTokensForAddress(address: string): Promise<EgoToken[]> {
    try {
        // Get all boxes from the soulbound contract
        const contractBoxes = await getBoxesByAddress(SOULBOUND_EGO_CONTRACT);
        
        // Filter boxes that belong to the specified address
        // TODO: Update this logic once we know how addresses are stored in registers
        const userBoxes = contractBoxes.filter(box => {
            // Placeholder logic - this will need to be updated based on actual contract structure
            // For now, assume the owner address is stored in R4 register
            const ownerRegister = box.additionalRegisters?.R4;
            if (!ownerRegister) return false;
            
            try {
                // TODO: Decode the register properly based on ErgoScript encoding
                // This is placeholder logic
                return ownerRegister.includes(address);
            } catch (error) {
                console.error('Error parsing register:', error);
                return false;
            }
        });

        // Transform boxes into EGO tokens
        return userBoxes.map(box => ({
            tokenId: box.boxId, // Placeholder - actual token ID will be different
            amount: box.assets[0]?.amount || 0, // Assuming first asset is EGO token
            owner: address,
            metadata: {
                // TODO: Parse metadata from registers or from token info
                name: 'EGO Token',
                description: 'Soulbound reputation token',
                score: box.assets[0]?.amount || 0
            }
        }));
    } catch (error) {
        console.error(`Error fetching EGO tokens for address ${address}:`, error);
        return [];
    }
}

/**
 * Get EGO leaderboard (top addresses by total EGO score)
 * TODO: This will need optimization for production - fetching all boxes is expensive
 */
export async function getEgoLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    try {
        // Get all boxes from the soulbound contract
        const contractBoxes = await getBoxesByAddress(SOULBOUND_EGO_CONTRACT);
        
        // Group boxes by owner address
        const addressMap = new Map<string, EgoToken[]>();
        
        for (const box of contractBoxes) {
            // TODO: Update this logic once we know how addresses are stored in registers
            const ownerRegister = box.additionalRegisters?.R4;
            if (!ownerRegister) continue;
            
            try {
                // TODO: Properly decode the owner address from the register
                // This is placeholder logic
                const ownerAddress = ownerRegister; // Simplified for now
                
                if (!addressMap.has(ownerAddress)) {
                    addressMap.set(ownerAddress, []);
                }
                
                const egoToken: EgoToken = {
                    tokenId: box.boxId,
                    amount: box.assets[0]?.amount || 0,
                    owner: ownerAddress,
                    metadata: {
                        name: 'EGO Token',
                        description: 'Soulbound reputation token',
                        score: box.assets[0]?.amount || 0
                    }
                };
                
                addressMap.get(ownerAddress)?.push(egoToken);
            } catch (error) {
                console.error('Error parsing box for leaderboard:', error);
                continue;
            }
        }
        
        // Convert to leaderboard entries and calculate totals
        const leaderboardEntries: LeaderboardEntry[] = [];
        
        for (const [address, tokens] of addressMap) {
            const totalEgo = tokens.reduce((sum, token) => sum + token.amount, 0);
            leaderboardEntries.push({
                address,
                totalEgo,
                tokens
            });
        }
        
        // Sort by total EGO (descending) and limit results
        return leaderboardEntries
            .sort((a, b) => b.totalEgo - a.totalEgo)
            .slice(0, limit);
            
    } catch (error) {
        console.error('Error fetching EGO leaderboard:', error);
        return [];
    }
}

/**
 * Get total EGO tokens minted (for stats display)
 * TODO: This can be optimized by tracking this in a separate aggregation
 */
export async function getTotalEgoMinted(): Promise<number> {
    try {
        const contractBoxes = await getBoxesByAddress(SOULBOUND_EGO_CONTRACT);
        
        return contractBoxes.reduce((total, box) => {
            // Sum up all EGO tokens across all boxes
            const egoAmount = box.assets[0]?.amount || 0;
            return total + egoAmount;
        }, 0);
    } catch (error) {
        console.error('Error fetching total EGO minted:', error);
        return 0;
    }
}