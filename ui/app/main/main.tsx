import type { Direction, RouteTime } from "../../../sharedTypes/routeTimes";
import * as Plot from "@observablehq/plot";
import { DateTime } from "luxon";
// import * as d3 from "d3";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

type PlotHours = 'all' | 'slowest' | 'fastest' | 'difference';
type EnhancedRouteTime = RouteTime & {
    routeMinutes: number | null,
    routeDateTime: Date,
    estimated?: boolean,
}

const l8Yellow = "#e8b929";
const routeMiles = 1.09;

const getPlot = (routeData: EnhancedRouteTime[], plotHours: PlotHours, maxRouteMinutes: number) => {
    const groupRouteData = (routeDataToGroup: RouteTime[], hatchingId: string, minClosedLanes: number) => {
        return routeDataToGroup
            .reduce((acc, cur) => {
                const newObj = {
                    ...cur,
                    routeDateTime: new Date(Number(cur.unixMilliseconds)),
                    fill: `url(#${hatchingId}${Math.trunc((cur.closedBlocks || 0) / 1.7)})`,
                }
                if (cur.closedLanes && cur.closedLanes >= minClosedLanes) {
                    const previousGroup = acc[acc.length - 1];
                    const previousGroupedItem = previousGroup?.[previousGroup.length - 1];
                    if (previousGroupedItem?.closedBlocks === cur.closedBlocks
                        && Math.trunc(parseInt(previousGroupedItem?.unixMilliseconds) / 1000 / 60 / 60) + 1 === Math.trunc(parseInt(cur.unixMilliseconds) / 1000 / 60 / 60)) {
                        return [
                            ...acc.slice(0, -1),
                            [
                                ...acc[acc.length - 1],
                                newObj,
                            ]
                        ]
                    }
                    else {
                        return [
                            ...acc,
                            [newObj]
                        ];
                    }
                }
                return acc;
            }, [] as (RouteTime & { routeDateTime: Date; fill: string })[][]);
    }
    const oneLaneClosureData = groupRouteData(routeData, "rightLeftHatch", 1);
    const twoLaneClosureData = groupRouteData(routeData, "leftRightHatch", 2);
    const estimatedMissingHoursData = routeData
        .reduce((acc, cur) => {
            const newObj = {
                ...cur,
                routeDateTime: new Date(Number(cur.unixMilliseconds)),
                fill: `url(#leftRightHatchBlack)`,
            }
            if (cur && cur.estimated) {
                const previousGroup = acc[acc.length - 1];
                const previousGroupedItem = previousGroup?.[previousGroup.length - 1];
                if (previousGroupedItem && previousGroupedItem.estimated
                    && Math.trunc(parseInt(previousGroupedItem?.unixMilliseconds) / 1000 / 60 / 60) + 1 === Math.trunc(parseInt(cur.unixMilliseconds) / 1000 / 60 / 60)) {
                    return [
                        ...acc.slice(0, -1),
                        [
                            ...acc[acc.length - 1],
                            newObj,
                        ]
                    ]
                }
                else {
                    return [
                        ...acc,
                        [newObj]
                    ];
                }
            }
            return acc;
        }, [] as (EnhancedRouteTime & { routeDateTime: Date; fill: string })[][]);

    return Plot.plot({
        width: 1000,
        marginBottom: 50,
        y: { grid: true, domain: [0, maxRouteMinutes] },
        marks: [
            Plot.areaY(routeData, { x: "routeDateTime", y: "routeMinutes", fill: l8Yellow }),
            ...estimatedMissingHoursData.map((cur) => {
                return Plot.areaY(
                    cur,
                    {
                        x: "routeDateTime",
                        y: "routeMinutes",
                        fill: "fill",
                    }
                )
            }),
            ...oneLaneClosureData.map((cur) => {
                return Plot.areaY(
                    cur,
                    {
                        x: "routeDateTime",
                        y: "routeMinutes",
                        // stroke: "red",
                        fill: "fill",
                    }
                )
            }),
            ...twoLaneClosureData.map((cur) => {
                return Plot.areaY(
                    cur,
                    {
                        x: "routeDateTime",
                        y: "routeMinutes",
                        // stroke: "red",
                        fill: "fill",
                    }
                )
            }),
            Plot.tip(routeData, Plot.pointerX({
                x: "routeDateTime",
                y: "routeMinutes",
                title: (d) => [
                    `${DateTime.fromJSDate(d.routeDateTime).toFormat("ccc, LLL d 'at' h a")}`,
                    `Duration${plotHours === 'difference' ? ' difference' : ''}: ${Math.round(d.routeMinutes)} min`,
                    plotHours !== 'difference' ? `Speed: ${Math.round(60 / d.routeMinutes * routeMiles)} mph` : null,
                    d.closedLanes && d.closedBlocks ? `${d.closedLanes} lane${d.closedLanes === 1 ? '' : 's'} closed for ${d.closedBlocks} block${d.closedBlocks === 1 ? '' : 's'}` : null,
                    d.estimated ? "(estimated; data is missing)" : null,
                ].filter(Boolean).join("\n"),
            })),
            Plot.axisY({
                anchor: "left",
                label: "Route Duration (minutes)",
                labelAnchor: "center",
                interval: Math.max(1, Math.ceil(maxRouteMinutes / 20)),
                tickFormat: d => d.toString()
            }),
            Plot.axisX({
                anchor: "bottom",
                label: "Route Date and Time",
                labelAnchor: "center",
                ticks: 20,
                labelOffset: 50
            }),
        ],
    });
}

