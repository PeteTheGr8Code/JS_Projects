// screens.js

export const workshopHTML = `
  <header>
    <h1>Cart Creation — Workshop Ledger</h1>
    <div class="sub">Build your cart through crew rolls. Crew can be reused across tasks.</div>
    <button id="muteToggle" class="secondary" style="margin-top:8px;">Toggle Audio</button>
  </header>

  <div class="progress" id="progress"></div>

  <div class="container">
    <div class="panel left">
      <h3>Cart Sheet</h3>
      <div class="stats">
        <div style="font-weight:700;margin:4px 0 6px;">Cart</div>
        <div class="row"><span>HP</span><span class="val" id="cartHP">50</span></div>
        <div class="row"><span>AC</span><span class="val" id="cartAC">12</span></div>
        <div class="row"><span>Speed</span><span class="val" id="cartSpeed">40</span></div>

        <div style="height:10px;"></div>

        <div style="font-weight:700;margin:4px 0 6px;">Horse 1</div>
        <div class="row"><span>HP</span><span class="val" id="horseHP">30</span></div>
        <div class="row"><span>AC</span><span class="val" id="horseAC">10</span></div>

        <div style="height:10px;"></div>

        <div style="font-weight:700;margin:4px 0 6px;">Horse 2</div>
        <div class="row"><span>HP</span><span class="val" id="horseHP1">30</span></div>
        <div class="row"><span>AC</span><span class="val" id="horseAC1">10</span></div>
      </div>
    </div>

    <div class="panel center">
      <h3>Current Task</h3>
      <div class="task-title" id="taskTitle">Loading…</div>
      <p class="task-desc" id="taskDesc"></p>

      <div class="rollbox">
        <div class="rollname" id="rollName">—</div>
        <div class="meta">
          <div><strong>Uses:</strong> <span id="rollStat">—</span></div>
          <div><strong>Roll #:</strong> <span id="rollIndex">—</span>/<span id="rollTotal">—</span></div>
        </div>

        <div class="selectedLine" id="selectedLine">Select a crew member for this roll.</div>

        <div class="actions">
          <button id="rollBtn" disabled>Roll d20</button>
          <button id="applyBtn" class="secondary" disabled>Apply & Continue</button>
          <input
            type="text"
            id="rollCheat"
            placeholder="Cheat roll"
            style="padding:10px 12px; border-radius:8px; border:1px solid var(--border); font-size:14px; background:white; color:var(--ink); width:120px;"
          />
        </div>

        <div class="result" id="result" style="display:none;"></div>
      </div>

      <div class="small" style="color:var(--muted);font-size:13px;">
        Note: tier effects are placeholders right now. The UI is driven by the workshop step config.
      </div>
    </div>

    <div class="panel right">
      <h3>Crew Roster</h3>
      <div class="crew-grid" id="crewList"></div>
    </div>
  </div>
`;

export const crewSelectHTML = `
  <header>
    <h1>Crew Role Assignment</h1>
    <div class="sub">Assign Driver, Attacker, and Defender, then build the final cart.</div>
    <button id="muteToggle" class="secondary" style="margin-top:8px;">Toggle Audio</button>
  </header>

  <div class="container">
    <div class="panel left">
      <h3>Workshop Preview</h3>
      <div class="stats">
        <div style="font-weight:700;margin:4px 0 6px;">Cart</div>
        <div class="row"><span>HP</span><span class="val" id="cartHP">—</span></div>
        <div class="row"><span>AC</span><span class="val" id="cartAC">—</span></div>
        <div class="row"><span>Speed</span><span class="val" id="cartSpeed">—</span></div>

        <div style="height:10px;"></div>

        <div style="font-weight:700;margin:4px 0 6px;">Horse 1</div>
        <div class="row"><span>HP</span><span class="val" id="horse1HP">—</span></div>
        <div class="row"><span>AC</span><span class="val" id="horse1AC">—</span></div>

        <div style="height:10px;"></div>

        <div style="font-weight:700;margin:4px 0 6px;">Horse 2</div>
        <div class="row"><span>HP</span><span class="val" id="horse2HP">—</span></div>
        <div class="row"><span>AC</span><span class="val" id="horse2AC">—</span></div>
      </div>
    </div>

    <div class="panel center">
      <h3>Role Assignment</h3>

      <div class="assignments" id="assignments">
        <div class="assignment-row"><span>Driver</span><strong id="driverName" class="muted">Unassigned</strong></div>
        <div class="assignment-row"><span>Attacker</span><strong id="attackerName" class="muted">Unassigned</strong></div>
        <div class="assignment-row"><span>Defender</span><strong id="defenderName" class="muted">Unassigned</strong></div>
      </div>

      <div class="actions">
        <button id="buildBtn" disabled>Create Final Cart</button>
        <button id="clearBtn" class="secondary">Clear Roles</button>
      </div>

      <div class="result" id="result"></div>
    </div>

    <div class="panel right">
      <h3>Crew Roster</h3>
      <div class="crew-grid" id="crewList"></div>
    </div>
  </div>
`;

