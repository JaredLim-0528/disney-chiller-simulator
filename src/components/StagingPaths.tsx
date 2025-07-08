import React, { useState, useMemo } from 'react';
import { Activity, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { coolingLoadProfile } from '../data/cooling-load-profile';

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
}

interface StagingPath {
  id: number;
  path: StagingSegment[];
  averageCOP: number;
  totalEnergy: number;
  efficiency: number;
}

interface StagingSegment {
  combination: string;
  startTime: string;
  endTime: string;
  hours: number;
  averageLoad: number;
  averageCOP: number;
  energy: number;
}

export function StagingPaths({
  chillerConfigs,
  copData,
  dualCopData,
  tripleCopData,
  quadCopData,
  pentaCopData,
  hexaCopData,
  septaCopData
}: Props) {
  const [selectedPaths, setSelectedPaths] = useState<Set<number>>(new Set([1, 2, 3]));
  const [showDetails, setShowDetails] = useState(false);

  // Get all possible chiller combinations
  const getAllCombinations = useMemo(() => {
    const combinations: string[] = [];
    
    // Single chillers
    chillerConfigs.forEach(config => {
      combinations.push(config.Chiller);
    });
    
    // Dual combinations
    for (let i = 0; i < chillerConfigs.length; i++) {
      for (let j = i + 1; j < chillerConfigs.length; j++) {
        combinations.push(`${chillerConfigs[i].Chiller}+${chillerConfigs[j].Chiller}`);
      }
    }
    
    // Triple combinations
    for (let i = 0; i < chillerConfigs.length; i++) {
      for (let j = i + 1; j < chillerConfigs.length; j++) {
        for (let k = j + 1; k < chillerConfigs.length; k++) {
          combinations.push(`${chillerConfigs[i].Chiller}+${chillerConfigs[j].Chiller}+${chillerConfigs[k].Chiller}`);
        }
      }
    }
    
    // Quad combinations
    for (let i = 0; i < chillerConfigs.length; i++) {
      for (let j = i + 1; j < chillerConfigs.length; j++) {
        for (let k = j + 1; k < chillerConfigs.length; k++) {
          for (let l = k + 1; l < chillerConfigs.length; l++) {
            combinations.push(`${chillerConfigs[i].Chiller}+${chillerConfigs[j].Chiller}+${chillerConfigs[k].Chiller}+${chillerConfigs[l].Chiller}`);
          }
        }
      }
    }
    
    // Penta combinations
    for (let i = 0; i < chillerConfigs.length; i++) {
      for (let j = i + 1; j < chillerConfigs.length; j++) {
        for (let k = j + 1; k < chillerConfigs.length; k++) {
          for (let l = k + 1; l < chillerConfigs.length; l++) {
            for (let m = l + 1; m < chillerConfigs.length; m++) {
              combinations.push(`${chillerConfigs[i].Chiller}+${chillerConfigs[j].Chiller}+${chillerConfigs[k].Chiller}+${chillerConfigs[l].Chiller}+${chillerConfigs[m].Chiller}`);
            }
          }
        }
      }
    }
    
    // Hexa combinations
    for (let i = 0; i < chillerConfigs.length; i++) {
      for (let j = i + 1; j < chillerConfigs.length; j++) {
        for (let k = j + 1; k < chillerConfigs.length; k++) {
          for (let l = k + 1; l < chillerConfigs.length; l++) {
            for (let m = l + 1; m < chillerConfigs.length; m++) {
              for (let n = m + 1; n < chillerConfigs.length; n++) {
                combinations.push(`${chillerConfigs[i].Chiller}+${chillerConfigs[j].Chiller}+${chillerConfigs[k].Chiller}+${chillerConfigs[l].Chiller}+${chillerConfigs[m].Chiller}+${chillerConfigs[n].Chiller}`);
              }
            }
          }
        }
      }
    }
    
    // Septa combination (all chillers)
    combinations.push(chillerConfigs.map(config => config.Chiller).join('+'));
    
    return combinations.sort((a, b) => {
      // First sort by number of chillers (fewer first)
      const aChillerCount = a.includes('+') ? a.split('+').length : 1;
      const bChillerCount = b.includes('+') ? b.split('+').length : 1;
      
      if (aChillerCount !== bChillerCount) {
        return aChillerCount - bChillerCount;
      }
      
      // Then sort alphabetically within the same chiller count group
      return a.localeCompare(b);
    });
  }, [chillerConfigs]);

  // Get COP data for a specific combination
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
      load: Number(row.kW),
      cop: Number(row[combination] || 0)
    }));
  };

  // Get COP for a combination at a specific load
  const getCopForLoad = (combination: string, load: number): number => {
    const copData = getCopDataForCombination(combination);
    
    // Find the closest load point
    let closestCop = 0;
    let minDiff = Infinity;
    
    copData.forEach(row => {
      const diff = Math.abs(row.load - load);
      if (diff < minDiff) {
        minDiff = diff;
        closestCop = row.cop;
      }
    });
    
    return closestCop;
  };

  // Calculate total capacity for a combination
  const getCombinationCapacity = (combination: string): number => {
    return combination.split('+').reduce((total, chiller) => {
      const config = chillerConfigs.find(c => c.Chiller === chiller);
      return total + (config?.['Capacity (TR)'] || 0) * 3.51685; // Convert TR to kW
    }, 0);
  };

  // Generate staging paths
  const generateStagingPaths = useMemo((): StagingPath[] => {
    const paths: StagingPath[] = [];
    let pathId = 1;

    // Define some common staging strategies
    const stagingStrategies = [
      // Strategy 1: Conservative staging
      {
        name: "Conservative",
        segments: [
          { startHour: 0, endHour: 6, targetCombinations: ['CH01'] },
          { startHour: 6, endHour: 9, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 9, endHour: 12, targetCombinations: ['CH01', 'CH02', 'CH03'] },
          { startHour: 12, endHour: 15, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04'] },
          { startHour: 15, endHour: 18, targetCombinations: ['CH01', 'CH02', 'CH03'] },
          { startHour: 18, endHour: 21, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 21, endHour: 24, targetCombinations: ['CH01'] }
        ]
      },
      // Strategy 2: Aggressive staging
      {
        name: "Aggressive",
        segments: [
          { startHour: 0, endHour: 7, targetCombinations: ['CH01'] },
          { startHour: 7, endHour: 10, targetCombinations: ['CH01', 'CH03'] },
          { startHour: 10, endHour: 14, targetCombinations: ['CH01', 'CH03', 'CH06'] },
          { startHour: 14, endHour: 17, targetCombinations: ['CH01', 'CH03', 'CH06', 'CH07'] },
          { startHour: 17, endHour: 20, targetCombinations: ['CH01', 'CH03', 'CH06'] },
          { startHour: 20, endHour: 23, targetCombinations: ['CH01', 'CH03'] },
          { startHour: 23, endHour: 24, targetCombinations: ['CH01'] }
        ]
      },
      // Strategy 3: Balanced staging
      {
        name: "Balanced",
        segments: [
          { startHour: 0, endHour: 6, targetCombinations: ['CH01'] },
          { startHour: 6, endHour: 8, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 8, endHour: 11, targetCombinations: ['CH01', 'CH02', 'CH03'] },
          { startHour: 11, endHour: 14, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04'] },
          { startHour: 14, endHour: 16, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05'] },
          { startHour: 16, endHour: 19, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04'] },
          { startHour: 19, endHour: 22, targetCombinations: ['CH01', 'CH02', 'CH03'] },
          { startHour: 22, endHour: 24, targetCombinations: ['CH01', 'CH02'] }
        ]
      },
      // Strategy 4: VSD-focused
      {
        name: "VSD-Focused",
        segments: [
          { startHour: 0, endHour: 7, targetCombinations: ['CH01'] },
          { startHour: 7, endHour: 9, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 9, endHour: 12, targetCombinations: ['CH01', 'CH02', 'CH04'] },
          { startHour: 12, endHour: 15, targetCombinations: ['CH01', 'CH02', 'CH04', 'CH07'] },
          { startHour: 15, endHour: 18, targetCombinations: ['CH01', 'CH02', 'CH04'] },
          { startHour: 18, endHour: 21, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 21, endHour: 24, targetCombinations: ['CH01'] }
        ]
      },
      // Strategy 5: Load-following
      {
        name: "Load-Following",
        segments: [
          { startHour: 0, endHour: 5, targetCombinations: ['CH01'] },
          { startHour: 5, endHour: 7, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 7, endHour: 9, targetCombinations: ['CH01', 'CH02', 'CH03'] },
          { startHour: 9, endHour: 11, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04'] },
          { startHour: 11, endHour: 13, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05'] },
          { startHour: 13, endHour: 15, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06'] },
          { startHour: 15, endHour: 17, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04', 'CH05'] },
          { startHour: 17, endHour: 19, targetCombinations: ['CH01', 'CH02', 'CH03', 'CH04'] },
          { startHour: 19, endHour: 21, targetCombinations: ['CH01', 'CH02', 'CH03'] },
          { startHour: 21, endHour: 23, targetCombinations: ['CH01', 'CH02'] },
          { startHour: 23, endHour: 24, targetCombinations: ['CH01'] }
        ]
      }
    ];

    stagingStrategies.forEach(strategy => {
      const path: StagingPath = {
        id: pathId++,
        path: [],
        averageCOP: 0,
        totalEnergy: 0,
        efficiency: 0
      };

      let totalEnergy = 0;
      let totalHours = 0;

      strategy.segments.forEach(segment => {
        // Find the best combination for this time period
        const timeLoads = coolingLoadProfile.filter(profile => {
          const hour = profile.hour;
          return hour >= segment.startHour && hour < segment.endHour;
        });

        if (timeLoads.length === 0) return;

        const averageLoad = timeLoads.reduce((sum, profile) => sum + profile.load, 0) / timeLoads.length;
        const hours = segment.endHour - segment.startHour;

        // Find the best combination that can handle the load
        let bestCombination = '';
        let bestCOP = 0;

        segment.targetCombinations.forEach(targetCombo => {
          const capacity = getCombinationCapacity(targetCombo);
          if (capacity >= averageLoad * 0.8) { // 80% capacity threshold
            const cop = getCopForLoad(targetCombo, averageLoad);
            if (cop > bestCOP) {
              bestCOP = cop;
              bestCombination = targetCombo;
            }
          }
        });

        // If no target combination works, find the best available
        if (!bestCombination) {
          getAllCombinations.forEach(combo => {
            const capacity = getCombinationCapacity(combo);
            if (capacity >= averageLoad * 0.8) {
              const cop = getCopForLoad(combo, averageLoad);
              if (cop > bestCOP) {
                bestCOP = cop;
                bestCombination = combo;
              }
            }
          });
        }

        if (bestCombination) {
          const energy = averageLoad * hours / bestCOP;
          totalEnergy += energy;
          totalHours += hours;

          path.path.push({
            combination: bestCombination,
            startTime: `${segment.startHour.toString().padStart(2, '0')}:00`,
            endTime: `${segment.endHour.toString().padStart(2, '0')}:00`,
            hours,
            averageLoad,
            averageCOP: bestCOP,
            energy
          });
        }
      });

      path.totalEnergy = totalEnergy;
      path.averageCOP = totalEnergy > 0 ? (totalEnergy / totalHours) : 0;
      path.efficiency = totalEnergy > 0 ? (totalEnergy / (totalEnergy * 1.1)) : 0; // Simple efficiency calculation

      paths.push(path);
    });

    return paths.sort((a, b) => b.averageCOP - a.averageCOP);
  }, [chillerConfigs, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData, getAllCombinations]);

  const handlePathToggle = (pathId: number) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(pathId)) {
        if (next.size > 1) {
          next.delete(pathId);
        }
      } else {
        next.add(pathId);
      }
      return next;
    });
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
      <div className="flex items-center mb-4">
        <Activity className="w-6 h-6 text-purple-400 mr-3" />
        <h2 className="text-xl font-bold text-white">
          Daily Staging Path Analysis
        </h2>
      </div>

      <div className="mb-6">
        <div className="text-sm text-gray-400 mb-4">
          Analysis of different staging strategies throughout a 24-hour period using the cooling load profile.
        </div>
        
        {/* Path Selection */}
        <div className="flex flex-wrap gap-2 mb-4">
          {generateStagingPaths.map(path => (
            <button
              key={path.id}
              onClick={() => handlePathToggle(path.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedPaths.has(path.id)
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Path {path.id}
                <span className="text-xs">
                  ({path.averageCOP.toFixed(2)} COP)
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Path Details */}
        <div className="space-y-4">
          {generateStagingPaths
            .filter(path => selectedPaths.has(path.id))
            .map(path => (
              <div key={path.id} className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-white">
                    Path {path.id} - Average COP: {path.averageCOP.toFixed(2)}
                  </h3>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-gray-400 hover:text-gray-300"
                  >
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <TrendingUp className="w-4 h-4" />
                      Average COP
                    </div>
                    <div className="text-xl font-bold text-green-400">
                      {path.averageCOP.toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Clock className="w-4 h-4" />
                      Total Energy
                    </div>
                    <div className="text-xl font-bold text-blue-400">
                      {path.totalEnergy.toFixed(0)} kWh
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Activity className="w-4 h-4" />
                      Efficiency
                    </div>
                    <div className="text-xl font-bold text-purple-400">
                      {(path.efficiency * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {showDetails && (
                  <div className="bg-gray-900/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Staging Schedule</h4>
                    <div className="space-y-2">
                      {path.path.map((segment, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-4">
                            <span className="text-gray-400 w-16">
                              {segment.startTime} - {segment.endTime}
                            </span>
                            <span className="text-white font-medium">
                              {segment.combination}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-gray-400">
                            <span>Load: {segment.averageLoad.toFixed(0)} kW</span>
                            <span>COP: {segment.averageCOP.toFixed(2)}</span>
                            <span>Energy: {segment.energy.toFixed(0)} kWh</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
