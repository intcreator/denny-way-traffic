import express from "express";
import { CronJob } from 'cron';
import mariadb from "mariadb";

import type { Direction, RouteTime } from "../sharedTypes/routeTimes"

type GoogleMapsAPIJSON = {
    routes: {
        // distanceMeters: number;
        duration: string;
        // polyline: {
        //     encodedPolyline: string;
        // }
    }[]
};

const pool = mariadb.createPool({
    host: process.env.MARIADB_HOST,
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    connectionLimit: 5,
    acquireTimeout: 3000,
    database: process.env.MARIADB_DATABASE,
});

console.log(`Created pool with host ${process.env.MARIADB_HOST}`)

const storeRouteTimeInDB = async (unixMilliseconds: number, routeSeconds: number, direction: Direction) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const res = await connection.query("INSERT INTO hourlyTrips (unixMilliseconds, routeSeconds, direction) VALUES (?, ?, ?)", [unixMilliseconds, routeSeconds, direction]);
        console.log(res); // { affectedRows: 1, insertId: 1, warningStatus: 0 }
    } catch (error) {
        console.error('Could not store time in DB', error);
    } finally {
        if (connection) connection.end();
    }
}

const getRouteTimesFromDB = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        const res = await connection.query("SELECT * FROM hourlyTrips");
        // console.log(res);
        return res.map((routeTime: RouteTime) => {
            return {
                ...routeTime,
                unixMilliseconds: routeTime.unixMilliseconds.toString()
            }
        });
    } catch (error) {
        const errorMessage = 'Could not get route times from DB';
        console.error(errorMessage, error);
        return JSON.stringify({
            errorMessage,
            error
        });
    } finally {
        if (connection) connection.end();
    }
}

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
// distance is 1756 meters

const getRouteTimeFromGoogleMaps = async (direction: Direction) => {
    let json;
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
        json = await response.json() as GoogleMapsAPIJSON;
        // console.log(json);
        return parseInt(json.routes[0].duration.slice(0, -1));
    } catch (error) {
        console.error('Could not make request to Google Maps API', error);
        console.log(json);
        console.log(json?.routes);
    }
}

export const hourlyJob = async () => {
    const unixMilliseconds = Date.now();
    const eastboundRouteSeconds = await getRouteTimeFromGoogleMaps('eastbound');
    // const eastboundRouteSeconds = 1;
    if (typeof eastboundRouteSeconds === 'number') {
        await storeRouteTimeInDB(unixMilliseconds, eastboundRouteSeconds, 'eastbound');
        console.log(`Finished storing eastbound route time ${eastboundRouteSeconds} as of ${new Date(unixMilliseconds)}`)
    }
    const westboundRouteSeconds = await getRouteTimeFromGoogleMaps('westbound');
    // const westboundRouteSeconds = 2;
    if (typeof westboundRouteSeconds === 'number') {
        await storeRouteTimeInDB(unixMilliseconds, westboundRouteSeconds, 'westbound');
        console.log(`Finished storing westbound route time ${westboundRouteSeconds} as of ${new Date(unixMilliseconds)}`)
    }
}

// hourlyJob();

const job = CronJob.from({
    // cronTime: '* * * * *',
    cronTime: '0 * * * *',
    onTick: function () {
        hourlyJob();
    },
    start: true,
    timeZone: 'UTC'
});

const app = express()
const port = 3000

app.get('/healthCheck', (req, res) => {
    res.send('Server running!')
})

app.get('/getRouteTimes', async (req, res) => {
    res.send(await getRouteTimesFromDB());
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
