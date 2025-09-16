<script>
	export let userCoins = 0;
	export let uploadedFiles = [];

	let withdrawalAmount = 0;
	let withdrawalMethod = 'bank';
	let bankDetails = {
		accountNumber: '',
		bankName: '',
		accountName: ''
	};
	let mobileMoneyDetails = {
		phoneNumber: '',
		provider: 'mtn'
	};
	let withdrawalHistory = [];
	let processingWithdrawal = false;
	let withdrawalSuccess = false;

	const exchangeRate = 100; // 100 coins = $1
	const providers = ['mtn', 'airtel', 'vodafone', 'tigo'];

	// Load withdrawal history from localStorage
	$: {
		const saved = localStorage.getItem('withdrawalHistory');
		if (saved) {
			withdrawalHistory = JSON.parse(saved);
		}
	}

	function calculateCashAmount(coins) {
		return (coins / exchangeRate).toFixed(2);
	}

	function calculateCoinsFromCash(cash) {
		return Math.floor(cash * exchangeRate);
	}

	function handleWithdrawal() {
		if (withdrawalAmount <= 0) {
			alert('Please enter a valid withdrawal amount');
			return;
		}

		if (withdrawalAmount > userCoins) {
			alert(`You only have ${userCoins} coins available`);
			return;
		}

		if (withdrawalMethod === 'bank') {
			if (!bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.accountName) {
				alert('Please fill in all bank details');
				return;
			}
		} else {
			if (!mobileMoneyDetails.phoneNumber) {
				alert('Please enter your phone number');
				return;
			}
		}

		const cashAmount = calculateCashAmount(withdrawalAmount);
		
		if (confirm(`Withdraw ₦${withdrawalAmount} to your ${withdrawalMethod === 'bank' ? 'bank account' : 'mobile money'}?`)) {
			processingWithdrawal = true;
			
			// Simulate processing
			setTimeout(() => {
		const withdrawal = {
			id: Date.now(),
			amount: withdrawalAmount,
			cashAmount: withdrawalAmount, // Same as amount since we're using Naira directly
			method: withdrawalMethod,
			details: withdrawalMethod === 'bank' ? bankDetails : mobileMoneyDetails,
			date: new Date().toISOString(),
			status: 'completed'
		};

				withdrawalHistory.unshift(withdrawal);
				localStorage.setItem('withdrawalHistory', JSON.stringify(withdrawalHistory));

				processingWithdrawal = false;
				withdrawalSuccess = true;

				// Reset form
				withdrawalAmount = 0;
				bankDetails = { accountNumber: '', bankName: '', accountName: '' };
				mobileMoneyDetails = { phoneNumber: '', provider: 'mtn' };

				// Hide success message after 3 seconds
				setTimeout(() => {
					withdrawalSuccess = false;
				}, 3000);
			}, 2000);
		}
	}

	function getTotalEarnings() {
		return uploadedFiles.reduce((total, file) => total + file.price, 0);
	}

	function getTotalWithdrawn() {
		return withdrawalHistory.reduce((total, withdrawal) => total + withdrawal.cashAmount, 0);
	}
</script>

