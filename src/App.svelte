<script>
	import { onMount } from 'svelte';
	import LandingPage from './components/LandingPage.svelte';
	import NavHeader from './components/NavHeader.svelte';
	import UploadComponent from './components/UploadComponent.svelte';
	import BrowseComponent from './components/BrowseComponent.svelte';
	import WalletComponent from './components/WalletComponent.svelte';
	import api from './services/api.js';

	export const name = 'PQ Finder';
	
	let currentView = 'browse';
	let user = null;
	let userBalance = 0;
	let uploadedFiles = [];
	let availableFiles = [];
	let showLandingPage = true;

	// Sample data to make the site look active
	const sampleFiles = [
		{
			id: 1,
			name: "Mathematics_2023_Final_Exam.pdf",
			subject: "Mathematics",
			year: 2023,
			examType: "Final",
			description: "Complete final exam with solutions and detailed explanations",
			price: 150,
			uploadDate: "2024-01-15T10:30:00Z",
			size: 2048576,
			type: "application/pdf",
			downloads: 47,
			rating: 4.8
		},
		{
			id: 2,
			name: "Physics_Midterm_2023_FREE.pdf",
			subject: "Physics",
			year: 2023,
			examType: "Midterm",
			description: "Physics midterm exam covering mechanics and thermodynamics - FREE SAMPLE",
			price: 0,
			uploadDate: "2024-01-14T14:20:00Z",
			size: 1536000,
			type: "application/pdf",
			downloads: 89,
			rating: 4.6,
			isFree: true
		},
		{
			id: 3,
			name: "Chemistry_Quiz_Collection.pdf",
			subject: "Chemistry",
			year: 2023,
			examType: "Quiz",
			description: "Collection of 5 chemistry quizzes with answer keys",
			price: 80,
			uploadDate: "2024-01-13T09:15:00Z",
			size: 1024000,
			type: "application/pdf",
			downloads: 28,
			rating: 4.7
		},
		{
			id: 4,
			name: "Computer_Science_Sample_2023_FREE.pdf",
			subject: "Computer Science",
			year: 2023,
			examType: "Final",
			description: "Sample Computer Science questions - FREE PREVIEW",
			price: 0,
			uploadDate: "2024-01-12T16:45:00Z",
			size: 1024000,
			type: "application/pdf",
			downloads: 156,
			rating: 4.9,
			isFree: true
		},
		{
			id: 5,
			name: "Economics_Assignment_2023.docx",
			subject: "Economics",
			year: 2023,
			examType: "Assignment",
			description: "Economics assignment with case studies and analysis",
			price: 100,
			uploadDate: "2024-01-11T11:30:00Z",
			size: 512000,
			type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			downloads: 19,
			rating: 4.5
		},
		{
			id: 6,
			name: "Biology_Lab_Report_FREE.pdf",
			subject: "Biology",
			year: 2023,
			examType: "Assignment",
			description: "Sample biology lab report with diagrams - FREE",
			price: 0,
			uploadDate: "2024-01-10T13:20:00Z",
			size: 512000,
			type: "application/pdf",
			downloads: 67,
			rating: 4.4,
			isFree: true
		},
		{
			id: 7,
			name: "Mathematics_Quiz_Sample_FREE.pdf",
			subject: "Mathematics",
			year: 2023,
			examType: "Quiz",
			description: "Free sample mathematics quiz questions",
			price: 0,
			uploadDate: "2024-01-09T08:15:00Z",
			size: 768000,
			type: "application/pdf",
			downloads: 124,
			rating: 4.7,
			isFree: true
		},
		{
			id: 8,
			name: "Engineering_Design_2023.pdf",
			subject: "Engineering",
			year: 2023,
			examType: "Assignment",
			description: "Engineering design project with detailed solutions",
			price: 180,
			uploadDate: "2024-01-08T15:30:00Z",
			size: 2560000,
			type: "application/pdf",
			downloads: 23,
			rating: 4.8
		}
	];

	// Load data on mount
	onMount(async () => {
		// Check if user is already logged in
		const savedUser = localStorage.getItem('user');
		if (savedUser) {
			user = JSON.parse(savedUser);
			showLandingPage = false;
		}
		
		userBalance = await api.getUserCoins();
		uploadedFiles = await api.getUploadedFiles();
		availableFiles = await api.getAvailableFiles();
		
		// Add sample data if no files exist
		if (availableFiles.length === 0) {
			availableFiles = sampleFiles;
			localStorage.setItem('availableFiles', JSON.stringify(availableFiles));
		}
	});

	function switchView(view) {
		currentView = view;
	}

	function handleUserLogin(event) {
		user = event.detail;
		user.balance = userBalance;
		showLandingPage = false;
		localStorage.setItem('user', JSON.stringify(user));
	}

	function handleLogout() {
		user = null;
		showLandingPage = true;
		localStorage.removeItem('user');
	}

	function handleViewChange(event) {
		currentView = event.detail;
	}

	function handleShowAuth() {
		showLandingPage = true;
	}

	async function addCoins(amount) {
		userBalance += amount;
		if (user) {
			user.balance = userBalance;
			localStorage.setItem('user', JSON.stringify(user));
		}
		await api.updateUserCoins(userBalance);
	}

	async function spendCoins(amount) {
		if (userBalance >= amount) {
			userBalance -= amount;
			if (user) {
				user.balance = userBalance;
				localStorage.setItem('user', JSON.stringify(user));
			}
			await api.updateUserCoins(userBalance);
			return true;
		}
		return false;
	}

	async function addUploadedFile(file) {
		uploadedFiles.push(file);
		// File will be saved via API service
	}

	async function addAvailableFile(file) {
		availableFiles.push(file);
		// File will be saved via API service
	}
</script>

{#if showLandingPage}
	<LandingPage on:userLogin={handleUserLogin} />
{:else}
	<main>
		<NavHeader 
			{user} 
			{currentView} 
			on:viewChange={handleViewChange}
			on:logout={handleLogout}
			on:showAuth={handleShowAuth}
		/>
		
		<div class="app-content">
			<div class="container">
				<div class="content-area slide-up">
					{#if currentView === 'browse'}
						<BrowseComponent 
							{availableFiles} 
							userCoins={userBalance} 
							onSpendCoins={spendCoins}
						/>
					{:else if currentView === 'upload'}
						<UploadComponent 
							{uploadedFiles} 
							onAddCoins={addCoins}
							onAddUploadedFile={addUploadedFile}
							onAddAvailableFile={addAvailableFile}
						/>
					{:else if currentView === 'wallet'}
						<WalletComponent 
							userCoins={userBalance} 
							{uploadedFiles}
						/>
					{/if}
				</div>
			</div>
		</div>
	</main>
{/if}

<style>
	main {
		min-height: 100vh;
		padding: 0;
	}

	.app-content {
		padding-top: 70px; /* Account for fixed nav header */
		min-height: calc(100vh - 70px);
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}

	.content-area {
		min-height: 400px;
	}

	@media (max-width: 768px) {
		.app-content {
			padding-top: 60px; /* Account for smaller nav header on mobile */
		}
	}
</style>
