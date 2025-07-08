import React, { useState, useEffect } from 'react';
import { Award, Activity, ChevronDown, ChevronUp, Clock, Zap, TrendingUp, ArrowRight } from 'lucide-react';

interface ChillerPriority {
  chiller: string;
  priority: number;
}

interface PriorityOrderResult {
  priorityOrder: ChillerPriority[];
  averageCOP: number;
  totalEnergy: number;
  hourlyCombinations: Array<{
    hour: number;
    combination: string;
    load: number;
    cop: number;
    capacity: number;
  }>;
  stagingEvents: Array<{
    hour: number;
    action: 'add' | 'remove';
    chiller: string;
    combination: string;
    load: number;
    cop: number;
    reason: string;
  }>;
}

interface PriorityOrderRankingProps {
  chillerConfigs: any[];
  copData: Record<string, number | null>[];
  dualCopData: Record<string, number | null>[];
  tripleCopData: Record<string, number | null>[];
  quadCopData: Record<string, number | null>[];
  pentaCopData: Record<string, number | null>[];
  hexaCopData: Record<string, number | null>[];
  septaCopData: Record<string, number | null>[];
  coolingLoadProfile: Array<{hour: number, load: number}>;
  onResultSelect?: (result: PriorityOrderResult | null) => void;
}

interface GroupedResult {
  totalEnergy: number;
  orders: PriorityOrderResult[];
}

// Helper function to normalize combination names
function normalizeCombinationName(combination: string): string {
  if (!combination) return '';
  return combination.split('+').sort().join('+');
}

// Helper function to get COP for a specific load
function getCOPForLoad(
  copData: Record<string, number | null>[],
  combination: string,
  load: number
): number {
  const normalizedCombination = normalizeCombinationName(combination);
  
  let closestCop = 0;
  let minDiff = Infinity;
  let foundValidCop = false;

  copData.forEach(row => {
    const kW = row.kW as number;
    const cop = row[normalizedCombination] as number;
    if (cop !== null && kW !== null && !isNaN(cop) && !isNaN(kW)) {
      const diff = Math.abs(kW - load);
      if (diff < minDiff) {
        minDiff = diff;
        closestCop = cop;
        foundValidCop = true;
      }
    }
  });

  return foundValidCop ? closestCop : 0;
}

// Helper function to get the appropriate COP data for a combination
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
  const chillerCount = combination.split('+').length;
  
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

// Helper function to get combination capacity
function getCombinationCapacity(combination: string, chillerConfigs: any[]): number {
  if (!combination) return 0;
  
  return combination.split('+').reduce((total, chiller) => {
    const config = chillerConfigs.find(c => c.Chiller === chiller);
    return total + (config ? config['Capacity (TR)'] * 3.516 : 0); // Convert TR to kW
  }, 0);
}

// Helper function to add a chiller to a combination based on priority
function addChillerToCombination(combination: string, chiller: string, priorities: ChillerPriority[]): string {
  if (!combination) return chiller;
  
  const currentChillers = combination.split('+');
  if (currentChillers.includes(chiller)) return combination;
  
  const newChillers = [...currentChillers, chiller];
  return newChillers.sort((a, b) => {
    const priorityA = priorities.find(p => p.chiller === a)?.priority || 999;
    const priorityB = priorities.find(p => p.chiller === b)?.priority || 999;
    return priorityA - priorityB;
  }).join('+');
}

// Helper function to remove a chiller from a combination
function removeChillerFromCombination(combination: string, chiller: string): string {
  if (!combination) return '';
  
  const chillers = combination.split('+').filter(c => c !== chiller);
  return chillers.join('+');
}

