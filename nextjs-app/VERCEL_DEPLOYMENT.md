# Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier works perfectly)
- Your Clean Racing League repository

## Step-by-Step Deployment

### 1. Prepare Your Repository
Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign up/Login with your GitHub account
3. Click "New Project"
4. Import your `cleanracingleague` repository
5. Select the `nextjs-app` folder as the root directory

### 3. Configure Project Settings
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `nextjs-app`
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### 4. Environment Variables (Optional)
If you need any environment variables:
- Go to Project Settings → Environment Variables
- Add variables like:
  - `NODE_ENV=production`
  - Any API keys (if needed)

### 5. Deploy
1. Click "Deploy"
2. Wait 2-3 minutes for build and deployment
3. Your site will be live at `https://your-project-name.vercel.app`

## Custom Domain (Optional)
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Automatic Deployments
- Every push to `main` branch will auto-deploy
- Preview deployments for pull requests
- Rollback capability for issues

## Monitoring
- Built-in analytics
- Performance monitoring
- Error tracking
- Build logs

## API Routes
Your API routes (`/api/standings` and `/api/race-results`) will work automatically on Vercel with:
- Serverless functions
- 30-second timeout (configured)
- Auto-scaling
- Global edge network

## Troubleshooting
If build fails:
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify Next.js config is correct
4. Test build locally first: `npm run build`

## Expected Performance
- **Build time**: 1-2 minutes
- **Cold start**: ~200ms
- **Cached responses**: ~50ms
- **Global CDN**: Fast worldwide

Your Clean Racing League site will be production-ready with automatic HTTPS, global CDN, and serverless API routes!