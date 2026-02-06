export type Direction = "up" | "right" | "down" | "left";
export type TerrainType = "empty" | "iron" | "copper";
export type BuildingType =
  | "mine"
  | "belt"
  | "furnace"
  | "assembler"
  | "wire-mill"
  | "hub"
  | "chest";
export type ItemType =
  | "iron-ore"
  | "copper-ore"
  | "iron-plate"
  | "copper-plate"
  | "gear"
  | "wire";

export const GRID_WIDTH = 24;
export const GRID_HEIGHT = 24;
export const TILE_SIZE = 28;

const MINE_TICKS = 4;
const FURNACE_TICKS = 6;
const ASSEMBLER_TICKS = 8;
const WIRE_MILL_TICKS = 5;

export type Building = {
  type: BuildingType;
  dir: Direction;
  progress: number;
  buffer: Record<ItemType, number>;
};

export type Tile = {
  terrain: TerrainType;
  resource: number;
  building: Building | null;
};

export type Item = {
  type: ItemType;
};

export type GameState = {
  width: number;
  height: number;
  tick: number;
  tiles: Tile[][];
  items: (Item | null)[][];
  inventory: Record<ItemType, number>;
  stats: {
    ironMined: number;
    copperMined: number;
    ironPlates: number;
    copperPlates: number;
    gearsCrafted: number;
    wiresCrafted: number;
  };
};

export type Tool = BuildingType | "erase";

export const DIRECTIONS: Direction[] = ["up", "right", "down", "left"];

export function nextDir(dir: Direction): Direction {
  const idx = DIRECTIONS.indexOf(dir);
  return DIRECTIONS[(idx + 1) % DIRECTIONS.length];
}

export function createInitialState(
  width = GRID_WIDTH,
  height = GRID_HEIGHT
): GameState {
  const tiles: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      terrain: "empty" as const,
      resource: 0,
      building: null
    }))
  );
  const items: (Item | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null)
  );

  seedResourcePatches(tiles, width, height);

  return {
    width,
    height,
    tick: 0,
    tiles,
    items,
    inventory: createInventory({
      "iron-plate": 16,
      "copper-plate": 8,
      gear: 4,
      wire: 0,
      "iron-ore": 0,
      "copper-ore": 0
    }),
    stats: {
      ironMined: 0,
      copperMined: 0,
      ironPlates: 0,
      copperPlates: 0,
      gearsCrafted: 0,
      wiresCrafted: 0
    }
  };
}

export function normalizeState(state: GameState): GameState {
  const bufferDefaults = createBuffer();
  return {
    width: state.width,
    height: state.height,
    tick: state.tick ?? 0,
    tiles: state.tiles.map((row) =>
      row.map((tile) => ({
        terrain: normalizeTerrain(tile.terrain),
        resource: tile.resource ?? (tile.terrain === "empty" ? 0 : 40),
        building: tile.building
          ? {
              type: normalizeBuilding(tile.building.type),
              dir: tile.building.dir,
              progress: tile.building.progress ?? 0,
              buffer: normalizeBuffer(tile.building.buffer ?? bufferDefaults)
            }
          : null
      }))
    ),
    items: state.items.map((row) =>
      row.map((item) => {
        if (!item) return null;
        const type = normalizeItemType(item.type);
        return type ? { type } : null;
      })
    ),
    inventory: normalizeInventory((state as any).inventory ?? {}),
    stats: {
      ironMined: (state.stats as any)?.ironMined ?? (state.stats as any)?.oreMined ?? 0,
      copperMined: (state.stats as any)?.copperMined ?? 0,
      ironPlates: (state.stats as any)?.ironPlates ?? (state.stats as any)?.platesSmelted ?? 0,
      copperPlates: (state.stats as any)?.copperPlates ?? 0,
      gearsCrafted: (state.stats as any)?.gearsCrafted ?? 0,
      wiresCrafted: (state.stats as any)?.wiresCrafted ?? 0
    }
  };
}

function normalizeTerrain(terrain: TerrainType | "ore"):
  | TerrainType
  | "empty" {
  if (terrain === "ore") return "iron";
  return terrain;
}

function normalizeBuilding(
  type: BuildingType | "belt" | "mine" | "furnace" | "assembler" | "hub" | "chest"
) {
  return type;
}

