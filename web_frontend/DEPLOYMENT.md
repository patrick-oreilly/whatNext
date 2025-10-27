# Frontend Deployment Guide

Choose one of the deployment options below. **Vercel is recommended** for Vite/React applications.

---

## Option 1: Vercel (Recommended - Easiest) ⭐

Vercel is the easiest and fastest way to deploy your Vite/React frontend.

### Method A: Deploy with Vercel CLI (Fastest)

```bash
# 1. Install Vercel CLI globally
npm install -g vercel

# 2. Navigate to frontend directory
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# 3. Login to Vercel
vercel login

# 4. Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? whats-next-frontend (or your choice)
# - In which directory is your code located? ./
# - Want to override settings? No

# 5. Deploy to production
vercel --prod
```

Your app will be live at: `https://whats-next-frontend.vercel.app` (or similar)

### Method B: Deploy via GitHub (Continuous Deployment)

1. **Push to GitHub**
   ```bash
   cd /Users/patrickoreilly/Desktop/whats_next/web_frontend
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com
   - Click "Add New Project"
   - Import your GitHub repository
   - Select `web_frontend` folder (if monorepo) or root
   - Configure:
     - **Framework Preset:** Vite
     - **Root Directory:** `web_frontend` (if in monorepo)
     - **Build Command:** `npm run build`
     - **Output Directory:** `dist`
   - Add Environment Variable:
     - Key: `VITE_API_BASE_URL`
     - Value: `https://whats-next-backend-684653559017.us-central1.run.app`
   - Click "Deploy"

### After Deployment

Get your deployment URL from Vercel dashboard and update backend CORS:

```bash
# Update backend to allow your Vercel URL
cd /Users/patrickoreilly/Desktop/whats_next/backend
```

Edit `backend/core/config.py`:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",
    "https://your-app.vercel.app",  # Add your actual Vercel URL
    "*"
]
```

Then redeploy backend:
```bash
gcloud run deploy whats-next-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=
```

---

## Option 2: Netlify

### Method A: Netlify CLI

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Navigate to frontend directory
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# 3. Login
netlify login

# 4. Build your app
npm run build

# 5. Deploy
netlify deploy --prod --dir=dist

# 6. Set environment variable
netlify env:set VITE_API_BASE_URL https://whats-next-backend-684653559017.us-central1.run.app
```

### Method B: Netlify Drag & Drop

```bash
# 1. Build locally
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend
npm run build

# 2. Go to https://app.netlify.com/drop
# 3. Drag the 'dist' folder to the upload area
# 4. Get your URL
# 5. Go to Site settings → Environment variables
# 6. Add VITE_API_BASE_URL = https://whats-next-backend-684653559017.us-central1.run.app
# 7. Redeploy with the new env variable
```

---

## Option 3: Firebase Hosting

```bash
# 1. Install Firebase CLI
npm install -g firebase-tools

# 2. Navigate to frontend directory
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# 3. Login to Firebase
firebase login

# 4. Initialize Firebase (if not already done)
firebase init hosting

# Answer the prompts:
# - What do you want to use as your public directory? dist
# - Configure as single-page app? Yes
# - Set up automatic builds with GitHub? No (or Yes if you want CI/CD)

# 5. Build your app
npm run build

# 6. Deploy
firebase deploy --only hosting
```

**Set environment variables:**
- Create `.env.production` file:
  ```
  VITE_API_BASE_URL=https://whats-next-backend-684653559017.us-central1.run.app
  ```
- Rebuild and redeploy:
  ```bash
  npm run build
  firebase deploy --only hosting
  ```

---

## Option 4: Google Cloud Storage + Cloud CDN

```bash
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# 1. Build the app
npm run build

# 2. Create a Cloud Storage bucket
gsutil mb gs://whats-next-frontend

# 3. Configure bucket for website hosting
gsutil web set -m index.html -e index.html gs://whats-next-frontend

# 4. Make the bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://whats-next-frontend

# 5. Upload built files
gsutil -m cp -r dist/* gs://whats-next-frontend/

# 6. Enable CORS if needed
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://whats-next-frontend
```

Your app will be available at: `http://whats-next-frontend.storage.googleapis.com`

**Optional: Add Cloud CDN for better performance**
```bash
gcloud compute backend-buckets create whats-next-frontend-backend \
  --gcs-bucket-name=whats-next-frontend

gcloud compute url-maps create whats-next-frontend-map \
  --default-backend-bucket=whats-next-frontend-backend
```

