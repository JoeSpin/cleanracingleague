# 🚀 Deploy Clean Racing League to Vercel

This Next.js app is optimized for Vercel with real-time API routes for SimRacerHub data.

## ⚡ Quick Deploy (Recommended)

1. **Push to GitHub** (if not already done)
2. **Go to Vercel:** https://vercel.com
3. **Sign in with GitHub**
4. **Import Project:**
   - Click "New Project"
   - Select your `cleanracingleague` repository
   - **Set Root Directory to:** `nextjs-app`
   - Click "Deploy"

## 🔧 Project Settings for Vercel

- **Framework Preset:** Next.js
- **Root Directory:** `nextjs-app`
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `.next` (auto-detected)
- **Node.js Version:** 18.x (recommended)

## ✅ What Works Out of the Box

- ✅ **Real-time standings** from SimRacerHub API
- ✅ **Race results** with live data
- ✅ **Responsive design** for all devices
- ✅ **Dark/Light mode** toggle
- ✅ **Playoff banner downloads**
- ✅ **Automatic deployments** from GitHub

## 🌐 After Deployment

Your site will be available at: `https://your-project-name.vercel.app`

### Custom Domain (Optional)
1. Go to your project dashboard on Vercel
2. Settings → Domains
3. Add your custom domain

## 🔄 Auto-Deploy Setup

Once connected, Vercel automatically deploys when you:
- Push to main branch
- Merge pull requests
- Make changes via GitHub

## 🛠️ Local Development

```bash
cd nextjs-app
npm install
npm run dev
```

## 📊 Performance

- **Static pages:** ~100KB first load
- **API routes:** Serverless functions
- **Images:** Optimized delivery
- **Global CDN:** Fast worldwide access