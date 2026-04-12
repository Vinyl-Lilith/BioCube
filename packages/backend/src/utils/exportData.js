// packages/backend/src/utils/exportData.js
// Converts SensorData documents into an Excel workbook buffer.
// The chart data is just a JSON array — the frontend renders it.

const XLSX = require('xlsx');

// ── buildExcelBuffer(rows) ────────────────────────────────────────────
// rows: array of SensorData Mongoose documents (or plain objects)
// Returns a Buffer containing a .xlsx file ready to be sent with res.send()
function buildExcelBuffer(rows) {
  // Map each Mongoose document to a flat plain-object row
  const data = rows.map(r => ({
    Timestamp:       r.createdAt ? r.createdAt.toISOString() : '',
    'Temp (°C)':     r.temperature    ?? 'N/A',
    'Humidity (%)':  r.humidity       ?? 'N/A',
    'Soil 1 (%)':    r.soilMoisture1  ?? 'N/A',
    'Soil 2 (%)':    r.soilMoisture2  ?? 'N/A',
    'N (ppm)':       r.nitrogen       ?? 'N/A',
    'P (ppm)':       r.phosphorus     ?? 'N/A',
    'K (ppm)':       r.potassium      ?? 'N/A',
  }));

  // Create a workbook with one sheet named "BioCube Data"
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BioCube Data');

  // Write to a Buffer (not a file) so we can send it directly over HTTP
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// ── buildChartData(rows) ──────────────────────────────────────────────
// Returns a plain JSON array usable by Recharts / Chart.js on the frontend.
// Each item is one data point with a timestamp and all sensor values.
function buildChartData(rows) {
  return rows.map(r => ({
    time:         r.createdAt ? r.createdAt.toISOString() : '',
    temperature:  r.temperature,
    humidity:     r.humidity,
    soilMoisture1:r.soilMoisture1,
    soilMoisture2:r.soilMoisture2,
    nitrogen:     r.nitrogen,
    phosphorus:   r.phosphorus,
    potassium:    r.potassium,
  }));
}

module.exports = { buildExcelBuffer, buildChartData };
