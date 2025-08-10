// --- Currency Widget Logic ---
/**
 * Renders the currency widget showing conversion from base to trip currency for preset amounts.
 * @param {string} base - Profile currency (e.g. 'CAD').
 * @param {string} symbol - Trip currency (e.g. 'EUR').
 */
function showCurrencyModal() {
  const modal = document.createElement('div');
  modal.id = 'currencyModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  modal.innerHTML = `
    <div style="background:#fff;padding:2em;border-radius:12px;max-width:420px;min-width:300px;box-shadow:0 2px 16px #0003;position:relative;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-4">💱 Currency Converter</h2>
      <div id="currencyWidget"><span>Loading currency...</span></div>
      <button onclick="closeCurrencyModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;

  modal.onclick = closeCurrencyModal;
  document.body.appendChild(modal);

  renderCurrencyWidget(window.baseCurrency, window.tripCurrency);
}

function closeCurrencyModal() {
  document.getElementById('currencyModal')?.remove();
}

function renderCurrencyWidget(base, symbol) {
  // Store currencies globally for reuse
  window.baseCurrency = base;
  window.tripCurrency = symbol;

  const widget = document.getElementById('currencyWidget');
  if (!widget) return;
  widget.innerHTML = '<span>Loading currency...</span>';

  // Use today's date for the API
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  fetch(`https://api.frankfurter.dev/v1/${dateStr}?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(symbol)}`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data || !data.rates || !data.rates[symbol]) {
        widget.innerHTML = `<span><strong>Currency:</strong> <em>Unavailable</em></span>`;
        return;
      }
      const rate = data.rates[symbol];

      // Create the converter interface
      widget.innerHTML = `
        <div class="flex items-center gap-4 justify-between">
          <div style="display:flex;flex-direction:column;gap:0.5em;" class="w-1/2">
            <label style="font-weight:500;">${base}</label>
            <input type="number" id="baseInput" value="100" min="0" step="0.01" class="border border-1 rounded-sm px-2 py-1 w-full"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:0.5em;" class="w-1/2">
            <label style="font-weight:500;">${symbol}</label>
            <input type="number" id="symbolInput" value="${(100 * rate).toFixed(2)}" min="0" step="0.01" class="border border-1 rounded-sm px-2 py-1 w-full"/>
          </div>
        </div>
        <div class="text-sm text-gray-500 mt-3">Exchange rate: 1 ${base} = ${rate.toFixed(4)} ${symbol}</div>
      `;

      // Set up the conversion logic with debounce
      const baseInput = document.getElementById('baseInput');
      const symbolInput = document.getElementById('symbolInput');
      let baseTimeout = null;
      let symbolTimeout = null;

      baseInput.addEventListener('input', (e) => {
        if (baseTimeout) clearTimeout(baseTimeout);
        baseTimeout = setTimeout(() => {
          const baseValue = parseFloat(e.target.value) || 0;
          symbolInput.value = (baseValue * rate).toFixed(2);
        }, 500);  // Reduced debounce time for better UX
      });

      symbolInput.addEventListener('input', (e) => {
        if (symbolTimeout) clearTimeout(symbolTimeout);
        symbolTimeout = setTimeout(() => {
          const symbolValue = parseFloat(e.target.value) || 0;
          baseInput.value = (symbolValue / rate).toFixed(2);
        }, 500);  // Reduced debounce time for better UX
      });
    })
    .catch(() => {
      widget.innerHTML = `<span><strong>Currency:</strong> <em>Unavailable</em></span>`;
    });
}
// --- Time Widget Logic ---
/**
 * Renders the time widget showing home time and destination time.
 * @param {string} homeTz - IANA timezone string for home.
 * @param {string} destTz - IANA timezone string for destination.
 */
