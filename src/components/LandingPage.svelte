<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let showLoginModal = false;
	let showSignupModal = false;

	function openLoginModal() {
		showLoginModal = true;
		showSignupModal = false;
	}

	function openSignupModal() {
		showSignupModal = true;
		showLoginModal = false;
	}

	function closeModals() {
		showLoginModal = false;
		showSignupModal = false;
	}

	function handleGoogleAuth(type) {
		// Simulate Google authentication
		console.log(`Google ${type} clicked`);
		
		// Close modals and dispatch login event
		closeModals();
		dispatch('userLogin', { 
			name: 'John Doe', 
			email: 'john@example.com',
			avatar: '👤'
		});
	}
</script>

<div class="landing-page">
	<!-- Hero Section -->
	<div class="hero-section">
		<div class="hero-content">
			<h1 class="hero-title">
				<span class="hero-icon">📚</span>
				PQ Finder
			</h1>
			<p class="hero-subtitle">
				Find and share past questions from universities across Nigeria
			</p>
			<p class="hero-description">
				Connect with fellow students, access quality study materials, and excel in your exams
			</p>
			
			<div class="hero-actions">
				<button class="btn btn-primary" on:click={openSignupModal}>
					<span>🚀</span>
					Get Started
				</button>
				<button class="btn btn-secondary" on:click={openLoginModal}>
					<span>🔑</span>
					Sign In
				</button>
			</div>
		</div>
	</div>

	<!-- Features Section -->
	<div class="features-section">
		<div class="container">
			<h2 class="section-title">Why Choose PQ Finder?</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">📖</div>
					<h3>Quality Content</h3>
					<p>Access verified past questions from top Nigerian universities</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">👥</div>
					<h3>Student Community</h3>
					<p>Connect with fellow students and share knowledge</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">⚡</div>
					<h3>Quick Access</h3>
					<p>Find and download past questions in seconds</p>
				</div>
			</div>
		</div>
	</div>

	<!-- CTA Section -->
	<div class="cta-section">
		<div class="container">
			<h2>Ready to Ace Your Exams?</h2>
			<p>Join thousands of students who are already using PQ Finder</p>
			<button class="btn btn-primary btn-large" on:click={openSignupModal}>
				<span>🎓</span>
				Start Learning Today
			</button>
		</div>
	</div>
</div>

