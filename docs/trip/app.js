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

// --- Notes Widget Logic ---
/**
 * Shows the notes modal for the current trip
 */
function showNotesModal() {
  const modal = document.createElement('div');
  modal.id = 'notesModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  modal.innerHTML = `
    <div style="background:#fff;padding:2em;border-radius:12px;max-width:500px;min-width:350px;max-height:80vh;overflow-y:auto;box-shadow:0 2px 16px #0003;position:relative;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-4">📔 Trip Notes</h2>
      <div id="notesWidget"><span>Loading notes...</span></div>
      <button onclick="closeNotesModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;

  modal.onclick = closeNotesModal;
  document.body.appendChild(modal);

  renderNotesWidget();
}

function closeNotesModal() {
  document.getElementById('notesModal')?.remove();
}

function renderNotesWidget() {
  const widget = document.getElementById('notesWidget');
  if (!widget) return;

  // Get current trip
  const currentTrip = allTrips.find(trip => trip.id === currentTripId);
  if (!currentTrip || !currentTrip.notes) {
    widget.innerHTML = '<div class="text-gray-500 italic">No notes available for this trip.</div>';
    return;
  }

  const notes = currentTrip.notes;
  if (!Array.isArray(notes) || notes.length === 0) {
    widget.innerHTML = '<div class="text-gray-500 italic">No notes available for this trip.</div>';
    return;
  }

  // Render all notes
  let notesHtml = '';
  notes.forEach((note, index) => {
    if (note.title || note.body) {
      notesHtml += '<div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb;">';

      // Add title if it exists
      if (note.title && note.title.trim()) {
        notesHtml += `<h3 style="font-weight: bold; font-size: 1.125rem; margin-bottom: 0.75rem; color: #374151;">${escapeHtml(note.title)}</h3>`;
      }

      // Add body if it exists
      if (note.body && note.body.trim()) {
        // Process the body to handle newlines and basic HTML
        let processedBody = note.body
          // First escape any HTML except allowed tags
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          // Then restore allowed tags
          .replace(/&lt;a\s+href=(['"])(.*?)\1&gt;(.*?)&lt;\/a&gt;/gi, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0000f7; text-decoration: underline;">$3</a>')
          .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/gi, '<strong>$1</strong>')
          .replace(/&lt;strong&gt;(.*?)&lt;\/strong&gt;/gi, '<strong>$1</strong>')
          .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
          // Convert newlines to <br> tags
          .replace(/\n/g, '<br>');

        notesHtml += `<div style="line-height: 1.6; color: #4b5563;">${processedBody}</div>`;
      }

      notesHtml += '</div>';
    }
  });

  if (notesHtml) {
    widget.innerHTML = notesHtml;
  } else {
    widget.innerHTML = '<div class="text-gray-500 italic">No notes available for this trip.</div>';
  }
}

/**
 * Utility function to escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Global state variables
let itinerary = [];
let allTrips = [];
let currentTripId = null;
let currentView = 'timeline';

/**
 * Toggles between 'timeline' and 'day' views and re-renders the itinerary.
 */
const viewBtn = document.getElementById('toggleViewBtn');
// viewBtn.innerHTML = `🔁<br/> ${(currentView === 'timeline') ? 'day' : 'timeline'}`

function toggleView() {
    currentView = (currentView === 'timeline') ? 'day' : 'timeline';
    // viewBtn.innerHTML = `🔁<br/> ${(currentView === 'timeline') ? 'day' : 'timeline'}`

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
    dayLabel.className = 'calendar-day-label min-w-[100vw] w-full md:min-w-80 md:w-80 snap-center text-black border-[#0000f7] border-b-2';
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
    anchor.className = "min-w-1/4 max-w-32"
    const btn = document.createElement('button');
    btn.innerText = formatTimelineDate(day);
    btn.className="py-1 px-3 rounded-sm border-1 border-[#0000f7] border-solid cursor-pointer bg-white"
    anchor.appendChild(btn);
    dayTimeline.appendChild(anchor);
  });
  view.appendChild(dayTimeline);

  // Show all days in a single column calendar
  allDays.forEach(day => {
    const dayContainer = document.createElement('div');
    const dayHeader = document.createElement('h2');
    dayHeader.id = `day-${day}`;
    dayHeader.className = 'text-lg text-black font-bold mb-2 py-2 px-2 mt-12 sticky top-0 z-10  backdrop-blur-xl bg-white/30 shadow-lg';
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

  // Add "BACK TO TOP" link if trip is longer than 4 days
  if (allDays.length > 4) {
    const backToTopContainer = document.createElement('div');
    backToTopContainer.style.cssText = 'text-align: center; margin-top: 2rem; padding: 1rem;';

    const backToTopLink = document.createElement('a');
    backToTopLink.href = '#';
    backToTopLink.innerHTML = '⬆️ <br/> Back to top';
    backToTopLink.className = 'text-center text-[#0000f7]'


    // Smooth scroll to top when clicked
    backToTopLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });

    backToTopContainer.appendChild(backToTopLink);
    view.appendChild(backToTopContainer);
  }
}

