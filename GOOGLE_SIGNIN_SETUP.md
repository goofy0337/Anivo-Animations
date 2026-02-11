# Google Sign-In Setup Guide

## Overview
Your application now supports Google Sign-In authentication, which allows users to sign in faster without creating a password.

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Click "Enable APIs and Services"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "Credentials"
   - Click "Create Credentials" → "OAuth 2.0 Client ID"
   - Select "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3111` (for local development)
     - `https://goofy0337.github.io` (for production)
   - Copy your Client ID

### 2. Backend Configuration

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```

2. Install dependencies if not already done:
   ```bash
   npm install
   ```

3. Create a `.env` file with:
   ```
   JWT_SECRET=your_super_secret_random_string_here
   GOOGLE_CLIENT_ID=your_google_client_id_here
   PORT=4567
   ```

### 3. Frontend Configuration

1. Navigate to the frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies if not already done:
   ```bash
   npm install
   ```

3. Create a `.env` file with:
   ```
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   VITE_API_URL=/api
   ```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
Server will run on http://localhost:4567

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:3111

## How It Works

### Login Flow

1. **Traditional Login**: 
   - User enters email and password
   - Backend verifies credentials using bcrypt
   - JWT token is returned and stored in localStorage

2. **Google Sign-In**:
   - User clicks "Sign in with Google"
   - Google returns an ID token
   - Frontend sends token to backend
   - Backend verifies token with Google's servers
   - If user exists: logs them in
   - If user doesn't exist: automatically creates account and logs them in

### Key Features

- **Automatic Account Creation**: Users who sign in with Google for the first time get an account automatically
- **Secure Token Verification**: All Google tokens are verified server-side
- **JWT Token**: Both login methods use the same JWT token system for session management
- **Password Security**: Google users get a random password (they won't need it since they use Google Sign-In)

## Troubleshooting

### "Sign in with Google" button not showing
- Check that `VITE_GOOGLE_CLIENT_ID` is set in frontend `.env`
- Clear browser cache and refresh
- Check browser console for errors

### "Invalid Google token" error
- Verify `GOOGLE_CLIENT_ID` is correct in backend `.env`
- Check that the Client ID matches between frontend and backend
- Verify that your authorized redirect URIs include your current domain in Google Console

### Library installation issues
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Make sure you're using Node.js 18.x or higher

## Security Notes

- Never commit `.env` files to Git
- Keep `JWT_SECRET` random and long
- Rotate `JWT_SECRET` periodically in production
- Always use HTTPS in production
- Store tokens securely (httpOnly cookies are recommended for production)

## API Endpoints

- `POST /api/login` - Traditional login (email, password)
- `POST /api/google-login` - Google Sign-In (token)
- `POST /api/signup` - Create new account (username, email, password)
- `GET /api/user` - Get current user (requires valid token)
- `GET /api/health` - Health check

