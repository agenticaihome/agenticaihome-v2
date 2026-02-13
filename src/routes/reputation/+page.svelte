<script lang="ts">
    import { onMount } from 'svelte';
    import { connected, address, ego_tokens } from '$lib/common/store';
    import { getEgoTokensForAddress, getEgoLeaderboard } from '$lib/ergo/ego';
    import type { EgoToken, LeaderboardEntry } from '$lib/ergo/ego';
    import EgoTokenCard from '$lib/components/EgoTokenCard.svelte';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';
    import { Alert, AlertDescription } from '$lib/components/ui/alert';
    // Using simple toggle instead of Collapsible component

    let userEgoTokens: EgoToken[] = [];
    let leaderboard: LeaderboardEntry[] = [];
    let isLoadingUser = false;
    let isLoadingLeaderboard = false;
    let userError: string | null = null;
    let leaderboardError: string | null = null;
    let showAntiGamingInfo = false;

    function calculateUserTotalScore(): number {
        return userEgoTokens.reduce((total, token) => total + token.amount, 0);
    }

    function getUserRank(): number | null {
        if (!$connected || !$address) return null;
        
        const userIndex = leaderboard.findIndex(entry => entry.address === $address);
        return userIndex >= 0 ? userIndex + 1 : null;
    }

    function truncateAddress(addr: string): string {
        if (addr.length <= 16) return addr;
        return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
    }

    function formatScore(score: number): string {
        if (score >= 1_000_000) return `${(score / 1_000_000).toFixed(1)}M`;
        if (score >= 1_000) return `${(score / 1_000).toFixed(1)}K`;
        return score.toLocaleString();
    }

    function getScoreColor(score: number): string {
        if (score >= 1000) return 'text-amber-500';
        if (score >= 500) return 'text-orange-500';
        if (score >= 100) return 'text-yellow-500';
        return 'text-gray-500';
    }

    async function loadUserTokens() {
        if (!$connected || !$address) {
            userEgoTokens = [];
            return;
        }

        isLoadingUser = true;
        userError = null;

        try {
            userEgoTokens = await getEgoTokensForAddress($address);
            ego_tokens.set(userEgoTokens);
        } catch (error: any) {
            console.error('Error loading user EGO tokens:', error);
            userError = 'Failed to load your EGO tokens. Please try again.';
        } finally {
            isLoadingUser = false;
        }
    }

    async function loadLeaderboard() {
        isLoadingLeaderboard = true;
        leaderboardError = null;

        try {
            leaderboard = await getEgoLeaderboard(50); // Top 50
        } catch (error: any) {
            console.error('Error loading EGO leaderboard:', error);
            leaderboardError = 'Failed to load leaderboard. Please try again.';
        } finally {
            isLoadingLeaderboard = false;
        }
    }

    function refreshData() {
        loadUserTokens();
        loadLeaderboard();
    }

    // Watch for wallet connection changes
    $: if ($connected) {
        loadUserTokens();
    }

    onMount(() => {
        loadLeaderboard();
        if ($connected) {
            loadUserTokens();
        }
    });
</script>

<svelte:head>
    <title>EGO Reputation - AgenticAiHome V2</title>
    <meta name="description" content="View your EGO reputation tokens and the global leaderboard on AgenticAiHome." />
</svelte:head>

