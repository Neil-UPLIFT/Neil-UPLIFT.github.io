// ==============================
// Configuration - Environment-based
// ==============================
const CONFIG = {
    development: {
        API_KEY: 'AIzaSyCvf18utj4jj8FZz_tUtpsajkq-S1kgcxE',
        SPREADSHEET_ID: '1fxvm4jYaVA640z4V4L3pPxRNFQjwUGdlnyIBWWzV48Q',
        SHEET_NAME: 'Form Responses 1'
    },
    production: {
        API_KEY: '', // Loaded from config.js
        SPREADSHEET_ID: '1fxvm4jYaVA640z4V4L3pPxRNFQjwUGdlnyIBWWzV48Q',
        SHEET_NAME: 'Form Responses 1'
    }
};

function getEnvironment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ? 'development' : 'production';
}

async function loadConfig() {
    const env = getEnvironment();
    let config = { ...CONFIG[env] };

    if (env === 'production') {
        try {
            const response = await fetch('config.js');
            const configText = await response.text();
            config.API_KEY = extractValue(configText, 'API_KEY') || config.API_KEY;
            config.SPREADSHEET_ID = extractValue(configText, 'SPREADSHEET_ID') || config.SPREADSHEET_ID;
            config.SHEET_NAME = extractValue(configText, 'SHEET_NAME') || config.SHEET_NAME;
        } catch (err) {
            console.error('Error loading production config:', err);
        }
    }

    return config;
}

function extractValue(text, variableName) {
    const regex = new RegExp(`${variableName}\\s*=\\s*['"]([^'"]+)['"]`);
    const match = text.match(regex);
    return match ? match[1] : null;
}

// Global variables
let API_KEY = '';
let SPREADSHEET_ID = '';
let SHEET_NAME = '';
let currentView = 'list';
let selectedTripId = null;
let trips = [];

// Initialize the application
async function init() {
    const config = await loadConfig();
    API_KEY = config.API_KEY;
    SPREADSHEET_ID = config.SPREADSHEET_ID;
    SHEET_NAME = config.SHEET_NAME;

    // Load local storage first
    const localTrips = JSON.parse(localStorage.getItem('motorpoolTrips')) || [];
    trips = localTrips;

    // Try to fetch Google Sheets
    if (API_KEY) {
        fetchFromGoogleSheets();
    } else {
        renderTripList();
    }

    // Set up form defaults
    setupForm();
}
// Show/hide views
function showView(view) {
    currentView = view;

    if (view === 'list') {
        document.getElementById('tripListView').style.display = 'block';
        document.getElementById('ticketFormView').style.display = 'none';
        document.getElementById('viewListBtn').classList.add('active');
        document.getElementById('viewFormBtn').classList.remove('active');
        renderTripList();
    } else {
        document.getElementById('tripListView').style.display = 'none';
        document.getElementById('ticketFormView').style.display = 'block';
        document.getElementById('viewListBtn').classList.remove('active');
        document.getElementById('viewFormBtn').classList.add('active');
    }
}

// Fetch data from Google Sheets
async function fetchFromGoogleSheets() {
    try {
        document.getElementById('tripsList').innerHTML =
            '<div class="loading">Loading trips from Google Sheets...</div>';

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.values && data.values.length > 1) {
            const sheetTrips = processSheetData(data.values);
            trips = mergeTrips(trips, sheetTrips);
            localStorage.setItem('motorpoolTrips', JSON.stringify(trips));
            renderTripList();
        } else {
            document.getElementById('tripsList').innerHTML =
                '<div class="loading">No trips found in Google Sheets</div>';
        }
    } catch (err) {
        console.error('Error fetching Google Sheets:', err);
        document.getElementById('tripsList').innerHTML =
            '<div class="loading">Error loading from Google Sheets. Using local data.</div>';
        renderTripList();
    }
}

// Process Google Sheets data into trip objects
function processSheetData(rows) {
    const headers = rows[0];
    const tripData = [];

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const trip = {};

        if (headers.includes('Timestamp')) trip.date = row[headers.indexOf('Timestamp')];
        if (headers.includes('Requestor')) trip.requestor = row[headers.indexOf('Requestor')];
        if (headers.includes('Purpose of Trip')) trip.purpose = row[headers.indexOf('Purpose of Trip')];
        if (headers.includes('Destination')) trip.destination1 = row[headers.indexOf('Destination')];
        if (headers.includes('Number of Passengers')) trip.numberOfPassengers = row[headers.indexOf('Number of Passengers')];

        trip.id = `sheet-${i}-${Date.now()}`;
        trip.fromSheet = true;
        tripData.push(trip);
    }

    return tripData;
}

