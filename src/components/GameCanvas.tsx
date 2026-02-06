"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  GameState,
  TILE_SIZE,
  Tool,
  Direction,
  BuildingType
} from "../lib/game";

const colors = {
  grid: "#1a2029",
  empty: "#11151b",
  iron: "#2f3a28",
  copper: "#3d2b22",
  belt: "#3c4a5a",
  mine: "#546a7b",
  furnace: "#6b4d3b",
  assembler: "#3b5a4b",
  wireMill: "#3a4f6b",
  hub: "#3f4258",
  chest: "#5a3b5a",
  ironOre: "#7fd36b",
  copperOre: "#e2965a",
  ironPlate: "#d9d0c2",
  copperPlate: "#f2b37a",
  gearItem: "#8fd1ff",
  wireItem: "#7de2ff",
  highlight: "#f6c453"
};

const spriteUrls = {
  tileEmpty: "/assets/tile-empty.svg",
  tileIron: "/assets/tile-iron.svg",
  tileCopper: "/assets/tile-copper.svg",
  belt: "/assets/building-belt.svg",
  mine: "/assets/building-mine.svg",
  furnace: "/assets/building-furnace.svg",
  assembler: "/assets/building-assembler.svg",
  wireMill: "/assets/building-wire-mill.svg",
  hub: "/assets/building-hub.svg",
  chest: "/assets/building-chest.svg",
  ironOre: "/assets/item-iron-ore.svg",
  copperOre: "/assets/item-copper-ore.svg",
  ironPlate: "/assets/item-iron-plate.svg",
  copperPlate: "/assets/item-copper-plate.svg",
  gearItem: "/assets/item-gear.svg",
  wireItem: "/assets/item-wire.svg"
};

type Props = {
  state: GameState;
  activeTool: Tool;
  activeDir: Direction;
  onPlace: (x: number, y: number) => void;
  onErase: (x: number, y: number) => void;
};

