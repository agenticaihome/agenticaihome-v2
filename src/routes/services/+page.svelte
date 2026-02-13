<script lang="ts">
    import { onMount } from 'svelte';
    import { services } from '$lib/common/store';
    import ServiceCard from '$lib/components/ServiceCard.svelte';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

    let searchQuery = '';
    let isLoading = true;
    let filteredServices: any[] = [];

    // TODO: This is placeholder data until Celaut integration is complete
    const placeholderServices = [
        {
            hash: '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z',
            name: 'GPT-4 Text Generation',
            description: 'Advanced language model for text generation, summarization, and analysis. Powered by OpenAI\'s GPT-4 with custom fine-tuning.',
            executionCount: 1247,
            averageRating: 4.8,
            category: 'AI',
            priceRange: { min: 100_000_000, max: 500_000_000 }, // 0.1 - 0.5 ERG
            provider: '9f8e7d6c5b4a39281736450f9e8d7c6b5a4938271635049f8e7d6c5b4a3928',
            lastExecuted: '2026-02-13T10:30:00Z'
        },
        {
            hash: '2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a',
            name: 'Image Classification',
            description: 'Deep learning model for image classification with 95%+ accuracy across 10,000+ categories. Optimized for edge deployment.',
            executionCount: 892,
            averageRating: 4.6,
            category: 'AI',
            priceRange: { min: 50_000_000, max: 200_000_000 }, // 0.05 - 0.2 ERG
            provider: '8e7d6c5b4a392817364509f8e7d6c5b4a39281736450f9e8d7c6c5b4a3928',
            lastExecuted: '2026-02-13T09:15:00Z'
        },
        {
            hash: '3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b',
            name: 'Data Analysis Pipeline',
            description: 'Automated data cleaning, transformation, and statistical analysis. Supports CSV, JSON, and SQL data sources.',
            executionCount: 634,
            averageRating: 4.4,
            category: 'Data',
            priceRange: { min: 200_000_000, max: 1_000_000_000 }, // 0.2 - 1.0 ERG
            provider: '7d6c5b4a39281736450f9e8d7c6c5b4a392817364509f8e7d6c5b4a392817',
            lastExecuted: '2026-02-12T18:45:00Z'
        },
        {
            hash: '4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b3c',
            name: 'Smart Contract Audit',
            description: 'Automated security analysis for ErgoScript smart contracts. Detects common vulnerabilities and optimization opportunities.',
            executionCount: 156,
            averageRating: 4.9,
            category: 'Automation',
            priceRange: { min: 1_000_000_000, max: 5_000_000_000 }, // 1.0 - 5.0 ERG
            provider: '6c5b4a39281736450f9e8d7c6c5b4a392817364509f8e7d6c5b4a392817364',
            lastExecuted: '2026-02-11T14:20:00Z'
        },
        {
            hash: '5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b3c4d',
            name: 'Compute Cluster Access',
            description: 'High-performance computing cluster for intensive calculations. 1000+ CPU cores with GPU acceleration available.',
            executionCount: 89,
            averageRating: 4.2,
            category: 'Compute',
            priceRange: { min: 500_000_000, max: 10_000_000_000 }, // 0.5 - 10.0 ERG
            provider: '5b4a39281736450f9e8d7c6c5b4a392817364509f8e7d6c5b4a39281736450',
            lastExecuted: '2026-02-10T08:30:00Z'
        },
        {
            hash: '6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z1a2b3c4d5e',
            name: 'Sentiment Analysis API',
            description: 'Real-time sentiment analysis for social media, reviews, and text content. Supports 15+ languages with context awareness.',
            executionCount: 2103,
            averageRating: 4.7,
            category: 'AI',
            priceRange: { min: 25_000_000, max: 100_000_000 }, // 0.025 - 0.1 ERG
            provider: '4a39281736450f9e8d7c6c5b4a392817364509f8e7d6c5b4a392817364509f',
            lastExecuted: '2026-02-13T11:45:00Z'
        }
    ];

    function loadServices() {
        isLoading = true;
        // TODO: Replace with actual Celaut network integration
        // This will fetch services from the Celaut distributed network
        setTimeout(() => {
            services.set(placeholderServices);
            isLoading = false;
        }, 1000);
    }

    function handleSearch() {
        if (!searchQuery.trim()) {
            filteredServices = $services;
            return;
        }

        filteredServices = $services.filter(service => 
            service.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.category?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }

    function clearSearch() {
        searchQuery = '';
        filteredServices = $services;
    }

    function filterByCategory(category: string) {
        filteredServices = $services.filter(service => 
            service.category?.toLowerCase() === category.toLowerCase()
        );
    }

    function showAllServices() {
        filteredServices = $services;
    }

    // Get unique categories for filter buttons
    $: categories = Array.from(new Set($services.map(s => s.category).filter(Boolean)));
    
    // Update filtered services when services change
    $: if ($services.length > 0 && filteredServices.length === 0) {
        filteredServices = $services;
    }

    onMount(() => {
        loadServices();
    });
</script>

<svelte:head>
    <title>Service Explorer - AgenticAiHome V2</title>
    <meta name="description" content="Browse and discover AI services on the decentralized AgenticAiHome network." />
</svelte:head>

<div class="services-page">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">🔧 Service Explorer</h1>
            <p class="page-description">
                Discover AI services from the global Celaut network. All services are 
                executed in a decentralized manner with cryptographic verification.
            </p>
        </div>

        <!-- Search and Filters -->
        <div class="search-section">
            <Card class="search-card">
                <CardHeader>
                    <CardTitle class="text-lg">Find Services</CardTitle>
                </CardHeader>
                <CardContent class="space-y-4">
                    <!-- Search Bar -->
                    <div class="search-bar">
                        <Input
                            type="text"
                            placeholder="Search by hash, name, description, or category..."
                            bind:value={searchQuery}
                            on:input={handleSearch}
                            class="search-input"
                        />
                        {#if searchQuery}
                            <Button
                                variant="outline"
                                size="sm"
                                on:click={clearSearch}
                                class="clear-button"
                            >
                                Clear
                            </Button>
                        {/if}
                    </div>

                    <!-- Category Filters -->
                    <div class="category-filters">
                        <Button
                            variant="outline"
                            size="sm"
                            on:click={showAllServices}
                            class="filter-button"
                        >
                            All Categories
                        </Button>
                        {#each categories as category}
                            <Button
                                variant="outline"
                                size="sm"
                                on:click={() => filterByCategory(category)}
                                class="filter-button"
                            >
                                {category}
                            </Button>
                        {/each}
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Results -->
        <div class="results-section">
            {#if isLoading}
                <div class="loading-state">
                    <div class="loading-grid">
                        {#each Array(6) as _}
                            <Card class="skeleton-card">
                                <CardHeader>
                                    <div class="skeleton-line skeleton-title"></div>
                                    <div class="skeleton-line skeleton-subtitle"></div>
                                </CardHeader>
                                <CardContent>
                                    <div class="skeleton-line skeleton-text"></div>
                                    <div class="skeleton-line skeleton-text"></div>
                                    <div class="skeleton-line skeleton-text short"></div>
                                </CardContent>
                            </Card>
                        {/each}
                    </div>
                </div>
            {:else if filteredServices.length === 0}
                <div class="empty-state">
                    <div class="empty-content">
                        <div class="empty-icon">🔍</div>
                        <h3 class="empty-title">No Services Found</h3>
                        <p class="empty-description">
                            {#if searchQuery}
                                No services match your search criteria. Try adjusting your search terms.
                            {:else}
                                No services are currently available. Check back later.
                            {/if}
                        </p>
                        {#if searchQuery}
                            <Button variant="outline" on:click={clearSearch}>
                                Clear Search
                            </Button>
                        {/if}
                    </div>
                </div>
            {:else}
                <div class="results-header">
                    <div class="results-count">
                        <Badge variant="secondary">
                            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} found
                        </Badge>
                    </div>
                </div>

                <div class="services-grid">
                    {#each filteredServices as service (service.hash)}
                        <ServiceCard {service} />
                    {/each}
                </div>
            {/if}
        </div>

        <!-- TODO Notice -->
        <div class="todo-section">
            <Card class="todo-card">
                <CardContent class="p-6">
                    <div class="todo-content">
                        <div class="todo-icon">🚧</div>
                        <div class="todo-text">
                            <h3 class="todo-title">Celaut Integration Coming Soon</h3>
                            <p class="todo-description">
                                The services shown above are placeholder data. The actual service discovery 
                                will integrate with the Celaut distributed network to fetch live AI services 
                                from edge nodes worldwide.
                            </p>
                            <div class="todo-features">
                                <div class="todo-feature">✓ Real-time service discovery</div>
                                <div class="todo-feature">✓ Geographic load balancing</div>
                                <div class="todo-feature">✓ Reputation-based filtering</div>
                                <div class="todo-feature">✓ Cost optimization</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
</div>

<style lang="postcss">
    .services-page {
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

    .search-section {
        @apply mb-8;
    }

    .search-card {
        @apply max-w-4xl mx-auto;
    }

    .search-bar {
        @apply flex gap-3;
    }

    .search-input {
        @apply flex-1;
    }

    .clear-button {
        @apply flex-shrink-0;
    }

    .category-filters {
        @apply flex flex-wrap gap-2;
    }

    .filter-button {
        @apply text-sm;
    }

    .results-section {
        @apply mb-8;
    }

    .results-header {
        @apply mb-6 flex justify-between items-center;
    }

    .results-count {
        @apply text-sm;
    }

    .services-grid {
        @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
    }

    .loading-state {
        @apply py-8;
    }

    .loading-grid {
        @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6;
    }

    .skeleton-card {
        @apply animate-pulse;
    }

    .skeleton-line {
        @apply bg-muted rounded;
    }

    .skeleton-title {
        @apply h-5 w-3/4 mb-2;
    }

    .skeleton-subtitle {
        @apply h-3 w-1/2 mb-4;
    }

    .skeleton-text {
        @apply h-3 w-full mb-2;
    }

    .skeleton-text.short {
        @apply w-2/3;
    }

    .empty-state {
        @apply py-16 flex justify-center;
    }

    .empty-content {
        @apply text-center max-w-md;
    }

    .empty-icon {
        @apply text-6xl mb-4;
    }

    .empty-title {
        @apply text-xl font-semibold mb-2;
    }

    .empty-description {
        @apply text-muted-foreground mb-6 leading-relaxed;
    }

    .todo-section {
        @apply mt-12;
    }

    .todo-card {
        @apply border-amber-500/20 bg-amber-500/5;
    }

    .todo-content {
        @apply flex gap-4;
    }

    .todo-icon {
        @apply text-3xl text-amber-500 flex-shrink-0;
    }

    .todo-text {
        @apply flex-1;
    }

    .todo-title {
        @apply font-semibold mb-2 text-amber-600 dark:text-amber-400;
    }

    .todo-description {
        @apply text-muted-foreground mb-4 leading-relaxed;
    }

    .todo-features {
        @apply grid grid-cols-2 gap-1 text-sm text-muted-foreground;
    }

    .todo-feature {
        @apply flex items-center gap-1;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .page-title {
            @apply text-2xl;
        }
        
        .search-bar {
            @apply flex-col gap-2;
        }
        
        .services-grid {
            @apply gap-4;
        }
        
        .todo-content {
            @apply flex-col gap-3;
        }
        
        .todo-features {
            @apply grid-cols-1;
        }
    }
</style>