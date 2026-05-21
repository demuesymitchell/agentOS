// Factorio/medieval hybrid procedural tileset
// Each tile is 16x16, drawn with detailed pixel art

export const T = 16;

export type TileId =
  | 'floor_metal' | 'floor_metal_dark' | 'floor_stone' | 'floor_grate'
  | 'wall_metal' | 'wall_brick' | 'wall_corner'
  | 'conveyor_h' | 'conveyor_v'
  | 'machine_idle' | 'machine_active'
  | 'server_rack' | 'monitor' | 'desk'
  | 'pipe_h' | 'pipe_v' | 'pipe_cross'
  | 'crate' | 'barrel'
  | 'door_open' | 'rug_center' | 'rug_edge'
  | 'circuit_h' | 'circuit_v';

// Palette: Factorio dark industrial
export const PAL = {
  // Metals
  metal1: '#2a2d35', metal2: '#383c47', metal3: '#4a4f5c', metal4: '#5c6270',
  metalLight: '#7a8090', metalShine: '#9aa0b0',
  // Accents
  rust: '#6b3a1f', rustLight: '#8b4a2a',
  // Stone
  stone1: '#2d2a25', stone2: '#3d3830', stone3: '#4d4840',
  // Neon per room (set dynamically)
  cyan: '#00e5ff', green: '#00ff88', amber: '#ffaa00', purple: '#cc44ff', red: '#ff4444',
  // UI
  dark: '#050810', void: '#0a0d15',
};

export function createTileCanvas(
  tileId: TileId,
  accentColor: string,
  frame = 0
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = T; canvas.height = T;
  const ctx = canvas.getContext('2d')!;
  drawTile(ctx, tileId, accentColor, frame);
  return canvas;
}

export function drawTile(
  ctx: CanvasRenderingContext2D,
  id: TileId,
  accent: string,
  frame = 0
) {
  ctx.clearRect(0, 0, T, T);
  switch (id) {
    case 'floor_metal':       return drawFloorMetal(ctx, accent);
    case 'floor_metal_dark':  return drawFloorMetalDark(ctx, accent);
    case 'floor_stone':       return drawFloorStone(ctx);
    case 'floor_grate':       return drawFloorGrate(ctx, accent);
    case 'wall_metal':        return drawWallMetal(ctx, accent);
    case 'wall_brick':        return drawWallBrick(ctx, accent);
    case 'conveyor_h':        return drawConveyorH(ctx, accent, frame);
    case 'conveyor_v':        return drawConveyorV(ctx, accent, frame);
    case 'machine_idle':      return drawMachine(ctx, accent, false, frame);
    case 'machine_active':    return drawMachine(ctx, accent, true, frame);
    case 'server_rack':       return drawServerRack(ctx, accent, frame);
    case 'monitor':           return drawMonitor(ctx, accent, frame);
    case 'desk':              return drawDesk(ctx, accent);
    case 'pipe_h':            return drawPipeH(ctx, accent);
    case 'pipe_v':            return drawPipeV(ctx, accent);
    case 'crate':             return drawCrate(ctx, accent);
    case 'circuit_h':         return drawCircuit(ctx, accent, 'h', frame);
    case 'circuit_v':         return drawCircuit(ctx, accent, 'v', frame);
    case 'rug_center':        return drawRug(ctx, accent, 'center');
    case 'rug_edge':          return drawRug(ctx, accent, 'edge');
    default:                  return drawFloorMetal(ctx, accent);
  }
}

// ─── Tile implementations ──────────────────────────────────────────────────────

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
}

function drawFloorMetal(ctx: CanvasRenderingContext2D, accent: string) {
  // Base
  px(ctx, 0, 0, T, T, PAL.metal1);
  // Plate seams
  px(ctx, 0, 7, T, 1, PAL.metal2);
  px(ctx, 7, 0, 1, T, PAL.metal2);
  // Corner rivets
  px(ctx, 1, 1, 2, 2, PAL.metal3);
  px(ctx, 13, 1, 2, 2, PAL.metal3);
  px(ctx, 1, 13, 2, 2, PAL.metal3);
  px(ctx, 13, 13, 2, 2, PAL.metal3);
  // Subtle highlight
  px(ctx, 0, 0, T, 1, PAL.metal2);
  px(ctx, 0, 0, 1, T, PAL.metal2);
}

