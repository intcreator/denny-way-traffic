import type { Direction, RouteTime } from "../../../sharedTypes/routeTimes";
import * as Plot from "@observablehq/plot";
import { DateTime } from "luxon";
// import * as d3 from "d3";
import { useEffect, useRef, useState } from "react";

const l8Yellow = "#e8b929";
const routeMiles = 1.09;

const getPlot = (routeData: RouteTime[]) => {
    return Plot.plot({
        width: 1000,
        marginBottom: 50,
        y: { grid: true },
        marks: [
            Plot.areaY(routeData, { x: "routeDateTime", y: "routeMinutes", fill: l8Yellow }),
            Plot.tip(routeData, Plot.pointerX({
                x: "routeDateTime",
                y: "routeMinutes",
                title: (d) => `${DateTime.fromJSDate(d.routeDateTime).toFormat("ccc, LLL d 'at' h a")}\nDuration: ${Math.round(d.routeMinutes)} min\nSpeed: ${Math.round(60 / d.routeMinutes * routeMiles)} mph`,
            })),
            Plot.axisY({ anchor: "left", label: "Route Duration (minutes)", labelAnchor: "center", interval: 1 }),
            Plot.axisX({ anchor: "bottom", label: "Route Date and Time", labelAnchor: "center", ticks: 20, labelOffset: 50 }),
        ],
    });
}

export function Main({ routeData }: { routeData: RouteTime[] }) {
    const eastboundContainerRef = useRef<HTMLDivElement>(null);
    const westboundContainerRef = useRef<HTMLDivElement>(null);
    const groomedRouteData = routeData
        .map(routeDatum => {
            return {
                ...routeDatum,
                routeMinutes: routeDatum.routeSeconds / 60,
                routeDateTime: new Date(Number(routeDatum.unixMilliseconds)),
            }
        })
    const eastBoundRouteData = groomedRouteData.filter(routeDatum => routeDatum.direction === "eastbound")
    const westBoundRouteData = groomedRouteData.filter(routeDatum => routeDatum.direction === "westbound")

    useEffect(() => {
        // console.log(eastBoundRouteData);
        // if (eastBoundRouteData === undefined) return;
        const eastBoundPlot = getPlot(eastBoundRouteData);
        const westBoundPlot = getPlot(westBoundRouteData);
        if (eastboundContainerRef.current) {
            eastboundContainerRef.current.append(eastBoundPlot);
        }
        if (westboundContainerRef.current) {
            westboundContainerRef.current.append(westBoundPlot);
        }
        return () => {
            eastBoundPlot.remove();
            westBoundPlot.remove();
        }
    }, [eastBoundRouteData, westBoundRouteData]);

    return (
        <main className="flex items-center justify-center pt-16 pb-4 max-w-5xl mx-auto">
            <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
                <header className="flex flex-col items-center gap-9">
                    <h1 className="text-3xl font-medium">Denny Way Traffic</h1>
                    <p>This is how much time it takes to get from Queen Anne Ave. and Virginia St. (or vice versa) on Denny Way every hour. It is a total distance of 1.1 miles.</p>
                </header>
                <div ref={eastboundContainerRef} className="space-y-3 px-4">
                    <h2 className="text-xl font-bold text-center">Eastbound</h2>
                </div>
                <div ref={westboundContainerRef} className="space-y-3 px-4">
                    <p className="text-xl font-bold text-center">Westbound</p>
                </div>
                <div className="space-y-3">
                    <p>Walking speed is about 3 mph. Route times for each direction are queried every hour using the <a href="https://developers.google.com/maps/documentation/routes" target="_blank">Google Maps Routes API</a>. These times are calculated for cars, but a bus making stops would travel even more slowly.</p>
                    <p>This project was made to illustrate how helpful it would be for King County Metro Route 8 to have dedicated bus lanes on Denny Way. Learn more about Route 8's issues and how to fix them <a href="https://fixthel8.com/" target="_blank">here</a>.</p>
                </div>
                <footer className="text-gray-300 text-sm">
                    Source: <a href="https://github.com/intcreator/denny-way-traffic" target="_blank">GitHub</a>
                </footer>
            </div>
        </main >
    );
}