function Button({ children, onClick, active = false }: { children: string, onClick: () => void, active?: boolean }) {
    return (
        <button className={`bg-l8-yellow text-black border-4 ${active ? 'border-amber-800' : 'border-l8-yellow'} hover:bg-amber-500 rounded-xl cursor-pointer mr-2 py-2 px-3`} onClick={onClick}>{children}</button>
    )
}

function DayPlotButton({ children, daysToSet, currentDays, setPlotDays }: { children: string, daysToSet: number, currentDays: number, setPlotDays: Dispatch<SetStateAction<number>> }) {
    function updatePlotDays() {
        setPlotDays(daysToSet);
    }

    return (
        <Button onClick={updatePlotDays} active={currentDays === daysToSet}>{children}</Button>
    )
}

function HourPlotButton({ children, hoursToSet, currentHours, setPlotHours }: { children: string, hoursToSet: PlotHours, currentHours: PlotHours, setPlotHours: Dispatch<SetStateAction<PlotHours>> }) {
    function updatePlotHours() {
        setPlotHours(hoursToSet)
    }

    return (
        <Button onClick={updatePlotHours} active={currentHours === hoursToSet}>{children}</Button>
    )
}

const hourModeMap: { [key in PlotHours]: string } = {
    all: "All hours",
    slowest: "Slowest hour each day",
    fastest: "Fastest hour each day",
    difference: "Difference",
}

function PlotButtons({ currentDays, setPlotDays, currentHours, setPlotHours }: { currentDays: number, setPlotDays: Dispatch<SetStateAction<number>>, currentHours: PlotHours, setPlotHours: Dispatch<SetStateAction<PlotHours>> }) {
    return (
        <div className="lg:flex space-y-2 justify-between">
            <div className="flex justify-center">
                <DayPlotButton daysToSet={7} currentDays={currentDays} setPlotDays={setPlotDays}>Last 7 days</DayPlotButton>
                <DayPlotButton daysToSet={14} currentDays={currentDays} setPlotDays={setPlotDays}>Last 14 days</DayPlotButton>
                <DayPlotButton daysToSet={999} currentDays={currentDays} setPlotDays={setPlotDays}>All days</DayPlotButton>
            </div>
            <div className="flex justify-center">
                <HourPlotButton hoursToSet={'all'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["all"]}</HourPlotButton>
                <HourPlotButton hoursToSet={'slowest'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["slowest"]}</HourPlotButton>
                <HourPlotButton hoursToSet={'fastest'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["fastest"]}</HourPlotButton>
                {/* <HourPlotButton hoursToSet={'difference'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["difference"]}</HourPlotButton> */}
            </div>
        </div>
    )
}

