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
    delinquentControls: document.querySelector('#delinquent-controls'),
    assignDelinquentButton: document.querySelector('#assign-delinquent'),
    removeDelinquentButton: document.querySelector('#remove-delinquent'),
    runBuildingButton: document.querySelector('#run-building'),
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

export function renderSelectedBuilding(ui, state, building) {
  setTextIfChanged(ui.idleDelinquents, `Idle Delinquents: ${state.playerIdleDelinquents}`);
  setTextIfChanged(ui.cash, `Cash: ${state.cash}`);
  setTextIfChanged(ui.influence, `Influence: ${state.influence}`);

  if (!building) {
    setTextIfChanged(ui.buildingId, 'None');
    setTextIfChanged(ui.buildingOwner, 'Owner: -');
    setTextIfChanged(ui.buildingControl, 'Control: -');
    if (!ui.buildingAssignedDelinquents.hidden) {
      ui.buildingAssignedDelinquents.hidden = true;
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
  setTextIfChanged(ui.buildingOwner, `Owner: ${building.owner}`);
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

  if (building.isRunning) {
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
