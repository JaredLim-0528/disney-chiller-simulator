import React from 'react';
import { Activity, Clock, TrendingUp, Zap } from 'lucide-react';
import { loadCoolingLoadProfile } from '../data/cooling-load-profile';

interface StagingPathAnalysisProps {
  chillerConfigs: any[];
  copData: Record<string, number | null>[];
  dualCopData: Record<string, number | null>[];
  tripleCopData: Record<string, number | null>[];
  quadCopData: Record<string, number | null>[];
  pentaCopData: Record<string, number | null>[];
  hexaCopData: Record<string, number | null>[];
  septaCopData: Record<string, number | null>[];
}

interface StagingTransition {
  hour: number;
  action: 'add' | 'remove';
  chiller: string;
  combination: string;
  load: number;
  cop: number;
}

interface StagingPath {
  name: string;
  nightMode: string;
  dayMode: string;
  transitions: StagingTransition[];
  hourlyCOPs: number[];
  averageCOP: number;
  totalEnergy: number;
}

// Get valid combinations from COP data (non-null values)
function getValidCombinations(copData: Record<string, number | null>[]): string[] {
  if (!copData || copData.length === 0) return [];
  
  const validCombinations: string[] = [];
  const headers = Object.keys(copData[0]).filter(key => key !== 'kW');
  
  headers.forEach(combination => {
    // Check if this combination has any non-null COP values
    const hasValidData = copData.some(row => {
      const value = row[combination];
      return value !== null && value !== undefined && !isNaN(Number(value));
    });
    
    if (hasValidData) {
      validCombinations.push(combination);
    }
  });
  
  return validCombinations;
}

// Get COP for a specific combination and load
function getCOPForLoad(
  copData: Record<string, number | null>[],
  combination: string,
  load: number
): number {
  if (!copData || copData.length === 0) return 0;
  
  let closestCOP = 0;
  let minDiff = Infinity;
  
  copData.forEach(row => {
    const kW = row.kW as number;
    const cop = row[combination] as number;
    
    if (cop !== null && cop !== undefined && !isNaN(cop)) {
      const diff = Math.abs(kW - load);
      if (diff < minDiff) {
        minDiff = diff;
        closestCOP = cop;
      }
    }
  });
  
  return closestCOP;
}

// Get the appropriate COP data based on number of chillers
function getCopDataForCombination(
  combination: string,
  copData: Record<string, number | null>[],
  dualCopData: Record<string, number | null>[],
  tripleCopData: Record<string, number | null>[],
  quadCopData: Record<string, number | null>[],
  pentaCopData: Record<string, number | null>[],
  hexaCopData: Record<string, number | null>[],
  septaCopData: Record<string, number | null>[]
): Record<string, number | null>[] {
  const chillerCount = combination.includes('+') ? combination.split('+').length : 1;
  
  switch (chillerCount) {
    case 1: return copData;
    case 2: return dualCopData;
    case 3: return tripleCopData;
    case 4: return quadCopData;
    case 5: return pentaCopData;
    case 6: return hexaCopData;
    case 7: return septaCopData;
    default: return copData;
  }
}

// Get the maximum capacity of a chiller combination in kW
function getCombinationMaxCapacity(combination: string, chillerConfigs: any[]): number {
  const chillers = combination.split('+');
  let totalCapacityTR = 0;
  
  chillers.forEach(chiller => {
    const config = chillerConfigs.find(c => c.Chiller === chiller);
    if (config) {
      totalCapacityTR += config['Capacity (TR)'];
    }
  });
  
  // Convert TR to kW (1 TR ≈ 3.517 kW)
  return totalCapacityTR * 3.517;
}

// Check if a combination has sufficient capacity for a given load profile
function hasSufficientCapacity(combination: string, chillerConfigs: any[], coolingLoadProfile: Array<{hour: number, load: number}>, periodHours: number[]): boolean {
  const maxCapacity = getCombinationMaxCapacity(combination, chillerConfigs);
  const periodLoads = periodHours.map(hour => coolingLoadProfile.find(p => p.hour === hour)?.load || 0);
  const peakLoad = Math.max(...periodLoads);
  return maxCapacity >= peakLoad;
}