---

## Pre-Deployment Checklist

Before deploying, make sure:

- [ ] `.env` has correct backend URL:
  ```
  VITE_API_BASE_URL=https://whats-next-backend-684653559017.us-central1.run.app
  ```

- [ ] Build works locally:
  ```bash
  npm run build
  npm run preview  # Test the production build
  ```

- [ ] No TypeScript errors:
  ```bash
  npm run build  # This runs tsc -b first
  ```

- [ ] Backend is deployed and healthy:
  ```bash
  curl https://whats-next-backend-684653559017.us-central1.run.app/health
  ```

---

## After Deployment

### 1. Update Backend CORS

Once you have your frontend URL (e.g., `https://whats-next-frontend.vercel.app`):

```bash
cd /Users/patrickoreilly/Desktop/whats_next/backend
```

Edit `backend/core/config.py`:
```python
CORS_ORIGINS: List[str] = [
    "http://localhost:5173",                    # Local development
    "https://your-frontend.vercel.app",        # Your actual frontend URL
]
```

Redeploy backend:
```bash
gcloud run deploy whats-next-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY=AIzaSyD1cEJwyWjwgHNfQ14dHXnfecY4oEOpLbU
```

### 2. Test Your Deployment

Visit your frontend URL and test:
- [ ] Page loads without errors
- [ ] Can create a room
- [ ] Can join a room
- [ ] Can submit input
- [ ] Can vote
- [ ] Story streaming works
- [ ] No CORS errors in browser console

### 3. Set Up Custom Domain (Optional)

**Vercel:**
```bash
vercel domains add your-domain.com
```

**Netlify:**
1. Go to Domain settings
2. Add custom domain
3. Follow DNS instructions

**Firebase:**
```bash
firebase hosting:connect your-domain.com
```

---

## Troubleshooting

### Build Fails

**TypeScript errors:**
```bash
npm run build
# Fix any TypeScript errors shown
```

**Missing dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Environment Variables Not Working

Make sure:
1. Variable name starts with `VITE_`
2. Build command includes environment variables
3. For production, set in platform settings (Vercel/Netlify dashboard)

**Test locally:**
```bash
VITE_API_BASE_URL=https://whats-next-backend-684653559017.us-central1.run.app npm run build
npm run preview
```

### CORS Errors in Production

1. Check browser console for the exact error
2. Verify backend CORS includes your frontend domain
3. Redeploy backend after updating CORS
4. Clear browser cache

### 404 on Page Refresh

For SPAs, configure redirects:

**Vercel** - Create `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

**Netlify** - Create `public/_redirects`:
```
/*    /index.html   200
```

**Firebase** - Already configured in `firebase.json` with `"rewrites"`

---

## Recommended: Vercel Setup (Step-by-Step)

Here's the quickest path to get your frontend live:

```bash
# 1. Navigate to frontend
cd /Users/patrickoreilly/Desktop/whats_next/web_frontend

# 2. Install Vercel CLI
npm install -g vercel

# 3. Deploy
vercel

# 4. Answer prompts (defaults are fine)
# - Set up and deploy? Y
# - Which scope? (select your account)
# - Link to existing project? N
# - Project name? whats-next-frontend
# - Directory? ./
# - Override settings? N

# 5. Deploy to production
vercel --prod

# 6. Set environment variable
vercel env add VITE_API_BASE_URL production
# When prompted, enter: https://whats-next-backend-684653559017.us-central1.run.app

# 7. Redeploy with env var
vercel --prod
```

**Done!** Your app is now live. Get the URL from the terminal output.

---

## Cost Comparison

| Platform | Free Tier | Cost |
|----------|-----------|------|
| **Vercel** | 100GB bandwidth/month, unlimited projects | Free for hobby, $20/mo Pro |
| **Netlify** | 100GB bandwidth/month, 300 build minutes | Free for personal, $19/mo Pro |
| **Firebase** | 10GB storage, 360MB/day bandwidth | Free up to limits, then pay-as-you-go |
| **GCS + CDN** | No free tier | ~$0.026/GB storage, $0.08-0.20/GB CDN |

**Recommendation:** Start with Vercel free tier.

---

## Next Steps After Deployment

1. ✅ Deploy frontend using one of the options above
2. ✅ Get your frontend URL
3. ✅ Update backend CORS with your frontend URL
4. ✅ Redeploy backend
5. ✅ Test the full application
6. 🎉 Share your app with users!

---

Good luck! 🚀