// Live time widget: fetch once, then update every minute using JS
function showTimeModal() {
  const modal = document.createElement('div');
  modal.id = 'timeModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  modal.innerHTML = `
    <div style="background:#fff;padding:2em;border-radius:12px;max-width:420px;min-width:300px;box-shadow:0 2px 16px #0003;position:relative;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-4">🕒 Time Zones</h2>
      <div id="timeWidget"><span>Loading times...</span></div>
      <button onclick="closeTimeModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;

  modal.onclick = closeTimeModal;
  document.body.appendChild(modal);

  renderTimeWidget(window.homeTz, window.destTz);
}

function closeTimeModal() {
  document.getElementById('timeModal')?.remove();
}

function renderTimeWidget(homeTz, destTz) {
  // Store timezones globally for reuse
  window.homeTz = homeTz;
  window.destTz = destTz;

  const widget = document.getElementById('timeWidget');
  if (!widget) return;
  widget.innerHTML = '<span>Loading times...</span>';

  // Helper to fetch time from timeapi.io
  function fetchTime(tz) {
    return fetch(`https://timeapi.io/api/time/current/zone?timeZone=${encodeURIComponent(tz)}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
  }

  // Store base times and offsets for live ticking
  let homeBase = null, destBase = null, baseFetched = Date.now();
  let intervalId = null;

  function updateDisplay() {
    let html = '';
    if (homeBase && homeBase.dateTime) {
      // Calculate new time by adding diff from baseFetched
      const now = Date.now();
      const diffMs = now - baseFetched;
      const homeDate = new Date(homeBase.dateTime);
      homeDate.setMilliseconds(homeDate.getMilliseconds() + diffMs);
      const h = String(homeDate.getHours()).padStart(2, '0');
      const m = String(homeDate.getMinutes()).padStart(2, '0');
      html += `🏡 ${homeTz}: <span style="color:#1a5dab;">${h}:${m}</span></span>`;
    } else {
      html += `🏡: <em>Unavailable</em></span>`;
    }
    if (destBase && destBase.dateTime) {
      const now = Date.now();
      const diffMs = now - baseFetched;
      const destDate = new Date(destBase.dateTime);
      destDate.setMilliseconds(destDate.getMilliseconds() + diffMs);
      const h = String(destDate.getHours()).padStart(2, '0');
      const m = String(destDate.getMinutes()).padStart(2, '0');
      html += `<br/>🌏 ${destTz}: <span style="color:#c00;">${h}:${m}</span></span>`;
    } else {
      html += `<span><strong>Destination time</strong>: <em>Unavailable</em></span>`;
    }
    widget.innerHTML = html;
  }

  Promise.all([
    fetchTime(homeTz),
    fetchTime(destTz)
  ]).then(([home, dest]) => {
    homeBase = home;
    destBase = dest;
    baseFetched = Date.now();
    updateDisplay();
    if (intervalId) clearInterval(intervalId);
    // Update every minute, on the minute
    const msToNextMinute = 60000 - (Date.now() % 60000);
    setTimeout(() => {
      updateDisplay();
      intervalId = setInterval(updateDisplay, 60000);
    }, msToNextMinute);
  });
}
// Global state variables
let itinerary = [];
let currentView = 'timeline';

/**
 * Toggles between 'timeline' and 'day' views and re-renders the itinerary.
 */
const viewBtn = document.getElementById('toggleViewBtn');
viewBtn.innerHTML = `🔁<br/> ${(currentView === 'timeline') ? 'day' : 'timeline'}`

function toggleView() {
    currentView = (currentView === 'timeline') ? 'day' : 'timeline';
    viewBtn.innerHTML = `🔁<br/> ${(currentView === 'timeline') ? 'day' : 'timeline'}`

  renderItinerary();
}
// Expose to the global scope if needed for HTML event handlers
window.toggleView = toggleView;

/**
 * Renders the vertical timeline calendar view (multi-column, multi-day segment spanning).
 * @param {HTMLElement} view The DOM element to render the timeline into.
 */
function renderTimelineView(view) {
  const allDays = getAllDays(itinerary);

  // Build segment spans: for each segment, get start/end day indices
  const segmentSpans = itinerary.map((seg, idx) => {
    const { start, end } = getSegmentDateRange(seg);
    if (!start || !end) return null;
    const startIdx = allDays.indexOf(start.toISOString().slice(0, 10));
    const endIdx = allDays.indexOf(end.toISOString().slice(0, 10));
    return { seg, idx, startIdx, endIdx };
  }).filter(Boolean);

  // Create the timeline grid container: 1 row for day labels, N rows for packed segments
  const timeline = document.createElement('div');
  timeline.className = 'horizontal-timeline-calendar snap-x snap-mandatory md:snap-none';
  timeline.style.cssText = `display: grid; grid-template-columns: repeat(${allDays.length}, 1fr); row-gap: 0.5em; column-gap: 1em; align-items: start;`;

  // Day labels (first row)
  allDays.forEach((day, i) => {
    const dayLabel = document.createElement('div');
    dayLabel.className = 'calendar-day-label min-w-[100vw] w-full md:min-w-80 md:w-80 snap-center text-violet-600 border-violet-200 border-b-2';
    dayLabel.innerText = formatTimelineDate(day);
    dayLabel.style.gridColumn = (i + 1).toString();
    timeline.appendChild(dayLabel);
  });

  // Packing: track which cells (row, col) are occupied
  const rows = [];
  // Each row is an array of booleans for each day (true if occupied)

  segmentSpans.forEach(s => {
    // Find the first row where all days for this segment are free
    let rowIdx = 0;
    while (true) {
      if (!rows[rowIdx]) rows[rowIdx] = Array(allDays.length).fill(false);
      let canPlace = true;
      for (let d = s.startIdx; d <= s.endIdx; ++d) {
        if (rows[rowIdx][d]) {
          canPlace = false;
          break;
        }
      }
      if (canPlace) break;
      rowIdx++;
    }
    // Mark cells as occupied
    for (let d = s.startIdx; d <= s.endIdx; ++d) {
      rows[rowIdx][d] = true;
    }

    // Segment block spanning the correct days
    const segDiv = createSegmentBlock(s.seg, s.idx);
    segDiv.style.cssText += `grid-row: ${rowIdx + 2}; grid-column: ${s.startIdx + 1} / ${s.endIdx + 2};`;
    timeline.appendChild(segDiv);
  });

  view.appendChild(timeline);
}


/**
 * Renders the day view, showing segments grouped by day.
 * @param {HTMLElement} view The DOM element to render the day view into.
 */
function renderDayView(view) {
  const allDays = getAllDays(itinerary);

  // Horizontal clickable day timeline (navigation)
  const dayTimeline = document.createElement('div');
  dayTimeline.className = 'day-timeline flex gap-1 justify-start flex-wrap:none mb-1 overflow-x-auto px-2';
  allDays.forEach(day => {
    const anchor = document.createElement('a');
    anchor.href = `#day-${day}`;
    anchor.style.textDecoration = 'none';
    const btn = document.createElement('button');
    btn.innerText = formatTimelineDate(day);
    btn.className="py-1 px-3 rounded-sm border-1 border-violet-400 border-solid cursor-pointer"
    anchor.appendChild(btn);
    dayTimeline.appendChild(anchor);
  });
  view.appendChild(dayTimeline);

  // Show all days in a single column calendar
  allDays.forEach(day => {
    const dayContainer = document.createElement('div');
    const dayHeader = document.createElement('h2');
    dayHeader.id = `day-${day}`;
    dayHeader.className = 'text-2xl font-medium mb-2 mt-12 sticky top-0 z-10 bg-white';
    dayHeader.innerText = formatTimelineDate(day);
    view.appendChild(dayContainer);
    dayContainer.appendChild(dayHeader);

    const daySegments = itinerary.filter(seg => {
      const { start, end } = getSegmentDateRange(seg);
      if (!start || !end) return false;
      const dayISO = day;
      const startISO = start.toISOString().slice(0, 10);
      const endISO = end.toISOString().slice(0, 10);
      return dayISO >= startISO && dayISO <= endISO;
    });

    if (daySegments.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'margin-bottom:1.5em;color:#888;';
      emptyDiv.innerText = 'No segments for this day.';
      view.appendChild(emptyDiv);
      return;
    }

    daySegments.forEach(seg => {
      const segDiv = createSegmentBlock(seg, itinerary.indexOf(seg));
      dayContainer.appendChild(segDiv);
    });
  });
}

