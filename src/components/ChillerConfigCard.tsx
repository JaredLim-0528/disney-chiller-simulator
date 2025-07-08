import React from 'react';
import type { ChillerConfig } from '../types';

interface ChillerConfigCardProps {
  config: ChillerConfig;
  maxCop: number;
}

export function ChillerConfigCard({ 
  config, 
  maxCop
}: ChillerConfigCardProps) {
  return (
    <div
      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 flex flex-col items-center gap-2 relative overflow-hidden"
    >
      <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-lg ${
        config.Type === 'VSD' 
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      }`}>
        {config.Type}
      </div>

      <h3 className="text-2xl font-bold text-white">{config.Chiller}</h3>
      <div className="mt-2 space-y-2 w-full">
        <div className="flex items-center gap-2">
          <span className="text-base text-gray-400">Capacity:</span>
          <span className="text-base font-medium text-gray-200 ml-auto">{config['Capacity (TR)']} TR</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-base text-gray-400">Max COP:</span>
          <span className="text-base font-medium text-gray-200 ml-auto">{maxCop.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
} 