const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherContent = document.getElementById('weatherContent');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('errorMessage');

// DOM Elements for updating
const cityNameEl = document.getElementById('cityName');
const tempEl = document.getElementById('temp');
const conditionEl = document.getElementById('condition');
const windSpeedEl = document.getElementById('windSpeed');
const humidityEl = document.getElementById('humidity');
const mainIconEl = document.getElementById('mainIcon');

// WMO Weather interpretation codes (Open-Meteo)
const weatherCodes = {
    0: { text: "Clear sky", icon: "fa-sun" },
    1: { text: "Mainly clear", icon: "fa-cloud-sun" },
    2: { text: "Partly cloudy", icon: "fa-cloud-sun" },
    3: { text: "Overcast", icon: "fa-cloud" },
    45: { text: "Fog", icon: "fa-smog" },
    48: { text: "Depositing rime fog", icon: "fa-smog" },
    51: { text: "Light drizzle", icon: "fa-cloud-rain" },
    53: { text: "Moderate drizzle", icon: "fa-cloud-rain" },
    55: { text: "Dense drizzle", icon: "fa-cloud-showers-heavy" },
    61: { text: "Slight rain", icon: "fa-cloud-rain" },
    63: { text: "Moderate rain", icon: "fa-cloud-showers-heavy" },
    65: { text: "Heavy rain", icon: "fa-cloud-showers-heavy" },
    71: { text: "Slight snow fall", icon: "fa-snowflake" },
    73: { text: "Moderate snow fall", icon: "fa-snowflake" },
    75: { text: "Heavy snow fall", icon: "fa-snowflake" },
    77: { text: "Snow grains", icon: "fa-snowflake" },
    80: { text: "Slight rain showers", icon: "fa-cloud-sun-rain" },
    81: { text: "Moderate rain showers", icon: "fa-cloud-showers-water" },
    82: { text: "Violent rain showers", icon: "fa-cloud-showers-heavy" },
    95: { text: "Thunderstorm", icon: "fa-cloud-bolt" },
    96: { text: "Thunderstorm with slight hail", icon: "fa-cloud-bolt" },
    99: { text: "Thunderstorm with heavy hail", icon: "fa-cloud-bolt" }
};

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

async function handleSearch() {
    const city = cityInput.value.trim();
    if (!city) return;

    // UI Updates
    weatherContent.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        // Try Python Backend First
        let data = await fetchFromBackend(city);
        
        // Fallback to direct API if backend is not running
        if (!data) {
            console.log("Backend not reachable. Falling back to direct API calls.");
            data = await fetchDirectly(city);
        }

        updateUI(data);
    } catch (error) {
        console.error("Error fetching weather:", error);
        showError();
    }
}

async function fetchFromBackend(city) {
    try {
        const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        return null;
    }
}

async function fetchDirectly(city) {
    // 1. Geocoding
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) {
        throw new Error("City not found");
    }

    const loc = geoData.results[0];
    const cityDisplay = `${loc.name}, ${loc.country || ''}`.replace(/,\s*$/, "");

    // 2. Weather
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m`);
    const weatherData = await weatherRes.json();
    const current = weatherData.current_weather;
    const hourly = weatherData.hourly;

    // Get current humidity (using closest hour)
    const currentHourIndex = hourly.time.findIndex(t => t.startsWith(current.time));
    const humidity = currentHourIndex !== -1 ? hourly.relative_humidity_2m[currentHourIndex] : '--';

    return {
        city: cityDisplay,
        temperature: current.temperature,
        windspeed: current.windspeed,
        weathercode: current.weathercode,
        humidity: humidity
    };
}

function updateUI(data) {
    loader.classList.add('hidden');
    
    cityNameEl.textContent = data.city;
    tempEl.innerHTML = `${Math.round(data.temperature)}°<span class="unit">C</span>`;
    windSpeedEl.textContent = `${data.windspeed} km/h`;
    
    // Some backend routes might not return humidity if not implemented, default to direct
    humidityEl.textContent = data.humidity !== undefined ? `${data.humidity}%` : '--%';

    const weatherInfo = weatherCodes[data.weathercode] || { text: "Unknown", icon: "fa-cloud" };
    conditionEl.textContent = weatherInfo.text;
    
    mainIconEl.className = `fa-solid ${weatherInfo.icon} weather-icon`;

    // Dynamic background based on temperature
    updateBackground(data.temperature);

    weatherContent.classList.remove('hidden');
}

function showError() {
    loader.classList.add('hidden');
    errorMessage.classList.remove('hidden');
}

function updateBackground(temp) {
    const root = document.documentElement;
    if (temp > 25) {
        // Hot
        root.style.setProperty('--grad-1', '#ff4e50');
        root.style.setProperty('--grad-2', '#f9d423');
    } else if (temp < 10) {
        // Cold
        root.style.setProperty('--grad-1', '#00c6ff');
        root.style.setProperty('--grad-2', '#0072ff');
    } else {
        // Mild
        root.style.setProperty('--grad-1', '#3f2b96');
        root.style.setProperty('--grad-2', '#a8c0ff');
    }
}

// Initial default search
document.addEventListener('DOMContentLoaded', () => {
    cityInput.value = "London";
    handleSearch();
});