/**
 * Main function to render the itinerary based on the current view.
 */
function renderItinerary() {
  console.log('renderItinerary called');

  let view = document.getElementById('main');
  if (!view) {
    view = document.createElement('div');
    view.id = 'itineraryView';
    // Ensure the element is inserted in a logical place in your HTML
    document.body.insertBefore(view, document.querySelector('#currentTimeBar')?.nextElementSibling || null);
  }
  view.innerHTML = ''; // Clear previous view

  if (currentView === 'timeline') {
    // console.log('Rendering timeline view');
    renderTimelineView(view);
  } else {
    // console.log('Rendering day view');
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
  segDiv.className = 'segment-block shadow-md';

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
            <strong>Address:</strong><br/> <a href="https://maps.google.com/?q=${encodeURIComponent(seg.address)}" target="_blank" rel="noopener noreferrer" class="text-[#0000f7] underline">${seg.address}</a>
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

  return dt.format('ddd, MMM D, YYYY'); // Tuesday, August 5th, 2025
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
      if (data && data.trips && Array.isArray(data.trips)) {
        allTrips = data.trips;

        // Extract and store profile data for timezone and currency widgets
        if (data.profile) {
          window.homeTz = data.profile.timezone || 'America/Toronto';
          window.baseCurrency = data.profile.currency || 'CAD';
          console.log('Loaded profile - Home timezone:', window.homeTz, 'Base currency:', window.baseCurrency);
        } else {
          // Fallback values
          window.homeTz = 'America/Toronto';
          window.baseCurrency = 'CAD';
          console.warn('No profile found in itinerary data, using fallback values');
        }

        // Default to current trip based on date logic, or first trip
        const currentTrip = getCurrentTripId();
        currentTripId = currentTrip || (allTrips.length > 0 ? allTrips[0].id : null);

        if (currentTripId) {
          loadTrip(currentTripId);
        } else {
          console.error('No trips found to load');
          throw new Error('No trips found');
        }
      } else {
        throw new Error('Invalid itinerary JSON structure - trips array required');
      }
    })
    .catch(err => {
      console.error("Error loading itinerary:", err);
      document.body.innerHTML = `<div style="color:#c00;padding:2em;">Error loading itinerary: ${err.message}. Please check console for details.</div>`;
    });
}

/**
 * Get current trip ID (for detecting which trip is currently active)
 */
function getCurrentTripId() {
  // This could be enhanced to detect current trip based on dates
  const today = new Date();
  const currentTrip = allTrips.find(trip => {
    if (!trip.segments || trip.segments.length === 0) return false;

    const tripDates = trip.segments.map(seg => {
      const startDate = new Date(seg.departure_date || seg.check_in_date);
      const endDate = new Date(seg.arrival_date || seg.check_out_date);
      return { start: startDate, end: endDate };
    });

    const tripStart = new Date(Math.min(...tripDates.map(d => d.start)));
    const tripEnd = new Date(Math.max(...tripDates.map(d => d.end)));

    return today >= tripStart && today <= tripEnd;
  });

  return currentTrip ? currentTrip.id : null;
}

/**
 * Load a specific trip by ID
 */
function loadTrip(tripId) {
//   console.log('loadTrip called with tripId:', tripId);
  console.log('Available trips:', allTrips.map(t => ({ id: t.id, name: t.name })));

  const trip = allTrips.find(t => t.id === tripId);
  if (!trip) {
    console.error('Trip not found:', tripId, 'Available trips:', allTrips.map(t => t.id));
    // Redirect to first available trip
    if (allTrips.length > 0) {
      const fallbackTrip = allTrips[0];
      loadTrip(fallbackTrip.id);
      return;
    } else {
      return;
    }
  }


  currentTripId = tripId;
  itinerary = trip.segments || [];

  // Update currencies and timezone
  window.tripCurrency = trip.currency || 'EUR';
  window.destTz = trip.timezone || 'Europe/Amsterdam';

  // Update page title and trip name
  document.title = `${trip.name} - Travlr`;
  const titleSlot = document.getElementById('tripName');
  if (titleSlot) {
    titleSlot.innerText = trip.name;
  }

  // No URL manipulation - running as pure SPA
//   console.log('About to render itinerary with', itinerary.length, 'segments');
  renderItinerary();
}

