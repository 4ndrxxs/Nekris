'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { LevelData, Point, CellType } from '@nekris/engine';
import Cell from './Cell';

interface GridProps {
  level: LevelData;
  path: Point[];
  collectedSet: Set<string>;
  isTreatActive: boolean;
  isYarnActive: boolean;
  onCellMouseDown: (p: Point) => void;
  onCellMouseEnter: (p: Point) => void;
  scale?: number;
}

export default function Grid({
  level, path, collectedSet, isTreatActive, isYarnActive,
  onCellMouseDown, onCellMouseEnter, scale = 1,
}: GridProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
  const [hasAppeared, setHasAppeared] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onCellMouseDown, onCellMouseEnter });
  callbacksRef.current = { onCellMouseDown, onCellMouseEnter };

  useEffect(() => {
    const update = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Native touch events with { passive: false } to reliably prevent scroll
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const resolveCell = (touch: Touch) => {
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = target?.closest('[data-cell-x]') as HTMLElement | null;
      if (!cell) return null;
      return {
        x: parseInt(cell.getAttribute('data-cell-x') || '0', 10),
        y: parseInt(cell.getAttribute('data-cell-y') || '0', 10),
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const p = resolveCell(e.touches[0]);
      if (p) callbacksRef.current.onCellMouseDown(p);
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const p = resolveCell(e.touches[0]);
      if (p) callbacksRef.current.onCellMouseEnter(p);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  // Mark grid as appeared after entrance animation completes
  useEffect(() => {
    const timer = setTimeout(() => setHasAppeared(true), level.width * level.height * 15 + 400);
    return () => clearTimeout(timer);
  }, [level.width, level.height]);

  const { tileSize, gap } = useMemo(() => {
    if (windowSize.width === 0) return { tileSize: 40, gap: 3 };
    const isMobile = windowSize.width < 640;
    const maxDim = Math.max(level.width, level.height);
    // On mobile, use more screen — less header/footer overhead
    const headerOverhead = isMobile ? 180 : 320;
    const horizontalLimit = (windowSize.width * (isMobile ? 0.95 : 0.9) * scale) - 20;
    const verticalLimit = (windowSize.height - headerOverhead) * scale;
    const containerSize = Math.min(horizontalLimit, verticalLimit);
    const ts = Math.floor(containerSize / maxDim);
    const g = Math.max(1, Math.floor(ts / (isMobile ? 14 : 12)));
    return { tileSize: Math.max(ts, 18), gap: g };
  }, [level.width, level.height, windowSize, scale]);

  const getPathIndex = (x: number, y: number) => path.findIndex(p => p.x === x && p.y === y);

  return (
    <div
      ref={gridRef}
      className="relative select-none grid p-2 sm:p-3 rounded-xl animate-grid-glow"
      style={{
        gridTemplateColumns: `repeat(${level.width}, ${tileSize}px)`,
        gridTemplateRows: `repeat(${level.height}, ${tileSize}px)`,
        gap: `${gap}px`,
        touchAction: 'none',
        background: 'rgba(26, 26, 46, 0.5)',
        border: '1px solid rgba(0, 255, 136, 0.08)',
      }}
    >
      {level.grid.map((row, y) =>
        row.map((cellType, x) => {
          const coordKey = `${x},${y}`;
          const pathIndex = getPathIndex(x, y);
          const isActive = cellType === CellType.TREAT ? isTreatActive : cellType === CellType.YARN ? isYarnActive : true;
          const isCollected = collectedSet.has(coordKey) || !isActive;

          const connections = { up: false, down: false, left: false, right: false };
          if (pathIndex !== -1) {
            const neighbors = [path[pathIndex - 1], path[pathIndex + 1]].filter(Boolean);
            for (const n of neighbors) {
              if (n.x === x && n.y === y - 1) connections.up = true;
              if (n.x === x && n.y === y + 1) connections.down = true;
              if (n.x === x - 1 && n.y === y) connections.left = true;
              if (n.x === x + 1 && n.y === y) connections.right = true;
            }
          }

          let headDirection: 'up' | 'down' | 'left' | 'right' = 'right';
          if (pathIndex === path.length - 1 && path.length > 1) {
            const prev = path[path.length - 2];
            if (prev.x < x) headDirection = 'right';
            else if (prev.x > x) headDirection = 'left';
            else if (prev.y < y) headDirection = 'down';
            else headDirection = 'up';
          }

          // Staggered entrance: diagonal wave from top-left
          const entranceDelay = hasAppeared ? 0 : (x + y) * 0.015;

          return (
            <div key={`${x}-${y}`} style={{ width: tileSize, height: tileSize }} data-cell-x={x} data-cell-y={y}>
              <Cell
                type={cellType}
                isInPath={pathIndex !== -1}
                isHead={pathIndex === path.length - 1 && path.length > 0}
                isTail={pathIndex === 0 && path.length > 0}
                isCollected={isCollected}
                connections={connections}
                headDirection={headDirection}
                pathIndex={pathIndex}
                onMouseDown={() => onCellMouseDown({ x, y })}
                onMouseEnter={() => onCellMouseEnter({ x, y })}
                gridEntranceDelay={entranceDelay}
              />
            </div>
          );
        }),
      )}
    </div>
  );
}
