import { mountStart } from "./start.js";
import { startHTML } from "./screen.js";
const appRoot = document.getElementById("app");

const routes = {
    start: {
        html: startHTML,
        mount: mountStart
    }

};

let currentRoute = null;

export function navigate(routeName) {
    const route = routes[routeName];

    if (!route) {
        console.error(`Unknown route: ${routeName}`);
        return;
    }

    currentRoute = routeName;
    window.location.hash = routeName;
    renderRoute(routeName);
}

function renderRoute(routeName) {
    const route = routes[routeName];

    if (!route) {
        appRoot.innerHTML = `
            <header>
                <h1>Page Not Found</h1>
                <div class="sub">The requested screen does not exist.</div>
            </header>
        `;
        return;
    }

    appRoot.innerHTML = route.html;

    route.mount({
        navigate,
        root: appRoot
    });
}

function getInitialRoute() {
    const hash = window.location.hash.replace("#", "");

    if (routes[hash]) {
        return hash;
    }

    return "start";
}

window.addEventListener("hashchange", () => {
    const routeName = getInitialRoute();

    if (routeName !== currentRoute) {
        renderRoute(routeName);
        currentRoute = routeName;
    }
});

renderRoute(getInitialRoute());
currentRoute = getInitialRoute();