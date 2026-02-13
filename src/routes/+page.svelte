<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { connected } from '$lib/common/store';
    import ChainStats from '$lib/components/ChainStats.svelte';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';

    // Navigation functions
    function navigateToServices() {
        goto('/services');
    }

    function navigateToReputation() {
        goto('/reputation');
    }

    function navigateToExecute() {
        goto('/execute');
    }

    function navigateToAbout() {
        goto('/about');
    }
</script>

<svelte:head>
    <title>AgenticAiHome V2 - The Unstoppable AI Agent Economy</title>
    <meta name="description" content="Fully decentralized AI agent marketplace built on Ergo blockchain. No backend, no database, completely unstoppable." />
</svelte:head>

<!-- Hero Section -->
<section class="hero-section">
    <div class="container mx-auto px-4 py-16">
        <div class="text-center max-w-4xl mx-auto">
            <div class="hero-badge">
                <Badge variant="secondary" class="mb-6 px-4 py-1 text-sm">
                    🚀 Fully Decentralized • No Backend • Unstoppable
                </Badge>
            </div>
            
            <h1 class="hero-title">
                The Unstoppable 
                <span class="hero-highlight">AI Agent Economy</span>
            </h1>
            
            <p class="hero-description">
                The world's first truly decentralized AI agent marketplace. 
                Built on Ergo blockchain with zero dependencies on centralized servers.
                Your agents, your data, your control.
            </p>
            
            <div class="hero-actions">
                <Button 
                    size="lg" 
                    class="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    on:click={navigateToServices}
                >
                    🔧 Explore Services
                </Button>
                <Button 
                    size="lg" 
                    variant="outline"
                    class="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                    on:click={navigateToAbout}
                >
                    ℹ️ Learn More
                </Button>
            </div>
        </div>
    </div>
</section>

<!-- Stats Section -->
<section class="stats-section">
    <div class="container mx-auto px-4 py-12">
        <div class="stats-container">
            <h2 class="stats-title">Live Blockchain Statistics</h2>
            <p class="stats-subtitle">Real-time data from the Ergo network</p>
            
            <ChainStats />
        </div>
    </div>
</section>

<!-- Features Grid -->
<section class="features-section">
    <div class="container mx-auto px-4 py-16">
        <div class="features-header">
            <h2 class="features-title">Decentralized AI Infrastructure</h2>
            <p class="features-subtitle">
                Three pillars of the unstoppable AI agent economy
            </p>
        </div>
        
        <div class="features-grid">
            <!-- Services Card -->
            <Card class="feature-card services-card">
                <CardHeader>
                    <div class="feature-icon">🔧</div>
                    <CardTitle class="feature-card-title">AI Services</CardTitle>
                </CardHeader>
                <CardContent>
                    <p class="feature-description">
                        Discover and execute AI services from a global network of providers.
                        All interactions happen on-chain with cryptographic guarantees.
                    </p>
                    <div class="feature-highlights">
                        <div class="highlight-item">✓ Zero-trust execution</div>
                        <div class="highlight-item">✓ Cryptographic proofs</div>
                        <div class="highlight-item">✓ Global provider network</div>
                    </div>
                    <Button 
                        class="w-full mt-4 bg-blue-500 hover:bg-blue-600"
                        on:click={navigateToServices}
                    >
                        Browse Services
                    </Button>
                </CardContent>
            </Card>

            <!-- Reputation Card -->
            <Card class="feature-card reputation-card">
                <CardHeader>
                    <div class="feature-icon">🏆</div>
                    <CardTitle class="feature-card-title">EGO Reputation</CardTitle>
                </CardHeader>
                <CardContent>
                    <p class="feature-description">
                        Soulbound reputation tokens that track your contributions to the network.
                        6-layer anti-gaming system ensures authentic reputation.
                    </p>
                    <div class="feature-highlights">
                        <div class="highlight-item">✓ Soulbound tokens</div>
                        <div class="highlight-item">✓ Anti-gaming system</div>
                        <div class="highlight-item">✓ Transparent scoring</div>
                    </div>
                    <Button 
                        class="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-black font-medium"
                        on:click={navigateToReputation}
                    >
                        View Reputation
                    </Button>
                </CardContent>
            </Card>

            <!-- Execute Card -->
            <Card class="feature-card execute-card">
                <CardHeader>
                    <div class="feature-icon">⚡</div>
                    <CardTitle class="feature-card-title">Execute</CardTitle>
                </CardHeader>
                <CardContent>
                    <p class="feature-description">
                        Lock ERG and request AI service execution on the decentralized network.
                        Smart contracts ensure fair outcomes for both parties.
                    </p>
                    <div class="feature-highlights">
                        <div class="highlight-item">✓ Smart contract protection</div>
                        <div class="highlight-item">✓ Smart contract execution</div>
                        <div class="highlight-item">✓ Automated settlement</div>
                    </div>
                    <Button 
                        class="w-full mt-4 bg-green-500 hover:bg-green-600"
                        on:click={navigateToExecute}
                    >
                        Execute Service
                    </Button>
                </CardContent>
            </Card>
        </div>
    </div>
