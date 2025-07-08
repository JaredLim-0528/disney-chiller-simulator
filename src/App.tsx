import React from 'react';
import { Activity, Snowflake, DollarSign, Zap, Gauge, Settings2 } from 'lucide-react';
import { useState, createContext, useContext } from 'react';
import type { CostRates, GroupValues, CoolingLoadData } from './types';
import { Simulation } from './pages/Simulation';

export const CostRatesContext = createContext<{
  rates: CostRates;
  setRates: (rates: CostRates) => void;
}>({
  rates: {
    demandCharge: 120,
    energyCharge: 0.6,
    fuelCost: 0.4
  },
  setRates: () => {}
});
import { KVAGroups } from './components/KVAGroups';
import { ChillerCombinationKVARanking } from './components/ChillerCombinationKVARanking';
import { CostPanel } from './components/CostPanel';
import type { KVAGroup, CoolingLoadEntry } from './types';
import coolingLoadData from './data/cooling-load.json';
import groupValuesData from './data/group-values.json';
import chillerCombinationsData from './data/chiller-combinations.json';
import chillerGroupMappingData from './data/chiller-group-mapping.json';

const CHILLER_GROUP_MAPPING = chillerGroupMappingData.mapping as const;

const PCH_KVA_VALUES = {
  'PCH-1': 27.7,
  'PCH-2': 6.5,
  'PCH-3': 27.3,
  'PCH-4': 6.7,
  'PCH-5': 6.9,
  'PCH-6': 28.0,
  'PCH-7': 28.0
} as const;

const LINKED_CHILLERS = {
  'CH01': 'PCH-1',
  'CH02': 'PCH-2',
  'CH03': 'PCH-3',
  'CH04': 'PCH-4',
  'CH05': 'PCH-5',
  'CH06': 'PCH-6',
  'CH07': 'PCH-7'
} as const;

const BASE_GROUP_VALUES = groupValuesData.kvaGroups as const;

