const fs = require('fs');
const Holidays = require('date-holidays');
const dayjs = require('dayjs');
const weekday = require('dayjs/plugin/weekday');
const isBetween = require('dayjs/plugin/isBetween');
const isoWeek = require('dayjs/plugin/isoWeek');

dayjs.extend(weekday);
dayjs.extend(isBetween);
dayjs.extend(isoWeek);

// Konfiguration
const YEAR = 2024;
const DISTANCE_KM = 29;
const CSV_PATH = 'pendlerpauschale_2024.csv';

// Berechnung der Pauschale
function calculateCost(km) {
  const first20 = Math.min(km, 20) * 0.30;
  const rest = Math.max(0, km - 20) * 0.38;
  return +(first20 + rest).toFixed(2);
}

// Relevante Wochentage (Mo=1, Di=2, Do=4)
const validWeekdays = [1, 2, 4];

// Ausgeschlossene Zeiträume
const excludedRanges = [
  ['2024-02-23', '2024-02-27'],
  ['2024-02-29', '2024-03-01'],
  ['2024-03-18', '2024-06-02'],
  ['2024-08-09', '2024-08-18'],
  ['2024-09-20', '2024-09-29'],
  ['2024-11-25', '2024-12-08'],
  ['2024-12-23', '2024-12-31'],
].map(([start, end]) => ({
  start: dayjs(start),
  end: dayjs(end)
}));

// Feiertage (bundesweit)
const hd = new Holidays('DE');
const holidays = new Set(
  hd.getHolidays(YEAR)
    .filter(h => h.type === 'public')
    .map(h => dayjs(h.date).format('YYYY-MM-DD'))
);

// Hauptlogik
const results = [];
let current = dayjs(`${YEAR}-01-01`);
const end = dayjs(`${YEAR}-12-31`);

while (current.isBefore(end) || current.isSame(end)) {
  const dayOfWeek = current.isoWeekday();

  // Prüfen ob gültiger Wochentag
  if (validWeekdays.includes(dayOfWeek)) {
    const dateStr = current.format('YYYY-MM-DD');

    // Prüfen ob Feiertag oder Ausschlusszeitraum
    const isHoliday = holidays.has(dateStr);
    const isExcluded = excludedRanges.some(({ start, end }) =>
      current.isBetween(start, end, 'day', '[]')
    );

    if (!isHoliday && !isExcluded) {
      results.push({
        datum: current.format('DD.MM.YYYY'),
        wochentag: current.format('dddd'),
        kilometer: DISTANCE_KM,
        kosten: calculateCost(DISTANCE_KM).toFixed(2).replace('.', ',') // deutsch: Komma
      });
    }
  }

  current = current.add(1, 'day');
}

// CSV generieren
let csv = 'Datum;Wochentag;Kilometer;Kosten (€)\n';
results.forEach(row => {
  csv += `${row.datum};${row.wochentag};${row.kilometer};${row.kosten}\n`;
});

fs.writeFileSync(CSV_PATH, csv, 'utf8');
console.log(`✅ CSV wurde gespeichert unter: ${CSV_PATH}`);