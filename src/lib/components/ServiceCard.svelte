<!--
ServiceCard.svelte
Displays a service in the service explorer grid
-->

<script lang="ts">
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';

    // TODO: Update this interface once we have actual service data from Celaut
    export let service: {
        hash: string;
        name?: string;
        description?: string;
        executionCount?: number;
        averageRating?: number;
        category?: string;
        priceRange?: {
            min: number;
            max: number;
        };
        provider?: string;
        lastExecuted?: string;
    };

    function truncateHash(hash: string): string {
        if (hash.length <= 20) return hash;
        return `${hash.slice(0, 10)}...${hash.slice(-10)}`;
    }

    function formatPrice(nanoErgs: number): string {
        return (nanoErgs / 1_000_000_000).toFixed(3);
    }

    function getRatingColor(rating: number): string {
        if (rating >= 4.5) return 'text-green-500';
        if (rating >= 3.5) return 'text-yellow-500';
        if (rating >= 2.5) return 'text-orange-500';
        return 'text-red-500';
    }

    function getCategoryColor(category: string): string {
        switch (category?.toLowerCase()) {
            case 'ai': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            case 'data': return 'bg-green-500/10 text-green-600 dark:text-green-400';
            case 'compute': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
            case 'automation': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
            default: return 'bg-gray-500/10 text-gray-600 dark:text-gray-400';
        }
    }

    function handleExecute() {
        // TODO: Navigate to execute page with pre-filled service hash
        console.log('Execute service:', service.hash);
    }
</script>

<Card class="service-card">
    <CardHeader class="pb-3">
        <div class="flex items-start justify-between gap-2">
            <div class="flex-1 min-w-0">
                <CardTitle class="text-base font-medium mb-1">
                    {service.name || 'AI Service'}
                </CardTitle>
                <div class="service-hash">
                    <span class="hash-label">Hash:</span>
                    <code class="hash-value">{truncateHash(service.hash)}</code>
                </div>
            </div>
            {#if service.category}
                <Badge class={getCategoryColor(service.category)}>
                    {service.category}
                </Badge>
            {/if}
        </div>
    </CardHeader>

    <CardContent class="space-y-3">
        <!-- Description -->
        {#if service.description}
            <p class="service-description">{service.description}</p>
        {:else}
            <p class="service-description text-muted-foreground italic">
                <!-- TODO: This will be replaced with actual service descriptions from Celaut -->
                Service description will be loaded from Celaut network
            </p>
        {/if}

        <!-- Stats Row -->
        <div class="stats-row">
            <div class="stat-item">
                <span class="stat-label">Executions</span>
                <span class="stat-value">{service.executionCount || 0}</span>
            </div>
            
            {#if service.averageRating !== undefined}
                <div class="stat-item">
                    <span class="stat-label">Rating</span>
                    <span class={`stat-value ${getRatingColor(service.averageRating)}`}>
                        ★ {service.averageRating.toFixed(1)}
                    </span>
                </div>
            {:else}
                <div class="stat-item">
                    <span class="stat-label">Rating</span>
                    <span class="stat-value text-muted-foreground">Not rated</span>
                </div>
            {/if}
        </div>

        <!-- Price Range -->
        {#if service.priceRange}
            <div class="price-range">
                <span class="price-label">Price Range:</span>
                <span class="price-value">
                    {formatPrice(service.priceRange.min)} - {formatPrice(service.priceRange.max)} ERG
                </span>
            </div>
        {/if}

        <!-- Provider -->
        {#if service.provider}
            <div class="provider-info">
                <span class="provider-label">Provider:</span>
                <code class="provider-value">{truncateHash(service.provider)}</code>
            </div>
        {/if}

        <!-- Action Button -->
        <div class="card-actions">
            <Button 
                on:click={handleExecute}
                class="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
            >
                Execute Service
            </Button>
        </div>

        <!-- TODO Badge -->
        <div class="todo-notice">
            <Badge variant="outline" class="text-xs">
                🚧 TODO: Integrate with Celaut network for live service data
            </Badge>
        </div>
    </CardContent>
</Card>

<style lang="postcss">
    .service-card {
        @apply transition-all duration-200 hover:shadow-lg;
        @apply border-border hover:border-amber-500/30;
        @apply h-full; /* For grid layout */
    }

    .service-hash {
        @apply flex items-center gap-1 text-xs;
    }

    .hash-label {
        @apply text-muted-foreground;
    }

    .hash-value {
        @apply bg-muted px-1.5 py-0.5 rounded text-foreground font-mono;
    }

    .service-description {
        @apply text-sm text-foreground line-clamp-3;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .stats-row {
        @apply flex justify-between items-center;
    }

    .stat-item {
        @apply flex flex-col items-center;
    }

    .stat-label {
        @apply text-xs text-muted-foreground;
    }

    .stat-value {
        @apply text-sm font-medium;
    }

    .price-range, .provider-info {
        @apply flex justify-between items-center text-sm;
    }

    .price-label, .provider-label {
        @apply text-muted-foreground;
    }

    .price-value {
        @apply font-mono text-amber-600 dark:text-amber-400;
    }

    .provider-value {
        @apply bg-muted px-1.5 py-0.5 rounded text-foreground font-mono text-xs;
    }

    .card-actions {
        @apply pt-2;
    }

    .todo-notice {
        @apply flex justify-center;
    }

    /* Responsive adjustments */
    @media (max-width: 640px) {
        .stats-row {
            @apply text-xs;
        }
    }
</style>