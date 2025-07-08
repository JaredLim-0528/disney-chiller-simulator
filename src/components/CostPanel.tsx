import React, { useContext, useState } from 'react';
import { Info } from 'lucide-react';
import type { CoolingLoadStats, CostRates, KVAGroup } from '../types';
import { CostRatesContext } from '../App';

interface CostPanelProps {
  stats: CoolingLoadStats;
  showSettings: boolean;
  kvaGroups?: KVAGroup[];
  kwhGroups?: KVAGroup[];
}

export function CostPanel({ stats, showSettings, kvaGroups, kwhGroups }: CostPanelProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const { rates, setRates } = useContext(CostRatesContext);

  const handleRateChange = (key: keyof CostRates, value: string) => {
    // Allow empty string to handle deletion of first digit
    if (value === '') {
      setRates(prev => ({ ...prev, [key]: 0 }));
      return;
    }
    
    const numValue = Number(value);
    if (!isNaN(numValue)) {
      setRates(prev => ({ ...prev, [key]: numValue }));
    }
  };

  const calculateCosts = () => {
    // Get Monthly Max KVA from KVA groups
    const monthlyMaxKVA = kvaGroups?.find(group => group.name === 'Monthly Max KVA')?.value || 0;
    // Get Monthly Total kWh from kWh groups
    const monthlyTotalKwh = kwhGroups?.find(group => group.name === 'Monthly Total kWh')?.value || 0;
    
    const demandCharge = monthlyMaxKVA * rates.demandCharge;
    const energyCharge = monthlyTotalKwh * rates.energyCharge;
    const fuelCost = monthlyTotalKwh * rates.fuelCost;
    const totalCost = demandCharge + energyCharge + fuelCost;
    const averageUnitCharge = monthlyTotalKwh > 0 ? Number((totalCost / monthlyTotalKwh).toFixed(4)) : 0;
    
    return { demandCharge, energyCharge, fuelCost, totalCost, averageUnitCharge };
  };

  const costs = calculateCosts();

  return (
    <div className="space-y-6">
      {showSettings && (
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-blue-700/30 mb-6">
          <h3 className="text-lg font-semibold text-blue-200 mb-4">Cost Rate Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-300">Demand Charge (HK$/kVA)</label>
              <input
                type="number"
                value={rates.demandCharge}
                onChange={(e) => handleRateChange('demandCharge', e.target.value.trim())}
                step="0.01"
                min="0"
                className="w-full bg-gray-800 border border-blue-700/30 rounded-md px-3 py-2 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-300">Energy Charge (HK$/kWh)</label>
              <input
                type="number"
                value={rates.energyCharge}
                onChange={(e) => handleRateChange('energyCharge', e.target.value.trim())}
                step="0.01"
                min="0"
                className="w-full bg-gray-800 border border-blue-700/30 rounded-md px-3 py-2 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-blue-300">Fuel Cost (HK$/kWh)</label>
              <input
                type="number"
                value={rates.fuelCost}
                onChange={(e) => handleRateChange('fuelCost', e.target.value.trim())}
                step="0.01"
                min="0"
                className="w-full bg-gray-800 border border-blue-700/30 rounded-md px-3 py-2 text-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-6 border border-blue-700/30">
          <div className="space-y-2">
            <div className="relative flex justify-between items-start">
              <p className="text-lg font-bold text-blue-200 mb-2">Demand Charge</p>
              <button
                onMouseEnter={() => setActiveTooltip('demand')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
              {activeTooltip === 'demand' && (
                <div className="absolute top-8 right-0 mt-2 p-4 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-72 border border-blue-500/20 transform transition-all duration-200 ease-in-out">
                  <p className="text-sm text-blue-100 leading-relaxed mb-2">
                    Demand Charge = Monthly Max KVA × Rate
                  </p>
                  <p className="text-xs text-blue-300">
                    Current Rate: HK${rates.demandCharge}/kVA
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-blue-300">
                HK${Math.round(costs.demandCharge).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-6 border border-blue-700/30">
          <div className="space-y-2">
            <div className="relative flex justify-between items-start">
              <p className="text-lg font-bold text-blue-200 mb-2">Energy Charge</p>
              <button
                onMouseEnter={() => setActiveTooltip('energy')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
              {activeTooltip === 'energy' && (
                <div className="absolute top-8 right-0 mt-2 p-4 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-72 border border-blue-500/20 transform transition-all duration-200 ease-in-out">
                  <p className="text-sm text-blue-100 leading-relaxed mb-2">
                    Energy Charge = Monthly Total kWh × Rate
                  </p>
                  <p className="text-xs text-blue-300">
                    Current Rate: HK${rates.energyCharge}/kWh
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-blue-300">
                HK${Math.round(costs.energyCharge).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-6 border border-blue-700/30">
          <div className="space-y-2">
            <div className="relative flex justify-between items-start">
              <p className="text-lg font-bold text-blue-200 mb-2">Fuel Cost</p>
              <button
                onMouseEnter={() => setActiveTooltip('fuel')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-blue-300 hover:text-blue-200 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
              {activeTooltip === 'fuel' && (
                <div className="absolute top-8 right-0 mt-2 p-4 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-72 border border-blue-500/20 transform transition-all duration-200 ease-in-out">
                  <p className="text-sm text-blue-100 leading-relaxed mb-2">
                    Fuel Cost = Monthly Total kWh × Rate
                  </p>
                  <p className="text-xs text-blue-300">
                    Current Rate: HK${rates.fuelCost}/kWh
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-blue-300">
                HK${Math.round(costs.fuelCost).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-6 border border-blue-700/30">
          <div className="space-y-2">
            <div className="relative flex justify-between items-start">
              <p className="text-lg font-bold text-blue-200 mb-2">Total Cost</p>
              <button
                onMouseEnter={() => setActiveTooltip('total')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
              {activeTooltip === 'total' && (
                <div className="absolute top-8 right-0 mt-2 p-4 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-72 border border-blue-500/20 transform transition-all duration-200 ease-in-out">
                  <p className="text-sm text-blue-100 leading-relaxed">
                    Total Cost = Demand Charge + Energy Charge + Fuel Cost
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-blue-400">
                HK${Math.round(costs.totalCost).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-lg p-6 border border-blue-700/30">
          <div className="space-y-2">
            <div className="relative flex justify-between items-start">
              <p className="text-lg font-bold text-blue-200 mb-2">Average Unit Charge</p>
              <button
                onMouseEnter={() => setActiveTooltip('average')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
              {activeTooltip === 'average' && (
                <div className="absolute top-8 right-0 mt-2 p-4 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-72 border border-blue-500/20 transform transition-all duration-200 ease-in-out">
                  <p className="text-sm text-blue-100 leading-relaxed">
                    Average Unit Charge = Total Cost ÷ Monthly Total kWh
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-blue-400">
                HK${costs.averageUnitCharge.toFixed(2)}
              </span>
              <span className="ml-2 text-blue-300 text-sm">/kWh</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}