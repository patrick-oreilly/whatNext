# Frontend-Backend Connection Setup

## ✅ Completed Updates

### 1. Frontend Configuration Updated
**Files Modified:**
- `web_frontend/.env` - Line 1
- `web_frontend/.env.example` - Line 1

**Change:**
```diff
- VITE_API_BASE_URL=http://localhost:8080
+ VITE_API_BASE_URL=https://whats-next-backend-684653559017.us-central1.run.app
```

### 2. Backend CORS Settings Updated
**File Modified:**
- `backend/core/config.py` - Lines 13-18

**Change:**
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite default dev server
    "http://localhost:5174",
    "*"  # Allow all for now - update with specific frontend URL after deployment
]
```

---

## Next Steps

### Step 1: Redeploy Backend with Updated CORS Settings

```bash
cd /Users/patrickoreilly/Desktop/whats_next/backend

gcloud run deploy whats-next-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=AIzaSyD1cEJwyWjwgHNfQ14dHXnfecY4oEOpLbU
```

### Step 2: Run Frontend Locally to Test

```bash
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

The frontend will now connect to the deployed backend at:
`https://whats-next-backend-684653559017.us-central1.run.app`

### Step 3: Test the Connection

1. Open browser to your local frontend (usually `http://localhost:5173`)
2. Check browser console for any CORS errors
3. Try creating a room to test the API connection
4. Verify the backend is responding:
   ```bash
   curl https://whats-next-backend-684653559017.us-central1.run.app/health
   ```

---

## Production Deployment - After Frontend is Deployed

When you deploy your frontend to production (Vercel, Netlify, etc.), update the backend CORS settings:

### Option 1: Update via Code

Edit `backend/core/config.py`:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",        # Local development
    "http://localhost:5173",        # Vite dev server
    "https://your-frontend.vercel.app",  # Production frontend
    "https://your-custom-domain.com"     # Custom domain (if applicable)
]
```

Then redeploy the backend.

### Option 2: Use Environment Variables (Recommended)

Update `backend/core/config.py` to read from environment:
```python
CORS_ORIGINS: List[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,*"
).split(",")
```

Then set via Cloud Run:
```bash
gcloud run services update whats-next-backend \
  --region us-central1 \
  --update-env-vars CORS_ORIGINS="http://localhost:5173,https://your-frontend.vercel.app"
```

---

## Deployment Options for Frontend

### Option 1: Vercel (Recommended for Vite/React)

```bash
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard or CLI
vercel env add VITE_API_BASE_URL production
# Enter: https://whats-next-backend-684653559017.us-central1.run.app
```

### Option 2: Netlify

```bash
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# Install Netlify CLI
npm install -g netlify-cli

# Build the app
npm run build

# Deploy
netlify deploy --prod --dir=dist

# Set environment variable
netlify env:set VITE_API_BASE_URL https://whats-next-backend-684653559017.us-central1.run.app
```

### Option 3: Google Cloud Storage + Cloud CDN

```bash
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# Build the app
npm run build

# Create a bucket
gsutil mb gs://whats-next-frontend

# Make it public
gsutil iam ch allUsers:objectViewer gs://whats-next-frontend

# Enable website configuration
gsutil web set -m index.html -e index.html gs://whats-next-frontend

# Upload files
gsutil -m cp -r dist/* gs://whats-next-frontend/
```

### Option 4: Firebase Hosting

```bash
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

---

## Testing Checklist

- [ ] Backend health check returns 200: `curl https://whats-next-backend-684653559017.us-central1.run.app/health`
- [ ] Frontend loads without errors
- [ ] No CORS errors in browser console
- [ ] Can create a new room
- [ ] Can join an existing room
- [ ] Can submit player input
- [ ] Can vote on inputs
- [ ] Story streaming works (SSE connection)
- [ ] Game state updates properly
- [ ] Can complete a full game

---

## Troubleshooting

### CORS Errors

If you see CORS errors like:
```
Access to fetch at 'https://whats-next-backend...' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**Solution:**
1. Check that backend CORS settings include your frontend origin
2. Redeploy backend after updating CORS settings
3. Clear browser cache and hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

### API Connection Refused

If API calls fail with "connection refused":
1. Verify backend is running: `curl https://whats-next-backend-684653559017.us-central1.run.app/health`
2. Check backend logs: `gcloud run logs read whats-next-backend --region us-central1 --limit 50`
3. Verify `.env` file has correct URL

### Environment Variables Not Loading

If frontend still connects to localhost:
1. Restart Vite dev server (stop and run `npm run dev` again)
2. Verify `.env` file is in the root of `web_frontend/` directory
3. Check that variable starts with `VITE_` prefix
4. Clear Vite cache: `rm -rf node_modules/.vite`

### SSE/Streaming Not Working

If story streaming fails:
1. Check that EventSource URL is correct in browser Network tab
2. Verify backend `/api/story/stream/{room_id}` endpoint is accessible
3. Check for proxy/firewall issues blocking SSE connections
4. Ensure backend keeps connection open (check timeout settings)

---

## Current Status

✅ **Backend:** Deployed and running at https://whats-next-backend-684653559017.us-central1.run.app
✅ **Frontend Config:** Updated to use deployed backend
✅ **CORS:** Configured to allow localhost development
🔄 **Next:** Deploy backend with updated CORS, then test frontend locally

---

## Quick Commands

```bash
# Test backend
curl https://whats-next-backend-684653559017.us-central1.run.app/health

# Redeploy backend
cd /Users/patrickoreilly/Desktop/whats_next/backend && \
gcloud run deploy whats-next-backend \
  --source . --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=AIzaSyD1cEJwyWjwgHNfQ14dHXnfecY4oEOpLbU

# Run frontend locally
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend && npm run dev

# View backend logs
gcloud run logs read whats-next-backend --region us-central1 --limit 50 --format json

# List all rooms
curl https://whats-next-backend-684653559017.us-central1.run.app/rooms
```

---

## Security Notes

🔒 **For Production:**
1. Remove `"*"` from CORS origins
2. Specify exact frontend domains
3. Consider rate limiting
4. Add authentication if needed
5. Use environment variables for sensitive config
6. Enable Cloud Run authentication for internal APIs
7. Review API key permissions and rotate regularly

---

Good luck with your deployment! 🚀