// Generate realistic staging paths
function generateStagingPaths(
  chillerConfigs: any[],
  copData: Record<string, number | null>[],
  dualCopData: Record<string, number | null>[],
  tripleCopData: Record<string, number | null>[],
  quadCopData: Record<string, number | null>[],
  pentaCopData: Record<string, number | null>[],
  hexaCopData: Record<string, number | null>[],
  septaCopData: Record<string, number | null>[],
  coolingLoadProfile: Array<{hour: number, load: number}>
): StagingPath[] {
  const paths: StagingPath[] = [];
  
  // Get valid combinations for each type
  const validSingle = getValidCombinations(copData);
  const validDual = getValidCombinations(dualCopData);
  const validTriple = getValidCombinations(tripleCopData);
  const validQuad = getValidCombinations(quadCopData);
  const validPenta = getValidCombinations(pentaCopData);
  const validHexa = getValidCombinations(hexaCopData);
  const validSepta = getValidCombinations(septaCopData);
  
  // Define load threshold for night vs day classification
  const loadThreshold = 13000; // kW - adjusted to prevent 1am peak from being classified as night
  
  // Dynamically determine night and day hours based on load threshold
  const nightHours: number[] = [];
  const dayHours: number[] = [];
  
  coolingLoadProfile.forEach(profile => {
    if (profile.load < loadThreshold) {
      nightHours.push(profile.hour);
    } else {
      dayHours.push(profile.hour);
    }
  });
  
  // Calculate average loads for night and day periods
  const nightLoads = nightHours.map(hour => coolingLoadProfile.find(p => p.hour === hour)?.load || 0);
  const dayLoads = dayHours.map(hour => coolingLoadProfile.find(p => p.hour === hour)?.load || 0);
  const avgNightLoad = nightLoads.reduce((sum, load) => sum + load, 0) / nightLoads.length;
  const avgDayLoad = dayLoads.reduce((sum, load) => sum + load, 0) / dayLoads.length;
  
  // Find best performing combinations for night loads (low load periods)
  const nightModeCombinations = findBestCombinationsForLoad(
    avgNightLoad,
    [validSingle, validDual, validTriple, validQuad],
    [copData, dualCopData, tripleCopData, quadCopData],
    5, // Top 5 combinations
    chillerConfigs,
    coolingLoadProfile,
    nightHours
  );
  
  // Find best performing combinations for day loads (high load periods)
  const dayModeCombinations = findBestCombinationsForLoad(
    avgDayLoad,
    [validTriple, validQuad, validPenta, validHexa, validSepta],
    [tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData],
    5, // Top 5 combinations
    chillerConfigs,
    coolingLoadProfile,
    dayHours
  );
  
  // Generate paths with different transition strategies
  const transitionStrategies = [
    {
      name: "Load-Based Conservative",
      description: "Conservative staging based on load threshold"
    },
    {
      name: "Load-Based Aggressive", 
      description: "Aggressive staging based on load threshold"
    },
    {
      name: "Load-Based Balanced",
      description: "Balanced staging based on load threshold"
    }
  ];
  
  // Generate paths for each night/day combination and strategy
  nightModeCombinations.forEach(nightMode => {
    dayModeCombinations.forEach(dayMode => {
      transitionStrategies.forEach(strategy => {
        const path = createStagingPath(
          nightMode,
          dayMode,
          strategy,
          chillerConfigs,
          copData,
          dualCopData,
          tripleCopData,
          quadCopData,
          pentaCopData,
          hexaCopData,
          septaCopData,
          coolingLoadProfile,
          nightHours,
          dayHours
        );
        
        if (path) {
          paths.push(path);
        }
      });
    });
  });
  
  return paths;
}

