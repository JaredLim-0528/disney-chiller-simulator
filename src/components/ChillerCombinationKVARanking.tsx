import React, { useState } from 'react';
import { ArrowUpDown, Info, Power } from 'lucide-react';
import type { CoolingLoadEntry } from '../types';
import chillerGroupMappingData from '../data/chiller-group-mapping.json';

const CHILLER_GROUP_MAPPING = chillerGroupMappingData.mapping as const;

// Get chillers for a specific group
function getChillersInGroup(group: string): string[] {
  return Object.entries(CHILLER_GROUP_MAPPING)
    .filter(([_, chillerGroup]) => chillerGroup === group)
    .map(([chiller]) => chiller);
}

function getMaxTotalCost(entries: CoolingLoadEntry[]): number {
  return Math.max(...entries.map(entry => 
    entry.demandChargeEstimation + entry.energyChargeEstimation + entry.fuelCostEstimation
  ));
}

function getMinTotalCost(entries: CoolingLoadEntry[]): number {
  return Math.min(...entries.map(entry => 
    entry.demandChargeEstimation + entry.energyChargeEstimation + entry.fuelCostEstimation
  ));
}

function getMaxCOP(entries: CoolingLoadEntry[]): number {
  return Math.max(...entries.map(entry => entry.cop));
}

function getMinCOP(entries: CoolingLoadEntry[]): number {
  return Math.min(...entries.map(entry => entry.cop));
}

function getMaxDemandCharge(entries: CoolingLoadEntry[]): number {
  return Math.max(...entries.map(entry => entry.demandChargeEstimation));
}

function getMinDemandCharge(entries: CoolingLoadEntry[]): number {
  return Math.min(...entries.map(entry => entry.demandChargeEstimation));
}

function getMaxEnergyCharge(entries: CoolingLoadEntry[]): number {
  return Math.max(...entries.map(entry => entry.energyChargeEstimation));
}

function getMinEnergyCharge(entries: CoolingLoadEntry[]): number {
  return Math.min(...entries.map(entry => entry.energyChargeEstimation));
}

function getMaxFuelCost(entries: CoolingLoadEntry[]): number {
  return Math.max(...entries.map(entry => entry.fuelCostEstimation));
}

function getMinFuelCost(entries: CoolingLoadEntry[]): number {
  return Math.min(...entries.map(entry => entry.fuelCostEstimation));
}

function getMaxMonthlyKVA(entries: CoolingLoadEntry[]): number {
  return Math.max(...entries.map(entry => entry.totalMonthlyMaxKVA));
}

function getMinMonthlyKVA(entries: CoolingLoadEntry[]): number {
  return Math.min(...entries.map(entry => entry.totalMonthlyMaxKVA));
}

function calculateScalePercentage(value: number, min: number, max: number): string {
  if (max === min) return '0%';
  const minValue = Math.max(0, min * 0.9);
  const range = max - minValue;
  if (range === 0) return '0%';
  return `${((value - minValue) / range) * 100}%`;
}
interface ChillerCombinationKVARankingProps {
  entries: CoolingLoadEntry[];
}

type SortField = 'cop' | 'totalCost' | 'demandCharge' | null;

const ALL_CHILLERS = ['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06', 'CH07'];