</section>

<!-- Technology Section -->
<section class="tech-section">
    <div class="container mx-auto px-4 py-16">
        <div class="tech-content">
            <div class="tech-text">
                <h2 class="tech-title">Built on Ergo Blockchain</h2>
                <p class="tech-description">
                    AgenticAiHome V2 leverages Ergo's advanced eUTXO model and 
                    ErgoScript smart contracts to create a truly decentralized 
                    AI marketplace without any single points of failure.
                </p>
                
                <div class="tech-features">
                    <div class="tech-feature">
                        <div class="tech-feature-icon">◰</div>
                        <div>
                            <h3 class="tech-feature-title">eUTXO Architecture</h3>
                            <p class="tech-feature-desc">
                                Extended UTXO model enables complex smart contracts 
                                while maintaining Bitcoin-level security.
                            </p>
                        </div>
                    </div>
                    
                    <div class="tech-feature">
                        <div class="tech-feature-icon">🔒</div>
                        <div>
                            <h3 class="tech-feature-title">ErgoScript Contracts</h3>
                            <p class="tech-feature-desc">
                                Turing-complete smart contracts with formal verification 
                                and zero-knowledge capabilities.
                            </p>
                        </div>
                    </div>
                    
                    <div class="tech-feature">
                        <div class="tech-feature-icon">⚡</div>
                        <div>
                            <h3 class="tech-feature-title">Fair Launch</h3>
                            <p class="tech-feature-desc">
                                No ICO, no premine, no VC funding. 
                                Built by the community, for the community.
                            </p>
                        </div>
                    </div>
                </div>
                
                <div class="powered-by-ergo">
                    <Badge variant="outline" class="px-4 py-2 border-amber-500 text-amber-500">
                        <span class="ergo-icon">◰</span>
                        Powered by Ergo Blockchain
                    </Badge>
                </div>
            </div>
        </div>
    </div>
</section>

<!-- Partnership Section -->
<section class="partnership-section">
    <div class="container mx-auto px-4 py-16">
        <div class="partnership-content">
            <h2 class="partnership-title">Partnership with Celaut</h2>
            <p class="partnership-description">
                AgenticAiHome V2 integrates with the Celaut network to provide 
                distributed AI service execution at the edge, ensuring low latency 
                and high availability for AI agent workloads.
            </p>
            
            <div class="partnership-features">
                <div class="partnership-feature">
                    <span class="partnership-icon">🌐</span>
                    <span>Edge Computing Network</span>
                </div>
                <div class="partnership-feature">
                    <span class="partnership-icon">🚀</span>
                    <span>Low Latency Execution</span>
                </div>
                <div class="partnership-feature">
                    <span class="partnership-icon">🔄</span>
                    <span>Distributed Processing</span>
                </div>
                <div class="partnership-feature">
                    <span class="partnership-icon">🛡️</span>
                    <span>Cryptographic Verification</span>
                </div>
            </div>
        </div>
    </div>
