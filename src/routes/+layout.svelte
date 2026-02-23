<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from "mode-watcher";
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { connected, balance, web_explorer_uri_addr, address } from "$lib/common/store";
	import { WalletButton, walletConnected, walletAddress, walletBalance } from "wallet-svelte-component";
	import { WalletAddressChangeHandler } from 'wallet-svelte-component';
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { get } from "svelte/store";
	import Theme from "./Theme.svelte";

	let showSettingsModal = false;
	let mobileMenuOpen = false;

	// Navigation items
	const navItems = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/services', label: 'Services', icon: '🔧' },
		{ href: '/skills', label: 'Skills', icon: '🧠' },
		{ href: '/reputation', label: 'Reputation', icon: '🏆' },
		{ href: '/execute', label: 'Execute', icon: '⚡' },
		{ href: '/about', label: 'About', icon: 'ℹ️' }
	];

	// Footer rotating messages
	const footerMessages = [
		"Fully decentralized. No backend. No database. Unstoppable.",
		"Built on Ergo blockchain - fair launch, no ICO, pure eUTXO architecture.",
		"Your keys, your data, your control. AI agents without compromises.",
		"Powered by Ergo's native smart contracts and Fleet SDK.",
		"Partnership with Celaut - bringing AI execution to the edge."
	];
	let activeMessageIndex = 0;
	let scrollingTextElement: HTMLElement;

	function handleAnimationIteration() {
		activeMessageIndex = (activeMessageIndex + 1) % footerMessages.length;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	// Sync new wallet system with old stores for backward compatibility
	walletConnected.subscribe(async (isConnected) => {
		if (isConnected) {
			const walletAddr = get(walletAddress);
			const walletBal = get(walletBalance);

			address.set(walletAddr);
			connected.set(true);
			balance.set(Number(walletBal.nanoErgs));
		} else {
			address.set(null);
			connected.set(false);
			balance.set(null);
		}
	});

	onMount(() => {
		scrollingTextElement?.addEventListener(
			"animationiteration",
			handleAnimationIteration,
		);

		return () => {
			scrollingTextElement?.removeEventListener(
				"animationiteration",
				handleAnimationIteration,
			);
		};
	});
</script>

<ModeWatcher />

<!-- Main Layout -->
<div class="min-h-screen bg-background">
	<!-- Header/Navbar -->
	<header class="navbar-container">
		<div class="navbar-content">
			<!-- Logo/Brand -->
			<a href="/" class="logo-container" on:click={closeMobileMenu}>
				<div class="flex items-center gap-2">
					<div class="logo-icon">🤖</div>
					<span class="logo-text">AgenticAiHome</span>
				</div>
			</a>

			<!-- Desktop Navigation -->
			<nav class="desktop-nav">
				{#each navItems as item}
					<a 
						href={item.href}
						class="nav-link"
						class:active={$page.url.pathname === item.href}
					>
						<span class="nav-icon">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</nav>

			<div class="flex-1"></div>

			<!-- User Section -->
			<div class="user-section">
				<!-- Wallet Button -->
				<WalletButton explorerUrl={$web_explorer_uri_addr} />
				
				<!-- Settings Button -->
				<button
					class="settings-button"
					on:click={() => (showSettingsModal = true)}
					aria-label="Settings"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
						/>
						<circle cx="12" cy="12" r="3" />
					</svg>
				</button>
				
				<!-- Theme Toggle -->
				<div class="theme-toggle">
					<Theme />
				</div>

				<!-- Mobile Menu Button -->
				<button
					class="mobile-menu-button md:hidden"
					on:click={toggleMobileMenu}
					aria-label="Toggle menu"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						{#if mobileMenuOpen}
							<path d="m18 6-12 12" />
							<path d="m6 6 12 12" />
						{:else}
							<line x1="4" x2="20" y1="6" y2="6" />
							<line x1="4" x2="20" y1="12" y2="12" />
							<line x1="4" x2="20" y1="18" y2="18" />
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Mobile Navigation -->
		{#if mobileMenuOpen}
			<div class="mobile-nav">
				<nav class="mobile-nav-content">
					{#each navItems as item}
						<a 
							href={item.href}
							class="mobile-nav-link"
							class:active={$page.url.pathname === item.href}
							on:click={closeMobileMenu}
						>
							<span class="nav-icon">{item.icon}</span>
							{item.label}
						</a>
					{/each}
				</nav>
			</div>
		{/if}
	</header>

	<!-- Main Content -->
	<main class="main-content">
		<slot />
	</main>

	<!-- Footer -->
	<footer class="page-footer">
		<div class="footer-left">
			<span class="ergo-icon">◰</span>
			<span class="text-xs">Powered by Ergo</span>
		</div>

		<div class="footer-center">
			<div bind:this={scrollingTextElement} class="scrolling-text-wrapper">
				{footerMessages[activeMessageIndex]}
			</div>
		</div>

		<div class="footer-right">
			<div class="flex items-center gap-2 text-xs">
				<span>V2.0</span>
				<span class="text-amber-500">●</span>
				<span>Decentralized</span>
			</div>
		</div>
	</footer>
</div>

<!-- Wallet Address Change Handler -->
<WalletAddressChangeHandler />

<!-- Settings Modal -->
<SettingsModal bind:open={showSettingsModal} />

<style lang="postcss">
	:global(body) {
		background-color: hsl(var(--background));
		padding-bottom: 3rem; /* Space for fixed footer */
	}

	.navbar-container {
		@apply sticky top-0 z-50 w-full border-b backdrop-blur-lg;
		background-color: hsl(var(--background) / 0.95);
		border-bottom-color: hsl(var(--border));
	}

	.navbar-content {
		@apply container mx-auto flex h-16 items-center px-4;
	}

	.logo-container {
		@apply mr-6 flex items-center;
		@apply text-xl font-bold text-foreground hover:text-amber-500;
		@apply transition-colors;
	}

	.logo-icon {
		@apply text-2xl;
	}

	.logo-text {
		@apply hidden sm:inline;
	}

	.desktop-nav {
		@apply hidden md:flex items-center gap-6;
	}

	.nav-link {
		@apply flex items-center gap-1 px-3 py-2 rounded-md;
		@apply text-sm font-medium text-muted-foreground;
		@apply hover:text-foreground hover:bg-accent;
		@apply transition-colors;
	}

	.nav-link.active {
		@apply text-foreground bg-accent;
		@apply text-amber-600 dark:text-amber-400;
	}

	.nav-icon {
		@apply text-base;
	}

	.user-section {
		@apply flex items-center gap-3;
	}

	.settings-button {
		@apply flex items-center justify-center;
		@apply w-9 h-9 rounded-md;
		@apply border border-border;
		@apply bg-background hover:bg-accent;
		@apply text-foreground hover:text-accent-foreground;
		@apply transition-colors cursor-pointer;
	}

	.settings-button:hover {
		@apply shadow-sm;
	}

	.mobile-menu-button {
		@apply flex items-center justify-center;
		@apply w-9 h-9 rounded-md;
		@apply bg-background hover:bg-accent;
		@apply text-foreground hover:text-accent-foreground;
		@apply transition-colors cursor-pointer;
	}

	.mobile-nav {
		@apply md:hidden border-t border-border;
		background-color: hsl(var(--background) / 0.95);
		backdrop-filter: blur(4px);
	}

	.mobile-nav-content {
		@apply container mx-auto px-4 py-4 space-y-1;
	}

	.mobile-nav-link {
		@apply flex items-center gap-3 px-3 py-2 rounded-md;
		@apply text-sm font-medium text-muted-foreground;
		@apply hover:text-foreground hover:bg-accent;
		@apply transition-colors;
	}

	.mobile-nav-link.active {
		@apply text-foreground bg-accent;
		@apply text-amber-600 dark:text-amber-400;
	}

	.main-content {
		@apply min-h-[calc(100vh-4rem-3rem)]; /* Adjust for header and footer */
	}

	.page-footer {
		@apply fixed bottom-0 left-0 right-0 z-40;
		@apply flex items-center;
		@apply h-12 px-6 gap-6;
		@apply border-t text-sm text-muted-foreground;
		background-color: hsl(var(--background) / 0.95);
		border-top-color: hsl(var(--border));
		backdrop-filter: blur(4px);
	}

	.footer-left,
	.footer-right {
		@apply flex items-center gap-2 flex-shrink-0;
	}

	.footer-center {
		@apply flex-1 overflow-hidden;
		-webkit-mask-image: linear-gradient(
			to right,
			transparent,
			black 10%,
			black 90%,
			transparent
		);
		mask-image: linear-gradient(
			to right,
			transparent,
			black 10%,
			black 90%,
			transparent
		);
	}

	.scrolling-text-wrapper {
		@apply inline-block whitespace-nowrap text-xs;
		animation: scroll-left 30s linear infinite;
	}

	.ergo-icon {
		@apply text-amber-500 font-bold;
	}

	@keyframes scroll-left {
		from {
			transform: translateX(100vw);
		}
		to {
			transform: translateX(-100%);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.logo-text {
			@apply text-sm;
		}
		
		.navbar-content {
			@apply px-3;
		}
		
		.page-footer {
			@apply px-3 gap-3 text-xs;
		}
	}
</style>