<!-- Login Modal -->
{#if showLoginModal}
	<div class="modal-overlay" on:click={closeModals}>
		<div class="modal-content auth-modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>🔑 Sign In</h3>
				<button class="modal-close" on:click={closeModals}>×</button>
			</div>
			
			<div class="modal-body">
				<p class="auth-description">Sign in to access your past questions and continue learning</p>
				
				<button class="google-auth-btn" on:click={() => handleGoogleAuth('Login')}>
					<span class="google-icon">🔍</span>
					<span class="google-text">Continue with Google</span>
				</button>
				
				<div class="auth-footer">
					<p>Don't have an account? <button class="link-btn" on:click={openSignupModal}>Sign up</button></p>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Signup Modal -->
{#if showSignupModal}
	<div class="modal-overlay" on:click={closeModals}>
		<div class="modal-content auth-modal" on:click|stopPropagation>
			<div class="modal-header">
				<h3>🚀 Get Started</h3>
				<button class="modal-close" on:click={closeModals}>×</button>
			</div>
			
			<div class="modal-body">
				<p class="auth-description">Create your account and start accessing past questions</p>
				
				<button class="google-auth-btn" on:click={() => handleGoogleAuth('Signup')}>
					<span class="google-icon">🔍</span>
					<span class="google-text">Sign up with Google</span>
				</button>
				
				<div class="auth-footer">
					<p>Already have an account? <button class="link-btn" on:click={openLoginModal}>Sign in</button></p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.landing-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.hero-section {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 40px 20px;
	}

	.hero-content {
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-title {
		font-size: 4rem;
		font-weight: 700;
		color: white;
		margin-bottom: 24px;
		text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
	}

	.hero-icon {
		font-size: 4.5rem;
		filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.3));
	}

	.hero-subtitle {
		font-size: 1.5rem;
		color: rgba(255, 255, 255, 0.9);
		margin-bottom: 16px;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
		font-weight: 500;
	}

	.hero-description {
		font-size: 1.1rem;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 40px;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
		line-height: 1.6;
	}

	.hero-actions {
		display: flex;
		gap: 20px;
		justify-content: center;
		flex-wrap: wrap;
	}

	.btn {
		padding: 16px 32px;
		border: none;
		border-radius: 12px;
		font-size: 1.1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		display: inline-flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
	}

	.btn-primary {
		background: white;
		color: #667eea;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
	}

	.btn-secondary {
		background: rgba(255, 255, 255, 0.2);
		color: white;
		border: 2px solid rgba(255, 255, 255, 0.3);
		backdrop-filter: blur(10px);
	}

	.btn-secondary:hover {
		background: rgba(255, 255, 255, 0.3);
		transform: translateY(-2px);
	}

	.btn-large {
		padding: 20px 40px;
		font-size: 1.2rem;
	}

	.features-section {
		padding: 80px 0;
		background: rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(10px);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 20px;
	}

	.section-title {
		font-size: 2.5rem;
		font-weight: 700;
		color: white;
		text-align: center;
		margin-bottom: 60px;
		text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 40px;
	}

	.feature-card {
		background: rgba(255, 255, 255, 0.1);
		padding: 40px 30px;
		border-radius: 20px;
		text-align: center;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		transition: all 0.3s ease;
	}

	.feature-card:hover {
		transform: translateY(-5px);
		background: rgba(255, 255, 255, 0.15);
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 20px;
	}

	.feature-card h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: white;
		margin-bottom: 16px;
	}

	.feature-card p {
		color: rgba(255, 255, 255, 0.8);
		line-height: 1.6;
		font-size: 1rem;
	}

	.cta-section {
		padding: 80px 0;
		text-align: center;
	}

	.cta-section h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: white;
		margin-bottom: 16px;
		text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
	}

	.cta-section p {
		font-size: 1.2rem;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 40px;
		text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 20px;
	}

	.auth-modal {
		background: white;
		border-radius: 20px;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
		max-width: 400px;
		width: 100%;
		animation: slideUp 0.3s ease-out;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30px 30px 0;
		margin-bottom: 20px;
	}

	.modal-header h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #333;
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: #666;
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.modal-close:hover {
		background: #f0f0f0;
		color: #333;
	}

	.modal-body {
		padding: 0 30px 30px;
	}

	.auth-description {
		color: #666;
		margin-bottom: 30px;
		text-align: center;
		line-height: 1.5;
	}

	.google-auth-btn {
		width: 100%;
		padding: 16px;
		border: 2px solid #e0e0e0;
		border-radius: 12px;
		background: white;
		color: #333;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin-bottom: 20px;
	}

	.google-auth-btn:hover {
		border-color: #4285f4;
		background: #f8f9ff;
		transform: translateY(-1px);
	}

	.google-icon {
		font-size: 1.2rem;
	}

	.google-text {
		font-weight: 600;
	}

	.auth-footer {
		text-align: center;
		padding-top: 20px;
		border-top: 1px solid #e0e0e0;
	}

	.auth-footer p {
		color: #666;
		margin: 0;
	}

	.link-btn {
		background: none;
		border: none;
		color: #667eea;
		cursor: pointer;
		font-weight: 600;
		text-decoration: underline;
	}

	.link-btn:hover {
		color: #5a6fd8;
	}

	@keyframes slideUp {
		from { opacity: 0; transform: translateY(30px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@media (max-width: 768px) {
		.hero-title {
			font-size: 2.5rem;
			flex-direction: column;
			gap: 10px;
		}

		.hero-icon {
			font-size: 3rem;
		}

		.hero-actions {
			flex-direction: column;
			align-items: center;
		}

		.btn {
			width: 100%;
			max-width: 300px;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.section-title {
			font-size: 2rem;
		}
	}
</style>
