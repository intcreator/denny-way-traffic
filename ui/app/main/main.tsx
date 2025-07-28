import type { Direction, RouteTime } from "../../../sharedTypes/routeTimes";
import * as Plot from "@observablehq/plot";
import { DateTime } from "luxon";
// import * as d3 from "d3";
import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useLoaderData, useRevalidator } from "react-router";
import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
import "../datepicker.css"

type PlotHours = 'all' | 'slowest' | 'fastest' | 'difference';
type EnhancedRouteTime = RouteTime & {
    routeMinutes: number | null,
    routeDate: Date,
    plotRouteDate: Date,
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
                    routeDate: new Date(Number(cur.unixMilliseconds)),
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
            }, [] as (RouteTime & { routeDate: Date; fill: string })[][]);
    }
    const oneLaneClosureData = groupRouteData(routeData, "rightLeftHatch", 1);
    const twoLaneClosureData = groupRouteData(routeData, "leftRightHatch", 2);
    const estimatedMissingHoursData = routeData
        .reduce((acc, cur) => {
            const newObj = {
                ...cur,
                routeDate: new Date(Number(cur.unixMilliseconds)),
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
        }, [] as (EnhancedRouteTime & { routeDate: Date; fill: string })[][]);

    const tickModulus = Math.floor(routeData.length / 15);

    return Plot.plot({
        width: 950,
        marginBottom: 50,
        y: { grid: true, domain: [0, maxRouteMinutes] },
        marks: [
            Plot.areaY(routeData, { x: "plotRouteDate", y: "routeMinutes", fill: l8Yellow }),
            ...estimatedMissingHoursData.map((cur) => {
                return Plot.areaY(
                    cur,
                    {
                        x: "routeDate",
                        y: "routeMinutes",
                        fill: "fill",
                    }
                )
            }),
            ...oneLaneClosureData.map((cur) => {
                return Plot.areaY(
                    cur,
                    {
                        x: "routeDate",
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
                        x: "routeDate",
                        y: "routeMinutes",
                        // stroke: "red",
                        fill: "fill",
                    }
                )
            }),
            // Yale St. closed 7/14-7/21
            Plot.tip(routeData, Plot.pointerX({
                x: "plotRouteDate",
                y: "routeMinutes",
                title: (d) => [
                    `${DateTime.fromJSDate(d.routeDate).toFormat("ccc, LLL d 'at' h a")}`,
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
                ticks: routeData
                    // .map(datum => datum.plotRouteDate),
                    .reduce<Date[]>((acc, cur, index) => {
                        if (index !== 0 && index % tickModulus === 0 && index !== routeData.length - 1) {
                            if (index > 0 && routeData[index].plotRouteDate.getDate() === routeData[index - 1].plotRouteDate.getDate()) {
                                return [...acc, cur.plotRouteDate];
                            }
                            return [...acc, cur.plotRouteDate]
                        }
                        return acc;
                    }, []),
                labelOffset: 50,
                tickFormat: (d) => {
                    if (plotHours === "all" && DateTime.fromJSDate(routeData.slice(-1)[0].plotRouteDate).diff(DateTime.fromJSDate(routeData[0].plotRouteDate), 'days').days < 4) {
                        if (d.includeTickDate) {
                            return DateTime.fromJSDate(d)
                                .toFormat("h a\nLLL d");
                        }
                        return DateTime.fromJSDate(d)
                            .toFormat("h a");
                    }
                    return DateTime.fromJSDate(d)
                        .toFormat("LLL d");
                }
            }),
        ],
    });
}

function Button({ children, onClick, active = false, className = "", ref = null }: { children: string, onClick: () => void, active?: boolean, className?: string, ref?: React.Ref<HTMLButtonElement> }) {
    return (
        <button ref={ref} className={`bg-l8-yellow text-black border-4 ${active ? 'border-amber-800' : 'border-l8-yellow'} hover:bg-amber-500 rounded-xl cursor-pointer py-2 px-3 ${className}`} onClick={onClick}>{children}</button>
    )
}

function DayPlotButton({ children, daysToSet, startDate, endDate, setPlotDates, className = '' }: { children: string, daysToSet: number, startDate: DateTime | null, endDate: DateTime | null, setPlotDates: (start: DateTime | null, end: DateTime | null) => void, className?: string }) {
    function updatePlotDays() {
        setPlotDates(DateTime.now().minus({ days: daysToSet }), DateTime.now());
    }

    return (
        <Button onClick={updatePlotDays} active={!!startDate && !!endDate && endDate.diff(startDate, 'days').as('days') === daysToSet} className={className}>{children}</Button>
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

function Dropdown({ title, children }: { title: string, children: ReactNode }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownAlignRight, setDropdownAlignRight] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    function toggleDropdown() {
        setDropdownOpen(!dropdownOpen);
    }

    function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDropdownOpen(false);
        }
    }

    useEffect(() => {
        if (dropdownOpen && dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            const parentRect = dropdownRef.current.parentElement?.getBoundingClientRect();
            if (rect.width + (parentRect?.left ?? 0) > window.innerWidth) {
                setDropdownAlignRight(true);
            } else {
                setDropdownAlignRight(false);
            }
        }
    }, [dropdownOpen]);

    return (
        <div className="relative" tabIndex={0} onBlur={handleBlur}>
            <Button ref={buttonRef} className={dropdownOpen ? ' rounded-b-none' : ''} onClick={toggleDropdown}>{title}</Button>
            <div ref={dropdownRef} style={{ top: `${buttonRef.current?.offsetHeight}px`, right: dropdownAlignRight ? 0 : 'auto' }} className={`absolute min-w-max z-10 bg-white dark:bg-gray-950 border rounded-t-none ${dropdownOpen ? 'block' : 'hidden'} border-4 border-l8-yellow rounded-xl shadow-lg`}>
                {children}
            </div>
        </div>
    )
}

const hourModeMap: { [key in PlotHours]: string } = {
    all: "All hours",
    slowest: "Slowest hour each day",
    fastest: "Fastest hour each day",
    difference: "Difference",
}

function PlotButtons({ startDate, endDate, minStartDate, maxEndDate, setPlotDates, currentHours, setPlotHours, className = "" }: { startDate: DateTime | null, endDate: DateTime | null, minStartDate: DateTime, maxEndDate: DateTime, setPlotDates: (start: DateTime | null, end: DateTime | null) => void, currentHours: PlotHours, setPlotHours: Dispatch<SetStateAction<PlotHours>>, className?: string }) {
    // const setStartDate = (date: Date | null) => {
    //     if (date) setPlotDates(DateTime.fromJSDate(date), endDate);
    // };
    // const setEndDate = (date: Date | null) => {
    //     if (date) setPlotDates(startDate, DateTime.fromJSDate(date));
    // };
    const setDates = (dates: [Date | null, Date | null]) => {
        setPlotDates(
            dates[0] ? DateTime.fromJSDate(dates[0]) : null,
            dates[1] ? DateTime.fromJSDate(dates[1]) : null
        );
    };

    return (
        <div className={`${className}`}>
            <div className={`lg:flex space-y-2 justify-between`}>
                <div className="flex justify-center space-x-2">
                    <DayPlotButton daysToSet={7} startDate={startDate} endDate={endDate} setPlotDates={setPlotDates}>Last 7 days</DayPlotButton>
                    <DayPlotButton daysToSet={14} startDate={startDate} endDate={endDate} setPlotDates={setPlotDates}>Last 14 days</DayPlotButton>
                    <Dropdown title="More options">
                        <div className="flex flex-col text-center">
                            <DatePicker className="bg-l8-yellow text-black border-4 border-l8-yellow hover:bg-amber-500 rounded-none cursor-pointer py-2 px-3 block w-full"
                                // selected={importantDates.startDate.toJSDate()}
                                // onSelect={setStartDate} //when day is clicked
                                onChange={setDates}
                                minDate={minStartDate.toJSDate()}
                                maxDate={maxEndDate.toJSDate()}
                                startDate={startDate ? startDate.toJSDate() : null}
                                endDate={endDate ? endDate.toJSDate() : null}
                                // dayClassName={(date) => {
                                //     return "bg-l8-yellow text-black hover:bg-amber-500"
                                // }}
                                selectsRange
                            // onChange={handleDateChange} //only when value has changed
                            />
                            {/* <DatePicker
                            selected={endDate.toJSDate()}
                            onSelect={setEndDate} //when day is clicked
                        // onChange={handleDateChange} //only when value has changed
                        /> */}
                        </div>
                        <DayPlotButton className="block !border-0 !rounded-none w-full" daysToSet={30} startDate={startDate} endDate={endDate} setPlotDates={setPlotDates}>Last 30 days</DayPlotButton>
                        <DayPlotButton className="block !border-0 !rounded-none w-full" daysToSet={999} startDate={startDate} endDate={endDate} setPlotDates={setPlotDates}>All days</DayPlotButton>
                    </Dropdown>
                </div>
                <div className="flex justify-center space-x-2">
                    <HourPlotButton hoursToSet={'all'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["all"]}</HourPlotButton>
                    <HourPlotButton hoursToSet={'slowest'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["slowest"]}</HourPlotButton>
                    <HourPlotButton hoursToSet={'fastest'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["fastest"]}</HourPlotButton>
                    {/* <HourPlotButton hoursToSet={'difference'} currentHours={currentHours} setPlotHours={setPlotHours}>{hourModeMap["difference"]}</HourPlotButton> */}
                </div>
            </div>
            <h2 className="text-center text-xl py-2">{`${startDate?.toFormat("MMMM dd, yyyy")} to ${endDate?.toFormat("MMMM dd, yyyy")}`}</h2>
        </div>
    )
}

function LiveIndicator() {
    return (
        <div className="inline-flex text-white rounded-bl-lg items-center">
            <div className="w-2.5 h-2.5 bg-green-400 rounded-full mr-1"></div>
            <span className="text-sm">Live</span>
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


export function Main({ loaderData }: { loaderData: { initialPlotStartDate: string, initialPlotEndDate: string, routeData: RouteTime[] } }) {
    // const [plotDays, setPlotDays] = useState(7);
    const { initialPlotStartDate, initialPlotEndDate, routeData } = loaderData;
    const [minStartDate, setMinStartDate] = useState(DateTime.fromJSDate(new Date(Math.min(...routeData.map(routeDatum => parseInt(routeDatum.unixMilliseconds))))));
    const [startDate, setStartDate] = useState<DateTime | null>(DateTime.fromISO(initialPlotStartDate));
    const [endDate, setEndDate] = useState<DateTime | null>(DateTime.fromISO(initialPlotEndDate));
    const [prevStartDate, setPrevStartDate] = useState<DateTime | null>(startDate);
    const [prevEndDate, setPrevEndDate] = useState<DateTime | null>(endDate);
    const [maxEndDate, setMaxEndDate] = useState(DateTime.fromJSDate(new Date(Math.max(...routeData.map(routeDatum => parseInt(routeDatum.unixMilliseconds))))));
    const setPlotDates = (newStartDate: DateTime | null, newEndDate: DateTime | null) => {
        setPrevStartDate(startDate);
        if (endDate && newStartDate && startDate) {
            setPrevEndDate(endDate.toMillis() < newStartDate.toMillis() ? newStartDate.plus({ weeks: 1 }) : endDate);
        }
        setStartDate(newStartDate);
        if (newEndDate && newStartDate) {
            setEndDate(newEndDate.toMillis() < newStartDate.plus({ days: 1 })?.toMillis() ? newStartDate.plus({ days: 1 }) : newEndDate);
        } else {
            setEndDate(newEndDate)
        }
    }
    const [plotHours, setPlotHours] = useState<PlotHours>('all');

    const eastboundContainerRef = useRef<HTMLDivElement>(null);
    const westboundContainerRef = useRef<HTMLDivElement>(null);

    const revalidator = useRevalidator();

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
            const differenceInHours = Math.round(Math.abs(currentDateTime.diff(previousDateTime, 'hours').hours));
            if (differenceInHours > 1) {
                for (let j = 1; j < differenceInHours; j++) {
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
        .filter(routeDatum => (startDate ?? prevStartDate ?? minStartDate).toMillis() < parseInt(routeDatum.unixMilliseconds))
        .filter(routeDatum => (endDate ?? prevEndDate ?? maxEndDate).toMillis() > parseInt(routeDatum.unixMilliseconds));
    const eastTimespanFilteredRouteData = estimatePadRouteData(timespanFilteredRouteData.filter(routeDatum => routeDatum.direction === "eastbound"));
    const westTimespanFilteredRouteData = estimatePadRouteData(timespanFilteredRouteData.filter(routeDatum => routeDatum.direction === "westbound"));

    // Then, map to EnhancedRouteTime (with routeMinutes and routeDate)
    const eastTimespanGroomedRouteData: EnhancedRouteTime[] = eastTimespanFilteredRouteData
        .map(routeDatum => ({
            ...routeDatum,
            routeMinutes: routeDatum.routeSeconds / 60,
            routeDate: new Date(Number(routeDatum.unixMilliseconds)),
            plotRouteDate: new Date(Number(routeDatum.unixMilliseconds)),
        }));
    const westTimespanGroomedRouteData: EnhancedRouteTime[] = westTimespanFilteredRouteData
        .map(routeDatum => ({
            ...routeDatum,
            routeMinutes: routeDatum.routeSeconds / 60,
            routeDate: new Date(Number(routeDatum.unixMilliseconds)),
            plotRouteDate: new Date(Number(routeDatum.unixMilliseconds)),
        }));

    const dayReduce = (acc: { [date: string]: EnhancedRouteTime[] }, datum: EnhancedRouteTime) => {
        const date = DateTime.fromJSDate(datum.routeDate).toLocaleString(DateTime.DATE_SHORT);
        acc[date] = acc[date] || [];
        acc[date].push(datum);
        return acc;
    }

    const emptyFilter = (routeDatum: EnhancedRouteTime) => {
        return !isNaN(routeDatum.routeSeconds) && !('estimated' in routeDatum);
    }

    const singleHourFormat = (routeDatum: EnhancedRouteTime) => {
        routeDatum.plotRouteDate = DateTime.fromJSDate(routeDatum.routeDate).startOf('day').toJSDate();
        return routeDatum;
    }

    const hourReduce = (acc: EnhancedRouteTime[], datum: EnhancedRouteTime[]): EnhancedRouteTime[] => {
        if (plotHours === 'all') {
            return acc.concat(datum);
        }
        const slowestHour = datum
            .filter(emptyFilter)
            .reduce((acc, routeDatum) => {
                if (routeDatum.routeSeconds > acc.routeSeconds) return singleHourFormat(routeDatum);
                return acc;
            });
        const fastestHour = datum
            .filter(emptyFilter)
            .reduce((acc, routeDatum) => {
                if (routeDatum.routeSeconds < acc.routeSeconds) return singleHourFormat(routeDatum);
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
        eastBoundPlot.style.maxWidth = "none";
        const westBoundPlot = getPlot(westBoundRouteData, plotHours, maxRouteMinutes);
        westBoundPlot.style.maxWidth = "none";
        if (eastboundContainerRef.current) {
            eastboundContainerRef.current.append(eastBoundPlot);
        }
        if (westboundContainerRef.current) {
            westboundContainerRef.current.append(westBoundPlot);
        }
        const refreshInterval = setInterval(() => {
            // refresh on minute one to let the server have a chance to fetch the new data first
            if (DateTime.now().minute === 1) {
                revalidator.revalidate();
            }
        }, 60 * 1000);
        return () => {
            clearInterval(refreshInterval);
            eastBoundPlot.remove();
            westBoundPlot.remove();
        }
    }, [eastBoundRouteData, westBoundRouteData]);

    return (
        <main className="flex items-center justify-center pt-16 pb-4 max-w-5xl mx-auto">
            <div className="flex-1 flex flex-col items-center gap-16 min-h-0 w-full">
                <header className="flex flex-col items-center gap-9">
                    <h1 className="text-5xl font-medium">Denny Way Traffic History</h1>
                    <p className="max-w-lg">This is how much time it takes to get from Queen Anne Ave. to Virginia St. (or vice versa) on Denny Way every hour by car. It is a total distance of 1.1 miles:</p>
                </header>
                <div className="space-y-3 px-4 w-full">
                    <h2 className="text-3xl font-bold text-center">Eastbound</h2>
                    <PlotButtons startDate={startDate} endDate={endDate} minStartDate={minStartDate} maxEndDate={maxEndDate} setPlotDates={setPlotDates} currentHours={plotHours} setPlotHours={setPlotHours} />
                    <div className="text-center lg:hidden">⬅ scroll ➡</div>
                    {/* <LiveIndicator /> */}
                    <div ref={eastboundContainerRef} className="overflow-x-auto w-full"></div>
                </div>
                <div className="space-y-3 px-4 w-full">
                    <p className="text-3xl font-bold text-center">Westbound</p>
                    <PlotButtons startDate={startDate} endDate={endDate} minStartDate={minStartDate} maxEndDate={maxEndDate} setPlotDates={setPlotDates} currentHours={plotHours} setPlotHours={setPlotHours} />
                    <div className="text-center lg:hidden">⬅ scroll ➡</div>
                    <div ref={westboundContainerRef} className="overflow-x-auto w-full"></div>
                    {/* <LiveIndicator /> */}
                </div>
                <div className="space-y-3 w-full flex flex-col items-center">
                    <p className="max-w-lg">Walking speed is about 3 mph. Route times for each direction are queried every hour using the <a href="https://developers.google.com/maps/documentation/routes" target="_blank">Google Maps Routes API</a>. These times are calculated for cars, but a bus making stops would travel even more slowly.</p>
                    <p className="max-w-lg">Here is a table showing the effect that lane closures have on travel times, depending on how many blocks are closed:</p>
                    <PlotButtons className="w-full" startDate={startDate} endDate={endDate} minStartDate={minStartDate} maxEndDate={maxEndDate} setPlotDates={setPlotDates} currentHours={plotHours} setPlotHours={setPlotHours} />
                    {/* <LiveIndicator /> */}
                    <div className="text-center md:hidden">⬅ scroll ➡</div>
                    <div className="overflow-x-auto w-full">
                        <table className="mx-auto table-auto border-collapse border-l8-yellow border-4">
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
                    </div>
                    <p className="max-w-lg">This project was made to illustrate how helpful it would be for King County Metro Route 8 to have dedicated bus lanes on Denny Way. Learn more about Route 8's issues and how to fix them <a href="https://fixthel8.com/" target="_blank">here</a>.</p>
                </div>
                <footer className="text-gray-300 text-sm">
                    Source: <a href="https://github.com/intcreator/denny-way-traffic" target="_blank">GitHub</a>
                </footer>
            </div>
        </main >
    );
}
