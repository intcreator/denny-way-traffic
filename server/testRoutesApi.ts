import type { Direction } from "../sharedTypes/routeTimes"

type GoogleMapsAPIJSON = {
    routes: {
        // distanceMeters: number;
        duration: string;
        // polyline: {
        //     encodedPolyline: string;
        // }
    }[]
};

// Denny Way and Queen Anne Ave.
const westLatLng = {
    "latitude": 47.61858921320053,
    "longitude": -122.35660940186938
}
// Denny Way and Virginia St.
const eastLatLng = {
    "latitude": 47.61851690044713,
    "longitude": -122.33315915682361
}

const getRouteTimeFromGoogleMaps = async (direction: Direction) => {
    try {
        const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: {
                'X-Goog-Api-Key': process.env.GOOGLE_MAPS_API_KEY as string,
                'X-Goog-FieldMask': 'routes.duration',
            },
            body: JSON.stringify({
                "origin": {
                    "location": {
                        "latLng": direction === 'eastbound' ? westLatLng : eastLatLng
                    }
                },
                "destination": {
                    "location": {
                        "latLng": direction === 'eastbound' ? eastLatLng : westLatLng
                    }
                },
                "travelMode": "DRIVE",
                "routingPreference": "TRAFFIC_AWARE",
                "computeAlternativeRoutes": false,
                "routeModifiers": {
                    "avoidTolls": false,
                    "avoidHighways": false,
                    "avoidFerries": false
                },
                "languageCode": "en-US",
                "units": "IMPERIAL"
            })
        });
        const json = await response.json() as GoogleMapsAPIJSON;
        // console.log(json);
        return parseInt(json.routes[0].duration.slice(0, -1));
    } catch (error) {
        console.error('Could not make request to Google Maps API', error)
    }
}

(async () => {
    console.log(`Denny route time is ${await getRouteTimeFromGoogleMaps('eastbound')} seconds`);
    process.exit(0);
})();