function normalizeItemType(type: ItemType | "ore" | "plate" | "gear"): ItemType | null {
  switch (type) {
    case "ore":
      return "iron-ore";
    case "plate":
      return "iron-plate";
    case "gear":
      return "gear";
    case "iron-ore":
    case "copper-ore":
    case "iron-plate":
    case "copper-plate":
    case "wire":
      return type;
    default:
      return null;
  }
}

function createBuffer(): Record<ItemType, number> {
  return {
    "iron-ore": 0,
    "copper-ore": 0,
    "iron-plate": 0,
    "copper-plate": 0,
    gear: 0,
    wire: 0
  };
}

function createInventory(seed?: Partial<Record<ItemType, number>>) {
  return {
    ...createBuffer(),
    ...(seed ?? {})
  };
}

function normalizeInventory(seed: Partial<Record<ItemType | "ore" | "plate" | "gear", number>>) {
  return normalizeBuffer(seed);
}

function normalizeBuffer(buffer: Partial<Record<ItemType | "ore" | "plate" | "gear", number>>) {
  const next = createBuffer();
  next["iron-ore"] += buffer["iron-ore"] ?? buffer.ore ?? 0;
  next["copper-ore"] += buffer["copper-ore"] ?? 0;
  next["iron-plate"] += buffer["iron-plate"] ?? buffer.plate ?? 0;
  next["copper-plate"] += buffer["copper-plate"] ?? 0;
  next.gear += buffer.gear ?? 0;
  next.wire += buffer.wire ?? 0;
  return next;
}

function seedResourcePatches(tiles: Tile[][], width: number, height: number) {
  seedOre(tiles, width, height, "iron", 4);
  seedOre(tiles, width, height, "copper", 4);
}

function seedOre(tiles: Tile[][], width: number, height: number, terrain: TerrainType, patches: number) {
  for (let i = 0; i < patches; i += 1) {
    const cx = 3 + Math.floor(Math.random() * (width - 6));
    const cy = 3 + Math.floor(Math.random() * (height - 6));
    const radius = 2 + Math.floor(Math.random() * 3);
    const richness = 25 + Math.floor(Math.random() * 25);
    for (let y = -radius; y <= radius; y += 1) {
      for (let x = -radius; x <= radius; x += 1) {
        const dx = cx + x;
        const dy = cy + y;
        if (
          dx >= 0 &&
          dx < width &&
          dy >= 0 &&
          dy < height &&
          Math.hypot(x, y) <= radius + 0.2
        ) {
          tiles[dy][dx].terrain = terrain;
          tiles[dy][dx].resource = richness + Math.floor(Math.random() * 20);
        }
      }
    }
  }
}

export function placeBuilding(
  state: GameState,
  x: number,
  y: number,
  type: Tool,
  dir: Direction
): GameState {
  if (x < 0 || y < 0 || x >= state.width || y >= state.height) return state;
  const next = cloneState(state);
  if (type === "erase") {
    next.tiles[y][x].building = null;
    return next;
  }

  if (!canAffordBuild(next, type)) {
    return state;
  }

  spendBuildCost(next, type);
  next.tiles[y][x].building = {
    type,
    dir,
    progress: 0,
    buffer: createBuffer()
  };

  if (type !== "belt") {
    next.items[y][x] = null;
  }

  return next;
}

