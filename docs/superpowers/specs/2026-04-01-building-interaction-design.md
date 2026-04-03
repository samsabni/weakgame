# Building Interaction Design

## Goal

Turn `finalmap.png` into a minimal interactive building-control layer for a browser game.

Scope is intentionally limited to:
- building data
- click detection on buildings
- hover feedback on buildings
- building selection and highlight
- displaying control percentage
- passive per-building control growth over time
- control-driven building color transition
- viewport-fit map presentation
- player delinquent assignment state and UI
- building running purchase state
- passive cash and influence generation
- a developer debug menu for global resources

Out of scope:
- AI
- combat
- ownership changes based on control
- pathfinding
- map editing tools
- any delinquent effects beyond assignment counts

## Constraints

- The project already uses a minimal Vite-based web app scaffold.
- The map image contains small buildings with black borders.
- Building roofs have been normalized to color `#A5A095`.
- Building detection should be accurate without manual hotspot placement.

## Recommended Approach

Use a minimal browser-based web stack with a hidden canvas for image analysis and a visible map layer for interaction.

At startup, the app loads `finalmap.png`, scans the image for connected regions matching the roof color, and converts each detected roof region into a building object. Those objects are then used for click hit detection, selection highlighting, and control updates.

This approach is preferred because it avoids manual coordinate authoring while remaining accurate for small, irregular building shapes.

## Architecture

### Files

- `index.html`
  - hosts the map, selected-building panel, and debug toggle/panel
- `style.css`
  - handles page layout, panel styling, and highlight visuals
- `src/main.js`
  - loads the map image
  - detects buildings from roof pixels
  - stores building state
  - handles click hit testing
  - renders selection/highlight state
  - updates control and passive resources over time

### Runtime Layers

- Hidden analysis canvas
  - draws the source image
  - provides pixel data for building detection and click lookup
- Visible map layer
  - shows the map image to the player
  - is centered in the viewport
  - scales to fill viewport height while preserving aspect ratio
- Visible overlay layer
  - highlights the currently selected building
- UI panel
  - shows selected building data and contains building action controls plus the debug toggle
  - is overlaid on top of the map rather than taking layout width

## Building Data Model

Each building is represented as an object with the following fields:

```js
{
  id: "building-1",
  position: { x: 0, y: 0 },
  control: 0,
  owner: "neutral",
  playerAssignedDelinquents: 0,
  isRunning: false
}
```

### Field Meanings

- `id`
  - generated sequentially during startup detection
- `position`
  - centroid of the detected roof region in map coordinates
- `control`
  - integer percentage from `0` to `100`
- `owner`
  - initial value is always `"neutral"`
  - allowed values are `"player"`, `"enemy"`, `"neutral"`
- `playerAssignedDelinquents`
  - integer count assigned to this specific building
  - initial value is `0`
- `isRunning`
  - boolean flag for whether the building has been purchased into the running state
  - initial value is `false`

### Global Player Data

The interaction state also includes:

```js
{
  playerIdleDelinquents: 10,
  cash: 0,
  influence: 0,
  needsStarterBuilding: true,
  playerStarterBuildingId: null,
  gameOver: false
}
```

`playerIdleDelinquents` is a global player pool shared across buildings. Assigning delinquents to a building removes them from the idle pool. Returning delinquents from a building adds them back to the idle pool.

`cash` is a global player resource used to purchase the running state for buildings and is also generated passively by controlled non-running buildings.

`influence` is a global player resource generated passively by running buildings.

`needsStarterBuilding` is a one-time startup flag that allows the player to choose an initial building anywhere on the map before normal rules begin.

`playerStarterBuildingId` stores the id of the one starter building chosen at the beginning of the run. It remains set for the rest of that run unless the player starts over.

`gameOver` tracks whether the run has been lost and the game-over overlay should be shown.

## Delinquent Manager

Delinquent assignment rules should live in a separate delinquent manager module rather than in the generic building state module.