/**
 * Show trips menu modal
 */
function showTripsMenu() {
  const modal = document.createElement('div');
  modal.id = 'tripsModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  const tripsList = allTrips.map(trip => {
    const isActive = trip.id === currentTripId;
    return `
      <div class="trip-item" style="padding: 1rem; border: 2px solid ${isActive ? '#0000f7' : '#e5e7eb'}; border-radius: 8px; margin-bottom: 0.5rem; cursor: pointer; background: ${isActive ? '#eff6ff' : '#fff'};" onclick="selectTrip('${trip.id}')">
        <h3 style="font-weight: bold; margin-bottom: 0.25rem;">${trip.name}</h3>
        <p style="color: #6b7280; font-size: 0.875rem;">${trip.description || 'No description'}</p>
        ${isActive ? '<span style="color: #0000f7; font-size: 0.75rem; font-weight: bold;">CURRENT</span>' : ''}
      </div>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="background:#fff;padding:2em;border-radius:12px;max-width:420px;min-width:300px;box-shadow:0 2px 16px #0003;position:relative;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-4">📋 Select Trip</h2>
      <div>
        ${tripsList}
      </div>
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb;">
          ${window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? `
            <button onclick="showNewTripForm()" style="width: 100%; padding: 0.75rem; margin-bottom: 0.5rem; background: #0000f7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">➕ New Trip</button>
            <button onclick="showEditTripForm()" style="width: 100%; padding: 0.75rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-weight: bold; cursor: pointer;">✏️ Edit Current Trip</button>
          ` : ''}
        </div>
      <button onclick="closeTripsModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;

  modal.onclick = closeTripsModal;
  document.body.appendChild(modal);
}

/**
 * Select a trip from the menu
 */
function selectTrip(tripId) {
  closeTripsModal();
  if (tripId !== currentTripId) {
    loadTrip(tripId);
  }
}

/**
 * Close trips menu modal
 */
function closeTripsModal() {
  const modal = document.getElementById('tripsModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Show new trip form
 */
function showNewTripForm() {
  closeTripsModal();
  const modal = document.createElement('div');
  modal.id = 'tripFormModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  modal.innerHTML = `
    <div style="background:#fff;padding:2em;border-radius:12px;max-width:500px;min-width:300px;max-height:90vh;overflow-y:auto;box-shadow:0 2px 16px #0003;position:relative;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-4">➕ New Trip</h2>
      <form id="tripForm" onsubmit="submitTripForm(event, false)">
        ${generateTripFormFields()}
        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
          <button type="submit" style="flex: 1; padding: 0.75rem; background: #0000f7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Create Trip</button>
          <button type="button" onclick="closeTripFormModal()" style="flex: 1; padding: 0.75rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-weight: bold; cursor: pointer;">Cancel</button>
        </div>
      </form>
      <button onclick="closeTripFormModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;

  modal.onclick = closeTripFormModal;
  document.body.appendChild(modal);
}

/**
 * Show edit trip form for current trip
 */
