# Deployment Guide - Istimewa Card Game

This guide will help you deploy the Istimewa card game to production using Vercel (frontend) and Railway (backend).

## Prerequisites

- GitHub account (already done ✅)
- Vercel account (free): https://vercel.com/signup
- Railway account (free): https://railway.app/

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Account
1. Go to https://railway.app/
2. Sign up with your GitHub account
3. You'll get $5 free credit per month

### Step 2: Deploy Server
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository: `devianramadhan/istimewa`
4. Railway will auto-detect it's a Node.js project

### Step 3: Configure Server Deployment
1. In Railway dashboard, click on your service
2. Go to "Settings" tab
3. Set **Root Directory**: `server`
4. Set **Start Command**: `npm start`
5. Go to "Variables" tab and add:
   - `PORT`: (leave empty, Railway auto-assigns)
   - `CORS_ORIGIN`: `*` (we'll update this after deploying frontend)

### Step 4: Get Your Backend URL
1. Go to "Settings" tab
2. Click "Generate Domain" under "Networking"
3. Copy the URL (e.g., `https://istimewa-production.up.railway.app`)
4. **Save this URL** - you'll need it for Vercel!

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to https://vercel.com/signup
2. Sign up with your GitHub account

### Step 2: Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository: `devianramadhan/istimewa`
3. Vercel will auto-detect it's a Vite project

### Step 3: Configure Frontend Deployment
1. **Root Directory**: Leave as `.` (root)
2. **Build Command**: `cd client && npm install && npm run build`
3. **Output Directory**: `client/dist`
4. **Install Command**: `npm install --prefix client`

### Step 4: Add Environment Variable
1. In "Environment Variables" section, add:
   - **Name**: `VITE_SERVER_URL`
   - **Value**: Your Railway URL from Part 1 (e.g., `https://istimewa-production.up.railway.app`)
2. Click "Deploy"

## Part 3: Update CORS on Railway

After Vercel deployment completes:

1. Copy your Vercel URL (e.g., `https://istimewa.vercel.app`)
2. Go back to Railway dashboard
3. Go to "Variables" tab
4. Update `CORS_ORIGIN` to your Vercel URL
5. Click "Redeploy" to apply changes

## Testing Your Deployment

1. Open your Vercel URL in browser
2. Try creating a game room
3. Test with a bot player
4. Verify real-time updates work

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_SERVER_URL` in Vercel environment variables
- Make sure Railway backend is running (check logs)
- Verify CORS_ORIGIN is set correctly in Railway

### Backend crashes on Railway
- Check Railway logs for errors
- Verify `server/package.json` has correct start script
- Make sure all dependencies are in `dependencies` not `devDependencies`

### WebSocket connection fails
- Railway supports WebSocket by default
- Make sure you're using HTTPS URL (not HTTP)
- Check browser console for connection errors

## URLs After Deployment

- **Frontend**: https://istimewa.vercel.app (or your custom domain)
- **Backend**: https://istimewa-production.up.railway.app (Railway auto-generated)

## Next Steps

- Set up custom domain on Vercel (optional)
- Monitor Railway usage (you have $5/month free)
- Set up environment-specific configs for staging/production

---

**Need help?** Check the logs in Railway and Vercel dashboards for detailed error messages.
