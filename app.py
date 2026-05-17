from flask import Flask, jsonify, request, send_from_directory
import requests
import os

app = Flask(__name__, static_folder='static')

# Add a mock database or API key handler if needed in the future
# Currently using Open-Meteo which does not require an API key

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/weather', methods=['GET'])
def get_weather():
    city = request.args.get('city')
    if not city:
        return jsonify({"error": "City parameter is required"}), 400

    # Step 1: Geocoding (City name to Lat/Lon)
    geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json"
    try:
        geo_response = requests.get(geocode_url)
        geo_data = geo_response.json()
        
        if not geo_data.get('results'):
            return jsonify({"error": "City not found"}), 404
            
        location = geo_data['results'][0]
        lat = location['latitude']
        lon = location['longitude']
        city_name = location['name']
        country = location.get('country', '')

        # Step 2: Get Weather Data
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m"
        weather_response = requests.get(weather_url)
        weather_data = weather_response.json()

        current = weather_data.get('current_weather', {})
        
        # Format the response for our frontend
        return jsonify({
            "city": f"{city_name}, {country}".strip(', '),
            "temperature": current.get('temperature'),
            "windspeed": current.get('windspeed'),
            "weathercode": current.get('weathercode'),
            "time": current.get('time')
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