This manager is responsible for:
- reading the selected building
- assigning one delinquent from the idle pool to the selected building
- returning one delinquent from the selected building to the idle pool
- enforcing that neither idle nor assigned values can go below `0`

Assignment is always scoped to the currently selected building only. A `+` or `-` action must never affect every building at once.

Assignment is also gated by reachability. The player cannot assign delinquents to arbitrary buildings anywhere on the map.

### Internal Metadata

To support accurate interaction, each building will also retain non-public runtime metadata:

- pixel membership or a region mask for the detected roof
- a separate recolor mask for rendering that may include a thin ring of edge pixels near the roof
- bounding box for efficient drawing and hit checks
- size information such as pixel count

These fields support interaction and rendering but are not part of the required gameplay-facing building schema.

## Detection Flow

### Startup

1. Load `finalmap.png`.
2. Draw it into the hidden analysis canvas.
3. Read image pixel data.
4. Scan all pixels for exact roof-colored regions.
5. Group connected roof pixels into distinct building regions.
6. For each region, generate a building object and runtime metadata.

### Roof Matching

The target roof color is `#A5A095`.

Detection should use exact equality against `#A5A095`. Black border pixels are not part of the roof region and act as separators between buildings.

### Region Definition

A building is defined as one connected cluster of roof-colored pixels. Connectivity should be consistent across the implementation. Four-direction adjacency is the safer default because it avoids diagonally merging neighboring roofs that only touch at corners.

### Position Calculation

`position` is calculated as the centroid of all roof pixels in a region, stored in the same coordinate space as the source image.

### Neighbor Graph

At startup, the system should also derive a static neighbor graph for the detected buildings.

Two buildings count as neighbors if the edge-to-edge gap between their bounding boxes is less than or equal to a fixed map-pixel threshold.

This threshold should be tuned so:
- small roads and narrow gaps can still connect nearby buildings
- large roads and visually distant gaps do not connect buildings

The neighbor graph is built once for the current map and reused during delinquent-assignment checks.

### Recolor Mask

For rendering, each building should also maintain a recolor mask separate from the exact roof mask.

The recolor mask should include:
- the exact detected roof pixels
- the anti-aliased roof-edge pixels between that roof region and the dark border

The recolor mask should be derived by expanding outward from the exact roof pixels only within a local area around that building and stopping at the dark border. It must not be allowed to flood through unrelated non-dark map regions elsewhere on the map.

The recolor mask must not include the true dark building outline. This allows the renderer to clean up faint edge fringes while preserving the original black border.

## Interaction Model

### Click Detection

When the user clicks on the map:

1. Convert the pointer location from displayed coordinates into source-image coordinates.
2. Look up the clicked pixel.
3. Resolve which detected building region contains that pixel.
4. If a region is found, select that building.
5. If no region is found, clear selection.

This model uses the actual detected roof region rather than a rough circle or rectangle, which is important because the buildings are small.

### Hover Feedback

When the pointer moves over a detected building region:

- that specific building changes roof color to `#49473F`
- only the currently hovered building receives this color change
- moving off the building restores its normal map appearance unless it is selected

Hover state is visual feedback only. It does not change building data, ownership, or control values.

### Selection

Only one building can be selected at a time.

### Starter Building Phase

At the start of the game, the player should be in a one-time startup phase while `needsStarterBuilding === true`.

During this phase:
- the player may choose exactly one building anywhere on the map
- clicking that building immediately claims it as the starter building
- store that building id in `playerStarterBuildingId`
- the starter building immediately becomes a running building
- the starter building immediately receives `10` assigned delinquents
- those `10` assigned delinquents do not come out of the idle pool
- the starter building immediately starts at `100%` control
- the normal reachability restriction is bypassed only for this one starter choice
- the normal `Run Building` purchase requirement is bypassed only for this one starter choice

After the starter building is chosen:
- set `needsStarterBuilding = false`
- remove the startup-only exception
- resume all normal reachability, running, and purchase rules