export function ChillerCombinationKVARanking({ entries }: ChillerCombinationKVARankingProps) {
  const [sortField, setSortField] = useState<SortField>('cop');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [availableChillers, setAvailableChillers] = useState<Set<string>>(
    new Set(['CH01', 'CH03', 'CH04', 'CH05', 'CH07'])
  );

  const handleSort = (field: SortField) => {
    setSortField(field);
  };

  const toggleChillerAvailability = (chiller: string) => {
    setAvailableChillers(prev => {
      const next = new Set(prev);
      if (next.has(chiller)) {
        next.delete(chiller);
      } else {
        next.add(chiller);
      }
      return next;
    });
  };

  const filteredEntries = entries.filter(entry => {
    const chillers = entry.chillers.split(', ');
    return chillers.every(chiller => availableChillers.has(chiller));
  });

  const sortedEntries = [...entries].sort((a, b) => {
    if (sortField === 'cop') {
      return b.cop - a.cop;  // Best (highest) COP first
    }
    if (sortField === 'demandCharge') {
      return a.demandChargeEstimation - b.demandChargeEstimation;  // Minimum demand charge first
    }
    if (sortField === 'totalCost') {
      const totalCostA = a.demandChargeEstimation + a.energyChargeEstimation + a.fuelCostEstimation;
      const totalCostB = b.demandChargeEstimation + b.energyChargeEstimation + b.fuelCostEstimation;
      return totalCostA - totalCostB;  // Minimum cost first
    }
    // Default sorting: by COP (highest first)
    return b.cop - a.cop;
  });

  const maxTotalCost = getMaxTotalCost(entries);
  const maxCOP = getMaxCOP(entries);
  const maxDemandCharge = getMaxDemandCharge(entries);
  const maxEnergyCharge = getMaxEnergyCharge(entries);
  const maxFuelCost = getMaxFuelCost(entries);
  const maxMonthlyKVA = getMaxMonthlyKVA(entries);

  const minCOP = getMinCOP(entries);
  const minDemandCharge = getMinDemandCharge(entries);
  const minEnergyCharge = getMinEnergyCharge(entries);
  const minFuelCost = getMinFuelCost(entries);
  const minTotalCost = getMinTotalCost(entries);
  const minMonthlyKVA = getMinMonthlyKVA(entries);
  return (
    <div className="bg-gray-900 rounded-lg p-4 w-full">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => handleSort('cop')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            sortField === 'cop'
              ? 'bg-green-600/20 text-green-400 border border-green-600/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Rank by Best COP
        </button>
        <button
          onClick={() => handleSort('demandCharge')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            sortField === 'demandCharge'
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Rank by Minimum Demand Charge Impact
        </button>
        <button
          onClick={() => handleSort('totalCost')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            sortField === 'totalCost'
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <ArrowUpDown className="w-4 h-4" />
          Rank by Minimum Cost Impact
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showDetails
              ? 'bg-amber-600/20 text-amber-400 border border-amber-600/30'
              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
          }`}
        >
          <Info className="w-4 h-4" />
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      <div className="mb-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <h3 className="text-sm font-medium text-gray-300 mb-3">Select Available Chillers:</h3>
        <div className="flex flex-wrap gap-2">
          {ALL_CHILLERS.map(chiller => (
            <button
              key={chiller}
              onClick={() => toggleChillerAvailability(chiller)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                availableChillers.has(chiller)
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'bg-gray-900/50 text-gray-500 border border-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Power className={`w-3 h-3 ${availableChillers.has(chiller) ? 'text-purple-400' : 'text-gray-600'}`} />
                {chiller}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Only combinations using available chillers will be shown in the table below.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full divide-y-2 divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider border-r-2 border-gray-700" colSpan={3}></th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50" colSpan={7}>
                Estimated Impact to Monthly kVA
              </th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 border-l-2 border-gray-700" colSpan={4}>
                Projected Monthly Cost Impact
              </th>
            </tr>
            <tr className="divide-x-2 divide-gray-700">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                Chiller Combination
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                No. of Chillers
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider">
                COP
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 relative">
                <div className="flex items-center gap-2">
                  Group K
                  <button
                    onMouseEnter={() => setActiveTooltip('Group K')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {activeTooltip === 'Group K' && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-48 border border-gray-600">
                      <p className="text-sm text-gray-300">Equipment in this group:</p>
                      <ul className="mt-1 space-y-1">
                        {getChillersInGroup('Group K').map(chiller => (
                          <li key={chiller} className="text-amber-400 text-sm">{chiller}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 relative">
                <div className="flex items-center gap-2">
                  Group L
                  <button
                    onMouseEnter={() => setActiveTooltip('Group L')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {activeTooltip === 'Group L' && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-48 border border-gray-600">
                      <p className="text-sm text-gray-300">Equipment in this group:</p>
                      <ul className="mt-1 space-y-1">
                        {getChillersInGroup('Group L').map(chiller => (
                          <li key={chiller} className="text-amber-400 text-sm">{chiller}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 relative">
                <div className="flex items-center gap-2">
                  Group M
                  <button
                    onMouseEnter={() => setActiveTooltip('Group M')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {activeTooltip === 'Group M' && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-48 border border-gray-600">
                      <p className="text-sm text-gray-300">Equipment in this group:</p>
                      <ul className="mt-1 space-y-1">
                        {getChillersInGroup('Group M').map(chiller => (
                          <li key={chiller} className="text-amber-400 text-sm">{chiller}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 relative">
                <div className="flex items-center gap-2">
                  Group N
                  <button
                    onMouseEnter={() => setActiveTooltip('Group N')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {activeTooltip === 'Group N' && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-48 border border-gray-600">
                      <p className="text-sm text-gray-300">Equipment in this group:</p>
                      <ul className="mt-1 space-y-1">
                        {getChillersInGroup('Group N').map(chiller => (
                          <li key={chiller} className="text-amber-400 text-sm">{chiller}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 relative">
                <div className="flex items-center gap-2">
                  Group O
                  <button
                    onMouseEnter={() => setActiveTooltip('Group O')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {activeTooltip === 'Group O' && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-48 border border-gray-600">
                      <p className="text-sm text-gray-300">Equipment in this group:</p>
                      <ul className="mt-1 space-y-1">
                        {getChillersInGroup('Group O').map(chiller => (
                          <li key={chiller} className="text-amber-400 text-sm">{chiller}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 relative">
                <div className="flex items-center gap-2">
                  Group AM
                  <button
                    onMouseEnter={() => setActiveTooltip('Group AM')}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                  {activeTooltip === 'Group AM' && (
                    <div className="absolute top-full left-0 mt-2 p-3 bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl z-10 w-48 border border-gray-600">
                      <p className="text-sm text-gray-300">Equipment in this group:</p>
                      <ul className="mt-1 space-y-1">
                        {getChillersInGroup('Group AM').map(chiller => (
                          <li key={chiller} className="text-amber-400 text-sm">{chiller}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50">
                Monthly Max KVA
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 border-l-2 border-gray-700">
                Demand Charge Est.
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 border-r border-gray-700">
                Energy Cost Est.
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50 border-r-2 border-gray-700">
                Fuel Cost Est.
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 uppercase tracking-wider bg-gray-800/50">
                Total Cost
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredEntries.sort((a, b) => {
              if (sortField === 'cop') {
                return b.cop - a.cop;
              }
              if (sortField === 'demandCharge') {
                return a.demandChargeEstimation - b.demandChargeEstimation;
              }
              if (sortField === 'totalCost') {
                const totalCostA = a.demandChargeEstimation + a.energyChargeEstimation + a.fuelCostEstimation;
                const totalCostB = b.demandChargeEstimation + b.energyChargeEstimation + b.fuelCostEstimation;
                return totalCostA - totalCostB;
              }
              return b.cop - a.cop;
            }).map((entry, index) => (
              <tr key={entry.chillers}
                  className={`${index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50'} hover:bg-gray-800/70 transition-colors divide-x-2 divide-gray-700`}>
                <td className="px-4 py-4 whitespace-nowrap text-base text-white font-medium">
                  {entry.chillers}
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-indigo-400 font-semibold">
                  {entry.chillers.split(', ').length}
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-green-400 font-semibold relative">
                  <div 
                    className="absolute inset-0 bg-green-400/10"
                    style={{ width: calculateScalePercentage(entry.cop, minCOP, maxCOP) }}
                  />
                  <span className="relative">
                    {entry.cop.toFixed(1)}
                  </span>
                </td>
                <td className={`px-4 py-4 align-top whitespace-nowrap text-base font-semibold ${entry['Group K'] > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col">
                    <span>{entry['Group K'] > 0 ? `+${Math.round(entry['Group K'])}` : '0'}</span>
                    {showDetails && entry.groupImpacts['Group K'] && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">Equipment Details:</div>
                        {Object.entries(entry.groupImpacts['Group K']).map(([ch, kva], idx) => (
                          <div key={ch} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-300">{ch}</span>
                            <span className="text-amber-300">{Math.round(kva)} kVA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-4 align-top whitespace-nowrap text-base font-semibold ${entry['Group L'] > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col">
                    <span>{entry['Group L'] > 0 ? `+${Math.round(entry['Group L'])}` : '0'}</span>
                    {showDetails && entry.groupImpacts['Group L'] && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">Equipment Details:</div>
                        {Object.entries(entry.groupImpacts['Group L']).map(([ch, kva], idx) => (
                          <div key={ch} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-300">{ch}</span>
                            <span className="text-amber-300">{Math.round(kva)} kVA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-4 align-top whitespace-nowrap text-base font-semibold ${entry['Group M'] > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col">
                    <span>{entry['Group M'] > 0 ? `+${Math.round(entry['Group M'])}` : '0'}</span>
                    {showDetails && entry.groupImpacts['Group M'] && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">Equipment Details:</div>
                        {Object.entries(entry.groupImpacts['Group M']).map(([ch, kva], idx) => (
                          <div key={ch} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-300">{ch}</span>
                            <span className="text-amber-300">{Math.round(kva)} kVA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-4 align-top whitespace-nowrap text-base font-semibold ${entry['Group N'] > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col">
                    <span>{entry['Group N'] > 0 ? `+${Math.round(entry['Group N'])}` : '0'}</span>
                    {showDetails && entry.groupImpacts['Group N'] && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">Equipment Details:</div>
                        {Object.entries(entry.groupImpacts['Group N']).map(([ch, kva], idx) => (
                          <div key={ch} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-300">{ch}</span>
                            <span className="text-amber-300">{Math.round(kva)} kVA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-4 align-top whitespace-nowrap text-base font-semibold ${entry['Group O'] > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col">
                    <span>{entry['Group O'] > 0 ? `+${Math.round(entry['Group O'])}` : '0'}</span>
                    {showDetails && entry.groupImpacts['Group O'] && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">Equipment Details:</div>
                        {Object.entries(entry.groupImpacts['Group O']).map(([ch, kva], idx) => (
                          <div key={ch} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-300">{ch}</span>
                            <span className="text-amber-300">{Math.round(kva)} kVA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className={`px-4 py-4 align-top whitespace-nowrap text-base font-semibold ${entry['Group AM'] > 0 ? 'text-amber-400' : 'text-gray-500'}`}>
                  <div className="flex flex-col">
                    <span>{entry['Group AM'] > 0 ? `+${Math.round(entry['Group AM'])}` : '0'}</span>
                    {showDetails && entry.groupImpacts['Group AM'] && (
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-gray-500">Equipment Details:</div>
                        {Object.entries(entry.groupImpacts['Group AM']).map(([ch, kva], idx) => (
                          <div key={ch} className="flex items-center justify-between text-xs gap-2">
                            <span className="text-gray-300">{ch}</span>
                            <span className="text-amber-300">{Math.round(kva)} kVA</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-amber-400 font-semibold relative">
                  <div 
                    className="absolute inset-0 bg-amber-400/10"
                    style={{ width: calculateScalePercentage(entry.totalMonthlyMaxKVA, minMonthlyKVA, maxMonthlyKVA) }}
                  />
                  <span className="relative">
                    +{Math.round(entry.totalMonthlyMaxKVA)}
                  </span>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-blue-300 font-semibold border-l-2 border-gray-700 relative">
                  <div 
                    className="absolute inset-0 bg-blue-400/10"
                    style={{ width: calculateScalePercentage(entry.demandChargeEstimation, minDemandCharge, maxDemandCharge) }}
                  />
                  <span className="relative">
                    +${Math.round(entry.demandChargeEstimation).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-blue-300 font-semibold relative">
                  <div 
                    className="absolute inset-0 bg-blue-400/10"
                    style={{ width: calculateScalePercentage(entry.energyChargeEstimation, minEnergyCharge, maxEnergyCharge) }}
                  />
                  <span className="relative">
                    +${Math.round(entry.energyChargeEstimation).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-blue-300 font-semibold border-r-2 border-gray-700 relative">
                  <div 
                    className="absolute inset-0 bg-blue-400/10"
                    style={{ width: calculateScalePercentage(entry.fuelCostEstimation, minFuelCost, maxFuelCost) }}
                  />
                  <span className="relative">
                    +${Math.round(entry.fuelCostEstimation).toLocaleString()}
                  </span>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap text-base text-blue-400 font-semibold relative">
                  <div 
                    className="absolute inset-0 bg-blue-400/10"
                    style={{ 
                      width: calculateScalePercentage(
                        entry.demandChargeEstimation + entry.energyChargeEstimation + entry.fuelCostEstimation,
                        minTotalCost,
                        maxTotalCost
                      ) 
                    }}
                  />
                  <span className="relative">
                    +${Math.round(entry.demandChargeEstimation + entry.energyChargeEstimation + entry.fuelCostEstimation).toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}