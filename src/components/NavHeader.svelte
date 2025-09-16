<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let user = null;
	export let currentView = 'browse';

	function switchView(view) {
		currentView = view;
		dispatch('viewChange', view);
	}

	function logout() {
		dispatch('logout');
	}
</script>

<nav class="nav-header">
	<div class="nav-container">
		<div class="nav-brand">
			<span class="brand-icon">📚</span>
			<span class="brand-text">PQ Finder</span>
		</div>

		<div class="nav-links">
			<button 
				class="nav-link" 
				class:active={currentView === 'browse'} 
				on:click={() => switchView('browse')}
			>
				<span class="nav-icon">🔍</span>
				<span class="nav-text">Browse</span>
			</button>
			<button 
				class="nav-link" 
				class:active={currentView === 'upload'} 
				on:click={() => switchView('upload')}
			>
				<span class="nav-icon">📤</span>
				<span class="nav-text">Upload</span>
			</button>
			<button 
				class="nav-link" 
				class:active={currentView === 'wallet'} 
				on:click={() => switchView('wallet')}
			>
				<span class="nav-icon">💳</span>
				<span class="nav-text">Wallet</span>
			</button>
		</div>

		<div class="nav-user">
			{#if user}
				<div class="user-info">
					<div class="user-avatar">{user.avatar || '👤'}</div>
					<div class="user-details">
						<div class="user-name">{user.name}</div>
						<div class="user-balance">₦{user.balance || 0}</div>
					</div>
				</div>
				<button class="logout-btn" on:click={logout}>
					<span>🚪</span>
					Logout
				</button>
			{:else}
				<button class="login-btn" on:click={() => dispatch('showAuth')}>
					<span>🔑</span>
					Sign In
				</button>
			{/if}
		</div>
	</div>
</nav>

<style>
	.nav-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(20px);
		border-bottom: 1px solid rgba(255, 255, 255, 0.2);
		z-index: 1000;
		padding: 0;
		transition: all 0.3s ease;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 70px;
	}

	.nav-brand {
		display: flex;
		align-items: center;
		gap: 12px;
		font-weight: 700;
		font-size: 1.3rem;
		color: white;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
	}

	.brand-icon {
		font-size: 1.5rem;
		filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
	}

	.brand-text {
		font-weight: 700;
	}

	.nav-links {
		display: flex;
		gap: 8px;
		background: rgba(255, 255, 255, 0.1);
		padding: 8px;
		border-radius: 16px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.nav-link {
		background: transparent;
		border: none;
		padding: 12px 20px;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 8px;
		color: rgba(255, 255, 255, 0.7);
		font-weight: 500;
		font-size: 0.95rem;
	}

	.nav-link:hover {
		background: rgba(255, 255, 255, 0.1);
		color: white;
		transform: translateY(-1px);
	}

	.nav-link.active {
		background: white;
		color: #667eea;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.nav-icon {
		font-size: 1rem;
	}

	.nav-text {
		font-weight: 600;
	}

	.nav-user {
		display: flex;
		align-items: center;
		gap: 16px;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 12px;
		background: rgba(255, 255, 255, 0.1);
		padding: 8px 16px;
		border-radius: 20px;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.user-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.user-name {
		color: white;
		font-weight: 600;
		font-size: 0.9rem;
		line-height: 1.2;
	}

	.user-balance {
		color: rgba(255, 255, 255, 0.8);
		font-size: 0.8rem;
		font-weight: 500;
	}

	.login-btn,
	.logout-btn {
		background: rgba(255, 255, 255, 0.2);
		border: 1px solid rgba(255, 255, 255, 0.3);
		color: white;
		padding: 10px 20px;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		gap: 8px;
		font-weight: 500;
		font-size: 0.9rem;
		backdrop-filter: blur(10px);
	}

	.login-btn:hover,
	.logout-btn:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}

	.logout-btn {
		background: rgba(239, 68, 68, 0.2);
		border-color: rgba(239, 68, 68, 0.3);
	}

	.logout-btn:hover {
		background: rgba(239, 68, 68, 0.3);
	}

	@media (max-width: 768px) {
		.nav-container {
			padding: 0 16px;
			height: 60px;
		}

		.nav-brand {
			font-size: 1.1rem;
		}

		.nav-links {
			gap: 4px;
			padding: 6px;
		}

		.nav-link {
			padding: 8px 12px;
			font-size: 0.85rem;
		}

		.nav-text {
			display: none;
		}

		.user-info {
			padding: 6px 12px;
		}

		.user-details {
			display: none;
		}

		.login-btn,
		.logout-btn {
			padding: 8px 16px;
			font-size: 0.85rem;
		}
	}
</style>
