# Anivo Animation - Login System Fixes & Google Sign-In

## What's Been Fixed and Added

### 1. **Google Sign-In Integration** ✅
- Added "Sign in with Google" button to the login page
- Automatic account creation for first-time Google users
- Secure token verification with Google's servers
- Seamless user experience with OAuth 2.0 flow

### 2. **Enhanced Backend Server**
- Added Google OAuth support with `google-auth-library`
- New `/api/google-login` endpoint for Google authentication
- Automatic user account creation from Google profile data
- Robust error handling for authentication

### 3. **Improved Frontend**
- Updated Login component with Google Sign-In button
- Better UI/UX with "or" divider between login methods
- Proper environment variable configuration
- Responsive Google button styling

### 4. **Configuration Files**
- `.env.example` files for both backend and frontend
- Clear setup instructions in `GOOGLE_SIGNIN_SETUP.md`

## Installation & Setup

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher
- Google Cloud Console account (for OAuth credentials)

### Step 1: Get Google OAuth Credentials

1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 Web Application Credentials
5. Add authorized origins:
   - `http://localhost:3111` (development)
   - `https://goofy0337.github.io` (production)
6. Copy your **Client ID**

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
JWT_SECRET=your_super_secret_key_generate_a_random_string
GOOGLE_CLIENT_ID=your_google_client_id_from_step_1
PORT=4567
EOF

# Start backend server
npm run dev
```

Backend will run on: `http://localhost:4567`

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_GOOGLE_CLIENT_ID=your_google_client_id_from_step_1
VITE_API_URL=/api
EOF

# Start frontend development server
npm run dev
```

Frontend will run on: `http://localhost:3111`

## How to Use

### Traditional Login
1. Click "Sign In" button
2. Enter your email and password
3. Click "Sign In" button

### Google Sign-In (Faster!)
1. Click the "Sign in with Google" button
2. Select your Google account (new accounts are auto-created)
3. You're logged in!

## Project Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | Traditional login with email/password |
| POST | `/api/google-login` | Google OAuth login |
| POST | `/api/signup` | Create new account |
| GET | `/api/user` | Get current user (requires token) |
| GET | `/api/health` | Server health check |
| GET | `/api/projects` | Get user's projects |
| POST | `/api/projects` | Create new project |

## Deployment

### Backend Deployment (Railway/Render/Fly.io)

1. Push to GitHub
2. Connect your repository to your hosting platform
3. Set environment variables:
   ```
   JWT_SECRET=<your_random_secret>
   GOOGLE_CLIENT_ID=<your_google_client_id>
   ```
4. Make sure production domain is authorized in Google Console

### Frontend Deployment (GitHub Pages / Vercel)

1. Update `vite.config.js` base if needed:
   ```js
   base: '/Anivo-Animations/', // for GitHub Pages
   // or remove for custom domain
   ```

2. Build and deploy:
   ```bash
   npm run build
   npm run preview
   ```

## Troubleshooting

### Login Not Working

**Issue**: Backend endpoint returns 500 error
- **Solution**: Check that `JWT_SECRET` is set in backend `.env`
- **Solution**: Verify database connection in `backend/server.js`

**Issue**: "No token provided" error
- **Solution**: Clear localStorage and try again
- **Solution**: Check that login endpoint is returning a token

**Issue**: CORS errors
- **Solution**: Verify vite.config.js proxy is set to `http://localhost:4567`
- **Solution**: Check backend has CORS enabled

### Google Sign-In Not Working

**Issue**: Google button not showing
- **Solution**: Set `VITE_GOOGLE_CLIENT_ID` in frontend `.env`
- **Solution**: Check that source is authorized in Google Console

**Issue**: "Invalid Google token" error
- **Solution**: Verify `GOOGLE_CLIENT_ID` matches in both frontend `.env` and backend `.env`
- **Solution**: Check Google Client ID is valid in Google Cloud Console
- **Solution**: Verify authorized JavaScript origins in Google Console

**Issue**: Browser console shows 403 error
- **Solution**: Make sure to click the Google Sign-In button (not just a regular button)
- **Solution**: Check browser console for specific Google Auth errors

## File Structure

```
3d-animation-editor/
├── backend/
│   ├── server.js                # Main server with new Google OAuth endpoint
│   ├── package.json             # Added google-auth-library
│   ├── .env                     # Configuration (create this)
│   ├── .env.example             # Reference for .env
│   └── users.db                 # SQLite database
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx        # Updated with Google Sign-In button
│   │   │   └── Login.css        # Styled Google button
│   │   ├── api/
│   │   │   └── api.js           # Added googleLogin() method
│   │   └── main.jsx
│   ├── .env                     # Configuration (create this)
│   ├── .env.example             # Reference for .env
│   └── vite.config.js
├── GOOGLE_SIGNIN_SETUP.md       # Detailed setup guide
└── README.md                     # Original documentation

```

## Key Improvements Made

1. **Security**
   - Google tokens verified server-side
   - JWT tokens for session management
   - Bcrypt password hashing for traditional login
   - Environment variables for sensitive data

2. **User Experience**
   - One-click Google Sign-In
   - Automatic account creation
   - Clear error messages
   - Responsive design

3. **Code Quality**
   - Error handling on both frontend and backend
   - Environment configuration
   - Comments and documentation
   - Follows React best practices

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Login button not submitting | Check network tab, verify backend is running |
| "All fields required" | Ensure all form fields are filled |
| Token not saving | Check localStorage in DevTools |
| CORS error | Verify proxy in vite.config.js and CORS in server.js |
| Google button grey/inactive | Check `VITE_GOOGLE_CLIENT_ID` is set |
| Database error | Delete `users.db` and restart server |

## Next Steps

1. Get Google OAuth credentials (see setup guide)
2. Create `.env` files in both backend and frontend
3. Install dependencies: `npm install` in both directories
4. Run backend: `npm run dev` in backend folder
5. Run frontend: `npm run dev` in frontend folder
6. Visit `http://localhost:3111` and test the login!

## Support

For issues or questions:
- Check the `GOOGLE_SIGNIN_SETUP.md` file
- Review error messages in browser console
- Verify all `.env` variables are set correctly
- Ensure Node.js version is 18.x or higher

---

Happy Animating! 🎨✨
