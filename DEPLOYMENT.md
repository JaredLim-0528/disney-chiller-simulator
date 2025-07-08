# 🚀 Disney Chiller Simulator - Deployment Guide

## ✅ Pre-Deployment Checklist

### ✔️ Build & Configuration
- [x] **Package.json optimized** - Updated with proper name, version, and scripts
- [x] **Vite config optimized** - Production build settings with code splitting
- [x] **Vercel config created** - `vercel.json` with proper routing and caching
- [x] **Dependencies installed** - All required packages including `terser`
- [x] **Build test passed** - Production build runs successfully
- [x] **TypeScript check passed** - No type errors
- [x] **Data files verified** - All 12 monthly cooling load CSVs included in build

### ✔️ Performance Optimizations
- [x] **Code splitting** - Vendor, charts, and icons chunks separated
- [x] **Asset optimization** - CSS and JS minification enabled
- [x] **Caching headers** - Static assets cached for 1 year
- [x] **Bundle analysis** - Chunks under warning limits
- [x] **Relative paths** - Base path set to `./` for flexible deployment

### ✔️ Data Integrity
- [x] **Monthly CSV files** - All 12 months in `public/data/monthly_cooling_loads/`
- [x] **File structure preserved** - Data accessible via HTTP in production
- [x] **Chart data flow** - Month selection → CSV loading → Chart rendering

## 🎯 Deployment Options

### Option 1: Vercel (Recommended)

#### For GitLab Integration:
1. **Connect Repository**
   ```bash
   # In GitLab, go to Settings → Integrations → Vercel
   # Or connect directly from Vercel dashboard
   ```

2. **Auto-Deploy Setup**
   - Vercel will detect the `vercel.json` configuration
   - Builds will trigger automatically on git push
   - No additional configuration needed

3. **Custom Domain** (Optional)
   ```bash
   # In Vercel dashboard:
   # Settings → Domains → Add Domain
   ```

#### Manual Vercel CLI:
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option 2: GitLab Pages

1. **Create GitLab CI/CD Pipeline**
   ```yaml
   # .gitlab-ci.yml
   pages:
     stage: deploy
     image: node:18
     script:
       - npm install
       - npm run build
       - mv dist public
     artifacts:
       paths:
         - public
     only:
       - main
   ```

2. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to GitLab Pages"
   git push origin main
   ```

### Option 3: Manual Build + Upload

1. **Build Locally**
   ```bash
   npm run build
   ```

2. **Upload `dist/` folder to any static hosting**
   - AWS S3 + CloudFront
   - Netlify Drag & Drop
   - GitHub Pages
   - Firebase Hosting

## 📊 Build Analysis

### Current Bundle Sizes:
- **CSS**: 29.73 kB (5.85 kB gzipped)
- **Vendor Chunk**: 139.72 kB (44.87 kB gzipped) - React/ReactDOM
- **Charts Chunk**: 163.40 kB (56.45 kB gzipped) - Chart.js
- **Icons Chunk**: 3.34 kB (1.49 kB gzipped) - Lucide React
- **Main App**: 295.08 kB (100.53 kB gzipped) - Application code

### Total: ~631 kB (~209 kB gzipped)

## 🔍 Post-Deployment Testing

1. **Functionality Tests**
   - [ ] App loads without errors
   - [ ] Month selector dropdown works
   - [ ] Cooling load charts render for all months
   - [ ] Priority order ranking shows grouped results
   - [ ] Run/Run Again buttons update data correctly

2. **Performance Tests**
   - [ ] Initial page load < 3 seconds
   - [ ] Chart transitions smooth
   - [ ] CSV loading responsive
   - [ ] No console errors

3. **Data Verification**
   - [ ] All 12 monthly CSV files accessible
   - [ ] Charts display correct data per month
   - [ ] Y-axis scaling consistent across months
   - [ ] Energy grouping calculations accurate

## 🛠️ Troubleshooting

### Common Issues:

**CSV Files Not Loading:**
- Ensure `public/data/monthly_cooling_loads/` exists in build
- Check network tab for 404 errors
- Verify relative path configuration in `vite.config.ts`

**Build Errors:**
- Run `npm run type-check` to verify TypeScript
- Check `npm run lint` for code issues
- Ensure all dependencies installed

**Performance Issues:**
- Enable gzip compression on server
- Verify caching headers are set
- Check bundle sizes with `npm run build`

## 🎉 Success!

Your Disney Chiller Simulator is now ready for production deployment!

### Quick Deploy Commands:
```bash
# Final verification
npm run type-check
npm run lint
npm run build

# Deploy to Vercel
npx vercel --prod

# Or commit to GitLab for auto-deploy
git add .
git commit -m "Production ready - Disney Chiller Simulator"
git push origin main
```

---
**Last Updated**: December 2024  
**Build Version**: 1.0.0  
**Deployment Ready**: ✅ 