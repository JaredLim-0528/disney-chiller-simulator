import React from 'react';
import { Activity, Info, Table, LineChart, Check, Power } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ChillerStats } from '../types';
import { getComputedStyle } from '../utils/colors';
import dualChillerCopCsv from '../data/chiller-cop-csv/dual-chiller-cop.csv?raw';
import tripleChillerCopCsv from '../data/chiller-cop-csv/triple-chiller-cop.csv?raw';
import quadChillerCopCsv from '../data/chiller-cop-csv/quad-chiller-cop.csv?raw';
import pentaChillerCopCsv from '../data/chiller-cop-csv/penta-chiller-cop.csv?raw';
import hexaChillerCopCsv from '../data/chiller-cop-csv/hexa-chiller-cop.csv?raw';
import septaChillerCopCsv from '../data/chiller-cop-csv/septa-chiller-cop.csv?raw';
import primaryPumpPowerCsv from '../data/primary-pump-power.csv?raw';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Tick,
  LegendItem,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import chillerCopCsv from '../data/chiller-cop-csv/chiller-cop.csv?raw';
import chillerConfigCsv from '../data/chiller-config.csv?raw';
import { ChillerConfigCard } from '../components/ChillerConfigCard';
import { CoolingLoadProfile } from '../components/CoolingLoadProfile';
import { SequencingSimulation } from '../components/SequencingSimulation';
import { StagingPathAnalysis } from '../components/StagingPathAnalysis';
import { ManuallyDefinedSequence } from '../components/ManuallyDefinedSequence';
import { PriorityOrderRanking } from '../components/PriorityOrderRanking';
import { loadCoolingLoadProfile } from '../data/cooling-load-profile';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CHILLER_COLORS = {
  // Single chiller base color - light blue
  CH01: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' },   // Light Blue
  CH02: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' },   // Light Blue
  CH03: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' },   // Light Blue
  CH04: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' },   // Light Blue
  CH05: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' },   // Light Blue
  CH06: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' },   // Light Blue
  CH07: { color: 'rgb(14, 165, 233)', gradient: 'rgba(14, 165, 233, 0.2)' }    // Light Blue
};

