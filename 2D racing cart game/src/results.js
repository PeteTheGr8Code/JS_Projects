const RACE_STATE_STORAGE_KEY = "whisteriaRaceState";
const FINAL_STANDINGS_STORAGE_KEY = "whisteriaFinalStandings";

export function mountResults({ navigate, root }) {
    const el = (id) => root.querySelector(`#${id}`);
    
    function loadFinalStandings() {
        const raw = localStorage.getItem(FINAL_STANDINGS_STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    function renderFinalStandings(standings) {
        if (!standings.length) {
            el("finalStandings").innerHTML = `
                <div class="result">
                    <div class="big danger">No final standings found.</div>
                </div>
            `;
            return;
        }

        const rows = standings.map((entry, index) => {
            const place = index + 1;
            const label =
                place === 1 ? "Winner" :
                place === 2 ? "2nd" :
                place === 3 ? "3rd" :
                `${place}th`;

            return `
                <div class="log-entry">
                    <div class="title">${label} — ${entry.name}</div>
                    <div class="meta">
                        Score: ${entry.totalScore}
                        • Distance: ${entry.distanceToTarget}
                        • Speed: ${entry.speed}
                    </div>
                </div>
            `;
        }).join("");

        el("finalStandings").innerHTML = rows;
    }

    const standings = loadFinalStandings();
    renderFinalStandings(standings);

    el("newRaceBtn")?.addEventListener("click", () => {
        localStorage.removeItem(RACE_STATE_STORAGE_KEY);
        localStorage.removeItem(FINAL_STANDINGS_STORAGE_KEY);
        navigate("workshop");
    });
}