function drawFloorMetalDark(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, PAL.void);
  px(ctx, 0, 7, T, 1, PAL.metal1);
  px(ctx, 7, 0, 1, T, PAL.metal1);
  // Faint accent glow in center
  ctx.globalAlpha = 0.08;
  px(ctx, 3, 3, 10, 10, accent);
  ctx.globalAlpha = 1;
}

function drawFloorStone(ctx: CanvasRenderingContext2D) {
  px(ctx, 0, 0, T, T, PAL.stone1);
  // Stone pattern
  px(ctx, 0, 0, 7, 4, PAL.stone2);
  px(ctx, 8, 0, 8, 4, PAL.stone3);
  px(ctx, 0, 5, 5, 4, PAL.stone3);
  px(ctx, 6, 5, 10, 4, PAL.stone2);
  px(ctx, 0, 10, 8, 6, PAL.stone2);
  px(ctx, 9, 10, 7, 6, PAL.stone3);
  // Mortar lines
  px(ctx, 0, 4, T, 1, PAL.stone1);
  px(ctx, 0, 9, T, 1, PAL.stone1);
  px(ctx, 5, 0, 1, 4, PAL.stone1);
  px(ctx, 5, 5, 1, 4, PAL.stone1);
}

function drawFloorGrate(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, PAL.metal1);
  // Grate pattern
  for (let i = 0; i < T; i += 4) {
    px(ctx, i, 0, 1, T, PAL.metal3);
    px(ctx, 0, i, T, 1, PAL.metal3);
  }
  // Glow underneath
  ctx.globalAlpha = 0.15;
  px(ctx, 1, 1, T - 2, T - 2, accent);
  ctx.globalAlpha = 1;
}

function drawWallMetal(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, PAL.metal2);
  // Panel lines
  px(ctx, 0, 0, T, 2, PAL.metal3);
  px(ctx, 0, T - 2, T, 2, PAL.metal1);
  px(ctx, 0, 4, T, 1, PAL.metal1);
  px(ctx, 0, 9, T, 1, PAL.metal1);
  // Rivet strip
  for (let i = 2; i < T; i += 5) {
    px(ctx, i, 1, 2, 2, PAL.metalShine);
  }
  // Neon trim at top
  ctx.globalAlpha = 0.7;
  px(ctx, 0, 0, T, 1, accent);
  ctx.globalAlpha = 1;
}

function drawWallBrick(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, PAL.stone2);
  // Brick rows
  const rows = [0, 5, 10];
  rows.forEach((y, i) => {
    const offset = i % 2 === 0 ? 0 : 4;
    for (let x = -2; x < T; x += 8) {
      px(ctx, x + offset + 1, y + 1, 6, 3, PAL.stone3);
    }
  });
  // Mortar
  px(ctx, 0, 5, T, 1, PAL.stone1);
  px(ctx, 0, 10, T, 1, PAL.stone1);
  // Top glow
  ctx.globalAlpha = 0.5;
  px(ctx, 0, 0, T, 1, accent);
  ctx.globalAlpha = 1;
}

