<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export const uploadedFiles = [];
	export const onAddCoins = null;
	export const onAddUploadedFile = null;
	export const onAddAvailableFile = null;

	let selectedFile = null;
	let subject = '';
	let year = '';
	let examType = '';
	let description = '';
	let uploading = false;
	let uploadSuccess = false;
	let currentStep = 1;
	let dragOver = false;

	const examTypes = [
		{ value: 'Midterm', label: 'Midterm Exam', icon: '📝' },
		{ value: 'Final', label: 'Final Exam', icon: '🎓' },
		{ value: 'Quiz', label: 'Quiz', icon: '❓' },
		{ value: 'Assignment', label: 'Assignment', icon: '📋' },
		{ value: 'Other', label: 'Other', icon: '📄' }
	];

	const subjects = [
		'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
		'Economics', 'Business', 'Engineering', 'Medicine', 'Law', 'Other'
	];

	const years = Array.from({length: 10}, (_, i) => new Date().getFullYear() - i);

	const steps = [
		{ number: 1, title: 'Select File', description: 'Choose your past question file' },
		{ number: 2, title: 'Add Details', description: 'Provide subject and exam information' },
		{ number: 3, title: 'Review & Upload', description: 'Confirm and upload your file' }
	];

	function handleFileSelect(event) {
		selectedFile = event.target.files[0];
		if (selectedFile) {
			nextStep();
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
		dragOver = true;
	}

	function handleDragLeave(event) {
		event.preventDefault();
		dragOver = false;
	}

	function handleDrop(event) {
		event.preventDefault();
		dragOver = false;
		const files = event.dataTransfer.files;
		if (files.length > 0) {
			selectedFile = files[0];
			nextStep();
		}
	}

	function nextStep() {
		if (currentStep < 3) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function goToStep(step) {
		if (step <= currentStep || (step === 2 && selectedFile) || (step === 3 && selectedFile && subject && year && examType)) {
			currentStep = step;
		}
	}

	function handleUpload() {
		if (!selectedFile || !subject || !year || !examType) {
			alert('Please fill in all required fields');
			return;
		}

		uploading = true;
		
		// Simulate upload process
		setTimeout(() => {
			const fileData = {
				id: Date.now(),
				name: selectedFile.name,
				subject,
				year,
				examType,
				description,
				price: 0, // All files are free
				uploadDate: new Date().toISOString(),
				size: selectedFile.size,
				type: selectedFile.type,
				downloads: 0,
				rating: 0
			};

			// Add to uploaded files (user's uploads)
			if (onAddUploadedFile) {
				onAddUploadedFile(fileData);
			} else {
				dispatch('addUploadedFile', fileData);
			}
			
			// Add to available files (for others to browse)
			if (onAddAvailableFile) {
				onAddAvailableFile(fileData);
			} else {
				dispatch('addAvailableFile', fileData);
			}
			
			// No payment system - files are free

			uploading = false;
			uploadSuccess = true;
			
			// Reset form
			resetForm();

			// Hide success message after 3 seconds
			setTimeout(() => {
				uploadSuccess = false;
			}, 3000);
		}, 1500);
	}

	function resetForm() {
		selectedFile = null;
		subject = '';
		year = '';
		examType = '';
		description = '';
		currentStep = 1;
		
		// Reset file input
		const fileInput = document.getElementById('fileInput');
		if (fileInput) fileInput.value = '';
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getFileIcon(type) {
		if (type.includes('pdf')) return '📄';
		if (type.includes('word') || type.includes('document')) return '📝';
		if (type.includes('image')) return '🖼️';
		return '📁';
	}

	function canProceed() {
		switch(currentStep) {
			case 1: return selectedFile;
			case 2: return subject && year && examType;
			default: return true;
		}
	}

	function canUpload() {
		return selectedFile && subject && year && examType;
	}
</script>

<div class="upload-container">
	<div class="card">
		<div class="upload-header">
			<h2>📤 Upload Past Questions</h2>
			<p>Share your knowledge and help fellow students succeed</p>
		</div>

		{#if uploadSuccess}
			<div class="success-modal">
				<div class="success-content">
					<div class="success-icon">🎉</div>
					<h3>Upload Successful!</h3>
					<p>Your file has been uploaded successfully!</p>
					<button class="btn btn-success" on:click={() => uploadSuccess = false}>
						Upload Another File
					</button>
				</div>
			</div>
		{:else}
			<!-- Progress Steps -->
			<div class="steps-container">
				<div class="steps-progress">
					{#each steps as step, index}
						<div 
							class="step-item"
							class:active={currentStep === step.number}
							class:completed={currentStep > step.number}
							on:click={() => goToStep(step.number)}
							on:keydown={() => goToStep(step.number)}
							role="button"
							tabindex="0"
						>
							<div class="step-number">
								{#if currentStep > step.number}
									✓
								{:else}
									{step.number}
								{/if}
							</div>
							<div class="step-info">
								<div class="step-title">{step.title}</div>
								<div class="step-description">{step.description}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Step Content -->
			<div class="step-content">
				{#if currentStep === 1}
					<!-- Step 1: File Selection -->
					<div class="step-panel">
						<h3>📁 Select Your File</h3>
						<p>Choose the past question file you want to upload</p>
						
						<div 
							class="file-drop-zone"
							class:drag-over={dragOver}
							on:dragover={handleDragOver}
							on:dragleave={handleDragLeave}
							on:drop={handleDrop}
						>
							<input 
								id="fileInput"
								type="file" 
								accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
								on:change={handleFileSelect}
								class="file-input-hidden"
							/>
							
							{#if selectedFile}
								<div class="file-selected">
									<div class="file-icon">{getFileIcon(selectedFile.type)}</div>
									<div class="file-details">
										<div class="file-name">{selectedFile.name}</div>
										<div class="file-size">{formatFileSize(selectedFile.size)}</div>
									</div>
									<button class="change-file-btn" on:click={() => document.getElementById('fileInput').click()}>
										Change File
									</button>
								</div>
							{:else}
								<div class="file-drop-content">
									<div class="drop-icon">📁</div>
									<h4>Drop your file here</h4>
									<p>or <button class="browse-btn" on:click={() => document.getElementById('fileInput').click()}>browse files</button></p>
									<div class="supported-formats">
										Supported: PDF, DOC, DOCX, JPG, PNG
									</div>
								</div>
							{/if}
						</div>
					</div>

				{:else if currentStep === 2}
					<!-- Step 2: File Details -->
					<div class="step-panel">
						<h3>📝 Add File Details</h3>
						<p>Provide information about your past question</p>
						
						<div class="form-grid">
							<div class="form-group">
								<label for="subject">Subject *</label>
								<select id="subject" bind:value={subject} required>
									<option value="">Choose a subject</option>
									{#each subjects as subjectOption}
										<option value={subjectOption}>{subjectOption}</option>
									{/each}
								</select>
							</div>

							<div class="form-group">
								<label for="year">Academic Year *</label>
								<select id="year" bind:value={year} required>
									<option value="">Select year</option>
									{#each years as yearOption}
										<option value={yearOption}>{yearOption}</option>
									{/each}
								</select>
							</div>

							<div class="form-group">
								<label for="examType">Exam Type *</label>
								<div class="exam-type-grid">
									{#each examTypes as type}
										<label class="exam-type-option" class:selected={examType === type.value}>
											<input 
												type="radio" 
												bind:group={examType} 
												value={type.value}
												class="exam-type-input"
											/>
											<div class="exam-type-content">
												<span class="exam-type-icon">{type.icon}</span>
												<span class="exam-type-label">{type.label}</span>
											</div>
										</label>
									{/each}
								</div>
							</div>

							<div class="form-group full-width">
								<label for="description">Description (Optional)</label>
								<textarea 
									id="description"
									bind:value={description}
									placeholder="Add any additional details about the exam, topics covered, or special notes..."
									rows="3"
								></textarea>
							</div>
						</div>
					</div>

				{:else if currentStep === 3}
					<!-- Step 4: Review & Upload -->
					<div class="step-panel">
						<h3>🔍 Review & Upload</h3>
						<p>Review your file details before uploading</p>
						
						<div class="review-card">
							<div class="review-header">
								<div class="review-file-icon">{getFileIcon(selectedFile?.type)}</div>
								<div class="review-file-info">
									<h4>{selectedFile?.name}</h4>
									<p>{formatFileSize(selectedFile?.size)}</p>
								</div>
								<div class="review-price">FREE</div>
							</div>
							
							<div class="review-details">
								<div class="review-detail">
									<span class="detail-label">Subject:</span>
									<span class="detail-value">{subject}</span>
								</div>
								<div class="review-detail">
									<span class="detail-label">Year:</span>
									<span class="detail-value">{year}</span>
								</div>
								<div class="review-detail">
									<span class="detail-label">Type:</span>
									<span class="detail-value">{examType}</span>
								</div>
								{#if description}
								<div class="review-detail">
									<span class="detail-label">Description:</span>
									<span class="detail-value">{description}</span>
								</div>
								{/if}
							</div>
						</div>

						<div class="upload-summary">
							<div class="summary-item">
								<span class="summary-label">File Status:</span>
								<span class="summary-value">FREE for all students</span>
							</div>
							<div class="summary-item">
								<span class="summary-label">Purpose:</span>
								<span class="summary-value">Help fellow students succeed</span>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Navigation -->
			<div class="step-navigation">
				{#if currentStep > 1}
					<button class="btn btn-secondary" on:click={prevStep}>
						<span>←</span>
						Previous
					</button>
				{/if}
				
				<div class="nav-spacer"></div>
				
				{#if currentStep < 3}
					<button 
						class="btn btn-success" 
						on:click={nextStep}
						disabled={!canProceed()}
					>
						Next
						<span>→</span>
					</button>
				{:else}
					<button 
						class="btn btn-success upload-btn"
						on:click={handleUpload}
						disabled={uploading || !canUpload()}
					>
						{#if uploading}
							<span class="loading-spinner"></span>
							Uploading...
						{:else}
							<span>📤</span>
							Upload File
						{/if}
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.upload-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.upload-header {
		text-align: center;
		margin-bottom: 40px;
	}

	.upload-header h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 12px;
	}

	.upload-header p {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	/* Success Modal */
	.success-modal {
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

	.success-content {
		background: var(--bg-primary);
		border-radius: var(--radius-xl);
		padding: 40px;
		text-align: center;
		box-shadow: var(--shadow-xl);
		max-width: 400px;
		width: 100%;
		animation: slideUp 0.3s ease-out;
	}

	.success-icon {
		font-size: 4rem;
		margin-bottom: 20px;
	}

	.success-content h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 12px;
	}

	.success-content p {
		color: var(--text-secondary);
		margin-bottom: 24px;
	}


	/* Steps Progress */
	.steps-container {
		margin-bottom: 40px;
	}

	.steps-progress {
		display: flex;
		justify-content: space-between;
		position: relative;
		margin-bottom: 20px;
	}

	.steps-progress::before {
		content: '';
		position: absolute;
		top: 20px;
		left: 20px;
		right: 20px;
		height: 2px;
		background: var(--border-color);
		z-index: 1;
	}

	.step-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
		z-index: 2;
		cursor: pointer;
		transition: all 0.3s ease;
		flex: 1;
		max-width: 150px;
	}

	.step-number {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--bg-tertiary);
		color: var(--text-light);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 1.1rem;
		margin-bottom: 8px;
		transition: all 0.3s ease;
		border: 2px solid var(--border-color);
	}

	.step-item.active .step-number {
		background: var(--primary-color);
		color: white;
		border-color: var(--primary-color);
		transform: scale(1.1);
	}

	.step-item.completed .step-number {
		background: var(--success-color);
		color: white;
		border-color: var(--success-color);
	}

	.step-info {
		text-align: center;
	}

	.step-title {
		font-weight: 600;
		color: var(--text-primary);
		font-size: 0.9rem;
		margin-bottom: 4px;
	}

	.step-description {
		font-size: 0.8rem;
		color: var(--text-secondary);
		line-height: 1.3;
	}

	.step-item.active .step-title {
		color: var(--primary-color);
	}

	.step-item.completed .step-title {
		color: var(--success-color);
	}

	/* Step Content */
	.step-content {
		min-height: 400px;
		margin-bottom: 40px;
	}

	.step-panel {
		animation: fadeIn 0.3s ease-in;
	}

	.step-panel h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.step-panel p {
		color: var(--text-secondary);
		margin-bottom: 32px;
		font-size: 1rem;
	}

	/* File Drop Zone */
	.file-drop-zone {
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-xl);
		padding: 40px;
		text-align: center;
		transition: all 0.3s ease;
		background: var(--bg-secondary);
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.file-drop-zone.drag-over {
		border-color: var(--primary-color);
		background: rgba(59, 130, 246, 0.05);
		transform: scale(1.02);
	}

	.file-input-hidden {
		display: none;
	}

	.file-drop-content {
		width: 100%;
	}

	.drop-icon {
		font-size: 3rem;
		margin-bottom: 16px;
		opacity: 0.6;
	}

	.file-drop-content h4 {
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 8px;
	}

	.file-drop-content p {
		color: var(--text-secondary);
		margin-bottom: 16px;
	}

	.browse-btn {
		background: none;
		border: none;
		color: var(--primary-color);
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
	}

	.supported-formats {
		font-size: 0.85rem;
		color: var(--text-light);
	}

	.file-selected {
		display: flex;
		align-items: center;
		gap: 16px;
		background: var(--bg-primary);
		padding: 20px;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
		width: 100%;
	}

	.file-icon {
		font-size: 2rem;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary);
		border-radius: var(--radius-md);
	}

	.file-details {
		flex: 1;
		text-align: left;
	}

	.file-name {
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 4px;
		word-break: break-word;
	}

	.file-size {
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.change-file-btn {
		background: var(--bg-tertiary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 8px 16px;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.change-file-btn:hover {
		background: var(--border-color);
	}

	/* Form Grid */
	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 24px;
	}

	.form-group.full-width {
		grid-column: 1 / -1;
	}

	/* Exam Type Grid */
	.exam-type-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 12px;
		margin-top: 8px;
	}

	.exam-type-option {
		cursor: pointer;
		border: 2px solid var(--border-color);
		border-radius: var(--radius-lg);
		padding: 16px;
		transition: all 0.2s ease;
		background: var(--bg-primary);
	}

	.exam-type-option:hover {
		border-color: var(--primary-color);
		background: rgba(59, 130, 246, 0.05);
	}

	.exam-type-option.selected {
		border-color: var(--primary-color);
		background: rgba(59, 130, 246, 0.1);
	}

	.exam-type-input {
		display: none;
	}

	.exam-type-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.exam-type-icon {
		font-size: 1.5rem;
	}

	.exam-type-label {
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-primary);
		text-align: center;
	}


	/* Review Card */
	.review-card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		padding: 24px;
		margin-bottom: 24px;
	}

	.review-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color);
	}

	.review-file-icon {
		font-size: 2rem;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
	}

	.review-file-info {
		flex: 1;
	}

	.review-file-info h4 {
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 4px;
		word-break: break-word;
	}

	.review-file-info p {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.review-price {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--accent-color);
	}

	.review-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 16px;
	}

	.review-detail {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 0;
		border-bottom: 1px solid var(--border-color);
	}

	.review-detail:last-child {
		border-bottom: none;
	}

	.detail-label {
		font-weight: 500;
		color: var(--text-primary);
	}

	.detail-value {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.upload-summary {
		background: var(--bg-primary);
		border: 2px solid var(--success-color);
		border-radius: var(--radius-lg);
		padding: 20px;
	}

	.summary-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12px;
	}

	.summary-item:last-child {
		margin-bottom: 0;
	}

	.summary-label {
		font-weight: 500;
		color: var(--text-primary);
	}

	.summary-value {
		font-weight: 700;
		color: var(--success-color);
		font-size: 1.1rem;
	}

	/* Navigation */
	.step-navigation {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 24px;
		border-top: 1px solid var(--border-color);
	}

	.nav-spacer {
		flex: 1;
	}

	.upload-btn {
		font-size: 1.1rem;
		padding: 16px 32px;
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top: 2px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-right: 8px;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Responsive */
	@media (max-width: 768px) {
		.steps-progress {
			flex-direction: column;
			gap: 16px;
		}

		.steps-progress::before {
			display: none;
		}

		.step-item {
			flex-direction: row;
			text-align: left;
			max-width: none;
		}

		.step-number {
			margin-right: 16px;
			margin-bottom: 0;
		}

		.form-grid {
			grid-template-columns: 1fr;
		}

		.exam-type-grid {
			grid-template-columns: repeat(2, 1fr);
		}


		.review-header {
			flex-direction: column;
			text-align: center;
		}

		.review-details {
			grid-template-columns: 1fr;
		}

		.step-navigation {
			flex-direction: column;
			gap: 16px;
		}

		.nav-spacer {
			display: none;
		}
	}
</style>