If the starter building later drops below `10` delinquents, it should behave like any other running building and lose running state normally.

The starter building identity itself must still remain remembered through `playerStarterBuildingId`, even if that building later stops running or loses control.

### Starter Marker

The starter building should always be visually identifiable on the map.

The renderer should draw a small white dot at the center of the building referenced by `playerStarterBuildingId`.

Rules:
- the dot remains visible for the entire run
- the dot stays on that same building even if it later stops running
- the dot stays on that same building even if it later loses control
- the dot is removed only when the player starts over and a new run begins

When selected:
- the building is highlighted visually on the overlay
- the UI panel displays its `id`
- the UI panel displays its `owner`
- the UI panel displays its current `control` percentage
- the UI panel displays its `playerAssignedDelinquents`
- the delinquent `+` and `-` buttons are visible for that selected building
- the `Run Building` button is visible only if the selected building is not already running

When no building is selected:
- no highlight is rendered
- the info panel shows an empty or placeholder state
- delinquent `+` and `-` buttons are hidden
- the `Run Building` button is hidden

## Control Update System

### Passive Growth Model

Control should update continuously on a simple repeating timer or animation loop. Each building's control is updated independently from the others.

Each building has a derived control cap:
- `controlCap = min(100, playerAssignedDelinquents * 10)`

For each building:
- if `control < controlCap`, that building gains control gradually over time
- more assigned delinquents increase that specific building's growth speed
- if `control > controlCap`, that building decays gradually down toward the cap
- decay speed is always `2.5x` that building's per-building growth basis
- if `playerAssignedDelinquents` is `0`, the building still decays toward `0%`
- control should never overshoot past the current cap in either direction

This means multiple buildings may gain control at the same time, each according to its own assigned delinquent count.

### Selection Relationship

Selection affects what the UI displays, but it does not determine which buildings gain control. Control growth is driven by assigned delinquents on each building, whether or not that building is currently selected.

### Startup Messaging

While `needsStarterBuilding === true`, the HUD should show a short startup instruction such as `Choose your starting building`.

During this startup phase:
- clicking empty map space does not end the phase
- the normal `Run Building` action should be hidden or disabled because the starter-building claim replaces it temporarily

Once the starter building has been claimed, the startup message should be removed and the normal selected-building flow should continue.

### Starter Loss Condition

The starter building is also the run-loss anchor.

If the building referenced by `playerStarterBuildingId` ever drops below `100%` control:
- set `gameOver = true`
- show a game-over overlay
- block normal map interactions and gameplay actions while the overlay is visible

This check should be based specifically on the stored starter-building id, not on whichever building is currently selected and not on whichever building is currently running.

### Start Over

The game-over overlay should include a `Start Over` button.

Pressing `Start Over` should reset the run on the same page without reloading:
- rebuild fresh runtime state from the original detected building data
- restore all buildings to non-running, non-controlled defaults
- clear selection and hover
- reset `cash`, `influence`, and delinquent state to their initial values
- set `needsStarterBuilding = true`
- set `playerStarterBuildingId = null`
- set `gameOver = false`
- remove the game-over overlay

After reset, the player should again be able to choose a new starter building anywhere on the map.

## Delinquent Assignment Controls

### Persistent Display

The UI should always display:
- `Idle Delinquents: X`

### Selected-Building Display

When a building is selected, the UI should also display:
- `Assigned Delinquents: X`

This assigned value belongs only to the selected building object.

### Buttons

When a building is selected, the UI should show two buttons:
- `+`
- `-`

When no building is selected, these buttons should be hidden.

### Button Rules

Pressing `+`:
- only affects the currently selected building
- only works if the selected building is reachable from current territory
- if `playerIdleDelinquents` is greater than `0`
  - decreases `playerIdleDelinquents` by `1`
  - increases the selected building's `playerAssignedDelinquents` by `1`

Pressing `-`:
- only affects the currently selected building
- if the selected building's `playerAssignedDelinquents` is greater than `0`
  - decreases the selected building's `playerAssignedDelinquents` by `1`
  - increases `playerIdleDelinquents` by `1`

