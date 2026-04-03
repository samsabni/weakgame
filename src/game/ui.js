import {
  canAssignToSelectedBuilding,
  getPassiveCashRate,
  getPassiveInfluenceRate
} from './buildingState.js';

export function createUiBindings() {
  return {
    status: document.querySelector('#status'),
    idleDelinquents: document.querySelector('#idle-delinquents'),
    cash: document.querySelector('#cash'),
    influence: document.querySelector('#influence'),
    buildingId: document.querySelector('#building-id'),
    buildingOwner: document.querySelector('#building-owner'),
    buildingControl: document.querySelector('#building-control'),
    buildingAssignedDelinquents: document.querySelector('#building-assigned-delinquents'),
    assignmentReason: document.querySelector('#assignment-reason'),
    delinquentControls: document.querySelector('#delinquent-controls'),
    assignDelinquentButton: document.querySelector('#assign-delinquent'),
    removeDelinquentButton: document.querySelector('#remove-delinquent'),
    runBuildingButton: document.querySelector('#run-building'),
    gameOverOverlay: document.querySelector('#game-over-overlay'),
    startOverButton: document.querySelector('#start-over'),
    debugToggle: document.querySelector('#debug-toggle'),
    debugPanel: document.querySelector('#debug-panel'),
    debugCashIncreaseButton: document.querySelector('#debug-cash-increase'),
    debugCashDecreaseButton: document.querySelector('#debug-cash-decrease'),
    debugInfluenceIncreaseButton: document.querySelector('#debug-influence-increase'),
    debugInfluenceDecreaseButton: document.querySelector('#debug-influence-decrease'),
    debugIdleIncreaseButton: document.querySelector('#debug-idle-increase'),
    debugIdleDecreaseButton: document.querySelector('#debug-idle-decrease'),
    mapRoot: document.querySelector('#map-root')
  };
}

function setTextIfChanged(element, value) {
  if (element.textContent !== value) {
    element.textContent = value;
  }
}

function formatRate(rate) {
  return rate.toFixed(1);
}

function getBuildingOwnerDisplay(building) {
  if (building.isRunning) {
    return 'red (running)';
  }

  if (building.control > 0) {
    return 'red (controlling)';
  }

  return building.owner;
}

export function renderSelectedBuilding(ui, state, building) {
  if (ui.gameOverOverlay) {
    ui.gameOverOverlay.hidden = !Boolean(state.gameOver);
  }

  if (ui.status) {
    setTextIfChanged(
      ui.status,
      state.needsStarterBuilding ? 'Choose your starting building' : `${state.buildings.length} buildings detected.`
    );
  }

  setTextIfChanged(ui.idleDelinquents, `Idle Delinquents: ${state.playerIdleDelinquents}`);
  setTextIfChanged(ui.cash, `Cash: ${state.cash} (+${formatRate(getPassiveCashRate(state))}/s)`);
  setTextIfChanged(
    ui.influence,
    `Influence: ${state.influence} (+${formatRate(getPassiveInfluenceRate(state))}/s)`
  );

  if (!building) {
    setTextIfChanged(ui.buildingId, 'None');
    setTextIfChanged(ui.buildingOwner, 'Owner: -');
    setTextIfChanged(ui.buildingControl, 'Control: -');
    if (!ui.buildingAssignedDelinquents.hidden) {
      ui.buildingAssignedDelinquents.hidden = true;
    }
    if (!ui.assignmentReason.hidden) {
      ui.assignmentReason.hidden = true;
    }
    if (!ui.delinquentControls.hidden) {
      ui.delinquentControls.hidden = true;
    }
    if (!ui.runBuildingButton.hidden) {
      ui.runBuildingButton.hidden = true;
    }
    return;
  }

  setTextIfChanged(ui.buildingId, building.id);
  setTextIfChanged(ui.buildingOwner, `Owner: ${getBuildingOwnerDisplay(building)}`);
  setTextIfChanged(ui.buildingControl, `Control: ${building.control.toFixed(1)}%`);
  setTextIfChanged(
    ui.buildingAssignedDelinquents,
    `Assigned Delinquents: ${building.playerAssignedDelinquents}`
  );
  if (ui.buildingAssignedDelinquents.hidden) {
    ui.buildingAssignedDelinquents.hidden = false;
  }
  if (ui.delinquentControls.hidden) {
    ui.delinquentControls.hidden = false;
  }

  const assignable = canAssignToSelectedBuilding(state);
  ui.assignDelinquentButton.disabled = !assignable || state.playerIdleDelinquents <= 0;
  ui.assignmentReason.hidden = assignable;
  if (!assignable) {
    setTextIfChanged(ui.assignmentReason, 'Too far from your current territory');
  }

  if (building.isRunning) {
    if (!ui.runBuildingButton.hidden) {
      ui.runBuildingButton.hidden = true;
    }
    return;
  }

  if (state.needsStarterBuilding) {
    if (!ui.runBuildingButton.hidden) {
      ui.runBuildingButton.hidden = true;
    }
    return;
  }

  if (ui.runBuildingButton.hidden) {
    ui.runBuildingButton.hidden = false;
  }
  ui.runBuildingButton.disabled =
    building.control < 100 || state.cash < 2000 || building.playerAssignedDelinquents < 10;
}

export function setDebugPanelOpen(ui, isOpen) {
  ui.debugPanel.hidden = !isOpen;
}

export function setStatus(ui, message) {
  ui.status.textContent = message;
}
