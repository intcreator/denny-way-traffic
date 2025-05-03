import type { Route } from "./+types/home";
import { Main } from "../main/main";

const baseURL = import.meta.env.VITE_BASE_URL;

export async function loader() {
    const routeTimesRes = await fetch(`${baseURL}/getRouteTimes`);
    const routeTimes = await routeTimesRes.json();
    return routeTimes;
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
    return <Main routeData={loaderData} />;
}
