import React from 'react';
import { Activity, Snowflake, DollarSign, Zap, Gauge, Settings2, Languages, Settings, X } from 'lucide-react';
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

const CHILLER_GROUP_MAPPING = chillerGroupMappingData.mapping;

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

const BASE_GROUP_VALUES = groupValuesData.kvaGroups;

// Translation object
const translations = {
  en: {
    simulation: 'Simulation',
    costEstimation: 'Cost Estimation',
    monthlyCoolingLoad: 'Monthly Cooling Load',
    today: 'Today',
    monthlyTotalCoolingLoad: 'Monthly Total Cooling Load',
    avgPast10Days: 'Avg Past 10 days Cooling Load',
    projectedMonthlyTotal: 'Projected Monthly Total Cooling Load',
    daysRemaining: 'days remaining',
    monthlyTotalKwh: 'Monthly Total kWh',
    monthlyKva: 'Monthly kVA',
    monthlyCostEstimation: 'Monthly Cost Estimation',
    peakLoadPrediction: 'Peak Load Prediction',
    peakCoolingLoadPrediction: 'Peak Cooling Load Prediction',
    chillerCombinationRanking: 'Chiller Combination Ranking Table',
    editValues: 'Edit Values',
    customizeRates: 'Customize Rates',
    // Simulation page translations
    chillerPlantStagingAnalysis: 'Chiller Plant Staging Analysis',
    stagingReview: 'Staging Review',
    selectedConfiguration: 'Selected Configuration',
    stageDownOptions: 'Stage Down Options',
    stageUpOptions: 'Stage Up Options',
    showStagingAnalysis: 'Show Staging Analysis',
    hideStagingAnalysis: 'Hide Staging Analysis',
    sequencingAnalysis: 'Sequencing Analysis',
    primaryChilledWaterPump: 'Primary Chilled Water Pump',
    coolingLoadProfile: 'Cooling Load Profile',
    stageUpDownSequencing: 'Stage Up/Down Sequencing Simulation',
    sequencingSimulationAnalysis: 'Sequencing Simulation Analysis',
    stagingReviewInfo: 'Click the toggle button to enable staging review mode. Then select chillers to see possible stage up and stage down combinations. Hover over the info icon for detailed options.',
    enableStagingReview: 'Enable staging review mode to see chiller combinations and staging options.',
    selectTwoChillers: 'Select at least 2 chillers to see stage down options.',
    selectOneChiller: 'Select at least one chiller to see stage up options.',
    maxChillersReached: 'Maximum number of chillers reached. No stage up options available.',
    noChillersSelected: 'No chillers selected. Please select at least one chiller to see staging options.',
    // Additional missing translations
    secondaryChilledWaterPump: 'Secondary Chilled Water Pump',
    coolingTower: 'Cooling Tower',
    condensingWaterPump: 'Condensing Water Pump',
    clickLegendItems: 'Click on the legend items to toggle visibility. Multiple selections are allowed.',
    priorityOrderRanking: 'Priority Order Ranking',
    selectPriorityOrder: 'Please select a priority order from the ranking on the right to view details.',
    runAnalysisToGenerate: 'Run analysis to generate priority order rankings based on cooling load profile',
    runPriorityOrderAnalysis: 'Run Priority Order Analysis',
    runAgain: 'Run Again',
    topTwentyChillers: 'Top 20 chiller priority orders ranked by daily energy consumption (kWh/day)',
    secondaryPumpDescription: 'Toggle the secondary chilled water pump. When enabled, the pump will circulate chilled water through the secondary loop.',
    coolingTowerDescription: 'Toggle the cooling tower. When enabled, the cooling tower will reject heat from the condenser water loop.',
    condensingPumpDescription: 'Toggle the condensing water pump. When enabled, the pump will circulate water through the condenser loop.',
    selectedMonth: 'Selected Month',
    selectMonth: 'Select Month',
    // Chiller specifications
    capacity: 'Capacity',
    maxCOP: 'Max COP',
    // Chiller combination buttons
    chillerX1: 'Chiller × 1',
    chillerX2: 'Chiller × 2',
    chillerX3: 'Chiller × 3',
    chillerX4: 'Chiller × 4',
    chillerX5: 'Chiller × 5',
    chillerX6: 'Chiller × 6',
    chillerX7: 'Chiller × 7',
    selectAll: 'Select All',
    // Stage Up/Down Sequencing Simulation
    chillers: 'Chillers',
    stagingEvents: 'Staging Events',
    noStagingEvents: 'No staging events - static operation',
    hourlyChillerCombinations: 'Hourly Chiller Combinations',
    hour: 'Hour',
    combination: 'Combination',
    action: 'Action',
    loadKW: 'Load (kW)',
    capacityKW: 'Capacity (kW)',
    cop: 'COP',
    powerKW: 'Power (kW)',
    utilization: 'Utilization',
    dailyCOP: 'Daily COP',
    kwhPerDay: 'kWh/day',
    // Priority Order Ranking
    order: 'order',
    orders: 'orders',
    actualEnergy: 'Actual Energy',
    fullOrder: 'Full order',
    // Staging event reasons
    startingWith: 'Starting with',
    forLoad: 'for',
    kWLoad: 'kW load',
    addedFor: 'Added',
    forCapacity: 'for capacity',
    forEfficiency: 'for efficiency',
    removedFor: 'Removed',
    dueToExcessCapacity: 'due to excess capacity',
    vs: 'vs',
    noChangeNeeded: 'No change needed',
    noChangeOptimal: 'No change needed - current combination is optimal',
    // Settings
    settings: 'Settings',
    pageVisibility: 'Page Visibility',
    showSimulationPage: 'Show Simulation Page',
    showCostEstimationPage: 'Show Cost Estimation Page',
    // Chart axis titles
    coolingLoadKW: 'Cooling Load (kW)',
    copAxis: 'COP',
    time: 'Time'
  },
  zh: {
    simulation: '仿真模拟',
    costEstimation: '成本估算',
    monthlyCoolingLoad: '月度冷负荷',
    today: '今天',
    monthlyTotalCoolingLoad: '月度总冷负荷',
    avgPast10Days: '过去10天平均冷负荷',
    projectedMonthlyTotal: '预计月度总冷负荷',
    daysRemaining: '天剩余',
    monthlyTotalKwh: '月度总用电量',
    monthlyKva: '月度千伏安',
    monthlyCostEstimation: '月度成本估算',
    peakLoadPrediction: '峰值负荷预测',
    peakCoolingLoadPrediction: '峰值冷负荷预测',
    chillerCombinationRanking: '冷水机组合排名表',
    editValues: '编辑数值',
    customizeRates: '自定义费率',
    // Simulation page translations
    chillerPlantStagingAnalysis: '冷水机组分级分析',
    stagingReview: '分级评估',
    selectedConfiguration: '选择的配置',
    stageDownOptions: '降级选项',
    stageUpOptions: '升级选项',
    showStagingAnalysis: '显示分级分析',
    hideStagingAnalysis: '隐藏分级分析',
    sequencingAnalysis: '序列分析',
    primaryChilledWaterPump: '一次冷冻水泵',
    coolingLoadProfile: '冷负荷曲线',
    stageUpDownSequencing: '升降级序列仿真',
    sequencingSimulationAnalysis: '序列仿真分析',
    stagingReviewInfo: '点击切换按钮启用分级评估模式。然后选择冷水机组查看可能的升级和降级组合。将鼠标悬停在信息图标上获取详细选项。',
    enableStagingReview: '启用分级评估模式以查看冷水机组合和分级选项。',
    selectTwoChillers: '至少选择2台冷水机组查看降级选项。',
    selectOneChiller: '至少选择一台冷水机组查看升级选项。',
    maxChillersReached: '已达到最大冷水机组数量。无升级选项可用。',
    noChillersSelected: '未选择冷水机组。请至少选择一台冷水机组查看分级选项。',
    // Additional missing translations
    secondaryChilledWaterPump: '二次冷冻水泵',
    coolingTower: '冷却塔',
    condensingWaterPump: '冷凝水泵',
    clickLegendItems: '点击图例项目以切换可见性。允许多选。',
    priorityOrderRanking: '优先级排序',
    selectPriorityOrder: '请从右侧排名中选择优先级顺序以查看详情。',
    runAnalysisToGenerate: '运行分析以根据冷负荷曲线生成优先级排序',
    runPriorityOrderAnalysis: '运行优先级排序分析',
    runAgain: '重新运行',
    topTwentyChillers: '按日耗电量(kWh/天)排名的前20个冷水机优先级顺序',
    secondaryPumpDescription: '切换二次冷冻水泵。启用后，泵将通过二次回路循环冷冻水。',
    coolingTowerDescription: '切换冷却塔。启用后，冷却塔将从冷凝器水回路中排除热量。',
    condensingPumpDescription: '切换冷凝水泵。启用后，泵将通过冷凝器回路循环水。',
    selectedMonth: '选择的月份',
    selectMonth: '选择月份',
    // Chiller specifications
    capacity: '制冷量',
    maxCOP: '最大COP',
    // Chiller combination buttons
    chillerX1: '冷水机组 × 1',
    chillerX2: '冷水机组 × 2',
    chillerX3: '冷水机组 × 3',
    chillerX4: '冷水机组 × 4',
    chillerX5: '冷水机组 × 5',
    chillerX6: '冷水机组 × 6',
    chillerX7: '冷水机组 × 7',
    selectAll: '全选',
    // Stage Up/Down Sequencing Simulation
    chillers: '冷水机组',
    stagingEvents: '分级事件',
    noStagingEvents: '无分级事件 - 静态运行',
    hourlyChillerCombinations: '每小时冷水机组合',
    hour: '小时',
    combination: '组合',
    action: '操作',
    loadKW: '负荷 (kW)',
    capacityKW: '制冷量 (kW)',
    cop: 'COP',
    powerKW: '功率 (kW)',
    utilization: '利用率',
    dailyCOP: '日COP',
    kwhPerDay: 'kWh/天',
    // Priority Order Ranking
    order: '顺序',
    orders: '顺序',
    actualEnergy: '实际能耗',
    fullOrder: '完整顺序',
    // Staging event reasons
    startingWith: '开始使用',
    forLoad: '用于',
    kWLoad: 'kW负荷',
    addedFor: '添加',
    forCapacity: '用于制冷量',
    forEfficiency: '用于效率',
    removedFor: '移除',
    dueToExcessCapacity: '由于制冷量过剩',
    vs: '对比',
    noChangeNeeded: '无需更改',
    noChangeOptimal: '无需更改 - 当前组合为最优',
    // Settings
    settings: '设置',
    pageVisibility: '页面可见性',
    showSimulationPage: '显示仿真页面',
    showCostEstimationPage: '显示成本估算页面',
    // Chart axis titles
    coolingLoadKW: '冷负荷 (kW)',
    copAxis: 'COP',
    time: '时间'
  }
};