// Merge local trips with sheet trips
function mergeTrips(localTrips, sheetTrips) {
    const merged = [...localTrips];
    sheetTrips.forEach(sheetTrip => {
        const exists = localTrips.some(localTrip =>
            localTrip.requestor === sheetTrip.requestor &&
            localTrip.purpose === sheetTrip.purpose &&
            localTrip.date === sheetTrip.date
        );
        if (!exists) merged.push(sheetTrip);
    });
    return merged;
}

// Render the list of trips
function renderTripList() {
    const tripsList = document.getElementById('tripsList');
    tripsList.innerHTML = '';

    if (trips.length === 0) {
        tripsList.innerHTML = '<div class="trip-item">No trips found. Create a new trip ticket.</div>';
        return;
    }

    const tripsByDate = {};
    trips.forEach(trip => {
        const date = trip.dateOfTrip || trip.date || 'No date';
        if (!tripsByDate[date]) tripsByDate[date] = [];
        tripsByDate[date].push(trip);
    });

    for (const date in tripsByDate) {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'trip-date';
        dateHeader.textContent = `Date: ${date}`;
        tripsList.appendChild(dateHeader);

        tripsByDate[date].forEach(trip => {
            const tripElement = document.createElement('div');
            tripElement.className = 'trip-item';
            if (trip.id === selectedTripId) tripElement.classList.add('selected');
            tripElement.setAttribute('data-id', trip.id);

            tripElement.innerHTML = `
                <div class="trip-details">
                    <div>
                        <div class="trip-purpose">${trip.purpose || 'No purpose specified'}</div>
                        <div>Requestor: ${trip.requestor || 'Unknown'}</div>
                        ${trip.fromSheet ? '<div style="color: #28a745; font-size: 0.9em;">From Google Sheets</div>' : ''}
                    </div>
                    <div>
                        <div>Destination: ${trip.destination1 || 'Not specified'}</div>
                        <div>Passengers: ${trip.numberOfPassengers || '0'}</div>
                    </div>
                </div>
            `;

            tripElement.addEventListener('click', function () {
                selectedTripId = trip.id;
                document.querySelectorAll('.trip-item').forEach(item => {
                    item.classList.remove('selected');
                });
                this.classList.add('selected');
            });

            tripsList.appendChild(tripElement);
        });
    }
}

