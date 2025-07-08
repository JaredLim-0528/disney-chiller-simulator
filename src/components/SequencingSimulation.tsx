import React, { useState, useEffect } from 'react';
import { Activity, Power, ArrowUpRight } from 'lucide-react';

interface ChillerConfig {
  Chiller: string;
  'Capacity (TR)': number;
  Type: string;
}

interface Props {
  chillerConfigs: ChillerConfig[];
  copData: Record<string, number | null>[];
  dualCopData: Record<string, number | null>[];
  tripleCopData: Record<string, number | null>[];
  quadCopData: Record<string, number | null>[];
  pentaCopData: Record<string, number | null>[];
  hexaCopData: Record<string, number | null>[];
  septaCopData: Record<string, number | null>[];
  coolingLoad: number;
}

type ViewMode = 'single' | 'dual' | 'triple' | 'quad' | 'penta' | 'hexa' | 'septa';

interface CopComparison {
  load: number;
  current: number;
  new: number;
}

interface CombinationOption {
  combination: string;
  copComparison: CopComparison[];
}

export function SequencingSimulation({ 
  chillerConfigs, 
  copData,
  dualCopData,
  tripleCopData,
  quadCopData,
  pentaCopData,
  hexaCopData,
  septaCopData,
  coolingLoad 
}: Props) {
  const [selectedChillers, setSelectedChillers] = useState<Set<string>>(new Set());
  const [stageUpCombinations, setStageUpCombinations] = useState<string[]>([]);
  const [stageDownCombinations, setStageDownCombinations] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [primaryPumpEnabled, setPrimaryPumpEnabled] = useState(false);
  const [pumpPower, setPumpPower] = useState<Record<string, number>>({});
  const [secondaryPumpEnabled, setSecondaryPumpEnabled] = useState(false);
  const [coolingTowerEnabled, setCoolingTowerEnabled] = useState(false);
  const [condensingPumpEnabled, setCondensingPumpEnabled] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'stageUp' | 'stageDown'>('stageUp');

  const handleChillerToggle = (chiller: string) => {
    setSelectedChillers(prev => {
      const next = new Set(prev);
      if (next.has(chiller)) {
        next.delete(chiller);
      } else {
        next.add(chiller);
      }
      return next;
    });
  };

  // Convert TR to kW (1 TR = 3.51685 kW)
  const trToKw = (tr: number) => tr * 3.51685;

  // Calculate COP for a combination at given load
  const getCopForLoad = (combination: string, load: number) => {
    // For capacity calculation at 0 load
    if (load === 0) {
      return combination.split('+').reduce((total, chiller) => {
        const config = chillerConfigs.find(c => c.Chiller === chiller);
        return total + (config?.['Capacity (TR)'] || 0);
      }, 0);
    }

    // Find the closest load point in the data
    const dataPoint = copData.find(row => {
      const rowLoad = Number(row.kW);
      return Math.abs(rowLoad - load) < 50; // Find closest load point within 50kW
    });

    if (!dataPoint) return 0;

    // Return the COP directly from the data
    return Number(dataPoint[combination] || 0);
  };

  // Get COP data for a specific combination type
  const getCopDataForCombination = (combination: string) => {
    const numChillers = combination.split('+').length;
    let data;
    
    switch (numChillers) {
      case 1:
        data = copData;
        break;
      case 2:
        data = dualCopData;
        break;
      case 3:
        data = tripleCopData;
        break;
      case 4:
        data = quadCopData;
        break;
      case 5:
        data = pentaCopData;
        break;
      case 6:
        data = hexaCopData;
        break;
      case 7:
        data = septaCopData;
        break;
      default:
        return [];
    }

    return data.map(row => ({
      load: row.kW,
      cop: row[combination]
    }));
  };

  // Get possible stage up combinations
  const getStageUpCombinations = () => {
    if (selectedChillers.size === 0) return [];

    // Sort the current combination
    const currentCombination = Array.from(selectedChillers).sort().join('+');
    const availableChillers = chillerConfigs
      .filter(config => !selectedChillers.has(config.Chiller))
      .map(config => config.Chiller);

    // Calculate total capacity of selected chillers
    const totalCapacityTR = Array.from(selectedChillers).reduce((total, chiller) => {
      const config = chillerConfigs.find(c => c.Chiller === chiller);
      return total + (config?.['Capacity (TR)'] || 0);
    }, 0);
    const totalCapacityKW = totalCapacityTR * 3.516; // Convert TR to kW

    // Calculate load range in 200 kW intervals
    const minLoad = Math.round(totalCapacityKW * 0.3 / 200) * 200; // 30% of capacity
    const maxLoad = Math.round(totalCapacityKW * 1.3 / 200) * 200; // 130% of capacity
    const loadPoints: number[] = [];
    for (let load = minLoad; load <= maxLoad; load += 200) {
      loadPoints.push(load);
    }

    return availableChillers.map(chiller => {
      // Sort the new combination
      const newCombination = [...selectedChillers, chiller].sort().join('+');
      const newCapacityTR = Array.from([...selectedChillers, chiller]).reduce((total, ch) => {
        const config = chillerConfigs.find(c => c.Chiller === ch);
        return total + (config?.['Capacity (TR)'] || 0);
      }, 0);
      const newCapacityKW = trToKw(newCapacityTR);
      const stageUpLoad = findStageUpLoad(currentCombination, newCombination);

      // Get COP data for both combinations
      const currentData = getCopDataForCombination(currentCombination);
      const newData = getCopDataForCombination(newCombination);

      // Calculate COPs at 200 kW intervals
      const copComparison = loadPoints.map(load => {
        const currentPoint = currentData.find(row => Math.abs(Number(row.load) - load) < 100);
        const newPoint = newData.find(row => Math.abs(Number(row.load) - load) < 100);
        
        return {
          load,
          current: currentPoint ? Number(currentPoint.cop || 0) : 0,
          new: newPoint ? Number(newPoint.cop || 0) : 0
        };
      });

      return {
        combination: newCombination,
        capacityKW: newCapacityKW,
        stageUpLoad,
        copComparison,
        loadRange: {
          min: minLoad,
          max: maxLoad
        }
      };
    }).sort((a, b) => {
      // First sort by number of chillers (fewer first)
      const aChillerCount = a.combination.includes('+') ? a.combination.split('+').length : 1;
      const bChillerCount = b.combination.includes('+') ? b.combination.split('+').length : 1;
      
      if (aChillerCount !== bChillerCount) {
        return aChillerCount - bChillerCount;
      }
      
      // Then sort alphabetically within the same chiller count group
      return a.combination.localeCompare(b.combination);
    });
  };

  // Find the load point where staging up becomes beneficial
  const findStageUpLoad = (currentCombination: string, newCombination: string): number | null => {
    // Ensure combinations are sorted
    const sortedCurrentCombination = currentCombination.split('+').sort().join('+');
    const sortedNewCombination = newCombination.split('+').sort().join('+');

    // Calculate total capacity of selected chillers
    const totalCapacityTR = Array.from(selectedChillers).reduce((total, chiller) => {
      const config = chillerConfigs.find(c => c.Chiller === chiller);
      return total + (config?.['Capacity (TR)'] || 0);
    }, 0);
    const totalCapacityKW = totalCapacityTR * 3.516; // Convert TR to kW

    // Calculate load range in 200 kW intervals
    const minLoad = Math.round(totalCapacityKW * 0.3 / 200) * 200; // 30% of capacity
    const maxLoad = Math.round(totalCapacityKW * 1.3 / 200) * 200; // 130% of capacity
    const loadPoints: number[] = [];
    for (let load = minLoad; load <= maxLoad; load += 200) {
      loadPoints.push(load);
    }

    // Get COP data for both combinations
    const currentData = getCopDataForCombination(sortedCurrentCombination);
    const newData = getCopDataForCombination(sortedNewCombination);

    // Check every 200 kW within the capacity range
    for (let load = minLoad; load <= maxLoad; load += 200) {
      const currentPoint = currentData.find(row => Math.abs(Number(row.load) - load) < 100);
      const newPoint = newData.find(row => Math.abs(Number(row.load) - load) < 100);
      
      if (currentPoint && newPoint) {
        const currentCop = Number(currentPoint.cop || 0);
        const newCop = Number(newPoint.cop || 0);
        
        // If new combination becomes more efficient
        if (newCop > currentCop) {
          return load;
        }
      }
    }
    return null;
  };

  const getCurrentCapacity = () => {
    return Array.from(selectedChillers).reduce((total, chiller) => {
      const config = chillerConfigs.find(c => c.Chiller === chiller);
      return total + (config?.['Capacity (TR)'] || 0);
    }, 0);
  };

  const stageUpOptions = getStageUpCombinations();

  // Generate stage down combinations (remove one chiller)
  const generateStageDownCombinations = (chillers: string[]): string[] => {
    if (chillers.length <= 1) return [];
    
    return chillers.map((_, idx, arr) => {
      const combination = [...arr];
      combination.splice(idx, 1);
      return combination.sort().join('+');
    });
  };

  // Update stage down combinations when selected chillers change
  useEffect(() => {
    if (selectedChillers.size > 1) {
      const chillerArray = Array.from(selectedChillers).sort();
      const downCombinations = chillerArray.map((_, idx, arr) => {
        const combination = [...arr];
        combination.splice(idx, 1);
        return combination.sort().join('+');
      });
      setStageDownCombinations(downCombinations);
    } else {
      setStageDownCombinations([]);
    }
  }, [selectedChillers]);

  const getStageDownCombinations = (): CombinationOption[] => {
    if (selectedChillers.size <= 1) return [];
    
    const currentCombination = Array.from(selectedChillers).sort().join('+');
    const currentCopData = getCopDataForCombination(currentCombination);
    
    // Generate stage down combinations
    const chillerArray = Array.from(selectedChillers).sort();
    const downCombinations = chillerArray.map((_, idx, arr) => {
      const combination = [...arr];
      combination.splice(idx, 1);
      return combination.sort().join('+');
    });

    // Calculate load points based on the current combination's capacity
    const totalCapacity = chillerArray.reduce((sum, chiller) => {
      const config = chillerConfigs.find(c => c.Chiller === chiller);
      return sum + (config ? config['Capacity (TR)'] * 3.516 : 0);
    }, 0);

    const minLoad = Math.round(totalCapacity * 0.3 / 200) * 200;
    const maxLoad = Math.round(totalCapacity * 1.3 / 200) * 200;
    const loadPoints: number[] = [];
    for (let load = minLoad; load <= maxLoad; load += 200) {
      loadPoints.push(load);
    }

    return downCombinations.map(combination => {
      const newCopData = getCopDataForCombination(combination);
      
      const copComparison = loadPoints.map(load => {
        const currentPoint = currentCopData.find(row => Math.abs(Number(row.load) - load) < 100);
        const newPoint = newCopData.find(row => Math.abs(Number(row.load) - load) < 100);
        
        if (!currentPoint || !newPoint || 
            currentPoint.cop === null || newPoint.cop === null) {
          return null;
        }

        return {
          load,
          current: Number(currentPoint.cop),
          new: Number(newPoint.cop)
        };
      }).filter((item): item is CopComparison => item !== null);
      
      return {
        combination,
        copComparison
      };
    }).sort((a, b) => {
      // First sort by number of chillers (fewer first)
      const aChillerCount = a.combination.includes('+') ? a.combination.split('+').length : 1;
      const bChillerCount = b.combination.includes('+') ? b.combination.split('+').length : 1;
      
      if (aChillerCount !== bChillerCount) {
        return aChillerCount - bChillerCount;
      }
      
      // Then sort alphabetically within the same chiller count group
      return a.combination.localeCompare(b.combination);
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
      <div className="flex items-center mb-4">
        <Activity className="w-6 h-6 text-purple-400 mr-3" />
        <h2 className="text-xl font-bold text-white">
          Chiller Staging Analysis
        </h2>
      </div>

      {/* Base Configuration Section */}
      <div className="mb-6">
        <div className="text-sm font-medium text-gray-300 mb-3">Base Configuration</div>
        <div className="flex flex-wrap gap-2">
          {chillerConfigs.map(config => (
            <button
              key={config.Chiller}
              onClick={() => handleChillerToggle(config.Chiller)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedChillers.has(config.Chiller)
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <Power className={`w-3 h-3 ${selectedChillers.has(config.Chiller) ? 'text-purple-400' : 'text-gray-600'}`} />
                {config.Chiller}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Stage-Up Analysis Section */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50">
          <div className="text-sm font-medium text-gray-300">Stage-Up Analysis</div>
          <div className="text-sm text-gray-400 mt-1">
            Analysis Range: {getStageUpCombinations()[0]?.loadRange.min.toLocaleString()} kW to {getStageUpCombinations()[0]?.loadRange.max.toLocaleString()} kW
          </div>
        </div>
        
        {/* Table Container */}
        <div className="relative">
          {/* Analysis Mode Toggle */}
          <div className="flex justify-end mb-4">
            <div className="inline-flex rounded-lg border border-gray-700 bg-gray-800 p-1">
              <button
                onClick={() => setAnalysisMode('stageUp')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  analysisMode === 'stageUp'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Stage Up Analysis
              </button>
              <button
                onClick={() => setAnalysisMode('stageDown')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  analysisMode === 'stageDown'
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Stage Down Analysis
              </button>
            </div>
          </div>

          {/* Single scrollable table container */}
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full table-fixed">
              <thead className="sticky top-0 z-20 bg-gray-800 border-b-2 border-gray-700">
                <tr>
                  <th className="w-[100px] px-3 py-2 text-left text-sm font-semibold text-gray-200 bg-gray-800 sticky left-0 z-30">
                    Load (kW)
                  </th>
                  {(analysisMode === 'stageUp' ? getStageUpCombinations() : getStageDownCombinations()).map(option => (
                    <th key={option.combination} className="w-[150px] px-3 py-2 text-left text-sm font-semibold text-gray-200 bg-gray-800">
                      {option.combination}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {(analysisMode === 'stageUp' ? getStageUpCombinations() : getStageDownCombinations())[0]?.copComparison.map((point, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/30">
                    <td className="w-[100px] px-3 py-2 text-sm text-gray-300 whitespace-nowrap sticky left-0 bg-gray-900/50">
                      {point.load.toLocaleString()}
                    </td>
                    {(analysisMode === 'stageUp' ? getStageUpCombinations() : getStageDownCombinations()).map(option => {
                      const comparison = option.copComparison[idx];
                      const isMoreEfficient = analysisMode === 'stageUp' 
                        ? comparison.new > comparison.current  // Stage up: higher COP is better
                        : comparison.new > comparison.current; // Stage down: higher COP is better (reversed)
                      
                      // Check for NaN values
                      const hasNaN = Number.isNaN(comparison.new) || Number.isNaN(comparison.current);
                      
                      return (
                        <td key={option.combination} className="w-[150px] px-3 py-2 text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`${
                              hasNaN 
                                ? 'text-gray-500' 
                                : isMoreEfficient 
                                  ? 'text-green-400' 
                                  : 'text-red-400'
                            }`}>
                              {hasNaN ? '-' : comparison.new === 0 ? '-' : comparison.new.toFixed(2)}
                            </span>
                            <span className="text-gray-500 text-xs">
                              ({hasNaN ? '-' : comparison.current === 0 ? '-' : comparison.current.toFixed(2)})
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 