function showEditTripForm() {
  closeTripsModal();
  const currentTrip = allTrips.find(trip => trip.id === currentTripId);
  if (!currentTrip) {
    alert('No trip selected to edit');
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'tripFormModal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:#0008;z-index:100;display:flex;align-items:center;justify-content:center;';

  modal.innerHTML = `
    <div style="background:#fff;padding:2em;border-radius:12px;max-width:500px;min-width:300px;max-height:90vh;overflow-y:auto;box-shadow:0 2px 16px #0003;position:relative;" onclick="event.stopPropagation()">
      <h2 class="text-lg font-bold mb-4">✏️ Edit Trip</h2>
      <form id="tripForm" onsubmit="submitTripForm(event, true)">
        ${generateTripFormFields(currentTrip)}
        <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
          <button type="submit" style="flex: 1; padding: 0.75rem; background: #0000f7; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">Update</button>
          <button type="button" onclick="closeTripFormModal()" style="flex: 1; padding: 0.75rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; font-weight: bold; cursor: pointer;">Cancel</button>
        </div>
      </form>
      <button onclick="closeTripFormModal()" style="position:absolute;top:10px;right:10px;background:none;border:none;font-size:1.5em;cursor:pointer;">&times;</button>
    </div>
  `;

  modal.onclick = closeTripFormModal;
  document.body.appendChild(modal);
}

/**
 * Generate a trip ID from the trip name
 */
function generateTripId(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-');
}

/**
 * Generate form fields for trip creation/editing
 */
function generateTripFormFields(trip = null) {
  const isEdit = trip !== null;

  return `
    <div class="">
      ${isEdit ? `
        <div class="input-group">
          <label class="input-label">Trip ID:</label>
          <input type="text" name="id" value="${escapeHtml(trip.id)}" readonly
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; background: #f3f4f6;">
          <small style="color: #6b7280;">Trip ID cannot be changed after creation</small>
        </div>
      ` : `
        <div class="input-group">
          <label class="input-label">Trip ID:</label>
          <input type="text" name="id" id="tripIdField" readonly
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px; background: #f9fafb; color: #6b7280;">
          <small style="color: #6b7280;">Generated automatically from trip name</small>
        </div>
      `}

      <div class="input-group">
        <label class="input-label">Trip Name:</label>
        <input type="text" name="name" id="tripNameField" value="${isEdit ? escapeHtml(trip.name) : ''}" required
               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
               placeholder="e.g., Spanish Vacation 2025"
               ${isEdit ? '' : 'oninput="updateTripId()"'}>
      </div>

      <div class="input-group">
        <label class="input-label">Description:</label>
        <textarea name="description" rows="2"
                  style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
                  placeholder="Brief description of the trip">${isEdit ? escapeHtml(trip.description || '') : ''}</textarea>
      </div>

      <div class="input-group">
        <label class="input-label">Currency:</label>
        <select name="currency" required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          <option value="">Select Currency</option>
          <option value="USD" ${isEdit && trip.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
          <option value="EUR" ${isEdit && trip.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
          <option value="GBP" ${isEdit && trip.currency === 'GBP' ? 'selected' : ''}>GBP - British Pound</option>
          <option value="CAD" ${isEdit && trip.currency === 'CAD' ? 'selected' : ''}>CAD - Canadian Dollar</option>
          <option value="JPY" ${isEdit && trip.currency === 'JPY' ? 'selected' : ''}>JPY - Japanese Yen</option>
          <option value="AUD" ${isEdit && trip.currency === 'AUD' ? 'selected' : ''}>AUD - Australian Dollar</option>
          <option value="CHF" ${isEdit && trip.currency === 'CHF' ? 'selected' : ''}>CHF - Swiss Franc</option>
        </select>
      </div>

      <div class="input-group">
        <label class="input-label">Timezone:</label>
        <select name="timezone" required style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
          <option value="">Select Timezone</option>
          <option value="America/New_York" ${isEdit && trip.timezone === 'America/New_York' ? 'selected' : ''}>Eastern Time (New York)</option>
          <option value="America/Chicago" ${isEdit && trip.timezone === 'America/Chicago' ? 'selected' : ''}>Central Time (Chicago)</option>
          <option value="America/Denver" ${isEdit && trip.timezone === 'America/Denver' ? 'selected' : ''}>Mountain Time (Denver)</option>
          <option value="America/Los_Angeles" ${isEdit && trip.timezone === 'America/Los_Angeles' ? 'selected' : ''}>Pacific Time (Los Angeles)</option>
          <option value="America/Toronto" ${isEdit && trip.timezone === 'America/Toronto' ? 'selected' : ''}>Eastern Time (Toronto)</option>
          <option value="America/Vancouver" ${isEdit && trip.timezone === 'America/Vancouver' ? 'selected' : ''}>Pacific Time (Vancouver)</option>
          <option value="Europe/London" ${isEdit && trip.timezone === 'Europe/London' ? 'selected' : ''}>GMT (London)</option>
          <option value="Europe/Paris" ${isEdit && trip.timezone === 'Europe/Paris' ? 'selected' : ''}>CET (Paris)</option>
          <option value="Europe/Madrid" ${isEdit && trip.timezone === 'Europe/Madrid' ? 'selected' : ''}>CET (Madrid)</option>
          <option value="Europe/Rome" ${isEdit && trip.timezone === 'Europe/Rome' ? 'selected' : ''}>CET (Rome)</option>
          <option value="Europe/Berlin" ${isEdit && trip.timezone === 'Europe/Berlin' ? 'selected' : ''}>CET (Berlin)</option>
          <option value="Asia/Tokyo" ${isEdit && trip.timezone === 'Asia/Tokyo' ? 'selected' : ''}>JST (Tokyo)</option>
          <option value="Asia/Shanghai" ${isEdit && trip.timezone === 'Asia/Shanghai' ? 'selected' : ''}>CST (Shanghai)</option>
          <option value="Australia/Sydney" ${isEdit && trip.timezone === 'Australia/Sydney' ? 'selected' : ''}>AEST (Sydney)</option>
        </select>
      </div>

      <div class="input-group mt-12">
        <h3 class="text-lg">Trip segments:</h3>
        <div id="segmentsContainer">
          ${generateSegmentsSection(isEdit ? trip.segments || [] : [])}
        </div>
      </div>
    </div>
  `;
}

/**
 * Generate the segments management section
 */
function generateSegmentsSection(segments = []) {
  let html = '<div id="segmentsList">';

  segments.forEach((segment, index) => {
    html += generateSegmentForm(segment, index);
  });

  if (segments.length === 0) {
    html += '<div class="no-segments" style="text-align: center; color: #6b7280; padding: 1rem; font-style: italic;">No segments added yet</div>';
  }

  html += '</div>';
  html += `
    <div style="margin-top: 1rem;">
      <button type="button" onclick="addNewSegment()"
              style="width: 100%; padding: 0.75rem; background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 6px; color: #6b7280; font-weight: bold; cursor: pointer;">
        + Add Segment
      </button>
    </div>
  `;

  return html;
}

/**
 * Generate form for a single segment
 */
function generateSegmentForm(segment = {}, index = 0) {
  const segmentType = segment.type || 'Flight';

  return `
    <div class="segment-form" data-index="${index}" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 1rem; margin-bottom: 1rem; background: white;">
      <div class="flex justify-between mb-4">
        <h4 style="font-weight: bold; margin: 0;">Segment ${index + 1}</h4>
        <button type="button" onclick="removeSegment(${index})"
                style="background: #ef4444; color: white; border: none; border-radius: 4px; padding: 0.25rem 0.5rem; font-size: 0.75rem; cursor: pointer;">
          Remove
        </button>
      </div>


        <div class="input-group">
          <label class="input-label">Type:</label>
          <select name="segments[${index}][type]" onchange="updateSegmentFields(${index})" required
                  style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
            <option value="Flight" ${segmentType === 'Flight' ? 'selected' : ''}>✈️ Flight</option>
            <option value="Train" ${segmentType === 'Train' ? 'selected' : ''}>🚉 Train</option>
            <option value="Bus" ${segmentType === 'Bus' ? 'selected' : ''}>🚌 Bus</option>
            <option value="Drive" ${segmentType === 'Drive' ? 'selected' : ''}>🚙 Drive</option>
            <option value="Hotel" ${segmentType === 'Hotel' ? 'selected' : ''}>🏨 Hotel</option>
          </select>
        </div>

        <div class="input-group">
          <label class="input-label">Name (optional):</label>
          <input type="text" name="segments[${index}][name]" value="${escapeHtml(segment.name || '')}"
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
                 placeholder="e.g., Morning flight to Barcelona">
        </div>


      <div id="segmentFields${index}">
        ${generateSegmentTypeFields(segment, index)}
      </div>
    </div>
  `;
}

/**
 * Generate fields specific to segment type
 */
function generateSegmentTypeFields(segment = {}, index = 0) {
  const type = segment.type || 'Flight';

  let html = `
    <div class="input-group">
      <div class="input-group">
        <label class="input-label">Vendor:</label>
        <input type="text" name="segments[${index}][vendor_name]" value="${escapeHtml(segment.vendor_name || '')}"
               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
               placeholder="e.g., Air Canada, Renfe, Marriott">
      </div>
  `;

  if (type === 'Flight') {
    html += `
      <div class="input-group">
        <label class="input-label">Flight Number:</label>
        <input type="text" name="segments[${index}][flight_number]" value="${escapeHtml(segment.flight_number || '')}"
               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
               placeholder="e.g., AC822">
      </div>
    `;
  } else {
    // html += '<div></div>'; // Empty placeholder for grid
  }

  html += '</div>';

  // Location fields
  html += '<div class="input-group" id="location-fields">';

  if (type !== 'Hotel') {
    html += `
      <div class="input-group">
        <label class="input-label">Origin:</label>
        <input type="text" name="segments[${index}][origin]" value="${escapeHtml(segment.origin || '')}" required
               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
               placeholder="e.g., Montreal">
      </div>
    `;
  } else {
    // html += '<div></div>'; // Empty for hotels
  }

  html += `
    <div class="input-group">
      <label class="input-label">Destination:</label>
      <input type="text" name="segments[${index}][destination]" value="${escapeHtml(segment.destination || '')}" required
             style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
             placeholder="e.g., Barcelona">
    </div>
  `;

  html += '</div>';

  // Address field for hotels and trains
  if (type === 'Hotel' || type === 'Train') {
    html += `
      <div class="input-group">
        <label class="input-label">Address:</label>
        <input type="text" name="segments[${index}][address]" value="${escapeHtml(segment.address || '')}"
               style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
               placeholder="Full address">
      </div>
    `;
  }

  // Date/Time fields
  if (type === 'Hotel') {
    html += `
      <div class="input-group">
        <div class="input-group">
          <label class="input-label">Check-in Date:</label>
          <input type="date" name="segments[${index}][check_in_date]" value="${segment.check_in_date || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
        <div class="input-group">
          <label class="input-label">Check-in Time:</label>
          <input type="time" name="segments[${index}][check_in_time]" value="${segment.check_in_time || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
        <div class="input-group">
          <label class="input-label">Check-out Date:</label>
          <input type="date" name="segments[${index}][check_out_date]" value="${segment.check_out_date || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
        <div class="input-group">
          <label class="input-label">Check-out Time:</label>
          <input type="time" name="segments[${index}][check_out_time]" value="${segment.check_out_time || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
      </div>
    `;
  } else {
    html += `
      <div class="input-group">
        <div class="input-group">
          <label class="input-label">Departure Date:</label>
          <input type="date" name="segments[${index}][departure_date]" value="${segment.departure_date || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
        <div class="input-group">
          <label class="input-label">Departure Time:</label>
          <input type="time" name="segments[${index}][departure_time]" value="${segment.departure_time || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
        <div class="input-group">
          <label class="input-label">Arrival Date:</label>
          <input type="date" name="segments[${index}][arrival_date]" value="${segment.arrival_date || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
        <div class="input-group">
          <label class="input-label">Arrival Time:</label>
          <input type="time" name="segments[${index}][arrival_time]" value="${segment.arrival_time || ''}" required
                 style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;">
        </div>
      </div>
    `;
  }

  // Notes field
  html += `
    <div class="input-group">
      <label class="input-label">Notes:</label>
      <textarea name="segments[${index}][note]" rows="2"
                style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 4px;"
                placeholder="Additional information about this segment">${escapeHtml(segment.note || '')}</textarea>
    </div>
  `;

  return html;
}

/**
 * Close trip form modal
 */
function closeTripFormModal() {
  const modal = document.getElementById('tripFormModal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Add a new segment to the trip form
 */
function addNewSegment() {
  const segmentsList = document.getElementById('segmentsList');
  const noSegmentsDiv = segmentsList.querySelector('.no-segments');

  // Remove "no segments" message if it exists
  if (noSegmentsDiv) {
    noSegmentsDiv.remove();
  }

  // Get current segment count
  const existingSegments = segmentsList.querySelectorAll('.segment-form');
  const newIndex = existingSegments.length;

  // Add new segment form
  const segmentHtml = generateSegmentForm({}, newIndex);
  segmentsList.insertAdjacentHTML('beforeend', segmentHtml);
}

/**
 * Remove a segment from the trip form
 */
function removeSegment(index) {
  const segmentForm = document.querySelector(`.segment-form[data-index="${index}"]`);
  if (segmentForm) {
    segmentForm.remove();

    // Check if no segments left and add placeholder
    const segmentsList = document.getElementById('segmentsList');
    const remainingSegments = segmentsList.querySelectorAll('.segment-form');
    if (remainingSegments.length === 0) {
      segmentsList.innerHTML = '<div class="no-segments" style="text-align: center; color: #6b7280; padding: 1rem; font-style: italic;">No segments added yet</div>';
    } else {
      // Re-index remaining segments
      reIndexSegments();
    }
  }
}

/**
 * Re-index all segments after removal
 */
function reIndexSegments() {
  const segmentForms = document.querySelectorAll('.segment-form');
  segmentForms.forEach((form, newIndex) => {
    form.setAttribute('data-index', newIndex);

    // Update heading
    const heading = form.querySelector('h4');
    if (heading) heading.textContent = `Segment ${newIndex + 1}`;

    // Update remove button
    const removeBtn = form.querySelector('button[onclick^="removeSegment"]');
    if (removeBtn) removeBtn.setAttribute('onclick', `removeSegment(${newIndex})`);

    // Update onchange handler
    const typeSelect = form.querySelector('select[name*="[type]"]');
    if (typeSelect) typeSelect.setAttribute('onchange', `updateSegmentFields(${newIndex})`);

    // Update all input/select names
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const name = input.getAttribute('name');
      if (name && name.includes('segments[')) {
        const newName = name.replace(/segments\[\d+\]/, `segments[${newIndex}]`);
        input.setAttribute('name', newName);
      }
    });
  });
}

/**
 * Update segment fields when type changes
 */
function updateSegmentFields(index) {
  const typeSelect = document.querySelector(`select[name="segments[${index}][type]"]`);
  const fieldsContainer = document.getElementById(`segmentFields${index}`);

  if (typeSelect && fieldsContainer) {
    const selectedType = typeSelect.value;

    // Get existing values to preserve them
    const existingData = getSegmentFormData(index);
    existingData.type = selectedType;

    // Regenerate fields
    fieldsContainer.innerHTML = generateSegmentTypeFields(existingData, index);
  }
}

/**
 * Get current form data for a segment
 */
function getSegmentFormData(index) {
  const data = {};
  const form = document.querySelector(`.segment-form[data-index="${index}"]`);
  if (form) {
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const name = input.getAttribute('name');
      if (name && name.includes(`segments[${index}]`)) {
        const fieldName = name.match(/\[([^\]]+)\]$/)?.[1];
        if (fieldName) {
          data[fieldName] = input.value;
        }
      }
    });
  }
  return data;
}

