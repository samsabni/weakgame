import { canAssignToSelectedBuilding } from './buildingState.js';

function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function assignDelinquentToSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding || state.playerIdleDelinquents <= 0 || !canAssignToSelectedBuilding(state)) {
    return false;
  }

  state.playerIdleDelinquents -= 1;
  selectedBuilding.playerAssignedDelinquents += 1;
  return true;
}

export function removeDelinquentFromSelectedBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding || selectedBuilding.playerAssignedDelinquents <= 0) {
    return false;
  }

  selectedBuilding.playerAssignedDelinquents -= 1;
  if (selectedBuilding.isRunning && selectedBuilding.playerAssignedDelinquents < 10) {
    selectedBuilding.isRunning = false;
  }
  state.playerIdleDelinquents += 1;
  return true;
}
