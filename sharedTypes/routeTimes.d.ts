export type Direction = 'eastbound' | 'westbound';

export type RouteTime = {
    unixMilliseconds: string,
    routeSeconds: number,
    direction: Direction,
    closedLanes?: number,
    closedBlocks?: number,
};