/**
 * workshop.js
 * Logic adapted to the existing UI and engine model:
 * new Cart(base, wheels, horse1, armor1, horse2, armor2, crew)
 *
 * UI kept unchanged:
 * - cartHP, cartAC, cartSpeed
 * - horseHP, horseAC
 * - horseHP1, horseAC1
 * - progress, crewList, taskTitle, taskDesc, rollName, rollStat, rollIndex,
 *   rollTotal, selectedLine, rollBtn, applyBtn, result
 */

const CREW_JSON_PATH = "./data/CrewStats.json";
const WORKSHOP_STORAGE_KEY = "whisteriaWorkshop";


import { BaseStats } from "./racing.js";
import Cart from "./Cart.js";
import { CartBase, CartWheels, CartHorse, CartHorseArmor } from "./racing.js";

/**
 * Workshop order adapted to the engine:
 * - Base -> 2 rolls, keep highest
 * - Wheels
 * - Horse 1
 * - Horse 1 Armor
 * - Horse 2
 * - Horse 2 Armor
 */
const WORKSHOP_STEPS = [
  {
    key: "base",
    name: "Base",
    desc: "Construct the cart base. Two checks are made and the highest total is kept for the final base quality.",
    rolls: [
      { label: "Materials Quality", stat: ["SUR", "NAT"], affect: "base" },
      { label: "Structural Integrity", stat: ["INV"], affect: "base" }
    ]
  },
  {
    key: "wheels",
    name: "Wheels",
    desc: "Build and align the wheels for speed and reliability.",
    rolls: [
      { label: "Wheel Crafting", stat: ["TINK", "CARP", "DEX"], affect: "wheels" }
    ]
  },
  {
    key: "horse1",
    name: "Horse 1",
    desc: "Prepare the first horse for racing.",
    rolls: [
      { label: "Taming / Handling", stat: ["ANIM", "CHA"], affect: "horse1" }
    ]
  },
  {
    key: "armor1",
    name: "Horse 1 Armor",
    desc: "Fit protective armor for the first horse.",
    rolls: [
      { label: "Armor Fitting", stat: ["CARP", "TINK", "INV"], affect: "armor1" }
    ]
  },
  {
    key: "horse2",
    name: "Horse 2",
    desc: "Prepare the second horse for racing.",
    rolls: [
      { label: "Taming / Handling", stat: ["ANIM", "CHA"], affect: "horse2" }
    ]
  },
  {
    key: "armor2",
    name: "Horse 2 Armor",
    desc: "Fit protective armor for the second horse.",
    rolls: [
      { label: "Armor Fitting", stat: ["CARP", "TINK", "INV"], affect: "armor2" }
    ]
  }
];

// --- State ---
let crew = [];
let stepIndex = 0;
let rollIndex = 0;
let selectedCrewId = null;
let pendingRoll = null;
let baseRollTotals = [];

const workshopState = {
  base: new CartBase(),
  wheels: new CartWheels(),
  horse1: new CartHorse("Horse 1"),
  armor1: new CartHorseArmor("Horse 1 Armor"),
  horse2: new CartHorse("Horse 2"),
  armor2: new CartHorseArmor("Horse 2 Armor")
};

// --- Helpers ---
function el(id) {
  return document.getElementById(id);
}

function bestOfStats(memberStats, statKeys) {
  let bestKey = statKeys[0];
  let bestVal = memberStats?.[bestKey] ?? 0;

  for (const k of statKeys) {
    const v = memberStats?.[k] ?? 0;
    if (v > bestVal) {
      bestVal = v;
      bestKey = k;
    }
  }

  return { bestKey, bestVal };
}

function flashStat(domId) {
  const node = el(domId);
  if (!node) return;
  node.classList.remove("flash");
  void node.offsetWidth;
  node.classList.add("flash");
}

function currentStep() {
  return WORKSHOP_STEPS[stepIndex];
}

