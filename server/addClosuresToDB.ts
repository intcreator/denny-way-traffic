import fs from "fs";
import { DateTime } from "luxon";
import mariadb from "mariadb";
import path from "path";
import type { Direction, RouteTime } from "../sharedTypes/routeTimes";

const pool = mariadb.createPool({
    host: process.env.MARIADB_HOST,
    user: process.env.MARIADB_USER,
    password: process.env.MARIADB_PASSWORD,
    connectionLimit: 5,
    acquireTimeout: 3000,
    database: process.env.MARIADB_DATABASE,
});

console.log(`Created pool with host ${process.env.MARIADB_HOST}`);

const updateClosuresInDB = async (direction: Direction) => {
    // open csv file
    const csvFilePath = path.join(`${direction}Closures.csv`);
    const csvFile = fs.readFileSync(csvFilePath, "utf-8");
    const csvLines = csvFile
        .split('')
        .filter((char: string) => char !== '\r')
        .join('')
        .split("\n")
        .slice(1)
        .map(line => line.split(","))
        .map(line => {
            return [
                ...line,
                DateTime.fromFormat(`${line[0]} ${line[1]}`, "M/d h:mm a").toMillis(),
            ];
        });
    // console.log(csvLines);

    // get data for this direction from DB
    let connection;
    try {
        connection = await pool.getConnection();
        const res = await connection.query("SELECT * FROM hourlyTrips WHERE direction = ?", [direction]);
        let csvIter = 0;
        const firstRouteTimeUnixHour = Math.floor(parseInt(res[0].unixMilliseconds) / 1000 / 60 / 60);
        // console.log(res)
        for (let i = 0; i < res.length; i++) {
            // if (i > 20) break;
            // console.log(`Processing DB line ${i + 1} of ${res.length}`);
            let csvLine, closureUnixHour;
            const routeTime = res[i];
            const routeTimeUnixHour = Math.floor(parseInt(routeTime.unixMilliseconds) / 1000 / 60 / 60);
            while (csvIter < csvLines.length) {
                csvLine = csvLines[csvIter];
                const closureUnixMilliseconds = csvLine[csvLine.length - 1] as number;
                closureUnixHour = closureUnixMilliseconds / 1000 / 60 / 60;
                console.log(`CSV line ${csvIter} of ${csvLines.length} with closure ${closureUnixHour}`);
                if (closureUnixHour < firstRouteTimeUnixHour) {
                    csvIter++;
                    continue;
                }
                if (closureUnixHour >= routeTimeUnixHour) break;
                csvIter++;
            }
            console.log(`${direction} DB index ${i} and csv line ${csvIter} comparing ${routeTimeUnixHour} and ${closureUnixHour}`);
            // check if routeTime the same as closure
            if (csvLine && routeTimeUnixHour === closureUnixHour) {
                console.log(`Found match for ${routeTimeUnixHour} and ${closureUnixHour}`);
                // update closedLanes and closedBlocks in DB
                const updateRes = await connection.query("UPDATE hourlyTrips SET closedLanes = ?, closedBlocks = ? WHERE unixMilliseconds = ? AND direction = ?", [csvLine[2], csvLine[3], routeTime.unixMilliseconds, direction]);
                console.log(updateRes);
                // csvIter++;
                if (csvIter >= csvLines.length) {
                    break;
                }
            } else {
                const updateRes = await connection.query("UPDATE hourlyTrips SET closedLanes = ?, closedBlocks = ? WHERE unixMilliseconds = ? AND direction = ?", [0, 0, routeTime.unixMilliseconds, direction]);
                console.log(updateRes);
            }
        }
    } catch (error) {
        const errorMessage = 'Could not get route times from DB';
        console.error(errorMessage, error);
    } finally {
        if (connection) await connection.end();
        console.log("done")
    }

}

(async () => {
    await updateClosuresInDB("eastbound");
    await updateClosuresInDB("westbound");
    await pool.end();
    process.exit(0);
})();