function App() {
  const [currentPage, setCurrentPage] = useState<'main' | 'simulation'>('simulation');
  const [language, setLanguage] = useState<'en' | 'zh'>('en');
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

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [pageSettings, setPageSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pageSettings');
      return saved ? JSON.parse(saved) : {
        showSimulation: true,
        showCostEstimation: false
      };
    } catch {
      return {
        showSimulation: true,
        showCostEstimation: false
      };
    }
  });

  // Save page settings to localStorage
  React.useEffect(() => {
    localStorage.setItem('pageSettings', JSON.stringify(pageSettings));
  }, [pageSettings]);

  const t = translations[language];

  // Handle page visibility changes
  React.useEffect(() => {
    // If current page is hidden, switch to an available page
    if (currentPage === 'simulation' && !pageSettings.showSimulation && pageSettings.showCostEstimation) {
      setCurrentPage('main');
    } else if (currentPage === 'main' && !pageSettings.showCostEstimation && pageSettings.showSimulation) {
      setCurrentPage('simulation');
    } else if (!pageSettings.showSimulation && !pageSettings.showCostEstimation) {
      // Ensure at least one page is always visible
      setPageSettings((prev: typeof pageSettings) => ({ ...prev, showSimulation: true }));
    }
  }, [pageSettings, currentPage]);

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
        <div className="flex gap-4 justify-between">
          <div className="flex gap-4">
            {pageSettings.showSimulation && (
              <button
                onClick={() => setCurrentPage('simulation')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'simulation'
                    ? 'bg-purple-600/20 text-purple-400 border border-purple-600/30'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
                }`}
              >
                {t.simulation}
              </button>
            )}
            {pageSettings.showCostEstimation && (
              <button
                onClick={() => setCurrentPage('main')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'main'
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70'
                }`}
              >
                {t.costEstimation}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70 rounded-lg transition-colors"
              title={t.settings}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-800/70 rounded-lg transition-colors"
              title={language === 'en' ? 'Switch to Chinese' : '切换到英文'}
            >
              <Languages className="w-4 h-4" />
              <span className="text-sm font-medium">
                {language === 'en' ? '中文' : 'EN'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-700 shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">{t.settings}</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200">{t.pageVisibility}</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageSettings.showSimulation}
                      onChange={(e) => {
                        const newSettings = { ...pageSettings, showSimulation: e.target.checked };
                        setPageSettings(newSettings);
                        
                        // If simulation page is disabled and we're on it, switch to cost estimation
                        if (!e.target.checked && currentPage === 'simulation' && newSettings.showCostEstimation) {
                          setCurrentPage('main');
                        }
                        // If both pages would be disabled, keep simulation enabled
                        if (!e.target.checked && !newSettings.showCostEstimation) {
                          setPageSettings({ ...newSettings, showSimulation: true });
                        }
                      }}
                      className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-300">{t.showSimulationPage}</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pageSettings.showCostEstimation}
                      onChange={(e) => {
                        const newSettings = { ...pageSettings, showCostEstimation: e.target.checked };
                        setPageSettings(newSettings);
                        
                        // If cost estimation page is disabled and we're on it, switch to simulation
                        if (!e.target.checked && currentPage === 'main' && newSettings.showSimulation) {
                          setCurrentPage('simulation');
                        }
                        // If both pages would be disabled, keep simulation enabled
                        if (!e.target.checked && !newSettings.showSimulation) {
                          setPageSettings({ ...newSettings, showSimulation: true });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-300">{t.showCostEstimationPage}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentPage === 'simulation' && pageSettings.showSimulation ? (
        <Simulation translations={t} language={language} />
      ) : currentPage === 'main' && pageSettings.showCostEstimation ? (
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
              <span>{t.monthlyCoolingLoad}</span>
            </h2>
            <button
              onClick={() => setShowCoolingLoadEdit(!showCoolingLoadEdit)}
              className="ml-4 flex items-center gap-2 px-3 py-1 bg-emerald-900/30 hover:bg-emerald-800/40 rounded-lg border border-emerald-700/30 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-emerald-300" />
              <span className="text-emerald-300 text-sm font-medium">{t.editValues}</span>
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative">
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">{t.today}</p>
                <div className="flex items-baseline">
                  <span className="text-2xl font-bold text-emerald-500">
                    {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 mb-1">{t.monthlyTotalCoolingLoad}</p>
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
                <p className="text-sm font-bold text-gray-400 mb-1">{t.avgPast10Days}</p>
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
                <p className="text-sm font-bold text-gray-400 mb-1">{t.projectedMonthlyTotal}</p>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-emerald-300">
                    {calculateCoolingLoadStats().estimatedRemainingLoad.toLocaleString()}
                  </span>
                  <span className="ml-2 text-gray-400">kWh</span>
                  <span className="ml-2 text-sm text-gray-500">
                    ({calculateCoolingLoadStats().remainingDays} {t.daysRemaining})
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
              <span>{t.monthlyTotalKwh}</span>
            </h2>
            <button
              onClick={() => setShowKwhEdit(!showKwhEdit)}
              className="ml-4 flex items-center gap-2 px-3 py-1 bg-yellow-900/30 hover:bg-yellow-800/40 rounded-lg border border-yellow-700/30 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-yellow-300" />
              <span className="text-yellow-300 text-sm font-medium">{t.editValues}</span>
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
              <span>{t.monthlyKva}</span>
            </h2>
            <button
              onClick={() => setShowKvaEdit(!showKvaEdit)}
              className="ml-4 flex items-center gap-2 px-3 py-1 bg-amber-900/30 hover:bg-amber-800/40 rounded-lg border border-amber-700/30 transition-colors"
            >
              <Settings2 className="w-4 h-4 text-amber-300" />
              <span className="text-amber-300 text-sm font-medium">{t.editValues}</span>
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
            <span>{t.monthlyCostEstimation}</span>
          </h2>
          <button
            onClick={() => setShowRatesEdit(!showRatesEdit)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-900/30 hover:bg-blue-800/40 rounded-lg border border-blue-700/30 transition-colors"
          >
            <Settings2 className="w-4 h-4 text-blue-300" />
            <span className="text-blue-300 text-sm font-medium">{t.customizeRates}</span>
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
          {t.peakLoadPrediction}
        </h2>
        
        <div className="mb-6">
            <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 rounded-lg p-6 border border-indigo-700/30">
              <div className="flex items-baseline justify-between">
                <h3 className="text-lg font-semibold text-indigo-200">{t.peakCoolingLoadPrediction}</h3>
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
            {t.chillerCombinationRanking}
          </h2>
          <div className="w-full">
            <ChillerCombinationKVARanking entries={coolingLoadEntries} />
          </div>
        </div>
      </div>
      ) : (
        // Fallback - should not happen due to useEffect, but show simulation by default
        <Simulation translations={t} language={language} />
      )}
    </div>
    </CostRatesContext.Provider>
  );
}

export default App;