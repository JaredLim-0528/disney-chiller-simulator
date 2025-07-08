import React from 'react';
import type { CoolingLoadStats } from '../types';

interface CoolingLoadChartProps {
  stats: CoolingLoadStats;
}

export function CoolingLoadChart({ stats }: CoolingLoadChartProps) {
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {/* Component content moved to App.tsx */}
    </div>
  );
}