export function stepGame(state: GameState): GameState {
  const next = cloneState(state);
  next.tick += 1;

  const width = next.width;
  const height = next.height;

  // Mines and processors.
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const building = next.tiles[y][x].building;
      if (!building) continue;

      if (building.type === "mine") {
        if (next.tiles[y][x].terrain === "empty") continue;
        if (next.tiles[y][x].resource <= 0) continue;
        building.progress += 1;
        if (building.progress >= MINE_TICKS) {
          const [nx, ny] = stepInDir(x, y, building.dir);
          if (canPlaceItem(next, nx, ny)) {
            const terrain = next.tiles[y][x].terrain;
            const oreType = terrain === "iron" ? "iron-ore" : "copper-ore";
            next.items[ny][nx] = { type: oreType };
            building.progress = 0;
            next.tiles[y][x].resource -= 1;
            if (next.tiles[y][x].resource <= 0) {
              next.tiles[y][x].resource = 0;
              next.tiles[y][x].terrain = "empty";
            }
            if (terrain === "iron") {
              next.stats.ironMined += 1;
            } else {
              next.stats.copperMined += 1;
            }
          }
        }
      }

      if (building.type === "furnace") {
        if (building.buffer["iron-ore"] === 0 && building.buffer["copper-ore"] === 0) {
          const neighbor = findNeighborItemByTypes(next, x, y, ["iron-ore", "copper-ore"]);
          if (neighbor) {
            const [nx, ny] = neighbor;
            const oreType = next.items[ny][nx]?.type;
            if (oreType) {
              next.items[ny][nx] = null;
              building.buffer[oreType] += 1;
              building.progress = 0;
            }
          }
        }

        const oreType =
          building.buffer["iron-ore"] > 0
            ? "iron-ore"
            : building.buffer["copper-ore"] > 0
              ? "copper-ore"
              : null;

        if (oreType) {
          building.progress += 1;
          if (building.progress >= FURNACE_TICKS) {
            const [nx, ny] = stepInDir(x, y, building.dir);
            if (canPlaceItem(next, nx, ny)) {
              const plateType = oreType === "iron-ore" ? "iron-plate" : "copper-plate";
              next.items[ny][nx] = { type: plateType };
              building.buffer[oreType] -= 1;
              building.progress = 0;
              if (plateType === "iron-plate") {
                next.stats.ironPlates += 1;
              } else {
                next.stats.copperPlates += 1;
              }
            }
          }
        }
      }

      if (building.type === "assembler") {
        if (building.buffer["iron-plate"] < 2) {
          const neighbor = findNeighborItem(next, x, y, "iron-plate");
          if (neighbor) {
            const [nx, ny] = neighbor;
            next.items[ny][nx] = null;
            building.buffer["iron-plate"] += 1;
            building.progress = 0;
          }
        }

        if (building.buffer["iron-plate"] >= 2) {
          building.progress += 1;
          if (building.progress >= ASSEMBLER_TICKS) {
            const [nx, ny] = stepInDir(x, y, building.dir);
            if (canPlaceItem(next, nx, ny)) {
              next.items[ny][nx] = { type: "gear" };
              building.buffer["iron-plate"] -= 2;
              building.progress = 0;
              next.stats.gearsCrafted += 1;
            }
          }
        }
      }

      if (building.type === "wire-mill") {
        if (building.buffer["copper-plate"] < 1) {
          const neighbor = findNeighborItem(next, x, y, "copper-plate");
          if (neighbor) {
            const [nx, ny] = neighbor;
            next.items[ny][nx] = null;
            building.buffer["copper-plate"] += 1;
            building.progress = 0;
          }
        }

        if (building.buffer["copper-plate"] >= 1) {
          building.progress += 1;
          if (building.progress >= WIRE_MILL_TICKS) {
            const [nx, ny] = stepInDir(x, y, building.dir);
            if (canPlaceItem(next, nx, ny)) {
              next.items[ny][nx] = { type: "wire" };
              building.buffer["copper-plate"] -= 1;
              building.progress = 0;
              next.stats.wiresCrafted += 1;
            }
          }
        }
      }

      if (building.type === "hub") {
        const neighbor = findNeighborItemAny(next, x, y);
        if (neighbor) {
          const [nx, ny] = neighbor;
          const item = next.items[ny][nx];
          if (item) {
            next.items[ny][nx] = null;
            next.inventory[item.type] += 1;
          }
        }
      }
    }
  }

  // Move items along belts.
  const moved = cloneItemGrid(next.items);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const item = next.items[y][x];
      if (!item) continue;
      const building = next.tiles[y][x].building;
      if (!building || building.type !== "belt") continue;

      const [nx, ny] = stepInDir(x, y, building.dir);
      if (!inBounds(next, nx, ny)) continue;

      const destinationBuilding = next.tiles[ny][nx].building;
      if (destinationBuilding && destinationBuilding.type !== "belt") {
        if (destinationBuilding.type === "chest" || destinationBuilding.type === "hub") {
          next.inventory[item.type] += 1;
          moved[y][x] = null;
        } else if (destinationBuilding.type === "furnace") {
          if (
            (item.type === "iron-ore" || item.type === "copper-ore") &&
            destinationBuilding.buffer["iron-ore"] === 0 &&
            destinationBuilding.buffer["copper-ore"] === 0
          ) {
            destinationBuilding.buffer[item.type] += 1;
            destinationBuilding.progress = 0;
            moved[y][x] = null;
          }
        } else if (destinationBuilding.type === "assembler") {
          if (item.type === "iron-plate" && destinationBuilding.buffer["iron-plate"] < 2) {
            destinationBuilding.buffer["iron-plate"] += 1;
            destinationBuilding.progress = 0;
            moved[y][x] = null;
          }
        } else if (destinationBuilding.type === "wire-mill") {
          if (
            item.type === "copper-plate" &&
            destinationBuilding.buffer["copper-plate"] < 1
          ) {
            destinationBuilding.buffer["copper-plate"] += 1;
            destinationBuilding.progress = 0;
            moved[y][x] = null;
          }
        }
        continue;
      }

      if (moved[ny][nx] == null) {
        moved[ny][nx] = item;
        moved[y][x] = null;
      }
    }
  }

  next.items = moved;
  return next;
}