// Find best performing combinations for a specific load with capacity validation
function findBestCombinationsForLoad(
  targetLoad: number,
  validCombinationsList: string[][],
  copDataList: Record<string, number | null>[][],
  topN: number,
  chillerConfigs: any[],
  coolingLoadProfile: Array<{hour: number, load: number}>,
  periodHours: number[]
): string[] {
  const allCombinations: Array<{combination: string, cop: number, chillerCount: number, maxCapacity: number, hasSufficientCapacity: boolean}> = [];
  
  // Calculate peak load for the period
  const periodLoads = periodHours.map(hour => coolingLoadProfile.find(p => p.hour === hour)?.load || 0);
  const peakLoad = Math.max(...periodLoads);
  
  // Evaluate all combinations at the target load
  validCombinationsList.forEach((combinations, index) => {
    const copData = copDataList[index];
    
    combinations.forEach(combination => {
      const cop = getCOPForLoad(copData, combination, targetLoad);
      if (cop > 0) { // Only include combinations with valid COP
        const chillerCount = combination.includes('+') ? combination.split('+').length : 1;
        const maxCapacity = getCombinationMaxCapacity(combination, chillerConfigs);
        const hasSufficientCapacity = maxCapacity >= peakLoad;
        
        allCombinations.push({
          combination,
          cop,
          chillerCount,
          maxCapacity,
          hasSufficientCapacity
        });
      }
    });
  });
  
  // Sort by capacity sufficiency first, then by COP (descending)
  const sortedCombinations = allCombinations
    .sort((a, b) => {
      if (a.hasSufficientCapacity !== b.hasSufficientCapacity) {
        return b.hasSufficientCapacity ? 1 : -1; // Sufficient capacity first
      }
      return b.cop - a.cop; // Then by COP
    })
    .slice(0, topN)
    .map(item => item.combination);
  
  return sortedCombinations;
}

// Create a single staging path
function createStagingPath(
  nightMode: string,
  dayMode: string,
  strategy: any,
  chillerConfigs: any[],
  copData: Record<string, number | null>[],
  dualCopData: Record<string, number | null>[],
  tripleCopData: Record<string, number | null>[],
  quadCopData: Record<string, number | null>[],
  pentaCopData: Record<string, number | null>[],
  hexaCopData: Record<string, number | null>[],
  septaCopData: Record<string, number | null>[],
  coolingLoadProfile: Array<{hour: number, load: number}>,
  nightHours: number[],
  dayHours: number[]
): StagingPath | null {
  const transitions: StagingTransition[] = [];
  const hourlyCOPs: number[] = [];
  let totalEnergy = 0;
  
  // Parse night and day mode combinations to get individual chillers
  const nightChillers = nightMode.split('+');
  const dayChillers = dayMode.split('+');
  
  // Track current combination throughout the day
  let currentCombination = nightMode;
  let addedChillers: string[] = [];
  let removedChillers: string[] = [];
  
  // Calculate hourly COPs and transitions
  for (let hour = 0; hour < 24; hour++) {
    const load = coolingLoadProfile.find(p => p.hour === hour)?.load || 0;
    let currentCOP = 0;
    
    // Determine current combination based on whether hour is in day or night hours
    if (dayHours.includes(hour)) {
      // Day mode - add chillers if we haven't reached the day mode combination yet
      if (currentCombination !== dayMode) {
        // Find chillers that need to be added to reach day mode
        const currentChillers = currentCombination.split('+');
        const targetChillers = dayMode.split('+');
        const chillersToAdd = targetChillers.filter(chiller => !currentChillers.includes(chiller));
        
        if (chillersToAdd.length > 0) {
          // Add the first missing chiller
          const chillerToAdd = chillersToAdd[0];
          currentCombination = addChillerToCombination(currentCombination, chillerToAdd);
          addedChillers.push(chillerToAdd);
          
          transitions.push({
            hour,
            action: 'add',
            chiller: chillerToAdd,
            combination: currentCombination,
            load,
            cop: 0 // Will be calculated below
          });
        }
      }
    } else if (nightHours.includes(hour)) {
      // Night mode - remove chillers if we haven't reached the night mode combination yet
      if (currentCombination !== nightMode) {
        // Find chillers that need to be removed to reach night mode
        const currentChillers = currentCombination.split('+');
        const targetChillers = nightMode.split('+');
        const chillersToRemove = currentChillers.filter(chiller => !targetChillers.includes(chiller));
        
        if (chillersToRemove.length > 0) {
          // Remove the first extra chiller
          const chillerToRemove = chillersToRemove[0];
          currentCombination = removeChillerFromCombination(currentCombination, chillerToRemove);
          removedChillers.push(chillerToRemove);
          
          transitions.push({
            hour,
            action: 'remove',
            chiller: chillerToRemove,
            combination: currentCombination,
            load,
            cop: 0
          });
        }
      }
    }
    
    // Get COP for current combination and load
    const copDataForCombination = getCopDataForCombination(
      currentCombination,
      copData,
      dualCopData,
      tripleCopData,
      quadCopData,
      pentaCopData,
      hexaCopData,
      septaCopData
    );
    
    currentCOP = getCOPForLoad(copDataForCombination, currentCombination, load);
    hourlyCOPs.push(currentCOP);
    
    // Calculate energy consumption (kWh)
    const energy = load / currentCOP;
    totalEnergy += energy;
    
    // Update transition COP
    transitions.forEach(t => {
      if (t.hour === hour) {
        t.cop = currentCOP;
      }
    });
  }
  
  const averageCOP = hourlyCOPs.reduce((sum, cop) => sum + cop, 0) / hourlyCOPs.length;
  
  // Check capacity sufficiency
  const nightCapacitySufficient = hasSufficientCapacity(nightMode, chillerConfigs, coolingLoadProfile, nightHours);
  const dayCapacitySufficient = hasSufficientCapacity(dayMode, chillerConfigs, coolingLoadProfile, dayHours);
  
  let capacityWarning = '';
  if (!nightCapacitySufficient && !dayCapacitySufficient) {
    capacityWarning = ' [⚠️ INSUFFICIENT CAPACITY]';
  } else if (!nightCapacitySufficient) {
    capacityWarning = ' [⚠️ NIGHT CAPACITY INSUFFICIENT]';
  } else if (!dayCapacitySufficient) {
    capacityWarning = ' [⚠️ DAY CAPACITY INSUFFICIENT]';
  }
  
  return {
    name: `${strategy.name} - ${nightMode} (${nightHours.length}h) → ${dayMode} (${dayHours.length}h)${capacityWarning}`,
    nightMode,
    dayMode,
    transitions,
    hourlyCOPs,
    averageCOP,
    totalEnergy
  };
}