function drawConveyorH(ctx: CanvasRenderingContext2D, accent: string, frame: number) {
  px(ctx, 0, 0, T, T, PAL.metal1);
  // Track
  px(ctx, 0, 2, T, T - 4, PAL.metal2);
  px(ctx, 0, 2, T, 2, PAL.metal3);
  px(ctx, 0, T - 4, T, 2, PAL.metal3);
  // Moving belt segments
  const offset = (frame * 1.5) % 8;
  ctx.globalAlpha = 0.8;
  for (let x = -8; x < T + 8; x += 8) {
    const bx = ((x + offset) % (T + 8)) - 4;
    ctx.fillStyle = accent;
    ctx.fillRect(bx, 5, 5, T - 10);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, 5, 1, T - 10);
    ctx.globalAlpha = 0.8;
  }
  ctx.globalAlpha = 1;
  // Arrow indicator
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(6, T / 2 - 2);
  ctx.lineTo(10, T / 2);
  ctx.lineTo(6, T / 2 + 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawConveyorV(ctx: CanvasRenderingContext2D, accent: string, frame: number) {
  px(ctx, 0, 0, T, T, PAL.metal1);
  px(ctx, 2, 0, T - 4, T, PAL.metal2);
  px(ctx, 2, 0, 2, T, PAL.metal3);
  px(ctx, T - 4, 0, 2, T, PAL.metal3);
  const offset = (frame * 1.5) % 8;
  ctx.globalAlpha = 0.8;
  for (let y = -8; y < T + 8; y += 8) {
    const by = ((y + offset) % (T + 8)) - 4;
    ctx.fillStyle = accent;
    ctx.fillRect(5, by, T - 10, 5);
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(5, by, T - 10, 1);
    ctx.globalAlpha = 0.8;
  }
  ctx.globalAlpha = 1;
}

function drawMachine(ctx: CanvasRenderingContext2D, accent: string, active: boolean, frame: number) {
  px(ctx, 0, 0, T, T, PAL.metal2);
  px(ctx, 1, 1, T - 2, T - 2, PAL.metal3);
  // Vents top
  for (let i = 2; i < T - 2; i += 3) {
    px(ctx, i, 2, 2, 3, PAL.metal1);
  }
  // Main body
  px(ctx, 3, 6, T - 6, T - 8, PAL.metal1);
  // Active indicator
  const pulse = active ? (0.5 + 0.5 * Math.sin(frame * 0.15)) : 0.15;
  ctx.globalAlpha = pulse;
  px(ctx, 4, 7, T - 8, T - 10, accent);
  ctx.globalAlpha = 1;
  // Status light
  ctx.fillStyle = active ? accent : PAL.metal3;
  ctx.globalAlpha = active ? (0.7 + 0.3 * Math.sin(frame * 0.2)) : 0.4;
  ctx.fillRect(T - 4, 2, 3, 3);
  ctx.globalAlpha = 1;
}

function drawServerRack(ctx: CanvasRenderingContext2D, accent: string, frame: number) {
  px(ctx, 0, 0, T, T, PAL.metal1);
  px(ctx, 1, 1, T - 2, T - 2, PAL.metal2);
  // Rack units
  for (let i = 0; i < 4; i++) {
    px(ctx, 2, 2 + i * 3 + i, T - 4, 3, PAL.metal3);
    const on = (frame + i * 12) % 35 < 25;
    ctx.fillStyle = on ? accent : '#1a1a1a';
    ctx.globalAlpha = on ? 0.9 : 0.3;
    ctx.fillRect(T - 5, 3 + i * 4, 2, 2);
    ctx.globalAlpha = 1;
  }
  // LED strip
  ctx.globalAlpha = 0.4;
  px(ctx, 1, T - 3, T - 2, 2, accent);
  ctx.globalAlpha = 1;
}

function drawMonitor(ctx: CanvasRenderingContext2D, accent: string, frame: number) {
  px(ctx, 0, 0, T, T, 'transparent');
  // Stand
  px(ctx, 6, 12, 4, 4, PAL.metal2);
  px(ctx, 4, T - 2, 8, 2, PAL.metal3);
  // Screen body
  px(ctx, 1, 1, T - 2, 11, PAL.metal2);
  // Screen
  px(ctx, 2, 2, T - 4, 9, '#050810');
  // Content
  const p = 0.4 + 0.6 * Math.abs(Math.sin(frame * 0.04));
  ctx.globalAlpha = p;
  px(ctx, 3, 3, T - 6, 7, accent);
  ctx.globalAlpha = 0.6;
  px(ctx, 4, 4, 5, 1, '#ffffff');
  px(ctx, 4, 6, 7, 1, '#ffffff');
  px(ctx, 4, 8, 4, 1, '#ffffff');
  ctx.globalAlpha = 1;
}

function drawDesk(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, 'transparent');
  // Desk surface
  px(ctx, 0, 4, T, T - 4, PAL.metal2);
  px(ctx, 0, 4, T, 2, PAL.metal3);
  // Legs
  px(ctx, 1, T - 4, 3, 4, PAL.metal1);
  px(ctx, T - 4, T - 4, 3, 4, PAL.metal1);
  // Edge trim
  ctx.globalAlpha = 0.4;
  px(ctx, 0, 4, T, 1, accent);
  ctx.globalAlpha = 1;
}

