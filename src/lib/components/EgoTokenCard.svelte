<!--
EgoTokenCard.svelte
Displays an EGO reputation token with its metadata
-->

<script lang="ts">
    import type { EgoToken } from '$lib/ergo/ego';
    import { Badge } from '$lib/components/ui/badge';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

    export let token: EgoToken;
    export let showOwner = false; // For leaderboard display
    export let rank: number | null = null; // For leaderboard ranking

    function truncateAddress(address: string): string {
        if (address.length <= 20) return address;
        return `${address.slice(0, 8)}...${address.slice(-8)}`;
    }

    function formatTokenId(tokenId: string): string {
        if (tokenId.length <= 16) return tokenId;
        return `${tokenId.slice(0, 8)}...${tokenId.slice(-8)}`;
    }

    function getScoreColor(score: number): string {
        if (score >= 1000) return 'bg-amber-500';
        if (score >= 500) return 'bg-orange-500';
        if (score >= 100) return 'bg-yellow-500';
        return 'bg-gray-500';
    }

    function getScoreLabel(score: number): string {
        if (score >= 1000) return 'Elite';
        if (score >= 500) return 'Expert';
        if (score >= 100) return 'Skilled';
        return 'Novice';
    }
</script>

<Card class="ego-token-card">
    <CardHeader class="pb-3">
        <div class="flex items-center justify-between">
            <CardTitle class="text-base flex items-center gap-2">
                {#if rank !== null}
                    <Badge variant="secondary" class="rank-badge">#{rank}</Badge>
                {/if}
                <span class="token-name">{token.metadata?.name || 'EGO Token'}</span>
            </CardTitle>
            <Badge class={`score-badge ${getScoreColor(token.amount)}`}>
                {getScoreLabel(token.amount)}
            </Badge>
        </div>
    </CardHeader>
    
    <CardContent class="space-y-3">
        <!-- Score Display -->
        <div class="score-display">
            <div class="score-label">Reputation Score</div>
            <div class="score-value">{token.amount.toLocaleString()}</div>
        </div>

        <!-- Token ID -->
        <div class="detail-item">
            <span class="detail-label">Token ID:</span>
            <span class="detail-value font-mono text-xs">{formatTokenId(token.tokenId)}</span>
        </div>

        <!-- Owner (for leaderboard) -->
        {#if showOwner}
            <div class="detail-item">
                <span class="detail-label">Owner:</span>
                <span class="detail-value font-mono text-xs">{truncateAddress(token.owner)}</span>
            </div>
        {/if}

        <!-- Description -->
        {#if token.metadata?.description}
            <div class="description">
                <p class="text-xs text-muted-foreground">{token.metadata.description}</p>
            </div>
        {/if}

        <!-- Soulbound Badge -->
        <div class="flex justify-center">
            <Badge variant="outline" class="soulbound-badge">
                🔒 Soulbound
            </Badge>
        </div>
    </CardContent>
</Card>

<style lang="postcss">
    .ego-token-card {
        @apply transition-all duration-200 hover:shadow-md;
        @apply border-border hover:border-amber-500/20;
    }

    .rank-badge {
        @apply bg-amber-500/10 text-amber-600 dark:text-amber-400;
        @apply font-bold;
    }

    .token-name {
        @apply font-medium text-foreground;
    }

    .score-badge {
        @apply text-white font-bold text-xs;
    }

    .score-display {
        @apply text-center py-2;
    }

    .score-label {
        @apply text-xs text-muted-foreground mb-1;
    }

    .score-value {
        @apply text-2xl font-bold text-amber-500 dark:text-amber-400;
    }

    .detail-item {
        @apply flex justify-between items-center text-sm;
    }

    .detail-label {
        @apply text-muted-foreground;
    }

    .detail-value {
        @apply text-foreground;
    }

    .description {
        @apply pt-2 border-t border-border;
    }

    .soulbound-badge {
        @apply text-xs border-amber-500/30 text-amber-600 dark:text-amber-400;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
        .score-value {
            @apply text-xl;
        }
        
        .detail-item {
            @apply text-xs;
        }
    }
</style>