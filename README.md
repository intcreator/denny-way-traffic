# Denny Way Traffic

**[Visit the website](https://denny.intcreator.com)**

This app fetches hourly traffic data for a stretch of Denny Way in Seattle, WA with the goal of showing how long it might take to travel as a bus moving with traffic. With dedicated bus lanes, the travel time would almost always be at the lower end of the spectrum.

The project is built with TypeScript, using MySQL and Node.js for the server and React with React Router v7+ for the UI

## Run locally

1. Clone repo
2. `cd denny-way-traffic`
3. `docker compose build`
4. `docker compose up -d`

## Run dev servers

### Server

1. `cd denny-way-traffic/server`
2. `npm i`
3. `npm run dev`

### UI

1. `cd denny-way-traffic/ui`
2. `npm i`
3. `npm run dev`