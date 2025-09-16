# Deploying PQ Finder to Vercel

## Method 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from your project directory:**
   ```bash
   vercel
   ```

4. **Follow the prompts:**
   - Link to existing project? → No
   - Project name → pqfinder (or your preferred name)
   - Directory → ./
   - Override settings? → No

## Method 2: Deploy via GitHub + Vercel Dashboard

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/pqfinder.git
   git push -u origin main
   ```

2. **Go to [vercel.com](https://vercel.com)**
3. **Click "New Project"**
4. **Import your GitHub repository**
5. **Vercel will auto-detect it's a Svelte project**
6. **Click "Deploy"**

## Method 3: Drag & Drop (Simple)

1. **Build your project:**
   ```bash
   npm run build
   ```

2. **Go to [vercel.com](https://vercel.com)**
3. **Drag the `public` folder to the deployment area**

## Important Notes

- ✅ **Static hosting works perfectly** - Your app is pure frontend
- ✅ **localStorage persists** - User data stays between sessions
- ✅ **No backend needed** - Everything runs in the browser
- ✅ **Free hosting** - Vercel free tier is perfect for this

## Custom Domain (Optional)

After deployment, you can add a custom domain:
1. Go to your project dashboard on Vercel
2. Click "Settings" → "Domains"
3. Add your domain (e.g., pqfinder.com)

## Environment Variables (If needed later)

If you add backend features later, you can add environment variables in:
- Vercel Dashboard → Project → Settings → Environment Variables

## Build Output

The build process creates:
- `public/build/bundle.js` - Your Svelte app
- `public/build/bundle.css` - Your styles
- `public/index.html` - Main HTML file

All these files are served statically by Vercel.