const eastboundMedianHourlyTravelTimes: { [key: string]: { medianSeconds: number, listSeconds: number[] }[] } = {};
const westboundMedianHourlyTravelTimes: { [key: string]: { medianSeconds: number, listSeconds: number[] }[] } = {};

let routeDataLength = 0;
const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getMedian = (arr: number[]) => {
    const sorted = arr.filter(x => typeof x === "number" && !isNaN(x)).sort((a, b) => a - b);
    const len = sorted.length;
    if (len === 0) return 0;
    const mid = Math.floor(len / 2);
    return len % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
};

const populateMedianTravelTimes = (routeData: RouteTime[]) => {
    // avoid re-populating if the data hasn't changed
    if (routeDataLength === routeData.length) return;
    routeDataLength = routeData.length;
    for (const day of daysOfWeek) {
        eastboundMedianHourlyTravelTimes[day] = eastboundMedianHourlyTravelTimes[day] ?? [];
        westboundMedianHourlyTravelTimes[day] = westboundMedianHourlyTravelTimes[day] ?? [];
        for (let hour = 0; hour < 24; hour++) {
            eastboundMedianHourlyTravelTimes[day][hour] = { listSeconds: [], medianSeconds: 0 };
            westboundMedianHourlyTravelTimes[day][hour] = { listSeconds: [], medianSeconds: 0 };
        }
    }
    for (let i = 0; i < routeData.length; i++) {
        const dateTime = DateTime.fromMillis(Number(routeData[i].unixMilliseconds));
        const dayOfWeek = dateTime.weekdayShort;
        if (!dayOfWeek) continue;
        const hour = dateTime.hour;
        if (routeData[i].direction === "eastbound") {
            eastboundMedianHourlyTravelTimes[dayOfWeek][hour].listSeconds.push(routeData[i].routeSeconds);
        } else {
            westboundMedianHourlyTravelTimes[dayOfWeek][hour].listSeconds.push(routeData[i].routeSeconds);
        }
    }
    for (const day of daysOfWeek) {
        for (let hour = 0; hour < 24; hour++) {
            const eastListSeconds = eastboundMedianHourlyTravelTimes[day][hour].listSeconds;
            const westListSeconds = westboundMedianHourlyTravelTimes[day][hour].listSeconds
            eastboundMedianHourlyTravelTimes[day][hour]['medianSeconds'] = getMedian(eastListSeconds);
            westboundMedianHourlyTravelTimes[day][hour]['medianSeconds'] = getMedian(westListSeconds);
        }
    }
}

const medianTripTimesPerBlockOfOneLaneClosures = (maxClosedBlocks: number, routeData: EnhancedRouteTime[]) => {
    return Array.from({ length: maxClosedBlocks + 1 }, (_, i) => {
        const routeDataSamples = routeData
            .filter(datum => datum.closedBlocks === i && typeof datum.closedLanes === "number" && datum.closedLanes <= 1 && !datum.estimated)
        const medianTime = getMedian(
            routeDataSamples
                .map(datum => datum.routeMinutes)
                .filter((x): x is number => typeof x === "number" && !isNaN(x))
        );
        return <td key={i} className="px-3 py-1">{medianTime === 0 ? "N/A" : `${Math.round(medianTime)} min`}</td>
    })
}

