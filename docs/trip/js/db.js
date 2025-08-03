// IndexedDB setup
const dbName = 'travlrDB';
const dbVersion = 1;

// Database initialization
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Itinerary store
            if (!db.objectStoreNames.contains('itinerary')) {
                db.createObjectStore('itinerary', { keyPath: 'id' });
            }

            // Exchange rates store
            if (!db.objectStoreNames.contains('exchangeRates')) {
                const ratesStore = db.createObjectStore('exchangeRates', { keyPath: 'date' });
                ratesStore.createIndex('timestamp', 'timestamp');
            }

            // Offline notes store
            if (!db.objectStoreNames.contains('notes')) {
                db.createObjectStore('notes', { keyPath: 'segmentId' });
            }

            // Timezone data store
            if (!db.objectStoreNames.contains('timezones')) {
                const tzStore = db.createObjectStore('timezones', { keyPath: 'zone' });
                tzStore.createIndex('timestamp', 'timestamp');
            }
        };
    });
};

// Store exchange rates
const storeExchangeRates = async (rates, base, symbol) => {
    const db = await initDB();
    const tx = db.transaction('exchangeRates', 'readwrite');
    const store = tx.objectStore('exchangeRates');

    await store.put({
        date: new Date().toISOString().slice(0, 10),
        timestamp: Date.now(),
        rates,
        base,
        symbol
    });

    return tx.complete;
};

// Get latest exchange rates
const getLatestExchangeRates = async () => {
    const db = await initDB();
    const tx = db.transaction('exchangeRates', 'readonly');
    const store = tx.objectStore('exchangeRates');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
        const request = index.openCursor(null, 'prev');
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            resolve(cursor ? cursor.value : null);
        };
        request.onerror = () => reject(request.error);
    });
};

// Store itinerary data
const storeItinerary = async (itinerary) => {
    const db = await initDB();
    const tx = db.transaction('itinerary', 'readwrite');
    const store = tx.objectStore('itinerary');

    await store.put({
        id: 'current',
        data: itinerary,
        timestamp: Date.now()
    });

    return tx.complete;
};

// Get stored itinerary
const getStoredItinerary = async () => {
    const db = await initDB();
    const tx = db.transaction('itinerary', 'readonly');
    const store = tx.objectStore('itinerary');

    return store.get('current');
};

// Store offline notes
const storeNote = async (segmentId, note) => {
    const db = await initDB();
    const tx = db.transaction('notes', 'readwrite');
    const store = tx.objectStore('notes');

    await store.put({
        segmentId,
        note,
        timestamp: Date.now(),
        synced: false
    });

    return tx.complete;
};

// Get offline notes
const getNotes = async () => {
    const db = await initDB();
    const tx = db.transaction('notes', 'readonly');
    const store = tx.objectStore('notes');

    return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

// Store timezone data
const storeTimezoneData = async (zone, offset, timestamp = Date.now()) => {
    const db = await initDB();
    const tx = db.transaction('timezones', 'readwrite');
    const store = tx.objectStore('timezones');

    await store.put({
        zone,
        offset,
        timestamp
    });

    return tx.complete;
};

// Get timezone data
const getTimezoneData = async (zone) => {
    const db = await initDB();
    const tx = db.transaction('timezones', 'readonly');
    const store = tx.objectStore('timezones');

    return store.get(zone);
};

window.travlrDB = {
    initDB,
    storeExchangeRates,
    getLatestExchangeRates,
    storeItinerary,
    getStoredItinerary,
    storeNote,
    getNotes,
    storeTimezoneData,
    getTimezoneData
};
