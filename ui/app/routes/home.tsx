import type { Route } from "./+types/home";
import { Main } from "../main/main";
import { DateTime } from "luxon";

const baseURL = import.meta.env.VITE_BASE_URL;

export async function loader() {
    const initialPlotStartDate = DateTime.now().minus({ days: 7 }).toISODate();
    const initialPlotEndDate = DateTime.now().toISODate();
    const routeTimesRes = await fetch(`${baseURL}/getRouteTimes`);
    const routeData = await routeTimesRes.json();
    return {
        initialPlotStartDate,
        initialPlotEndDate,
        routeData
    };
}

export function meta({ }: Route.MetaArgs) {
    const title = "Denny Way Traffic History"
    const description = "An app that tracks traffic on Denny Way"
    return [
        { title: `${title}: ${description}` },
        { name: "description", content: description },
        { property: "og:description", content: description },
        { property: "og:title", content: title },
        { property: "og:image", content: "/denny-way-traffic-thumbnail.png" },
        { property: "twitter:image", content: "/denny-way-traffic-thumbnail.png" },
        { property: "twitter:card", content: "summary_large_image" },
    ];
}

export default function Home({
    loaderData
}: Route.ComponentProps) {
    return <Main loaderData={loaderData} />;
}
