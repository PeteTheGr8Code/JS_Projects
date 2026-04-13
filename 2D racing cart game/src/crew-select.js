import Cart from "./Cart.js";
import { ROLES } from "./CrewMember.js";
import { BaseStats, CartBase, CartWheels, CartHorse, CartHorseArmor } from "./racing.js";
import { enableMusicOnFirstInteraction, createAudioControls } from "./audioManager.js";

const WORKSHOP_STORAGE_KEY = "whisteriaWorkshop";
const FINAL_CART_STORAGE_KEY = "whisteriaCart";
const CREW_JSON_PATH = "./data/CrewStats.json";

export async function mountCrewSelect({ navigate, root }) {
    const el = (id) => root.querySelector(`#${id}`);

    let workshopRaw = null;
    let workshopParts = null;
    let crew = [];

    const audioControls = createAudioControls();

    el("muteToggle")?.addEventListener("click", () => {
        audioControls.setMuted(!audioControls.settings.muted);
    });

    const roleAssignments = {
        [ROLES.DRIVER]: null,
        [ROLES.ATTACKER]: null,
        [ROLES.DEFENDER]: null
    };

    function restorePart(Clazz, data, ...args) {
        const instance = new Clazz(...args);
        Object.assign(instance, data);
        return instance;
    }

    function loadWorkshopParts() {
        const raw = localStorage.getItem(WORKSHOP_STORAGE_KEY);
        if (!raw) {
            throw new Error("No workshop data found. Build the cart first.");
        }

        workshopRaw = JSON.parse(raw);

        workshopParts = {
            base: restorePart(CartBase, workshopRaw.base),
            wheels: restorePart(CartWheels, workshopRaw.wheels),
            horse1: restorePart(CartHorse, workshopRaw.horse1, workshopRaw.horse1?.name ?? "Horse 1"),
            armor1: restorePart(CartHorseArmor, workshopRaw.armor1, workshopRaw.armor1?.name ?? "Horse 1 Armor"),
            horse2: restorePart(CartHorse, workshopRaw.horse2, workshopRaw.horse2?.name ?? "Horse 2"),
            armor2: restorePart(CartHorseArmor, workshopRaw.armor2, workshopRaw.armor2?.name ?? "Horse 2 Armor")
        };
    }

    async function loadCrew() {
        const res = await fetch(CREW_JSON_PATH, { cache: "no-store" });
        if (!res.ok) {
            throw new Error(`Failed to load crew data (${res.status})`);
        }

        const data = await res.json();
        crew = (data.crew || []).map((member, idx) => ({
            id: member.id ?? `pc-${idx + 1}`,
            name: member.name ?? `Crew ${idx + 1}`,
            stats: member.stats ?? {},
            role: null
        }));

        if (crew.length === 0) {
            throw new Error("CrewStats.json loaded but crew[] is empty.");
        }
    }

    function renderWorkshopPreview() {
        const preview = workshopRaw.preview ?? {
            cartHP: workshopParts.base.hp,
            cartAC: workshopParts.base.ac,
            cartSpeed: BaseStats.CartBaseSpeed + workshopParts.wheels.speed,
            horse1HP: BaseStats.HorseHP + workshopParts.horse1.hp,
            horse1AC: BaseStats.HorseAC + workshopParts.horse1.ac + workshopParts.armor1.ac,
            horse2HP: BaseStats.HorseHP + workshopParts.horse2.hp,
            horse2AC: BaseStats.HorseAC + workshopParts.horse2.ac + workshopParts.armor2.ac
        };

        el("cartHP").textContent = preview.cartHP;
        el("cartAC").textContent = preview.cartAC;
        el("cartSpeed").textContent = preview.cartSpeed;
        el("horse1HP").textContent = preview.horse1HP;
        el("horse1AC").textContent = preview.horse1AC;
        el("horse2HP").textContent = preview.horse2HP;
        el("horse2AC").textContent = preview.horse2AC;
    }

    function getDisplayStatPills(stats) {
        const keysToShow = ["STR", "DEX", "INV", "SUR", "NAT", "TINK", "CARP", "ANIM", "CHA", "WIS", "PER"];
        return keysToShow
            .filter((key) => stats[key] !== undefined)
            .slice(0, 8)
            .map((key) => `<span class="pill">${key} ${stats[key]}</span>`)
            .join("");
    }

    function assignRole(memberId, role) {
        const member = crew.find((c) => c.id === memberId);
        if (!member) return;

        const oldRole = member.role;

        if (oldRole === role) {
            member.role = null;
            roleAssignments[role] = null;
            renderAssignments();
            renderCrew();
            return;
        }

        const currentHolder = roleAssignments[role];
        if (currentHolder) {
            currentHolder.role = null;
        }

        if (oldRole) {
            roleAssignments[oldRole] = null;
        }

        member.role = role;
        roleAssignments[role] = member;

        renderAssignments();
        renderCrew();
    }

    function renderAssignments() {
        el("driverName").textContent = roleAssignments[ROLES.DRIVER]?.name ?? "Unassigned";
        el("attackerName").textContent = roleAssignments[ROLES.ATTACKER]?.name ?? "Unassigned";
        el("defenderName").textContent = roleAssignments[ROLES.DEFENDER]?.name ?? "Unassigned";

        [el("driverName"), el("attackerName"), el("defenderName")].forEach((node) => {
            node.classList.toggle("muted", node.textContent === "Unassigned");
        });

        const ready =
            !!roleAssignments[ROLES.DRIVER] &&
            !!roleAssignments[ROLES.ATTACKER] &&
            !!roleAssignments[ROLES.DEFENDER];

        el("buildBtn").disabled = !ready;
    }

    function renderCrew() {
        const list = el("crewList");
        list.innerHTML = "";

        crew.forEach((member) => {
            const card = document.createElement("div");
            card.className = "crew-card";

            card.innerHTML = `
                <div class="crew-name">${member.name}</div>
                <div class="crew-stats">${getDisplayStatPills(member.stats)}</div>
                <div class="role-buttons">
                    <button class="role-chip ${member.role === ROLES.DRIVER ? "active" : ""}" data-role="${ROLES.DRIVER}">Driver</button>
                    <button class="role-chip ${member.role === ROLES.ATTACKER ? "active" : ""}" data-role="${ROLES.ATTACKER}">Attacker</button>
                    <button class="role-chip ${member.role === ROLES.DEFENDER ? "active" : ""}" data-role="${ROLES.DEFENDER}">Defender</button>
                </div>
            `;

            card.querySelectorAll(".role-chip").forEach((btn) => {
                btn.addEventListener("click", () => {
                    assignRole(member.id, btn.dataset.role);
                });
            });

            list.appendChild(card);
        });
    }

    function clearRoles() {
        crew.forEach((member) => {
            member.role = null;
        });

        roleAssignments[ROLES.DRIVER] = null;
        roleAssignments[ROLES.ATTACKER] = null;
        roleAssignments[ROLES.DEFENDER] = null;

        renderAssignments();
        renderCrew();
        el("result").innerHTML = "";
    }

    function cloneCrewForCart() {
        return crew
            .filter((member) => member.role !== null)
            .map((member) => ({
                id: member.id,
                name: member.name,
                stats: { ...member.stats },
                role: member.role
            }));
    }

    function serializeFinalCart(cart) {
        return {
            base: { ...cart.base },
            wheels: { ...cart.wheels },
            horses: cart.horses.map((horse) => ({ ...horse })),
            speed: cart.speed,
            attacker: cart.attacker ? {
                id: cart.attacker.id,
                name: cart.attacker.name,
                stats: { ...cart.attacker.stats },
                role: cart.attacker.role
            } : null,
            defender: cart.defender ? {
                id: cart.defender.id,
                name: cart.defender.name,
                stats: { ...cart.defender.stats },
                role: cart.defender.role
            } : null,
            driver: cart.driver ? {
                id: cart.driver.id,
                name: cart.driver.name,
                stats: { ...cart.driver.stats },
                role: cart.driver.role
            } : null
        };
    }

    function buildFinalCart() {
        const selectedCrew = cloneCrewForCart();

        const cart = new Cart(
            restorePart(CartBase, workshopRaw.base),
            restorePart(CartWheels, workshopRaw.wheels),
            restorePart(CartHorse, workshopRaw.horse1, workshopRaw.horse1?.name ?? "Horse 1"),
            restorePart(CartHorseArmor, workshopRaw.armor1, workshopRaw.armor1?.name ?? "Horse 1 Armor"),
            restorePart(CartHorse, workshopRaw.horse2, workshopRaw.horse2?.name ?? "Horse 2"),
            restorePart(CartHorseArmor, workshopRaw.armor2, workshopRaw.armor2?.name ?? "Horse 2 Armor"),
            selectedCrew
        );

        localStorage.setItem(FINAL_CART_STORAGE_KEY, JSON.stringify(serializeFinalCart(cart)));

        el("result").innerHTML = `
            <div class="big">Cart created successfully</div>
            <div>Driver: <strong>${cart.driver?.name ?? "—"}</strong></div>
            <div>Attacker: <strong>${cart.attacker?.name ?? "—"}</strong></div>
            <div>Defender: <strong>${cart.defender?.name ?? "—"}</strong></div>
            <div style="margin-top:8px;">Final speed: <strong>${cart.speed}</strong></div>
            <div>Saved to localStorage as <code>${FINAL_CART_STORAGE_KEY}</code>.</div>
        `;

        return cart;
    }

    enableMusicOnFirstInteraction("./assets/audio/music/crew-select-theme.mp3", { volume: 0.45 });

    try {
        loadWorkshopParts();
        await loadCrew();

        renderWorkshopPreview();
        renderAssignments();
        renderCrew();

        el("clearBtn").addEventListener("click", clearRoles);
        el("buildBtn").addEventListener("click", () => {
            buildFinalCart();
            navigate("race");
        });
    } catch (err) {
        const center = root.querySelector(".panel.center");
        if (center) {
            center.innerHTML = `
                <h3>Error</h3>
                <div class="result">
                    <div class="big">Could not initialize crew assignment</div>
                    <div>${String(err.message)}</div>
                </div>
            `;
        }
    }
}