function drawPipeH(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, 'transparent');
  px(ctx, 0, 5, T, 6, PAL.metal3);
  px(ctx, 0, 5, T, 1, PAL.metalShine);
  px(ctx, 0, 10, T, 1, PAL.metal1);
  ctx.globalAlpha = 0.2;
  px(ctx, 0, 6, T, 4, accent);
  ctx.globalAlpha = 1;
}

function drawPipeV(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 0, 0, T, T, 'transparent');
  px(ctx, 5, 0, 6, T, PAL.metal3);
  px(ctx, 5, 0, 1, T, PAL.metalShine);
  px(ctx, 10, 0, 1, T, PAL.metal1);
  ctx.globalAlpha = 0.2;
  px(ctx, 6, 0, 4, T, accent);
  ctx.globalAlpha = 1;
}

function drawCrate(ctx: CanvasRenderingContext2D, accent: string) {
  px(ctx, 1, 3, T - 2, T - 4, PAL.rust);
  px(ctx, 1, 3, T - 2, 2, PAL.rustLight);
  // Slats
  px(ctx, 1, 7, T - 2, 1, PAL.metal1);
  px(ctx, 1, 11, T - 2, 1, PAL.metal1);
  // Corner iron
  px(ctx, 1, 3, 2, T - 4, PAL.metal3);
  px(ctx, T - 3, 3, 2, T - 4, PAL.metal3);
  // Label
  ctx.globalAlpha = 0.5;
  px(ctx, 5, 5, 6, 5, accent);
  ctx.globalAlpha = 1;
}

function drawCircuit(ctx: CanvasRenderingContext2D, accent: string, dir: 'h' | 'v', frame: number) {
  px(ctx, 0, 0, T, T, PAL.void);
  if (dir === 'h') {
    px(ctx, 0, 7, T, 2, PAL.metal2);
    const offset = (frame * 2) % T;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = accent;
    ctx.fillRect((offset) % T, 7, 3, 2);
    ctx.fillRect((offset + 8) % T, 7, 3, 2);
    ctx.globalAlpha = 0.2;
    px(ctx, 0, 7, T, 2, accent);
    ctx.globalAlpha = 1;
  } else {
    px(ctx, 7, 0, 2, T, PAL.metal2);
    const offset = (frame * 2) % T;
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = accent;
    ctx.fillRect(7, (offset) % T, 2, 3);
    ctx.fillRect(7, (offset + 8) % T, 2, 3);
    ctx.globalAlpha = 0.2;
    px(ctx, 7, 0, 2, T, accent);
    ctx.globalAlpha = 1;
  }
}

function drawRug(ctx: CanvasRenderingContext2D, accent: string, type: 'center' | 'edge') {
  const base = accent + '22';
  px(ctx, 0, 0, T, T, base);
  if (type === 'center') {
    ctx.globalAlpha = 0.15;
    px(ctx, 3, 3, T - 6, T - 6, accent);
    ctx.globalAlpha = 1;
  } else {
    ctx.globalAlpha = 0.4;
    px(ctx, 0, 0, T, 2, accent);
    ctx.globalAlpha = 1;
  }
}
