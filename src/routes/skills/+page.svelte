<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	// Skill type definition
	interface QualityConstraints {
		latency: string;
		accuracyTier: string;
		maxCostErg?: string;
	}

	interface MockProvider {
		name: string;
		address: string;
		reputation: number;
		executions: number;
		costPerRunErg: string;
	}

	interface Skill {
		id: string;
		name: string;
		icon: string;
		description: string;
		problemStatement: string;
		inputType: string;
		outputType: string;
		qualityConstraints: QualityConstraints;
		status: 'available' | 'awaiting-celaut';
		serviceCount: number;
		mockProviders?: MockProvider[];
		tags: string[];
	}

	// Skill registry data — "Skills" = problems to be solved, not solutions
	const skills: Skill[] = [
		{
			id: 'audio-transcription',
			name: 'Audio Transcription',
			icon: '🎙️',
			description: 'Convert spoken audio recordings into accurate written text transcripts.',
			problemStatement:
				'Given an audio file, produce a time-aligned text transcript of spoken content, handling multiple speakers and background noise.',
			inputType: 'audio/mp3, audio/wav, audio/ogg',
			outputType: 'text/plain, application/json (with timestamps)',
			qualityConstraints: {
				latency: '< 2× audio duration',
				accuracyTier: 'Word Error Rate < 5%',
				maxCostErg: '0.05 ERG / minute'
			},
			status: 'available',
			serviceCount: 2,
			mockProviders: [
				{
					name: 'WhisperNode Alpha',
					address: '9fGiW4xXvDHsJSrFVhvfC5n6M5kMb2PAZHsY3nfVLiZo',
					reputation: 4.9,
					executions: 3841,
					costPerRunErg: '0.02 ERG/min'
				},
				{
					name: 'DeepSpeech Edge',
					address: '9hAmCTbMzDmHqW1kWjzF3nM7vQKtRbNsYy2cPRm4LZuW',
					reputation: 4.6,
					executions: 1205,
					costPerRunErg: '0.015 ERG/min'
				}
			],
			tags: ['audio', 'speech', 'NLP']
		},
		{
			id: 'text-summarization',
			name: 'Text Summarization',
			icon: '📝',
			description: 'Condense long documents into concise, accurate summaries preserving key information.',
			problemStatement:
				'Given a long-form text document, produce a coherent summary of configurable length (bullet points or paragraph form) without hallucinating facts.',
			inputType: 'text/plain, text/markdown, text/html',
			outputType: 'text/plain, text/markdown',
			qualityConstraints: {
				latency: '< 10s for up to 50k tokens',
				accuracyTier: 'ROUGE-L > 0.4',
				maxCostErg: '0.01 ERG / 10k tokens'
			},
			status: 'available',
			serviceCount: 3,
			mockProviders: [
				{
					name: 'SummaryNet Pro',
					address: '9iKpTnFxJmDsLvBhGq3wRnYa8oZuXkMtC4cWpR6jNeAz',
					reputation: 4.7,
					executions: 9120,
					costPerRunErg: '0.008 ERG/10k'
				},
				{
					name: 'BrevityAI Node',
					address: '9gQrVmFzKlAsHdPjWbYe5oCt7nXuMkLsB2wNpR4iGeQx',
					reputation: 4.5,
					executions: 4380,
					costPerRunErg: '0.010 ERG/10k'
				},
				{
					name: 'CompactLM Edge',
					address: '9fTsWnGxMrBvCpKjLhYa2oDu8mZuQkNtA4cXpS6kHfBz',
					reputation: 4.3,
					executions: 1890,
					costPerRunErg: '0.006 ERG/10k'
				}
			],
			tags: ['NLP', 'text', 'summarization']
		},
		{
			id: 'image-classification',
			name: 'Image Classification',
			icon: '🖼️',
			description: 'Classify images into predefined categories with confidence scores.',
			problemStatement:
				'Given an image, return a ranked list of category labels with confidence scores from a predefined taxonomy (e.g., ImageNet-1K or custom ontology).',
			inputType: 'image/jpeg, image/png, image/webp',
			outputType: 'application/json (labels + confidence scores)',
			qualityConstraints: {
				latency: '< 500ms per image',
				accuracyTier: 'Top-5 accuracy > 92%',
				maxCostErg: '0.005 ERG / image'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['vision', 'classification', 'AI']
		},
		{
			id: 'code-review',
			name: 'Code Review',
			icon: '🔍',
			description: 'Automated code review detecting bugs, style violations, and security vulnerabilities.',
			problemStatement:
				'Given source code (single file or diff), identify bugs, security vulnerabilities, and style issues with line-level annotations and severity scores.',
			inputType: 'text/plain (source code), application/json (diff)',
			outputType: 'application/json (annotations with line refs, severity, suggestion)',
			qualityConstraints: {
				latency: '< 30s per 1000 lines',
				accuracyTier: 'Precision > 85% on known CVEs',
				maxCostErg: '0.03 ERG / 1000 LOC'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['code', 'security', 'developer']
		},
		{
			id: 'language-translation',
			name: 'Language Translation',
			icon: '🌍',
			description: 'High-quality machine translation between 100+ language pairs.',
			problemStatement:
				'Given source text and a target language code, return a fluent, semantically accurate translation maintaining tone and register.',
			inputType: 'text/plain (with language hint)',
			outputType: 'text/plain (translated)',
			qualityConstraints: {
				latency: '< 5s per paragraph',
				accuracyTier: 'BLEU > 35 for major language pairs',
				maxCostErg: '0.002 ERG / 1000 chars'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['NLP', 'translation', 'multilingual']
		},
		{
			id: 'image-generation',
			name: 'Image Generation',
			icon: '🎨',
			description: 'Generate high-quality images from text prompts using diffusion models.',
			problemStatement:
				'Given a natural language prompt and optional style parameters, produce a photorealistic or artistic image at specified resolution.',
			inputType: 'text/plain (prompt), application/json (style params)',
			outputType: 'image/png, image/jpeg',
			qualityConstraints: {
				latency: '< 15s for 1024×1024',
				accuracyTier: 'FID < 10 on standard benchmarks',
				maxCostErg: '0.05 ERG / image'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['vision', 'generative', 'creative']
		},
		{
			id: 'object-detection',
			name: 'Object Detection',
			icon: '📦',
			description: 'Locate and classify multiple objects within an image with bounding boxes.',
			problemStatement:
				'Given an image, return bounding box coordinates, class labels, and confidence scores for all detected objects above a configurable threshold.',
			inputType: 'image/jpeg, image/png',
			outputType: 'application/json (bboxes, labels, scores)',
			qualityConstraints: {
				latency: '< 200ms per image',
				accuracyTier: 'mAP > 50 on COCO-val2017',
				maxCostErg: '0.008 ERG / image'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['vision', 'detection', 'AI']
		},
		{
			id: 'sentiment-analysis',
			name: 'Sentiment Analysis',
			icon: '💬',
			description: 'Determine emotional tone and opinion polarity of text content.',
			problemStatement:
				'Given text input, return sentiment polarity (positive/neutral/negative), intensity score, and aspect-level breakdowns for structured content.',
			inputType: 'text/plain, application/json (batched)',
			outputType: 'application/json (polarity, score, aspects)',
			qualityConstraints: {
				latency: '< 100ms per request',
				accuracyTier: 'F1 > 90% on SST-2 benchmark',
				maxCostErg: '0.001 ERG / 1000 chars'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['NLP', 'sentiment', 'analytics']
		},
		{
			id: 'document-ocr',
			name: 'Document OCR',
			icon: '📄',
			description: 'Extract structured text and layout information from scanned documents and PDFs.',
			problemStatement:
				'Given a scanned image or PDF, extract all text with positional information, preserving tables, headers, and reading order.',
			inputType: 'image/jpeg, image/png, application/pdf',
			outputType: 'text/plain, application/json (structured with layout)',
			qualityConstraints: {
				latency: '< 5s per page',
				accuracyTier: 'Character Error Rate < 2% on clean docs',
				maxCostErg: '0.01 ERG / page'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['OCR', 'document', 'vision']
		},
		{
			id: 'embedding-generation',
			name: 'Embedding Generation',
			icon: '🧬',
			description: 'Convert text or images into dense vector embeddings for semantic search and similarity.',
			problemStatement:
				'Given text or image input, produce a fixed-dimension dense vector embedding suitable for nearest-neighbour similarity search.',
			inputType: 'text/plain, image/jpeg, image/png',
			outputType: 'application/json (float32 array)',
			qualityConstraints: {
				latency: '< 50ms per input',
				accuracyTier: 'MTEB score > 62',
				maxCostErg: '0.0005 ERG / embedding'
			},
			status: 'awaiting-celaut',
			serviceCount: 0,
			tags: ['embeddings', 'search', 'ML']
		}
	];

	// Filter state
	let filterStatus: 'all' | 'available' | 'awaiting-celaut' = 'all';
	let filterTag = '';

	$: allTags = Array.from(new Set(skills.flatMap((s) => s.tags))).sort();

	$: filteredSkills = skills.filter((skill) => {
		const statusMatch = filterStatus === 'all' || skill.status === filterStatus;
		const tagMatch = !filterTag || skill.tags.includes(filterTag);
		return statusMatch && tagMatch;
	});

	$: availableCount = skills.filter((s) => s.status === 'available').length;
	$: awaitingCount = skills.filter((s) => s.status === 'awaiting-celaut').length;

	// Selected skill for detail panel
	let selectedSkill: Skill | null = null;

	function selectSkill(skill: Skill) {
		selectedSkill = selectedSkill?.id === skill.id ? null : skill;
	}

	function closeDetail() {
		selectedSkill = null;
	}

	// Mock execution history for available skills
	const mockHistory = [
		{ timestamp: '2026-02-22 19:34 UTC', status: 'success', durationSec: 4.2, costErg: '0.018' },
		{ timestamp: '2026-02-22 18:11 UTC', status: 'success', durationSec: 6.7, costErg: '0.024' },
		{ timestamp: '2026-02-22 16:55 UTC', status: 'success', durationSec: 3.9, costErg: '0.015' },
		{ timestamp: '2026-02-22 14:02 UTC', status: 'success', durationSec: 8.1, costErg: '0.031' },
		{ timestamp: '2026-02-22 11:48 UTC', status: 'failed', durationSec: 30.0, costErg: '0.000' }
	];
</script>

<svelte:head>
	<title>Skill Registry - AgenticAiHome V2</title>
	<meta
		name="description"
		content="Browse the AgenticAiHome Skill Registry. Skills define the problems to be solved; services are the Celaut-powered solutions."
	/>
</svelte:head>

<div class="skills-page">
	<div class="container mx-auto px-4 py-8">
		<!-- Page Header -->
		<div class="page-header">
			<h1 class="page-title">🧠 Skill Registry</h1>
			<p class="page-description">
				<strong>Skills</strong> define <em>problems to be solved</em> — input types, output types, and quality
				constraints. <strong>Services</strong> are the Celaut-powered compute nodes that solve them.
				Request a service for any skill to execute it on the decentralized network.
			</p>

			<!-- Stats Row -->
			<div class="stats-row">
				<div class="stat-chip stat-total">
					<span class="stat-num">{skills.length}</span>
					<span class="stat-label">Total Skills</span>
				</div>
				<div class="stat-chip stat-available">
					<span class="stat-num">{availableCount}</span>
					<span class="stat-label">Available</span>
				</div>
				<div class="stat-chip stat-awaiting">
					<span class="stat-num">{awaitingCount}</span>
					<span class="stat-label">Awaiting Celaut</span>
				</div>
			</div>
		</div>

		<!-- Celaut Banner -->
		<div class="celaut-banner">
			<span class="banner-icon">🔗</span>
			<span>
				<strong>Celaut Integration Coming Soon</strong> — Skills marked "Awaiting Celaut" will become
				available when Celaut service discovery is live. Available skills use local mock providers.
			</span>
		</div>

		<!-- Filters -->
		<div class="filters-section">
			<div class="filter-group">
				<span class="filter-label">Status:</span>
				<button
					class="filter-btn"
					class:filter-btn-active={filterStatus === 'all'}
					on:click={() => (filterStatus = 'all')}
				>
					All
				</button>
				<button
					class="filter-btn filter-btn-green"
					class:filter-btn-active={filterStatus === 'available'}
					on:click={() => (filterStatus = 'available')}
				>
					✅ Available
				</button>
				<button
					class="filter-btn filter-btn-amber"
					class:filter-btn-active={filterStatus === 'awaiting-celaut'}
					on:click={() => (filterStatus = 'awaiting-celaut')}
				>
					⏳ Awaiting Celaut
				</button>
			</div>

			<div class="filter-group">
				<span class="filter-label">Tag:</span>
				<button
					class="filter-btn"
					class:filter-btn-active={filterTag === ''}
					on:click={() => (filterTag = '')}
				>
					All Tags
				</button>
				{#each allTags as tag}
					<button
						class="filter-btn"
						class:filter-btn-active={filterTag === tag}
						on:click={() => (filterTag = tag)}
					>
						{tag}
					</button>
				{/each}
			</div>
		</div>

		<!-- Results Count -->
		<div class="results-meta">
			<Badge variant="secondary">
				{filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''}
			</Badge>
			{#if filterStatus !== 'all' || filterTag}
				<button
					class="clear-filters-btn"
					on:click={() => {
						filterStatus = 'all';
						filterTag = '';
					}}
				>
					Clear filters ✕
				</button>
			{/if}
		</div>

		<!-- Skills Grid + Detail Panel -->
		<div class="content-layout" class:has-detail={selectedSkill !== null}>
			<!-- Skills Grid -->
			<div class="skills-grid">
				{#each filteredSkills as skill (skill.id)}
					{@const isAvailable = skill.status === 'available'}
					{@const isSelected = selectedSkill?.id === skill.id}
					<Card
						class="skill-card {isAvailable ? 'skill-card-available' : 'skill-card-awaiting'} {isSelected
							? 'skill-card-selected'
							: ''}"
						on:click={() => selectSkill(skill)}
					>
						<CardHeader class="pb-2">
							<div class="card-header-row">
								<span class="skill-icon">{skill.icon}</span>
								<div class="badge-group">
									{#if isAvailable}
										<span class="status-badge status-available">✅ Available</span>
									{:else}
										<span class="status-badge status-awaiting">⏳ Awaiting Celaut</span>
									{/if}
								</div>
							</div>
							<CardTitle class="skill-name">{skill.name}</CardTitle>
							<p class="skill-desc">{skill.description}</p>
						</CardHeader>

						<CardContent class="pt-0 space-y-3">
							<!-- I/O Types -->
							<div class="io-section">
								<div class="io-row">
									<span class="io-label">Input:</span>
									<span class="io-value">{skill.inputType}</span>
								</div>
								<div class="io-row">
									<span class="io-label">Output:</span>
									<span class="io-value">{skill.outputType}</span>
								</div>
							</div>

							<!-- Quality Constraints -->
							<div class="quality-section">
								<p class="quality-header">Quality Constraints</p>
								<div class="quality-pills">
									<span class="quality-pill">⏱ {skill.qualityConstraints.latency}</span>
									<span class="quality-pill">🎯 {skill.qualityConstraints.accuracyTier}</span>
									{#if skill.qualityConstraints.maxCostErg}
										<span class="quality-pill">💎 {skill.qualityConstraints.maxCostErg}</span>
									{/if}
								</div>
							</div>

							<!-- Tags -->
							<div class="tag-row">
								{#each skill.tags as tag}
									<span class="tag-chip">{tag}</span>
								{/each}
							</div>

							<!-- Footer row -->
							<div class="card-footer-row">
								<span class="service-count">
									{#if isAvailable}
										🟢 {skill.serviceCount} service{skill.serviceCount !== 1 ? 's' : ''} registered
									{:else}
										⚫ No services yet
									{/if}
								</span>

								<div class="card-actions">
									<!-- svelte-ignore a11y-click-events-have-key-events -->
									<button
										class="detail-btn"
										on:click|stopPropagation={() => selectSkill(skill)}
									>
										{isSelected ? 'Hide ↑' : 'Details →'}
									</button>
									{#if isAvailable}
										<!-- svelte-ignore a11y-click-events-have-key-events -->
										<span on:click|stopPropagation={() => selectSkill(skill)}>
											<Button
												size="sm"
												class="request-btn-available"
											>
												Request Service
											</Button>
										</span>
									{:else}
										<div class="tooltip-wrapper" title="Requires Celaut Integration">
											<Button
												size="sm"
												class="request-btn-disabled"
												disabled
											>
												🔒 Request Service
											</Button>
										</div>
									{/if}
								</div>
							</div>
						</CardContent>
					</Card>
				{/each}

				{#if filteredSkills.length === 0}
					<div class="empty-state">
						<div class="empty-icon">🔍</div>
						<h3 class="empty-title">No Skills Found</h3>
						<p class="empty-desc">Try adjusting the status or tag filters.</p>
					</div>
				{/if}
			</div>

			<!-- Detail Panel -->
			{#if selectedSkill}
				{@const skill = selectedSkill}
				{@const isAvailable = skill.status === 'available'}
				<div class="detail-panel">
					<div class="detail-header">
						<div class="detail-title-row">
							<span class="detail-icon">{skill.icon}</span>
							<div>
								<h2 class="detail-title">{skill.name}</h2>
								{#if isAvailable}
									<span class="status-badge status-available">✅ Available</span>
								{:else}
									<span class="status-badge status-awaiting">⏳ Awaiting Celaut</span>
								{/if}
							</div>
						</div>
						<button class="close-btn" on:click={closeDetail}>✕</button>
					</div>

					<div class="detail-body">
						<!-- Problem Statement -->
						<section class="detail-section">
							<h3 class="detail-section-title">Problem Statement</h3>
							<p class="detail-text">{skill.problemStatement}</p>
						</section>

						<!-- I/O Spec -->
						<section class="detail-section">
							<h3 class="detail-section-title">Input / Output Specification</h3>
							<div class="spec-table">
								<div class="spec-row">
									<span class="spec-key">Input Types</span>
									<span class="spec-val">{skill.inputType}</span>
								</div>
								<div class="spec-row">
									<span class="spec-key">Output Types</span>
									<span class="spec-val">{skill.outputType}</span>
								</div>
								<div class="spec-row">
									<span class="spec-key">Latency SLA</span>
									<span class="spec-val">{skill.qualityConstraints.latency}</span>
								</div>
								<div class="spec-row">
									<span class="spec-key">Accuracy Tier</span>
									<span class="spec-val">{skill.qualityConstraints.accuracyTier}</span>
								</div>
								{#if skill.qualityConstraints.maxCostErg}
									<div class="spec-row">
										<span class="spec-key">Max Cost</span>
										<span class="spec-val">{skill.qualityConstraints.maxCostErg}</span>
									</div>
								{/if}
							</div>
						</section>

						<!-- Service Providers -->
						<section class="detail-section">
							<h3 class="detail-section-title">
								Service Providers
								<span class="detail-count">({skill.serviceCount})</span>
							</h3>
							{#if isAvailable && skill.mockProviders?.length}
								<div class="providers-list">
									{#each skill.mockProviders as provider}
										<div class="provider-card">
											<div class="provider-header">
												<span class="provider-name">{provider.name}</span>
												<span class="provider-rep">⭐ {provider.reputation}</span>
											</div>
											<p class="provider-addr">{provider.address}</p>
											<div class="provider-meta">
												<span>🔁 {provider.executions.toLocaleString()} executions</span>
												<span>💎 {provider.costPerRunErg}</span>
											</div>
											<Button
												size="sm"
												class="provider-select-btn"
											>
												Select Provider
											</Button>
										</div>
									{/each}
								</div>
							{:else}
								<div class="no-providers">
									<span>🔒</span>
									<p>No service providers registered yet. Providers will appear here once Celaut service discovery is live.</p>
								</div>
							{/if}
						</section>

						<!-- Execution History (mock) -->
						{#if isAvailable}
							<section class="detail-section">
								<h3 class="detail-section-title">Recent Executions</h3>
								<div class="history-list">
									{#each mockHistory as entry}
										<div class="history-row">
											<span class="history-time">{entry.timestamp}</span>
											<span
												class="history-status"
												class:status-ok={entry.status === 'success'}
												class:status-err={entry.status === 'failed'}
											>
												{entry.status === 'success' ? '✅' : '❌'} {entry.status}
											</span>
											<span class="history-dur">{entry.durationSec}s</span>
											<span class="history-cost">{entry.costErg} ERG</span>
										</div>
									{/each}
								</div>
							</section>
						{/if}

						<!-- Cost Estimates -->
						<section class="detail-section">
							<h3 class="detail-section-title">Cost Estimates</h3>
							{#if isAvailable && skill.mockProviders?.length}
								<div class="cost-grid">
									<div class="cost-item">
										<span class="cost-label">Cheapest Provider</span>
										<span class="cost-val cost-val-green">
											{skill.mockProviders.reduce((a, b) =>
												parseFloat(a.costPerRunErg) < parseFloat(b.costPerRunErg) ? a : b
											).costPerRunErg}
										</span>
									</div>
									<div class="cost-item">
										<span class="cost-label">Max Cost Cap</span>
										<span class="cost-val">
											{skill.qualityConstraints.maxCostErg ?? 'Uncapped'}
										</span>
									</div>
									<div class="cost-item">
										<span class="cost-label">Network Fee</span>
										<span class="cost-val">0.001 ERG</span>
									</div>
								</div>
							{:else}
								<p class="detail-muted">Cost estimates will be available once Celaut providers register for this skill.</p>
							{/if}
						</section>
					</div>
				</div>
			{/if}
		</div>

		<!-- Bottom Celaut Notice -->
		<div class="bottom-notice">
			<Card class="notice-card">
				<CardContent class="p-6">
					<div class="notice-content">
						<div class="notice-icon">🚧</div>
						<div class="notice-text">
							<h3 class="notice-title">Celaut Integration Roadmap</h3>
							<p class="notice-desc">
								Skills marked "Awaiting Celaut" will become active once the Celaut peer-to-peer
								service discovery protocol is integrated. Celaut nodes will register themselves
								against skill definitions, and users will be able to request execution via
								ERG-locked smart contracts.
							</p>
							<div class="notice-features">
								<div class="notice-feature">✓ Decentralized service discovery</div>
								<div class="notice-feature">✓ Reputation-gated provider selection</div>
								<div class="notice-feature">✓ ERG-locked execution contracts</div>
								<div class="notice-feature">✓ On-chain result verification</div>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</div>

<style lang="postcss">
	.skills-page {
		@apply min-h-screen bg-background;
	}

	/* ── Header ─────────────────────────────────────────── */
	.page-header {
		@apply text-center max-w-3xl mx-auto mb-8;
	}

	.page-title {
		@apply text-3xl md:text-4xl font-bold mb-4;
		@apply bg-gradient-to-r from-foreground to-amber-500;
		@apply bg-clip-text text-transparent;
	}

	.page-description {
		@apply text-base md:text-lg text-muted-foreground leading-relaxed mb-6;
	}

	.stats-row {
		@apply flex justify-center gap-4 flex-wrap;
	}

	.stat-chip {
		@apply flex flex-col items-center px-5 py-3 rounded-xl border;
	}

	.stat-total {
		@apply border-border bg-card;
	}

	.stat-available {
		@apply border-green-500/30 bg-green-500/5;
	}

	.stat-awaiting {
		@apply border-amber-500/30 bg-amber-500/5;
	}

	.stat-num {
		@apply text-2xl font-bold text-foreground;
	}

	.stat-label {
		@apply text-xs text-muted-foreground mt-0.5;
	}

	/* ── Celaut Banner ───────────────────────────────────── */
	.celaut-banner {
		@apply flex items-start gap-3 p-4 mb-6 rounded-xl;
		@apply border border-amber-500/30 bg-amber-500/5;
		@apply text-sm text-amber-700 dark:text-amber-300;
	}

	.banner-icon {
		@apply text-xl flex-shrink-0;
	}

	/* ── Filters ─────────────────────────────────────────── */
	.filters-section {
		@apply flex flex-col gap-3 mb-4;
	}

	.filter-group {
		@apply flex items-center gap-2 flex-wrap;
	}

	.filter-label {
		@apply text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1;
	}

	.filter-btn {
		@apply px-3 py-1 rounded-full text-xs font-medium border border-border;
		@apply bg-card text-muted-foreground;
		@apply hover:bg-accent hover:text-foreground transition-colors cursor-pointer;
	}

	.filter-btn-active {
		@apply bg-foreground text-background border-foreground;
	}

	.filter-btn-green.filter-btn-active {
		@apply bg-green-500 text-white border-green-500;
	}

	.filter-btn-amber.filter-btn-active {
		@apply bg-amber-500 text-black border-amber-500;
	}

	/* ── Results Meta ────────────────────────────────────── */
	.results-meta {
		@apply flex items-center gap-3 mb-6;
	}

	.clear-filters-btn {
		@apply text-xs text-muted-foreground hover:text-foreground underline cursor-pointer;
	}

	/* ── Content Layout ──────────────────────────────────── */
	.content-layout {
		@apply grid grid-cols-1 gap-6 mb-10;
	}

	.content-layout.has-detail {
		@apply lg:grid-cols-2;
	}

	/* ── Skills Grid ─────────────────────────────────────── */
	.skills-grid {
		@apply grid grid-cols-1 sm:grid-cols-2 gap-4;
	}

	.has-detail .skills-grid {
		@apply grid-cols-1;
	}

	/* ── Skill Card ──────────────────────────────────────── */
	:global(.skill-card) {
		@apply cursor-pointer transition-all duration-200;
		@apply hover:shadow-lg hover:-translate-y-0.5;
	}

	:global(.skill-card-available) {
		@apply border-green-500/20 hover:border-green-500/50;
	}

	:global(.skill-card-awaiting) {
		@apply opacity-75 hover:opacity-90;
		@apply border-border hover:border-amber-500/30;
	}

	:global(.skill-card-selected) {
		@apply border-amber-500 shadow-lg shadow-amber-500/10;
	}

	.card-header-row {
		@apply flex items-start justify-between mb-1;
	}

	.skill-icon {
		@apply text-3xl;
	}

	.badge-group {
		@apply flex gap-1;
	}

	.status-badge {
		@apply text-xs font-semibold px-2 py-0.5 rounded-full;
	}

	.status-available {
		@apply bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30;
	}

	.status-awaiting {
		@apply bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30;
	}

	:global(.skill-name) {
		@apply text-base font-semibold mt-1 !important;
	}

	.skill-desc {
		@apply text-sm text-muted-foreground leading-snug mt-1;
	}

	/* ── I/O Section ─────────────────────────────────────── */
	.io-section {
		@apply space-y-1 rounded-lg p-2;
		@apply bg-muted/40 border border-border/50;
	}

	.io-row {
		@apply flex gap-2 text-xs;
	}

	.io-label {
		@apply font-semibold text-muted-foreground w-12 flex-shrink-0;
	}

	.io-value {
		@apply text-foreground/80 truncate;
	}

	/* ── Quality ─────────────────────────────────────────── */
	.quality-section {
		@apply space-y-1;
	}

	.quality-header {
		@apply text-xs font-semibold text-muted-foreground uppercase tracking-wide;
	}

	.quality-pills {
		@apply flex flex-wrap gap-1;
	}

	.quality-pill {
		@apply text-xs px-2 py-0.5 rounded-full;
		@apply bg-accent border border-border text-muted-foreground;
	}

	/* ── Tags ────────────────────────────────────────────── */
	.tag-row {
		@apply flex flex-wrap gap-1;
	}

	.tag-chip {
		@apply text-xs px-2 py-0.5 rounded-full;
		@apply bg-amber-500/10 text-amber-600 dark:text-amber-400;
		@apply border border-amber-500/20;
	}

	/* ── Card Footer ─────────────────────────────────────── */
	.card-footer-row {
		@apply flex items-center justify-between gap-2 pt-1;
	}

	.service-count {
		@apply text-xs text-muted-foreground;
	}

	.card-actions {
		@apply flex items-center gap-2;
	}

	.detail-btn {
		@apply text-xs text-amber-500 hover:text-amber-400 underline cursor-pointer;
	}

	:global(.request-btn-available) {
		@apply bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold !important;
	}

	:global(.request-btn-disabled) {
		@apply text-xs opacity-50 cursor-not-allowed !important;
	}

	.tooltip-wrapper {
		@apply relative;
	}

	/* ── Empty State ─────────────────────────────────────── */
	.empty-state {
		@apply col-span-full py-16 text-center;
	}

	.empty-icon {
		@apply text-5xl mb-4;
	}

	.empty-title {
		@apply text-lg font-semibold mb-2;
	}

	.empty-desc {
		@apply text-muted-foreground;
	}

	/* ── Detail Panel ────────────────────────────────────── */
	.detail-panel {
		@apply rounded-xl border border-border bg-card;
		@apply overflow-hidden flex flex-col;
	}

	@media (min-width: 1024px) {
		.detail-panel {
			position: sticky;
			top: 5rem;
			max-height: calc(100vh - 6rem);
			overflow-y: auto;
		}
	}

	.detail-header {
		@apply flex items-start justify-between gap-3 p-5 border-b border-border;
		@apply bg-accent/30 sticky top-0 z-10;
	}

	.detail-title-row {
		@apply flex items-center gap-3;
	}

	.detail-icon {
		@apply text-4xl;
	}

	.detail-title {
		@apply text-xl font-bold mb-1;
	}

	.close-btn {
		@apply w-8 h-8 rounded-lg flex items-center justify-center;
		@apply bg-muted hover:bg-accent text-muted-foreground hover:text-foreground;
		@apply transition-colors cursor-pointer text-sm font-bold flex-shrink-0;
	}

	.detail-body {
		@apply p-5 space-y-6 flex-1 overflow-y-auto;
	}

	.detail-section {
		@apply space-y-2;
	}

	.detail-section-title {
		@apply text-sm font-semibold uppercase tracking-wide text-muted-foreground;
		@apply flex items-center gap-1;
	}

	.detail-count {
		@apply font-normal text-xs;
	}

	.detail-text {
		@apply text-sm text-foreground leading-relaxed;
	}

	.detail-muted {
		@apply text-sm text-muted-foreground;
	}

	/* ── Spec Table ──────────────────────────────────────── */
	.spec-table {
		@apply rounded-lg border border-border overflow-hidden;
	}

	.spec-row {
		@apply flex text-sm border-b border-border/50 last:border-b-0;
	}

	.spec-key {
		@apply w-32 flex-shrink-0 px-3 py-2 font-medium bg-muted/40 text-muted-foreground;
	}

	.spec-val {
		@apply px-3 py-2 text-foreground/90;
	}

	/* ── Providers ───────────────────────────────────────── */
	.providers-list {
		@apply space-y-3;
	}

	.provider-card {
		@apply rounded-lg border border-border p-3 bg-card space-y-1;
		@apply hover:border-amber-500/30 transition-colors;
	}

	.provider-header {
		@apply flex items-center justify-between;
	}

	.provider-name {
		@apply font-semibold text-sm;
	}

	.provider-rep {
		@apply text-xs text-amber-500 font-semibold;
	}

	.provider-addr {
		@apply text-xs text-muted-foreground font-mono truncate;
	}

	.provider-meta {
		@apply flex gap-4 text-xs text-muted-foreground;
	}

	:global(.provider-select-btn) {
		@apply w-full mt-1 bg-amber-500 hover:bg-amber-600 text-black text-xs !important;
	}

	.no-providers {
		@apply flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border;
		@apply text-sm text-muted-foreground;
	}

	/* ── History ─────────────────────────────────────────── */
	.history-list {
		@apply space-y-1;
	}

	.history-row {
		@apply flex items-center gap-3 text-xs py-1 border-b border-border/30 last:border-b-0;
	}

	.history-time {
		@apply text-muted-foreground flex-1 min-w-0 truncate;
	}

	.history-status {
		@apply font-medium flex-shrink-0;
	}

	.status-ok {
		@apply text-green-500;
	}

	.status-err {
		@apply text-red-500;
	}

	.history-dur {
		@apply text-muted-foreground flex-shrink-0;
	}

	.history-cost {
		@apply text-amber-500 font-medium flex-shrink-0;
	}

	/* ── Cost Grid ───────────────────────────────────────── */
	.cost-grid {
		@apply grid grid-cols-3 gap-2;
	}

	.cost-item {
		@apply flex flex-col items-center p-3 rounded-lg border border-border bg-muted/20 text-center;
	}

	.cost-label {
		@apply text-xs text-muted-foreground mb-1;
	}

	.cost-val {
		@apply text-sm font-semibold;
	}

	.cost-val-green {
		@apply text-green-500;
	}

	/* ── Bottom Notice ───────────────────────────────────── */
	.bottom-notice {
		@apply mt-4;
	}

	:global(.notice-card) {
		@apply border-amber-500/20 bg-amber-500/5 !important;
	}

	.notice-content {
		@apply flex gap-4;
	}

	.notice-icon {
		@apply text-3xl text-amber-500 flex-shrink-0;
	}

	.notice-text {
		@apply flex-1;
	}

	.notice-title {
		@apply font-semibold mb-2 text-amber-600 dark:text-amber-400;
	}

	.notice-desc {
		@apply text-muted-foreground mb-4 text-sm leading-relaxed;
	}

	.notice-features {
		@apply grid grid-cols-2 gap-1 text-sm text-muted-foreground;
	}

	.notice-feature {
		@apply flex items-center gap-1;
	}

	/* ── Responsive ──────────────────────────────────────── */
	@media (max-width: 768px) {
		.page-title {
			@apply text-2xl;
		}

		.skills-grid {
			@apply grid-cols-1;
		}

		.content-layout.has-detail {
			@apply grid-cols-1;
		}

		.cost-grid {
			@apply grid-cols-1;
		}

		.notice-content {
			@apply flex-col gap-3;
		}

		.notice-features {
			@apply grid-cols-1;
		}
	}
</style>
