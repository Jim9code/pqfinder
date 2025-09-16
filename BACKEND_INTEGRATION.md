# Backend Integration Guide

## Current Setup

✅ **Frontend**: Pure Svelte app (works independently)
✅ **API Service**: Ready to switch between localStorage and FastAPI
✅ **Hosting**: Frontend on Vercel, Backend can be anywhere

## When FastAPI Backend is Ready

### 1. Update API Configuration

In `src/services/api.js`, change:
```javascript
this.useLocalStorage = false; // Switch to backend mode
this.baseUrl = 'https://your-fastapi-backend.com'; // Your backend URL
```

### 2. FastAPI Backend Endpoints Needed

The backend dev should implement these endpoints:

#### User Management
```
GET    /api/user/coins           - Get user coin balance
PUT    /api/user/coins           - Update user coin balance
```

#### File Management
```
GET    /api/files/uploaded       - Get user's uploaded files
GET    /api/files/available      - Get all available files
POST   /api/files/upload         - Upload new file
GET    /api/files/{id}/download  - Download file
```

#### Withdrawal Management
```
GET    /api/withdrawals          - Get withdrawal history
POST   /api/withdrawals          - Request new withdrawal
```

### 3. Database Schema Suggestions

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    coins INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Files table
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    filename VARCHAR(255),
    subject VARCHAR(100),
    year INTEGER,
    exam_type VARCHAR(50),
    description TEXT,
    price INTEGER,
    file_path VARCHAR(500),
    upload_date TIMESTAMP DEFAULT NOW()
);

-- Withdrawals table
CREATE TABLE withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    amount INTEGER,
    cash_amount DECIMAL(10,2),
    method VARCHAR(20),
    details JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. Deployment Options for FastAPI

#### Option A: Railway (Recommended)
- Easy deployment
- Automatic HTTPS
- Database included
- Free tier available

#### Option B: Render
- Similar to Railway
- Good for Python apps
- Free tier available

#### Option C: DigitalOcean App Platform
- More control
- Better for production
- Paid service

#### Option D: Vercel Serverless Functions
- Keep everything on Vercel
- Use Vercel's Python runtime
- Good for simple APIs

### 5. Environment Variables

Frontend will need:
```javascript
// In vercel.json or environment variables
{
  "REACT_APP_API_URL": "https://your-backend.com"
}
```

### 6. CORS Configuration

Backend needs to allow frontend domain:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Migration Steps

1. **Backend Dev**: Implement FastAPI with all endpoints
2. **Frontend**: Update `api.js` to use backend
3. **Deploy**: Both frontend and backend
4. **Test**: Verify all functionality works
5. **Go Live**: Update production URLs

## Benefits of This Approach

✅ **Independent Development**: Frontend and backend can be developed separately
✅ **Easy Testing**: Frontend works without backend
✅ **Flexible Hosting**: Each can be hosted optimally
✅ **Simple Migration**: Just flip a switch in `api.js`
✅ **No Breaking Changes**: Users won't notice the switch

## Current Status

🟢 **Ready to Deploy**: Frontend works perfectly on Vercel
🟡 **Backend Integration**: Ready when backend is complete
🟢 **User Experience**: No changes needed for users