### State Constraints

The system must enforce:
- `playerIdleDelinquents` never goes below `0`
- `playerAssignedDelinquents` on any building never goes below `0`
- control cap per building is always `min(100, playerAssignedDelinquents * 10)`

### Reachability Rule

A building is assignable for delinquent placement if either:
- it already has `control > 0`
- or it is a direct neighbor of any building with `control > 0`
- or it is a direct neighbor of any building with `isRunning === true`

Reachability should be recalculated from current building state, while the underlying neighbor graph stays static for the map.

This must behave as a strict one-hop frontier:
- direct neighbors of current territory are assignable
- neighbors-of-neighbors are not assignable
- expansion must proceed one building at a time with no skipping

### UI Feedback For Reachability

The player can still click and inspect any building on the map.

If the selected building is reachable:
- `+` behaves normally

If the selected building is not reachable:
- `+` is disabled
- `-` still works if that building already has assigned delinquents
- the UI should show a short reason such as `Too far from your current territory`

## Cash And Running Buildings

### Persistent Display

The UI should always display:
- `Cash: X (+Y.Y/s)`
- `Influence: X (+Z.Z/s)`

### Run Building Button

When a building is selected, the UI should show a `Run Building` button only if that building is not already running.

The button should be disabled unless all of the following are true:
- the selected building's `control` is `100%`
- the player has at least `2000` cash
- the selected building is not already running

If the selected building is already running, the `Run Building` button should be hidden.

### Purchase Rule

Running a building costs `2000` cash.

When the player activates `Run Building` on an eligible selected building:
- decrease global `cash` by `2000`
- set that building's `isRunning` to `true`
- immediately change that building's roof color to `#854947`

### Minimum Delinquents To Stay Running

A running building must always have at least `10` assigned delinquents.

If a running building drops below `10` assigned delinquents:
- set `isRunning` to `false` immediately
- return the building color immediately to its normal control-based color behavior
- require a new purchase later if the player wants to run that building again

## Passive Resources

For this phase, an "owned/ran" building means a building with `isRunning === true`. There is no separate ownership-system rule attached to passive resources yet.

### Controlled Building Cash

For this phase, a building counts as controlled for passive cash generation if:
- it is not running
- its `control` is greater than `0`

Each controlled non-running building generates cash at this rate:

`5 * (control / 100)` per second

Examples:
- `10%` control -> `0.5` cash per second
- `20%` control -> `1` cash per second
- `60%` control -> `3` cash per second

Because the rule says to round the amount, passive cash should be applied on a 1-second resource tick rather than per animation frame. On each 1-second tick:
- sum the current cash generation from all eligible buildings
- round the total to a whole number
- add that whole number to global `cash`
- clamp `cash` to the current cash cap

### Influence From Running Buildings

Each running building generates `1` influence per second.

Influence should also be applied on the same 1-second resource tick:
- count the current running buildings
- add that count to global `influence`

Influence has no cap in this phase.

### Cash Cap

Cash has a global max cap.

The cap starts at `2000` and increases by `2000` for each running building:

`cashCap = 2000 + (runningBuildingCount * 2000)`

If passive cash would exceed this cap, it should be clamped to the cap instead.

Running buildings increase the cap but do not themselves generate cash.

### Resource Rate Display

The HUD should show the live current passive rates for `cash` and `influence` alongside their values.

Formatting rules:
- append the rate as `(+X.X/s)`
- always round the displayed rate to one decimal place
- display `0.0/s` when the current rate is zero

The displayed cash rate should be the current unrounded live sum of:

`5 * (control / 100)`

across all eligible controlled non-running buildings.

The displayed influence rate should be the current running-building count expressed as a per-second value.

This display is informational only. The underlying passive application logic remains the existing 1-second tick that rounds the summed cash amount before adding it.

## Debug Menu

The HUD should include a small toggle that opens and closes a hidden debug menu.