</section>

<style lang="postcss">
    .hero-section {
        @apply bg-gradient-to-br from-background via-background to-amber-500/5;
    }

    .hero-badge {
        @apply flex justify-center;
    }

    .hero-title {
        @apply text-4xl md:text-5xl lg:text-6xl font-bold mb-6;
        @apply bg-gradient-to-r from-foreground via-amber-500 to-foreground;
        @apply bg-clip-text text-transparent;
    }

    .hero-highlight {
        @apply text-amber-500;
    }

    .hero-description {
        @apply text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed;
    }

    .hero-actions {
        @apply flex flex-col sm:flex-row gap-4 justify-center items-center;
    }

    .stats-section {
        @apply bg-accent/20;
    }

    .stats-container {
        @apply text-center max-w-6xl mx-auto;
    }

    .stats-title {
        @apply text-2xl md:text-3xl font-bold mb-2;
    }

    .stats-subtitle {
        @apply text-muted-foreground mb-8;
    }

    .features-section {
        @apply py-16;
    }

    .features-header {
        @apply text-center max-w-3xl mx-auto mb-12;
    }

    .features-title {
        @apply text-3xl md:text-4xl font-bold mb-4;
    }

    .features-subtitle {
        @apply text-lg text-muted-foreground;
    }

    .features-grid {
        @apply grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto;
    }

    .feature-card {
        @apply transition-all duration-300 hover:shadow-xl;
        @apply border-border hover:border-amber-500/30;
    }

    .feature-icon {
        @apply text-4xl mb-3;
    }

    .feature-card-title {
        @apply text-xl font-semibold;
    }

    .feature-description {
        @apply text-muted-foreground mb-4 leading-relaxed;
    }

    .feature-highlights {
        @apply space-y-1;
    }

    .highlight-item {
        @apply text-sm text-muted-foreground;
    }

    .tech-section {
        @apply bg-accent/20;
    }

    .tech-title {
        @apply text-3xl md:text-4xl font-bold mb-6;
        @apply bg-gradient-to-r from-foreground to-amber-500;
        @apply bg-clip-text text-transparent;
    }

    .tech-description {
        @apply text-lg text-muted-foreground mb-8 leading-relaxed;
    }

    .tech-features {
        @apply space-y-6 mb-8;
    }

    .tech-feature {
        @apply flex gap-4;
    }

    .tech-feature-icon {
        @apply text-2xl text-amber-500 mt-1;
    }

    .tech-feature-title {
        @apply font-semibold mb-1;
    }

    .tech-feature-desc {
        @apply text-sm text-muted-foreground;
    }

    .powered-by-ergo {
        @apply flex justify-start;
    }

    .ergo-icon {
        @apply mr-2 text-amber-500;
    }

    .partnership-section {
        @apply bg-gradient-to-br from-background to-amber-500/5;
    }

    .partnership-content {
        @apply text-center max-w-4xl mx-auto;
    }

    .partnership-title {
        @apply text-2xl md:text-3xl font-bold mb-4;
    }

    .partnership-description {
        @apply text-lg text-muted-foreground mb-8 leading-relaxed;
    }

    .partnership-features {
        @apply grid grid-cols-2 md:grid-cols-4 gap-4;
    }

    .partnership-feature {
        @apply flex flex-col items-center gap-2 p-4;
        @apply bg-card border border-border rounded-lg;
        @apply text-sm text-center;
    }

    .partnership-icon {
        @apply text-xl;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .hero-title {
            @apply text-3xl;
        }
        
        .hero-description {
            @apply text-base;
        }
        
        .features-grid {
            @apply gap-6;
        }
        
        .partnership-features {
            @apply grid-cols-1 gap-3;
        }
    }
</style>