// Filter trips based on search input
function filterTrips() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const tripItems = document.querySelectorAll('.trip-item');
    
    tripItems.forEach(item => {
        const tripText = item.textContent.toLowerCase();
        if (tripText.includes(searchText)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Load selected trip into the form
function loadSelectedTrip() {
    if (!selectedTripId) {
        alert('Please select a trip first.');
        return;
    }
    
    const trip = trips.find(t => t.id === selectedTripId);
    if (!trip) {
        alert('Selected trip not found.');
        return;
    }
    
    // Populate form with trip data
    document.getElementById('requestor').value = trip.requestor || '';
    document.getElementById('contactNumber').value = trip.contactNumber || '';
    document.getElementById('department').value = trip.department || '';
    document.getElementById('pickupVenue').value = trip.pickupVenue || '';
    document.getElementById('dateOfTrip').value = trip.dateOfTrip || '';
    document.getElementById('passengerContact').value = trip.passengerContact || '';
    document.getElementById('numberOfPassengers').value = trip.numberOfPassengers || '';
    document.getElementById('passengerNames').value = trip.passengerNames || '';
    document.getElementById('purpose').value = trip.purpose || '';
    document.getElementById('specialInstructions').value = trip.specialInstructions || '';
    document.querySelector('input[name="destination1"]').value = trip.destination1 || '';
    document.querySelector('input[name="destination2"]').value = trip.destination2 || '';
    document.querySelector('input[name="destination3"]').value = trip.destination3 || '';
    document.getElementById('remarks').value = trip.remarks || '';
    
    // Check checkboxes
    if (trip.attachments) {
        document.getElementById('itinerary').checked = trip.attachments.includes('itinerary');
        document.getElementById('emailAsana').checked = trip.attachments.includes('emailAsana');
        document.getElementById('others').checked = trip.attachments.includes('others');
    }
    
    // Generate a control number if none exists
    if (!trip.controlNumber) {
        document.getElementById('controlNumber').value = generateControlNumber();
    } else {
        document.getElementById('controlNumber').value = trip.controlNumber;
    }
    
    // Switch to form view
    showView('form');
}

// Generate a control number
function generateControlNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${year}${month}${day}${random}`;
}

// Delete selected trip
function deleteSelectedTrip() {
    if (!selectedTripId) {
        alert('Please select a trip first.');
        return;
    }
    
    if (confirm('Are you sure you want to delete this trip?')) {
        trips = trips.filter(trip => trip.id !== selectedTripId);
        localStorage.setItem('motorpoolTrips', JSON.stringify(trips));
        selectedTripId = null;
        renderTripList();
    }
}

// Save trip to storage
function saveTrip() {
    const formData = {
        id: selectedTripId || Date.now().toString(),
        requestor: document.getElementById('requestor').value,
        contactNumber: document.getElementById('contactNumber').value,
        department: document.getElementById('department').value,
        dateOfTrip: document.getElementById('dateOfTrip').value,
        passengerContact: document.getElementById('passengerContact').value,
        numberOfPassengers: document.getElementById('numberOfPassengers').value,
        passengerNames: document.getElementById('passengerNames').value,
        purpose: document.getElementById('purpose').value,
        specialInstructions: document.getElementById('specialInstructions').value,
        destination1: document.querySelector('input[name="destination1"]').value,
        destination2: document.querySelector('input[name="destination2"]').value,
        destination3: document.querySelector('input[name="destination3"]').value,
        remarks: document.getElementById('remarks').value,
        controlNumber: document.getElementById('controlNumber').value,
        attachments: []
    };
    
    // Get checked attachments
    if (document.getElementById('itinerary').checked) {
        formData.attachments.push('itinerary');
    }
    if (document.getElementById('emailAsana').checked) {
        formData.attachments.push('emailAsana');
    }
    if (document.getElementById('others').checked) {
        formData.attachments.push('others');
    }
    
    // Update existing trip or add new one
    const index = trips.findIndex(trip => trip.id === formData.id);
    if (index !== -1) {
        trips[index] = formData;
    } else {
        trips.push(formData);
    }
    
    localStorage.setItem('motorpoolTrips', JSON.stringify(trips));
    alert('Trip saved successfully!');
    
    // Switch to list view
    showView('list');
}

// Save data to Google Sheets
async function saveToGoogleSheets() {
    try {
        // This is a simplified example - in a real implementation you would need to use the Sheets API
        // with proper authentication to write data
        
        alert('In a complete implementation, this would save to Google Sheets. For now, data is saved locally.');
        
        // For a real implementation, you would:
        // 1. Use the Google Sheets API with OAuth2 authentication
        // 2. Construct the data in the proper format for your sheet
        // 3. Make a POST request to the API to append the data
        
    } catch (error) {
        console.error('Error saving to Google Sheets:', error);
        alert('Error saving to Google Sheets. Data saved locally instead.');
    }
}

// Function to clear the form
function clearForm() {
    if (confirm('Are you sure you want to clear all form data?')) {
        document.querySelectorAll('input, textarea, select').forEach(element => {
            element.value = '';
        });
        // Uncheck all checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });
        // Generate a new control number
        document.getElementById('controlNumber').value = generateControlNumber();
        selectedTripId = null;
    }
}

// Function to fill sample data for testing
function fillSampleData() {
    document.getElementById('requestor').value = 'Maria Santos';
    document.getElementById('contactNumber').value = '0917-123-4567';
    document.getElementById('department').value = 'Marketing';
    document.getElementById('pickupVenue').value = 'CCF Main Building';
    document.getElementById('passengerContact').value = '0920-987-6543';
    document.getElementById('numberOfPassengers').value = '4';
    document.getElementById('passengerNames').value = 'Maria Santos, Juan Dela Cruz, Anna Reyes, Michael Lim';
    document.getElementById('purpose').value = 'Client presentation and meeting';
    document.getElementById('specialInstructions').value = 'Need projector and marketing materials in the vehicle';
    document.querySelector('input[name="destination1"]').value = 'Ortigas Center, Pasig City';
    document.querySelector('input[name="destination2"]').value = 'Bonifacio Global City, Taguig';
    document.getElementById('remarks').value = 'Urgent meeting with potential client';
    document.getElementById('itinerary').checked = true;
    document.getElementById('emailAsana').checked = true;
    
    // Generate a control number if none exists
    if (!document.getElementById('controlNumber').value) {
        document.getElementById('controlNumber').value = generateControlNumber();
    }
    
    alert('Sample data filled. Remember to save if you want to keep this data.');
}

// Set up form with current date/time
function setupForm() {
    const now = new Date();
    const pickupDateTime = document.getElementById('pickupDateTime');
    if (!pickupDateTime.value) {
        // Format the datetime for the input field
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        
        pickupDateTime.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Set date of trip to today if empty
    const dateOfTrip = document.getElementById('dateOfTrip');
    if (!dateOfTrip.value) {
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        
        dateOfTrip.value = `${year}-${month}-${day}`;
    }
    
    // Generate a control number if none exists
    const controlNumber = document.getElementById('controlNumber');
    if (!controlNumber.value) {
        controlNumber.value = generateControlNumber();
    }
}

// Initialize the application when the page loads
window.onload = init;