function findNeighborItem(
  state: GameState,
  x: number,
  y: number,
  type: ItemType
): [number, number] | null {
  for (const dir of DIRECTIONS) {
    const [nx, ny] = stepInDir(x, y, dir);
    if (!inBounds(state, nx, ny)) continue;
    const item = state.items[ny][nx];
    if (item?.type === type) return [nx, ny];
  }
  return null;
}

function findNeighborItemByTypes(
  state: GameState,
  x: number,
  y: number,
  types: ItemType[]
): [number, number] | null {
  for (const dir of DIRECTIONS) {
    const [nx, ny] = stepInDir(x, y, dir);
    if (!inBounds(state, nx, ny)) continue;
    const item = state.items[ny][nx];
    if (item && types.includes(item.type)) return [nx, ny];
  }
  return null;
}

function findNeighborItemAny(state: GameState, x: number, y: number): [number, number] | null {
  for (const dir of DIRECTIONS) {
    const [nx, ny] = stepInDir(x, y, dir);
    if (!inBounds(state, nx, ny)) continue;
    const item = state.items[ny][nx];
    if (item) return [nx, ny];
  }
  return null;
}

function canPlaceItem(state: GameState, x: number, y: number) {
  if (!inBounds(state, x, y)) return false;
  const building = state.tiles[y][x].building;
  if (building && building.type !== "belt") return false;
  return state.items[y][x] == null;
}

export const BUILD_COSTS: Record<BuildingType, Partial<Record<ItemType, number>>> = {
  belt: { "iron-plate": 1 },
  mine: { "iron-plate": 4, gear: 2 },
  furnace: { "iron-plate": 3, "copper-plate": 2 },
  assembler: { "iron-plate": 4, gear: 4 },
  "wire-mill": { "iron-plate": 2, "copper-plate": 3 },
  hub: { "iron-plate": 6, "copper-plate": 4, gear: 2 },
  chest: { "iron-plate": 2 }
};

export function canAffordBuild(state: GameState, type: BuildingType) {
  const cost = BUILD_COSTS[type];
  for (const item of Object.keys(cost) as ItemType[]) {
    const needed = cost[item] ?? 0;
    if (state.inventory[item] < needed) return false;
  }
  return true;
}

function spendBuildCost(state: GameState, type: BuildingType) {
  const cost = BUILD_COSTS[type];
  for (const item of Object.keys(cost) as ItemType[]) {
    const needed = cost[item] ?? 0;
    state.inventory[item] -= needed;
  }
}

function inBounds(state: GameState, x: number, y: number) {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

function stepInDir(x: number, y: number, dir: Direction): [number, number] {
  switch (dir) {
    case "up":
      return [x, y - 1];
    case "right":
      return [x + 1, y];
    case "down":
      return [x, y + 1];
    case "left":
      return [x - 1, y];
  }
}

function cloneState(state: GameState): GameState {
  return {
    width: state.width,
    height: state.height,
    tick: state.tick,
    tiles: state.tiles.map((row) =>
      row.map((tile) => ({
        terrain: tile.terrain,
        resource: tile.resource,
        building: tile.building
          ? {
              type: tile.building.type,
              dir: tile.building.dir,
              progress: tile.building.progress,
              buffer: { ...tile.building.buffer }
            }
          : null
      }))
    ),
    items: cloneItemGrid(state.items),
    inventory: { ...state.inventory },
    stats: { ...state.stats }
  };
}

function cloneItemGrid(items: (Item | null)[][]): (Item | null)[][] {
  return items.map((row) => row.map((item) => (item ? { ...item } : null)));
}
