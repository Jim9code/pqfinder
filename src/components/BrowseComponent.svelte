<script>
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export const availableFiles = [];
	export const userCoins = 0;
	
	// Event handlers
	export const onSpendCoins = null;

	let searchTerm = '';
	let selectedSubject = '';
	let selectedYear = '';
	let selectedExamType = '';
	let sortBy = 'newest';
	let showDownloadModal = false;
	let selectedFile = null;
	let downloading = false;
	let downloadProgress = 0;

	// Get unique values for filters
	$: subjects = [...new Set(availableFiles.map(f => f.subject))].sort();
	$: years = [...new Set(availableFiles.map(f => f.year))].sort((a, b) => b - a);
	$: examTypes = [...new Set(availableFiles.map(f => f.examType))].sort();

	// Filter and sort files
	$: filteredFiles = availableFiles
		.filter(file => {
			const matchesSearch = file.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
								 file.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
								 file.name.toLowerCase().includes(searchTerm.toLowerCase());
			const matchesSubject = !selectedSubject || file.subject === selectedSubject;
			const matchesYear = !selectedYear || file.year === selectedYear;
			const matchesExamType = !selectedExamType || file.examType === selectedExamType;
			
			return matchesSearch && matchesSubject && matchesYear && matchesExamType;
		})
		.sort((a, b) => {
			switch(sortBy) {
				case 'newest':
					return new Date(b.uploadDate) - new Date(a.uploadDate);
				case 'oldest':
					return new Date(a.uploadDate) - new Date(b.uploadDate);
				case 'price-low':
					return a.price - b.price;
				case 'price-high':
					return b.price - a.price;
				case 'subject':
					return a.subject.localeCompare(b.subject);
				case 'popular':
					return (b.downloads || 0) - (a.downloads || 0);
				default:
					return 0;
			}
		});

	function openDownloadModal(file) {
		// All files are now free to view and download
		selectedFile = file;
		showDownloadModal = true;
	}

	async function confirmDownload() {
		if (!selectedFile) return;
		
		downloading = true;
		downloadProgress = 0;
		
		// Simulate download progress
		const interval = setInterval(() => {
			downloadProgress += Math.random() * 30;
			if (downloadProgress >= 100) {
				downloadProgress = 100;
				clearInterval(interval);
				
				// All downloads are now free
				setTimeout(() => {
					downloading = false;
					showDownloadModal = false;
					selectedFile = null;
					downloadProgress = 0;
					
					// Show success message
					alert(`✅ Download completed! Enjoy your study material.`);
				}, 1000);
			}
		}, 200);
	}

	function closeDownloadModal() {
		if (!downloading) {
			showDownloadModal = false;
			selectedFile = null;
			downloadProgress = 0;
		}
	}

	function clearFilters() {
		searchTerm = '';
		selectedSubject = '';
		selectedYear = '';
		selectedExamType = '';
		sortBy = 'newest';
	}

	function getFileIcon(type) {
		if (type.includes('pdf')) return '📄';
		if (type.includes('word') || type.includes('document')) return '📝';
		if (type.includes('image')) return '🖼️';
		return '📁';
	}

	function formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getRatingStars(rating) {
		const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
		return stars;
	}
</script>