When closed:
- only the small toggle is visible

When open:
- the debug panel is visible as a compact overlay
- it exposes only global debug controls for:
  - `cash`
  - `influence`
  - `idle delinquents`

Each debug value should have simple `+` and `-` controls that update the underlying state immediately.

The debug menu does not expose per-building controls in this phase.

## Rendering

### Map

The map image remains visually unchanged as the main playfield background.

The rendered map must:
- be centered in the viewport
- scale so its height fills the viewport
- preserve its aspect ratio
- not cause the browser window to scroll

The map should be the primary full-screen surface, with the information UI overlaid rather than reserving a separate page column.

### Starter Marker Rendering

The starter building marker should render as a small white dot centered on the stored starter building's `position`.

The dot should:
- be persistent for the duration of the run
- remain visible independently of selection, hover, control color, or running color
- stay aligned with the map as the map scales to viewport height

It may be rendered on the existing overlay stack or on a dedicated lightweight marker layer, as long as it stays correctly aligned and does not interfere with hover/selection visuals.

### HUD Styling

The left HUD panel should no longer render with an opaque background, border, or blur effect.

It should remain positioned in the same place, but visually behave like transparent overlay text.

To preserve readability against the map and page background:
- the text color should switch to the dark brown tone previously used by the panel background treatment
- buttons may remain visually filled so controls still read as interactive elements

### Control-Driven Roof Color

Each building's roof color should reflect that building's current `control` value.

- `0%` control uses the standard roof color `#A5A095`
- `100%` control uses the target roof color `#B57271`
- values between `0` and `100` interpolate gradually between those two colors

This color transition is per building, so different buildings can show different roof colors at the same time based on their own control percentages.

For performance, the visual transition does not need to repaint every building every frame. The renderer may quantize visible color into cached steps or buckets, as long as the final visible color at `100%` control is exactly `#B57271`.

Color-based rendering should use the building recolor mask rather than the exact roof-only hit mask so anti-aliased roof edges are recolored cleanly.

### Running Building Color

If a building is in the running state, its roof color should immediately switch to `#854947`.

This running color overrides the normal control-based color ramp for as long as `isRunning === true`.

### Highlight

The selected building highlight should follow the detected region shape as closely as practical. The overlay can be implemented by redrawing the building region with a translucent color, outline, or both.

The highlight must be visually clear without obscuring the map.

### Hover Rendering

Hover feedback should recolor the currently hovered building region to `#49473F`. This recolor applies only to the hovered building, not to all buildings sharing the same base roof color.

If a building is both hovered and selected, selected-state rendering should remain visually clear. The implementation can combine the hover recolor with the selected overlay, or prioritize the selected overlay, as long as the hovered selected building still has obvious feedback.

### Game Over Overlay

When `gameOver === true`, a centered overlay should appear above the map and HUD.

The overlay should:
- clearly indicate game over
- contain a `Start Over` button
- visually block normal play interactions until reset

The overlay is intentionally simple in this phase. It does not need scores, animations, or extra menus.

The control-driven roof color should be rendered before hover feedback. Hover remains a temporary feedback state layered on top of the building's current control-based color.

Hover rendering should also use the recolor mask so the same edge-fringe cleanup applies during hover feedback.

### Rendering Performance Model

The renderer should prioritize smooth performance by avoiding full-map redraws every animation frame.

Recommended model:
- draw the static map image once into a base layer
- maintain a persistent building-color layer for roof colors
- track each building's last rendered control color bucket
- repaint only buildings whose visible bucket changed
- keep hover and selection as lightweight overlays on top

This allows control values to continue updating normally while limiting expensive roof repaint work to buildings whose visible color actually changed.

### Data Display

The selected-building panel should display:
- building id
- owner
- control percentage
- idle delinquents
- cash
- influence
- assigned delinquents for the selected building

No other gameplay values are shown in this phase.

## Error Handling

### Image Load Failure

If `finalmap.png` fails to load, the app should present a visible error state rather than silently failing.