// Main algorithm function (corrected version that strictly follows priority order)
function findBestCombinationForLoad(
  load: number,
  currentCombination: string,
  priorities: ChillerPriority[],
  chillerConfigs: any[],
  copData: Record<string, number | null>[],
  dualCopData: Record<string, number | null>[],
  tripleCopData: Record<string, number | null>[],
  quadCopData: Record<string, number | null>[],
  pentaCopData: Record<string, number | null>[],
  hexaCopData: Record<string, number | null>[],
  septaCopData: Record<string, number | null>[]
): { combination: string; cop: number; reason: string } {
  
  // Sort priorities by priority number (1 = highest, 7 = lowest)
  const sortedPriorities = [...priorities].sort((a, b) => a.priority - b.priority);
  
  // If this is the first hour (no current combination), determine starting combination
  if (!currentCombination) {
    // Add chillers one by one in priority order until capacity is sufficient
    let startingCombination = '';
    
    for (let numChillers = 1; numChillers <= 7; numChillers++) {
      // Take the first 'numChillers' chillers in priority order
      const chillers = sortedPriorities.slice(0, numChillers).map(p => p.chiller);
      const combination = chillers.join('+');
      const capacity = getCombinationCapacity(combination, chillerConfigs);
      
      if (capacity >= load) {
        startingCombination = combination;
        break;
      }
    }
    
    // If even 7 chillers can't meet the load, use all 7
    if (!startingCombination) {
      startingCombination = sortedPriorities.map(p => p.chiller).join('+');
    }
    
    const copDataForCombo = getCopDataForCombination(startingCombination, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData);
    const cop = getCOPForLoad(copDataForCombo, startingCombination, load);
    
    return { 
      combination: startingCombination, 
      cop: cop || 0, 
      reason: `Starting with ${startingCombination} for ${load.toFixed(0)} kW load` 
    };
  }
  
  // For subsequent hours, strictly follow priority order
  const currentChillers = currentCombination.split('+');
  const currentCapacity = getCombinationCapacity(currentCombination, chillerConfigs);
  const currentCopData = getCopDataForCombination(currentCombination, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData);
  const currentCOP = getCOPForLoad(currentCopData, currentCombination, load);
  
  let bestCombination = currentCombination;
  let bestCOP = currentCOP;
  let reason = 'No change needed';
  
  // Check if current capacity is insufficient - if so, we MUST add chillers
  if (currentCapacity < load) {
    console.log(`⚠️ Insufficient capacity: ${currentCapacity.toFixed(0)} kW < ${load.toFixed(0)} kW load`);
    
    // Find the next chiller in priority order that's not currently running
    for (const priority of sortedPriorities) {
      if (!currentChillers.includes(priority.chiller)) {
        console.log(`Considering adding ${priority.chiller} (priority ${priority.priority}) for capacity`);
        
        const newCombination = addChillerToCombination(currentCombination, priority.chiller, sortedPriorities);
        const newCapacity = getCombinationCapacity(newCombination, chillerConfigs);
        
        console.log(`Adding ${priority.chiller}: ${currentCombination} → ${newCombination}, capacity: ${currentCapacity.toFixed(0)} → ${newCapacity.toFixed(0)} kW`);
        
        // Accept if we now have sufficient capacity
        if (newCapacity >= load) {
          const newCopData = getCopDataForCombination(newCombination, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData);
          const newCOP = getCOPForLoad(newCopData, newCombination, load);
          
          console.log(`Adding ${priority.chiller}: COP ${(newCOP || 0).toFixed(2)} vs current ${(currentCOP || 0).toFixed(2)}`);
          
          bestCombination = newCombination;
          bestCOP = newCOP;
          reason = `Added ${priority.chiller} for capacity (${currentCapacity.toFixed(0)} → ${newCapacity.toFixed(0)} kW)`;
          console.log(`✓ Added ${priority.chiller} for capacity`);
          return { combination: bestCombination, cop: bestCOP, reason };
        } else {
          console.log(`✗ Adding ${priority.chiller} still insufficient capacity (${newCapacity.toFixed(0)} < ${load.toFixed(0)})`);
        }
        break; // Add only one chiller at a time
      }
    }
  }
  
  // Capacity is sufficient, check if adding/removing chillers improves COP
  // Try adding the next chiller in priority order
  let bestCombinationFromAdding = currentCombination;
  let bestCOPFromAdding = currentCOP;
  let reasonFromAdding = 'No change needed';
  
  // Find the next chiller in priority order that's not currently running
  for (const priority of sortedPriorities) {
    if (!currentChillers.includes(priority.chiller)) {
      console.log(`Considering adding ${priority.chiller} (priority ${priority.priority}) for COP improvement`);
      
      const newCombination = addChillerToCombination(currentCombination, priority.chiller, sortedPriorities);
      const newCapacity = getCombinationCapacity(newCombination, chillerConfigs);
      
      console.log(`Adding ${priority.chiller}: ${currentCombination} → ${newCombination}, capacity: ${currentCapacity.toFixed(0)} → ${newCapacity.toFixed(0)} kW`);
      
      // Only consider if we have sufficient capacity
      if (newCapacity >= load) {
        const newCopData = getCopDataForCombination(newCombination, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData);
        const newCOP = getCOPForLoad(newCopData, newCombination, load);
        
        console.log(`Adding ${priority.chiller}: COP ${(newCOP || 0).toFixed(2)} vs current ${(currentCOP || 0).toFixed(2)}`);
        
        // Accept if COP improves
        if (newCOP > currentCOP) {
          bestCombinationFromAdding = newCombination;
          bestCOPFromAdding = newCOP;
          reasonFromAdding = `Added ${priority.chiller} for efficiency (COP: ${(newCOP || 0).toFixed(2)} vs ${(currentCOP || 0).toFixed(2)})`;
          console.log(`✓ Adding ${priority.chiller} improves COP`);
        } else {
          console.log(`✗ Adding ${priority.chiller} does not improve COP`);
        }
      } else {
        console.log(`✗ Cannot add ${priority.chiller} - insufficient capacity (${newCapacity.toFixed(0)} < ${load.toFixed(0)})`);
      }
      break; // Only consider one chiller at a time
    } else {
      console.log(`Skipping ${priority.chiller} - already running`);
    }
  }
  
  // Try removing the lowest priority chiller currently running
  let bestCombinationFromRemoving = currentCombination;
  let bestCOPFromRemoving = currentCOP;
  let reasonFromRemoving = 'No change needed';
  
  if (currentChillers.length > 1) {
    console.log(`Current chillers: ${currentChillers.join(', ')}`);
    
    // Find the lowest priority chiller currently running
    let lowestPriorityChiller = '';
    let lowestPriority = 0; // Start with 0, find the highest priority number
    
    for (const chiller of currentChillers) {
      const priority = sortedPriorities.find(p => p.chiller === chiller);
      if (priority && priority.priority > lowestPriority) {
        lowestPriority = priority.priority;
        lowestPriorityChiller = chiller;
      }
    }
    
    console.log(`Lowest priority chiller found: ${lowestPriorityChiller} (priority ${lowestPriority})`);
    
    // Remove the lowest priority chiller
    if (lowestPriorityChiller) {
      const newCombination = removeChillerFromCombination(currentCombination, lowestPriorityChiller);
      const newCapacity = getCombinationCapacity(newCombination, chillerConfigs);
      
      console.log(`Removing ${lowestPriorityChiller}: ${currentCombination} → ${newCombination}, capacity: ${currentCapacity.toFixed(0)} → ${newCapacity.toFixed(0)} kW`);
      
      // Only consider if we have sufficient capacity
      if (newCapacity >= load) {
        const newCopData = getCopDataForCombination(newCombination, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData);
        const newCOP = getCOPForLoad(newCopData, newCombination, load);
        
        console.log(`Removing ${lowestPriorityChiller}: COP ${(newCOP || 0).toFixed(2)} vs current ${(currentCOP || 0).toFixed(2)}`);
        
        // Remove the chiller if COP improves OR if we have significant excess capacity
        const hasExcessCapacity = currentCapacity > load * 1.5; // 50% excess capacity threshold
        if (newCOP > currentCOP || hasExcessCapacity) {
          bestCombinationFromRemoving = newCombination;
          bestCOPFromRemoving = newCOP;
          if (newCOP > currentCOP) {
            reasonFromRemoving = `Removed ${lowestPriorityChiller} for efficiency (COP: ${(newCOP || 0).toFixed(2)} vs ${(currentCOP || 0).toFixed(2)})`;
            console.log(`✓ Removing ${lowestPriorityChiller} improves COP`);
          } else {
            reasonFromRemoving = `Removed ${lowestPriorityChiller} due to excess capacity (${currentCapacity.toFixed(0)} kW vs ${load.toFixed(0)} kW load)`;
            console.log(`✓ Removing ${lowestPriorityChiller} due to excess capacity`);
          }
        } else {
          console.log(`✗ Removing ${lowestPriorityChiller} does not improve COP and no excess capacity`);
        }
      } else {
        console.log(`✗ Cannot remove ${lowestPriorityChiller} - insufficient capacity (${newCapacity.toFixed(0)} < ${load.toFixed(0)})`);
      }
    } else {
      console.log(`✗ No lowest priority chiller found`);
    }
  } else {
    console.log(`✗ Cannot remove chiller - only ${currentChillers.length} chiller(s) running`);
  }
  
  // Choose the best option: add, remove, or stay the same
  console.log(`Current COP: ${(currentCOP || 0).toFixed(2)}`);
  console.log(`Adding COP: ${(bestCOPFromAdding || 0).toFixed(2)} (${reasonFromAdding})`);
  console.log(`Removing COP: ${(bestCOPFromRemoving || 0).toFixed(2)} (${reasonFromRemoving})`);
  
  // Compare each option against current COP
  const addingImproves = bestCOPFromAdding > currentCOP;
  const removingImproves = bestCOPFromRemoving > currentCOP;
  
  if (addingImproves && removingImproves) {
    // Both improve - choose the better one
    if (bestCOPFromAdding > bestCOPFromRemoving) {
      bestCombination = bestCombinationFromAdding;
      bestCOP = bestCOPFromAdding;
      reason = reasonFromAdding;
      console.log(`✓ Both improve - chose adding: ${reason}`);
    } else {
      bestCombination = bestCombinationFromRemoving;
      bestCOP = bestCOPFromRemoving;
      reason = reasonFromRemoving;
      console.log(`✓ Both improve - chose removing: ${reason}`);
    }
  } else if (addingImproves) {
    // Only adding improves
    bestCombination = bestCombinationFromAdding;
    bestCOP = bestCOPFromAdding;
    reason = reasonFromAdding;
    console.log(`✓ Only adding improves - chose adding: ${reason}`);
  } else if (removingImproves) {
    // Only removing improves
    bestCombination = bestCombinationFromRemoving;
    bestCOP = bestCOPFromRemoving;
    reason = reasonFromRemoving;
    console.log(`✓ Only removing improves - chose removing: ${reason}`);
  } else {
    // Neither improves - stay the same
    bestCombination = currentCombination;
    bestCOP = currentCOP;
    reason = 'No change needed - current combination is optimal';
    console.log(`✓ Neither improves - staying the same`);
  }
  
  return { combination: bestCombination, cop: bestCOP, reason };
}

