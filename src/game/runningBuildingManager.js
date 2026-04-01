function getSelectedBuilding(state) {
  return state.buildings.find((building) => building.id === state.selectedBuildingId) ?? null;
}

export function purchaseSelectedRunningBuilding(state) {
  const selectedBuilding = getSelectedBuilding(state);
  if (!selectedBuilding) {
    return false;
  }

  if (selectedBuilding.isRunning) {
    return false;
  }

  if (selectedBuilding.control < 100) {
    return false;
  }

  if (selectedBuilding.playerAssignedDelinquents < 10) {
    return false;
  }

  if (state.cash < 2000) {
    return false;
  }

  state.cash -= 2000;
  selectedBuilding.isRunning = true;
  return true;
}
