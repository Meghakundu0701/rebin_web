const https = require('https');

/**
 * Geocode an address string to lat/lng using OpenStreetMap Nominatim (free, no key).
 * Uses Node built-in https module — no external dependencies needed.
 */
function geocodeAddress(addressStr) {
  return new Promise((resolve) => {
    try {
      const query = encodeURIComponent(addressStr);
      const options = {
        hostname: 'nominatim.openstreetmap.org',
        path: `/search?format=json&q=${query}&limit=1`,
        method: 'GET',
        headers: {
          'User-Agent': 'ReBin-App/1.0 (rebin.in)'
        }
      };

      const req = https.request(options, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(rawData);
            if (data && data.length > 0) {
              resolve({
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                display_name: data[0].display_name
              });
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        });
      });

      req.on('error', (e) => {
        console.error('Geocoding request error:', e.message);
        resolve(null);
      });

      // Timeout after 5 seconds so it doesn't hang the pickup route
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(null);
      });

      req.end();
    } catch (err) {
      console.error('Geocoding error:', err.message);
      resolve(null);
    }
  });
}

/**
 * Calculate distance between two coordinates in km (Haversine formula)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate ETA in minutes based on distance (assuming ~20 km/h in city)
 */
function estimateETA(distanceKm) {
  const speedKmH = 20;
  return Math.ceil((distanceKm / speedKmH) * 60);
}

module.exports = { geocodeAddress, haversineDistance, estimateETA };