function currentRoll() {
  return currentStep().rolls[rollIndex];
}

/**
 * Preview values for the current UI.
 * This mirrors what the final Cart constructor will roughly produce visually:
 * - cart HP/AC from base
 * - cart speed = base speed + wheels speed + horse speeds + armor speed modifiers
 * - horse HP/AC displayed per horse in the existing sheet
 */
function getPreviewStats() {
  const horse1HP = BaseStats.HorseHP + (workshopState.horse1.hp ?? 0);
  const horse2HP = BaseStats.HorseHP + (workshopState.horse2.hp ?? 0);

  const horse1AC = BaseStats.HorseAC + (workshopState.horse1.ac ?? 0) + (workshopState.armor1.ac ?? 0);
  const horse2AC = BaseStats.HorseAC + (workshopState.horse2.ac ?? 0) + (workshopState.armor2.ac ?? 0);

  const horse1Speed = (workshopState.horse1.speed ?? 0) + (workshopState.armor1.speed ?? 0);
  const horse2Speed = (workshopState.horse2.speed ?? 0) + (workshopState.armor2.speed ?? 0);

  const cartSpeed =
    BaseStats.CartBaseSpeed +
    (workshopState.wheels.speed ?? 0) +
    horse1Speed +
    horse2Speed;

  return {
    cartHP: workshopState.base.hp,
    cartAC: workshopState.base.ac,
    cartSpeed,
    horse1HP,
    horse1AC,
    horse2HP,
    horse2AC
  };
}

function renderCart() {
  const stats = getPreviewStats();

  el("cartHP").textContent = stats.cartHP;
  el("cartAC").textContent = stats.cartAC;
  el("cartSpeed").textContent = stats.cartSpeed;

  // HTML uses horseHP / horseAC for Horse 1
  el("horseHP").textContent = stats.horse1HP;
  el("horseAC").textContent = stats.horse1AC;

  // HTML uses horseHP1 / horseAC1 for Horse 2
  el("horseHP1").textContent = stats.horse2HP;
  el("horseAC1").textContent = stats.horse2AC;
}

function renderProgress() {
  const p = el("progress");
  p.innerHTML = "";

  WORKSHOP_STEPS.forEach((s, i) => {
    const tab = document.createElement("div");
    tab.className =
      "tab" +
      (i === stepIndex ? " active" : "") +
      (i < stepIndex ? " done" : "");
    tab.textContent = s.name;
    p.appendChild(tab);
  });
}

function renderCrew() {
  const list = el("crewList");
  list.innerHTML = "";

  crew.forEach((m) => {
    const card = document.createElement("div");
    card.className = "crew-card" + (m.id === selectedCrewId ? " selected" : "");

    const s = m.stats || {};
    const keysToShow = ["STR", "DEX", "INV", "SUR", "NAT", "TINK", "CARP", "ANIM", "CHA", "WIS", "PER"];
    const pills = keysToShow
      .filter((k) => s[k] !== undefined)
      .slice(0, 8)
      .map((k) => `<span class="pill">${k} ${s[k]}</span>`)
      .join("");

    card.innerHTML = `
      <div class="crew-name">${m.name}</div>
      <div class="crew-stats">${pills || `<span class="pill">No stats found</span>`}</div>
    `;

    card.onclick = () => {
      selectedCrewId = m.id;
      renderCrew();
      el("rollBtn").disabled = false;
      el("selectedLine").textContent = `Selected: ${m.name}`;
    };

    list.appendChild(card);
  });
}