// Function to generate all possible priority orders
function generateAllPriorityOrders(chillerConfigs: any[]): ChillerPriority[][] {
  const chillerNames = chillerConfigs.map(config => config.Chiller);
  const permutations: ChillerPriority[][] = [];
  
  function permute(arr: string[], start: number) {
    if (start === arr.length - 1) {
      const priorityOrder: ChillerPriority[] = arr.map((chiller, index) => ({
        chiller,
        priority: index + 1
      }));
      permutations.push(priorityOrder);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute([...arr], start + 1);
    }
  }
  
  permute([...chillerNames], 0);
  return permutations;
}

// Function to calculate performance for a specific priority order
function calculatePriorityOrderPerformance(
  priorityOrder: ChillerPriority[],
  chillerConfigs: any[],
  copData: Record<string, number | null>[],
  dualCopData: Record<string, number | null>[],
  tripleCopData: Record<string, number | null>[],
  quadCopData: Record<string, number | null>[],
  pentaCopData: Record<string, number | null>[],
  hexaCopData: Record<string, number | null>[],
  septaCopData: Record<string, number | null>[],
  coolingLoadProfile: Array<{hour: number, load: number}>
): PriorityOrderResult {
  const events: Array<{
    hour: number;
    action: 'add' | 'remove';
    chiller: string;
    combination: string;
    load: number;
    cop: number;
    reason: string;
  }> = [];
  
  const hourlyCombos: Array<{
    hour: number;
    combination: string;
    load: number;
    cop: number;
    capacity: number;
  }> = [];
  
  let currentCombination = '';
  let totalEnergyConsumption = 0;
  let totalCOP = 0;
  let hourCount = 0;
  
  for (let hour = 0; hour < 24; hour++) {
    try {
      const load = coolingLoadProfile.find(p => p.hour === hour)?.load || 0;
      
      // Find best combination for this load
      const result = findBestCombinationForLoad(
        load,
        currentCombination,
        priorityOrder,
        chillerConfigs,
        copData,
        dualCopData,
        tripleCopData,
        quadCopData,
        pentaCopData,
        hexaCopData,
        septaCopData
      );
      
      // Store hourly combination
      hourlyCombos.push({
        hour,
        combination: result.combination,
        load,
        cop: result.cop,
        capacity: getCombinationCapacity(result.combination, chillerConfigs)
      });
      
      // Check if combination changed
      if (result.combination !== currentCombination) {
        const currentChillers = currentCombination.split('+');
        const newChillers = result.combination.split('+');
        
        // Find added chillers
        const addedChillers = newChillers.filter(chiller => !currentChillers.includes(chiller));
        // Find removed chillers
        const removedChillers = currentChillers.filter(chiller => !newChillers.includes(chiller));
        
        // Add events for added chillers
        addedChillers.forEach(chiller => {
          events.push({
            hour,
            action: 'add',
            chiller,
            combination: result.combination,
            load,
            cop: result.cop,
            reason: result.reason
          });
        });
        
        // Add events for removed chillers
        removedChillers.forEach(chiller => {
          events.push({
            hour,
            action: 'remove',
            chiller,
            combination: result.combination,
            load,
            cop: result.cop,
            reason: result.reason
          });
        });
      }
      
      currentCombination = result.combination;
      if (result.cop > 0) {
        totalEnergyConsumption += load / result.cop;
        totalCOP += result.cop;
        hourCount++;
      } else {
        console.warn(`Hour ${hour}: Invalid COP (${result.cop}) for combination ${result.combination}`);
      }
    } catch (error) {
      console.error(`Error processing hour ${hour}:`, error);
    }
  }
  
  // In calculatePriorityOrderPerformance, always print debug output
  const priorityOrderString = priorityOrder.map(p => p.chiller).join(' -> ');
  console.log('=== PRIORITY ORDER RANKING DEBUG ===');
  console.log('Priority order:', priorityOrderString);
  console.log('Total COP:', totalCOP);
  console.log('Hour count:', hourCount);
  console.log('Average COP calculation:', hourCount > 0 ? totalCOP / hourCount : 0);
  console.log('Hourly COPs:', hourlyCombos.map(h => ({ hour: h.hour, cop: h.cop, combination: h.combination })));
  console.log('=== END DEBUG ===');

  return {
    priorityOrder,
    averageCOP: hourCount > 0 ? totalCOP / hourCount : 0,
    totalEnergy: totalEnergyConsumption,
    hourlyCombinations: hourlyCombos,
    stagingEvents: events
  };
}

