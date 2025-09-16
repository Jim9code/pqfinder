// API Service Layer - Easy to swap between localStorage and FastAPI

class ApiService {
  constructor() {
    this.baseUrl = 'http://localhost:8000'; // FastAPI backend URL
    this.useLocalStorage = true; // Set to false when backend is ready
  }

  // User/Coin Management
  async getUserCoins() {
    if (this.useLocalStorage) {
      return parseInt(localStorage.getItem('userCoins') || '0');
    }
    // FastAPI call: GET /api/user/coins
    const response = await fetch(`${this.baseUrl}/api/user/coins`);
    return response.json();
  }

  async updateUserCoins(coins) {
    if (this.useLocalStorage) {
      localStorage.setItem('userCoins', coins.toString());
      return coins;
    }
    // FastAPI call: PUT /api/user/coins
    const response = await fetch(`${this.baseUrl}/api/user/coins`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coins })
    });
    return response.json();
  }

  // File Management
  async getUploadedFiles() {
    if (this.useLocalStorage) {
      return JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
    }
    // FastAPI call: GET /api/files/uploaded
    const response = await fetch(`${this.baseUrl}/api/files/uploaded`);
    return response.json();
  }

  async getAvailableFiles() {
    if (this.useLocalStorage) {
      return JSON.parse(localStorage.getItem('availableFiles') || '[]');
    }
    // FastAPI call: GET /api/files/available
    const response = await fetch(`${this.baseUrl}/api/files/available`);
    return response.json();
  }

  async uploadFile(fileData) {
    if (this.useLocalStorage) {
      const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
      files.push(fileData);
      localStorage.setItem('uploadedFiles', JSON.stringify(files));
      return fileData;
    }
    // FastAPI call: POST /api/files/upload
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('subject', fileData.subject);
    formData.append('year', fileData.year);
    formData.append('examType', fileData.examType);
    formData.append('description', fileData.description);
    formData.append('price', fileData.price);

    const response = await fetch(`${this.baseUrl}/api/files/upload`, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }

  async downloadFile(fileId) {
    if (this.useLocalStorage) {
      // Simulate download
      return { success: true, message: 'Download started' };
    }
    // FastAPI call: GET /api/files/{fileId}/download
    const response = await fetch(`${this.baseUrl}/api/files/${fileId}/download`);
    return response.json();
  }

  // Withdrawal Management
  async getWithdrawalHistory() {
    if (this.useLocalStorage) {
      return JSON.parse(localStorage.getItem('withdrawalHistory') || '[]');
    }
    // FastAPI call: GET /api/withdrawals
    const response = await fetch(`${this.baseUrl}/api/withdrawals`);
    return response.json();
  }

  async requestWithdrawal(withdrawalData) {
    if (this.useLocalStorage) {
      const history = JSON.parse(localStorage.getItem('withdrawalHistory') || '[]');
      const withdrawal = {
        id: Date.now(),
        ...withdrawalData,
        date: new Date().toISOString(),
        status: 'completed'
      };
      history.unshift(withdrawal);
      localStorage.setItem('withdrawalHistory', JSON.stringify(history));
      return withdrawal;
    }
    // FastAPI call: POST /api/withdrawals
    const response = await fetch(`${this.baseUrl}/api/withdrawals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withdrawalData)
    });
    return response.json();
  }

  // Switch to backend mode
  enableBackend() {
    this.useLocalStorage = false;
  }

  // Switch back to localStorage mode
  enableLocalStorage() {
    this.useLocalStorage = true;
  }
}

export default new ApiService();