/**
 * Update trip ID field based on trip name (for new trips only)
 */
function updateTripId() {
  const nameField = document.getElementById('tripNameField');
  const idField = document.getElementById('tripIdField');

  if (nameField && idField) {
    const generatedId = generateTripId(nameField.value);
    idField.value = generatedId;

    // Check for duplicate ID and show warning
    if (generatedId && allTrips.find(trip => trip.id === generatedId)) {
      idField.style.borderColor = '#ef4444';
      idField.style.backgroundColor = '#fef2f2';
      // Show warning message
      let warning = document.getElementById('id-warning');
      if (!warning) {
        warning = document.createElement('small');
        warning.id = 'id-warning';
        warning.style.color = '#ef4444';
        warning.textContent = 'Warning: A trip with this ID already exists';
        idField.parentNode.appendChild(warning);
      }
    } else {
      idField.style.borderColor = '#d1d5db';
      idField.style.backgroundColor = '#f9fafb';
      // Remove warning message
      const warning = document.getElementById('id-warning');
      if (warning) {
        warning.remove();
      }
    }
  }
}

/**
 * Submit trip form (create or edit)
 */
function submitTripForm(event, isEdit) {
  event.preventDefault();

  const formData = new FormData(event.target);
  let tripId = formData.get('id').trim();

  // For new trips, generate ID from name if not already set
  if (!isEdit && !tripId) {
    tripId = generateTripId(formData.get('name').trim());
  }

  const tripData = {
    id: tripId,
    name: formData.get('name').trim(),
    description: formData.get('description').trim(),
    currency: formData.get('currency'),
    timezone: formData.get('timezone'),
    notes: [],
    segments: []
  };

  // Process segments data
  const segmentForms = document.querySelectorAll('.segment-form');
  segmentForms.forEach((form, index) => {
    const segmentData = {};
    const inputs = form.querySelectorAll('input, select, textarea');

    inputs.forEach(input => {
      const name = input.getAttribute('name');
      if (name && name.includes(`segments[${index}]`)) {
        const fieldName = name.match(/\[([^\]]+)\]$/)?.[1];
        if (fieldName && input.value.trim()) {
          segmentData[fieldName] = input.value.trim();
        }
      }
    });

    // Only add segment if it has required fields
    if (segmentData.type && segmentData.destination) {
      // Ensure required fields are present based on type
      if (segmentData.type === 'Hotel') {
        if (segmentData.check_in_date && segmentData.check_out_date) {
          tripData.segments.push(segmentData);
        }
      } else {
        if (segmentData.origin && segmentData.departure_date && segmentData.arrival_date) {
          tripData.segments.push(segmentData);
        }
      }
    }
  });

  // Validate required fields
  if (!tripData.id || !tripData.name || !tripData.currency || !tripData.timezone) {
    alert('Please fill in all required fields');
    return;
  }

  // Validate ID format
  if (!/^[a-z0-9-]+$/.test(tripData.id)) {
    alert('Generated trip ID contains invalid characters. Please modify the trip name.');
    return;
  }

  // Check for duplicate ID when creating new trip
  if (!isEdit && allTrips.find(trip => trip.id === tripData.id)) {
    alert('A trip with this ID already exists. Please modify the trip name to generate a unique ID.');
    return;
  }

  try {
    if (isEdit) {
      updateTrip(tripData);
    } else {
      createTrip(tripData);
    }
    closeTripFormModal();
  } catch (error) {
    alert('Error saving trip: ' + error.message);
  }
}

