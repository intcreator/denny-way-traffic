import {
    isRouteErrorResponse,
    Links,
    Meta,
    Outlet,
    Scripts,
    ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
    // { rel: "preconnect", href: "https://fonts.googleapis.com" },
    // {
    //   rel: "preconnect",
    //   href: "https://fonts.gstatic.com",
    //   crossOrigin: "anonymous",
    // },
    // {
    //   rel: "stylesheet",
    //   href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
    // },
];

export function Layout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <Meta />
                <Links />
            </head>
            <body className="p-3">
                <svg width="0" height="0">
                    <defs>
                        <pattern id="leftRightHatch0" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,2 l4,-4
                                    M0,8 l8,-8
                                    M6,10 l4,-4"
                                style={{ stroke: "red", strokeWidth: 1.3 }} />
                        </pattern>
                        <pattern id="leftRightHatch1" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,2 l4,-4
                                    M0,8 l8,-8
                                    M6,10 l4,-4"
                                style={{ stroke: "red", strokeWidth: 2.3 }} />
                        </pattern>
                        <pattern id="leftRightHatch2" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,2 l4,-4
                                    M0,8 l8,-8
                                    M6,10 l4,-4"
                                style={{ stroke: "red", strokeWidth: 3.3 }} />
                        </pattern>
                        <pattern id="leftRightHatch3" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,2 l4,-4
                                    M0,8 l8,-8
                                    M6,10 l4,-4"
                                style={{ stroke: "red", strokeWidth: 4.3 }} />
                        </pattern>
                        <pattern id="leftRightHatch3" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,2 l4,-4
                                    M0,8 l8,-8
                                    M6,10 l4,-4"
                                style={{ stroke: "red", strokeWidth: 5 }} />
                        </pattern>
                        <pattern id="rightLeftHatch0" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,6 l4,4
                                    M0,0 l8,8
                                    M6,-2 l4,4"
                                style={{ stroke: "red", strokeWidth: 1.3 }} />
                        </pattern>
                        <pattern id="rightLeftHatch1" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,6 l4,4
                                    M0,0 l8,8
                                    M6,-2 l4,4"
                                style={{ stroke: "red", strokeWidth: 2.3 }} />
                        </pattern>
                        <pattern id="rightLeftHatch2" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,6 l4,4
                                    M0,0 l8,8
                                    M6,-2 l4,4"
                                style={{ stroke: "red", strokeWidth: 3.3 }} />
                        </pattern>
                        <pattern id="rightLeftHatch3" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,6 l4,4
                                    M0,0 l8,8
                                    M6,-2 l4,4"
                                style={{ stroke: "red", strokeWidth: 4.3 }} />
                        </pattern>
                        <pattern id="rightLeftHatch4" patternUnits="userSpaceOnUse" width="8" height="8">
                            <path d="M-2,6 l4,4
                                    M0,0 l8,8
                                    M6,-2 l4,4"
                                style={{ stroke: "red", strokeWidth: 5 }} />
                        </pattern>
                    </defs>
                </svg>
                {children}
                <ScrollRestoration />
                <Scripts />
            </body>
        </html>
    );
}

export default function App() {
    return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
    let message = "Oops!";
    let details = "An unexpected error occurred.";
    let stack: string | undefined;

    if (isRouteErrorResponse(error)) {
        message = error.status === 404 ? "404" : "Error";
        details =
            error.status === 404
                ? "The requested page could not be found."
                : error.statusText || details;
    } else if (import.meta.env.DEV && error && error instanceof Error) {
        details = error.message;
        stack = error.stack;
    }

    return (
        <main className="pt-16 p-4 container mx-auto">
            <h1>{message}</h1>
            <p>{details}</p>
            {stack && (
                <pre className="w-full p-4 overflow-x-auto">
                    <code>{stack}</code>
                </pre>
            )}
        </main>
    );
}
