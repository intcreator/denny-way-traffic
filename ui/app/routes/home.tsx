import type { Route } from "./+types/home";
import { Main } from "../main/main";

const baseURL = import.meta.env.VITE_BASE_URL;

export async function loader() {
    const routeTimesRes = await fetch(`${baseURL}/getRouteTimes`);
    const routeTimes = await routeTimesRes.json();
    return routeTimes;
}

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Denny Way Traffic History" },
        { name: "description", content: "An app that tracks traffic on Denny Way" },
    ];
}

export default function Home({
    loaderData
}: Route.ComponentProps) {
    return <Main routeData={loaderData} />;
}