<div class="browse-container">
	<div class="card">
		<div class="section-header">
			<h2>🔍 Browse Past Questions</h2>
			<p>Discover and download high-quality study materials from fellow students</p>
		</div>

		<!-- Search and Filters -->
		<div class="search-filters">
			<div class="search-section">
				<div class="search-input-wrapper">
					<span class="search-icon">🔍</span>
					<input 
						type="text" 
						bind:value={searchTerm}
						placeholder="Search by subject, description, or filename..."
						class="search-input"
					/>
				</div>
			</div>

			<div class="filters-grid">
				<div class="form-group">
					<label for="subjectFilter">Subject</label>
					<select id="subjectFilter" bind:value={selectedSubject}>
						<option value="">All Subjects</option>
						{#each subjects as subject}
							<option value={subject}>{subject}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="yearFilter">Academic Year</label>
					<select id="yearFilter" bind:value={selectedYear}>
						<option value="">All Years</option>
						{#each years as year}
							<option value={year}>{year}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="examTypeFilter">Exam Type</label>
					<select id="examTypeFilter" bind:value={selectedExamType}>
						<option value="">All Types</option>
						{#each examTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<div class="form-group">
					<label for="sortBy">Sort By</label>
					<select id="sortBy" bind:value={sortBy}>
						<option value="newest">Newest First</option>
						<option value="popular">Most Popular</option>
						<option value="price-low">Price: Low to High</option>
						<option value="price-high">Price: High to Low</option>
						<option value="subject">Subject A-Z</option>
					</select>
				</div>
			</div>

			<div class="filter-actions">
				<button class="btn btn-secondary" on:click={clearFilters}>
					<span>🔄</span>
					Clear Filters
				</button>
			</div>
		</div>

		<!-- Results -->
		<div class="results-section">
			<div class="results-header">
				<h3>Available Files</h3>
				<div class="results-count">
					<span class="count-number">{filteredFiles.length}</span>
					<span class="count-label">files found</span>
				</div>
			</div>
			
			{#if filteredFiles.length === 0}
				<div class="no-results">
					<div class="no-results-icon">🔍</div>
					<h4>No files found</h4>
					<p>Try adjusting your search criteria or filters to find what you're looking for.</p>
				</div>
			{:else}
				<div class="files-grid">
					{#each filteredFiles as file}
						<div class="file-card">
							<div class="file-header">
								<div class="file-icon">{getFileIcon(file.type)}</div>
								<div class="file-title">
									<h4>{file.subject}</h4>
									<div class="file-type-badges">
										<span class="file-type">{file.examType}</span>
										{#if file.price === 0 || file.isFree}
											<span class="free-badge">FREE</span>
										{/if}
									</div>
								</div>
								<div class="file-price">
									{#if file.price === 0 || file.isFree}
										<span class="price-amount free">FREE</span>
									{:else}
										<span class="price-amount">{file.price}</span>
										<span class="price-label">coins</span>
									{/if}
								</div>
							</div>
							
							<div class="file-content">
								<div class="file-name">{file.name}</div>
								<div class="file-description">{file.description}</div>
								
								<div class="file-meta">
									<div class="meta-item">
										<span class="meta-icon">📅</span>
										<span class="meta-text">{file.year}</span>
									</div>
									<div class="meta-item">
										<span class="meta-icon">📊</span>
										<span class="meta-text">{formatFileSize(file.size)}</span>
									</div>
									<div class="meta-item">
										<span class="meta-icon">📥</span>
										<span class="meta-text">{file.downloads || 0} downloads</span>
									</div>
									{#if file.rating}
									<div class="meta-item">
										<span class="meta-icon">⭐</span>
										<span class="meta-text">{file.rating} ({getRatingStars(file.rating)})</span>
									</div>
									{/if}
								</div>
							</div>

							<div class="file-actions">
								<button 
									class="download-btn available"
									on:click={() => openDownloadModal(file)}
								>
									<span class="btn-icon">👁️</span>
									<span class="btn-text">View & Download</span>
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Preview & Download Modal -->
	{#if showDownloadModal && selectedFile}
	<div class="modal-overlay" on:click={closeDownloadModal} on:keydown={closeDownloadModal} role="button" tabindex="0">
		<div class="modal-content preview-modal" on:click|stopPropagation on:keydown|stopPropagation>
				<div class="modal-header">
					<h3>📄 Past Question Preview</h3>
					<button class="modal-close" on:click={closeDownloadModal}>×</button>
				</div>
				
				<div class="modal-body">
					<div class="file-preview-section">
						<div class="preview-header">
							<div class="preview-icon">{getFileIcon(selectedFile.type)}</div>
							<div class="preview-info">
								<h4>{selectedFile.name}</h4>
								<div class="preview-meta">
									<span class="meta-badge">{selectedFile.subject}</span>
									<span class="meta-badge">{selectedFile.examType}</span>
									<span class="meta-badge">{selectedFile.year}</span>
								</div>
							</div>
						</div>
						
						<div class="preview-description">
							<h5>Description</h5>
							<p>{selectedFile.description}</p>
						</div>

						<div class="preview-stats">
							<div class="stat-item">
								<span class="stat-icon">📊</span>
								<span class="stat-label">File Size</span>
								<span class="stat-value">{formatFileSize(selectedFile.size)}</span>
							</div>
							<div class="stat-item">
								<span class="stat-icon">📥</span>
								<span class="stat-label">Downloads</span>
								<span class="stat-value">{selectedFile.downloads || 0}</span>
							</div>
							<div class="stat-item">
								<span class="stat-icon">⭐</span>
								<span class="stat-label">Rating</span>
								<span class="stat-value">{selectedFile.rating || 'N/A'}</span>
							</div>
							<div class="stat-item">
								<span class="stat-icon">📅</span>
								<span class="stat-label">Uploaded</span>
								<span class="stat-value">{new Date(selectedFile.uploadDate).toLocaleDateString()}</span>
							</div>
						</div>

						<div class="preview-content">
							<h5>Preview Content</h5>
							<div class="content-preview">
								<div class="preview-placeholder">
									<div class="preview-icon-large">{getFileIcon(selectedFile.type)}</div>
									<p>This is a preview of the past question content.</p>
									<p>Click "Download" to get the full file.</p>
								</div>
							</div>
						</div>
					</div>

					{#if downloading}
						<div class="download-progress">
							<div class="progress-bar">
								<div class="progress-fill" style="width: {downloadProgress}%"></div>
							</div>
							<div class="progress-text">Downloading... {Math.round(downloadProgress)}%</div>
						</div>
					{/if}
				</div>
				
				<div class="modal-footer">
					{#if !downloading}
						<button class="btn btn-secondary" on:click={closeDownloadModal}>
							<span>←</span>
							Back to Browse
						</button>
						<button class="btn btn-success" on:click={confirmDownload}>
							<span>📥</span>
							Download File
						</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.browse-container {
		max-width: 1400px;
		margin: 0 auto;
	}

	.section-header {
		text-align: center;
		margin-bottom: 40px;
	}

	.section-header h2 {
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 12px;
	}

	.section-header p {
		font-size: 1.1rem;
		color: var(--text-secondary);
		max-width: 600px;
		margin: 0 auto;
	}

	.search-filters {
		background: var(--bg-secondary);
		padding: 32px;
		border-radius: var(--radius-xl);
		margin-bottom: 32px;
		border: 1px solid var(--border-color);
	}

	.search-section {
		margin-bottom: 24px;
	}

	.search-input-wrapper {
		position: relative;
		max-width: 600px;
		margin: 0 auto;
	}

	.search-icon {
		position: absolute;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 18px;
		color: var(--text-light);
	}

	.search-input {
		width: 100%;
		padding: 16px 16px 16px 48px;
		border: 2px solid var(--border-color);
		border-radius: var(--radius-lg);
		font-size: 16px;
		background: var(--bg-primary);
		transition: all 0.2s ease;
	}

	.search-input:focus {
		border-color: var(--border-focus);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.filters-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 20px;
		margin-bottom: 24px;
	}

	.filter-actions {
		text-align: center;
	}

	.results-section {
		margin-top: 32px;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 24px;
		padding-bottom: 16px;
		border-bottom: 2px solid var(--border-color);
	}

	.results-header h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.results-count {
		display: flex;
		align-items: center;
		gap: 8px;
		background: var(--primary-color);
		color: white;
		padding: 8px 16px;
		border-radius: 20px;
		font-weight: 500;
	}

	.count-number {
		font-size: 1.2rem;
		font-weight: 700;
	}

	.count-label {
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.no-results {
		text-align: center;
		padding: 80px 20px;
		color: var(--text-secondary);
	}

	.no-results-icon {
		font-size: 4rem;
		margin-bottom: 24px;
		opacity: 0.5;
	}

	.no-results h4 {
		font-size: 1.5rem;
		margin-bottom: 12px;
		color: var(--text-primary);
	}

	.files-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
		gap: 24px;
	}

	.file-card {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: var(--radius-xl);
		padding: 24px;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
	}

	.file-card::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.file-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-xl);
		border-color: var(--primary-color);
	}

	.file-card:hover::before {
		opacity: 1;
	}

	.file-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 20px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--border-color);
	}

	.file-icon {
		font-size: 2rem;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary);
		border-radius: var(--radius-lg);
	}

	.file-title {
		flex: 1;
	}

	.file-title h4 {
		font-size: 1.2rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 4px 0;
	}

	.file-type-badges {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.file-type {
		background: var(--primary-color);
		color: white;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.free-badge {
		background: var(--success-color);
		color: white;
		padding: 2px 8px;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		animation: pulse 2s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.8; }
	}

	.file-price {
		text-align: right;
	}

	.price-amount {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--accent-color);
		display: block;
	}

	.price-amount.free {
		color: var(--success-color);
		font-size: 1.2rem;
	}

	.price-label {
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.file-content {
		margin-bottom: 20px;
	}

	.file-name {
		font-weight: 500;
		color: var(--text-primary);
		margin-bottom: 8px;
		font-size: 0.95rem;
		word-break: break-word;
	}

	.file-description {
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.5;
		margin-bottom: 16px;
	}

	.file-meta {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
		gap: 12px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.meta-icon {
		font-size: 0.9rem;
	}

	.file-actions {
		text-align: center;
	}

	.download-btn {
		width: 100%;
		padding: 12px 24px;
		border: none;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: 0.95rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.download-btn.available {
		background: var(--success-color);
		color: white;
	}

	.download-btn.available:hover {
		background: #059669;
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}


	.btn-icon {
		font-size: 1.1rem;
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

	.modal-content {
		background: var(--bg-primary);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-xl);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		animation: slideUp 0.3s ease-out;
	}

	.preview-modal {
		max-width: 700px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 24px 24px 0;
		border-bottom: 1px solid var(--border-color);
		margin-bottom: 24px;
		padding-bottom: 16px;
	}

	.modal-header h3 {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		color: var(--text-light);
		cursor: pointer;
		padding: 4px;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.modal-close:hover {
		background: var(--bg-tertiary);
		color: var(--text-primary);
	}

	.modal-body {
		padding: 0 24px;
	}


	.preview-icon {
		font-size: 2.5rem;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-primary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
	}

	.preview-info h4 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 8px 0;
		word-break: break-word;
	}


	/* Preview Modal Styles */
	.file-preview-section {
		margin-bottom: 24px;
	}

	.preview-header {
		display: flex;
		gap: 16px;
		margin-bottom: 24px;
		padding-bottom: 20px;
		border-bottom: 1px solid var(--border-color);
	}

	.preview-icon {
		font-size: 3rem;
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-tertiary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
	}

	.preview-info {
		flex: 1;
	}

	.preview-info h4 {
		font-size: 1.3rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 12px 0;
		word-break: break-word;
	}


	.preview-meta {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
	}

	.meta-badge {
		background: var(--primary-color);
		color: white;
		padding: 4px 12px;
		border-radius: 16px;
		font-size: 0.8rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.preview-description {
		margin-bottom: 24px;
	}

	.preview-description h5 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 8px 0;
	}

	.preview-description p {
		color: var(--text-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.preview-stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 16px;
		margin-bottom: 24px;
		padding: 20px;
		background: var(--bg-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-color);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 4px;
	}

	.stat-icon {
		font-size: 1.5rem;
		margin-bottom: 4px;
	}

	.stat-label {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.stat-value {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.preview-content {
		margin-bottom: 24px;
	}

	.preview-content h5 {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0 0 12px 0;
	}

	.content-preview {
		background: var(--bg-secondary);
		border: 2px dashed var(--border-color);
		border-radius: var(--radius-lg);
		padding: 40px;
		text-align: center;
	}

	.preview-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.preview-icon-large {
		font-size: 4rem;
		opacity: 0.6;
	}

	.preview-placeholder p {
		color: var(--text-secondary);
		margin: 0;
		font-size: 0.95rem;
	}

	.preview-placeholder p:first-of-type {
		font-weight: 500;
		color: var(--text-primary);
	}

	.download-progress {
		margin-bottom: 24px;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: var(--bg-tertiary);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--success-color), #34d399);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.progress-text {
		text-align: center;
		font-size: 0.9rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.modal-footer {
		display: flex;
		gap: 12px;
		padding: 24px;
		border-top: 1px solid var(--border-color);
		margin-top: 24px;
	}

	.modal-footer .btn {
		flex: 1;
	}

	@media (max-width: 768px) {
		.files-grid {
			grid-template-columns: 1fr;
		}

		.filters-grid {
			grid-template-columns: 1fr;
		}

		.results-header {
			flex-direction: column;
			gap: 16px;
			align-items: flex-start;
		}

		.modal-content {
			margin: 10px;
			max-width: none;
		}


		.modal-footer {
			flex-direction: column;
		}
	}
</style>
