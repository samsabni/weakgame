export function createInitialState(buildings) {
  return {
    buildings,
    playerIdleDelinquents: 10,
    cash: 0,
    influence: 0,
    selectedBuildingId: null,
    hoveredBuildingId: null
  };
}

export function selectBuilding(state, buildingId) {
  state.selectedBuildingId = buildingId;
}

export function clearSelection(state) {
  state.selectedBuildingId = null;
}

export function setHoveredBuilding(state, buildingId) {
  state.hoveredBuildingId = buildingId;
}

export function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function getBuildingControlCap(building) {
  return Math.min(100, building.playerAssignedDelinquents * 10);
}

export function getCashCap(buildings) {
  const runningCount = buildings.filter((building) => building.isRunning).length;
  return 2000 + (runningCount * 2000);
}

function clampCashToCap(state) {
  const cashCap = getCashCap(state.buildings);
  const nextCash = Math.min(state.cash, cashCap);

  if (nextCash === state.cash) {
    return false;
  }

  state.cash = nextCash;
  return true;
}

export function tickBuildingControl(state, amountPerAssignedDelinquent) {
  let changed = false;

  for (const building of state.buildings) {
    if (building.isRunning && building.playerAssignedDelinquents < 10) {
      building.isRunning = false;
      changed = true;
    }

    const cap = getBuildingControlCap(building);

    if (building.control < cap) {
      const increase = amountPerAssignedDelinquent * building.playerAssignedDelinquents;
      const nextControl = Math.min(cap, building.control + increase);

      if (nextControl !== building.control) {
        changed = true;
        building.control = nextControl;
      }

      continue;
    }

    if (building.control > cap) {
      const decayBasis = Math.max(1, building.playerAssignedDelinquents);
      const decrease = amountPerAssignedDelinquent * decayBasis * 2.5;
      const nextControl = Math.max(cap, building.control - decrease);

      if (nextControl !== building.control) {
        changed = true;
        building.control = nextControl;
      }
    }
  }

  if (clampCashToCap(state)) {
    changed = true;
  }

  return changed;
}

export function tickPassiveResources(state) {
  const cashGain = Math.round(
    state.buildings.reduce((sum, building) => {
      if (building.isRunning || building.control <= 0) {
        return sum;
      }

      return sum + (5 * (building.control / 100));
    }, 0)
  );
  const influenceGain = state.buildings.filter((building) => building.isRunning).length;
  let changed = false;

  if (cashGain > 0) {
    const nextCash = Math.min(getCashCap(state.buildings), state.cash + cashGain);
    if (nextCash !== state.cash) {
      state.cash = nextCash;
      changed = true;
    }
  } else if (clampCashToCap(state)) {
    changed = true;
  }

  if (influenceGain > 0) {
    state.influence += influenceGain;
    changed = true;
  }

  return changed;
}

export function adjustCash(state, amount) {
  const nextCash = Math.max(0, Math.min(getCashCap(state.buildings), state.cash + amount));
  state.cash = nextCash;
}

export function adjustInfluence(state, amount) {
  state.influence = Math.max(0, state.influence + amount);
}

export function adjustPlayerIdleDelinquents(state, amount) {
  state.playerIdleDelinquents = Math.max(0, state.playerIdleDelinquents + amount);
}
