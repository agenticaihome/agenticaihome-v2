<script lang="ts">
    import { onMount } from 'svelte';
    import { connected, balance, address } from '$lib/common/store';
    import { PLATFORM_FEE_PERCENT, ESCROW_CONTRACT_V2 } from '$lib/common/constants';
    import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import { Alert, AlertDescription } from '$lib/components/ui/alert';

    // Form state
    let serviceHash = '';
    let ergAmount = '';
    let minReputation = '100';
    let deadline = '';
    
    // Transaction state
    let isLoading = false;
    let transactionId: string | null = null;
    let errorMessage: string | null = null;
    
    // Validation state
    let hashError = '';
    let amountError = '';
    let deadlineError = '';

    function validateServiceHash(): boolean {
        hashError = '';
        if (!serviceHash.trim()) {
            hashError = 'Service hash is required';
            return false;
        }
        if (serviceHash.length < 32) {
            hashError = 'Service hash must be at least 32 characters';
            return false;
        }
        return true;
    }

    function validateAmount(): boolean {
        amountError = '';
        const amount = parseFloat(ergAmount);
        
        if (!ergAmount.trim()) {
            amountError = 'ERG amount is required';
            return false;
        }
        
        if (isNaN(amount) || amount <= 0) {
            amountError = 'Amount must be a positive number';
            return false;
        }
        
        if (amount < 0.001) {
            amountError = 'Minimum amount is 0.001 ERG';
            return false;
        }
        
        const userBalance = $balance ? $balance / 1_000_000_000 : 0;
        if (amount > userBalance) {
            amountError = `Insufficient balance. You have ${userBalance.toFixed(6)} ERG`;
            return false;
        }
        
        return true;
    }

    function validateDeadline(): boolean {
        deadlineError = '';
        if (!deadline.trim()) {
            deadlineError = 'Deadline is required';
            return false;
        }
        
        const deadlineDate = new Date(deadline);
        const now = new Date();
        
        if (deadlineDate <= now) {
            deadlineError = 'Deadline must be in the future';
            return false;
        }
        
        // Check if deadline is too far in the future (1 year max)
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        if (deadlineDate > oneYearFromNow) {
            deadlineError = 'Deadline cannot be more than 1 year in the future';
            return false;
        }
        
        return true;
    }

    function validateForm(): boolean {
        const hashValid = validateServiceHash();
        const amountValid = validateAmount();
        const deadlineValid = validateDeadline();
        
        return hashValid && amountValid && deadlineValid;
    }

    function calculatePlatformFee(): number {
        if (!ergAmount) return 0;
        const amount = parseFloat(ergAmount);
        return isNaN(amount) ? 0 : amount * (PLATFORM_FEE_PERCENT / 100);
    }

    function calculateTotalCost(): number {
        if (!ergAmount) return 0;
        const amount = parseFloat(ergAmount);
        const fee = calculatePlatformFee();
        return isNaN(amount) ? 0 : amount + fee;
    }

    function formatErg(amount: number): string {
        return amount.toFixed(6);
    }

    function getTomorrowDate(): string {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(12, 0, 0, 0); // Set to noon
        return tomorrow.toISOString().slice(0, 16); // Format for datetime-local input
    }

    async function handleExecute() {
        // Execution is not yet available — pending Celaut integration
        errorMessage = 'Service execution is coming soon. We are currently designing the game theory and integration with the Celaut execution network.';
    }

    function handleServiceHashInput() {
        if (hashError) validateServiceHash();
    }

    function handleAmountInput() {
        if (amountError) validateAmount();
    }

    function handleDeadlineInput() {
        if (deadlineError) validateDeadline();
    }

    onMount(() => {
        // Set default deadline to tomorrow at noon
        deadline = getTomorrowDate();
    });
</script>

<svelte:head>
    <title>Execute Service - AgenticAiHome V2</title>
    <meta name="description" content="Request AI service execution on the decentralized AgenticAiHome network. Lock ERG, set minimum reputation, let the best node execute." />
