// MSW seed for the Reports module: the 6 config-driven ReportTypeConfigs + Master
// Data. These are served by GET /reports/config and GET /master. When the backend
// lands, it serves the same shapes; the report engine/screens don't change.
import type { MasterData, ReportTypeConfig } from '@/types/reports'

export const masterData: MasterData = {
  vehicles: [
    { id: 'v1', vehicleNo: 'MH12 AB 1234' },
    { id: 'v2', vehicleNo: 'MH14 CD 5678' },
    { id: 'v3', vehicleNo: 'MH12 XY 9012' },
  ],
  // Per-machine standard diesel rate (L/hr) lives here, not in code (HLD).
  machines: [
    { id: 'm1', name: 'TATA 215', dieselRateLPerHr: 14 },
    { id: 'm2', name: 'TATA 412', dieselRateLPerHr: 12 },
    { id: 'm3', name: 'JCB 3DX', dieselRateLPerHr: 9 },
    { id: 'm4', name: 'Hydra 14T', dieselRateLPerHr: 11 },
  ],
  excavators: [
    { id: 'e1', name: 'Tata Hitachi EX200', vehicleNo: 'MH12 AB 1234' },
    { id: 'e2', name: 'Komatsu PC210', vehicleNo: 'MH14 CD 5678' },
    { id: 'e3', name: 'CAT 320', vehicleNo: 'MH12 XY 9012' },
  ],
  // Configurable brand strings (was hardcoded in V1).
  explosives: [
    { id: 'x1', name: 'Solar ECO', unit: 'kg' },
    { id: 'x2', name: 'Solar GOLD', unit: 'kg' },
    { id: 'x3', name: 'Cast Booster', unit: 'nos' },
  ],
}