/**
 * Main function to render the itinerary based on the current view.
 */
function renderItinerary() {
  let view = document.getElementById('main');
  if (!view) {
    view = document.createElement('div');
    view.id = 'itineraryView';
    // Ensure the element is inserted in a logical place in your HTML
    document.body.insertBefore(view, document.querySelector('#currentTimeBar')?.nextElementSibling || null);
  }
  view.innerHTML = ''; // Clear previous view

  if (currentView === 'timeline') {
    renderTimelineView(view);
  } else {
    renderDayView(view);
  }
}
window.renderItinerary = renderItinerary;

/**
 * Creates and returns a segment block HTMLElement for display.
 * @param {object} seg The segment object.
 * @param {number} idx The index of the segment in the itinerary array.
 * @returns {HTMLElement} The created segment block div.
 */
function createSegmentBlock(seg, idx) {
  const segDiv = document.createElement('div');
  segDiv.className = 'segment-block';

  const typeIcons = { 'Hotel': '🏨', 'Flight': '✈️', 'Train': '🚉', 'Drive': '🚙', 'Bus': '🚌' };
  const typeIcon = typeIcons[seg.type] || '';

  // Apply default name if empty
  const segmentName = seg.name?.trim() ? seg.name : getDefaultName(seg.type, seg.destination);

  let logoUrl = "";
  function createLogoUrl(name) {
        if (name != undefined) {
            name = name.replace(/\s/g, "")
            return "https://img.logo.dev/" + name + ".com?token=pk_M0MFefrlQ7O7r0xy31-4Bw";
        }
  }

  let routeDisplay = '';
  if (seg.type === 'Hotel') {
    routeDisplay = `📍 ${seg.destination}`;
  } else if (seg.type === 'Flight') {
    routeDisplay = seg.origin ? `${seg.origin} → ${seg.destination}` : `${seg.destination}`;
  } else {
    routeDisplay = seg.origin ? `${seg.origin} → ${seg.destination}` : seg.destination;
  }

  let extraDetails = '';
  if (seg.type === 'Hotel') {
    if (seg.check_in_time || seg.check_out_time) {
      extraDetails = `<div style="font-size:0.92em;color:#555;">` +
        (seg.check_in_time ? `Check-in: ${seg.check_in_time}` : '') +
        (seg.check_in_time && seg.check_out_time ? ' &nbsp;|&nbsp; ' : '') +
        (seg.check_out_time ? `Check-out: ${seg.check_out_time}` : '') +
        `</div>`;
    }
  } else if (["Flight", "Train", "Bus"].includes(seg.type)) {
    if (seg.departure_time || seg.arrival_time) {
      extraDetails = `<div style="font-size:0.92em;color:#555;">` +
        (seg.departure_time ? `Dep: ${seg.departure_time}` : '') +
        (seg.departure_time && seg.arrival_time ? ' &nbsp;|&nbsp; ' : '') +
        (seg.arrival_time ? `Arr: ${seg.arrival_time}` : '') +
        `</div>`;
    }
  }

  if (seg.vendor_name && seg.type != 'Hotel') {
    logoUrl = `<img width="20" style="margin-right:8px" src=${createLogoUrl(seg.vendor_name)}>`
  }



  segDiv.innerHTML = `
    <div class="sticky left-0"><strong>${typeIcon} ${segmentName}</strong></div>
    <div style="font-size:0.95em; color:#666;">${formatSegmentDate(seg)}</div>
    <div class="flex items-start py-1">${logoUrl} ${routeDisplay}</div>
    ${extraDetails}
  `;
  segDiv.onclick = () => viewSegmentDetails(idx);

  return segDiv;
}


