import type { RouteTime } from "../../../sharedTypes/routeTimes";

export function Main({ routeData }: { routeData: RouteTime[] }) {
    // console.log(routeData)
    return (
        <main className="flex items-center justify-center pt-16 pb-4">
            <div className="flex-1 flex flex-col items-center gap-16 min-h-0">
                <header className="flex flex-col items-center gap-9">
                    <h1 className="text-3xl font-medium">Denny Way Traffic</h1>
                </header>
                <div className="space-y-6 px-4 flex items-end">
                    {routeData
                        .filter(routeDatum => routeDatum.direction === 'eastbound')
                        // .slice(0, 30)
                        .map(routeDatum => {
                            return (
                                <div style={{
                                    width: "1px",
                                    height: `${routeDatum.routeSeconds / 2}px`,
                                    backgroundColor: "yellow",
                                }}></div>
                            )
                        })}
                </div>
            </div>
        </main >
    );
}