// Color ranges for different combination types
const COMBINATION_COLORS = {
  single: {
    base: 'rgb(14, 165, 233)',    // Light Blue (previously Red)
    gradient: 'rgba(14, 165, 233, 0.2)',
    button: 'bg-sky-500/20 text-sky-400 border-sky-500/30'
  },
  dual: {
    base: 'rgb(34, 197, 94)',    // Green
    gradient: 'rgba(34, 197, 94, 0.2)',
    button: 'bg-green-500/20 text-green-400 border-green-500/30'
  },
  triple: {
    base: 'rgb(59, 130, 246)',   // Blue
    gradient: 'rgba(59, 130, 246, 0.2)',
    button: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  },
  quad: {
    base: 'rgb(168, 85, 247)',   // Purple
    gradient: 'rgba(168, 85, 247, 0.2)',
    button: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
  },
  penta: {
    base: 'rgb(234, 179, 8)',    // Yellow
    gradient: 'rgba(234, 179, 8, 0.2)',
    button: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  },
  hexa: {
    base: 'rgb(236, 72, 153)',   // Pink
    gradient: 'rgba(236, 72, 153, 0.2)',
    button: 'bg-pink-500/20 text-pink-400 border-pink-500/30'
  },
  septa: {
    base: 'rgb(239, 68, 68)',    // Red (previously Light Blue)
    gradient: 'rgba(239, 68, 68, 0.2)',
    button: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
};

interface ChillerConfig {
  Chiller: string;
  'Capacity (TR)': number;
  Type: string;
}

interface PriorityOrderResult {
  priorityOrder: Array<{ chiller: string; priority: number }>;
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

function parseCSV(csv: string) {
  const lines = csv.trim().split('\n');
  // Filter out empty headers after trimming
  const headers = lines[0].split(',')
    .map(header => header.trim())
    .filter(header => header !== '');
    
  const data = lines.slice(1).map(line => {
    const values = line.split(',').map(value => value.trim());
    return headers.reduce((obj, header, index) => {
      // Only try to parse as float if it's the Capacity column
      obj[header] = header === 'Capacity (TR)'
        ? parseFloat(values[index])
        : values[index];
      return obj;
    }, {} as Record<string, string | number | null>);
  });
  return { headers, data };
}

// Helper function to get COP value for a specific load percentage
function getCopForLoad(
  chillerData: Record<string, number | null>[],
  chiller: string,
  capacity: number,
  loadPercentage: number
): number {
  const targetLoad = capacity * loadPercentage;
  let closestCop = 0;
  let minDiff = Infinity;

  chillerData.forEach(row => {
    const kW = row.kW as number;
    const cop = row[chiller] as number;
    if (cop !== null) {
      const diff = Math.abs(kW - targetLoad);
      if (diff < minDiff) {
        minDiff = diff;
        closestCop = cop;
      }
    }
  });

  return closestCop;
}

// Function to get total pump power for a chiller combination
function getTotalPumpPower(chillerCombination: string, pumpPowerData: Record<string, number>): number {
  if (!chillerCombination.includes('+')) {
    // Single chiller
    const chillerNum = chillerCombination.replace('CH', '');
    return pumpPowerData[`PCH${chillerNum.padStart(2, '0')}`] || 0;
  }
  
  // Multiple chillers
  return chillerCombination.split('+')
    .map(ch => ch.trim())
    .reduce((total, chiller) => {
      const chillerNum = chiller.replace('CH', '');
      return total + (pumpPowerData[`PCH${chillerNum.padStart(2, '0')}`] || 0);
    }, 0);
}

type ViewMode = 'single' | 'dual' | 'triple' | 'quad' | 'penta' | 'hexa' | 'septa';

export function Simulation() {
  const [chartData, setChartData] = useState<any>(null);
  const [dualChartData, setDualChartData] = useState<any>(null);
  const [tripleChartData, setTripleChartData] = useState<any>(null);
  const [quadChartData, setQuadChartData] = useState<any>(null);
  const [pentaChartData, setPentaChartData] = useState<any>(null);
  const [hexaChartData, setHexaChartData] = useState<any>(null);
  const [septaChartData, setSeptaChartData] = useState<any>(null);
  const [showTable, setShowTable] = useState(false);
  const [selectedModes, setSelectedModes] = useState<Set<ViewMode>>(new Set(['single']));
  const [chillerConfigs, setChillerConfigs] = useState<ChillerConfig[]>([]);
  const [parsedData, setParsedData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [parsedDualData, setParsedDualData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [parsedTripleData, setParsedTripleData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [parsedQuadData, setParsedQuadData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [parsedPentaData, setParsedPentaData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [parsedHexaData, setParsedHexaData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [parsedSeptaData, setParsedSeptaData] = useState<{ headers: string[], data: Record<string, string | number | null>[] } | null>(null);
  const [chillerStats, setChillerStats] = useState<Record<string, ChillerStats>>({});
  const [selectedChillers, setSelectedChillers] = useState<Set<string>>(new Set(['CH01', 'CH02', 'CH03', 'CH04', 'CH05', 'CH06', 'CH07']));
  const [selectedCombinations, setSelectedCombinations] = useState<Set<string>>(new Set(['CH01+CH02', 'CH01+CH03']));
  const [selectedTripleCombinations, setSelectedTripleCombinations] = useState<Set<string>>(new Set(['CH01+CH02+CH03', 'CH01+CH02+CH04']));
  const [selectedQuadCombinations, setSelectedQuadCombinations] = useState<Set<string>>(new Set(['CH01+CH02+CH03+CH04', 'CH01+CH02+CH03+CH05']));
  const [selectedPentaCombinations, setSelectedPentaCombinations] = useState<Set<string>>(new Set(['CH01+CH02+CH03+CH04+CH05']));
  const [selectedHexaCombinations, setSelectedHexaCombinations] = useState<Set<string>>(new Set(['CH01+CH02+CH03+CH04+CH05+CH06']));
  const [selectedSeptaCombinations, setSelectedSeptaCombinations] = useState<Set<string>>(new Set(['CH01+CH02+CH03+CH04+CH05+CH06+CH07']));
  const [stagingReview, setStagingReview] = useState(false);
  const [selectedStagingChillers, setSelectedStagingChillers] = useState<Set<string>>(new Set());
  const [stageUpCombinations, setStageUpCombinations] = useState<string[]>([]);
  const [stageDownCombinations, setStageDownCombinations] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [primaryPumpEnabled, setPrimaryPumpEnabled] = useState(false);
  const [pumpPower, setPumpPower] = useState<Record<string, number>>({});
  const [selectedPriorityResult, setSelectedPriorityResult] = useState<PriorityOrderResult | null>(null);
  const [secondaryPumpEnabled, setSecondaryPumpEnabled] = useState(false);
  const [coolingTowerEnabled, setCoolingTowerEnabled] = useState(false);
  const [condensingPumpEnabled, setCondensingPumpEnabled] = useState(false);
  const [showStagingAnalysis, setShowStagingAnalysis] = useState(false);
  const [coolingLoadProfile, setCoolingLoadProfile] = useState<Array<{hour: number, load: number}>>([]);
  const [selectedMonth, setSelectedMonth] = useState('jul'); // Default to July

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        title: {
          display: true,
          text: 'Cooling Load (kW)',
          color: '#9CA3AF'
        },
        type: 'linear' as const,
        min: 0,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        ticks: {
          color: '#9CA3AF',
          stepSize: 1000,
          callback: function(tickValue: string | number, _index: number, _ticks: Tick[]) {
            return Number(tickValue).toLocaleString();
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'COP',
          color: '#9CA3AF'
        },
        grid: {
          color: 'rgba(75, 85, 99, 0.2)'
        },
        min: 0,
        max: 12,
        ticks: {
          color: '#9CA3AF',
          stepSize: 1,
          callback: function(tickValue: string | number, _index: number, _ticks: Tick[]) {
            return Math.round(Number(tickValue));
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#9CA3AF',
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 12
          },
          sort: (a: LegendItem, b: LegendItem, data: ChartData) => {
            // Count the number of chillers in each combination
            const aChillerCount = a.text.includes('+') ? a.text.split('+').length : 1;
            const bChillerCount = b.text.includes('+') ? b.text.split('+').length : 1;
            
            // First sort by number of chillers (fewer first)
            if (aChillerCount !== bChillerCount) {
              return aChillerCount - bChillerCount;
            }
            
            // Then sort alphabetically within the same chiller count group
            return a.text.localeCompare(b.text);
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        itemSort: (a: any, b: any) => b.raw.y - a.raw.y,
        callbacks: {
          title: function(context: any) {
            return `Cooling Load: ${context[0].raw.x.toLocaleString()} kW`;
          },
          label: function(context: any) {
            // Find the sorted order for this item
            const sorted = [...context.chart.tooltip.dataPoints].sort((a: any, b: any) => b.raw.y - a.raw.y);
            const rank = sorted.findIndex((item: any) => item.datasetIndex === context.datasetIndex) + 1;
            const label = context.dataset.label || '';
            const value = context.raw.y;
            return `${rank}. ${label}: ${value.toFixed(2)} COP`;
          }
        },
        backgroundColor: 'rgba(17, 24, 39, 0.8)',
        titleColor: '#F3F4F6',
        bodyColor: '#D1D5DB',
        borderColor: 'rgba(107, 114, 128, 0.2)',
        borderWidth: 1,
        padding: 12,
        bodySpacing: 6,
        titleSpacing: 8,
        cornerRadius: 6,
        boxPadding: 4
      }
    }
  };

  // Function to generate stage down combinations (remove one chiller)
  const generateStageDownCombinations = (chillers: string[]): string[] => {
    if (chillers.length <= 1) return [];
    
    return chillers.map((_, idx, arr) => {
      const combination = [...arr];
      combination.splice(idx, 1);
      return combination.join('+');
    });
  };

  // Function to generate stage up combinations (add one chiller)
  const generateStageUpCombinations = (chillers: string[], allChillers: string[]): string[] => {
    if (chillers.length >= allChillers.length) return [];
    
    return allChillers
      .filter(chiller => !chillers.includes(chiller))
      .map(chiller => {
        const newCombination = [...chillers, chiller].sort();
        return newCombination.join('+');
      });
  };

  // Update selected combinations based on staging selections
  useEffect(() => {
    if (!stagingReview || selectedStagingChillers.size === 0) return;
    
    const chillerArray = Array.from(selectedStagingChillers).sort();
    const allChillers = chillerConfigs.map(config => config.Chiller);
    
    // Generate stage up and stage down combinations
    const downCombinations = generateStageDownCombinations(chillerArray);
    const upCombinations = generateStageUpCombinations(chillerArray, allChillers);
    
    setStageDownCombinations(downCombinations);
    setStageUpCombinations(upCombinations);
    
    // Automatically select appropriate modes and combinations
    const currentCombination = chillerArray.join('+');
    
    if (chillerArray.length === 1) {
      // Single chiller
      setSelectedModes(new Set(['single']));
      setSelectedChillers(new Set(chillerArray));
    } else if (chillerArray.length === 2) {
      // Dual chillers
      setSelectedModes(new Set(['single', 'dual']));
      setSelectedChillers(new Set(chillerArray));
      setSelectedCombinations(new Set([currentCombination]));
    } else if (chillerArray.length === 3) {
      // Triple chillers
      setSelectedModes(new Set(['dual', 'triple']));
      setSelectedCombinations(new Set(downCombinations));
      setSelectedTripleCombinations(new Set([currentCombination]));
    } else if (chillerArray.length === 4) {
      // Quad chillers
      setSelectedModes(new Set(['triple', 'quad']));
      setSelectedTripleCombinations(new Set(downCombinations));
      setSelectedQuadCombinations(new Set([currentCombination]));
    } else if (chillerArray.length === 5) {
      // Penta chillers
      setSelectedModes(new Set(['quad', 'penta']));
      setSelectedQuadCombinations(new Set(downCombinations));
      setSelectedPentaCombinations(new Set([currentCombination]));
    } else if (chillerArray.length === 6) {
      // Hexa chillers
      setSelectedModes(new Set(['penta', 'hexa']));
      setSelectedPentaCombinations(new Set(downCombinations));
      setSelectedHexaCombinations(new Set([currentCombination]));
    } else if (chillerArray.length === 7) {
      // Septa chillers
      setSelectedModes(new Set(['hexa', 'septa']));
      setSelectedHexaCombinations(new Set(downCombinations));
      setSelectedSeptaCombinations(new Set([currentCombination]));
    }
    
    // For stage up combinations
    if (chillerArray.length === 1) {
      // Stage up from single to dual
      setSelectedModes(prev => new Set([...prev, 'dual']));
      setSelectedCombinations(new Set(upCombinations));
    } else if (chillerArray.length === 2) {
      // Stage up from dual to triple
      setSelectedModes(prev => new Set([...prev, 'triple']));
      setSelectedTripleCombinations(new Set(upCombinations));
    } else if (chillerArray.length === 3) {
      // Stage up from triple to quad
      setSelectedModes(prev => new Set([...prev, 'quad']));
      setSelectedQuadCombinations(new Set(upCombinations));
    } else if (chillerArray.length === 4) {
      // Stage up from quad to penta
      setSelectedModes(prev => new Set([...prev, 'penta']));
      setSelectedPentaCombinations(new Set(upCombinations));
    } else if (chillerArray.length === 5) {
      // Stage up from penta to hexa
      setSelectedModes(prev => new Set([...prev, 'hexa']));
      setSelectedHexaCombinations(new Set(upCombinations));
    } else if (chillerArray.length === 6) {
      // Stage up from hexa to septa
      setSelectedModes(prev => new Set([...prev, 'septa']));
      setSelectedSeptaCombinations(new Set(upCombinations));
    }
    
  }, [selectedStagingChillers, stagingReview, chillerConfigs]);

  const handleChillerStageToggle = (chiller: string) => {
    setSelectedStagingChillers(prev => {
      const next = new Set(prev);
      if (next.has(chiller)) {
        next.delete(chiller);
      } else {
        next.add(chiller);
      }
      return next;
    });
  };

  const handleModeToggle = (mode: ViewMode) => {
    setSelectedModes(prev => {
      const next = new Set(prev);
      if (next.has(mode)) {
        if (next.size > 1) {
          next.delete(mode);
        }
      } else {
        next.add(mode);
        // Automatically select at least one combination for the new mode
        switch (mode) {
          case 'single':
            if (selectedChillers.size === 0) {
              setSelectedChillers(new Set([chillerConfigs[0].Chiller]));
            }
            break;
          case 'dual':
            if (selectedCombinations.size === 0) {
              const firstDualCombo = getValidChillerCombinations()[0];
              if (firstDualCombo) {
                setSelectedCombinations(new Set([firstDualCombo]));
              }
            }
            break;
          case 'triple':
            if (selectedTripleCombinations.size === 0) {
              const firstTripleCombo = getValidTripleChillerCombinations()[0];
              if (firstTripleCombo) {
                setSelectedTripleCombinations(new Set([firstTripleCombo]));
              }
            }
            break;
          case 'quad':
            if (selectedQuadCombinations.size === 0) {
              const firstQuadCombo = getValidQuadChillerCombinations()[0];
              if (firstQuadCombo) {
                setSelectedQuadCombinations(new Set([firstQuadCombo]));
              }
            }
            break;
          case 'penta':
            if (selectedPentaCombinations.size === 0) {
              const firstPentaCombo = getValidPentaChillerCombinations()[0];
              if (firstPentaCombo) {
                setSelectedPentaCombinations(new Set([firstPentaCombo]));
              }
            }
            break;
          case 'hexa':
            if (selectedHexaCombinations.size === 0) {
              const firstHexaCombo = getValidHexaChillerCombinations()[0];
              if (firstHexaCombo) {
                setSelectedHexaCombinations(new Set([firstHexaCombo]));
              }
            }
            break;
          case 'septa':
            if (selectedSeptaCombinations.size === 0) {
              const firstSeptaCombo = getValidSeptaChillerCombinations()[0];
              if (firstSeptaCombo) {
                setSelectedSeptaCombinations(new Set([firstSeptaCombo]));
              }
            }
            break;
        }
      }
      return next;
    });
  };

  // Function to load monthly cooling load data
  const loadMonthlyData = async (month: string) => {
    try {
      const response = await fetch(`/data/monthly_cooling_loads/${month}_cooling_load.csv`);
      if (!response.ok) {
        throw new Error(`Failed to load ${month} cooling load data`);
      }
      
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const dataLines = lines.slice(1); // Skip header
      
      const parsedData: Array<{hour: number, load: number}> = dataLines.map((line, index) => {
        const [time, load] = line.split(',');
        return {
          hour: index, // Use index as hour (0-23)
          load: parseFloat(load)
        };
      });
      
      setCoolingLoadProfile(parsedData);
    } catch (err) {
      console.error(`Error loading monthly data for ${month}:`, err);
      // Fallback to original cooling load profile
      const profile = await loadCoolingLoadProfile();
      setCoolingLoadProfile(profile);
    }
  };

  // Function to handle month selection change from CoolingLoadProfile component
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    loadMonthlyData(month);
  };

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Load initial monthly cooling load profile
        await loadMonthlyData(selectedMonth);
        
        const parsedCopData = parseCSV(chillerCopCsv);
        const parsedDualCopData = parseCSV(dualChillerCopCsv);
        const parsedTripleCopData = parseCSV(tripleChillerCopCsv);
        const parsedQuadCopData = parseCSV(quadChillerCopCsv);
        const parsedPentaCopData = parseCSV(pentaChillerCopCsv);
        const parsedHexaCopData = parseCSV(hexaChillerCopCsv);
        const parsedSeptaCopData = parseCSV(septaChillerCopCsv);
        const configData = parseCSV(chillerConfigCsv);
        const pumpPowerData = parseCSV(primaryPumpPowerCsv);
        
        if (parsedCopData && parsedDualCopData && parsedTripleCopData && 
            parsedQuadCopData && parsedPentaCopData && parsedHexaCopData && 
            parsedSeptaCopData && configData && pumpPowerData) {
            
          // Convert pump power data to object
          const pumpPowerObj: Record<string, number> = {};
          pumpPowerData.data.forEach(row => {
            const pumpName = row.Pump as string;
            const powerValue = Number(row['Power (kW)']);
            if (!isNaN(powerValue)) {
              pumpPowerObj[pumpName] = powerValue;
            }
          });
          setPumpPower(pumpPowerObj);

          // Calculate stats for each chiller
          const stats = (configData.data as unknown as ChillerConfig[]).reduce((acc, config) => {
            const chillerData = parsedCopData.data
              .map(row => Number(row[config.Chiller]))
              .filter((value): value is number => value !== null && !isNaN(value));
            const maxCop = Math.max(...chillerData);          
            
            acc[config.Chiller] = {
              maxCop
            };
            return acc;
          }, {} as Record<string, ChillerStats>);

          setChillerStats(stats);
          setParsedData(parsedCopData);
          setParsedDualData(parsedDualCopData);
          setParsedTripleData(parsedTripleCopData);
          setParsedQuadData(parsedQuadCopData);
          setParsedPentaData(parsedPentaCopData);
          setParsedHexaData(parsedHexaCopData);
          setParsedSeptaData(parsedSeptaCopData);
          setChillerConfigs(configData.data as unknown as ChillerConfig[]);
        }
      } catch (error) {
        console.error('Error parsing CSV data:', error);
      }
    };

    loadAllData();
  }, []); // Initial data loading

  // Update chart data when pump toggle changes
  useEffect(() => {
    if (parsedData && parsedDualData && parsedTripleData && 
        parsedQuadData && parsedPentaData && parsedHexaData && 
        parsedSeptaData) {
      const preparedData = prepareChartData(parsedData);
      const preparedDualData = prepareChartData(parsedDualData);
      const preparedTripleData = prepareChartData(parsedTripleData);
      const preparedQuadData = prepareChartData(parsedQuadData);
      const preparedPentaData = prepareChartData(parsedPentaData);
      const preparedHexaData = prepareChartData(parsedHexaData);
      const preparedSeptaData = prepareChartData(parsedSeptaData);
      
      setChartData(preparedData);
      setDualChartData(preparedDualData);
      setTripleChartData(preparedTripleData);
      setQuadChartData(preparedQuadData);
      setPentaChartData(preparedPentaData);
      setHexaChartData(preparedHexaData);
      setSeptaChartData(preparedSeptaData);
    }
  }, [primaryPumpEnabled, parsedData, parsedDualData, parsedTripleData, parsedQuadData, parsedPentaData, parsedHexaData, parsedSeptaData]);

  const toggleView = () => {
    setShowTable(!showTable);
  };

  const handleChillerToggle = (chiller: string) => {
    setSelectedChillers(prev => {
      const next = new Set(prev);
      if (next.has(chiller) && next.size > 1) {
        next.delete(chiller);
      } else {
        next.add(chiller);
      }
      return next;
    });
  };

  const handleCombinationToggle = (combination: string) => {
    setSelectedCombinations(prev => {
      const next = new Set(prev);
      if (next.has(combination) && next.size > 1) {
        next.delete(combination);
      } else {
        next.add(combination);
      }
      return next;
    });
  };

  const handleTripleCombinationToggle = (combination: string) => {
    setSelectedTripleCombinations(prev => {
      const next = new Set(prev);
      if (next.has(combination) && next.size > 1) {
        next.delete(combination);
      } else {
        next.add(combination);
      }
      return next;
    });
  };

  const handleQuadCombinationToggle = (combination: string) => {
    setSelectedQuadCombinations(prev => {
      const next = new Set(prev);
      if (next.has(combination) && next.size > 1) {
        next.delete(combination);
      } else {
        next.add(combination);
      }
      return next;
    });
  };

  const handleViewModeChange = (mode: 'single' | 'dual' | 'triple' | 'quad' | 'penta' | 'hexa' | 'septa') => {
    setViewMode(mode);
  };

  const handleSelectAll = () => {
    const isAnyModeFullySelected = Array.from(selectedModes).some(mode => {
      const allItems = mode === 'single' ? chillerConfigs.map(config => config.Chiller) :
                      mode === 'dual' ? getValidChillerCombinations() :
                      mode === 'triple' ? getValidTripleChillerCombinations() :
                      mode === 'quad' ? getValidQuadChillerCombinations() :
                      mode === 'penta' ? getValidPentaChillerCombinations() :
                      mode === 'hexa' ? getValidHexaChillerCombinations() :
                      getValidSeptaChillerCombinations();
      const currentSelection = mode === 'single' ? selectedChillers :
                             mode === 'dual' ? selectedCombinations :
                             mode === 'triple' ? selectedTripleCombinations :
                             mode === 'quad' ? selectedQuadCombinations :
                             mode === 'penta' ? selectedPentaCombinations :
                             mode === 'hexa' ? selectedHexaCombinations :
                             selectedSeptaCombinations;
      return allItems.every(item => currentSelection.has(item));
    });

    // If any mode is fully selected, deselect all. Otherwise, select all.
    selectedModes.forEach(mode => {
      switch (mode) {
        case 'single':
          const allChillers = chillerConfigs.map(config => config.Chiller);
          setSelectedChillers(new Set(isAnyModeFullySelected ? [allChillers[0]] : allChillers));
          break;
        case 'dual':
          const dualCombos = getValidChillerCombinations();
          setSelectedCombinations(new Set(isAnyModeFullySelected ? [dualCombos[0]] : dualCombos));
          break;
        case 'triple':
          const tripleCombos = getValidTripleChillerCombinations();
          setSelectedTripleCombinations(new Set(isAnyModeFullySelected ? [tripleCombos[0]] : tripleCombos));
          break;
        case 'quad':
          const quadCombos = getValidQuadChillerCombinations();
          setSelectedQuadCombinations(new Set(isAnyModeFullySelected ? [quadCombos[0]] : quadCombos));
          break;
        case 'penta':
          const pentaCombos = getValidPentaChillerCombinations();
          setSelectedPentaCombinations(new Set(isAnyModeFullySelected ? [pentaCombos[0]] : pentaCombos));
          break;
        case 'hexa':
          const hexaCombos = getValidHexaChillerCombinations();
          setSelectedHexaCombinations(new Set(isAnyModeFullySelected ? [hexaCombos[0]] : hexaCombos));
          break;
        case 'septa':
          const septaCombos = getValidSeptaChillerCombinations();
          setSelectedSeptaCombinations(new Set(isAnyModeFullySelected ? [septaCombos[0]] : septaCombos));
          break;
      }
    });
  };

  const getValidChillerCombinations = () => {
    if (!parsedDualData) return [];
    return parsedDualData.headers
      .slice(1)
      .filter(header => header.includes('+'));
  };

  const getValidTripleChillerCombinations = () => {
    if (!parsedTripleData) return [];
    return parsedTripleData.headers
      .slice(1)
      .filter(header => header.includes('+') && header.split('+').length === 3);
  };

  const getValidQuadChillerCombinations = () => {
    if (!parsedQuadData) return [];
    return parsedQuadData.headers
      .slice(1)
      .filter(header => header.includes('+') && header.split('+').length === 4);
  };

  const getValidPentaChillerCombinations = () => {
    if (!parsedPentaData) return [];
    return parsedPentaData.headers
      .slice(1).filter(header => header.includes('+') && header.split('+').length === 5);
  };

  const getValidHexaChillerCombinations = () => {
    if (!parsedHexaData) return [];
    return parsedHexaData.headers
      .slice(1).filter(header => header.includes('+') && header.split('+').length === 6);
  };

  const getValidSeptaChillerCombinations = () => {
    if (!parsedSeptaData) return [];
    return parsedSeptaData.headers
      .slice(1).filter(header => header.includes('+') && header.split('+').length === 7);
  };

  const handleHexaCombinationToggle = (combination: string) => {
    setSelectedHexaCombinations(prev => {
      const next = new Set(prev);
      if (next.has(combination) && next.size > 1) {
        next.delete(combination);
      } else {
        next.add(combination);
      }
      return next;
    });
  };

  const handlePentaCombinationToggle = (combination: string) => {
    setSelectedPentaCombinations(prev => {
      const next = new Set(prev);
      if (next.has(combination) && next.size > 1) {
        next.delete(combination);
      } else {
        next.add(combination);
      }
      return next;
    });
  };

  const handleSeptaCombinationToggle = (combination: string) => {
    setSelectedSeptaCombinations(prev => {
      const next = new Set(prev);
      if (next.has(combination) && next.size > 1) {
        next.delete(combination);
      } else {
        next.add(combination);
      }
      return next;
    });
  };

  const filteredChartData = React.useMemo(() => {
    if (!chartData || !dualChartData || !tripleChartData || !quadChartData || !pentaChartData || !hexaChartData || !septaChartData) return null;
    
    // Combine datasets from all selected modes
    const combinedDatasets: any[] = [];
    
    if (selectedModes.has('single')) {
      combinedDatasets.push(...chartData.datasets.filter((dataset: any) => selectedChillers.has(dataset.label)));
    }
    if (selectedModes.has('dual')) {
      combinedDatasets.push(...dualChartData.datasets.filter((dataset: any) => selectedCombinations.has(dataset.label)));
    }
    if (selectedModes.has('triple')) {
      combinedDatasets.push(...tripleChartData.datasets.filter((dataset: any) => selectedTripleCombinations.has(dataset.label)));
    }
    if (selectedModes.has('quad')) {
      combinedDatasets.push(...quadChartData.datasets.filter((dataset: any) => selectedQuadCombinations.has(dataset.label)));
    }
    if (selectedModes.has('penta')) {
      combinedDatasets.push(...pentaChartData.datasets.filter((dataset: any) => selectedPentaCombinations.has(dataset.label)));
    }
    if (selectedModes.has('hexa')) {
      combinedDatasets.push(...hexaChartData.datasets.filter((dataset: any) => selectedHexaCombinations.has(dataset.label)));
    }
    if (selectedModes.has('septa')) {
      combinedDatasets.push(...septaChartData.datasets.filter((dataset: any) => selectedSeptaCombinations.has(dataset.label)));
    }

    return {
      labels: chartData.labels,
      datasets: combinedDatasets
    };
  }, [chartData, dualChartData, tripleChartData, quadChartData, pentaChartData, hexaChartData, septaChartData, selectedModes, selectedChillers, selectedCombinations, selectedTripleCombinations, selectedQuadCombinations, selectedPentaCombinations, selectedHexaCombinations, selectedSeptaCombinations]);

  // Function to calculate adjusted COP including pump power
  const calculateAdjustedCOP = (coolingLoad: number, originalCOP: number, chillerCombination: string): number => {
    if (!primaryPumpEnabled) return originalCOP;
    const totalPumpPower = getTotalPumpPower(chillerCombination, pumpPower);
    const chillerPower = coolingLoad / originalCOP;
    const totalPower = chillerPower + totalPumpPower;
    return coolingLoad / totalPower;
  };

  const prepareChartData = (csvData: { headers: string[], data: Record<string, string | number | null>[] }) => {
    const { headers, data } = csvData;
    const chillers = headers.slice(1); // Remove 'kW' column
    const colors = chillers.map(chiller => {
      if (chiller.includes('+')) {
        const numChillers = chiller.split('+').length;
        const type = numChillers === 2 ? 'dual' :
                    numChillers === 3 ? 'triple' :
                    numChillers === 4 ? 'quad' :
                    numChillers === 5 ? 'penta' :
                    numChillers === 6 ? 'hexa' :
                    'septa';
        
        // Create more noticeable variations based on the combination
        const baseColor = COMBINATION_COLORS[type].base;
        const [r, g, b] = baseColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
        
        // Calculate a unique offset for each combination
        const combinationHash = chiller.split('+').reduce((acc, ch) => acc + parseInt(ch.replace('CH', '')), 0);
        const offset = (combinationHash % 5) - 2; // Creates -2, -1, 0, 1, or 2
        
        // Apply more noticeable variations to the base color
        const newR = Math.max(0, Math.min(255, r + offset * 25));
        const newG = Math.max(0, Math.min(255, g + offset * 25));
        const newB = Math.max(0, Math.min(255, b + offset * 25));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
      } else {
        // Create variations for single chillers
        const baseColor = CHILLER_COLORS[chiller as keyof typeof CHILLER_COLORS]?.color;
        const [r, g, b] = baseColor.match(/\d+/g)?.map(Number) || [0, 0, 0];
        
        // Calculate offset based on chiller number
        const chillerNum = parseInt(chiller.replace('CH', ''));
        const offset = (chillerNum % 5) - 2; // Creates -2, -1, 0, 1, or 2
        
        // Apply variations to the base color
        const newR = Math.max(0, Math.min(255, r + offset * 25));
        const newG = Math.max(0, Math.min(255, g + offset * 25));
        const newB = Math.max(0, Math.min(255, b + offset * 25));
        
        return `rgb(${newR}, ${newG}, ${newB})`;
      }
    });
    
    return {
      labels: data.map(row => row.kW),
      datasets: chillers.map((chiller, index) => ({
        label: chiller,
        data: data.map(row => ({
          x: row.kW,
          y: calculateAdjustedCOP(Number(row.kW), Number(row[chiller]), chiller),
        })),
        borderColor: colors[index],
        tension: 0.1,
        pointStyle: 'circle',
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: colors[index],
        pointBorderColor: colors[index]
      }))
    };
  };

  // Function to convert CSV data to the correct type
  const convertCopData = (data: Record<string, string | number | null>[]): Record<string, number | null>[] => {
    return data.map(row => {
      const convertedRow: Record<string, number | null> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (key === 'kW') {
          convertedRow[key] = Number(value);
        } else {
          convertedRow[key] = value === null ? null : Number(value);
        }
      });
      return convertedRow;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900">
      <div className="max-w-[95%] mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-purple-400 mr-3" />
            <h1 className="text-2xl font-bold text-white">
              Chiller Plant Staging Analysis
            </h1>
          </div>
        </div>
        
        <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
          <div className="grid grid-cols-7 gap-4 w-full">
            {chillerConfigs.map(config => (
              <ChillerConfigCard
                key={config.Chiller}
                config={config}
                maxCop={chillerStats[config.Chiller]?.maxCop || 0}
              />
            ))}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
          <div className="mb-6">
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-800/30 rounded-xl p-6 border border-gray-700/50">
              <div className="flex flex-col gap-4">
                <div className="text-sm text-gray-400">
                  Click the toggle button to enable staging review mode. Then select chillers to see possible stage up and stage down combinations. Hover over the info icon for detailed options.
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200 font-medium">Staging Review</span>
                    <button
                      onClick={() => setStagingReview(!stagingReview)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                        stagingReview ? 'bg-purple-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          stagingReview ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div className="relative group">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                      <div className="absolute left-0 mt-2 w-[600px] bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <div className="space-y-4">
                          {!stagingReview ? (
                            <div className="text-sm text-gray-400">
                              Enable staging review mode to see chiller combinations and staging options.
                            </div>
                          ) : selectedStagingChillers.size > 0 ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <span className="font-medium">Selected Configuration:</span>
                                <span className="text-purple-400 font-medium">{Array.from(selectedStagingChillers).sort().join(' + ')}</span>
                              </div>
                              
                              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="text-sm font-medium text-gray-300 mb-3">Stage Down Options</div>
                                {selectedStagingChillers.size > 1 ? (
                                  <div className="grid grid-cols-3 gap-2">
                                    {stageDownCombinations.map((combination, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/50"
                                      >
                                        <div className="text-sm text-gray-400 break-words">
                                          {combination}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400">
                                    Select at least 2 chillers to see stage down options.
                                  </div>
                                )}
                              </div>
                              
                              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
                                <div className="text-sm font-medium text-gray-300 mb-3">Stage Up Options</div>
                                {selectedStagingChillers.size > 0 && selectedStagingChillers.size < 7 ? (
                                  <div className="grid grid-cols-3 gap-2">
                                    {stageUpCombinations.map((combination, idx) => (
                                      <div key={idx} className="bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700/50">
                                        <div className="text-sm text-gray-400 break-words">
                                          {combination}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400">
                                    {selectedStagingChillers.size === 0 
                                      ? "Select at least one chiller to see stage up options."
                                      : "Maximum number of chillers reached. No stage up options available."}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">
                              No chillers selected. Please select at least one chiller to see staging options.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {stagingReview && (
                    <div className="flex gap-2">
                      {chillerConfigs.map(config => (
                        <button
                          key={config.Chiller}
                          onClick={() => handleChillerStageToggle(config.Chiller)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            selectedStagingChillers.has(config.Chiller)
                              ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                              : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Power className={`w-3 h-3 ${selectedStagingChillers.has(config.Chiller) ? 'text-purple-400' : 'text-gray-600'}`} />
                            {config.Chiller}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              {showTable && (
                <button
                  onClick={toggleView}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30 transition-all duration-200 hover:scale-105"
                >
                  <LineChart className="w-4 h-4 text-purple-300" />
                  <span className="text-purple-300 text-sm font-semibold">Show Staging Analysis</span>
                </button>
              )}
            </div>
            {!showTable && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-gray-200 font-medium">Primary Chilled Water Pump</span>
                  <button
                    onClick={() => setPrimaryPumpEnabled(!primaryPumpEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                      primaryPumpEnabled ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        primaryPumpEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="text-sm text-gray-400">
                        Toggle the primary chilled water pump. When enabled, the pump will circulate chilled water through the system.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-200 font-medium">Secondary Chilled Water Pump</span>
                  <button
                    onClick={() => setSecondaryPumpEnabled(!secondaryPumpEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                      secondaryPumpEnabled ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        secondaryPumpEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="text-sm text-gray-400">
                        Toggle the secondary chilled water pump. When enabled, the pump will circulate chilled water through the secondary loop.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-200 font-medium">Cooling Tower</span>
                  <button
                    onClick={() => setCoolingTowerEnabled(!coolingTowerEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                      coolingTowerEnabled ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        coolingTowerEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="text-sm text-gray-400">
                        Toggle the cooling tower. When enabled, the cooling tower will reject heat from the condenser water loop.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-200 font-medium">Condensing Water Pump</span>
                  <button
                    onClick={() => setCondensingPumpEnabled(!condensingPumpEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out ${
                      condensingPumpEnabled ? 'bg-purple-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        condensingPumpEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="relative group">
                    <Info className="w-4 h-4 text-gray-400 cursor-help" />
                    <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                      <div className="text-sm text-gray-400">
                        Toggle the condensing water pump. When enabled, the pump will circulate water through the condenser loop.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!showTable && (
            <div className="mb-6 text-sm text-gray-400">
              <div className="flex flex-col gap-2">
                <p>Click on the legend items to toggle visibility. Multiple selections are allowed.</p>
                <div className="flex flex-wrap gap-2">
                  {/* Chiller Selection Buttons */}
                  {[
                    { mode: 'single', label: 'Chiller × 1', color: COMBINATION_COLORS.single.button, handler: handleChillerToggle, items: chillerConfigs.map(config => config.Chiller), selected: selectedChillers },
                    { mode: 'dual', label: 'Chiller × 2', color: COMBINATION_COLORS.dual.button, handler: handleCombinationToggle, items: getValidChillerCombinations(), selected: selectedCombinations },
                    { mode: 'triple', label: 'Chiller × 3', color: COMBINATION_COLORS.triple.button, handler: handleTripleCombinationToggle, items: getValidTripleChillerCombinations(), selected: selectedTripleCombinations },
                    { mode: 'quad', label: 'Chiller × 4', color: COMBINATION_COLORS.quad.button, handler: handleQuadCombinationToggle, items: getValidQuadChillerCombinations(), selected: selectedQuadCombinations },
                    { mode: 'penta', label: 'Chiller × 5', color: COMBINATION_COLORS.penta.button, handler: handlePentaCombinationToggle, items: getValidPentaChillerCombinations(), selected: selectedPentaCombinations },
                    { mode: 'hexa', label: 'Chiller × 6', color: COMBINATION_COLORS.hexa.button, handler: handleHexaCombinationToggle, items: getValidHexaChillerCombinations(), selected: selectedHexaCombinations },
                    { mode: 'septa', label: 'Chiller × 7', color: COMBINATION_COLORS.septa.button, handler: handleSeptaCombinationToggle, items: getValidSeptaChillerCombinations(), selected: selectedSeptaCombinations }
                  ].map(({ mode, label, color, handler, items, selected }) => (
                    <div key={mode} className="relative group">
                      <button
                        onClick={() => handleModeToggle(mode as ViewMode)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedModes.has(mode as ViewMode)
                            ? color
                            : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center ${
                            selectedModes.has(mode as ViewMode)
                              ? 'border-current bg-current/20'
                              : 'border-gray-600 bg-gray-800'
                          }`}>
                            <Check className={`w-3 h-3 transition-all duration-200 ${
                              selectedModes.has(mode as ViewMode)
                                ? 'opacity-100 text-current scale-100'
                                : 'opacity-0 scale-75'
                            }`} />
                          </div>
                          {label}
                        </div>
                      </button>
                      {selectedModes.has(mode as ViewMode) && (
                        <div className="absolute left-0 mt-2 min-w-[200px] bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <button
                            onClick={() => {
                              const isAllSelected = items.every(item => selected.has(item));
                              if (isAllSelected) {
                                // Keep only the first item selected
                                const firstItem = items[0];
                                items.forEach(item => {
                                  if (item !== firstItem) {
                                    handler(item);
                                  }
                                });
                              } else {
                                // Select all items
                                items.forEach(item => {
                                  if (!selected.has(item)) {
                                    handler(item);
                                  }
                                });
                              }
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition-colors whitespace-nowrap border-b border-gray-700/50 ${
                              items.every(item => selected.has(item))
                                ? color
                                : 'text-gray-400 hover:bg-gray-700/50'
                            }`}
                          >
                            Select All
                          </button>
                          {items.map(item => (
                            <button
                              key={item}
                              onClick={() => handler(item)}
                              className={`w-full px-4 py-2 text-left text-sm transition-colors whitespace-nowrap ${
                                selected.has(item)
                                  ? color
                                  : 'text-gray-400 hover:bg-gray-700/50'
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {showTable ? (
            <div className="overflow-x-auto">
              <table className="w-full divide-y-2 divide-gray-700">
                <thead className="bg-gray-800/50">
                  <tr className="divide-x-2 divide-gray-700">
                    {(viewMode === 'single' ? parsedData : 
                      viewMode ===  'dual' ? parsedDualData :
                      viewMode === 'triple' ? parsedTripleData :
                      viewMode === 'quad' ? parsedQuadData :
                      viewMode === 'penta' ? parsedPentaData :
                      viewMode === 'hexa' ? parsedHexaData :
                      parsedSeptaData)?.headers.map((header, index) => (
                      <th key={header} className="px-4 py-3 text-left text-sm font-medium text-gray-300">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-900/30">
                  {(viewMode === 'single' ? parsedData : 
                    viewMode === 'dual' ? parsedDualData :
                    viewMode === 'triple' ? parsedTripleData :
                    viewMode === 'quad' ? parsedQuadData :
                    viewMode === 'penta' ? parsedPentaData :
                    viewMode === 'hexa' ? parsedHexaData :
                    parsedSeptaData)?.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="divide-x-2 divide-gray-700">
                      {Object.values(row).map((value, colIndex) => (
                        <td key={colIndex} className="px-4 py-3 text-sm text-gray-300">
                          {typeof value === 'number' ? value.toFixed(2) : value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
                <div className="flex items-center mb-4">
                  <Activity className="w-6 h-6 text-purple-400 mr-3" />
                  <h2 className="text-xl font-bold text-white">
                    Chiller Plant Staging Analysis
                  </h2>
                </div>
                <div className="h-[600px] w-full">
                  {filteredChartData && <Line data={filteredChartData} options={options} />}
                </div>
              </div>
              
              {/* Staging Analysis Toggle Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowStagingAnalysis(!showStagingAnalysis)}
                  className="flex items-center gap-2 px-6 py-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg border border-purple-500/30 transition-all duration-200 hover:scale-105"
                >
                  <Activity className="w-5 h-5 text-purple-300" />
                  <span className="text-purple-300 text-sm font-semibold">
                    {showStagingAnalysis ? 'Hide' : 'Show'} Sequencing Analysis
                  </span>
                </button>
              </div>
              
              {/* Staging Analysis Components - Restructured Layout */}
              <div>
                {/* Cooling Load Profile - Full Width in Middle */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl mb-6">
                  <div className="flex items-center mb-4">
                    <Activity className="w-6 h-6 text-blue-400 mr-3" />
                    <h2 className="text-xl font-bold text-white">
                      Cooling Load Profile
                    </h2>
                  </div>
                  <div className="h-[300px] w-full">
                    <CoolingLoadProfile 
                      data={coolingLoadProfile} 
                      selectedMonth={selectedMonth}
                      onMonthChange={handleMonthChange}
                    />
                  </div>
                </div>
                
                {/* Analysis Components - Side by Side Below */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - Manually Defined Sequence */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
                    <div className="flex items-center mb-4">
                      <Activity className="w-6 h-6 text-green-400 mr-3" />
                      <h2 className="text-xl font-bold text-white">
                        Stage Up/Down Sequencing Simulation
                      </h2>
                    </div>
                    <div className="w-full">
                      <ManuallyDefinedSequence
                        chillerConfigs={chillerConfigs}
                        copData={convertCopData(parsedData?.data || [])}
                        dualCopData={convertCopData(parsedDualData?.data || [])}
                        tripleCopData={convertCopData(parsedTripleData?.data || [])}
                        quadCopData={convertCopData(parsedQuadData?.data || [])}
                        pentaCopData={convertCopData(parsedPentaData?.data || [])}
                        hexaCopData={convertCopData(parsedHexaData?.data || [])}
                        septaCopData={convertCopData(parsedSeptaData?.data || [])}
                        coolingLoadProfile={coolingLoadProfile}
                        selectedPriorityResult={selectedPriorityResult}
                      />
                    </div>
                  </div>
                  
                  {/* Right Column - Priority Order Ranking */}
                  <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl p-6 border border-gray-800/50 shadow-xl">
                    <PriorityOrderRanking
                      chillerConfigs={chillerConfigs}
                      copData={convertCopData(parsedData?.data || [])}
                      dualCopData={convertCopData(parsedDualData?.data || [])}
                      tripleCopData={convertCopData(parsedTripleData?.data || [])}
                      quadCopData={convertCopData(parsedQuadData?.data || [])}
                      pentaCopData={convertCopData(parsedPentaData?.data || [])}
                      hexaCopData={convertCopData(parsedHexaData?.data || [])}
                      septaCopData={convertCopData(parsedSeptaData?.data || [])}
                      coolingLoadProfile={coolingLoadProfile}
                      onResultSelect={(result) => setSelectedPriorityResult(result)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Floating Modal for Sequencing Simulation */}
              {showStagingAnalysis && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-gradient-to-br from-gray-900 to-gray-900/50 rounded-xl border border-gray-800/50 shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
                    <div className="flex items-center justify-between p-6 border-b border-gray-800/50">
                      <div className="flex items-center">
                        <Activity className="w-6 h-6 text-purple-400 mr-3" />
                        <h2 className="text-xl font-bold text-white">
                          Sequencing Simulation Analysis
                        </h2>
                      </div>
                      <button
                        onClick={() => setShowStagingAnalysis(false)}
                        className="text-gray-400 hover:text-white transition-colors duration-200"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                      <SequencingSimulation 
                        chillerConfigs={chillerConfigs}
                        copData={convertCopData(parsedData?.data || [])}
                        dualCopData={convertCopData(parsedDualData?.data || [])}
                        tripleCopData={convertCopData(parsedTripleData?.data || [])}
                        quadCopData={convertCopData(parsedQuadData?.data || [])}
                        pentaCopData={convertCopData(parsedPentaData?.data || [])}
                        hexaCopData={convertCopData(parsedHexaData?.data || [])}
                        septaCopData={convertCopData(parsedSeptaData?.data || [])}
                        coolingLoad={coolingLoadProfile.length > 0 ? coolingLoadProfile[0].load : 0}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