function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'simulation'>('main');
  const [showKwhEdit, setShowKwhEdit] = useState(false);
  const [showKvaEdit, setShowKvaEdit] = useState(false);
  const [showRatesEdit, setShowRatesEdit] = useState(false);
  const [showCoolingLoadEdit, setShowCoolingLoadEdit] = useState(false);
  const [groupValues, setGroupValues] = useState<GroupValues>(groupValuesData);
  const [coolingLoad, setCoolingLoad] = useState<CoolingLoadData>(coolingLoadData);
  const [rates, setRates] = useState<CostRates>({
    demandCharge: 120,
    energyCharge: 0.6,
    fuelCost: 0.4
  });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const calculateCoolingLoadStats = () => {
    const today = new Date();
    const daysInMonth = getDaysInMonth(today);
    const currentDay = today.getDate();
    const remainingDays = daysInMonth - currentDay;
    
    const averageDailyLoad = coolingLoad.avg10DayLoad;
    const estimatedRemainingLoad = Math.round(averageDailyLoad * remainingDays);

    return {
      averageLoad: averageDailyLoad,
      remainingDays,
      estimatedRemainingLoad,
    };
  };

  const calculateGroupValues = (chillerCombination: string, cop: number) => {
    const activeChillers = chillerCombination.split(', ');
    const groupChillerCount = new Map<string, number>();
    const groupNetImpacts = new Map<string, number>();
    const groupEquipmentImpacts = new Map<string, Map<string, number>>();
    
    // Calculate KVA impacts for each group
    activeChillers.forEach(chiller => {
      const group = CHILLER_GROUP_MAPPING[chiller as keyof typeof CHILLER_GROUP_MAPPING];
      if (!group) {
        console.warn(`No group mapping found for chiller: ${chiller}`);
        return;
      }
      
      groupChillerCount.set(group, (groupChillerCount.get(group) || 0) + 1);
      
      if (!groupEquipmentImpacts.has(group)) {
        groupEquipmentImpacts.set(group, new Map());
      }
      
      // Get existing KVA for the chiller
      const existingKVA = groupValues.equipmentKVA?.[group]?.find(eq => eq.name === chiller)?.kva || 0;
      
      // Calculate new KVA for the chiller based on cooling load distribution
      const peakCoolingLoadTR = coolingLoad.predictions.peakCoolingLoad.value;
      const kwPerTR = 3.517;
      const kvaPowerFactor = 0.95;
      const totalKVARequired = (peakCoolingLoadTR * kwPerTR) / kvaPowerFactor;
      const newKVA = activeChillers.length > 0 ? totalKVARequired / cop / activeChillers.length : 0;
      
      // Calculate net impact (absolute difference)
      const netImpact = newKVA - existingKVA;
      groupNetImpacts.set(group, (groupNetImpacts.get(group) || 0) + netImpact);
      groupEquipmentImpacts.get(group)!.set(chiller, newKVA);
      
      // Handle linked PCH units
      if (chiller in LINKED_CHILLERS) {
        const pchUnit = LINKED_CHILLERS[chiller as keyof typeof LINKED_CHILLERS];
        const pchGroup = CHILLER_GROUP_MAPPING[pchUnit as keyof typeof CHILLER_GROUP_MAPPING];
        if (!pchGroup) {
          console.warn(`No group mapping found for PCH unit: ${pchUnit}`);
          return;
        }
        
        const existingPchKVA = groupValues.equipmentKVA?.[pchGroup]?.find(eq => eq.name === pchUnit)?.kva || 0;
        const pchKVA = PCH_KVA_VALUES[pchUnit as keyof typeof PCH_KVA_VALUES];
        if (pchKVA === undefined) {
          console.warn(`No KVA value found for PCH unit: ${pchUnit}`);
          return;
        }
        
        const pchNetImpact = pchKVA - existingPchKVA;
        
        if (!groupEquipmentImpacts.has(pchGroup)) {
          groupEquipmentImpacts.set(pchGroup, new Map());
        }
        
        groupNetImpacts.set(pchGroup, (groupNetImpacts.get(pchGroup) || 0) + pchNetImpact);
        groupEquipmentImpacts.get(pchGroup)!.set(pchUnit, pchKVA);
      }
    });
    
    const newGroupValues = { ...BASE_GROUP_VALUES };
    let totalKVA = 0;
    
    Object.entries(newGroupValues).forEach(([group, baseValue]) => {
      const chillersInGroup = groupChillerCount.get(group) || 0;
      const netImpact = groupNetImpacts.get(group) || 0;
      
      newGroupValues[group as keyof typeof BASE_GROUP_VALUES] = Math.abs(netImpact);
      totalKVA += Math.abs(netImpact);
    });
    
    const demandChargeEstimation = totalKVA * rates.demandCharge;
    
    return {
      ...newGroupValues,
      totalMonthlyMaxKVA: totalKVA,
      demandChargeEstimation,
      groupImpacts: Object.fromEntries(Array.from(groupEquipmentImpacts.entries()).map(([group, impacts]) => [group, Object.fromEntries(impacts)]))
    };
  };

  const calculateEnergyCosts = (entry: { cop: number }) => {
    const monthlyProjectedCoolingLoad = calculateCoolingLoadStats().estimatedRemainingLoad;
    const energyChargeEstimation = entry.cop > 0 ? (monthlyProjectedCoolingLoad / entry.cop) * rates.energyCharge : 0;
    const fuelCostEstimation = entry.cop > 0 ? (monthlyProjectedCoolingLoad / entry.cop) * rates.fuelCost : 0;
    
    return {
      energyChargeEstimation,
      fuelCostEstimation
    };
  };

  const kvaGroups: KVAGroup[] = [
    ...Object.entries(groupValues.kvaGroups).map(([name, value]) => ({
      name,
      value,
      unit: 'kVA',
      equipments: groupValues.equipmentKVA?.[name] || []
    })),
    { name: 'Monthly Max KVA', value: Object.values(groupValues.kvaGroups).reduce((sum, value) => sum + value, 0), unit: 'kVA' }
  ];

  const kwhGroups: KVAGroup[] = [
    ...Object.entries(groupValues.kwhGroups).map(([name, value]) => ({
      name,
      value,
      unit: 'kWh'
    })),
    { 
      name: 'Monthly Total kWh', 
      value: Object.values(groupValues.kwhGroups).reduce((sum, value) => sum + value, 0), 
      unit: 'kWh' 
    }
  ];

  const coolingLoadEntries: CoolingLoadEntry[] = chillerCombinationsData.combinations.map(entry => ({
    ...entry,
    ...calculateGroupValues(entry.chillers, entry.cop),
    ...calculateEnergyCosts(entry)
  }));

  return (
    <CostRatesContext.Provider value={{ rates, setRates }}>
    <div className="min-h-screen bg-gray-950 p-4">
      <nav className="max-w-[95%] mx-auto mb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setCurrentPage('main')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === 'main'
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentPage('simulation')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              currentPage === 'simulation'
                ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
            }`}
          >
            Simulation
          </button>
        </div>
      </nav>

      {currentPage === 'simulation' ? (
        <Simulation />
      ) : (
      <div className="max-w-[95%] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Activity className="w-8 h-8 text-blue-400 mr-3" />
            <h1 className="text-2xl font-bold text-white">
              Disney Chiller Plant Energy Cost Estimation - CCP1
            </h1>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Snowflake className="w-6 h-6 text-emerald-400 mr-2" />
              <span>Monthly Cooling Load</span>
            </h2>
            <button
              onClick={() => setShowCoolingLoadEdit(!showCoolingLoadEdit)}
              className="ml-4 flex items-center gap-2 px-3 py-1 bg-emerald-900/30 hover:bg-emerald-800/40 rounded-lg border border-emerald-700/30 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-emerald-300" />
              <span className="text-emerald-300 text-sm font-medium">Edit Values</span>
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">Today</p>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-emerald-500">
                    {new Date().toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">Monthly Total Cooling Load</p>
                <div className="flex items-baseline">
                  {showCoolingLoadEdit ? (
                    <input
                      type="number"
                      value={coolingLoad.monthlyTotalCoolingLoad}
                      onChange={(e) => setCoolingLoad(prev => ({
                        ...prev,
                        monthlyTotalCoolingLoad: Number(e.target.value)
                      }))}
                      className="w-40 bg-transparent border-b-2 border-emerald-500/30 text-3xl font-bold text-emerald-500 focus:outline-none focus:border-emerald-500"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-emerald-500"> 
                      {coolingLoad.monthlyTotalCoolingLoad.toLocaleString()}
                    </span>
                  )}
                  <span className="ml-2 text-gray-400">kWh</span>
                </div>
              </div>
              <div className="hidden lg:block absolute left-1/2 h-full w-[2px] bg-gradient-to-b from-gray-800 via-gray-700 to-gray-800"></div>
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">Avg Past 10 days Cooling Load</p>
                <div className="flex items-baseline">
                  {showCoolingLoadEdit ? (
                    <input
                      type="number"
                      value={coolingLoad.avg10DayLoad}
                      onChange={(e) => setCoolingLoad(prev => ({
                        ...prev,
                        avg10DayLoad: Number(e.target.value)
                      }))}
                      className="w-40 bg-transparent border-b-2 border-emerald-300/30 text-3xl font-bold text-emerald-300 focus:outline-none focus:border-emerald-300"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-emerald-300">
                      {calculateCoolingLoadStats().averageLoad.toLocaleString()}
                    </span>
                  )}
                  <span className="ml-2 text-gray-400">kWh</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">Projected Monthly Total Cooling Load</p>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-emerald-300">
                    {calculateCoolingLoadStats().estimatedRemainingLoad.toLocaleString()}
                  </span>
                  <span className="ml-2 text-gray-400">kWh</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({calculateCoolingLoadStats().remainingDays} days remaining)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Zap className="w-6 h-6 text-yellow-400 mr-2" />
              <span>Monthly Total kWh</span>
            </h2>
            <button
              onClick={() => setShowKwhEdit(!showKwhEdit)}
              className="ml-4 flex items-center gap-2 px-3 py-1 bg-yellow-900/30 hover:bg-yellow-800/40 rounded-lg border border-yellow-700/30 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 text-sm font-medium">Edit Values</span>
            </button>
          </div>
          <KVAGroups 
            groups={kwhGroups} 
            editable={showKwhEdit}
            onValueChange={(groupName, value, type) => {
              setGroupValues(prev => ({
                ...prev,
                kwhGroups: {
                  ...prev.kwhGroups,
                  [groupName]: value
                }
              }));
            }}
          />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <Gauge className="w-6 h-6 text-amber-400 mr-2" />
              <span>Monthly kVA</span>
            </h2>
            <button
              onClick={() => setShowKvaEdit(!showKvaEdit)}
              className="ml-4 flex items-center gap-2 px-3 py-1 bg-amber-900/30 hover:bg-amber-800/40 rounded-lg border border-amber-700/30 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-amber-300" />
              <span className="text-amber-300 text-sm font-medium">Edit Values</span>
            </button>
          </div>
          <KVAGroups 
            groups={kvaGroups} 
            editable={showKvaEdit}
            onValueChange={(groupName, value, type, equipmentName) => {
              if (equipmentName) {
                setGroupValues(prev => ({
                  ...prev,
                  equipmentKVA: {
                    ...prev.equipmentKVA,
                    [groupName]: prev.equipmentKVA?.[groupName]?.map(equipment => 
                      equipment.name === equipmentName ? { ...equipment, kva: value } : equipment
                    ) || []
                  }
                }));
                return;
              }
              
              setGroupValues(prev => ({
                ...prev,
                kvaGroups: {
                  ...prev.kvaGroups,
                  [groupName]: value
                }
              }));
            }}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <DollarSign className="w-6 h-6 text-blue-400 mr-2" />
            <span>Monthly Cost Estimation</span>
          </h2>
          <button
            onClick={() => setShowRatesEdit(!showRatesEdit)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg border border-blue-700/30 transition-colors"
          >
            <Settings2 className="w-4 h-4 text-blue-300" />
            <span className="text-blue-300 text-sm font-medium">Customize Rates</span>
          </button>
        </div>
        <div className="mb-8">
          <CostPanel 
            stats={calculateCoolingLoadStats()} 
            showSettings={showRatesEdit}
            kvaGroups={kvaGroups}
            kwhGroups={kwhGroups}
          />
        </div>
        
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-8"></div>
        
        <h2 className="text-xl font-semibold text-white mb-4">
          Peak Load Prediction
        </h2>
        
        <div className="mb-6">
            <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 rounded-lg p-6 border border-indigo-700/30">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-indigo-200">Peak Cooling Load Prediction</h3>
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-indigo-300">
                    {coolingLoad.predictions.peakCoolingLoad.value.toLocaleString()}
                  </span>
                  <span className="text-2xl text-indigo-400 font-medium ml-1">
                    {coolingLoad.predictions.peakCoolingLoad.unit}
                  </span>
                </div>                
              </div>
            </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">
            Chiller Combination Ranking Table
          </h2>
          <div className="w-full">
            <ChillerCombinationKVARanking entries={coolingLoadEntries} />
          </div>
        </div>
      </div>
      )}
    </div>
    </CostRatesContext.Provider>
  );
}

export default App;