export const raceHTML = `
  <header>
    <h1>Race — Whisteria Circuit</h1>
    <div class="sub">Advance through race events and resolve hazards one checkpoint at a time.</div>
    <button id="muteToggle" class="secondary" style="margin-top:8px;">Toggle Audio</button>
  </header>

  <div class="topbar">
    <div class="badge">Lap: <strong id="lapBadge">1</strong> / 6</div>
    <div class="badge">Checkpoint: <strong id="checkpointBadge">1</strong> / 24</div>
    <div class="badge">Status: <strong id="raceStatus">Running</strong></div>
  </div>

  <div class="container">
    <div class="panel left">
      <h3>Cart State</h3>
      <div class="stats">
        <div class="section-title">Cart</div>
        <div class="row"><span>HP</span><span class="val" id="cartHP">—</span></div>
        <div class="row"><span>AC</span><span class="val" id="cartAC">—</span></div>
        <div class="row"><span>Speed</span><span class="val" id="cartSpeed">—</span></div>

        <div class="section-title">Horse 1</div>
        <div class="row"><span>HP</span><span class="val" id="horse1HP">—</span></div>
        <div class="row"><span>AC</span><span class="val" id="horse1AC">—</span></div>

        <div class="section-title">Horse 2</div>
        <div class="row"><span>HP</span><span class="val" id="horse2HP">—</span></div>
        <div class="row"><span>AC</span><span class="val" id="horse2AC">—</span></div>

        <div class="section-title">Crew</div>
        <div class="row"><span>Driver</span><span class="val" id="driverName">—</span></div>
        <div class="row"><span>Attacker</span><span class="val" id="attackerName">—</span></div>
        <div class="row"><span>Defender</span><span class="val" id="defenderName">—</span></div>
      </div>
    </div>

    <div class="panel center">
      <h3>Current Event</h3>
      <div class="task-title" id="eventTitle">Loading race…</div>
      <p class="task-desc" id="eventDesc"></p>

      <div class="event-card">
        <div class="event-type" id="eventType">—</div>
        <div class="event-meta">
          <div><strong>Lap:</strong> <span id="eventLap">—</span></div>
          <div><strong>Checkpoint:</strong> <span id="eventCheckpoint">—</span></div>
        </div>

        <div id="eventDetail" class="muted">Generate the next event to begin.</div>

        <div class="actions">
          <button id="nextEventBtn">Generate Event</button>
          <button id="resolveEventBtn" class="secondary" disabled>Resolve Event</button>
          <button id="resetRaceBtn" class="secondary">Reset Race</button>
        </div>

        <div class="result" id="result"></div>

        <div id="rollPanel" style="margin-top:12px; display:none;">
          <div id="rollPrompt" style="font-weight:700; margin-bottom:6px;">Enter roll</div>
          <input
            id="manualRollInput"
            type="number"
            min="1"
            max="20"
            placeholder="d20 result"
            style="padding:10px 12px; border-radius:8px; border:1px solid var(--border); font-size:14px; width:180px; background:white; color:var(--ink);"
          />
        </div>
      </div>

      <div class="muted" style="font-size:13px;">
        Events are generated first, then resolved after you enter the player’s roll.
      </div>
    </div>

    <div class="panel right">
      <h3>Race Log</h3>
      <div class="log" id="log"></div>
    </div>
  </div>
`;

export const startHTML = `
  <div class="start-screen">
    <div class="start-container">
      <h1>Whisteria Racing</h1>
      <p class="sub">Forge your cart. Choose your crew. Survive the race.</p>
      <button id="startBtn">Start Game</button>
    </div>
  </div>
`;

export const endHTML = `
  <header>
    <h1>Race Results</h1>
    <div class="sub">Final standings from the Whisteria Circuit.</div>
  </header>

  <div class="container">
    <div class="panel center">
      <h3>Final Standings</h3>
      <div id="finalStandings"></div>

      <div class="actions">
        <button id="newRaceBtn">Start New Race</button>
      </div>
    </div>
  </div>
`;