/**
 * Get complete itinerary data structure including profile
 */
function getCompleteItineraryData() {
  return {
    profile: {
      timezone: window.homeTz || 'America/Toronto',
      currency: window.baseCurrency || 'CAD'
    },
    trips: allTrips
  };
}

/**
 * Create a new trip
 */
function createTrip(tripData) {
  // Show saving indicator
  showSaveIndicator('Creating trip...');

  // Add to allTrips array
  allTrips.push(tripData);

  // Save to localStorage as backup (with profile)
  localStorage.setItem('itineraryData', JSON.stringify(getCompleteItineraryData()));

  // Save to server
  saveItineraryToServer()
    .then(() => {
      showSaveIndicator('Trip created and saved!', 'success');
      // Switch to the new trip
      loadTrip(tripData.id);
    })
    .catch(() => {
      showSaveIndicator('Trip created (offline backup saved)', 'warning');
      // Switch to the new trip even if server save failed
      loadTrip(tripData.id);
    });
}

/**
 * Update an existing trip
 */
function updateTrip(tripData) {
  const tripIndex = allTrips.findIndex(trip => trip.id === currentTripId);
  if (tripIndex === -1) {
    throw new Error('Trip not found');
  }

  // Show saving indicator
  showSaveIndicator('Updating trip...');

  // Preserve existing notes but use new segments if provided
  const existingTrip = allTrips[tripIndex];
  tripData.notes = existingTrip.notes || [];
  // Don't override segments - they come from the form now

  // Update the trip
  allTrips[tripIndex] = tripData;

  // Save to localStorage as backup (with profile)
  localStorage.setItem('itineraryData', JSON.stringify(getCompleteItineraryData()));

  // Save to server
  saveItineraryToServer()
    .then(() => {
      showSaveIndicator('Trip updated and saved!', 'success');
      // Reload the current trip to show changes
      loadTrip(tripData.id);
    })
    .catch(() => {
      showSaveIndicator('Trip updated (offline backup saved)', 'warning');
      // Reload the current trip even if server save failed
      loadTrip(tripData.id);
    });
}