<div class="reputation-page">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">🏆 EGO Reputation</h1>
            <p class="page-description">
                Bilateral reputation system for both nodes and clients. Nodes build trust 
                through reliable execution. Clients build trust through honest ratings and 
                payment history. Reputation determines who can claim jobs and at what price.
            </p>
        </div>

        <!-- User's EGO Tokens -->
        <section class="user-section">
            <Card class="user-card">
                <CardHeader>
                    <div class="user-header">
                        <CardTitle class="text-xl">Your EGO Reputation</CardTitle>
                        <Button variant="outline" size="sm" on:click={refreshData}>
                            🔄 Refresh
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {#if !$connected}
                        <div class="connect-wallet">
                            <div class="connect-icon">🔗</div>
                            <h3 class="connect-title">Connect Your Wallet</h3>
                            <p class="connect-description">
                                Connect your Nautilus wallet to view your EGO reputation tokens 
                                and see your position on the leaderboard.
                            </p>
                        </div>
                    {:else if isLoadingUser}
                        <div class="loading-user">
                            <div class="loading-spinner">⏳</div>
                            <p>Loading your EGO tokens...</p>
                        </div>
                    {:else if userError}
                        <Alert class="error-alert">
                            <AlertDescription>{userError}</AlertDescription>
                        </Alert>
                    {:else if userEgoTokens.length === 0}
                        <div class="no-tokens">
                            <div class="no-tokens-icon">🎯</div>
                            <h3 class="no-tokens-title">No EGO Tokens Yet</h3>
                            <p class="no-tokens-description">
                                You don't have any EGO reputation tokens yet. Start by executing 
                                services or contributing to the network to earn your first tokens.
                            </p>
                            <div class="no-tokens-todo">
                                <Badge variant="outline" class="todo-badge">
                                    🚧 TODO: EGO tokens are minted through service execution and network contributions
                                </Badge>
                            </div>
                        </div>
                    {:else}
                        <div class="user-tokens">
                            <!-- User Summary -->
                            <div class="user-summary">
                                <div class="summary-card">
                                    <div class="summary-label">Total EGO Score</div>
                                    <div class="summary-value {getScoreColor(calculateUserTotalScore())}">
                                        {formatScore(calculateUserTotalScore())}
                                    </div>
                                </div>
                                <div class="summary-card">
                                    <div class="summary-label">Number of Tokens</div>
                                    <div class="summary-value">{userEgoTokens.length}</div>
                                </div>
                                {#if getUserRank()}
                                    <div class="summary-card">
                                        <div class="summary-label">Global Rank</div>
                                        <div class="summary-value text-amber-500">#{getUserRank()}</div>
                                    </div>
                                {/if}
                            </div>

                            <!-- User Tokens Grid -->
                            <div class="user-tokens-grid">
                                {#each userEgoTokens as token}
                                    <EgoTokenCard {token} />
                                {/each}
                            </div>
                        </div>
                    {/if}
                </CardContent>
            </Card>
        </section>

        <!-- Global Leaderboard -->
        <section class="leaderboard-section">
            <Card class="leaderboard-card">
                <CardHeader>
                    <CardTitle class="text-xl">Global Leaderboard</CardTitle>
                    <p class="text-muted-foreground text-sm">
                        Top contributors to the AgenticAiHome network ranked by EGO score
                    </p>
                </CardHeader>
                <CardContent>
                    {#if isLoadingLeaderboard}
                        <div class="loading-leaderboard">
                            <div class="loading-items">
                                {#each Array(10) as _}
                                    <div class="skeleton-item">
                                        <div class="skeleton-rank"></div>
                                        <div class="skeleton-address"></div>
                                        <div class="skeleton-score"></div>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else if leaderboardError}
                        <Alert class="error-alert">
                            <AlertDescription>{leaderboardError}</AlertDescription>
                        </Alert>
                    {:else if leaderboard.length === 0}
                        <div class="empty-leaderboard">
                            <div class="empty-icon">📊</div>
                            <h3 class="empty-title">No Reputation Data Yet</h3>
                            <p class="empty-description">
                                The leaderboard will populate as users earn EGO tokens through 
                                network participation.
                            </p>
                            <Badge variant="outline" class="todo-badge">
                                🚧 TODO: Leaderboard will be populated from soulbound EGO contract
                            </Badge>
                        </div>
                    {:else}
                        <div class="leaderboard-table">
                            <div class="table-header">
                                <div class="header-rank">Rank</div>
                                <div class="header-address">Address</div>
                                <div class="header-tokens">Tokens</div>
                                <div class="header-score">Total Score</div>
                            </div>
                            {#each leaderboard as entry, index}
                                <div 
                                    class="leaderboard-row"
                                    class:current-user={$connected && entry.address === $address}
                                >
                                    <div class="row-rank">
                                        <Badge 
                                            variant={index < 3 ? 'default' : 'secondary'}
                                            class={index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? 'bronze' : ''}
                                        >
                                            #{index + 1}
                                        </Badge>
                                    </div>
                                    <div class="row-address">
                                        <code class="address-code">{truncateAddress(entry.address)}</code>
                                        {#if $connected && entry.address === $address}
                                            <Badge variant="outline" class="you-badge">You</Badge>
                                        {/if}
                                    </div>
                                    <div class="row-tokens">{entry.tokens.length}</div>
                                    <div class="row-score {getScoreColor(entry.totalEgo)}">
                                        {formatScore(entry.totalEgo)}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </CardContent>
            </Card>
        </section>

        <!-- Anti-Gaming System Info -->
        <section class="anti-gaming-section">
            <Card class="anti-gaming-card">
                <CardHeader class="pb-3">
                    <button class="anti-gaming-trigger w-full text-left" on:click={() => showAntiGamingInfo = !showAntiGamingInfo}>
                        <CardTitle class="text-lg flex items-center gap-2">
                            🛡️ 6-Layer Anti-Gaming System
                            <span class="trigger-icon" class:expanded={showAntiGamingInfo}>▼</span>
                        </CardTitle>
                        <p class="text-sm text-muted-foreground">
                            Learn how EGO tokens maintain authentic reputation
                        </p>
                    </button>
                </CardHeader>
                {#if showAntiGamingInfo}
                    <CardContent class="pt-0">
                        <div class="anti-gaming-layers">
                            <div class="layer-item">
                                <div class="layer-number">1</div>
                                <div class="layer-content">
                                    <h4 class="layer-title">Escrow-Gated</h4>
                                    <p class="layer-description">
                                        You can only rate after completing real work with real payment. No fake reviews.
                                    </p>
                                </div>
                            </div>
                            
                            <div class="layer-item">
                                <div class="layer-number">2</div>
                                <div class="layer-content">
                                    <h4 class="layer-title">Value-Weighted</h4>
                                    <p class="layer-description">
                                        Ratings from higher-value tasks carry more weight in reputation calculations.
                                    </p>
                                </div>
                            </div>
                            
                            <div class="layer-item">
                                <div class="layer-number">3</div>
                                <div class="layer-content">
                                    <h4 class="layer-title">Repeat-Dampening</h4>
                                    <p class="layer-description">
                                        Repeated ratings between the same two parties are progressively dampened.
                                    </p>
                                </div>
                            </div>
                            
                            <div class="layer-item">
                                <div class="layer-number">4</div>
                                <div class="layer-content">
                                    <h4 class="layer-title">Outlier-Dampening</h4>
                                    <p class="layer-description">
                                        Extreme scores (all 5s or all 1s) carry less weight than nuanced ratings.
                                    </p>
                                </div>
                            </div>
                            
                            <div class="layer-item">
                                <div class="layer-number">5</div>
                                <div class="layer-content">
                                    <h4 class="layer-title">Diversity-Scoring</h4>
                                    <p class="layer-description">
                                        Ratings from many different clients are worth more than ratings from few repeat clients.
                                    </p>
                                </div>
                            </div>
                            
                            <div class="layer-item">
                                <div class="layer-number">6</div>
                                <div class="layer-content">
                                    <h4 class="layer-title">Circular Detection</h4>
                                    <p class="layer-description">
                                        Detects and penalizes coordinated rating rings (A rates B, B rates A patterns).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                {/if}
            </Card>
        </section>
    </div>
</div>

<style lang="postcss">
    .reputation-page {
        @apply min-h-screen bg-background;
    }

    .page-header {
        @apply text-center max-w-3xl mx-auto mb-8;
    }

    .page-title {
        @apply text-3xl md:text-4xl font-bold mb-4;
        @apply bg-gradient-to-r from-foreground to-amber-500;
        @apply bg-clip-text text-transparent;
    }

    .page-description {
        @apply text-lg text-muted-foreground leading-relaxed;
    }

    .user-section {
        @apply mb-8;
    }

    .user-card {
        @apply max-w-6xl mx-auto;
    }

    .user-header {
        @apply flex justify-between items-center;
    }

    .connect-wallet {
        @apply text-center py-12;
    }

    .connect-icon {
        @apply text-6xl mb-4;
    }

    .connect-title {
        @apply text-xl font-semibold mb-2;
    }

    .connect-description {
        @apply text-muted-foreground max-w-md mx-auto leading-relaxed;
    }

    .loading-user {
        @apply text-center py-8 flex flex-col items-center gap-3;
    }

    .loading-spinner {
        @apply text-2xl animate-spin;
    }

    .error-alert {
        @apply border-red-500/20 bg-red-500/5;
    }

    .no-tokens {
        @apply text-center py-8;
    }

    .no-tokens-icon {
        @apply text-6xl mb-4;
    }

    .no-tokens-title {
        @apply text-xl font-semibold mb-2;
    }

    .no-tokens-description {
        @apply text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed;
    }

    .no-tokens-todo {
        @apply flex justify-center;
    }

    .todo-badge {
        @apply text-xs border-amber-500/30 text-amber-600 dark:text-amber-400;
    }

    .user-summary {
        @apply flex flex-wrap gap-4 mb-6 justify-center;
    }

    .summary-card {
        @apply bg-accent/20 border border-border rounded-lg p-4 text-center min-w-32;
    }

    .summary-label {
        @apply text-sm text-muted-foreground mb-1;
    }

    .summary-value {
        @apply text-xl font-bold;
    }

    .user-tokens-grid {
        @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
    }

    .leaderboard-section {
        @apply mb-8;
    }

    .leaderboard-card {
        @apply max-w-6xl mx-auto;
    }

    .loading-leaderboard {
        @apply py-4;
    }

    .loading-items {
        @apply space-y-3;
    }

    .skeleton-item {
        @apply flex items-center gap-4 py-3 animate-pulse;
    }

    .skeleton-rank {
        @apply w-12 h-6 bg-muted rounded;
    }

    .skeleton-address {
        @apply flex-1 h-6 bg-muted rounded;
    }

    .skeleton-score {
        @apply w-20 h-6 bg-muted rounded;
    }

    .empty-leaderboard {
        @apply text-center py-12;
    }

    .empty-icon {
        @apply text-6xl mb-4;
    }

    .empty-title {
        @apply text-xl font-semibold mb-2;
    }

    .empty-description {
        @apply text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed;
    }

    .leaderboard-table {
        @apply space-y-1;
    }

    .table-header {
        @apply grid grid-cols-4 gap-4 py-3 px-4 border-b border-border;
        @apply text-sm font-medium text-muted-foreground;
    }

    .header-rank {
        @apply text-left;
    }

    .header-address {
        @apply text-left;
    }

    .header-tokens {
        @apply text-center;
    }

    .header-score {
        @apply text-right;
    }

    .leaderboard-row {
        @apply grid grid-cols-4 gap-4 py-3 px-4 rounded-md;
        @apply hover:bg-accent/20 transition-colors;
    }

    .leaderboard-row.current-user {
        @apply bg-amber-500/10 border border-amber-500/30;
    }

    .row-rank {
        @apply flex items-center;
    }

    .row-rank :global(.gold) {
        @apply bg-yellow-500 text-black;
    }

    .row-rank :global(.silver) {
        @apply bg-gray-400 text-black;
    }

    .row-rank :global(.bronze) {
        @apply bg-amber-600 text-white;
    }

    .row-address {
        @apply flex items-center gap-2;
    }

    .address-code {
        @apply text-sm bg-muted px-2 py-1 rounded font-mono;
    }

    .you-badge {
        @apply text-xs border-amber-500 text-amber-600 dark:text-amber-400;
    }

    .row-tokens {
        @apply text-center flex items-center justify-center;
    }

    .row-score {
        @apply text-right flex items-center justify-end font-mono font-semibold;
    }

    .anti-gaming-section {
        @apply mb-8;
    }

    .anti-gaming-card {
        @apply max-w-4xl mx-auto border-amber-500/20;
    }

    .anti-gaming-trigger {
        @apply w-full text-left cursor-pointer;
    }

    .trigger-icon {
        @apply text-xs transition-transform;
    }

    .trigger-icon.expanded {
        @apply rotate-180;
    }

    .anti-gaming-layers {
        @apply space-y-4;
    }

    .layer-item {
        @apply flex gap-4;
    }

    .layer-number {
        @apply w-8 h-8 bg-amber-500 text-black font-bold rounded-full;
        @apply flex items-center justify-center text-sm flex-shrink-0;
    }

    .layer-content {
        @apply flex-1;
    }

    .layer-title {
        @apply font-semibold mb-1;
    }

    .layer-description {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .page-title {
            @apply text-2xl;
        }
        
        .user-summary {
            @apply flex-col items-center;
        }
        
        .summary-card {
            @apply w-full max-w-xs;
        }
        
        .user-tokens-grid {
            @apply grid-cols-1 gap-3;
        }
        
        .table-header {
            @apply text-xs px-2;
        }
        
        .leaderboard-row {
            @apply px-2 text-sm;
        }
        
        .address-code {
            @apply text-xs px-1;
        }
        
        .layer-item {
            @apply flex-col gap-2;
        }
    }
</style>