# Disney Chiller System Optimization Simulator

A sophisticated React-based simulation tool for analyzing and optimizing Disney's chiller system performance through priority order ranking and sequencing analysis.

## 🌟 Features

- **Monthly Cooling Load Analysis**: Interactive charts showing cooling load profiles for all 12 months
- **Priority Order Ranking**: Intelligent grouping and analysis of chiller combinations by energy efficiency
- **Sequencing Simulation**: Advanced staging path analysis for optimal chiller operation
- **Real-time Data Visualization**: Dynamic charts powered by Chart.js
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## 🚀 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Chart.js + React-Chartjs-2
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Optimized for Vercel, Netlify, GitHub Pages

## 📊 Data Sources

- Monthly cooling load profiles (12 CSV files)
- Chiller configuration and COP data
- Primary pump power data
- Group mapping configurations

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm 8+

### Setup
```bash
npm install
npm run dev
```

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run type-check` - TypeScript type checking

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitLab/GitHub repository
2. Vercel will automatically detect the Vite configuration
3. Deploy with zero configuration needed

### Manual Build
```bash
npm run build
```
The built files will be in the `dist/` directory.

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── CoolingLoadProfile.tsx
│   ├── PriorityOrderRanking.tsx
│   └── ...
├── data/               # Data files and configurations
├── pages/              # Page components
├── utils/              # Utility functions
└── types.ts           # TypeScript type definitions
```

## 🔧 Configuration

- `vite.config.ts` - Build configuration with optimizations
- `vercel.json` - Deployment configuration for Vercel
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration

## 📈 Performance Optimizations

- Code splitting with manual chunks
- Asset optimization and caching
- Minified production builds
- Efficient bundle sizes

## 🎯 Key Components

- **CoolingLoadProfile**: Monthly cooling load selection and visualization
- **PriorityOrderRanking**: Energy-based grouping of chiller combinations
- **SequencingSimulation**: Advanced staging analysis
- **StagingPathAnalysis**: Performance optimization insights

## 📋 Features in Detail

### Monthly Cooling Load Analysis
- Interactive dropdown for month selection
- Consistent y-axis scaling across all months
- Real-time data loading with error handling

### Priority Order Ranking
- Energy-efficient grouping (kWh/day)
- Expandable group views
- Detailed individual order analysis

### Data Integration
- Dynamic CSV loading from public directory
- Seamless month selection integration
- Efficient data processing and caching

---

**Built for Disney's Engineering Excellence** 🏰 