function getChillerColor(chiller: string): string {
  const colors = [
    'text-blue-400',
    'text-green-400', 
    'text-yellow-400',
    'text-red-400',
    'text-purple-400',
    'text-pink-400',
    'text-indigo-400'
  ];
  
  // Extract chiller number and assign color based on that
  const chillerNum = parseInt(chiller.replace(/\D/g, ''));
  const colorIndex = (chillerNum - 1) % colors.length;
  return colors[colorIndex];
}

// Helper function to get the actual chillers used based on hourly combinations
function getActualChillersUsed(result: PriorityOrderResult): string[] {
  // Find the combination with the most chillers (highest load scenario)
  let maxChillerCount = 0;
  let maxCombination = '';
  
  result.hourlyCombinations.forEach(hourly => {
    const chillerCount = hourly.combination.split('+').length;
    if (chillerCount > maxChillerCount) {
      maxChillerCount = chillerCount;
      maxCombination = hourly.combination;
    }
  });
  
  // If no combinations found, return empty array
  if (!maxCombination) return [];
  
  // Get the chillers from the maximum combination
  const usedChillers = maxCombination.split('+');
  
  // Sort them according to the original priority order
  return result.priorityOrder
    .map(priority => priority.chiller)
    .filter(chiller => usedChillers.includes(chiller));
}

