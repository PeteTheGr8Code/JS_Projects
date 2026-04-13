import { startHTML, workshopHTML, crewSelectHTML, raceHTML, endHTML } from "./screens.js";
import { mountStart } from "./start.js";
import { mountWorkshop } from "./workshop.js";
import { mountCrewSelect } from "./crew-select.js";
import { mountRace } from "./race.js";
import { mountResults } from "./results.js";

const appRoot = document.getElementById("app");

const routes = {
    start: {
        html: startHTML,
        mount: mountStart
    },
    workshop: {
        html: workshopHTML,
        mount: mountWorkshop
    },
    crewSelect: {
        html: crewSelectHTML,
        mount: mountCrewSelect
    },
    race: {
        html: raceHTML,
        mount: mountRace
    },
    results:{
        html:endHTML,
        mount:mountResults
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