export const reportConfigs: ReportTypeConfig[] = [
  // 1. Billing — harvested V1 structure (calc: net, rowTotal; totals: shiftTotals).
  {
    type: 'billing',
    label: 'Billing Report',
    description: 'Vehicle trip logs — gross/tare/net weight, Day + Night shift totals.',
    enabled: true,
    shiftModel: 'day_night_combined',
    orientation: 'portrait',
    allowCopyDayToNight: true,
    sections: [
      {
        id: 'rows',
        label: 'Vehicle Rows',
        kind: 'rows',
        totalsCalc: 'shiftTotals',
        columns: [
          { key: 'vehicleNo', label: 'Vehicle No.', type: 'select', source: 'master.vehicles' },
          { key: 'gross', label: 'Gross', type: 'number' },
          { key: 'tare', label: 'Tare', type: 'number' },
          { key: 'net', label: 'Net Weight', type: 'computed', calc: 'net' },
          { key: 'trips', label: 'Trips', type: 'number' },
          { key: 'total', label: 'Total Weight', type: 'computed', calc: 'rowTotal' },
        ],
      },
    ],
  },

  // 2. Dispatch — harvested. Machine codes are config options (generalised Ta/HY).
  {
    type: 'dispatch',
    label: 'Dispatch Report',
    description: 'Trip aggregation per vehicle and excavator — Day/Night/Combined.',
    enabled: true,
    shiftModel: 'day_night_combined',
    orientation: 'portrait',
    sections: [
      {
        id: 'triplog',
        label: 'Trip Log',
        kind: 'log',
        columns: [
          { key: 'time', label: 'Time', type: 'time' },
          { key: 'vehicleNo', label: 'Vehicle No.', type: 'select', source: 'master.vehicles' },
          { key: 'machine', label: 'Machine', type: 'select', options: ['Ta', 'HY'] },
          { key: 'dispatchMinutes', label: 'Mins', type: 'number' },
          { key: 'unloadTime', label: 'Unload', type: 'time' },
        ],
      },
      {
        id: 'vehicleSummary',
        label: 'Sub-A: Vehicle Summary',
        kind: 'summary',
        derived: true,
        derivedFrom: 'aggregateTrips',
        columns: [
          { key: 'vehicleNo', label: 'Vehicle No.', type: 'text' },
          { key: 'a', label: 'Ta Trips', type: 'number' },
          { key: 'b', label: 'HY Trips', type: 'number' },
          { key: 'total', label: 'Total', type: 'number' },
        ],
      },
      {
        id: 'excavators',
        label: 'Sub-B: Excavator Section',
        kind: 'rows',
        columns: [
          { key: 'excavatorName', label: 'Excavator', type: 'select', source: 'master.excavators' },
          { key: 'vehicleNo', label: 'Vehicle No.', type: 'select', source: 'master.vehicles' },
          { key: 'taTrips', label: 'TA Trips', type: 'number' },
          { key: 'weight', label: 'Weight', type: 'number' },
          { key: 'runningTA', label: 'Running TA', type: 'computed', calc: 'runningTA' },
        ],
      },
    ],
  },

  // 3. Drilling — fresh (US-24): hole-by-hole footage + diesel/fuel tracking.
  {
    type: 'drilling',
    label: 'Drilling Report',
    description: 'Shift ops, diesel tank meter, hole-by-hole footage.',
    enabled: true,
    shiftModel: 'single',
    orientation: 'portrait',
    sections: [
      {
        id: 'holes',
        label: 'Hole Log',
        kind: 'rows',
        columns: [
          { key: 'hole', label: 'Hole #', type: 'text' },
          { key: 'block', label: 'Block / Location', type: 'text' },
          { key: 'diameter', label: 'Diameter (mm)', type: 'number' },
          { key: 'footage', label: 'Footage (m)', type: 'number' },
        ],
      },
      {
        id: 'fuel',
        label: 'Diesel / Fuel Tracking',
        kind: 'rows',
        columns: [
          { key: 'machine', label: 'Machine', type: 'select', source: 'master.machines' },
          { key: 'tankOpen', label: 'Tank Meter Open', type: 'number' },
          { key: 'tankClose', label: 'Tank Meter Close', type: 'number' },
          { key: 'hours', label: 'Hours Run', type: 'number' },
          { key: 'consumption', label: 'Diesel (L)', type: 'computed', calc: 'dieselConsumption' },
        ],
      },
    ],
  },

  // 4. Blasting — fresh (US-25): explosive inventory + per-hole measurements.
  {
    type: 'blasting',
    label: 'Blasting Report',
    description: 'Explosive inventory, per-hole measurements, booster consumption.',
    enabled: true,
    shiftModel: 'single',
    orientation: 'portrait',
    sections: [
      {
        id: 'explosives',
        label: 'Explosive Inventory',
        kind: 'rows',
        columns: [
          { key: 'explosive', label: 'Explosive', type: 'select', source: 'master.explosives' },
          { key: 'qty', label: 'Quantity (kg)', type: 'number' },
          { key: 'booster', label: 'Booster (nos)', type: 'number' },
        ],
      },
      {
        id: 'holes',
        label: 'Per-Hole Measurements',
        kind: 'rows',
        columns: [
          { key: 'hole', label: 'Hole #', type: 'text' },
          { key: 'depth', label: 'Depth (m)', type: 'number' },
          { key: 'charge', label: 'Charge (kg)', type: 'number' },
        ],
      },
    ],
  },

  // 5. Diesel Logbook — fresh (US-26): wide per-machine consumption, landscape.
  {
    type: 'diesel',
    label: 'Diesel Logbook',
    description: 'Per-machine fuel consumption logbook (landscape).',
    enabled: true,
    shiftModel: 'single',
    orientation: 'landscape',
    sections: [
      {
        id: 'log',
        label: 'Machine Fuel Log',
        kind: 'rows',
        columns: [
          { key: '_sr', label: 'Sr.', type: 'number' },
          { key: 'machine', label: 'Machine', type: 'select', source: 'master.machines' },
          { key: 'operator', label: 'Operator', type: 'text' },
          { key: 'shift', label: 'Shift', type: 'select', options: ['Day', 'Night'] },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'openMeter', label: 'Open Meter', type: 'number' },
          { key: 'closeMeter', label: 'Close Meter', type: 'number' },
          { key: 'hours', label: 'Hours', type: 'number' },
          { key: 'rate', label: 'Rate L/hr', type: 'number' },
          { key: 'std', label: 'Std (L)', type: 'computed', calc: 'dieselConsumption' },
          { key: 'openStock', label: 'Open Stock', type: 'number' },
          { key: 'receipt', label: 'Receipt', type: 'number' },
          { key: 'issued', label: 'Issued (L)', type: 'number' },
          { key: 'closeStock', label: 'Close Stock', type: 'number' },
          { key: 'variance', label: 'Variance', type: 'computed', calc: 'dieselVariance' },
          { key: 'remarks', label: 'Remarks', type: 'text' },
        ],
      },
    ],
  },

  // 6. Daily Summary — fresh (US-27): rollup assembled from the day's reports.
  {
    type: 'daily_summary',
    label: 'Daily Summary Report',
    description: 'Auto-assembled summary from the day’s reports.',
    enabled: true,
    shiftModel: 'rollup',
    orientation: 'portrait',
    sections: [
      {
        id: 'summary',
        label: 'Daily Summary',
        kind: 'summary',
        derived: true,
        derivedFrom: 'dailyRollup',
        columns: [
          { key: 'metric', label: 'Metric', type: 'text' },
          { key: 'value', label: 'Value', type: 'text' },
        ],
      },
    ],
  },
]
