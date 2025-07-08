export interface KVAGroup {
  name: string;
  value: number;
  unit: string;
  equipments?: Array<{
    name: string;
    kva: number;
  }>;
}

export interface CoolingLoadEntry {
  chillers: string;
  cop: number;
  time: string;
  estimatedKwh: number;
  'Group K': number;
  'Group L': number;
  'Group M': number;
  'Group N': number;
  'Group O': number;
  'Group AM': number;
  groupImpacts: Record<string, Record<string, number>>;
  totalMonthlyMaxKVA: number;
  demandChargeEstimation: number;
  energyChargeEstimation: number;
  fuelCostEstimation: number;
}

export interface CoolingLoadStats {
  averageLoad: number;
  remainingDays: number;
  estimatedRemainingLoad: number;
}

export interface CostRates {
  demandCharge: number;
  energyCharge: number;
  fuelCost: number;
}

export interface CoolingLoadData {
  monthlyTotalCoolingLoad: number;
  avg10DayLoad: number;
  predictions: {
    peakCoolingLoad: {
      value: number;
      unit: string;
    };
    wetBulbTemperature: {
      min: number;
      max: number;
      unit: string;
    };
  };
}

export interface ChillerStats {
  maxCop: number;
}

export interface GroupValues {
  kvaGroups: Record<string, number>;
  kwhGroups: Record<string, number>;
  equipmentKVA?: Record<string, Array<{
    name: string;
    kva: number;
  }>>;
}