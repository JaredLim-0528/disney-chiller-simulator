import React, { useState, useEffect } from 'react';
import { Activity, Clock, TrendingUp, Zap, ArrowUp, ArrowDown, Edit3, Save, X } from 'lucide-react';
import chillerLeadLagCsv from '../data/chiller-leadlag.csv?raw';

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

interface StagingEvent {
  hour: number;
  action: 'add' | 'remove';
  chiller: string;
  combination: string;
  load: number;
  cop: number;
  reason: string;
}

interface HourlyCombination {
  hour: number;
  combination: string;
  load: number;
  cop: number;
  capacity: number;
}

interface ManuallyDefinedSequenceProps {
  chillerConfigs: any[];
  copData: Record<string, number | null>[];
  dualCopData: Record<string, number | null>[];
  tripleCopData: Record<string, number | null>[];
  quadCopData: Record<string, number | null>[];
  pentaCopData: Record<string, number | null>[];
  hexaCopData: Record<string, number | null>[];
  septaCopData: Record<string, number | null>[];
  coolingLoadProfile: Array<{hour: number, load: number}>;
  selectedPriorityResult?: PriorityOrderResult | null;
}

// Load chiller priority from CSV
function loadChillerPriority(): ChillerPriority[] {
  try {
    const lines = chillerLeadLagCsv.split('\n').filter(line => line.trim());
    const priorities: ChillerPriority[] = [];
    
    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(',').map(part => part.trim().replace(/"/g, ''));
      
      if (parts.length >= 2) {
        const chiller = parts[0];
        const priority = parseInt(parts[1]);
        
        if (chiller && !isNaN(priority)) {
          priorities.push({ chiller, priority });
        }
      }
    }
    
    // Sort by priority (1 = highest, 7 = lowest)
    return priorities.sort((a, b) => a.priority - b.priority);
  } catch (error) {
    console.error('Error loading chiller priority:', error);
    // Fallback to user's actual priority order
    return [
      { chiller: 'CH05', priority: 1 },
      { chiller: 'CH06', priority: 2 },
      { chiller: 'CH01', priority: 3 },
      { chiller: 'CH07', priority: 4 },
      { chiller: 'CH02', priority: 5 },
      { chiller: 'CH03', priority: 6 },
      { chiller: 'CH04', priority: 7 }
    ];
  }
}

// Normalize combination name to match COP data format (alphabetical order)
function normalizeCombinationName(combination: string): string {
  if (!combination.includes('+')) {
    return combination; // Single chiller, no need to normalize
  }
  
  const chillers = combination.split('+');
  return chillers.sort().join('+');
}

// Get COP for a combination at a specific load
function getCOPForLoad(
  copData: Record<string, number | null>[],
  combination: string,
  load: number
): number {
  // Normalize the combination name to match COP data format
  const normalizedCombination = normalizeCombinationName(combination);
  
  let closestCop = 0;
  let minDiff = Infinity;

  copData.forEach(row => {
    const kW = row.kW as number;
    const cop = row[normalizedCombination] as number;
    if (cop !== null && kW !== null) {
      const diff = Math.abs(kW - load);
      if (diff < minDiff) {
        minDiff = diff;
        closestCop = cop;
      }
    }
  });

  return closestCop;
}

// Get the appropriate COP data for a combination
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
  // Normalize the combination name to match COP data format
  const normalizedCombination = normalizeCombinationName(combination);
  const chillerCount = normalizedCombination.includes('+') ? normalizedCombination.split('+').length : 1;
  
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

// Get combination capacity in kW
function getCombinationCapacity(combination: string, chillerConfigs: any[]): number {
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

// Add chiller to combination (maintains priority order)
function addChillerToCombination(combination: string, chiller: string, priorities: ChillerPriority[]): string {
  if (!combination.includes(chiller)) {
    const chillers = combination.split('+');
    chillers.push(chiller);
    
    // Sort by priority
    const sortedChillers = chillers.sort((a, b) => {
      const priorityA = priorities.find(p => p.chiller === a)?.priority || 999;
      const priorityB = priorities.find(p => p.chiller === b)?.priority || 999;
      return priorityA - priorityB;
    });
    
    return sortedChillers.join('+');
  }
  return combination;
}

// Remove chiller from combination
function removeChillerFromCombination(combination: string, chiller: string): string {
  const chillers = combination.split('+').filter(c => c !== chiller);
  return chillers.join('+');
}

// Find the best combination for a given load
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

export function ManuallyDefinedSequence({
  chillerConfigs,
  copData,
  dualCopData,
  tripleCopData,
  quadCopData,
  pentaCopData,
  hexaCopData,
  septaCopData,
  coolingLoadProfile,
  selectedPriorityResult
}: ManuallyDefinedSequenceProps) {
  const [priorities, setPriorities] = useState<ChillerPriority[]>([]);
  const [stagingEvents, setStagingEvents] = useState<StagingEvent[]>([]);
  const [hourlyCombinations, setHourlyCombinations] = useState<HourlyCombination[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [averageCOP, setAverageCOP] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isEditingPriorities, setIsEditingPriorities] = useState(false);
  const [editingPriorities, setEditingPriorities] = useState<ChillerPriority[]>([]);

  console.log('ManuallyDefinedSequence render called');

  useEffect(() => {
    console.log('ManuallyDefinedSequence useEffect triggered');
    console.log('Props received:', {
      chillerConfigs: chillerConfigs?.length,
      copData: copData?.length,
      coolingLoadProfile: coolingLoadProfile?.length
    });
    
    const loadData = () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading chiller priorities...');
        // Use current priorities if available, otherwise load from CSV
        const chillerPriorities = priorities.length > 0 ? priorities : loadChillerPriority();
        console.log('Chiller priorities loaded:', chillerPriorities);
        setPriorities(chillerPriorities);
        
        if (!coolingLoadProfile || coolingLoadProfile.length === 0) {
          console.error('No cooling load profile data available');
          setError('No cooling load profile data available');
          setLoading(false);
          return;
        }
        
        console.log('Cooling load profile:', coolingLoadProfile);
        console.log('Chiller configs:', chillerConfigs);
        
        // For now, just set some basic data to test rendering
        setStagingEvents([]);
        setHourlyCombinations([]);
        setTotalEnergy(0);
        setAverageCOP(0);
        
        // Generate staging sequence
        const events: StagingEvent[] = [];
        const hourlyCombos: HourlyCombination[] = [];
        let currentCombination = '';
        let totalEnergyConsumption = 0;
        let totalCOP = 0;
        let hourCount = 0;
        
        // Let the findBestCombinationForLoad function determine the starting combination
        console.log('Starting complex staging logic...');
        for (let hour = 0; hour < 24; hour++) {
          try {
            const load = coolingLoadProfile.find(p => p.hour === hour)?.load || 0;
            console.log(`Processing hour ${hour}, load: ${load} kW`);
            
            // Find best combination for this load
            const result = findBestCombinationForLoad(
              load,
              currentCombination,
              chillerPriorities,
              chillerConfigs,
              copData,
              dualCopData,
              tripleCopData,
              quadCopData,
              pentaCopData,
              hexaCopData,
              septaCopData
            );
            
            console.log(`Hour ${hour} result:`, result);
            
            // Store hourly combination
            hourlyCombos.push({
              hour,
              combination: result.combination,
              load,
              cop: result.cop,
              capacity: getCombinationCapacity(result.combination, chillerConfigs)
            });
            
            console.log(`Hour ${hour} stored combination: ${result.combination}, load: ${load} kW, capacity: ${getCombinationCapacity(result.combination, chillerConfigs).toFixed(0)} kW`);
            
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
            totalEnergyConsumption += load / result.cop;
            totalCOP += result.cop;
            hourCount++;
          } catch (hourError) {
            console.error(`Error processing hour ${hour}:`, hourError);
            // Continue with next hour instead of crashing
            hourlyCombos.push({
              hour,
              combination: currentCombination || 'CH05',
              load: coolingLoadProfile.find(p => p.hour === hour)?.load || 0,
              cop: 5.0,
              capacity: 1000
            });
          }
        }
        
        // Simple test data for now
        /*
        for (let hour = 0; hour < 24; hour++) {
          const load = coolingLoadProfile.find(p => p.hour === hour)?.load || 0;
          hourlyCombos.push({
            hour,
            combination: 'CH05',
            load,
            cop: 5.0,
            capacity: 1000
          });
        }
        */
        
        console.log('Generated events:', events);
        console.log('Generated hourly combinations:', hourlyCombos);
        // === DEBUG LOGGING FOR COP COMPARISON ===
        console.log('=== MANUALLY DEFINED SEQUENCE DEBUG ===');
        console.log('Priority order:', chillerPriorities);
        console.log('Total COP:', totalCOP);
        console.log('Hour count:', hourCount);
        console.log('Average COP calculation:', totalCOP / hourCount);
        console.log('Hourly COPs:', hourlyCombos.map(h => ({ hour: h.hour, cop: h.cop, combination: h.combination })));
        console.log('=== END DEBUG ===');
        // === END DEBUG LOGGING ===
        setStagingEvents(events);
        setHourlyCombinations(hourlyCombos);
        setTotalEnergy(totalEnergyConsumption);
        setAverageCOP(totalCOP / hourCount);
        
      } catch (error) {
        console.error('Error in ManuallyDefinedSequence:', error);
        setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [chillerConfigs, copData, dualCopData, tripleCopData, quadCopData, pentaCopData, hexaCopData, septaCopData, coolingLoadProfile, priorities]);

  console.log('ManuallyDefinedSequence render - loading:', loading, 'priorities:', priorities?.length, 'error:', error);

  // Function to start editing priorities
  const startEditingPriorities = () => {
    setEditingPriorities([...priorities]);
    setIsEditingPriorities(true);
  };

  // Function to save priority changes
  const savePriorityChanges = () => {
    console.log('Saving priority changes:', editingPriorities);
    setPriorities(editingPriorities);
    setIsEditingPriorities(false);
    // Recalculate sequence with new priorities
    recalculateSequence(editingPriorities);
  };

  // Function to cancel priority editing
  const cancelPriorityEditing = () => {
    setIsEditingPriorities(false);
    setEditingPriorities([]);
  };

  // Function to update priority for a specific chiller
  const updatePriority = (chiller: string, newPriority: number) => {
    setEditingPriorities(prev => {
      // First, update the target chiller's priority
      let updated = prev.map(p => 
        p.chiller === chiller ? { ...p, priority: newPriority } : p
      );
      
      // Check for conflicts (multiple chillers with same priority)
      const priorityCounts = new Map<number, number>();
      updated.forEach(p => {
        priorityCounts.set(p.priority, (priorityCounts.get(p.priority) || 0) + 1);
      });
      
      // If there are conflicts, resolve them by adjusting the conflicting chiller
      const conflicts = Array.from(priorityCounts.entries()).filter(([_, count]) => count > 1);
      if (conflicts.length > 0) {
        // Find the other chiller with the same priority (not the one being updated)
        const conflictingPriority = newPriority;
        const conflictingChiller = updated.find(p => p.chiller !== chiller && p.priority === conflictingPriority);
        
        if (conflictingChiller) {
          // Find the next available priority number
          const usedPriorities = new Set(updated.map(p => p.priority));
          let nextPriority = 1;
          while (usedPriorities.has(nextPriority)) {
            nextPriority++;
          }
          
          // Assign the next available priority to the conflicting chiller
          updated = updated.map(p => 
            p.chiller === conflictingChiller.chiller ? { ...p, priority: nextPriority } : p
          );
        }
      }
      
      return updated;
    });
  };

  // Function to recalculate sequence with new priorities
  const recalculateSequence = (newPriorities: ChillerPriority[]) => {
    console.log('Recalculating sequence with new priorities:', newPriorities);
    setLoading(true);
    setError(null);
    
    try {
      if (!coolingLoadProfile || coolingLoadProfile.length === 0) {
        setError('No cooling load profile data available');
        setLoading(false);
        return;
      }
      
      // Generate staging sequence with new priorities
      const events: StagingEvent[] = [];
      const hourlyCombos: HourlyCombination[] = [];
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
            newPriorities,
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
          totalEnergyConsumption += load / result.cop;
          totalCOP += result.cop;
          hourCount++;
        } catch (hourError) {
          console.error(`Error processing hour ${hour}:`, hourError);
          hourlyCombos.push({
            hour,
            combination: currentCombination || 'CH05',
            load: coolingLoadProfile.find(p => p.hour === hour)?.load || 0,
            cop: 5.0,
            capacity: 1000
          });
        }
      }
      
      setStagingEvents(events);
      setHourlyCombinations(hourlyCombos);
      setTotalEnergy(totalEnergyConsumption);
      setAverageCOP(totalCOP / hourCount);
      
    } catch (error) {
      console.error('Error recalculating sequence:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-red-400 mr-3" />
          <h2 className="text-xl font-bold text-white">
            Manually Defined Sequence
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-green-400 mr-3" />
          <h2 className="text-xl font-bold text-white">
            Manually Defined Sequence
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-gray-400">Loading chiller priorities...</div>
        </div>
      </div>
    );
  }

  // Fallback if no data is available
  if (!selectedPriorityResult && (!priorities || priorities.length === 0)) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-green-400 mr-3" />
          <h2 className="text-xl font-bold text-white">
            Manually Defined Sequence
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-400">Error: Could not load chiller priorities</div>
        </div>
      </div>
    );
  }

  if (!selectedPriorityResult && (!coolingLoadProfile || coolingLoadProfile.length === 0)) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center mb-4">
          <Activity className="w-6 h-6 text-green-400 mr-3" />
          <h2 className="text-xl font-bold text-white">
            Manually Defined Sequence
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-red-400">Error: No cooling load profile data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div>
            {selectedPriorityResult && (
              <div className="text-lg font-medium text-white mt-1">
                Chillers: {selectedPriorityResult.priorityOrder.map(p => p.chiller).join(' → ')}
              </div>
            )}
          </div>
        </div>
        {selectedPriorityResult && (
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">
              {(() => {
                // Calculate total daily cooling load
                const totalDailyCoolingLoad = coolingLoadProfile.reduce((sum, hour) => sum + hour.load, 0);
                // Calculate daily COP = total cooling load / total power consumption
                const dailyCOP = totalDailyCoolingLoad / selectedPriorityResult.totalEnergy;
                return `${dailyCOP.toFixed(2)} Daily COP`;
              })()}
            </div>
            <div className="text-sm text-gray-400">
              {selectedPriorityResult.totalEnergy.toFixed(0)} kWh/day
            </div>
          </div>
        )}
      </div>
      {/* Only show content when a priority result is selected */}
      {selectedPriorityResult ? (
        <>
          <div className="mb-4">
            <div className="text-gray-300 font-medium mb-2">Staging Events</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {(selectedPriorityResult ? selectedPriorityResult.stagingEvents : stagingEvents).length > 0 ? (
                (() => {
                  // Group events by hour
                  const events = selectedPriorityResult ? selectedPriorityResult.stagingEvents : stagingEvents;
                  const groupedEvents: Record<number, typeof events> = {};
                  
                  events.forEach(event => {
                    if (!groupedEvents[event.hour]) {
                      groupedEvents[event.hour] = [];
                    }
                    groupedEvents[event.hour].push(event);
                  });
                  
                  // Sort hours and render grouped events
                  return Object.keys(groupedEvents)
                    .map(hour => parseInt(hour))
                    .sort((a, b) => a - b)
                    .map(hour => {
                      const hourEvents = groupedEvents[hour];
                      const addEvents = hourEvents.filter(e => e.action === 'add');
                      const removeEvents = hourEvents.filter(e => e.action === 'remove');
                      
                      return (
                        <div key={hour} className="flex items-center gap-2 text-gray-400 text-sm">
                          <Clock className="w-3 h-3" />
                          <span>{hour.toString().padStart(2, '0')}:00</span>
                          
                          {/* Add events - only show if there are chillers to add */}
                          {addEvents.length > 0 && addEvents.some(e => e.chiller && e.chiller.trim()) && (
                            <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">
                              <ArrowUp className="w-3 h-3 inline mr-1" />
                              {addEvents.filter(e => e.chiller && e.chiller.trim()).map(e => e.chiller).join(', ')}
                            </span>
                          )}
                          
                          {/* Remove events - only show if there are chillers to remove */}
                          {removeEvents.length > 0 && removeEvents.some(e => e.chiller && e.chiller.trim()) && (
                            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">
                              <ArrowDown className="w-3 h-3 inline mr-1" />
                              {removeEvents.filter(e => e.chiller && e.chiller.trim()).map(e => e.chiller).join(', ')}
                            </span>
                          )}
                          
                          <span className="text-gray-500">→ {normalizeCombinationName(hourEvents[0].combination)}</span>
                          <span className="text-gray-600">({(hourEvents[0].load || 0).toFixed(0)} kW)</span>
                          <span className="text-xs text-gray-500 ml-2">{hourEvents[0].reason}</span>
                        </div>
                      );
                    });
                })()
              ) : (
                <div className="text-gray-500 italic">No staging events - static operation</div>
              )}
            </div>
          </div>
          
          {/* Simple Hourly Combinations */}
          <div className="flex-1 min-h-0">
            <div className="text-gray-300 font-medium mb-2">Hourly Chiller Combinations</div>
            <div className="bg-gray-800/30 rounded-lg border border-gray-700/30 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Hour</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Combination</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Action</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Load (kW)</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Capacity (kW)</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">COP</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Power (kW)</th>
                      <th className="px-3 py-2 text-left text-gray-300 font-medium">Utilization</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {(selectedPriorityResult ? selectedPriorityResult.hourlyCombinations : hourlyCombinations).map((combo, index) => {
                      const utilization = ((combo.load || 0) / (combo.capacity || 1) * 100);
                      const utilizationColor = utilization > 90 ? 'text-red-400' : 
                                             utilization > 80 ? 'text-yellow-400' : 
                                             utilization > 60 ? 'text-green-400' : 'text-gray-400';
                      // Determine action compared to previous hour
                      let action = '';
                      if (index > 0) {
                        const currentCombos = selectedPriorityResult ? selectedPriorityResult.hourlyCombinations : hourlyCombinations;
                        const prev = currentCombos[index - 1];
                        const prevChillers = prev.combination ? prev.combination.split('+') : [];
                        const currChillers = combo.combination ? combo.combination.split('+') : [];
                        const added = currChillers.filter(c => !prevChillers.includes(c));
                        const removed = prevChillers.filter(c => !currChillers.includes(c));
                        if (added.length > 0) action = '+' + added.join(',+');
                        else if (removed.length > 0) action = '-' + removed.join(',-');
                      }
                      // Calculate power consumption (load / COP)
                      const powerConsumption = (combo.load || 0) / (combo.cop || 1);
                      
                      return (
                        <tr key={index} className="hover:bg-gray-700/30">
                          <td className="px-3 py-2 text-gray-300 font-medium">
                            {(combo.hour || 0).toString().padStart(2, '0')}:00
                          </td>
                          <td className="px-3 py-2 text-white font-medium">
                            {combo.combination ? normalizeCombinationName(combo.combination) : 'None'}
                          </td>
                          <td className="px-3 py-2 text-gray-400 font-bold">
                            {action}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {(combo.load || 0).toFixed(0)}
                          </td>
                          <td className="px-3 py-2 text-gray-300">
                            {(combo.capacity || 0).toFixed(0)}
                          </td>
                          <td className="px-3 py-2 text-green-400 font-medium">
                            {(combo.cop || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-yellow-400 font-medium">
                            {powerConsumption.toFixed(0)}
                          </td>
                          <td className={`px-3 py-2 font-medium ${utilizationColor}`}>
                            {utilization.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400 italic text-center">
            Please select a priority order from the ranking on the right to view details.
          </div>
        </div>
      )}
    </div>
  );
} 
