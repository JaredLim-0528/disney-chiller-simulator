import React, { useState } from 'react';
import type { KVAGroup, GroupValues } from '../types';

function calculateOthersKVA(groupValue: number, equipments: Array<{ name: string; kva: number }>) {
  const totalEquipmentKVA = equipments
    .filter(eq => eq.name !== 'Others')
    .reduce((sum, eq) => sum + eq.kva, 0);
  return Math.max(0, Math.round(groupValue - totalEquipmentKVA));
}

interface KVAGroupsProps {
  groups: KVAGroup[];
  onValueChange?: (groupName: string, value: number, type: 'kva' | 'kwh', equipmentName?: string) => void;
  editable?: boolean;
}

export function KVAGroups({ groups, onValueChange, editable = false }: KVAGroupsProps) {
  const handleValueChange = (groupName: string, value: string, type: 'kva' | 'kwh', equipmentName?: string) => {
    const numValue = Number(value);
    if (!isNaN(numValue) && onValueChange) {
      onValueChange(groupName, numValue, type, equipmentName);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 mb-8">
      {groups.map((group) => (
        <div
          key={group.name}
          className={`rounded-lg p-4 text-white relative ${
            group.name === 'Monthly Max KVA' || group.name === 'Monthly Total kWh' || group.name === 'Demand Charge'
              ? 'bg-gradient-to-br from-gray-800/50 to-gray-900 border-2 border-gray-700 shadow-lg shadow-gray-900/50 xl:col-span-1'
              : 'bg-gray-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-gray-400 mb-2">{group.name}</div>            
          </div>
          <div className="flex items-baseline">
            {editable && group.name !== 'Monthly Max KVA' && group.name !== 'Monthly Total kWh' ? (
              <input
                type="number"
                value={group.value}
                onChange={(e) => handleValueChange(group.name, e.target.value, group.unit === 'kVA' ? 'kva' : 'kwh')}
                className={`w-32 bg-transparent border-b-2 ${
                  group.unit === 'kWh' ? 'border-yellow-200/30 text-yellow-200' : 'border-amber-400/30 text-amber-400'
                } text-3xl font-bold focus:outline-none focus:border-blue-500`}
              />
            ) : (
              <span className={`text-3xl font-bold ${group.unit === 'kWh' ? 'text-yellow-200' : 'text-amber-400'}`}>
                {group.name === 'Demand Charge' ? `$${group.value}` : group.value}
              </span>
            )}
            <span className="ml-2 text-gray-400 font-semibold">{group.unit}</span>
          </div>
          
          {/* Equipment Details Section */}
          {group.unit === 'kVA' && group.name !== 'Monthly Max KVA' && (
            <div className="mt-4 space-y-3">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment Details</div>
              
              {/* Equipment List */}
              {group.equipments && group.equipments.length > 0 && (
                <div className="space-y-2">
                  {group.equipments.map((equipment, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm py-1 gap-2">
                      <span className={`${equipment.name === 'Others' ? 'text-gray-400 italic' : 'text-gray-300'}`}>
                        {equipment.name}
                      </span>
                      {editable ? (
                        <div className="flex items-center gap-1">
                          {equipment.name === 'Others' ? (
                            <span className="w-20 text-right text-gray-400">
                              {calculateOthersKVA(group.value, group.equipments)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              value={equipment.kva}
                              onChange={(e) => handleValueChange(group.name, e.target.value, 'kva', equipment.name)}
                              className="w-20 bg-gray-800 border border-amber-400/30 rounded px-2 py-1 text-sm text-amber-400 focus:outline-none focus:border-amber-400"
                            />
                          )}
                          <span className="text-gray-400 text-sm">kVA</span>
                        </div>
                      ) : (
                        <span className={equipment.name === 'Others' ? 'text-gray-400' : 'text-amber-400'}>
                          {equipment.name === 'Others' 
                            ? `${calculateOthersKVA(group.value, group.equipments)} kVA`
                            : `${equipment.kva} kVA`
                          }
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}