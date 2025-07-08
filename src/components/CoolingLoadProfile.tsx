import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MonthlyLoadData {
  hour: number;
  load: number;
}

interface CoolingLoadProfileProps {
  data?: Array<{
    hour: number;
    load: number;
  }>;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

const MONTHS = [
  { value: 'jan', label: 'January' },
  { value: 'feb', label: 'February' },
  { value: 'mar', label: 'March' },
  { value: 'apr', label: 'April' },
  { value: 'may', label: 'May' },
  { value: 'jun', label: 'June' },
  { value: 'jul', label: 'July' },
  { value: 'aug', label: 'August' },
  { value: 'sep', label: 'September' },
  { value: 'oct', label: 'October' },
  { value: 'nov', label: 'November' },
  { value: 'dec', label: 'December' }
];

export function CoolingLoadProfile({ 
  data: propData, 
  selectedMonth: propSelectedMonth = 'jul',
  onMonthChange 
}: CoolingLoadProfileProps) {
  const [selectedMonth, setSelectedMonth] = useState(propSelectedMonth);
  const [monthlyData, setMonthlyData] = useState<MonthlyLoadData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalMaxLoad, setGlobalMaxLoad] = useState<number>(0);

  // Function to load all monthly data and find global maximum
  const loadGlobalMaxLoad = async () => {
    try {
      let maxLoad = 0;
      
      for (const month of MONTHS) {
        const response = await fetch(`/data/monthly_cooling_loads/${month.value}_cooling_load.csv`);
        if (response.ok) {
          const csvText = await response.text();
          const lines = csvText.trim().split('\n');
          const dataLines = lines.slice(1); // Skip header
          
          for (const line of dataLines) {
            const [, load] = line.split(',');
            const loadValue = parseFloat(load);
            if (!isNaN(loadValue) && loadValue > maxLoad) {
              maxLoad = loadValue;
            }
          }
        }
      }
      
      // Round up to nearest 5000
      const roundedMax = Math.ceil(maxLoad / 5000) * 5000;
      setGlobalMaxLoad(roundedMax);
    } catch (err) {
      console.error('Error loading global max load:', err);
      setGlobalMaxLoad(25000); // Fallback value
    }
  };

  // Function to load monthly cooling load data
  const loadMonthlyData = async (month: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/data/monthly_cooling_loads/${month}_cooling_load.csv`);
      if (!response.ok) {
        throw new Error(`Failed to load ${month} cooling load data`);
      }
      
      const csvText = await response.text();
      const lines = csvText.trim().split('\n');
      const dataLines = lines.slice(1); // Skip header
      
      const parsedData: MonthlyLoadData[] = dataLines.map((line, index) => {
        const [time, load] = line.split(',');
        return {
          hour: index, // Use index as hour (0-23)
          load: parseFloat(load)
        };
      });
      
      setMonthlyData(parsedData);
    } catch (err) {
      console.error(`Error loading monthly data for ${month}:`, err);
      setError(`Failed to load ${month} data`);
      // Fallback to empty data
      setMonthlyData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load global max on component mount
  useEffect(() => {
    loadGlobalMaxLoad();
  }, []);

  // Handle month selection change
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (onMonthChange) {
      onMonthChange(month);
    } else {
      loadMonthlyData(month);
    }
  };

  // Sync with parent selected month
  useEffect(() => {
    if (propSelectedMonth !== selectedMonth) {
      setSelectedMonth(propSelectedMonth);
    }
  }, [propSelectedMonth]);

  // Load data when selected month changes (only if no parent callback)
  useEffect(() => {
    if (!onMonthChange) {
      loadMonthlyData(selectedMonth);
    }
  }, [selectedMonth, onMonthChange]);

  // Use monthly data if available, otherwise fall back to prop data
  const displayData = monthlyData.length > 0 ? monthlyData : (propData || []);
  
  // Get selected month label for display
  const selectedMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth;

  const chartData = {
    labels: displayData.map(d => `${d.hour.toString().padStart(2, '0')}:00`),
    datasets: [
      {
        label: `${selectedMonthLabel} Cooling Load`,
        data: displayData.map(d => d.load),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: function(context: any) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) {
            return null;
          }
          const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
          gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.5)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
        borderDash: [5, 5],
        stepped: false,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    backgroundColor: 'transparent',
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time',
          color: '#6B7280',
          font: {
            size: 12,
            weight: 500
          }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          }
        }
      },
      y: {
        title: {
          display: true,
          text: 'Cooling Load (kW)',
          color: '#6B7280',
          font: {
            size: 12,
            weight: 500
          }
        },
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#6B7280',
          font: {
            size: 11
          },
          callback: function(tickValue: string | number, _index: number, _ticks: any[]) {
            return Number(tickValue).toLocaleString();
          }
        },
        beginAtZero: true,
        max: globalMaxLoad > 0 ? globalMaxLoad : undefined
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#F9FAFB',
        bodyColor: '#E5E7EB',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        padding: 12,
        bodySpacing: 6,
        titleSpacing: 8,
        cornerRadius: 8,
        boxPadding: 4
      },
      crosshair: {
        line: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          dashPattern: [5, 5]
        },
        sync: {
          enabled: true,
          group: 1,
          suppressTooltips: false
        },
        snap: {
          enabled: true
        }
      }
    }
  };

  // Custom crosshair plugin
  const crosshairPlugin = {
    id: 'crosshair',
    beforeDraw: (chart: any) => {
      const { ctx, chartArea, tooltip } = chart;
      if (!chartArea || !tooltip.opacity) return;

      const activeElements = chart.getActiveElements();
      if (activeElements.length === 0) return;

      const element = activeElements[0];
      const y = element.element.y;

      // Draw horizontal dashed line
      ctx.save();
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.restore();

      // Draw dot on data point
      ctx.save();
      ctx.fillStyle = 'rgb(59, 130, 246)';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(element.element.x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Month Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">
          Selected Month: {selectedMonthLabel}
        </h2>
        
        <div className="flex items-center space-x-3">
          <label htmlFor="month-select" className="text-sm font-medium text-gray-300">
            Select Month:
          </label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => handleMonthChange(e.target.value)}
            disabled={loading}
            className="px-3 py-2 text-sm bg-gray-800 border border-gray-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {MONTHS.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2 text-blue-600">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-sm">Loading {selectedMonthLabel} data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      {!loading && !error && displayData.length > 0 && (
        <div className="h-64 bg-transparent p-2">
          <Line data={chartData} options={options} plugins={[crosshairPlugin]} />
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && displayData.length === 0 && (
        <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
            <p className="mt-1 text-sm text-gray-500">No cooling load data found for {selectedMonthLabel}.</p>
          </div>
        </div>
      )}
    </div>
  );
} 