function loadTaskUI() {
  renderProgress();
  renderCart();

  const step = currentStep();
  const roll = currentRoll();

  el("taskTitle").textContent = step.name;
  el("taskDesc").textContent = step.desc;
  el("rollName").textContent = roll.label;
  el("rollStat").textContent = Array.isArray(roll.stat) ? roll.stat.join(" / ") : String(roll.stat);
  el("rollIndex").textContent = String(rollIndex + 1);
  el("rollTotal").textContent = String(step.rolls.length);

  selectedCrewId = null;
  pendingRoll = null;

  el("selectedLine").textContent = "Select a crew member for this roll.";
  el("rollBtn").disabled = true;
  el("applyBtn").disabled = true;

  el("result").style.display = "none";
  el("result").innerHTML = "";
}

function doRoll() {
  const member = crew.find((c) => c.id === selectedCrewId);
  if (!member) return;

  let cheatValue = el("rollCheat").value ? parseInt(el("rollCheat").value) : undefined;
  if(!isNaN(cheatValue)) {
    // Clamp cheat value between 1 and 20
    cheatValue = Math.max(1, Math.min(20, cheatValue));
  }
  console.log("Cheat value:", cheatValue);
  const roll = currentRoll();
  const statKeys = Array.isArray(roll.stat) ? roll.stat : [roll.stat];
  const { bestKey, bestVal } = bestOfStats(member.stats || {}, statKeys);

  const base = cheatValue !== undefined ? cheatValue : Math.floor(Math.random() * 20) + 1;
  const mod = bestVal;
  const total = base + mod;

  pendingRoll = {
    base,
    mod,
    total,
    bestKey,
    bestVal,
    memberName: member.name,
    affect: roll.affect
  };

  let detail = `Pending application to <strong>${roll.affect}</strong>.`;
  if (roll.affect === "base") {
    detail = `Base requires 2 rolls and keeps the highest. Completed base rolls so far: <strong>${baseRollTotals.length}</strong>/2.`;
  }

  el("result").style.display = "block";
  el("result").innerHTML = `
    <div class="small">Crew: <strong>${member.name}</strong> • Using <strong>${bestKey}</strong> (+${bestVal})</div>
    <div class="big">${base} + ${mod} = ${total}</div>
    <div class="small">${detail}</div>
  `;

  el("applyBtn").disabled = false;
}

function applyRollToPart(affect, total) {
  if (affect === "base") {
    baseRollTotals.push(total);

    if (baseRollTotals.length === 2) {
      const highestBaseRoll = Math.max(...baseRollTotals);
      workshopState.base.evaluateRoll(highestBaseRoll);
      workshopState.base.applyRoll();
    }

    return;
  }

  const part = workshopState[affect];
  if (!part) return;

  part.evaluateRoll(total);
  part.applyRoll();
}

function serializeWorkshopState() {
  return {
    base: {
      name: workshopState.base.name,
      quality: workshopState.base.quality,
      hp: workshopState.base.hp,
      ac: workshopState.base.ac
    },
    wheels: {
      name: workshopState.wheels.name,
      quality: workshopState.wheels.quality,
      speed: workshopState.wheels.speed,
      advantage: workshopState.wheels.advantage
    },
    horse1: {
      name: workshopState.horse1.name,
      quality: workshopState.horse1.quality,
      ac: workshopState.horse1.ac,
      hp: workshopState.horse1.hp,
      speed: workshopState.horse1.speed,
      advantage: workshopState.horse1.advantage,
      disadvantage: workshopState.horse1.disadvantage,
      rammingDamage: workshopState.horse1.rammingDamage
    },
    armor1: {
      name: workshopState.armor1.name,
      quality: workshopState.armor1.quality,
      ac: workshopState.armor1.ac,
      speed: workshopState.armor1.speed,
      rammingDamage: workshopState.armor1.rammingDamage
    },
    horse2: {
      name: workshopState.horse2.name,
      quality: workshopState.horse2.quality,
      ac: workshopState.horse2.ac,
      hp: workshopState.horse2.hp,
      speed: workshopState.horse2.speed,
      advantage: workshopState.horse2.advantage,
      disadvantage: workshopState.horse2.disadvantage,
      rammingDamage: workshopState.horse2.rammingDamage
    },
    armor2: {
      name: workshopState.armor2.name,
      quality: workshopState.armor2.quality,
      ac: workshopState.armor2.ac,
      speed: workshopState.armor2.speed,
      rammingDamage: workshopState.armor2.rammingDamage
    },
    meta: {
      baseRollTotals: [...baseRollTotals]
    },
    preview: getPreviewStats()
  };
}