export default function GameCanvas({
  state,
  activeTool,
  activeDir,
  onPlace,
  onErase
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<Record<string, HTMLImageElement>>({});
  const [spritesReady, setSpritesReady] = useState(false);

  const widthPx = useMemo(() => state.width * TILE_SIZE, [state.width]);
  const heightPx = useMemo(() => state.height * TILE_SIZE, [state.height]);

  useEffect(() => {
    let loaded = 0;
    const keys = Object.keys(spriteUrls) as (keyof typeof spriteUrls)[];
    keys.forEach((key) => {
      const img = new Image();
      img.src = spriteUrls[key];
      const markLoaded = () => {
        loaded += 1;
        if (loaded === keys.length) {
          setSpritesReady(true);
        }
      };
      img.onload = markLoaded;
      img.onerror = markLoaded;
      spritesRef.current[key] = img;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, widthPx, heightPx);

    for (let y = 0; y < state.height; y += 1) {
      for (let x = 0; x < state.width; x += 1) {
        const tile = state.tiles[y][x];
        const xPos = x * TILE_SIZE;
        const yPos = y * TILE_SIZE;

        if (spritesReady) {
          const sprite =
            tile.terrain === "iron"
              ? spritesRef.current.tileIron
              : tile.terrain === "copper"
                ? spritesRef.current.tileCopper
                : spritesRef.current.tileEmpty;
          if (sprite) {
            ctx.drawImage(sprite, xPos, yPos, TILE_SIZE, TILE_SIZE);
          }
        } else {
          ctx.fillStyle =
            tile.terrain === "iron"
              ? colors.iron
              : tile.terrain === "copper"
                ? colors.copper
                : colors.empty;
          ctx.fillRect(xPos, yPos, TILE_SIZE, TILE_SIZE);
        }

        ctx.strokeStyle = colors.grid;
        ctx.strokeRect(xPos, yPos, TILE_SIZE, TILE_SIZE);

        const building = tile.building;
        if (building) {
          drawBuilding(
            ctx,
            xPos,
            yPos,
            building.type,
            building.dir,
            spritesReady ? spritesRef.current : null
          );
        }

        const item = state.items[y][x];
        if (item) {
          if (spritesReady) {
            const sprite =
              item.type === "iron-ore"
                ? spritesRef.current.ironOre
                : item.type === "copper-ore"
                  ? spritesRef.current.copperOre
                  : item.type === "iron-plate"
                    ? spritesRef.current.ironPlate
                    : item.type === "copper-plate"
                      ? spritesRef.current.copperPlate
                      : item.type === "wire"
                        ? spritesRef.current.wireItem
                        : spritesRef.current.gearItem;
            if (sprite) {
              const size = TILE_SIZE * 0.6;
              ctx.drawImage(
                sprite,
                xPos + (TILE_SIZE - size) / 2,
                yPos + (TILE_SIZE - size) / 2,
                size,
                size
              );
            }
          } else {
            ctx.fillStyle =
              item.type === "iron-ore"
                ? colors.ironOre
                : item.type === "copper-ore"
                  ? colors.copperOre
                  : item.type === "iron-plate"
                    ? colors.ironPlate
                    : item.type === "copper-plate"
                      ? colors.copperPlate
                      : item.type === "wire"
                        ? colors.wireItem
                        : colors.gearItem;
            ctx.beginPath();
            ctx.arc(
              xPos + TILE_SIZE / 2,
              yPos + TILE_SIZE / 2,
              TILE_SIZE / 6,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
    }
  }, [state, widthPx, heightPx, spritesReady]);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
    if (activeTool === "erase") {
      onErase(x, y);
    } else {
      onPlace(x, y);
    }
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((event.clientY - rect.top) / TILE_SIZE);
    onErase(x, y);
  }

  return (
    <div className="canvas-card">
      <canvas
        ref={canvasRef}
        width={widthPx}
        height={heightPx}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      />
      <div
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none"
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: widthPx,
          height: heightPx,
          pointerEvents: "none",
          border: `1px solid ${colors.grid}`
        }}
      />
    </div>
  );
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  type: BuildingType,
  dir: Direction,
  sprites: Record<string, HTMLImageElement> | null
) {
  const inset = TILE_SIZE * 0.15;
  ctx.save();

  switch (type) {
    case "belt":
      if (sprites?.belt) {
        drawRotatedSprite(ctx, sprites.belt, x, y, dir);
      } else {
        ctx.fillStyle = colors.belt;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const [cx, cy] = [x + TILE_SIZE / 2, y + TILE_SIZE / 2];
        const arrow = arrowVector(dir, TILE_SIZE * 0.25);
        ctx.moveTo(cx - arrow[0], cy - arrow[1]);
        ctx.lineTo(cx + arrow[0], cy + arrow[1]);
        ctx.stroke();
      }
      break;
    case "mine":
      if (sprites?.mine) {
        ctx.drawImage(sprites.mine, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = colors.mine;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.fillStyle = colors.highlight;
        ctx.fillRect(
          x + TILE_SIZE * 0.35,
          y + TILE_SIZE * 0.35,
          TILE_SIZE * 0.3,
          TILE_SIZE * 0.3
        );
      }
      break;
    case "furnace":
      if (sprites?.furnace) {
        ctx.drawImage(sprites.furnace, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = colors.furnace;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.fillStyle = "#f6c453";
        ctx.beginPath();
        ctx.arc(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          TILE_SIZE * 0.18,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      break;
    case "assembler":
      if (sprites?.assembler) {
        ctx.drawImage(sprites.assembler, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = colors.assembler;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          TILE_SIZE * 0.18,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      break;
    case "wire-mill":
      if (sprites?.wireMill) {
        ctx.drawImage(sprites.wireMill, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = colors.wireMill;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + TILE_SIZE * 0.3, y + TILE_SIZE * 0.3);
        ctx.lineTo(x + TILE_SIZE * 0.7, y + TILE_SIZE * 0.7);
        ctx.moveTo(x + TILE_SIZE * 0.7, y + TILE_SIZE * 0.3);
        ctx.lineTo(x + TILE_SIZE * 0.3, y + TILE_SIZE * 0.7);
        ctx.stroke();
      }
      break;
    case "hub":
      if (sprites?.hub) {
        ctx.drawImage(sprites.hub, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = colors.hub;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.strokeStyle = colors.highlight;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
          x + TILE_SIZE / 2,
          y + TILE_SIZE / 2,
          TILE_SIZE * 0.2,
          0,
          Math.PI * 2
        );
        ctx.stroke();
      }
      break;
    case "chest":
      if (sprites?.chest) {
        ctx.drawImage(sprites.chest, x, y, TILE_SIZE, TILE_SIZE);
      } else {
        ctx.fillStyle = colors.chest;
        ctx.fillRect(x + inset, y + inset, TILE_SIZE - inset * 2, TILE_SIZE - inset * 2);
        ctx.strokeStyle = "#d9d0c2";
        ctx.strokeRect(
          x + TILE_SIZE * 0.3,
          y + TILE_SIZE * 0.3,
          TILE_SIZE * 0.4,
          TILE_SIZE * 0.4
        );
      }
      break;
  }

  ctx.restore();
}

function arrowVector(dir: Direction, magnitude: number): [number, number] {
  switch (dir) {
    case "up":
      return [0, -magnitude];
    case "right":
      return [magnitude, 0];
    case "down":
      return [0, magnitude];
    case "left":
      return [-magnitude, 0];
  }
}

function drawRotatedSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  x: number,
  y: number,
  dir: Direction
) {
  const angle = dirToRadians(dir);
  const cx = x + TILE_SIZE / 2;
  const cy = y + TILE_SIZE / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.drawImage(sprite, -TILE_SIZE / 2, -TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
  ctx.restore();
}

function dirToRadians(dir: Direction) {
  switch (dir) {
    case "up":
      return -Math.PI / 2;
    case "right":
      return 0;
    case "down":
      return Math.PI / 2;
    case "left":
      return Math.PI;
  }
}