// Helper function to add a chiller to a combination
function addChillerToCombination(combination: string, chiller: string): string {
  if (!combination.includes(chiller)) {
    const chillers = combination.split('+');
    chillers.push(chiller);
    return chillers.sort().join('+');
  }
  return combination;
}

// Helper function to remove a chiller from a combination
function removeChillerFromCombination(combination: string, chiller: string): string {
  const chillers = combination.split('+').filter(c => c !== chiller);
  return chillers.sort().join('+');
}

export function StagingPathAnalysis({
  chillerConfigs,
  copData,
  dualCopData,
  tripleCopData,
  quadCopData,
  pentaCopData,
  hexaCopData,
  septaCopData
}: StagingPathAnalysisProps) {
  const [paths, setPaths] = React.useState<StagingPath[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [coolingLoadProfile, setCoolingLoadProfile] = React.useState<Array<{hour: number, load: number}>>([]);
  
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      try {
        // Load cooling load profile from CSV
        const profile = await loadCoolingLoadProfile();
        setCoolingLoadProfile(profile);
        
        // Generate staging paths with the loaded profile
        const generatedPaths = generateStagingPaths(
          chillerConfigs,
          copData,
          dualCopData,
          tripleCopData,
          quadCopData,
          pentaCopData,
          hexaCopData,
          septaCopData,
          profile
        );
        
        // Sort by average COP (descending)
        const sortedPaths = generatedPaths
          .sort((a, b) => b.averageCOP - a.averageCOP)
          .slice(0, 10); // Top 10 paths
        
        setPaths(sortedPaths);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [chillerConfigs, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData]);
  
  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-purple-400 mr-3" />
          <h2 className="text-xl font-bold text-white">
            Daily Staging Path Analysis
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-400">Analyzing staging paths...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
      <div className="flex items-center mb-4">
        <Activity className="w-6 h-6 text-purple-400 mr-3" />
        <h2 className="text-xl font-bold text-white">
          Daily Staging Path Analysis
        </h2>
      </div>
      
      <div className="text-sm text-gray-400 mb-4">
        Realistic two-segment operation (day/night modes) with gradual staging transitions based on load conditions.
      </div>
      
      {/* Load Threshold Summary */}
      <div className="bg-gray-800/30 rounded-lg p-4 mb-4 border border-gray-700/30">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-white font-medium">Load Threshold Classification</span>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-300 font-medium">Threshold: 13,000 kW</div>
            <div className="text-gray-400">
              • Night hours (load &lt; threshold): {coolingLoadProfile.filter(p => p.load < 13000).length} hours
            </div>
            <div className="text-gray-400">
              • Day hours (load ≥ threshold): {coolingLoadProfile.filter(p => p.load >= 13000).length} hours
            </div>
          </div>
          <div>
            <div className="text-gray-300 font-medium">Load Ranges</div>
            <div className="text-gray-400">
              • Night: {Math.min(...coolingLoadProfile.filter(p => p.load < 13000).map(p => p.load)).toFixed(0)} - {Math.max(...coolingLoadProfile.filter(p => p.load < 13000).map(p => p.load)).toFixed(0)} kW
            </div>
            <div className="text-gray-400">
              • Day: {Math.min(...coolingLoadProfile.filter(p => p.load >= 13000).map(p => p.load)).toFixed(0)} - {Math.max(...coolingLoadProfile.filter(p => p.load >= 13000).map(p => p.load)).toFixed(0)} kW
            </div>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-700/30">
          <div className="text-gray-300 font-medium mb-1">Capacity Requirements</div>
          <div className="text-gray-400 text-xs">
            • Night peak: {Math.max(...coolingLoadProfile.filter(p => p.load < 13000).map(p => p.load)).toFixed(0)} kW (requires ~{Math.ceil(Math.max(...coolingLoadProfile.filter(p => p.load < 13000).map(p => p.load)) / 1000)}k kW capacity)
          </div>
          <div className="text-gray-400 text-xs">
            • Day peak: {Math.max(...coolingLoadProfile.filter(p => p.load >= 13000).map(p => p.load)).toFixed(0)} kW (requires ~{Math.ceil(Math.max(...coolingLoadProfile.filter(p => p.load >= 13000).map(p => p.load)) / 1000)}k kW capacity)
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {paths.map((path, index) => (
          <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  index === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                  index === 2 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                  'bg-gray-600/20 text-gray-400 border border-gray-600/30'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-medium">{path.name}</div>
                  <div className="text-sm text-gray-400">
                    Night: {path.nightMode} | Day: {path.dayMode}
                  </div>
                  <div className="text-xs text-gray-500">
                    {path.transitions.length > 0 ? 
                      `${path.transitions.length} transitions` : 
                      'No transitions - static operation'
                    }
                  </div>
                  {path.name.includes('⚠️') && (
                    <div className="text-xs text-red-400 font-medium mt-1">
                      ⚠️ Capacity Warning: This combination may not handle peak loads
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-green-400">
                  {path.averageCOP.toFixed(2)} COP
                </div>
                <div className="text-sm text-gray-400">
                  {path.totalEnergy.toFixed(0)} kWh/day
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-gray-300 font-medium mb-2">Staging Transitions</div>
                <div className="space-y-1">
                  {/* Show initial combination */}
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>00:00</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                      START
                    </span>
                    <span className="text-gray-500">→ {path.nightMode}</span>
                    <span className="text-gray-600">({getCombinationMaxCapacity(path.nightMode, chillerConfigs).toFixed(0)} kW capacity)</span>
                  </div>
                  
                  {path.transitions.map((transition, tIndex) => (
                    <div key={tIndex} className="flex items-center gap-2 text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>{transition.hour.toString().padStart(2, '0')}:00</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        transition.action === 'add' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {transition.action === 'add' ? '+' : '-'}{transition.chiller}
                      </span>
                      <span className="text-gray-500">→ {transition.combination}</span>
                      <span className="text-gray-600">({getCombinationMaxCapacity(transition.combination, chillerConfigs).toFixed(0)} kW capacity)</span>
                    </div>
                  ))}
                  {path.transitions.length === 0 && (
                    <div className="text-gray-500 italic">No transitions - same combination throughout day</div>
                  )}
                </div>
              </div>
              
              <div>
                <div className="text-gray-300 font-medium mb-2">Performance Summary</div>
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Peak Hour COP:</span>
                    <span className="text-white">
                      {Math.max(...path.hourlyCOPs).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min Hour COP:</span>
                    <span className="text-white">
                      {Math.min(...path.hourlyCOPs).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>COP Variation:</span>
                    <span className="text-white">
                      {(Math.max(...path.hourlyCOPs) - Math.min(...path.hourlyCOPs)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 