function showCompletionScreen() {
  const preview = getPreviewStats();

  localStorage.setItem(WORKSHOP_STORAGE_KEY, JSON.stringify(serializeWorkshopState()));

  const center = document.querySelector(".panel.center");
  center.innerHTML = `
    <h3>Workshop Complete</h3>
    <div class="task-title">Cart Parts Ready</div>
    <p class="task-desc">Your cart parts are built and saved. Proceed to role assignment.</p>

    <div class="panel" style="margin-top:12px;">
      <h3>Final Preview</h3>
      <div class="stats">
        <div style="font-weight:700;margin:4px 0 6px;">Cart</div>
        <div class="row"><span>HP</span><span class="val">${preview.cartHP}</span></div>
        <div class="row"><span>AC</span><span class="val">${preview.cartAC}</span></div>
        <div class="row"><span>Speed</span><span class="val">${preview.cartSpeed}</span></div>

        <div style="height:10px;"></div>
        <div style="font-weight:700;margin:4px 0 6px;">Horse 1</div>
        <div class="row"><span>HP</span><span class="val">${preview.horse1HP}</span></div>
        <div class="row"><span>AC</span><span class="val">${preview.horse1AC}</span></div>

        <div style="height:10px;"></div>
        <div style="font-weight:700;margin:4px 0 6px;">Horse 2</div>
        <div class="row"><span>HP</span><span class="val">${preview.horse2HP}</span></div>
        <div class="row"><span>AC</span><span class="val">${preview.horse2AC}</span></div>
      </div>
    </div>

    <div class="actions" style="margin-top:12px;">
      <button id="proceedBtn">Proceed to Role Assignment</button>
    </div>
  `;

  el("progress").innerHTML = "";

  document.getElementById("proceedBtn")?.addEventListener("click", () => {
    window.location.href = "./crew-select.html";
  });
}

function applyRoll() {
  if (!pendingRoll) return;

  applyRollToPart(pendingRoll.affect, pendingRoll.total);
  renderCart();

  flashStat("cartHP");
  flashStat("cartAC");
  flashStat("cartSpeed");
  flashStat("horseHP");
  flashStat("horseAC");
  flashStat("horseHP1");
  flashStat("horseAC1");

  const step = currentStep();
  rollIndex++;

  if (rollIndex >= step.rolls.length) {
    stepIndex++;
    rollIndex = 0;
  }

  if (stepIndex >= WORKSHOP_STEPS.length) {
    showCompletionScreen();
    return;
  }

  loadTaskUI();
}

async function init() {
  try {
    const res = await fetch(CREW_JSON_PATH, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to load crew data (${res.status})`);
    }

    const data = await res.json();

    crew = (data.crew || []).map((m, idx) => ({
      id: m.id ?? `pc-${idx + 1}`,
      name: m.name ?? `Crew ${idx + 1}`,
      stats: m.stats ?? {}
    }));

    if (crew.length === 0) {
      throw new Error("CrewStats.json loaded but crew[] is empty.");
    }

    renderCrew();
    loadTaskUI();

    el("rollBtn").onclick = doRoll;
    el("applyBtn").onclick = applyRoll;
  } catch (err) {
    const center = document.querySelector(".panel.center");
    center.innerHTML = `
      <h3>Error</h3>
      <div class="task-title">Could not load crew data</div>
      <p class="task-desc">${String(err.message)}</p>
      <p class="task-desc">Check that <code>${CREW_JSON_PATH}</code> exists and is served correctly.</p>
    `;
  }
}

init();