// Helper function to create a unique key for each effective priority order
function getEffectivePriorityOrderKey(result: PriorityOrderResult): string {
  const actualChillers = getActualChillersUsed(result);
  return actualChillers.join('->');
}

export function PriorityOrderRanking({
  chillerConfigs,
  copData,
  dualCopData,
  tripleCopData,
  quadCopData,
  pentaCopData,
  hexaCopData,
  septaCopData,
  coolingLoadProfile,
  onResultSelect
}: PriorityOrderRankingProps) {
  const [results, setResults] = useState<GroupedResult[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<PriorityOrderResult | null>(null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });

  const calculateAllPriorityOrders = async () => {
    setLoading(true);
    setProgress({ current: 0, total: 0, percentage: 0 });
    
    try {
      console.log('Generating all priority orders...');
      console.log('COP data available:', {
        single: copData.length,
        dual: dualCopData.length,
        triple: tripleCopData.length,
        quad: quadCopData.length,
        penta: pentaCopData.length,
        hexa: hexaCopData.length,
        septa: septaCopData.length
      });
      
      const allPriorityOrders = generateAllPriorityOrders(chillerConfigs);
      console.log(`Generated ${allPriorityOrders.length} priority orders`);
      
      setProgress({ current: 0, total: allPriorityOrders.length, percentage: 0 });
      
      const allResults: PriorityOrderResult[] = [];
      
      // Process in batches to avoid blocking the UI
      const batchSize = 50;
      
      for (let i = 0; i < allPriorityOrders.length; i += batchSize) {
        const batch = allPriorityOrders.slice(i, i + batchSize);
        
        // Process batch
        for (let j = 0; j < batch.length; j++) {
          const priorityOrder = batch[j];
          const result = calculatePriorityOrderPerformance(
            priorityOrder,
            chillerConfigs,
            copData,
            dualCopData,
            tripleCopData,
            quadCopData,
            pentaCopData,
            hexaCopData,
            septaCopData,
            coolingLoadProfile
          );
          allResults.push(result);
        }
        
        // Update progress
        const current = Math.min(i + batchSize, allPriorityOrders.length);
        const percentage = Math.round((current / allPriorityOrders.length) * 100);
        setProgress({ current, total: allPriorityOrders.length, percentage });
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // Sort by totalEnergy (lowest first) and filter out invalid results
      const validResults = allResults.filter(result => !isNaN(result.totalEnergy) && result.totalEnergy > 0);
      validResults.sort((a, b) => a.totalEnergy - b.totalEnergy);
      
      // Group by total energy consumption (same kWh/day)
      const grouped: Record<number, GroupedResult> = {};
      validResults.forEach(result => {
        const energyKey = Math.round(result.totalEnergy);
        if (!grouped[energyKey]) {
          grouped[energyKey] = { 
            totalEnergy: energyKey, 
            orders: [] 
          };
        }
        grouped[energyKey].orders.push(result);
      });
      
      const groupedArray = Object.values(grouped)
        .sort((a, b) => a.totalEnergy - b.totalEnergy)
        .slice(0, 20);
      setResults(groupedArray);
      setHasRunAnalysis(true);
      console.log('Priority order ranking completed');
    } catch (error) {
      console.error('Error calculating priority orders:', error);
    } finally {
      setLoading(false);
      setProgress({ current: 0, total: 0, percentage: 0 });
    }
  };

  // Remove automatic execution - user will trigger manually

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-blue-400 mr-3 animate-spin" />
          <h2 className="text-xl font-bold text-white">
            Priority Order Ranking
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center h-32 space-y-4">
          <div className="text-gray-400 text-center">
            <div className="mb-2">Calculating priority orders...</div>
            <div className="text-sm text-gray-500">
              {progress.current > 0 && `${progress.current} / ${progress.total} (${progress.percentage}%)`}
            </div>
          </div>
          {progress.total > 0 && (
            <div className="w-64 bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!hasRunAnalysis) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center mb-4">
          <Award className="w-6 h-6 text-blue-400 mr-3" />
          <h2 className="text-xl font-bold text-white">
            Priority Order Ranking
          </h2>
        </div>
        
        <div className="text-sm text-gray-400 mb-6">
          Run analysis to generate priority order rankings based on cooling load profile
        </div>
        
        <div className="flex items-center justify-center h-32">
          <button
            onClick={calculateAllPriorityOrders}
            disabled={chillerConfigs.length === 0 || coolingLoadProfile.length === 0}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              chillerConfigs.length === 0 || coolingLoadProfile.length === 0
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Run Priority Order Analysis
          </button>
        </div>
        
        {(chillerConfigs.length === 0 || coolingLoadProfile.length === 0) && (
          <div className="text-xs text-gray-500 text-center mt-4">
            {chillerConfigs.length === 0 && coolingLoadProfile.length === 0
              ? 'Waiting for chiller configs and cooling load profile data...'
              : chillerConfigs.length === 0
              ? 'Waiting for chiller configs data...'
              : 'Waiting for cooling load profile data...'}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center mb-4">
        <Award className="w-6 h-6 text-blue-400 mr-3" />
        <h2 className="text-xl font-bold text-white">
          Priority Order Ranking
        </h2>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-400">
          Top 20 chiller priority orders ranked by daily energy consumption (kWh/day)
        </div>
        <button
          onClick={calculateAllPriorityOrders}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Run Again
        </button>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-4">
          {results.map((group, rankIdx) => {
            const isExpanded = expandedGroups.has(rankIdx);
            
            // Calculate total daily cooling load from coolingLoadProfile
            const totalDailyCoolingLoad = coolingLoadProfile.reduce((sum, hour) => sum + hour.load, 0);
            
            // Calculate daily COP for this group
            const dailyCOP = totalDailyCoolingLoad / group.totalEnergy;
            
            return (
              <div key={group.totalEnergy} className="bg-gray-800/30 rounded-lg border border-gray-700/30 p-4">
                <div
                  className="flex items-center gap-2 mb-2 cursor-pointer select-none"
                  onClick={() => {
                    setExpandedGroups(prev => {
                      const next = new Set(prev);
                      if (next.has(rankIdx)) next.delete(rankIdx);
                      else next.add(rankIdx);
                      return next;
                    });
                  }}
                >
                  <span className="text-sm font-bold text-gray-300 bg-gray-700/50 px-2 py-1 rounded">#{rankIdx + 1}</span>
                  <span className="text-lg font-bold text-green-400">{group.totalEnergy.toFixed(0)} kWh/day</span>
                  <span className="text-xs text-gray-400">({group.orders.length} order{group.orders.length > 1 ? 's' : ''})</span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-700/30">
                    <div className="space-y-3">
                      {group.orders.map((order, orderIdx) => {
                        const orderDailyCOP = totalDailyCoolingLoad / order.totalEnergy;
                        return (
                          <div
                            key={orderIdx}
                            className={`cursor-pointer transition-colors p-3 rounded-md border ${
                              selectedResult === order
                                ? 'text-blue-400 bg-blue-950/20 border-blue-500/30'
                                : 'text-gray-300 hover:text-gray-200 bg-gray-800/20 border-gray-700/30 hover:border-gray-600/30'
                            }`}
                            onClick={() => {
                              setSelectedResult(selectedResult === order ? null : order);
                              onResultSelect?.(selectedResult === order ? null : order);
                            }}
                          >
                            <div className="flex gap-1 mb-2 items-center">
                              <span className="text-xs text-gray-500 mr-2">#{orderIdx + 1}</span>
                              {getActualChillersUsed(order).map((chiller, index) => {
                                const chillerColor = getChillerColor(chiller);
                                return (
                                  <React.Fragment key={chiller}>
                                    <span className={`text-sm font-medium ${chillerColor}`}>
                                      {chiller}
                                    </span>
                                    {index < getActualChillersUsed(order).length - 1 && (
                                      <ArrowRight className="w-3 h-3 text-gray-500 mx-1" />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                            <div className="text-sm text-gray-400">
                              Daily COP: {orderDailyCOP.toFixed(2)} | Actual Energy: {order.totalEnergy.toFixed(1)} kWh/day
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Full order: {order.priorityOrder.map(p => p.chiller).join(' → ')}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 