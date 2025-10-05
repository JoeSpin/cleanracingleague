# Clean Racing League - Next.js Migration

This is the React/Next.js version of the Clean Racing League website.

## Prerequisites

Before running this project, you need to install Node.js and npm:

1. Download Node.js from https://nodejs.org/ (LTS version recommended)
2. Install Node.js (this includes npm)
3. Verify installation by running:
   ```bash
   node --version
   npm --version
   ```

## Setup Instructions

1. Navigate to the nextjs-app directory:
   ```bash
   cd nextjs-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Project Structure

```
nextjs-app/
├── app/                    # Next.js 13+ App Router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx          # Home page
│   └── page.module.css   # Home page styles
├── components/            # Reusable React components
│   └── ThemeProvider.tsx # Theme management
├── public/               # Static assets
│   └── img/             # Images copied from original site
├── lib/                  # Utility functions and data fetching
└── styles/              # Additional CSS modules
```

## Features Implemented

- ✅ Home page with league selection
- ✅ Dark/Light theme support
- ✅ Responsive design
- ✅ TypeScript support
- ✅ CSS Modules for styling

## Next Steps

1. Create league-specific pages (/trucks, /elite, /arca)
2. Build components for standings tables
3. Implement data fetching for standings and race results
4. Add navigation and header components
5. Convert remaining functionality from the original site

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Migration Progress

- [x] Project setup and configuration
- [x] Home page conversion
- [x] Theme system implementation
- [ ] League pages and routing
- [ ] Standings table component
- [ ] Race winner component
- [ ] Navigation component
- [ ] Data fetching layer
- [ ] GitHub Actions deployment