<!--
ChainStats.svelte
Displays real-time statistics from the Ergo blockchain for AgenticAiHome
-->

<script lang="ts">
    import { onMount } from 'svelte';
    import { getTreasuryBalance, getNetworkState } from '$lib/ergo/explorer';
    import { getTotalEgoMinted } from '$lib/ergo/ego';
    import { ESCROW_CONTRACT_V2 } from '$lib/common/constants';
    import { getBoxesByAddress } from '$lib/ergo/explorer';

    let treasuryBalance = 0;
    let totalEgoMinted = 0;
    let totalEscrowValue = 0;
    let networkHeight = 0;
    let isLoading = true;
    let error: string | null = null;

    function formatErg(nanoErgs: number): string {
        return (nanoErgs / 1_000_000_000).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatNumber(num: number): string {
        return num.toLocaleString();
    }

    async function loadStats() {
        isLoading = true;
        error = null;

        try {
            // Load all stats in parallel
            const [treasury, egoTotal, networkState, escrowBoxes] = await Promise.all([
                getTreasuryBalance().catch(() => 0),
                getTotalEgoMinted().catch(() => 0),
                getNetworkState().catch(() => ({ height: 0 })),
                getBoxesByAddress(ESCROW_CONTRACT_V2).catch(() => [])
            ]);

            treasuryBalance = treasury;
            totalEgoMinted = egoTotal;
            networkHeight = networkState.height;

            // Calculate total value locked in escrow
            totalEscrowValue = escrowBoxes.reduce((total, box) => total + box.value, 0);

        } catch (err: any) {
            console.error('Error loading chain stats:', err);
            error = 'Failed to load blockchain statistics';
        } finally {
            isLoading = false;
        }
    }

    onMount(() => {
        loadStats();
        
        // Refresh stats every 30 seconds
        const interval = setInterval(loadStats, 30000);
        
        return () => clearInterval(interval);
    });
</script>

<div class="chain-stats">
    {#if isLoading}
        <div class="loading-state">
            <div class="animate-pulse">Loading blockchain stats...</div>
        </div>
    {:else if error}
        <div class="error-state">
            <p class="text-red-500 text-sm">{error}</p>
            <button 
                on:click={loadStats} 
                class="text-amber-500 hover:text-amber-400 text-sm underline"
            >
                Retry
            </button>
        </div>
    {:else}
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">Total ERG in Escrow</div>
                <div class="stat-value">{formatErg(totalEscrowValue)} ERG</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">EGO Tokens Minted</div>
                <div class="stat-value">{formatNumber(totalEgoMinted)}</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">Treasury Balance</div>
                <div class="stat-value">{formatErg(treasuryBalance)} ERG</div>
            </div>
            
            <div class="stat-item">
                <div class="stat-label">Block Height</div>
                <div class="stat-value">#{formatNumber(networkHeight)}</div>
            </div>
        </div>
    {/if}
</div>

<style lang="postcss">
    .chain-stats {
        @apply w-full;
    }

    .loading-state {
        @apply flex items-center justify-center py-8 text-muted-foreground;
    }

    .error-state {
        @apply flex flex-col items-center justify-center py-8 space-y-2;
    }

    .stats-grid {
        @apply grid grid-cols-2 lg:grid-cols-4 gap-4;
    }

    .stat-item {
        @apply bg-card border border-border rounded-lg p-4 text-center;
        @apply hover:bg-accent/5 transition-colors;
    }

    .stat-label {
        @apply text-sm text-muted-foreground mb-1;
    }

    .stat-value {
        @apply text-lg font-semibold text-foreground;
        @apply text-amber-500 dark:text-amber-400;
    }

    @media (max-width: 640px) {
        .stats-grid {
            @apply grid-cols-1 gap-3;
        }
        
        .stat-item {
            @apply p-3;
        }
        
        .stat-value {
            @apply text-base;
        }
    }
</style>