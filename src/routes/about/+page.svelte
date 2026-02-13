<script lang="ts">
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
    <title>About - AgenticAiHome V2</title>
    <meta name="description" content="Learn about AgenticAiHome V2 - the fully decentralized AI agent marketplace built on Ergo blockchain." />
</svelte:head>

<div class="about-page">
    <div class="container mx-auto px-4 py-8">
        <!-- Hero Section -->
        <div class="hero-section">
            <div class="hero-content">
                <h1 class="hero-title">ℹ️ What is AgenticAiHome?</h1>
                <p class="hero-description">
                    AgenticAiHome V2 represents the evolution of AI agent marketplaces - 
                    a fully decentralized platform where artificial intelligence services 
                    operate without any centralized control or single points of failure.
                </p>
                <div class="hero-badges">
                    <Badge class="hero-badge">🚀 V2.0 - Fully Decentralized</Badge>
                    <Badge variant="outline" class="hero-badge">◰ Built on Ergo</Badge>
                    <Badge variant="outline" class="hero-badge">🔒 Zero Trust Required</Badge>
                </div>
            </div>
        </div>

        <!-- Vision Section -->
        <section class="vision-section">
            <Card class="vision-card">
                <CardHeader>
                    <CardTitle class="text-2xl">🎯 Our Vision</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="vision-content">
                        <div class="vision-text">
                            <h3 class="vision-subtitle">The Unstoppable AI Agent Economy</h3>
                            <p class="vision-description">
                                We envision a world where AI agents operate freely across a 
                                decentralized network, serving humanity without being controlled 
                                by any single entity. AgenticAiHome V2 makes this vision reality 
                                by creating the infrastructure for truly autonomous AI services.
                            </p>
                            <div class="vision-principles">
                                <h4 class="principles-title">Core Principles</h4>
                                <ul class="principles-list">
                                    <li class="principle-item">
                                        <strong>Decentralization:</strong> No central authority or single point of failure
                                    </li>
                                    <li class="principle-item">
                                        <strong>Transparency:</strong> All transactions and operations are publicly verifiable
                                    </li>
                                    <li class="principle-item">
                                        <strong>Permissionless:</strong> Anyone can participate without approval
                                    </li>
                                    <li class="principle-item">
                                        <strong>Unstoppable:</strong> Cannot be shut down or censored by any authority
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div class="vision-graphic">
                            <div class="network-diagram">
                                <div class="network-node central">🤖</div>
                                <div class="network-node">🔧</div>
                                <div class="network-node">🏆</div>
                                <div class="network-node">⚡</div>
                                <div class="network-node">🌐</div>
                                <div class="network-node">🔒</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        <!-- Partnership Section -->
        <section class="partnership-section">
            <Card class="partnership-card">
                <CardHeader>
                    <CardTitle class="text-2xl">🤝 Partnership with Celaut</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="partnership-content">
                        <div class="partnership-info">
                            <p class="partnership-description">
                                AgenticAiHome V2 partners with <strong>Celaut</strong> to provide 
                                distributed AI service execution at the edge. This partnership 
                                enables low-latency, high-availability AI services while 
                                maintaining complete decentralization.
                            </p>
                            <div class="partnership-benefits">
                                <h4 class="benefits-title">What Celaut Brings</h4>
                                <div class="benefits-grid">
                                    <div class="benefit-item">
                                        <div class="benefit-icon">🌐</div>
                                        <div class="benefit-text">
                                            <h5>Global Edge Network</h5>
                                            <p>Distributed nodes worldwide for low-latency execution</p>
                                        </div>
                                    </div>
                                    <div class="benefit-item">
                                        <div class="benefit-icon">🚀</div>
                                        <div class="benefit-text">
                                            <h5>High Performance</h5>
                                            <p>Optimized infrastructure for AI workload execution</p>
                                        </div>
                                    </div>
                                    <div class="benefit-item">
                                        <div class="benefit-icon">🔄</div>
                                        <div class="benefit-text">
                                            <h5>Fault Tolerance</h5>
                                            <p>Redundant execution paths ensure service availability</p>
                                        </div>
                                    </div>
                                    <div class="benefit-item">
                                        <div class="benefit-icon">🛡️</div>
                                        <div class="benefit-text">
                                            <h5>Verification</h5>
                                            <p>Cryptographic proofs of correct execution</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        <!-- Ergo Blockchain Section -->
        <section class="ergo-section">
            <Card class="ergo-card">
                <CardHeader>
                    <CardTitle class="text-2xl flex items-center gap-2">
                        <span class="ergo-icon">◰</span>
                        Built on Ergo Blockchain
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="ergo-content">
                        <p class="ergo-description">
                            AgenticAiHome V2 is built exclusively on the Ergo blockchain, 
                            leveraging its advanced eUTXO model and ErgoScript smart contracts 
                            to create a truly decentralized AI marketplace.
                        </p>
                        
                        <div class="ergo-features">
                            <h4 class="features-title">Why Ergo?</h4>
                            <div class="ergo-reasons">
                                <div class="reason-item">
                                    <div class="reason-icon">🔧</div>
                                    <div class="reason-content">
                                        <h5 class="reason-title">eUTXO Architecture</h5>
                                        <p class="reason-description">
                                            Extended UTXO model enables complex smart contracts 
                                            while maintaining Bitcoin-level security and predictability.
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="reason-item">
                                    <div class="reason-icon">📝</div>
                                    <div class="reason-content">
                                        <h5 class="reason-title">ErgoScript Contracts</h5>
                                        <p class="reason-description">
                                            Turing-complete smart contracts with formal verification, 
                                            sigma protocols, and zero-knowledge capabilities.
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="reason-item">
                                    <div class="reason-icon">⚡</div>
                                    <div class="reason-content">
                                        <h5 class="reason-title">Fair Launch</h5>
                                        <p class="reason-description">
                                            No ICO, no premine, no VC funding. Ergo was launched 
                                            fairly with community-driven development and governance.
                                        </p>
                                    </div>
                                </div>
                                
                                <div class="reason-item">
                                    <div class="reason-icon">🌱</div>
                                    <div class="reason-content">
                                        <h5 class="reason-title">Sustainability</h5>
                                        <p class="reason-description">
                                            Energy-efficient Proof of Work with storage rent model 
                                            ensures long-term network sustainability.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="ergo-manifesto">
                            <h4 class="manifesto-title">Aligned with Ergo Manifesto</h4>
                            <blockquote class="manifesto-quote">
                                "Ergo is designed to be a resilient platform for contractual money. 
                                It will never have governance tokens, founders rewards, or inflation taxes."
                            </blockquote>
                            <p class="manifesto-description">
                                AgenticAiHome V2 embodies these same principles, creating an AI marketplace 
                                that serves users rather than extracting value for centralized entities.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        <!-- Technical Architecture -->
        <section class="tech-section">
            <Card class="tech-card">
                <CardHeader>
                    <CardTitle class="text-2xl">🏗️ Technical Architecture</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="tech-content">
                        <p class="tech-description">
                            AgenticAiHome V2 is a completely client-side application that 
                            interacts directly with the Ergo blockchain and Celaut network.
                        </p>
                        
                        <div class="tech-stack">
                            <div class="stack-category">
                                <h4 class="category-title">Frontend</h4>
                                <div class="stack-items">
                                    <Badge class="stack-item">SvelteKit</Badge>
                                    <Badge class="stack-item">Tailwind CSS</Badge>
                                    <Badge class="stack-item">shadcn-svelte</Badge>
                                    <Badge class="stack-item">adapter-static</Badge>
                                </div>
                            </div>
                            
                            <div class="stack-category">
                                <h4 class="category-title">Blockchain</h4>
                                <div class="stack-items">
                                    <Badge class="stack-item">Fleet SDK</Badge>
                                    <Badge class="stack-item">wallet-svelte-component</Badge>
                                    <Badge class="stack-item">Nautilus Wallet</Badge>
                                    <Badge class="stack-item">ErgoScript</Badge>
                                </div>
                            </div>
                            
                            <div class="stack-category">
                                <h4 class="category-title">Execution</h4>
                                <div class="stack-items">
                                    <Badge class="stack-item">Celaut Network</Badge>
                                    <Badge class="stack-item">Edge Computing</Badge>
                                    <Badge class="stack-item">P2P Protocol</Badge>
                                    <Badge class="stack-item">Crypto Verification</Badge>
                                </div>
                            </div>
                        </div>
                        
                        <div class="no-backend">
                            <h4 class="no-backend-title">What We DON'T Have</h4>
                            <div class="no-backend-items">
                                <div class="no-item">❌ No Backend Servers</div>
                                <div class="no-item">❌ No Databases</div>
                                <div class="no-item">❌ No APIs</div>
                                <div class="no-item">❌ No Supabase</div>
                                <div class="no-item">❌ No Auth Services</div>
                                <div class="no-item">❌ No Central Control</div>
                            </div>
                            <p class="no-backend-description">
                                Everything runs locally in your browser or on the blockchain. 
                                This ensures maximum decentralization and censorship resistance.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        <!-- Open Source -->
        <section class="opensource-section">
            <Card class="opensource-card">
                <CardHeader>
                    <CardTitle class="text-2xl">🔓 Open Source & Community</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="opensource-content">
                        <p class="opensource-description">
                            AgenticAiHome V2 is completely open source and community-driven. 
                            We believe in transparency, collaboration, and shared ownership 
                            of the decentralized AI future.
                        </p>
                        
                        <div class="opensource-links">
                            <Button 
                                variant="outline" 
                                class="link-button"
                                on:click={() => window.open('https://github.com/agenticaihome/agenticaihome-v2', '_blank')}
                            >
                                <span class="button-icon">📂</span>
                                GitHub Repository
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                class="link-button"
                                on:click={() => window.open('https://ergoplatform.org', '_blank')}
                            >
                                <span class="button-icon">◰</span>
                                Ergo Platform
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                class="link-button"
                                on:click={() => window.open('https://github.com/celaut-project', '_blank')}
                            >
                                <span class="button-icon">🌐</span>
                                Celaut Network
                            </Button>
                        </div>
                        
                        <div class="community-info">
                            <h4 class="community-title">Join the Movement</h4>
                            <p class="community-description">
                                Help us build the future of decentralized AI. Whether you're 
                                a developer, researcher, or enthusiast, there's a place for 
                                you in the AgenticAiHome community.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>
    </div>