### No Buildings Detected

If detection finds zero building regions, the app should show a message indicating that no buildings were found using the configured roof color.

### Invalid Updates

Control updates must guard against:
- `control` values below `0`
- `control` values above `100`
- `control` overshooting above or below the current per-building cap

Delinquent updates must guard against:
- no selected building
- `playerIdleDelinquents` below `0`
- `playerAssignedDelinquents` below `0`

Running-building updates must guard against:
- `cash` going below `0`
- purchasing a building that is already running
- purchasing a building below `100%` control
- purchasing a building without at least `2000` cash

Passive-resource updates must guard against:
- `cash` exceeding the current cash cap
- passive cash being added from running buildings
- passive influence being added from non-running buildings
- debug controls pushing `cash`, `influence`, or `playerIdleDelinquents` below `0`

## Testing Strategy

Testing for this phase is manual.

Required checks:
- the map loads successfully
- building regions are detected from roof color
- the map is centered in the viewport
- the map height fills the viewport
- the browser window does not scroll
- a building at `0` control appears as `#A5A095`
- a building at `100` control appears as `#B57271`
- intermediate control values show intermediate roof colors
- buildings with different control values show different roof colors at the same time
- faint fringe around recolored building edges is reduced or removed
- the dark building border remains visible
- moving the pointer over a building recolors only that building to `#49473F`
- moving the pointer off a building restores its normal color when it is not selected
- clicking a roof selects the expected building
- clicking outside buildings clears selection
- the selected building is highlighted
- the info panel shows the selected building’s control value
- buildings with `0` assigned delinquents do not gain control
- buildings with assigned delinquents gain control gradually over time
- buildings with more assigned delinquents gain control faster than buildings with fewer assigned delinquents
- multiple buildings can gain control at the same time
- `1` delinquent caps a building at `10%`
- `2` delinquents cap a building at `20%`
- `10+` delinquents cap a building at `100%`
- buildings above their current cap decay back down gradually
- decay speed is `2.5x` the building-specific growth basis
- `0` assigned delinquents still decay toward `0%`
- control on each building never overshoots its current cap and never exceeds `100%`
- idle delinquents always display
- cash always displays
- influence always displays
- assigned delinquents display only for the selected building
- delinquent `+` and `-` buttons appear only when a building is selected
- pressing `+` decreases idle by `1` and increases the selected building’s assigned count by `1`
- pressing `-` decreases the selected building’s assigned count by `1` and increases idle by `1`
- idle delinquents never go below `0`
- assigned delinquents on a building never go below `0`
- renderer avoids full-map redraw every frame
- performance is smoother than the uncached full repaint approach
- `Run Building` is hidden when no building is selected
- `Run Building` is visible for a selected non-running building
- `Run Building` is disabled below `100%` control
- `Run Building` is disabled when cash is below `2000`
- purchasing a building subtracts `2000` cash
- a running building uses color `#854947`
- if assigned delinquents drop below `10`, a running building immediately stops running
- after a building stops running, the button becomes available again based on control and cash
- if a building is already running, the `Run Building` button is hidden
- controlled non-running buildings generate passive cash once per second
- passive cash uses `5 * (control / 100)` per eligible building
- the summed passive cash amount is rounded once per 1-second tick before being added
- running buildings do not generate passive cash
- each running building generates `1` influence per second
- cash starts at `0`
- influence starts at `0`
- cash cap starts at `2000`
- each running building increases the cash cap by `2000`
- cash never exceeds the current cash cap
- the debug menu is hidden by default behind a small toggle
- opening the debug menu reveals controls for only cash, influence, and idle delinquents
- debug controls update those three global values immediately
- debug controls never drive those three values below `0`

## Future Extension Points

This design intentionally leaves room for later systems without implementing them now:
- ownership changes driven by control thresholds
- per-building capture rules
- AI interaction
- save/load of building state

These are deferred to keep the current implementation narrowly focused on building interaction and control display.