/**
 * Save itinerary data to server
 */
function saveItineraryToServer() {
  const data = getCompleteItineraryData();

  // Try to save to server endpoint if available
  return fetch('/api/save-itinerary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.success) {
      console.log('Itinerary saved to server successfully');
      return result;
    } else {
      throw new Error(result.error || 'Unknown server error');
    }
  })
  .catch(error => {
    console.warn('Could not save to server:', error.message);
    console.log('Copy this JSON and manually save to itinerary.json:');
    console.log(JSON.stringify(data, null, 2));

    // Create a downloadable file as fallback
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'itinerary.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Re-throw the error so calling functions can handle it
    throw error;
  });
}

/**
 * Show save indicator to user
 */
function showSaveIndicator(message, type = 'info') {
  // Remove any existing indicators
  const existing = document.getElementById('save-indicator');
  if (existing) {
    existing.remove();
  }

  const indicator = document.createElement('div');
  indicator.id = 'save-indicator';

  let bgColor, textColor;
  switch (type) {
    case 'success':
      bgColor = '#10b981';
      textColor = '#ffffff';
      break;
    case 'warning':
      bgColor = '#f59e0b';
      textColor = '#ffffff';
      break;
    case 'error':
      bgColor = '#ef4444';
      textColor = '#ffffff';
      break;
    default: // info
      bgColor = '#3b82f6';
      textColor = '#ffffff';
  }

  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${bgColor};
    color: ${textColor};
    padding: 12px 20px;
    border-radius: 8px;
    font-weight: bold;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 14px;
    max-width: 300px;
    animation: slideIn 0.3s ease-out;
  `;

  indicator.textContent = message;
  document.body.appendChild(indicator);

  // Add CSS animation
  if (!document.getElementById('save-indicator-styles')) {
    const style = document.createElement('style');
    style.id = 'save-indicator-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Auto-remove after a few seconds
  setTimeout(() => {
    if (indicator && indicator.parentNode) {
      indicator.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        indicator.remove();
      }, 300);
    }
  }, type === 'error' ? 5000 : 3000);
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
  // Ensure edit form container exists
  if (!document.getElementById('editFormContainer')) {
    const formDiv = document.createElement('div');
    formDiv.id = 'editFormContainer';
    formDiv.style.display = 'none';
    document.body.appendChild(formDiv);
  }

  // Initialize default values (will be overridden by profile data when loaded)
  window.homeTz = 'America/Toronto';
  window.destTz = 'Europe/Amsterdam';
  window.baseCurrency = 'CAD';
  window.tripCurrency = 'EUR';

  // Load itinerary data (this will set proper profile values and load trips)
  loadItinerary('itinerary.json');
});