export function Main({ routeData }: { routeData: RouteTime[] }) {
    const [plotDays, setPlotDays] = useState(7);
    const [plotHours, setPlotHours] = useState<PlotHours>('all');

    const eastboundContainerRef = useRef<HTMLDivElement>(null);
    const westboundContainerRef = useRef<HTMLDivElement>(null);

    const estimatePadRouteData = (routeDataToEstimatePad: RouteTime[]) => {
        populateMedianTravelTimes(routeData);
        let estimatePaddedRouteData = [];
        const routeDatum = routeDataToEstimatePad[0];
        estimatePaddedRouteData.push(routeDatum);
        for (let i = 1; i < routeDataToEstimatePad.length; i++) {
            const routeDatum = routeDataToEstimatePad[i];
            const previousRouteDatum = routeDataToEstimatePad[i - 1];
            const previousDateTime = DateTime.fromJSDate(new Date(parseInt(previousRouteDatum.unixMilliseconds)));
            const currentDateTime = DateTime.fromJSDate(new Date(parseInt(routeDatum.unixMilliseconds)));
            const differenceInHours = Math.trunc(Math.abs(currentDateTime.diff(previousDateTime, 'hours').hours));
            if (differenceInHours > 1) {
                for (let j = 1; j <= differenceInHours; j++) {
                    const jUnixMilliseconds = parseInt(previousRouteDatum.unixMilliseconds) + j * 60 * 60 * 1000;
                    const jDateTime = DateTime.fromMillis(jUnixMilliseconds);
                    const medianHourlyTravelTimes = routeDatum.direction === "eastbound" ? eastboundMedianHourlyTravelTimes : westboundMedianHourlyTravelTimes;
                    estimatePaddedRouteData.push({
                        unixMilliseconds: `${jUnixMilliseconds}`,
                        routeSeconds: medianHourlyTravelTimes[jDateTime.weekdayShort as string]?.[jDateTime.hour]['medianSeconds'],
                        direction: routeDatum.direction,
                        estimated: true,
                    });
                }
            }
            estimatePaddedRouteData.push(routeDatum);
        }
        return estimatePaddedRouteData;
    }

    // First, filter and estimate-pad the raw RouteTime data
    const timespanFilteredRouteData = routeData
        .filter(routeDatum => DateTime.now().minus({ days: plotDays }).toMillis() < parseInt(routeDatum.unixMilliseconds));
    const eastTimespanFilteredRouteData = estimatePadRouteData(timespanFilteredRouteData.filter(routeDatum => routeDatum.direction === "eastbound"));
    const westTimespanFilteredRouteData = estimatePadRouteData(timespanFilteredRouteData.filter(routeDatum => routeDatum.direction === "westbound"));

    // Then, map to EnhancedRouteTime (with routeMinutes and routeDateTime)
    const eastTimespanGroomedRouteData: EnhancedRouteTime[] = eastTimespanFilteredRouteData
        .map(routeDatum => ({
            ...routeDatum,
            routeMinutes: routeDatum.routeSeconds / 60,
            routeDateTime: new Date(Number(routeDatum.unixMilliseconds)),
        }));
    const westTimespanGroomedRouteData: EnhancedRouteTime[] = westTimespanFilteredRouteData
        .map(routeDatum => ({
            ...routeDatum,
            routeMinutes: routeDatum.routeSeconds / 60,
            routeDateTime: new Date(Number(routeDatum.unixMilliseconds)),
        }));

    const dayReduce = (acc: { [date: string]: EnhancedRouteTime[] }, datum: EnhancedRouteTime) => {
        const date = DateTime.fromJSDate(datum.routeDateTime).toLocaleString(DateTime.DATE_SHORT);
        acc[date] = acc[date] || [];
        acc[date].push(datum);
        return acc;
    }

    const hourReduce = (acc: EnhancedRouteTime[], datum: EnhancedRouteTime[]): EnhancedRouteTime[] => {
        if (plotHours === 'all') {
            return acc.concat(datum);
        }
        const slowestHour = datum
            .filter(routeDatum => !isNaN(routeDatum.routeSeconds))
            .reduce((acc, routeDatum) => {
                if (routeDatum.routeSeconds > acc.routeSeconds) return routeDatum;
                return acc;
            });
        const fastestHour = datum
            .filter(routeDatum => !isNaN(routeDatum.routeSeconds))
            .reduce((acc, routeDatum) => {
                if (routeDatum.routeSeconds < acc.routeSeconds) return routeDatum;
                return acc;
            });
        switch (plotHours) {
            case 'slowest': {
                return acc.concat(slowestHour);
            }
            case 'fastest': {
                return acc.concat(fastestHour);
            }
            case 'difference': {
                const difference = slowestHour.routeSeconds - fastestHour.routeSeconds;
                const differenceRouteTime: EnhancedRouteTime = {
                    ...slowestHour,
                    routeSeconds: difference,
                    routeMinutes: difference / 60,
                }
                return acc.concat(differenceRouteTime);
            }
        }
    }

    const eastBoundRouteData = Object.values(eastTimespanGroomedRouteData
        .reduce(dayReduce, {}))
        .reduce(hourReduce, []);
    const westBoundRouteData = Object.values(westTimespanGroomedRouteData
        .reduce(dayReduce, {}))
        .reduce(hourReduce, []);
    const maxClosedBlocks = [...eastBoundRouteData, ...westBoundRouteData]
        .filter(datum => typeof datum.closedBlocks === "number" && !isNaN(datum.closedBlocks))
        .reduce((acc, cur) => {
            return (cur.closedBlocks as number) > acc ? (cur.closedBlocks as number) : acc;
        }, 0);

    useEffect(() => {
        const maxRouteMinutes = Math.max(
            ...eastBoundRouteData.map(d => d.routeMinutes ?? 0),
            ...westBoundRouteData.map(d => d.routeMinutes ?? 0)
        );
        const eastBoundPlot = getPlot(eastBoundRouteData, plotHours, maxRouteMinutes);
        const westBoundPlot = getPlot(westBoundRouteData, plotHours, maxRouteMinutes);
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
            <div className="flex-1 flex flex-col items-center gap-16 min-h-0 w-full">
                <header className="flex flex-col items-center gap-9">
                    <h1 className="text-3xl font-medium">Denny Way Traffic History</h1>
                    <p>This is how much time it takes to get from Queen Anne Ave. to Virginia St. (or vice versa) on Denny Way every hour by car. It is a total distance of 1.1 miles.</p>
                </header>
                <div ref={eastboundContainerRef} className="space-y-3 px-4 overflow-x-auto w-full">
                    <h2 className="text-xl font-bold text-center">Eastbound</h2>
                    <PlotButtons currentDays={plotDays} setPlotDays={setPlotDays} currentHours={plotHours} setPlotHours={setPlotHours} />
                </div>
                <div ref={westboundContainerRef} className="space-y-3 px-4 overflow-x-auto w-full">
                    <p className="text-xl font-bold text-center">Westbound</p>
                    <PlotButtons currentDays={plotDays} setPlotDays={setPlotDays} currentHours={plotHours} setPlotHours={setPlotHours} />
                </div>
                <div className="space-y-3 w-full">
                    <p>Walking speed is about 3 mph. Route times for each direction are queried every hour using the <a href="https://developers.google.com/maps/documentation/routes" target="_blank">Google Maps Routes API</a>. These times are calculated for cars, but a bus making stops would travel even more slowly.</p>
                    <p>Here is a table showing the effect that lane closures have on travel times, depending on how many blocks are closed:</p>
                    <PlotButtons currentDays={plotDays} setPlotDays={setPlotDays} currentHours={plotHours} setPlotHours={setPlotHours} />
                    <table className="mx-auto table-auto border-collapse border border-l8-yellow border-4">
                        <thead>
                            <tr>
                                <th className="px-3 py-1">Direction</th>
                                <th colSpan={maxClosedBlocks + 1} className="px-3 py-1">Median trip times per blocks of one-lane closures ({hourModeMap[plotHours]})</th>
                            </tr>
                            <tr>
                                <th></th>
                                {
                                    Array.from({ length: maxClosedBlocks + 1 }, (_, i) => (
                                        <th key={i} className="px-3 py-1 text-left">{i} block{i !== 1 ? "s" : ""}</th>
                                    ))
                                }
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="px-3 py-1"><strong>Eastbound</strong></td>
                                {
                                    medianTripTimesPerBlockOfOneLaneClosures(maxClosedBlocks, eastBoundRouteData)
                                }
                            </tr>
                            <tr>
                                <td className="px-3 py-1"><strong>Westbound</strong></td>
                                {
                                    medianTripTimesPerBlockOfOneLaneClosures(maxClosedBlocks, westBoundRouteData)
                                }
                            </tr>
                        </tbody>
                    </table>
                    <p>This project was made to illustrate how helpful it would be for King County Metro Route 8 to have dedicated bus lanes on Denny Way. Learn more about Route 8's issues and how to fix them <a href="https://fixthel8.com/" target="_blank">here</a>.</p>
                </div>
                <footer className="text-gray-300 text-sm">
                    Source: <a href="https://github.com/intcreator/denny-way-traffic" target="_blank">GitHub</a>
                </footer>
            </div>
        </main >
    );
}