<div class="wallet-container">
	<!-- Wallet Overview -->
	<div class="card">
		<h2>💰 My Wallet</h2>
		
		<div class="wallet-stats">
			<div class="stat-card">
				<div class="stat-value">₦{userCoins}</div>
				<div class="stat-label">Available Balance</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">{uploadedFiles.length}</div>
				<div class="stat-label">Files Uploaded</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">₦{getTotalEarnings().toFixed(0)}</div>
				<div class="stat-label">Total Earned</div>
			</div>
			<div class="stat-card">
				<div class="stat-value">₦{getTotalWithdrawn().toFixed(0)}</div>
				<div class="stat-label">Total Withdrawn</div>
			</div>
		</div>
	</div>

	<!-- Withdrawal Form -->
	<div class="card">
		<h3>💸 Withdraw Cash</h3>
		
		{#if withdrawalSuccess}
			<div class="success-message">
				✅ Withdrawal successful! Your cash will be processed within 24 hours.
			</div>
		{/if}

		<form on:submit|preventDefault={handleWithdrawal}>
			<div class="form-group">
				<label for="withdrawalAmount">Amount to Withdraw (Naira)</label>
				<input 
					id="withdrawalAmount"
					type="number" 
					bind:value={withdrawalAmount}
					min="100"
					max={userCoins}
					step="100"
					required
				/>
				<small>Minimum withdrawal: ₦100</small>
				{#if withdrawalAmount > 0}
					<p class="cash-equivalent">= ₦{withdrawalAmount}</p>
				{/if}
			</div>

			<div class="form-group">
				<label>Withdrawal Method</label>
				<div class="method-selector">
					<label class="method-option">
						<input 
							type="radio" 
							bind:group={withdrawalMethod} 
							value="bank"
						/>
						<span>🏦 Bank Transfer</span>
					</label>
					<label class="method-option">
						<input 
							type="radio" 
							bind:group={withdrawalMethod} 
							value="mobile"
						/>
						<span>📱 Mobile Money</span>
					</label>
				</div>
			</div>

			{#if withdrawalMethod === 'bank'}
				<div class="bank-details">
					<h4>Bank Details</h4>
					<div class="form-group">
						<label for="accountNumber">Account Number</label>
						<input 
							id="accountNumber"
							type="text" 
							bind:value={bankDetails.accountNumber}
							placeholder="Enter your account number"
							required
						/>
					</div>
					<div class="form-group">
						<label for="bankName">Bank Name</label>
						<input 
							id="bankName"
							type="text" 
							bind:value={bankDetails.bankName}
							placeholder="e.g., Ghana Commercial Bank"
							required
						/>
					</div>
					<div class="form-group">
						<label for="accountName">Account Name</label>
						<input 
							id="accountName"
							type="text" 
							bind:value={bankDetails.accountName}
							placeholder="Full name on account"
							required
						/>
					</div>
				</div>
			{:else}
				<div class="mobile-details">
					<h4>Mobile Money Details</h4>
					<div class="form-group">
						<label for="phoneNumber">Phone Number</label>
						<input 
							id="phoneNumber"
							type="tel" 
							bind:value={mobileMoneyDetails.phoneNumber}
							placeholder="e.g., 0241234567"
							required
						/>
					</div>
					<div class="form-group">
						<label for="provider">Provider</label>
						<select id="provider" bind:value={mobileMoneyDetails.provider}>
							{#each providers as provider}
								<option value={provider}>{provider.toUpperCase()}</option>
							{/each}
						</select>
					</div>
				</div>
			{/if}

			<button 
				type="submit" 
				class="btn btn-success"
				disabled={processingWithdrawal || userCoins < 100}
			>
				{#if processingWithdrawal}
					⏳ Processing...
				{:else}
					💸 Request Withdrawal
				{/if}
			</button>
		</form>
	</div>

	<!-- Withdrawal History -->
	{#if withdrawalHistory.length > 0}
		<div class="card">
			<h3>📋 Withdrawal History</h3>
			<div class="history-list">
				{#each withdrawalHistory as withdrawal}
					<div class="history-item">
						<div class="history-info">
							<div class="history-amount">₦{withdrawal.cashAmount}</div>
							<div class="history-details">
								<p><strong>{withdrawal.method === 'bank' ? 'Bank Transfer' : 'Mobile Money'}</strong></p>
								<p>{new Date(withdrawal.date).toLocaleDateString()}</p>
								<p class="status completed">✅ Completed</p>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.wallet-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.wallet-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 20px;
		margin: 20px 0;
	}

	.stat-card {
		background: linear-gradient(135deg, #667eea, #764ba2);
		color: white;
		padding: 20px;
		border-radius: 10px;
		text-align: center;
	}

	.stat-value {
		font-size: 2rem;
		font-weight: bold;
		margin-bottom: 5px;
	}

	.stat-label {
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.exchange-rate {
		background: #e8f4fd;
		padding: 15px;
		border-radius: 8px;
		text-align: center;
		margin-top: 20px;
	}

	.method-selector {
		display: flex;
		gap: 20px;
		margin-top: 10px;
	}

	.method-option {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
		padding: 10px;
		border: 2px solid #e1e5e9;
		border-radius: 8px;
		transition: border-color 0.3s ease;
	}

	.method-option:hover {
		border-color: #667eea;
	}

	.method-option input[type="radio"] {
		margin: 0;
	}

	.bank-details,
	.mobile-details {
		background: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		margin: 20px 0;
	}

	.cash-equivalent {
		color: #28a745;
		font-weight: bold;
		margin-top: 5px;
	}

	.history-list {
		max-height: 400px;
		overflow-y: auto;
	}

	.history-item {
		border: 1px solid #e1e5e9;
		border-radius: 8px;
		padding: 15px;
		margin-bottom: 10px;
		background: white;
	}

	.history-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.history-amount {
		font-size: 1.5rem;
		font-weight: bold;
		color: #28a745;
	}

	.history-details p {
		margin: 2px 0;
		font-size: 14px;
		color: #555;
	}

	.status.completed {
		color: #28a745;
		font-weight: bold;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