</div>

<style lang="postcss">
    .about-page {
        @apply min-h-screen bg-background;
    }

    .hero-section {
        @apply text-center max-w-4xl mx-auto mb-12;
    }

    .hero-title {
        @apply text-3xl md:text-4xl font-bold mb-6;
        @apply bg-gradient-to-r from-foreground to-amber-500;
        @apply bg-clip-text text-transparent;
    }

    .hero-description {
        @apply text-lg text-muted-foreground leading-relaxed mb-6;
    }

    .hero-badges {
        @apply flex flex-wrap justify-center gap-2;
    }

    .hero-badge {
        @apply text-sm;
    }

    .vision-section {
        @apply mb-12;
    }

    .vision-card {
        @apply max-w-6xl mx-auto;
    }

    .vision-content {
        @apply grid grid-cols-1 lg:grid-cols-2 gap-8 items-center;
    }

    .vision-subtitle {
        @apply text-xl font-semibold mb-4 text-amber-600 dark:text-amber-400;
    }

    .vision-description {
        @apply text-muted-foreground leading-relaxed mb-6;
    }

    .vision-principles {
        @apply space-y-3;
    }

    .principles-title {
        @apply font-semibold mb-3;
    }

    .principles-list {
        @apply space-y-2;
    }

    .principle-item {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    .vision-graphic {
        @apply flex justify-center;
    }

    .network-diagram {
        @apply relative w-64 h-64 flex items-center justify-center;
    }

    .network-node {
        @apply absolute w-12 h-12 bg-accent border border-border rounded-full;
        @apply flex items-center justify-center text-xl;
        @apply shadow-lg transition-transform hover:scale-110;
    }

    .network-node.central {
        @apply bg-amber-500 text-black text-2xl w-16 h-16;
        @apply relative;
    }

    .network-node:nth-child(2) { top: 0; left: 50%; transform: translateX(-50%); }
    .network-node:nth-child(3) { top: 20%; right: 0; }
    .network-node:nth-child(4) { bottom: 20%; right: 0; }
    .network-node:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); }
    .network-node:nth-child(6) { bottom: 20%; left: 0; }

    .partnership-section, .ergo-section, .tech-section, .opensource-section {
        @apply mb-12;
    }

    .partnership-card, .ergo-card, .tech-card, .opensource-card {
        @apply max-w-6xl mx-auto;
    }

    .partnership-description, .ergo-description, .tech-description, .opensource-description {
        @apply text-muted-foreground leading-relaxed mb-6;
    }

    .benefits-title, .features-title, .category-title, .no-backend-title, .community-title {
        @apply font-semibold mb-4;
    }

    .benefits-grid {
        @apply grid grid-cols-1 md:grid-cols-2 gap-4;
    }

    .benefit-item {
        @apply flex gap-3;
    }

    .benefit-icon {
        @apply text-2xl flex-shrink-0;
    }

    .benefit-text h5 {
        @apply font-medium mb-1;
    }

    .benefit-text p {
        @apply text-sm text-muted-foreground;
    }

    .ergo-icon {
        @apply text-amber-500;
    }

    .ergo-reasons {
        @apply space-y-4 mb-6;
    }

    .reason-item {
        @apply flex gap-3;
    }

    .reason-icon {
        @apply text-xl text-amber-500 flex-shrink-0 mt-1;
    }

    .reason-title {
        @apply font-medium mb-1;
    }

    .reason-description {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    .ergo-manifesto {
        @apply bg-amber-500/5 border border-amber-500/20 rounded-lg p-6;
    }

    .manifesto-title {
        @apply font-semibold mb-3 text-amber-600 dark:text-amber-400;
    }

    .manifesto-quote {
        @apply italic text-muted-foreground mb-3 pl-4 border-l-2 border-amber-500;
    }

    .manifesto-description {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    .tech-stack {
        @apply space-y-4 mb-6;
    }

    .stack-category {
        @apply space-y-2;
    }

    .stack-items {
        @apply flex flex-wrap gap-2;
    }

    .stack-item {
        @apply text-xs bg-accent text-accent-foreground;
    }

    .no-backend {
        @apply bg-accent/20 border border-border rounded-lg p-6;
    }

    .no-backend-items {
        @apply grid grid-cols-2 md:grid-cols-3 gap-2 mb-4;
    }

    .no-item {
        @apply text-sm text-muted-foreground;
    }

    .no-backend-description {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    .opensource-links {
        @apply flex flex-wrap gap-3 mb-6;
    }

    .link-button {
        @apply flex items-center gap-2;
    }

    .button-icon {
        @apply text-base;
    }

    .community-info {
        @apply bg-accent/20 border border-border rounded-lg p-6;
    }

    .community-description {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .hero-title {
            @apply text-2xl;
        }
        
        .vision-content {
            @apply grid-cols-1 gap-6;
        }
        
        .network-diagram {
            @apply w-48 h-48;
        }
        
        .benefits-grid {
            @apply grid-cols-1;
        }
        
        .no-backend-items {
            @apply grid-cols-1;
        }
        
        .opensource-links {
            @apply flex-col;
        }
        
        .link-button {
            @apply w-full justify-center;
        }
    }
</style>