</svelte:head>

<div class="execute-page">
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="page-header">
            <h1 class="page-title">⚡ Execute a Service</h1>
            <p class="page-description">
                Lock ERG in a contract specifying service hash, minimum reputation threshold, 
                and deadline. After the deadline, the node with the highest reputation 
                (above your minimum) claims the ERG and executes the service.
            </p>
        </div>

        <!-- Main Form -->
        <div class="execute-form">
            <Card class="form-card">
                <CardHeader>
                    <CardTitle class="text-xl">Service Execution Request</CardTitle>
                    <p class="text-sm text-muted-foreground">
                        Provide service details and lock payment
                    </p>
                </CardHeader>
                <CardContent>
                    {#if !$connected}
                        <!-- Wallet Connection Required -->
                        <div class="connect-required">
                            <div class="connect-icon">🔗</div>
                            <h3 class="connect-title">Connect Your Wallet</h3>
                            <p class="connect-description">
                                You need to connect your Nautilus wallet to execute services 
                                to request service execution.
                            </p>
                        </div>
                    {:else}
                        <!-- Execution Form -->
                        <form on:submit|preventDefault={handleExecute} class="execution-form">
                            <!-- Service Hash -->
                            <div class="form-field">
                                <Label for="serviceHash">Service Hash</Label>
                                <Input
                                    id="serviceHash"
                                    type="text"
                                    placeholder="Enter the service hash (e.g., 1a2b3c4d5e6f...)"
                                    bind:value={serviceHash}
                                    on:input={handleServiceHashInput}
                                    class={hashError ? 'error' : ''}
                                    disabled={isLoading}
                                />
                                {#if hashError}
                                    <div class="field-error">{hashError}</div>
                                {/if}
                                <div class="field-help">
                                    You can find service hashes in the 
                                    <a href="/services" class="help-link">Service Explorer</a>
                                </div>
                            </div>

                            <!-- ERG Amount -->
                            <div class="form-field">
                                <Label for="ergAmount">ERG Amount to Lock</Label>
                                <Input
                                    id="ergAmount"
                                    type="number"
                                    step="0.000001"
                                    min="0.001"
                                    placeholder="e.g., 1.5"
                                    bind:value={ergAmount}
                                    on:input={handleAmountInput}
                                    class={amountError ? 'error' : ''}
                                    disabled={isLoading}
                                />
                                {#if amountError}
                                    <div class="field-error">{amountError}</div>
                                {/if}
                                <div class="field-help">
                                    Amount will be locked until service completion
                                    {#if $balance}
                                        <span class="balance-info">
                                            (Balance: {formatErg($balance / 1_000_000_000)} ERG)
                                        </span>
                                    {/if}
                                </div>
                            </div>

                            <!-- Minimum Reputation -->
                            <div class="form-field">
                                <Label for="minReputation">Minimum Node Reputation (R)</Label>
                                <Input
                                    id="minReputation"
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="e.g., 100"
                                    bind:value={minReputation}
                                    disabled={isLoading}
                                />
                                <div class="field-help">
                                    Only nodes with reputation ≥ R can claim this job. 
                                    Higher = more trusted nodes, fewer candidates.
                                </div>
                            </div>

                            <!-- Deadline -->
                            <div class="form-field">
                                <Label for="deadline">Execution Deadline (Block T)</Label>
                                <Input
                                    id="deadline"
                                    type="datetime-local"
                                    bind:value={deadline}
                                    on:input={handleDeadlineInput}
                                    class={deadlineError ? 'error' : ''}
                                    disabled={isLoading}
                                />
                                {#if deadlineError}
                                    <div class="field-error">{deadlineError}</div>
                                {/if}
                                <div class="field-help">
                                    Service must complete before this deadline for automatic payment
                                </div>
                            </div>

                            <!-- Cost Breakdown -->
                            {#if ergAmount && !isNaN(parseFloat(ergAmount))}
                                <div class="cost-breakdown">
                                    <h3 class="breakdown-title">Cost Breakdown</h3>
                                    <div class="breakdown-items">
                                        <div class="breakdown-item">
                                            <span class="item-label">Service Payment</span>
                                            <span class="item-value">{formatErg(parseFloat(ergAmount))} ERG</span>
                                        </div>
                                        <div class="breakdown-item">
                                            <span class="item-label">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
                                            <span class="item-value">{formatErg(calculatePlatformFee())} ERG</span>
                                        </div>
                                        <div class="breakdown-divider"></div>
                                        <div class="breakdown-item total">
                                            <span class="item-label">Total Cost</span>
                                            <span class="item-value">{formatErg(calculateTotalCost())} ERG</span>
                                        </div>
                                    </div>
                                </div>
                            {/if}

                            <!-- Submit Button -->
                            <Button
                                type="submit"
                                size="lg"
                                class="submit-button"
                                disabled={isLoading}
                            >
                                🚧 Coming Soon — Celaut Integration Pending
                            </Button>
                        </form>

                        {#if errorMessage}
                            <Alert class="error-alert">
                                <AlertDescription>
                                    <div class="error-content">
                                        <div class="error-icon">❌</div>
                                        <div>
                                            <div class="error-title">Transaction Failed</div>
                                            <div class="error-details">{errorMessage}</div>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        {/if}
                    {/if}
                </CardContent>
            </Card>
        </div>

        <!-- How It Works -->
        <div class="how-it-works">
            <Card class="info-card">
                <CardHeader>
                    <CardTitle class="text-lg">How Service Execution Works</CardTitle>
                </CardHeader>
                <CardContent>
                    <div class="workflow-steps">
                        <div class="workflow-step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4 class="step-title">Lock ERG + Define Terms</h4>
                                <p class="step-description">
                                    You lock X ERG in a contract specifying: service hash (S), 
                                    minimum reputation (R), and deadline block (T).
                                </p>
                            </div>
                        </div>
                        
                        <div class="workflow-step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4 class="step-title">Nodes Compete by Reputation</h4>
                                <p class="step-description">
                                    Nodes on the Celaut network see your request on-chain. 
                                    After deadline T, the node with the highest reputation 
                                    (above minimum R) can claim the ERG.
                                </p>
                            </div>
                        </div>
                        
                        <div class="workflow-step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4 class="step-title">Node Executes Service</h4>
                                <p class="step-description">
                                    The winning node executes service S. Their reputation is 
                                    at stake — dishonest execution results in negative reputation.
                                </p>
                            </div>
                        </div>
                        
                        <div class="workflow-step">
                            <div class="step-number">4</div>
                            <div class="step-content">
                                <h4 class="step-title">Bilateral Rating</h4>
                                <p class="step-description">
                                    Both client and node rate each other. Reputation updates 
                                    on-chain, building trust for future interactions.
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- TODO Notice -->
        <div class="todo-section">
            <Alert class="todo-alert">
                <AlertDescription>
                    <div class="todo-content">
                        <div class="todo-icon">🚧</div>
                        <div class="todo-text">
                            <h3 class="todo-title">Celaut Integration in Progress</h3>
                            <p class="todo-description">
                                The current implementation is a preview. 
                                Full integration with the Celaut execution network will enable:
                            </p>
                            <div class="todo-features">
                                <div class="todo-feature">✓ Real service execution on edge nodes</div>
                                <div class="todo-feature">✓ Cryptographic proof of completion</div>
                                <div class="todo-feature">✓ Automatic payment settlement</div>
                                <div class="todo-feature">✓ Dispute resolution mechanisms</div>
                            </div>
                        </div>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    </div>
</div>

<style lang="postcss">
    .execute-page {
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

    .execute-form {
        @apply max-w-2xl mx-auto mb-8;
    }

    .form-card {
        @apply border-border;
    }

    .connect-required {
        @apply text-center py-12;
    }

    .connect-icon {
        @apply text-6xl mb-4;
    }

    .connect-title {
        @apply text-xl font-semibold mb-2;
    }

    .connect-description {
        @apply text-muted-foreground leading-relaxed;
    }

    .execution-form {
        @apply space-y-6;
    }

    .form-field {
        @apply space-y-2;
    }

    .form-field :global(input.error) {
        @apply border-red-500 focus:border-red-500;
    }

    .field-error {
        @apply text-sm text-red-500;
    }

    .field-help {
        @apply text-xs text-muted-foreground;
    }

    .help-link {
        @apply text-amber-500 hover:text-amber-400 underline;
    }

    .balance-info {
        @apply text-amber-600 dark:text-amber-400;
    }

    .cost-breakdown {
        @apply bg-accent/20 border border-border rounded-lg p-4;
    }

    .breakdown-title {
        @apply font-semibold mb-3;
    }

    .breakdown-items {
        @apply space-y-2;
    }

    .breakdown-item {
        @apply flex justify-between items-center text-sm;
    }

    .breakdown-item.total {
        @apply text-base font-semibold;
    }

    .item-label {
        @apply text-muted-foreground;
    }

    .item-value {
        @apply font-mono;
    }

    .breakdown-divider {
        @apply border-t border-border my-2;
    }

    .submit-button {
        @apply w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold;
    }

    .loading-spinner {
        @apply mr-2 animate-spin;
    }

    .success-alert {
        @apply border-green-500/20 bg-green-500/5 mt-6;
    }

    .success-content {
        @apply flex gap-3;
    }

    .success-icon {
        @apply text-xl flex-shrink-0;
    }

    .success-title {
        @apply font-semibold text-green-700 dark:text-green-400;
    }

    .success-details {
        @apply text-sm text-muted-foreground mt-1;
    }

    .success-next {
        @apply text-sm text-muted-foreground mt-2;
    }

    .tx-id {
        @apply bg-muted px-1 py-0.5 rounded font-mono text-xs;
    }

    .error-alert {
        @apply border-red-500/20 bg-red-500/5 mt-6;
    }

    .error-content {
        @apply flex gap-3;
    }

    .error-icon {
        @apply text-xl flex-shrink-0;
    }

    .error-title {
        @apply font-semibold text-red-700 dark:text-red-400;
    }

    .error-details {
        @apply text-sm text-muted-foreground mt-1;
    }

    .how-it-works {
        @apply max-w-4xl mx-auto mb-8;
    }

    .info-card {
        @apply border-border;
    }

    .workflow-steps {
        @apply space-y-4;
    }

    .workflow-step {
        @apply flex gap-4;
    }

    .step-number {
        @apply w-8 h-8 bg-amber-500 text-black font-bold rounded-full;
        @apply flex items-center justify-center text-sm flex-shrink-0;
    }

    .step-content {
        @apply flex-1;
    }

    .step-title {
        @apply font-semibold mb-1;
    }

    .step-description {
        @apply text-sm text-muted-foreground leading-relaxed;
    }

    .todo-section {
        @apply max-w-4xl mx-auto;
    }

    .todo-alert {
        @apply border-amber-500/20 bg-amber-500/5;
    }

    .todo-content {
        @apply flex gap-4;
    }

    .todo-icon {
        @apply text-3xl text-amber-500 flex-shrink-0;
    }

    .todo-title {
        @apply font-semibold mb-2 text-amber-600 dark:text-amber-400;
    }

    .todo-description {
        @apply text-muted-foreground mb-3 leading-relaxed;
    }

    .todo-features {
        @apply space-y-1 text-sm text-muted-foreground;
    }

    .todo-feature {
        @apply flex items-center gap-1;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
        .page-title {
            @apply text-2xl;
        }
        
        .breakdown-item {
            @apply text-xs;
        }
        
        .workflow-step {
            @apply flex-col gap-2;
        }
        
        .step-number {
            @apply w-6 h-6 text-xs;
        }
        
        .todo-content {
            @apply flex-col gap-3;
        }
    }
</style>