/**
 * Displays a modal with detailed information about a segment.
 * @param {number} idx The index of the segment in the itinerary array.
 */
function viewSegmentDetails(idx) {
  const seg = itinerary[idx];
  if (!seg) return;

  const typeIcons = { 'Hotel': '🏨', 'Flight': '✈️', 'Train': '🚉', 'Drive': '🚙', 'Bus': '🚌' };
  const typeIcon = typeIcons[seg.type] || '';
  const routeDisplay = seg.origin ? `${seg.origin} → ${seg.destination}` : seg.destination;
  const note = seg.note || '';
  const flightNumber = seg.flight_number || '';

  let flightLinkHtml = '';
  if (seg.type === 'Flight' && flightNumber && seg.departure_date) {
    const match = flightNumber.match(/([A-Za-z]+)[ -]?(\d+)/);
    if (match) {
      const [_, airline, number] = match;
      const depDate = new Date(seg.departure_date);
      if (!isNaN(depDate)) {
        const year = depDate.getFullYear();
        const month = depDate.getMonth() + 1;
        const date = depDate.getDate();
        const flightStatsUrl = `https://www.flightstats.com/v2/flight-tracker/${airline.toUpperCase()}/${number}?year=${year}&month=${month}&date=${date}`;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.abs((today.getTime() - depDate.getTime()) / (1000 * 60 * 60 * 24));
        const showFlightLink = diffDays <= 3;

        flightLinkHtml = showFlightLink
          ? `<div class="detail-row">
                <strong>Flight:</strong><br/>
                <a href="${flightStatsUrl}" target="_blank" style="color:#1a5dab;text-decoration:underline;">${flightNumber}</a>
             </div>`
          : `<div class="detail-row">
                 <strong>Flight:</strong><br/>
                 ${flightNumber}
             </div>`;
      }
    }
  }

  // Format date and time details based on segment type
  let dateTimeDetails = '';
  if (seg.type === 'Hotel') {
    dateTimeDetails = `
      <div class="detail-row">
        <strong>Check-in:</strong><br/> ${seg.check_in_date || ''}${seg.check_in_time ? ' at ' + seg.check_in_time : ''}
      </div>
      <div class="detail-row">
        <strong>Check-out:</strong><br/> ${seg.check_out_date || ''}${seg.check_out_time ? ' at ' + seg.check_out_time : ''}
      </div>
    `;
  } else {
    dateTimeDetails = `
      <div class="detail-row">
        <strong>Departure:</strong><br/> ${seg.departure_date || ''}${seg.departure_time ? ' at ' + seg.departure_time : ''}
      </div>
      <div class="detail-row">
        <strong>Arrival:</strong><br/> ${seg.arrival_date || ''}${seg.arrival_time ? ' at ' + seg.arrival_time : ''}
      </div>
    `;
  }

  const modal = document.createElement('div');
  modal.id = 'segmentModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  // Apply default name if empty
  const segmentName = seg.name?.trim() ? seg.name : getDefaultName(seg.type, seg.destination);
  modal.innerHTML = `
    <div style="background:#fff;padding:2em 2em 1em 2em;border-radius:12px;max-width:420px;min-width:260px;box-shadow:0 2px 16px #0003;position:relative;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-2">${typeIcon} ${segmentName}</h2>

      <div style="display:flex;flex-direction:column;gap:0.5em;">
        ${seg.origin ? `<div class="detail-row">
            <strong>Origin:</strong><br/> ${seg.origin || '<em>Not specified</em>'}
        </div>` : ''}
        <div class="detail-row">
            <strong>Destination:</strong><br/> ${seg.destination}
        </div>
        ${seg.address ? `<div class="detail-row">
            <strong>Address:</strong><br/> ${seg.address}
        </div>` : ''}
        ${flightLinkHtml}
        ${dateTimeDetails}
        <div class="detail-row" style="margin-top:0.5em;">
            <strong>Note:</strong><br>${note ? escapeHtml(note) : '<em>No note for this segment.</em>'}
        </div>
      <button onclick="closeSegmentModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;
  modal.onclick = closeSegmentModal;
  document.body.appendChild(modal);
}

/**
 * Closes the currently open segment details modal.
 */
function closeSegmentModal() {
  document.getElementById('segmentModal')?.remove();
}

/**
 * Determines the start and end date for a segment based on its type and fields.
 * @param {object} seg The segment object.
 * @returns {{start: Date|null, end: Date|null}} Object containing start and end Date objects.
 */
function getSegmentDateRange(seg) {
  if (!seg || typeof seg !== 'object') return { start: null, end: null };

  let startDate = null;
  let endDate = null;

  // Create dates at noon UTC to avoid timezone issues
  if (seg.type === 'Hotel') {
    if (seg.check_in_date) startDate = new Date(seg.check_in_date + 'T12:00:00Z');
    if (seg.check_out_date) endDate = new Date(seg.check_out_date + 'T12:00:00Z');
  } else if (["Flight", "Train", "Bus", "Drive"].includes(seg.type)) {
    if (seg.departure_date) startDate = new Date(seg.departure_date + 'T12:00:00Z');
    if (seg.arrival_date) endDate = new Date(seg.arrival_date + 'T12:00:00Z');
  }

  // If only one date is present, use it for both start and end
  if (startDate && !endDate) endDate = startDate;
  if (endDate && !startDate) startDate = endDate; // Should not happen with current logic but good for robustness

  return { start: startDate, end: endDate };
}

/**
 * Collects all unique days covered by segments, sorted chronologically.
 * @param {Array<object>} itinerary The array of segment objects.
 * @returns {Array<string>} A sorted array of 'YYYY-MM-DD' strings.
 */
function getAllDays(itinerary) {
  const days = new Set();
  itinerary.forEach(seg => {
    const { start, end } = getSegmentDateRange(seg);
    if (!start || !end) return;

    // Clone the start date to avoid modifying the original
    let d = new Date(start.getTime());
    while (d.getTime() <= end.getTime()) {
      // Use UTC methods to avoid timezone issues
      days.add(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
  });
  return Array.from(days).sort();
}

/**
 * Formats a 'YYYY-MM-DD' date string as 'dd/mm/yyyy'.
 * @param {string} dateStr The date string to format.
 * @returns {string} The formatted date string.
 */
function formatTimelineDate(dateStr) {
  // Initialize dayjs's advanced format plugin for ordinal formatting (1st, 2nd, etc)
  dayjs.extend(window.dayjs_plugin_advancedFormat);

  const dt = dayjs(dateStr + 'T12:00:00Z');  // Parse at noon UTC like other date handling
  if (!dt.isValid()) return dateStr;

  return dt.format('dddd, MMMM D, YYYY'); // Tuesday, August 5th, 2025
}

/**
 * Formats the date range for display for a segment.
 * @param {object} seg The segment object.
 * @returns {string} The formatted date or date range string.
 */
function formatSegmentDate(seg) {
  const { start, end } = getSegmentDateRange(seg);
  if (!start) return '';

  const fmt = d => {
    if (isNaN(d.getTime())) return ''; // Should not happen if start is valid
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (end && start.getTime() !== end.getTime()) {
    return `${fmt(start)} to ${fmt(end)}`;
  }
  return fmt(start);
}

/**
 * Provides a default name for a segment based on its type and destination.
 * @param {string} type The type of the segment (e.g., 'Hotel', 'Flight').
 * @param {string} destination The destination of the segment.
 * @returns {string} The default name.
 */
function getDefaultName(type, destination) {
  if (!destination) return type; // Fallback if no destination
  if (type === 'Hotel') return `Stay in ${destination}`;
  return `${type} to ${destination}`;
}

/**
 * Finds and returns the current segment based on the current date/time.
 * Returns the first segment if none are current but some are in the future,
 * otherwise the first segment.
 * @returns {object|null} The current segment object, or null if no itinerary.
 */
function getCurrentSegment() {
  if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

  const now = new Date();
  // Find a segment that is currently active
  const activeSegment = itinerary.find(s => {
    const { start, end } = getSegmentDateRange(s);
    // Adjust end date to include the whole day for "hotel" segments, assuming check-out time is not midnight
    const adjustedEnd = new Date(end);
    if (s.type === 'Hotel') {
      adjustedEnd.setHours(23, 59, 59, 999);
    }
    return start && adjustedEnd && now >= start && now <= adjustedEnd;
  });

  if (activeSegment) return activeSegment;

  // If no active segment, find the next upcoming segment
  const upcomingSegment = itinerary.find(s => {
    const { start } = getSegmentDateRange(s);
    return start && now < start;
  });

  if (upcomingSegment) return upcomingSegment;

  // If no active or upcoming, default to the first segment
  return itinerary[0];
}

/**
 * Loads itinerary data from a JSON file.
 * @param {string} jsonFile The path to the JSON file.
 */
function loadItinerary(jsonFile) {
  fetch(jsonFile)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data && data.trip && Array.isArray(data.trip.segments)) {
        itinerary = data.trip.segments;
      } else {
        throw new Error('Invalid itinerary JSON structure');
      }
      renderItinerary();
    })
    .catch(err => {
      console.error("Error loading itinerary:", err);
      document.body.innerHTML = `<div style="color:#c00;padding:2em;">Error loading itinerary: ${err.message}. Please check console for details.</div>`;
    });
}

/**
 * Utility function to escape HTML to prevent XSS.
 * @param {string} str The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Initialize the application once the DOM is fully loaded
window.addEventListener('DOMContentLoaded', () => {
    const titleSlot = document.getElementById('tripName');  // Ensure edit form container exists
  if (!document.getElementById('editFormContainer')) {
    const formDiv = document.createElement('div');
    formDiv.id = 'editFormContainer';
    formDiv.style.display = 'none';
    document.body.appendChild(formDiv);
  }
  // Load initial itinerary data and render widgets
  fetch('itinerary.json')
    .then(res => res.json())
    .then(data => {
      let title = data.trip.name || 'My trip';
      let homeTz = 'America/Toronto'; // fallback
      let destTz = 'Europe/Amsterdam'; // fallback
      let baseCurrency = 'USD';
      let tripCurrency = 'EUR';
      if (data && data.profile && data.profile.timezone) homeTz = data.profile.timezone;
      if (data && data.trip && data.trip.timezone) destTz = data.trip.timezone;
      if (data && data.profile && data.profile.currency) baseCurrency = data.profile.currency;
      if (data && data.trip && data.trip.currency) tripCurrency = data.trip.currency;

      // Store initial values
      window.homeTz = homeTz;
      window.destTz = destTz;
      window.baseCurrency = baseCurrency;
      window.tripCurrency = tripCurrency;
      // Now load itinerary as before
      loadItinerary('itinerary.json');

      titleSlot.innerText = title;
    })
    .catch(() => {
      // Set default values
      window.homeTz = 'America/Toronto';
      window.destTz = 'Europe/Amsterdam';
      window.baseCurrency = 'USD';
      window.tripCurrency = 'EUR';
      loadItinerary('itinerary.json');
    });
});