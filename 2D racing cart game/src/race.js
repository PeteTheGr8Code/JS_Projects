import { enableMusicOnFirstInteraction, playSfx, createAudioControls } from "./audioManager.js";

const FINAL_CART_STORAGE_KEY = "whisteriaCart";
const RACE_STATE_STORAGE_KEY = "whisteriaRaceState";
const RACE_DATA_JSON_PATH = "./data/RaceData.json";
const RIVAL_STATS_JSON_PATH = "./data/RivalStats.json";
const FINAL_STANDINGS_STORAGE_KEY = "whisteriaFinalStandings";


const TOTAL_LAPS = 2;
const EVENTS_PER_LAP = 1;
const TOTAL_EVENTS = TOTAL_LAPS * EVENTS_PER_LAP;

export function mountRace({ navigate, root }) {
    const el = (id) => root.querySelector(`#${id}`);
    var RIVALS = [];
    var checkpointsSinceLastSummary = 0;
    var EVENT_TYPES = {};
    var TRACK_TRAPS = [];
    var MANEUVERS = [];
    var CART_ISSUES = [];
    var HORSE_ISSUES = [];
    const audioControls = createAudioControls();

    el("muteToggle")?.addEventListener("click", () => {
        audioControls.setMuted(!audioControls.settings.muted);
    });
    function rollD20() {
        return Math.floor(Math.random() * 20) + 1;
    }


    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function loadCart() {
        const raw = localStorage.getItem(FINAL_CART_STORAGE_KEY);
        if (!raw) {
            throw new Error("No final cart found. Build the cart and assign crew first.");
        }
        return JSON.parse(raw);
    }
    function getDefaultRaceState(cart) {
        return {
            cart: clone(cart),
            rivals: clone(RIVALS),
            checkpoint: 1,
            currentLap: 1,
            finished: false,
            log: [],
            currentEvent: null,
            pendingResolution: null,
            rivalProgress: {},
            lapSummaries: [],
            playerLapSuccesses: {}
        };
    }

    function saveRaceState(state) {
        localStorage.setItem(RACE_STATE_STORAGE_KEY, JSON.stringify(state));
    }

    function loadRaceState(cart) {
        const raw = localStorage.getItem(RACE_STATE_STORAGE_KEY);
        if (!raw) {
            return getDefaultRaceState(cart);
        }

        try {
            const parsed = JSON.parse(raw);

            if (!parsed.cart) {
                return getDefaultRaceState(cart);
            }

            if (!parsed.rivals) {
                parsed.rivals = clone(RIVALS);
            }

            if (!("pendingResolution" in parsed)) {
                parsed.pendingResolution = null;
            }

            return parsed;
        } catch {
            return getDefaultRaceState(cart);
        }
    }

    function resetRaceState(cart) {
        const state = getDefaultRaceState(cart);
        ensureRivalProgress(state);
        saveRaceState(state);
        return state;
    }

    function computeLapFromCheckpoint(checkpoint) {
        return Math.min(TOTAL_LAPS, Math.floor((checkpoint - 1) / EVENTS_PER_LAP) + 1);
    }

    function pickRandomEventType() {
        const values = Object.values(EVENT_TYPES);
        return values[Math.floor(Math.random() * values.length)];
    }

    function ensureCartStatuses(cart) {
        if (!cart.statuses) {
            cart.statuses = [];
        }
    }

    function addStatus(target, status) {
        if (!target.statuses) {
            target.statuses = [];
        }
        target.statuses.push(status);
    }

    function getRivalId(rival) {
        return rival?.id ?? rival?.name ?? "unknown-rival";
    }

    function getRivalById(state, rivalId) {
        return (state.rivals ?? []).find(rival => getRivalId(rival) === rivalId) ?? null;
    }

    function pickActiveRival(state) {
        const activeRivals = (state.rivals ?? []).filter(rival => (rival.base?.hp ?? 0) > 0);
        if (activeRivals.length === 0) return null;
        return activeRivals[Math.floor(Math.random() * activeRivals.length)];
    }

    function simulateRivalLap(state, lapNumber) {
        ensureRivalProgress(state);

        const summary = [];

        (state.rivals ?? []).forEach((rival) => {
            if ((rival.base?.hp ?? 0) <= 0) {
                summary.push({
                    rivalId: getRivalId(rival),
                    name: rival.name,
                    speed: getEntitySpeed(rival),
                    successes: 0,
                    score: 0,
                    knockedOut: true
                });
                return;
            }

            const speed = getEntitySpeed(rival);
            let successes = 0;

            for (let i = 0; i < EVENTS_PER_LAP; i++) {
                const roll = rollD20();

                if (roll >= 16) {
                    successes += 1;
                }
            }

            const score = (100 * successes) / EVENTS_PER_LAP;

            const rivalId = getRivalId(rival);
            state.rivalProgress[rivalId].totalSuccesses += successes;
            state.rivalProgress[rivalId].totalScore += score;
            state.rivalProgress[rivalId].perLap[lapNumber] = {
                successes,
                score
            };

            summary.push({
                rivalId,
                name: rival.name,
                speed,
                successes,
                score,
                knockedOut: false
            });
        });

        summary.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return b.speed - a.speed;
        });

        state.lapSummaries.push({
            lap: lapNumber,
            standings: summary
        });

        return summary;
    }

    function scheduleForcedEvent(state, eventType, rival) {
        ensureCartStatuses(state.cart);

        addStatus(state.cart, {
            type: "forced_event",
            eventType,
            triggerCheckpoint: state.checkpoint + 1,
            source: getRivalId(rival),
            sourceName: rival?.name ?? "Rival"
        });
    }

    function consumeForcedEvent(state) {
        ensureCartStatuses(state.cart);

        const statuses = state.cart.statuses;
        const idx = statuses.findIndex(
            status => status.type === "forced_event" && status.triggerCheckpoint <= state.checkpoint
        );

        if (idx === -1) return null;

        const status = statuses.splice(idx, 1)[0];
        const lap = computeLapFromCheckpoint(state.checkpoint);

        switch (status.eventType) {
            case EVENT_TYPES.TRACK_TRAP: {
                if (TRACK_TRAPS.length === 0) return null;
                const trap = TRACK_TRAPS[Math.floor(Math.random() * TRACK_TRAPS.length)];
                return {
                    id: `forced-${state.checkpoint}`,
                    type: EVENT_TYPES.TRACK_TRAP,
                    title: trap.name,
                    desc: trap.desc,
                    detail: `Forced by ${status.sourceName}. Driver check: ${trap.stat}`,
                    lap,
                    checkpoint: state.checkpoint,
                    trap,
                    forced: true
                };
            }

            case EVENT_TYPES.CART_ISSUE: {
                if (CART_ISSUES.length === 0) return null;
                const issue = CART_ISSUES[Math.floor(Math.random() * CART_ISSUES.length)];
                return {
                    id: `forced-${state.checkpoint}`,
                    type: EVENT_TYPES.CART_ISSUE,
                    title: issue.name,
                    desc: issue.desc,
                    detail: `Forced by ${status.sourceName}. ${issue.resolver} check: ${issue.stat}`,
                    lap,
                    checkpoint: state.checkpoint,
                    issue,
                    forced: true
                };
            }

            case EVENT_TYPES.HORSE_ISSUE: {
                if (HORSE_ISSUES.length === 0) return null;
                const issue = HORSE_ISSUES[Math.floor(Math.random() * HORSE_ISSUES.length)];
                return {
                    id: `forced-${state.checkpoint}`,
                    type: EVENT_TYPES.HORSE_ISSUE,
                    title: issue.name,
                    desc: issue.desc,
                    detail: `Forced by ${status.sourceName}. ${issue.resolver} check: ${issue.stat}`,
                    lap,
                    checkpoint: state.checkpoint,
                    horseIssue: issue,
                    forced: true
                };
            }

            case EVENT_TYPES.MANEUVER: {
                if (MANEUVERS.length === 0) return null;
                const maneuver = MANEUVERS[Math.floor(Math.random() * MANEUVERS.length)];
                return {
                    id: `forced-${state.checkpoint}`,
                    type: EVENT_TYPES.MANEUVER,
                    title: maneuver.name,
                    desc: maneuver.desc,
                    detail: `Forced by ${status.sourceName}. Driver check: ${maneuver.stat}`,
                    lap,
                    checkpoint: state.checkpoint,
                    maneuver,
                    forced: true
                };
            }

            default:
                return null;
        }
    }

    function generateEvent(state) {
        const lap = computeLapFromCheckpoint(state.checkpoint);

        const forcedEvent = consumeForcedEvent(state);
        if (forcedEvent) return forcedEvent;

        const eventType = pickRandomEventType();

        if (eventType === EVENT_TYPES.TRACK_TRAP) {
            if (TRACK_TRAPS.length === 0) {
                return fallbackEvent(eventType, lap, state.checkpoint, "Track Trap", "No track trap data found.");
            }

            const trap = TRACK_TRAPS[Math.floor(Math.random() * TRACK_TRAPS.length)];
            return {
                id: `event-${state.checkpoint}`,
                type: eventType,
                title: trap.name,
                desc: trap.desc,
                detail: `Driver check: ${trap.stat}`,
                lap,
                checkpoint: state.checkpoint,
                trap
            };
        }

        if (eventType === EVENT_TYPES.MANEUVER) {
            if (MANEUVERS.length === 0) {
                return fallbackEvent(eventType, lap, state.checkpoint, "Maneuver", "No maneuver data found.");
            }

            const maneuver = MANEUVERS[Math.floor(Math.random() * MANEUVERS.length)];
            return {
                id: `event-${state.checkpoint}`,
                type: eventType,
                title: maneuver.name,
                desc: maneuver.desc,
                detail: `Driver check: ${maneuver.stat}`,
                lap,
                checkpoint: state.checkpoint,
                maneuver
            };
        }

        if (eventType === EVENT_TYPES.CART_ISSUE) {
            if (CART_ISSUES.length === 0) {
                return fallbackEvent(eventType, lap, state.checkpoint, "Cart Issue", "No cart issue data found.");
            }

            const issue = CART_ISSUES[Math.floor(Math.random() * CART_ISSUES.length)];
            return {
                id: `event-${state.checkpoint}`,
                type: eventType,
                title: issue.name,
                desc: issue.desc,
                detail: `${issue.resolver} check: ${issue.stat}`,
                lap,
                checkpoint: state.checkpoint,
                issue
            };
        }

        if (eventType === EVENT_TYPES.HORSE_ISSUE) {
            if (HORSE_ISSUES.length === 0) {
                return fallbackEvent(eventType, lap, state.checkpoint, "Horse Issue", "No horse issue data found.");
            }

            const issue = HORSE_ISSUES[Math.floor(Math.random() * HORSE_ISSUES.length)];
            return {
                id: `event-${state.checkpoint}`,
                type: eventType,
                title: issue.name,
                desc: issue.desc,
                detail: `${issue.resolver} check: ${issue.stat}`,
                lap,
                checkpoint: state.checkpoint,
                horseIssue: issue
            };
        }

        if (eventType === EVENT_TYPES.ENEMY_ATTACK) {
            const rival = pickActiveRival(state);

            if (!rival) {
                return fallbackEvent(eventType, lap, state.checkpoint, "No Active Rivals", "All rivals are out of the race.");
            }

            return {
                id: `event-${state.checkpoint}`,
                type: eventType,
                title: `${rival.name} attacks`,
                desc: "A rival cart attacks. Your defender blocks, then your attacker counters.",
                detail: `${rival.attacker?.name ?? rival.name} engages your cart.`,
                lap,
                checkpoint: state.checkpoint,
                rivalId: getRivalId(rival)
            };
        }

        return fallbackEvent(eventType, lap, state.checkpoint, "Unknown Event", "No event data found.");
    }

    function fallbackEvent(type, lap, checkpoint, title, desc) {
        return {
            id: `event-${checkpoint}`,
            type,
            title,
            desc,
            detail: desc,
            lap,
            checkpoint
        };
    }

    function getResolver(cart, resolverKey) {
        switch (resolverKey) {
            case "driver":
                return cart.driver;
            case "attacker":
                return cart.attacker;
            case "defender":
                return cart.defender;
            default:
                return null;
        }
    }

    function getStatValue(member, statKey) {
        return member?.stats?.[statKey] ?? 0;
    }

    function getBestAttackStat(stats) {
        const str = stats?.STR ?? 0;
        const dex = stats?.DEX ?? 0;
        return dex >= str ? { key: "DEX", value: dex } : { key: "STR", value: str };
    }

    function applyPenalties(cart, penalties) {
        if (penalties.cartHP) {
            cart.base.hp = Math.max(0, (cart.base.hp ?? 0) - penalties.cartHP);
        }

        if (penalties.speed) {
            cart.speed = Math.max(0, (cart.speed ?? 0) - penalties.speed);
        }

        if (penalties.horse1HP && cart.horses?.[0]) {
            cart.horses[0].hp = Math.max(0, (cart.horses[0].hp ?? 0) - penalties.horse1HP);
        }

        if (penalties.horse2HP && cart.horses?.[1]) {
            cart.horses[1].hp = Math.max(0, (cart.horses[1].hp ?? 0) - penalties.horse2HP);
        }
    }

    function dealCartDamage(cart, amount) {
        cart.base.hp = Math.max(0, (cart.base?.hp ?? 0) - amount);
    }

    function applyRivalAttackFlavor(state, rival, cart) {
        const rivalId = getRivalId(rival);

        switch (rivalId) {
            case "crimson-petal":
                scheduleForcedEvent(state, EVENT_TYPES.TRACK_TRAP, rival);
                return "Crimson Petal rigs the course in its favor.";

            case "blue-heron":
                scheduleForcedEvent(state, EVENT_TYPES.CART_ISSUE, rival);
                return "Blue Heron smirks while staring down your cart.";

            case "verdant-gale":
                scheduleForcedEvent(state, EVENT_TYPES.HORSE_ISSUE, rival);
                return "Verdant Gale whispers to the horses.";

            case "ashen-fang":
                scheduleForcedEvent(state, EVENT_TYPES.MANEUVER, rival);
                return "Ashen Fang redirects your cart.";

            default:
                dealCartDamage(cart, 3);
                return "The rival attack lands. Your cart loses 3 HP.";
        }
    }

    function buildPendingResolution(state, event) {
        const cart = state.cart;

        switch (event.type) {
            case EVENT_TYPES.TRACK_TRAP: {
                const trap = event.trap;
                return {
                    stage: "single_check",
                    prompt: `${cart.driver?.name ?? "Driver"} rolls d20 using ${trap.stat}`,
                    resolverName: cart.driver?.name ?? "Driver",
                    statKey: trap.stat,
                    dc: trap.dc
                };
            }

            case EVENT_TYPES.MANEUVER: {
                const maneuver = event.maneuver;
                return {
                    stage: "single_check",
                    prompt: `${cart.driver?.name ?? "Driver"} rolls d20 using ${maneuver.stat}`,
                    resolverName: cart.driver?.name ?? "Driver",
                    statKey: maneuver.stat,
                    dc: maneuver.dc
                };
            }

            case EVENT_TYPES.CART_ISSUE: {
                const issue = event.issue;
                const resolver = getResolver(cart, issue.resolver);
                return {
                    stage: "single_check",
                    prompt: `${resolver?.name ?? issue.resolver} rolls d20 using ${issue.stat}`,
                    resolverName: resolver?.name ?? issue.resolver,
                    statKey: issue.stat,
                    dc: issue.dc
                };
            }

            case EVENT_TYPES.HORSE_ISSUE: {
                const issue = event.horseIssue;
                const resolver = getResolver(cart, issue.resolver);
                return {
                    stage: "single_check",
                    prompt: `${resolver?.name ?? issue.resolver} rolls d20 using ${issue.stat}`,
                    resolverName: resolver?.name ?? issue.resolver,
                    statKey: issue.stat,
                    dc: issue.dc
                };
            }

            case EVENT_TYPES.ENEMY_ATTACK: {
                const rival = getRivalById(state, event.rivalId);
                const defender = cart.defender;
                const rivalAttackStat = getBestAttackStat(rival?.attacker?.stats ?? {});
                const defenderBlockMod = defender?.stats?.STR ?? 0;

                return {
                    stage: "enemy_block",
                    prompt: `${defender?.name ?? "Defender"} rolls d20 to block.`,
                    rivalId: event.rivalId,
                    rivalAttackStat,
                    defenderBlockMod
                };
            }

            default:
                return null;
        }
    }

    function finalizeSingleCheck(state, event, manualRoll) {
        const cart = state.cart;

        if (event.type === EVENT_TYPES.TRACK_TRAP) {
            const trap = event.trap;
            const mod = getStatValue(cart.driver, trap.stat);
            const total = manualRoll + mod;

            if (total >= trap.dc) {
                return `${cart.driver?.name ?? "Driver"} avoids ${trap.name} with a ${manualRoll} + ${mod} = ${total}.`;
            }

            applyPenalties(cart, trap.onFail);
            return `${cart.driver?.name ?? "Driver"} fails to avoid ${trap.name}: ${manualRoll} + ${mod} = ${total}`;
        }

        if (event.type === EVENT_TYPES.MANEUVER) {
            const maneuver = event.maneuver;
            const mod = getStatValue(cart.driver, maneuver.stat);
            const total = manualRoll + mod;

            if (total >= maneuver.dc) {
                return `${cart.driver?.name ?? "Driver"} clears ${maneuver.name} with a ${manualRoll} + ${mod} = ${total}`;
            }

            applyPenalties(cart, maneuver.onFail);
            return `${cart.driver?.name ?? "Driver"} fails ${maneuver.name}: ${manualRoll} + ${mod} = ${total}. ${formatPenaltyText(maneuver.onFail)}`;
        }

        if (event.type === EVENT_TYPES.CART_ISSUE) {
            const issue = event.issue;
            const resolver = getResolver(cart, issue.resolver);
            const mod = getStatValue(resolver, issue.stat);
            const total = manualRoll + mod;

            if (total >= issue.dc) {
                return `${resolver?.name ?? issue.resolver} stabilizes ${issue.name} with a ${manualRoll} + ${mod} = ${total}`;
            }

            applyPenalties(cart, issue.onFail);
            return `${resolver?.name ?? issue.resolver} fails to stabilize ${issue.name}: ${manualRoll} + ${mod} = ${total}. ${formatPenaltyText(issue.onFail)}`;
        }

        if (event.type === EVENT_TYPES.HORSE_ISSUE) {
            const issue = event.horseIssue;
            const resolver = getResolver(cart, issue.resolver);
            const mod = getStatValue(resolver, issue.stat);
            const total = manualRoll + mod;

            if (total >= issue.dc) {
                return `${resolver?.name ?? issue.resolver} settles ${issue.name} with a ${manualRoll} + ${mod} = ${total}.`;
            }

            applyPenalties(cart, issue.onFail);
            return `${resolver?.name ?? issue.resolver} fails to settle ${issue.name}: ${manualRoll} + ${mod} = ${total}. ${formatPenaltyText(issue.onFail)}`;
        }

        return "No effect.";
    }

    function resolveEnemyAttackBlock(state, event, blockRoll) {
        const cart = state.cart;
        const rival = getRivalById(state, event.rivalId);

        if (!rival) {
            return {
                message: "The attacking rival is no longer available.",
                done: true
            };
        }

        const defender = cart.defender;
        const rivalAttackStat = getBestAttackStat(rival?.attacker?.stats ?? {});
        const defenderBlockMod = defender?.stats?.STR ?? 0;

        const rivalAttackRoll = rollD20();
        const rivalTotal = rivalAttackRoll + rivalAttackStat.value;
        const blockTotal = blockRoll + defenderBlockMod;

        let message = `${rival.attacker?.name ?? rival.name} attacks with ${rivalAttackStat.key} (${rivalAttackRoll} + ${rivalAttackStat.value} = ${rivalTotal}). `;
        message += `${defender?.name ?? "Defender"} blocks with STR (${blockRoll} + ${defenderBlockMod} = ${blockTotal}). `;

        if (blockTotal >= rivalTotal) {
            message += "The attack is blocked. ";
        } else {
            message += applyRivalAttackFlavor(state, rival, cart) + " ";
        }

        const attacker = cart.attacker;
        const counterStat = getBestAttackStat(attacker?.stats ?? {});

        state.pendingResolution = {
            stage: "enemy_counter",
            prompt: `${attacker?.name ?? "Attacker"} rolls d20 to counter using ${counterStat.key}.`,
            rivalId: event.rivalId,
            preamble: message,
            counterStat
        };

        return {
            message,
            done: false
        };
    }

    function resolveEnemyAttackCounter(state, event, counterRoll) {
        const cart = state.cart;
        const rival = getRivalById(state, event.rivalId);

        if (!rival) {
            return "The target rival is no longer available.";
        }

        const attacker = cart.attacker;
        const counterStat = getBestAttackStat(attacker?.stats ?? {});
        const counterTotal = counterRoll + counterStat.value;
        const rivalAC = rival.base?.ac ?? 10;

        let message = state.pendingResolution?.preamble ?? "";
        message += `${attacker?.name ?? "Attacker"} counters with ${counterStat.key} (${counterRoll} + ${counterStat.value} = ${counterTotal}).`;

        if (counterTotal >= rivalAC) {
            rival.base.hp = Math.max(0, (rival.base?.hp ?? 0) - 2);
            message += `Counter hits. ${rival.name} loses 2 HP.`;

            if ((rival.base?.hp ?? 0) <= 0) {
                message += ` ${rival.name} is knocked out of the race.`;
            }
        } else {
            message += "Counter misses.";
        }

        return message;
    }


    function getEntitySpeed(entity) {
        return entity?.speed ?? entity?.cart?.speed ?? 0;
    }

    function ensureRivalProgress(state) {
        if (!state.rivalProgress) {
            state.rivalProgress = {};
        }

        (state.rivals ?? []).forEach((rival) => {
            const rivalId = getRivalId(rival);

            if (!state.rivalProgress[rivalId]) {
                state.rivalProgress[rivalId] = {
                    totalSuccesses: 0,
                    totalScore: 0,
                    perLap: {}
                };
            }
        });

        if (!state.lapSummaries) {
            state.lapSummaries = [];
        }
    }

    function formatPenaltyText(penalties) {
        const failures = [];
        if (penalties.cartHP) failures.push(`${penalties.cartHP} cart HP`);
        if (penalties.speed) failures.push(`${penalties.speed} speed`);
        if (penalties.horse1HP) failures.push(`${penalties.horse1HP} Horse 1 HP`);
        if (penalties.horse2HP) failures.push(`${penalties.horse2HP} Horse 2 HP`);

        if (failures.length === 0) {
            return "No penalty applied.";
        }

        return `Lost ${failures.join(", ")}.`;
    }

    function addLogEntry(state, event, outcome) {
        state.log.unshift({
            title: event.title,
            type: event.type,
            lap: event.lap,
            checkpoint: event.checkpoint,
            outcome
        });
    }

    function checkRaceFinished(state) {
        const cartDestroyed = (state.cart.base?.hp ?? 0) <= 0;
        const bothHorsesDown =
            (state.cart.horses?.[0]?.hp ?? 1) <= 0 &&
            (state.cart.horses?.[1]?.hp ?? 1) <= 0;

        if (cartDestroyed || bothHorsesDown || state.checkpoint > TOTAL_EVENTS) {
            state.finished = true;

        }
    }
    function getFinalStandings(state) {
        const TARGET_SCORE = TOTAL_LAPS * 100;

        const playerTotalScore = Object.values(state.playerLapSuccesses ?? {}).reduce(
            (sum, successes) => sum + (100 * successes / EVENTS_PER_LAP),
            0
        );

        const standings = [
            {
                id: "player",
                name: "Dark Pirates",
                isPlayer: true,
                totalScore: playerTotalScore,
                speed: state.cart?.speed ?? 0
            },
            ...(state.rivals ?? []).map((rival) => {
                const rivalId = getRivalId(rival);
                const rivalProgress = state.rivalProgress?.[rivalId] ?? {};

                return {
                    id: rivalId,
                    name: rival.name ?? rivalId,
                    isPlayer: false,
                    totalScore: rivalProgress.totalScore ?? 0,
                    speed: getEntitySpeed(rival)
                };
            })
        ];

        standings.forEach((entry) => {
            entry.distanceToTarget = Math.abs(TARGET_SCORE - entry.totalScore);
        });

        standings.sort((a, b) => {
            // 1) Closest to TOTAL_LAPS * 100 wins
            if (a.distanceToTarget !== b.distanceToTarget) {
                return a.distanceToTarget - b.distanceToTarget;
            }

            // 2) Player wins any tie
            if (a.isPlayer !== b.isPlayer) {
                return a.isPlayer ? -1 : 1;
            }

            // 3) Higher speed wins remaining ties
            if (a.speed !== b.speed) {
                return b.speed - a.speed;
            }

            // 4) Stable fallback by name, then id
            const nameCompare = String(a.name).localeCompare(String(b.name));
            if (nameCompare !== 0) {
                return nameCompare;
            }

            return String(a.id).localeCompare(String(b.id));
        });

        return standings;
    }


    function generateNextEvent(state) {
        if (state.finished) {
            renderResult("The race is already over.", "danger");
            return;
        }

        if (state.pendingResolution) {
            renderResult("Resolve the current event first.", "danger");
            return;
        }

        const event = generateEvent(state);
        state.currentEvent = event;
        playEventSfx(event.type);
        state.currentLap = event.lap;
        state.pendingResolution = buildPendingResolution(state, event);

        saveRaceState(state);
        renderAll(state);
        renderResult(`Event generated: ${event.type}`);
    }
    function wasResolutionSuccessful(outcome) {
        const text = String(outcome).toLowerCase();
        return (
            text.includes("avoids") ||
            text.includes("clears") ||
            text.includes("stabilizes") ||
            text.includes("settles") ||
            text.includes("blocked") ||
            text.includes("counter hits")
        );
    }
    function resolveCurrentEvent(state) {
        if (state.finished) {
            renderResult("The race is already over.", "danger");
            return;
        }

        if (!state.currentEvent || !state.pendingResolution) {
            renderResult("No event is waiting to be resolved.", "danger");
            return;
        }

        const input = el("manualRollInput");
        const manualRoll = Number(input?.value);

        if (!Number.isInteger(manualRoll) || manualRoll < 1 || manualRoll > 20) {
            renderResult("Enter a valid d20 roll from 1 to 20.", "danger");
            return;
        }

        const event = state.currentEvent;
        let outcome = "";

        if (state.pendingResolution.stage === "single_check") {
            outcome = finalizeSingleCheck(state, event, manualRoll);
            state.pendingResolution = null;
        } else if (state.pendingResolution.stage === "enemy_block") {
            const result = resolveEnemyAttackBlock(state, event, manualRoll);

            if (result.done) {
                outcome = result.message;
                state.pendingResolution = null;
            } else {
                saveRaceState(state);
                renderAll(state);
                renderResult("Block resolved. Enter the counter roll.");
                if (input) input.value = "";
                return;
            }
        } else if (state.pendingResolution.stage === "enemy_counter") {
            outcome = resolveEnemyAttackCounter(state, event, manualRoll);
            state.pendingResolution = null;
        } else {
            renderResult("Unknown resolution stage.", "danger");
            return;
        }

        addLogEntry(state, event, outcome);

        const lapNumber = state.currentEvent.lap;

        if (!state.playerLapSuccesses) {
            state.playerLapSuccesses = {};
        }
        if (!state.playerLapSuccesses[lapNumber]) {
            state.playerLapSuccesses[lapNumber] = 0;
        }

        if (wasResolutionSuccessful(outcome)) {
            state.playerLapSuccesses[lapNumber] += 1;
        }
        let showedLapSummary = false;
        state.checkpoint += 1;
        const completedLap = event.lap;
        const nextLap = computeLapFromCheckpoint(state.checkpoint);

        if (nextLap > completedLap || state.checkpoint > TOTAL_EVENTS) {
            const rivalStandings = simulateRivalLap(state, completedLap);
            renderLapSummary(state, completedLap, rivalStandings);
            showedLapSummary = true;
        }
        checkRaceFinished(state);

        if (state.finished) {
            if ((state.cart.base?.hp ?? 0) <= 0) {
                renderResult("Race over. The cart has been destroyed.", "danger");
            } else if (
                (state.cart.horses?.[0]?.hp ?? 1) <= 0 &&
                (state.cart.horses?.[1]?.hp ?? 1) <= 0
            ) {
                renderResult("Race over. Both horses are down.", "danger");
            } else {
                const standings = getFinalStandings(state);
                localStorage.setItem(FINAL_STANDINGS_STORAGE_KEY, JSON.stringify(standings));
                saveRaceState(state);
                navigate("results");
                return;
            }
        } else if (!showedLapSummary) {
            renderResult(`Resolved: ${event.type}`);
        }

        state.currentEvent = null;
        saveRaceState(state);

        if (input) input.value = "";
        renderAll(state);
    }

    async function init() {
        enableMusicOnFirstInteraction("./assets/audio/music/race-crowd-loop.mp3", { volume: 0.35 });
        try {
            const cart = loadCart();
            await loadRaceMetaData();

            let state = loadRaceState(cart);
            ensureRivalProgress(state);
            renderAll(state);

            el("nextEventBtn").addEventListener("click", () => {
                generateNextEvent(state);
            });

            if (el("resolveEventBtn")) {
                el("resolveEventBtn").addEventListener("click", () => {
                    resolveCurrentEvent(state);
                });
            }

            el("resetRaceBtn").addEventListener("click", () => {
                state = resetRaceState(cart);
                if (el("manualRollInput")) el("manualRollInput").value = "";
                el("result").innerHTML = "";
                renderAll(state);
            });
        } catch (err) {
            document.querySelector(".center").innerHTML = `
          <h3>Error</h3>
          <div class="result">
            <div class="big danger">Could not start the race</div>
            <div>${String(err.message)}</div>
          </div>
        `;
        }
    }

    async function loadRaceMetaData() {
        const [raceRes, rivalRes] = await Promise.all([
            fetch(RACE_DATA_JSON_PATH, { cache: "no-store" }),
            fetch(RIVAL_STATS_JSON_PATH, { cache: "no-store" })
        ]);

        if (!raceRes.ok) {
            throw new Error(`Failed to load race data (${raceRes.status})`);
        }

        if (!rivalRes.ok) {
            throw new Error(`Failed to load rival data (${rivalRes.status})`);
        }

        const raceData = await raceRes.json();
        const rivalData = await rivalRes.json();

        EVENT_TYPES = raceData["event_types"] ?? {};
        TRACK_TRAPS = raceData["track_traps"] ?? [];
        MANEUVERS = raceData["maneuvers"] ?? [];
        CART_ISSUES = raceData["cart_issues"] ?? [];
        HORSE_ISSUES = raceData["horse_issues"] ?? [];

        RIVALS = rivalData["rivals"] ?? [];
    }
    //          SECTION OF RENDERING AND SOUND 
    function playEventSfx(eventType) {
        switch (eventType) {

            case EVENT_TYPES.TRACK_TRAP:
                playSfx("../assets/audio/sfx/trackTrapsEventSFX.wav");
                break;

            case EVENT_TYPES.MANEUVER:
                playSfx("../assets/audio/sfx/maneuversEventSFX.wav");
                break;

            case EVENT_TYPES.CART_ISSUE:
                playSfx("../assets/audio/sfx/cartIssueEventSFX.wav");
                break;

            case EVENT_TYPES.HORSE_ISSUE:
                playSfx("../assets/audio/sfx/horseIssueEventSFX.wav");
                break;

            case EVENT_TYPES.ENEMY_ATTACK:
                playSfx("../assets/audio/sfx/enemyAttackEventSFX.wav");
                break;

            default:
                console.warn("No SFX for event type:", eventType);
        }
    }
    function renderCartState(state) {
        const cart = state.cart;

        el("cartHP").textContent = cart.base?.hp ?? "—";
        el("cartAC").textContent = cart.base?.ac ?? "—";
        el("cartSpeed").textContent = cart.speed ?? "—";

        el("horse1HP").textContent = cart.horses?.[0]?.hp ?? "—";
        el("horse1AC").textContent = cart.horses?.[0]?.ac ?? "—";
        el("horse2HP").textContent = cart.horses?.[1]?.hp ?? "—";
        el("horse2AC").textContent = cart.horses?.[1]?.ac ?? "—";

        el("driverName").textContent = cart.driver?.name ?? "—";
        el("attackerName").textContent = cart.attacker?.name ?? "—";
        el("defenderName").textContent = cart.defender?.name ?? "—";
    }

    function renderTopbar(state) {
        el("lapBadge").textContent = Math.min(state.currentLap, TOTAL_LAPS);
        el("checkpointBadge").textContent = Math.min(state.checkpoint, TOTAL_EVENTS);
        el("raceStatus").textContent = state.finished ? "Finished" : "Running";
    }

    function renderCurrentEvent(state) {
        if (!state.currentEvent) {
            el("eventTitle").textContent = "Race Ready";
            el("eventDesc").textContent = "Press Generate Event to begin.";
            el("eventType").textContent = "No active event";
            el("eventLap").textContent = "—";
            el("eventCheckpoint").textContent = "—";
            el("eventDetail").textContent = "No event has been generated yet.";
            return;
        }

        el("eventTitle").textContent = state.currentEvent.title;
        el("eventDesc").textContent = state.currentEvent.desc;
        el("eventType").textContent = state.currentEvent.type;
        el("eventLap").textContent = state.currentEvent.lap;
        el("eventCheckpoint").textContent = state.currentEvent.checkpoint;
        el("eventDetail").textContent = state.currentEvent.detail;
    }

    function renderRollPanel(state) {
        const rollPanel = el("rollPanel");
        const rollPrompt = el("rollPrompt");
        const input = el("manualRollInput");

        if (!rollPanel || !rollPrompt || !input) return;

        if (!state.pendingResolution) {
            rollPanel.style.display = "none";
            input.value = "";
            return;
        }

        rollPanel.style.display = "block";
        rollPrompt.textContent = state.pendingResolution.prompt ?? "Enter d20 roll";
    }

    function renderLog(state) {
        const log = el("log");
        log.innerHTML = "";

        if (state.log.length === 0) {
            log.innerHTML = `<div class="muted">No race events resolved yet.</div>`;
            return;
        }

        state.log.forEach(entry => {
            const node = document.createElement("div");
            node.className = "log-entry";
            node.innerHTML = `
          <div class="title">${entry.title}</div>
          <div class="meta">${entry.type} • Lap ${entry.lap} • Checkpoint ${entry.checkpoint}</div>
          <div>${entry.outcome}</div>
        `;
            log.appendChild(node);
        });
    }

    function renderResult(message, kind = "normal") {
        const cls = kind === "danger" ? "danger" : kind === "ok" ? "ok" : "";
        el("result").innerHTML = `<div class="big ${cls}">${message}</div>`;
    }

    function renderLapSummary(state, lapNumber, rivalStandings) {
        const playerSuccesses = state.playerLapSuccesses?.[lapNumber] ?? 0;
        const playerSpeed = state.cart?.speed ?? 0;
        const playerScore = (100 * playerSuccesses) / EVENTS_PER_LAP;

        const combined = [
            {
                name: "Dark Pirates",
                successes: playerSuccesses,
                speed: playerSpeed,
                score: playerScore
            },
            ...rivalStandings.map((r) => ({
                name: r.name,
                successes: r.successes,
                speed: r.speed,
                score: r.score
            }))
        ].sort((a, b) => b.score - a.score);

        const lines = combined
            .map((entry, index) => {
                return `<div>${index + 1}. <strong>${entry.name}</strong> — ${entry.successes} successes × ${entry.speed} speed = <strong>${entry.score}</strong></div>`;
            })
            .join("");

        renderResult(`Lap ${lapNumber} complete.`);
        el("result").innerHTML += `
        <div style="margin-top:10px;">
            <div class="big">Lap ${lapNumber} Standings</div>
            ${lines}
        </div>
    `;
    }

    function renderFinalStandings(state) {
        const standings = getFinalStandings(state);
        const targetScore = TOTAL_LAPS * 100;

        const rows = standings.map((entry, index) => {
            const place = index + 1;
            const label = place === 1
                ? "Winner"
                : place === 2
                    ? "2nd"
                    : place === 3
                        ? "3rd"
                        : `${place}th`;

            return `
            <div class="log-entry">
                <div class="title">${label} — ${entry.name}</div>
                <div class="meta">
                    Score: ${entry.totalScore} / ${targetScore}
                    • Distance: ${entry.distanceToTarget}
                    • Speed: ${entry.speed}
                </div>
            </div>
        `;
        }).join("");

        el("result").innerHTML = `
        <div class="big ok">Race Complete</div>
        <div class="small">Target score: <strong>${targetScore}</strong></div>
        <div style="margin-top:12px;">
            ${rows}
        </div>
    `;
    }

    function renderAll(state) {
        renderCartState(state);
        renderTopbar(state);
        renderCurrentEvent(state);
        renderLog(state);
        renderRollPanel(state);

        const hasPending = !!state.pendingResolution;

        el("nextEventBtn").disabled = state.finished || hasPending;
        if (el("resolveEventBtn")) {
            el("resolveEventBtn").disabled = state.finished || !hasPending;
        }
    }

    init()

}