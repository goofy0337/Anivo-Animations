# ✅ Anivo Animation - Getting Started Checklist

## Step-by-Step Setup Guide

### Phase 1: Get Google OAuth Credentials (10 mins)

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Sign in with your Google account
- [ ] Create a new project (or select existing)
- [ ] Enable Google+ API:
  - [ ] Click "Enable APIs and Services"
  - [ ] Search for "Google+"
  - [ ] Click "Enable"
- [ ] Create OAuth Credentials:
  - [ ] Go to "Credentials" in left menu
  - [ ] Click "Create Credentials" → "OAuth 2.0 Client ID"
  - [ ] Select "Web application"
  - [ ] Name it "Anivo Animation" (optional)
  - [ ] Add Authorized JavaScript origins:
    - [ ] `http://localhost:3111`
    - [ ] `https://goofy0337.github.io`
  - [ ] Add Authorized redirect URIs:
    - [ ] `http://localhost:3111`
    - [ ] `https://goofy0337.github.io`
  - [ ] Click "Create"
  - [ ] Copy your **Client ID** (save it somewhere safe)
  - [ ] Click "Download JSON" (optional backup)

### Phase 2: Setup Backend (5 mins)

- [ ] Open your project folder: `3d-animation-editor/`
- [ ] Open `backend/` folder
- [ ] Create a `.env` file:
  ```
  JWT_SECRET=make_a_random_string_at_least_32_chars
  GOOGLE_CLIENT_ID=paste_your_client_id_here
  PORT=4567
  ```
  **Tip**: Generate a random string with: `openssl rand -base64 32` (or use any random generator)

- [ ] Run `npm install` in the backend folder
- [ ] Verify it works: `npm run dev`
- [ ] You should see: "Connected to SQLite database" and "Server running on http://localhost:4567"
- [ ] Keep this terminal open

### Phase 3: Setup Frontend (5 mins)

- [ ] Open a NEW terminal/command prompt
- [ ] Navigate to `3d-animation-editor/frontend/`
- [ ] Create a `.env` file:
  ```
  VITE_GOOGLE_CLIENT_ID=paste_your_client_id_here
  VITE_API_URL=/api
  ```

- [ ] Run `npm install` in the frontend folder
- [ ] Run `npm run dev`
- [ ] You should see: "Local: http://localhost:3111"

### Phase 4: Test the Login System (5 mins)

- [ ] Open browser: `http://localhost:3111`
- [ ] You should see the login page with:
  - [ ] "Sign in with Google" button
  - [ ] "or" divider
  - [ ] Email/password login form
  - [ ] "Sign up here" link

**Test Google Sign-In:**
- [ ] Click "Sign in with Google"
- [ ] Select your Google account
- [ ] You should be logged in and see projects page

**Test Traditional Login:**
- [ ] Click the "Sign up here" link
- [ ] Create a test account:
  - [ ] Username: `testuser`
  - [ ] Email: `test@example.com`
  - [ ] Password: `test123456` (must be 6+ chars)
  - [ ] Confirm Password: `test123456`
- [ ] Click "Sign Up"
- [ ] You should be logged in and see projects page

**Test Logout:**
- [ ] Click "Logout" button (top right)
- [ ] You should be back at login page

### Phase 5: Verify All Features

- [ ] Backend server running without errors
- [ ] Frontend server running without errors
- [ ] Google Sign-In button visible and clickable
- [ ] Google Sign-In logs in successfully
- [ ] Traditional login works
- [ ] Can create projects
- [ ] Can logout
- [ ] Refreshing page keeps you logged in
- [ ] Error messages display correctly

---

## Troubleshooting

### Google Button Not Showing
**What to check:**
1. [ ] Is `VITE_GOOGLE_CLIENT_ID` set in `frontend/.env`?
2. [ ] Browser console shows any errors? (Press F12)
3. [ ] Try hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

### "Invalid Google token" Error
1. [ ] Verify `GOOGLE_CLIENT_ID` is same in both `.env` files
2. [ ] Is `GOOGLE_CLIENT_ID` set in `backend/.env`?
3. [ ] Check credentials in Google Cloud Console are correct
4. [ ] Try signing out of Google and signing in again

