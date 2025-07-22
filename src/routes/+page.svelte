<script>
	import { browser } from '$app/environment';
	import dayjs from 'dayjs';
	import weekday from 'dayjs/plugin/weekday';
	import isBetween from 'dayjs/plugin/isBetween';
	import isoWeek from 'dayjs/plugin/isoWeek';
	import customParseFormat from 'dayjs/plugin/customParseFormat';
	import 'dayjs/locale/de';
	
	// shadcn-svelte UI components
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '$lib/components/ui/accordion';
	
	// Phosphor Icons
	import { CalendarBlank, List, Download, Gear, ChartBar, Info } from 'phosphor-svelte';
	
	// Only initialize in browser
	if (browser) {
		dayjs.extend(weekday);
		dayjs.extend(isBetween);
		dayjs.extend(isoWeek);
		dayjs.extend(customParseFormat);
		dayjs.locale('de');
	}

	// Reactive state using Svelte 5 runes
	let selected_year = $state(new Date().getFullYear() - 1);
	let distance_km = $state(12);
	let exclude_holidays = $state(true);
	let selected_region = $state('DE');
	let transportation_mode = $state('car'); // 'car', 'public_transport', 'other'
	
	// Weekdays state - [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
	let selected_weekdays = $state([true, true, true, true, true, false, false]);
	
	// Excluded date ranges - array of objects with start and end string properties
	let excluded_ranges = $state([]);

	let new_range_start = $state('');
	let new_range_end = $state('');
	let holidays = $state(new Set());
	let show_exceptions_dialog = $state(false);
	let active_mobile_tab = $state('config');
	let dialog_view = $state('calendar'); // 'calendar' or 'list'
	// Default open accordions - workdays section open by default
	let accordion_values = $state(["workdays"]);

	// Weekday names in German
	const weekday_names = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
	const weekday_abbreviations = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
	const month_names = [
		'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
		'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
	];

	// Legal limits - updated based on transportation mode
	const ANNUAL_PENDLERPAUSCHALE_LIMIT_NON_CAR = 4500; // euros per year for non-car transportation

	/**
	 * Get the applicable tax rates for the given year
	 * @param {number} year - The tax year
	 * @returns {{first_20km: number, after_20km: number}} Object with first_20km and after_20km rates
	 */
	function get_tax_rates(year) {
		if (year >= 2026) {
			// Starting 2026: 38 cents from first kilometer
			return {
				first_20km: 0.38,
				after_20km: 0.38
			};
		} else if (year >= 2022) {
			// 2022-2025: 30 cents first 20km, 38 cents after
			return {
				first_20km: 0.30,
				after_20km: 0.38
			};
		} else if (year === 2021) {
			// 2021: 30 cents first 20km, 35 cents after
			return {
				first_20km: 0.30,
				after_20km: 0.35
			};
		} else {
			// Before 2021: 30 cents flat rate
			return {
				first_20km: 0.30,
				after_20km: 0.30
			};
		}
	}


	// German regions for holiday calculation
	const german_regions = [
		{ code: 'DE', name: 'Deutschland (bundesweit)' },
		{ code: 'DE-BB', name: 'Brandenburg' },
		{ code: 'DE-BE', name: 'Berlin' },
		{ code: 'DE-BW', name: 'Baden-Württemberg' },
		{ code: 'DE-BY', name: 'Bayern' },
		{ code: 'DE-BY-A', name: 'Bayern - Stadt Augsburg' },
		{ code: 'DE-BY-EVANG', name: 'Bayern - Überwiegend evangelische Gemeinden' },
		{ code: 'DE-HB', name: 'Bremen' },
		{ code: 'DE-HE', name: 'Hessen' },
		{ code: 'DE-HH', name: 'Hamburg' },
		{ code: 'DE-MV', name: 'Mecklenburg-Vorpommern' },
		{ code: 'DE-NI', name: 'Niedersachsen' },
		{ code: 'DE-NW', name: 'Nordrhein-Westfalen' },
		{ code: 'DE-RP', name: 'Rheinland-Pfalz' },
		{ code: 'DE-SH', name: 'Schleswig-Holstein' },
		{ code: 'DE-SL', name: 'Saarland' },
		{ code: 'DE-SN', name: 'Sachsen' },
		{ code: 'DE-SN-BZ', name: 'Sachsen - Landkreis Bautzen' },
		{ code: 'DE-ST', name: 'Sachsen-Anhalt' },
		{ code: 'DE-TH', name: 'Thüringen' },
		{ code: 'DE-TH-EIC', name: 'Thüringen - Landkreis Eichfeld' },
		{ code: 'DE-TH-UH', name: 'Thüringen - Unstrut-Hainich-Kreis' },
		{ code: 'DE-TH-WAK', name: 'Thüringen - Wartburgkreis' }
	];

	/**
	 * Calculate the cost based on distance and year
	 * @param {number} km - Distance in kilometers
	 * @param {number} year - Tax year for rate determination
	 * @returns {number} Cost in euros
	 */
	function calculate_cost(km, year = selected_year) {
		const rates = get_tax_rates(year);
		if (year >= 2026) {
			// From 2026: flat rate of 38 cents
			return +(km * rates.first_20km).toFixed(2);
		} else {
			// Before 2026: tiered rates
			const first_20 = Math.min(km, 20) * rates.first_20km;
			const rest = Math.max(0, km - 20) * rates.after_20km;
			return +(first_20 + rest).toFixed(2);
		}
	}

	/**
	 * Load German holidays for the selected year
	 */
	async function load_holidays() {
		if (!browser) return;
		
		try {
			const { default: Holidays } = await import('date-holidays');
			const hd = new Holidays(selected_region);
			const holiday_dates = new Set(
				hd.getHolidays(selected_year)
					.filter(h => h.type === 'public')
					.map(h => dayjs(h.date).format('YYYY-MM-DD'))
			);
			holidays = holiday_dates;
		} catch (error) {
			console.warn('Could not load holidays:', error);
			holidays = new Set();
		}
	}

	// Load holidays when year or region changes
	$effect(() => {
    if(selected_year) {
      load_holidays();
    }
	});

	// Computed results using derived state
	let calculated_results = $derived.by(() => {
		if (!browser) return [];
		
		const results = [];
		
		// Get selected weekday indices (1=Monday, 7=Sunday)
		const valid_weekdays = selected_weekdays
			.map((selected, index) => selected ? index + 1 : null)
			.filter(day => day !== null);

		// Parse excluded ranges
		const parsed_excluded_ranges = excluded_ranges
			.filter(range => range.start && range.end)
			.map(range => ({
				start: dayjs(range.start),
				end: dayjs(range.end)
			}));

		let current = dayjs(`${selected_year}-01-01`);
		const end = dayjs(`${selected_year}-12-31`);

		while (current.isBefore(end) || current.isSame(end)) {
			const day_of_week = current.isoWeekday();

			// Check if it's a valid weekday
			if (valid_weekdays.includes(day_of_week)) {
				const date_str = current.format('YYYY-MM-DD');

				// Check if it's a holiday or excluded
				const is_holiday = holidays.has(date_str);
				const is_excluded = parsed_excluded_ranges.some(({ start, end }) =>
					current.isBetween(start, end, 'day', '[]')
				);

				if (!(exclude_holidays && is_holiday) && !is_excluded) {
					results.push({
						date: current.format('DD.MM.YYYY'),
						weekday: current.format('dddd'),
						kilometers: distance_km,
						cost: calculate_cost(distance_km, selected_year)
					});
				}
			}

			current = current.add(1, 'day');
		}

		return results;
	});

	// Summary calculations - updated to handle transportation-specific limits
	let summary = $derived.by(() => {
		const results_array = calculated_results;
		if (!Array.isArray(results_array)) return { 
			total_days: 0, 
			total_distance: 0, 
			total_cost: 0,
			limited_cost: 0,
			exceeds_limit: false,
			is_car_unlimited: false
		};
		
		const total_days = results_array.length;
		const total_distance = total_days * distance_km;
		const calculated_cost = results_array.reduce((sum, result) => sum + result.cost, 0);
		const total_cost = +calculated_cost.toFixed(2);
		
		// Apply limits based on transportation mode
		const is_car_unlimited = transportation_mode === 'car';
		const limit = is_car_unlimited ? Infinity : ANNUAL_PENDLERPAUSCHALE_LIMIT_NON_CAR;
		const limited_cost = Math.min(total_cost, limit);
		const exceeds_limit = total_cost > limit;

		return {
			total_days,
			total_distance,
			total_cost,
			limited_cost,
			exceeds_limit,
			is_car_unlimited
		};
	});

	/**
	 * Add a new excluded date range
	 */
	function add_excluded_range() {
		if (new_range_start && new_range_end) {
			excluded_ranges.push({
				start: new_range_start,
				end: new_range_end
			});
			new_range_start = '';
			new_range_end = '';
		}
	}

	/**
	 * Remove an excluded date range
	 * @param {number} index - Index of the range to remove
	 */
	function remove_excluded_range(index) {
		excluded_ranges.splice(index, 1);
	}

	/**
	 * Export results as CSV
	 */
	function export_csv() {
		let csv = 'Datum;Wochentag;Kilometer;Kosten (€)\n';
		
		const results = calculated_results;
		results.forEach(row => {
			const cost_formatted = row.cost.toFixed(2).replace('.', ',');
			csv += `${row.date};${row.weekday};${row.kilometers};${cost_formatted}\n`;
		});

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		
		if (link.download !== undefined) {
			const url = URL.createObjectURL(blob);
			link.setAttribute('href', url);
			link.setAttribute('download', `pendlerpauschale_${selected_year}.csv`);
			link.style.visibility = 'hidden';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	/**
	 * Generate calendar data for the entire year
	 */
	let calendar_data = $derived.by(() => {
		if (!browser) return [];
		
		const commute_dates = new Set(
			calculated_results.map(result => {
				// Convert DD.MM.YYYY back to YYYY-MM-DD for easy comparison
				const [day, month, year] = result.date.split('.');
				return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
			})
		);

		const calendar_months = [];

		for (let month = 0; month < 12; month++) {
			const first_day = dayjs(`${selected_year}-${(month + 1).toString().padStart(2, '0')}-01`);
			const last_day = first_day.endOf('month');
			
			// Start from Monday of the week containing the first day of the month
			let current_date = first_day.startOf('isoWeek');
			
			const weeks = [];
			
			// Generate 6 weeks (42 days) for consistent month grid
			for (let week = 0; week < 6; week++) {
				const days = [];
				
				for (let day = 0; day < 7; day++) {
					const is_current_month = current_date.month() === month;
					const date_string = current_date.format('YYYY-MM-DD');
					const is_commute_day = commute_dates.has(date_string);
					const is_excluded = is_date_excluded(date_string);
					const is_holiday = holidays.has(date_string);
					
					days.push({
						date: current_date.date(),
						full_date: date_string,
						is_current_month,
						is_commute_day,
						is_excluded,
						is_holiday,
						day_of_week: current_date.isoWeekday()
					});
					
					current_date = current_date.add(1, 'day');
				}
				
				weeks.push(days);
			}
			
			calendar_months.push({
				name: month_names[month],
				weeks
			});
		}

		return calendar_months;
	});

	/**
	 * Check if a date is currently excluded
	 * @param {string} date_string - Date in YYYY-MM-DD format
	 * @returns {boolean}
	 */
	function is_date_excluded(date_string) {
		return excluded_ranges.some(range => {
			const start = dayjs(range.start);
			const end = dayjs(range.end);
			const date = dayjs(date_string);
			return date.isBetween(start, end, 'day', '[]');
		});
	}

	/**
	 * Toggle exclusion for a specific date with smart range grouping
	 * @param {string} date_string - Date in YYYY-MM-DD format
	 */
	function toggle_date_exclusion(date_string) {
		if (is_date_excluded(date_string)) {
			remove_date_from_exclusions(date_string);
		} else {
			add_date_to_exclusions(date_string);
		}
	}

	/**
	 * Add a date to exclusions with smart range merging
	 * @param {string} date_string - Date in YYYY-MM-DD format
	 */
	function add_date_to_exclusions(date_string) {
		const new_date = dayjs(date_string);
		const new_ranges = [...excluded_ranges];
		
		// Find adjacent ranges
		let merge_start_idx = -1;
		let merge_end_idx = -1;
		
		for (let i = 0; i < new_ranges.length; i++) {
			const range = new_ranges[i];
			const range_start = dayjs(range.start);
			const range_end = dayjs(range.end);
			
			// Check if new date is adjacent to this range
			if (new_date.add(1, 'day').isSame(range_start, 'day')) {
				// New date is one day before range start
				merge_start_idx = i;
			} else if (new_date.subtract(1, 'day').isSame(range_end, 'day')) {
				// New date is one day after range end
				merge_end_idx = i;
			}
		}
		
		if (merge_start_idx !== -1 && merge_end_idx !== -1) {
			// Merge two ranges with the new date in between
			const start_range = new_ranges[merge_end_idx];
			const end_range = new_ranges[merge_start_idx];
			
			// Create merged range
			const merged_range = {
				start: start_range.start,
				end: end_range.end
			};
			
			// Remove old ranges and add merged range
			new_ranges.splice(Math.max(merge_start_idx, merge_end_idx), 1);
			new_ranges.splice(Math.min(merge_start_idx, merge_end_idx), 1, merged_range);
		} else if (merge_start_idx !== -1) {
			// Extend range start backwards
			new_ranges[merge_start_idx].start = date_string;
		} else if (merge_end_idx !== -1) {
			// Extend range end forwards
			new_ranges[merge_end_idx].end = date_string;
		} else {
			// Create new single-day range
			new_ranges.push({
				start: date_string,
				end: date_string
			});
		}
		
		// Sort ranges by start date
		new_ranges.sort((a, b) => dayjs(a.start).diff(dayjs(b.start)));
		
		excluded_ranges = new_ranges;
	}

	/**
	 * Remove a date from exclusions with smart range splitting
	 * @param {string} date_string - Date in YYYY-MM-DD format
	 */
	function remove_date_from_exclusions(date_string) {
		const remove_date = dayjs(date_string);
		const new_ranges = [];
		
		for (const range of excluded_ranges) {
			const range_start = dayjs(range.start);
			const range_end = dayjs(range.end);
			
			if (remove_date.isBetween(range_start, range_end, 'day', '[]')) {
				// Date is in this range, need to handle removal
				if (remove_date.isSame(range_start, 'day') && remove_date.isSame(range_end, 'day')) {
					// Single day range, remove entirely
					continue;
				} else if (remove_date.isSame(range_start, 'day')) {
					// Remove first day of range
					new_ranges.push({
						start: remove_date.add(1, 'day').format('YYYY-MM-DD'),
						end: range.end
					});
				} else if (remove_date.isSame(range_end, 'day')) {
					// Remove last day of range
					new_ranges.push({
						start: range.start,
						end: remove_date.subtract(1, 'day').format('YYYY-MM-DD')
					});
				} else {
					// Remove middle day, split range
					new_ranges.push({
						start: range.start,
						end: remove_date.subtract(1, 'day').format('YYYY-MM-DD')
					});
					new_ranges.push({
						start: remove_date.add(1, 'day').format('YYYY-MM-DD'),
						end: range.end
					});
				}
			} else {
				// Range doesn't contain the date, keep as is
				new_ranges.push(range);
			}
		}
		
		excluded_ranges = new_ranges;
	}

	/**
	 * Get tooltip text for a calendar day
	 * @param {any} day - Day object with status information
	 * @returns {string}
	 */
	function get_day_tooltip(day) {
		if (day.is_excluded) {
			return `${day.full_date} - Ausgeschlossen (Klicken zum Einschließen)`;
		} else if (exclude_holidays && day.is_holiday) {
			return `${day.full_date} - Feiertag (automatisch ausgeschlossen)`;
		} else if (day.is_commute_day) {
			return `${day.full_date} - Fahrtag (Klicken zum Ausschließen)`;
		} else {
			return `${day.full_date} - Kein Fahrtag (Klicken zum Ausschließen)`;
		}
	}

	/**
	 * Handle calendar day clicks
	 * @param {any} day - Day object with status information
	 */
	function handle_calendar_day_click(day) {
		if (exclude_holidays && day.is_holiday) {
			alert('Feiertage können nicht ausgewählt werden, während die Feiertagsausschließung aktiviert ist. Deaktivieren Sie die Feiertagsausschließung, um Feiertage manuell zu verwalten.');
			return;
		}
		
		toggle_date_exclusion(day.full_date);
	}
</script>

<svelte:head>
	<title>Pendlerpauschale / Entfernungspauschale Rechner - Deutschland Einkommensteuer</title>
	<meta name="description" content="Berechnen Sie präzise Ihre steuerlich absetzbaren Fahrtkosten für Pendlerpauschale und Entfernungspauschale in Deutschland. Unser Rechner berücksichtigt verschiedene Steuerjahre, Verkehrsmittel und individuelle Ausnahmen.">
	<meta name="keywords" content="Pendlerpauschale, Entfernungspauschale, Fahrtkosten, Einkommensteuer, Steuerrechner, Deutschland, Arbeitnehmer, Student, Selbstständiger">
	<meta name="author" content="pendler-pauschale.de">
	<meta name="robots" content="index, follow">
	<link rel="canonical" href="https://pendler-pauschale.de">
	
	<!-- Open Graph -->
	<meta property="og:title" content="Pendlerpauschale / Entfernungspauschale Rechner - Deutschland Einkommensteuer">
	<meta property="og:description" content="Berechnen Sie präzise Ihre steuerlich absetzbaren Fahrtkosten für Pendlerpauschale und Entfernungspauschale in Deutschland. Unser Rechner berücksichtigt verschiedene Steuerjahre, Verkehrsmittel und individuelle Ausnahmen.">
	<meta property="og:type" content="website">
	<meta property="og:url" content="https://pendler-pauschale.de">
	<meta property="og:image" content="https://pendler-pauschale.de/logo.png">
	<meta property="og:locale" content="de_DE">
	<meta property="og:site_name" content="pendler-pauschale.de">
	
	<!-- Twitter Card -->
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="Pendlerpauschale / Entfernungspauschale Rechner - Deutschland Einkommensteuer">
	<meta name="twitter:description" content="Berechnen Sie präzise Ihre steuerlich absetzbaren Fahrtkosten für Pendlerpauschale und Entfernungspauschale in Deutschland. Unser Rechner berücksichtigt verschiedene Steuerjahre, Verkehrsmittel und individuelle Ausnahmen.">
	<meta name="twitter:image" content="https://pendler-pauschale.de/logo.png">
	
	<!-- Structured Data -->
	<script type="application/ld+json">
	{
		"@context": "https://schema.org",
		"@type": "WebApplication",
		"name": "Pendlerpauschale Rechner",
		"description": "Berechnen Sie präzise Ihre steuerlich absetzbaren Fahrtkosten für Pendlerpauschale und Entfernungspauschale in Deutschland",
		"applicationCategory": "FinanceApplication",
		"operatingSystem": "Web Browser",
		"url": "https://pendler-pauschale.de",
		"offers": {
			"@type": "Offer",
			"price": "0",
			"priceCurrency": "EUR"
		},
		"inLanguage": "de-DE",
		"isAccessibleForFree": true,
		"creator": {
			"@type": "Organization",
			"name": "pendler-pauschale.de"
		}
	}
	</script>
</svelte:head>

<div class="bg-muted">
	<!-- Header -->
	<header class="border-b bg-muted">
		<div class="container mx-auto px-6 py-8">
										<div class="text-center">
								<h1 class="text-2xl font-bold tracking-tight uppercase">{transportation_mode === 'car' ? '🚗' : transportation_mode === 'public_transport' ? '🚌' : '🚲'} Pendlerpauschale Rechner</h1>
								<div class="mt-2">
									<p class="text-muted-foreground">Berechnen Sie schnell und einfach Ihre steuerlich absetzbaren Fahrtkosten</p>
									
									<details class="mt-4">
										<summary class="cursor-pointer text-sm text-primary hover:underline">
											Was ist die Pendlerpauschale? <em>(mehr lesen)</em>
										</summary>
										<div class="mt-4 text-left max-w-4xl mx-auto bg-muted/50 p-6 rounded-lg space-y-4">
											<p>
												Die Pendlerpauschale (auch Entfernungspauschale genannt) ermöglicht es Arbeitnehmern, Studenten, Selbstständigen und anderen Steuerpflichtigen, ihre Fahrtkosten zwischen Wohnung und 
												erster Tätigkeitsstätte steuerlich geltend zu machen. Sie können die Pauschale unabhängig vom genutzten Verkehrsmittel ansetzen.
											</p>
											
											<div>
												<h4 class="mb-2 uppercase tracking-wide">Wichtige Grundsätze</h4>
												<p>
													Als Arbeitsweg dürfen Sie lediglich die kürzeste Verbindung zwischen Ihrer Wohnung und Ihrer ersten Tätigkeitsstätte ansetzen.
													Verkehrsgünstigere Strecken oder Umwege (z.B. um Kinder zum Kindergarten zu bringen) dürfen nicht berücksichtigt werden.
													Es wird nur die einfache Entfernung (nicht Hin- und Rückweg) für die Berechnung verwendet.
													Urlaubs-, Krankheits-, Feiertags- und Homeoffice-Tage zählen nicht.
													Längere Strecken nur bei deutlicher und regelmäßiger Zeitersparnis.
                        </p>
											</div>
											<hr>
											<div>
												<h4 class="mb-2 uppercase tracking-wide">Aktuelle Berechnungsgrundlage</h4>
												<p class="mb-2">Die Pendlerpauschale entwickelt sich wie folgt:</p>
												<ul class="list-disc list-inside space-y-1">
													<li><em>2022-2025:</em> 30 Cent für die ersten 20 Kilometer, 38 Cent ab dem 21. Kilometer</li>
													<li><em>Ab 2026:</em> 38 Cent pro Kilometer von Beginn an (geplant)</li>
													<li><em>2021:</em> 30 Cent für die ersten 20 Kilometer, 35 Cent ab dem 21. Kilometer</li>
													<li><em>Vor 2021:</em> 30 Cent pauschal pro Kilometer</li>
												</ul>
											</div>
											<hr>
											<div>
												<h4 class="mb-2 uppercase tracking-wide">Höchstbeträge nach Verkehrsmittel</h4>
												<ul class="list-disc list-inside space-y-1">
													<li><em>Autofahrer:</em> Unbegrenzte steuerliche Absetzbarkeit</li>
													<li><em>Andere Verkehrsmittel</em> (ÖPNV, Fahrrad, zu Fuß): Begrenzt auf {ANNUAL_PENDLERPAUSCHALE_LIMIT_NON_CAR.toLocaleString('de-DE', { 
														style: 'currency', 
														currency: 'EUR' 
													})} pro Jahr</li>
													<li><em>Alternative:</em> Angabe der tatsächlichen Kosten (z.B. Jahresticket für Bus oder Bahn)</li>
												</ul>
											</div>
                      <hr>
											<div>
												<h4 class="mb-2 uppercase tracking-wide">Beispielrechnungen</h4>
												<p class="mb-2">
													Ihr täglicher Fahrtweg beträgt 25 Kilometer. Die Berechnung variiert je nach Steuerjahr:
												</p>
												<div class="space-y-3">
													<div class="bg-background p-4 rounded-md border">
														<p class="font-semibold mb-1">Ab 2026 (geplant):</p>
														<p class="font-mono">25 km × 0,38 € = 9,50 € pro Arbeitstag</p>
													</div>
													<div class="bg-background p-4 rounded-md border">
														<p class="font-semibold mb-1">2022-2025:</p>
														<p class="font-mono">0,30 € × 20 km + 0,38 € × 5 km = 7,90 € pro Arbeitstag</p>
													</div>
												</div>
											</div>
											
											<p class="text-sm text-muted-foreground">
												<strong>Wichtig:</strong> Je nach Verkehrsmittel gelten unterschiedliche Höchstbeträge. Unser Rechner berücksichtigt automatisch die korrekten Grenzen basierend auf Ihrem gewählten Verkehrsmittel.
											</p>
										</div>
									</details>
								</div>
							</div>
		</div>
	</header>

	<main class="container mx-auto px-6 py-8">

		<!-- Mobile Tab Navigation -->
		<div class="md:hidden mb-6">
			<Tabs bind:value={active_mobile_tab} class="">
				<TabsList class="grid w-full grid-cols-2">
					<TabsTrigger value="config" class="flex items-center gap-2 uppercase">
						<Gear size={18} />
						Einstellungen
					</TabsTrigger>
					<TabsTrigger value="results" class="flex items-center gap-2 uppercase">
						<ChartBar size={18} />
						Berechnung
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>

		<!-- Main Layout -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			<!-- Configuration Section -->
			<div class="md:col-span-2 space-y-6" class:hidden={active_mobile_tab !== 'config'} class:md:block={true}>
				<!-- Distance Settings - Always Visible -->
				<div class="border rounded-lg bg-background">
					<div class="border-b p-4">
						<h3 class="font-bold uppercase">Entfernung und Verkehrsmittel</h3>
					</div>
					<div class="p-4 space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="distance" class="text-sm">Kürzeste Entfernung zwischen Wohnung und erster Tätigkeitsstätte</Label>
								<div class="flex items-center gap-2">
									<Input 
										id="distance" 
										type="number" 
										bind:value={distance_km} 
										min="1" 
										max="999999"
										step="1"
										placeholder="z.B. 25"
										class="flex-1"
									/>
									<div class="flex items-center gap-1">
										<span class="text-sm text-muted-foreground">km</span>
										<div class="tooltip-container relative">
											<Info size={14} class="text-muted-foreground cursor-help" />
											<div class="tooltip-content absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 invisible transition-all duration-200 whitespace-nowrap z-50">
												<div class="text-xs text-muted-foreground space-y-1">
                          <p>Nur die kürzeste Verbindung ist steuerlich zulässig</p>
                          <p>Keine Umwege (z.B. Kindergarten, Einkäufe)</p>
                          <p>Verkehrsgünstigere Strecken nur bei deutlicher Zeitersparnis</p>
                        </div>
											</div>
										</div>
									</div>
								</div>								
							</div>
							<div class="space-y-2">
								<Label for="year" class="text-sm">Steuerjahr</Label>
                <div class="flex items-center gap-2">
								<Input 
									id="year" 
									type="number" 
									bind:value={selected_year} 
									min="2020" 
									max={new Date().getFullYear() + 1}
									step="1"
									placeholder="z.B. 2024"
									class="flex-1"
								/>
								<div class="tooltip-container relative">
									<Info size={14} class="text-muted-foreground cursor-help" />
									<div class="tooltip-content absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 invisible transition-all duration-200 whitespace-nowrap z-50">
										<div class="text-xs text-muted-foreground space-y-1">
											{#if selected_year >= 2026}
												<p><strong>Ab 2026:</strong> 38 Cent/km von Anfang an</p>
											{:else if selected_year >= 2022}
												<p><strong>2022-2025:</strong> 30 Cent (1-20km), 38 Cent (ab 21km)</p>
											{:else if selected_year === 2021}
												<p><strong>2021:</strong> 30 Cent (1-20km), 35 Cent (ab 21km)</p>
											{:else}
												<p><strong>Vor 2021:</strong> 30 Cent/km pauschal</p>
											{/if}
										</div>
									</div>
								  </div>
								</div>
							</div>
						</div>
						
						<div class="space-y-2">
							<Label for="transportation" class="text-sm">Genutztes Verkehrsmittel</Label>
							<select 
								id="transportation"
								bind:value={transportation_mode} 
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								<option value="car">PKW (unbegrenzte Absetzbarkeit)</option>
								<option value="public_transport">Öffentliche Verkehrsmittel (begrenzt auf 4.500 €/Jahr)</option>
								<option value="other">Fahrrad, zu Fuß oder andere (begrenzt auf 4.500 €/Jahr)</option>
							</select>
							<p class="text-xs text-muted-foreground">
								{#if transportation_mode === 'car'}
									Als Autofahrer können Sie die Pendlerpauschale in unbegrenzter Höhe steuerlich absetzen.
									{#if selected_year >= 2026}
										Ab 2026: 38 Cent pro Kilometer von Beginn an.
									{:else if selected_year >= 2022}
										2022-2025: 30 Cent (1-20km), 38 Cent (ab 21km).
									{/if}
								{:else}
									Die Pendlerpauschale ist für Ihr Verkehrsmittel auf 4.500 € pro Jahr begrenzt. 
									{#if selected_year >= 2026}
										Ab 2026: 38 Cent pro Kilometer von Beginn an.
									{:else if selected_year >= 2022}
										2022-2025: 30 Cent (1-20km), 38 Cent (ab 21km).
									{/if}
									Alternativ können Sie tatsächliche Kosten (z.B. Jahresticket) angeben.
								{/if}
							</p>
						</div>
					</div>
				</div>

        <Accordion bind:value={accordion_values} class="w-full" type="multiple">
					<!-- Work Days -->
					<AccordionItem value="workdays" class="bg-background border rounded-lg px-4 mb-5">
						<AccordionTrigger class="font-bold uppercase">Arbeitstage und Feiertage</AccordionTrigger>
						<AccordionContent class="space-y-6">
							<div class="space-y-3">
								<div class="grid grid-cols-7 gap-2">
									{#each weekday_names as day, index}
										<div class="flex flex-col items-center space-y-2">
											<Label class="text-xs">{weekday_abbreviations[index]}</Label>
											<Checkbox bind:checked={selected_weekdays[index]} class="bg-background" />
										</div>
									{/each}
								</div>
								<div class="text-xs text-muted-foreground space-y-1">
									<p><strong>Nur tatsächliche Arbeitstage zählen:</strong></p>
									<p>• Urlaubs-, Krankheits- und Homeoffice-Tage sind ausgeschlossen</p>
									<p>• Verwenden Sie "Ausnahmen" für individuelle arbeitsfreie Zeiträume</p>
									<p>• Pendlerpauschale gilt nur für einfache Wegstrecke (nicht Hin- und Rückweg)</p>
								</div>
							</div>

							<div class="space-y-4">
								<div class="flex items-center space-x-3">
									<Checkbox bind:checked={exclude_holidays} id="exclude-holidays" class="bg-background" />
									<Label for="exclude-holidays" class="text-sm">Feiertage automatisch ausschließen</Label>
								</div>
								
								{#if exclude_holidays}
									<div class="space-y-2">
										<select bind:value={selected_region} class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
											{#each german_regions as region}
												<option value={region.code}>{region.name}</option>
											{/each}
										</select>
										<p class="text-xs text-muted-foreground">Wählen Sie Ihr Bundesland für die korrekten Feiertage</p>
									</div>
								{/if}
							</div>
						</AccordionContent>
					</AccordionItem>

					<!-- Exceptions and Overview -->
					<AccordionItem value="overview" class="bg-background border rounded-lg px-4">
						<AccordionTrigger class="font-bold uppercase">Kalender und Ausnahmen</AccordionTrigger>
						<AccordionContent class="space-y-6">
							<div class="flex flex-col sm:flex-row gap-4 justify-between">								
								<div class="flex gap-2">
									<button onclick={() => show_exceptions_dialog = true} class="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-black text-white px-4 py-2 text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
										<Gear size={16} />
										Ausnahmen
									</button>

									<button onclick={export_csv} class="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
										<Download size={16} />
										CSV herunterladen
									</button>
								</div>

                <div class="flex flex-wrap gap-3 text-sm">
									<div class="flex items-center gap-2">
										<div class="w-4 h-4 rounded-full bg-green-400"></div>
										<span>Fahrtag (wird berechnet)</span>
									</div>
									<div class="flex items-center gap-2">
										<div class="w-4 h-4 rounded-full bg-red-400"></div>
										<span>Ausgeschlossener Tag</span>
									</div>
									{#if exclude_holidays}
										<div class="flex items-center gap-2">
											<div class="w-4 h-4 rounded-full bg-yellow-400"></div>
											<span>Feiertag (ausgeschlossen)</span>
										</div>
									{/if}
								</div>
							</div>

							<!-- Calendar Legend -->
							<div class="space-y-3">
								
							</div>

              <Tabs bind:value={dialog_view} class="flex-1">
                <TabsList class="grid w-full grid-cols-2">
                  <TabsTrigger value="calendar" class="flex items-center gap-2">
                    <CalendarBlank size={16} />
                    Kalender
                  </TabsTrigger>
                  <TabsTrigger value="list" class="flex items-center gap-2">
                    <List size={16} />
                    Tabelle
                  </TabsTrigger>
                </TabsList>
              </Tabs>


							<!-- Calendar/Table Content -->
							<div class="mt-6">
								{#if dialog_view === 'calendar'}
									<!-- Calendar View -->
									<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
										{#each calendar_data as month}
											<div class="bg-card border rounded-lg p-4">
												<h5 class="font-bold text-center mb-3 uppercase">{month.name}</h5>
												<div class="grid grid-cols-7 gap-1">
													<!-- Weekday headers -->
													{#each weekday_abbreviations as weekday}
														<div class="text-center text-xs font-bold p-1">{weekday}</div>
													{/each}
													<!-- Calendar days -->
													{#each month.weeks as week}
														{#each week as day}
															<button 
																class="aspect-square text-xs rounded-full flex items-center justify-center transition-colors
																	{!day.is_current_month ? 'text-muted-foreground opacity-30' : ''}
																	{day.is_commute_day ? 'bg-green-400 text-black hover:bg-green-600 hover:text-black' : ''}
																	{day.is_excluded ? 'bg-red-400 text-black hover:bg-red-600 hover:text-black' : ''}
																	{exclude_holidays && day.is_holiday ? 'bg-yellow-400 text-black hover:bg-yellow-600 hover:text-black' : ''}
																	{!(exclude_holidays && day.is_holiday) && !day.is_commute_day && !day.is_excluded ? 'hover:bg-muted hover:text-foreground cursor-pointer' : ''}
																	{exclude_holidays && day.is_holiday ? 'cursor-not-allowed' : 'cursor-pointer'}
																"
																title={get_day_tooltip(day)}
																onclick={() => handle_calendar_day_click(day)}
																disabled={exclude_holidays && day.is_holiday}
															>
																{day.date}
															</button>
														{/each}
													{/each}
												</div>
											</div>
										{/each}
									</div>
									
								{:else}
									<!-- List View -->
									<div class="bg-card border rounded-lg">
										<table class="w-full">
											<thead>
												<tr class="border-b">
													<th class="text-left p-4 font-bold uppercase">Datum</th>
													<th class="text-left p-4 font-bold uppercase">Wochentag</th>
													<th class="text-left p-4 font-bold uppercase">Entfernung (km)</th>
													<th class="text-left p-4 font-bold uppercase">Pauschale (€)</th>
												</tr>
											</thead>
											<tbody>
												{#each calculated_results as result}
													<tr class="border-b">
														<td class="p-4">{result.date}</td>
														<td class="p-4">{result.weekday}</td>
														<td class="p-4">{result.kilometers}</td>
														<td class="p-4">{result.cost.toLocaleString('de-DE', { 
															style: 'currency', 
															currency: 'EUR' 
														})}</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{/if}
							</div>
						</AccordionContent>
					</AccordionItem>

          <div class="mb-4">
            
          </div>
				</Accordion>
			</div>

			<!-- Results Section -->
			<div class="space-y-6" class:hidden={active_mobile_tab !== 'results'} class:md:block={true}>
				<div class="bg-card border rounded-lg sticky top-6">
					<div class="p-6">
						<h2 class="font-bold text-lg mb-2 uppercase">Ihre Pendlerpauschale {selected_year}</h2>
						<div class="text-sm text-muted-foreground mb-6">
							<p>Zusammenfassung für die Steuererklärung</p>
							{#if selected_year >= 2026}
								<p class="text-xs mt-1"><strong>Steuersätze {selected_year}:</strong> 38 Cent pro Kilometer</p>
							{:else if selected_year >= 2022}
								<p class="text-xs mt-1"><strong>Steuersätze {selected_year}:</strong> 30 Cent (1-20km), 38 Cent (ab 21km)</p>
							{:else if selected_year === 2021}
								<p class="text-xs mt-1"><strong>Steuersätze {selected_year}:</strong> 30 Cent (1-20km), 35 Cent (ab 21km)</p>
							{:else}
								<p class="text-xs mt-1"><strong>Steuersätze {selected_year}:</strong> 30 Cent pro Kilometer</p>
							{/if}
						</div>
					
						<div class="space-y-4">
							<div class="text-center p-4 bg-muted rounded-lg">
								<div class="text-2xl font-bold">{summary?.total_days || 0}</div>
								<div class="text-sm text-muted-foreground uppercase">Arbeitstage mit Fahrtweg</div>
							</div>
							
							<div class="text-center p-4 bg-muted rounded-lg">
								<div class="text-2xl font-bold">{(summary?.total_distance || 0).toLocaleString('de-DE')} km</div>
								<div class="text-sm text-muted-foreground uppercase">Gesamtstrecke (einfach)</div>
							</div>
							
							<div class="text-center p-4 bg-green-400 text-black rounded-lg">
								{#if summary?.exceeds_limit}
									<div class="text-2xl font-bold">{(summary?.limited_cost || 0).toLocaleString('de-DE', { 
										style: 'currency', 
										currency: 'EUR' 
									})}</div>
									<div class="text-sm font-medium uppercase">Steuerliche Absetzbarkeit</div>
									<div class="text-xs mt-1">
										Berechnet: {(summary?.total_cost || 0).toLocaleString('de-DE', { 
											style: 'currency', 
											currency: 'EUR' 
										})} {#if !summary?.is_car_unlimited}(auf {ANNUAL_PENDLERPAUSCHALE_LIMIT_NON_CAR.toLocaleString('de-DE', { 
											style: 'currency', 
											currency: 'EUR' 
										})} begrenzt){/if}
									</div>
								{:else}
									<div class="text-2xl font-bold">{(summary?.total_cost || 0).toLocaleString('de-DE', { 
										style: 'currency', 
										currency: 'EUR' 
									})}</div>
									<div class="text-sm font-medium uppercase">
										Steuerliche Absetzbarkeit
										{#if summary?.is_car_unlimited}
											<span class="text-xs block">PKW - unbegrenzt</span>
										{:else}
											<span class="text-xs block">Begrenzt auf {ANNUAL_PENDLERPAUSCHALE_LIMIT_NON_CAR.toLocaleString('de-DE', { 
												style: 'currency', 
												currency: 'EUR' 
											})}/Jahr</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
						
						{#if summary?.exceeds_limit && !summary?.is_car_unlimited}
							<div class="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
								<strong class="uppercase">⚠️ Höchstbetrag erreicht</strong><br>
								<span class="text-sm">
									Für Ihr gewähltes Verkehrsmittel ist die Entfernungspauschale auf {ANNUAL_PENDLERPAUSCHALE_LIMIT_NON_CAR.toLocaleString('de-DE', { 
										style: 'currency', 
										currency: 'EUR' 
									})} pro Kalenderjahr begrenzt. Ihr berechneter Betrag übersteigt diese Grenze.
									<br><br>
									<strong>Tipp:</strong> Als Alternative können Sie die tatsächlichen Kosten (z.B. Jahresticket für ÖPNV) in Ihrer Steuererklärung angeben, falls diese höher sind.
								</span>
							</div>
						{/if}

						{#if calculated_results.length === 0}
							<div class="mt-6 p-4 bg-muted rounded-lg">
								<span class="text-sm text-muted-foreground italic">Keine Fahrtage gefunden. Bitte überprüfen Sie Ihre Einstellungen - möglicherweise sind alle Arbeitstage durch Ausnahmen oder Feiertage ausgeschlossen.</span>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</main>

	<!-- Dialog for exceptions - outside accordion to prevent DOM conflicts -->
	<Dialog bind:open={show_exceptions_dialog}>
		<DialogContent class="min-w-[800px] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-auto" portalProps={{}}>
					<DialogHeader class="">
			<DialogTitle class="">Ausnahmen verwalten</DialogTitle>
			<p class="text-sm text-muted-foreground">Definieren Sie Zeiträume ohne Arbeitsweg (Urlaub, Homeoffice, Krankheit, etc.)</p>
		</DialogHeader>
			
			<div class="space-y-6">
				<!-- Add New Exception -->
				<div class="bg-muted/50 p-4 rounded-lg">
					<h4 class="font-bold mb-4 uppercase">Neue Ausnahme hinzufügen</h4>
					<div class="flex flex-col lg:flex-row gap-4">
						<div class="space-y-2 date-input-container">
							<Label for="start-date" class="text-sm uppercase">Beginn</Label>
							<input 
								id="start-date"
								type="date" 
								bind:value={new_range_start}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							/>
						</div>
						<div class="space-y-2 date-input-container">
							<Label for="end-date" class="text-sm uppercase">Ende</Label>
							<input 
								id="end-date"
								type="date" 
								bind:value={new_range_end}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							/>
						</div>
						<div class="flex items-end">
							<button onclick={add_excluded_range} class="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">Hinzufügen</button>
						</div>
					</div>
				</div>

				<!-- Existing Exceptions -->
				{#if excluded_ranges.length > 0}
					<div class="bg-muted/50 p-4 rounded-lg">
						<h4 class="font-bold mb-4 uppercase">Ausgeschlossene Zeiträume</h4>
						<p class="text-sm text-muted-foreground mb-4">Diese Tage werden nicht in der Berechnung berücksichtigt</p>
						<div class="space-y-3">
							{#each excluded_ranges as range, index}
								<div class="flex flex-col lg:flex-row gap-4 items-end">
									<div class="space-y-2 date-input-container">
										<Label class="text-sm uppercase">Beginn</Label>
										<input type="date" bind:value={range.start} class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
									</div>
									<div class="space-y-2 date-input-container">
										<Label class="text-sm uppercase">Ende</Label>
										<input type="date" bind:value={range.end} class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
									</div>
									<button 
										onclick={() => remove_excluded_range(index)} 
										class="w-fit px-4 py-2 bg-destructive text-white rounded-md hover:bg-destructive/90 transition-colors uppercase"
									>
										Entfernen
									</button>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground italic">Noch keine Ausnahmen definiert. Alle konfigurierten Arbeitstage werden berechnet.</p>
				{/if}
			</div>
		</DialogContent>
	</Dialog>
</div>

<!-- Footer with Disclaimer -->
<footer class="bg-muted border-t pt-16">
	<div class="container mx-auto px-6 py-8">
		<div class="max-w-4xl mx-auto">
			<h3 class="text-sm font-bold text-muted-foreground mb-4 uppercase">Rechtlicher Hinweis</h3>
			<div class="text-xs text-muted-foreground space-y-3 leading-relaxed">
				<p>Alle durch diesen Online-Rechner vermittelten Informationen werden mit größter Sorgfalt erstellt.</p>
				<p>Trotz sorgfältiger Recherche können die Informationen unvollständig und/oder zeitlich oder inhaltlich überholt sein.</p>
				<p>Darüber hinaus werden in einigen Fällen in der Realität komplexere Sachverhalte teilweise vereinfachend oder abstrahierend dargestellt, um dem Nutzer die Eingabe zu erleichtern und eine schnelle Informationsgewinnung in Form einer Ersteinschätzung zu ermöglichen. Diese Informationsverarbeitung kann dazu führen, dass die durch den Online-Rechner vermittelten Informationen im Vergleich zu einer exakten Analyse durch einen Fachmann ungenau sind.</p>
				<p>Die Ergebnisse dieses Online-Rechners dienen ausschließlich der unverbindlichen Ersteinschätzung und ersetzen in keinem Fall eine persönliche Beratung durch einen Steuerberater oder sonstigen Experten. Für steuerliche Angelegenheiten wenden Sie sich bitte an einen qualifizierten Steuerberater.</p>
				<p>Es wird keine Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der bereitgestellten Informationen übernommen. Eine Haftung für eventuelle Schäden oder Nachteile, die durch die Nutzung dieses Rechners oder durch fehlerhafte Berechnungen entstehen könnten, wird ausdrücklich ausgeschlossen.</p>
			</div>
		</div>
	</div>
</footer>

<style>
  :global(body) {
    background-color: #f5f5f5;
  }
	input[type="date"] {
    min-width: 170px;
  }

  /* Dialog responsiveness */
  @media (max-width: 768px) {
    :global([data-dialog-content]) {
      min-width: unset !important;
      max-width: calc(100vw - 100px) !important;
      margin: 0.5rem !important;
    }
  }

  /* Ensure date input containers wrap properly */
  .date-input-container {
    flex: 1;
    min-width: 200px;
  }

  /* Style the details/summary for better UX */
  details summary {
    user-select: none;
  }
  
  details summary::-webkit-details-marker {
    display: none;
  }
  
  details summary::marker {
    content: none;
  }
  
  details[open] summary {
    margin-bottom: 0;
  }

  /* Text transform utility */
  .uppercase {
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* Custom tooltip styles */
  .tooltip-container:hover .tooltip-content {
    opacity: 1;
    visibility: visible;
  }
  li:has(em) {
    list-style-type: none;
    margin-block-end: 0.6em;
  }
  li em {
    font-style: normal;
    padding: 0.4em 0.8em;
    background-color: #FFF;
    text-transform: uppercase;
    font-size: 0.8em;
    letter-spacing: 0.05em;
    border-radius: 0.25em;
    border: 1px solid rgba(0, 0, 0, 0.2);
    margin-inline-end: 0.3em;
    display: inline-block;
    min-width: 100px;
  }
</style>