### "Cannot POST /api/google-login"
1. [ ] Is backend server running? (Should say "Server running on http://localhost:4567")
2. [ ] Has correct `GOOGLE_CLIENT_ID` in `.env`?
3. [ ] In vite.config.js, is proxy set to `http://localhost:4567`?

### Login Not Working (Traditional)
1. [ ] Is backend running?
2. [ ] Is `JWT_SECRET` set in `backend/.env`?
3. [ ] Is the `.env` file in `backend/` folder (not nested)?
4. [ ] Check Network tab in browser (F12) - what does backend respond?

### "All fields required" Error (traditional login)
1. [ ] Make sure both email and password fields are filled
2. [ ] Password must be at least 6 characters

### "Email or username already exists"
1. [ ] Try different username or email
2. [ ] Or try logging in instead of signing up

### Database Error / SQLite Error
1. [ ] Delete `backend/users.db` file
2. [ ] Restart backend server
3. [ ] It will create a new database automatically

### Port Already in Use
- Backend won't start because port 4567 is taken:
  ```
  # Change PORT in backend/.env to 4568 (or another unused port)
  # Update proxy in frontend/vite.config.js to port 4568
  ```

---

## Quick Commands Reference

```bash
# Backend Setup
cd backend
npm install
npm run dev

# Frontend Setup (in new terminal)
cd frontend
npm install
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Important Files to Remember

| File | Purpose | Notes |
|------|---------|-------|
| `backend/.env` | Backend config | Create this, never commit to Git |
| `frontend/.env` | Frontend config | Create this, never commit to Git |
| `backend/server.js` | Backend server | ✅ Updated with Google OAuth |
| `frontend/src/components/Login.jsx` | Login page | ✅ Updated with Google button |
| `frontend/src/api/api.js` | API calls | ✅ Added googleLogin() |
| `GOOGLE_SIGNIN_SETUP.md` | Setup guide | Read if confused |
| `LOGIN_FIXES_GUIDE.md` | Full documentation | Comprehensive guide |

---

## Common Questions

**Q: Do I need to install anything else?**
A: No, just Node.js 18+. The `npm install` commands install everything else.

**Q: Can I use localhost instead of 3111/4567?**
A: Yes, but update Google Cloud Console authorized origins to match.

**Q: Will my Google account data be stored?**
A: Only email, name, and user ID. No password or sensitive data.

**Q: Can I use Facebook or GitHub login too?**
A: Not yet, but the system is designed to allow it easily in the future.

**Q: What if I lose my `JWT_SECRET`?**
A: Generate a new one in `.env`. All users will need to log in again.

**Q: Is this secure for production?**
A: Almost! For production, also:
1. Use HTTPS (not HTTP)
2. Use environment-specific configs
3. Implement refresh tokens
4. Add rate limiting
5. Add CSRF protection

---

## Success Indicators ✅

You've completed setup when:

✅ Backend runs without errors
✅ Frontend runs without errors  
✅ Can see login page with Google button
✅ Can sign in with Google
✅ Can sign in traditionally
✅ Can create projects
✅ Can logout and login again

---

## Next Steps (Optional)

Once everything works:

1. **Deploy Backend** (Railway/Render/Fly.io)
   - See `LOGIN_FIXES_GUIDE.md` deployment section

2. **Deploy Frontend** (GitHub Pages/Vercel)
   - See `LOGIN_FIXES_GUIDE.md` deployment section

3. **Add More Features**
   - More OAuth providers (Facebook, GitHub)
   - Email verification
   - Password reset
   - Two-factor authentication

4. **Improve Security**
   - Add refresh tokens
   - Implement rate limiting
   - Add CSRF tokens
   - Use httpOnly cookies

---

## Support Resources

- `GOOGLE_SIGNIN_SETUP.md` - Detailed setup guide
- `LOGIN_FIXES_GUIDE.md` - Complete implementation guide
- `IMPLEMENTATION_CHANGES.md` - Technical details of changes
- Google OAuth Docs: https://developers.google.com/identity/protocols/oauth2
- Node.js Docs: https://nodejs.org/docs/

---

**You've got this! 🚀**

If stuck:
1. Check browser console (F12)
2. Check terminal output
3. Read the guides above
4. Verify `.env` files
5. Restart servers
6. Try the troubleshooting section

Good luck! 🎨✨
