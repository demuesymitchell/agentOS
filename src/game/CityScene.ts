import Phaser from 'phaser';
import type { Agent, Room } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const T    = 16;
const BASE = '/assets/tiles/frames/';

// 2x2 grid, rooms share walls, no corridors
const ROOM_W  = 20; // tiles wide per room
const ROOM_H  = 18; // tiles tall per room
const PAD     = 2;  // outer padding tiles
const MAP_COLS = PAD*2 + ROOM_W*2;
const MAP_ROWS = PAD*2 + ROOM_H*2;
// Room slot positions (tile coords, top-left of each room)
function slotPos(col: number, row: number) {
  return { x: PAD + col*ROOM_W, y: PAD + row*ROOM_H };
}

// All 25 character models
export const ALL_CHARS = [
  'angel','big_demon','big_zombie','chort','doc',
  'dwarf_f','dwarf_m','elf_f','elf_m','goblin',
  'imp','knight_f','knight_m','lizard_f','lizard_m',
  'masked_orc','ogre','orc_shaman','orc_warrior','pumpkin_dude',
  'skelet','tiny_zombie','wizzard_f','wizzard_m','wogol',
];
const BIG_CHARS = new Set(['big_demon','big_zombie','ogre']);

// Room themes
interface Theme {
  floors:  string[];
  banner:  string;
  torch:   number; // glow color
  props:   string[];
}
const THEMES: Record<string, Theme> = {
  management: {
    floors: ['floor_1','floor_2','floor_3'],
    banner: 'wall_banner_red',
    torch:  0xffcc44,
    props:  ['fountain_red','chest_full','column_pair','wall_hole'],
  },
  media: {
    floors: ['floor_4','floor_5','floor_2'],
    banner: 'wall_banner_blue',
    torch:  0x8844ff,
    props:  ['fountain_blue','flask_cluster','wall_goo_pair'],
  },
  factory: {
    floors: ['floor_6','floor_7','floor_8'],
    banner: 'wall_banner_yellow',
    torch:  0xff6600,
    props:  ['crate_row','skull_center','chest_empty'],
  },
  research: {
    floors: ['floor_3','floor_4','floor_1'],
    banner: 'wall_banner_green',
    torch:  0x44ff88,
    props:  ['fountain_blue','flask_row','floor_ladder_center'],
  },
};
function getTheme(room: Room): Theme {
  const n = room.name.toLowerCase();
  if (n.includes('manage') || n.includes('command') || n.includes('throne')) return THEMES.management;
  if (n.includes('media')  || n.includes('design')  || n.includes('alchemy')) return THEMES.media;
  if (n.includes('factory')|| n.includes('forge')   || n.includes('smith'))   return THEMES.factory;
  if (n.includes('research')|| n.includes('lab')    || n.includes('library')) return THEMES.research;
  const all = Object.values(THEMES);
  return all[room.name.charCodeAt(0) % all.length];
}

interface AgentSprite {
  id: string; agent: Agent; roomId: string | null;
  body:   Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  label:  Phaser.GameObjects.Text;
  dot:    Phaser.GameObjects.Arc;
  bubble: Phaser.GameObjects.Container | null;
  tx: number; ty: number; idleTimer: number; facing: boolean;
  charKey: string; isBig: boolean;
}

export class CityScene extends Phaser.Scene {
  // Exposed so GameCanvas can read them for resize re-centering
  public readonly MAP_COLS = MAP_COLS;
  public readonly MAP_ROWS = MAP_ROWS;

  private rooms:  Room[]  = [];
  private agents: Agent[] = [];
  private agentSprites: Map<string, AgentSprite> = new Map();
  private onAgentClick?: (id: string) => void;
  private glowGfx!:  Phaser.GameObjects.Graphics;
  private labelGroup: Phaser.GameObjects.Group | null = null;
  private frame = 0;
  private isDragging = false;
  private dragSX = 0; private dragSY = 0;
  private camSX  = 0; private camSY  = 0;
  private wasDragged = false;

  constructor() { super({ key: 'CityScene' }); }

  preload() {
    // Floors
    for (let i = 1; i <= 8; i++) this.load.image(`floor_${i}`, `${BASE}floor_${i}.png`);

    // Walls — all named tiles
    ['wall_top_left','wall_top_mid','wall_top_right',
     'wall_left','wall_mid','wall_right',
     'wall_outer_top_left','wall_outer_top_right',
     'wall_outer_mid_left','wall_outer_mid_right',
     'wall_outer_front_left','wall_outer_front_right',
    ].forEach(t => this.load.image(t, `${BASE}${t}.png`));

    // Doors (keep original sizes: frame_left/right = 16x32, frame_top = 32x16, leaf = 32x32)
    ['doors_frame_left','doors_frame_right','doors_frame_top',
     'doors_leaf_closed','doors_leaf_open',
    ].forEach(t => this.load.image(t, `${BASE}${t}.png`));

    // Decorations
    ['wall_banner_red','wall_banner_blue','wall_banner_green','wall_banner_yellow',
     'wall_fountain_top_1','wall_fountain_top_2',
     'wall_fountain_mid_red_anim_f0','wall_fountain_mid_blue_anim_f0',
     'wall_fountain_basin_red_anim_f0','wall_fountain_basin_blue_anim_f0',
     'chest_full_open_anim_f0','chest_empty_open_anim_f0',
     'crate','skull','column','column_wall',
     'flask_big_blue','flask_big_green','flask_big_red','flask_big_yellow',
     'floor_ladder','wall_hole_1','wall_hole_2','wall_goo','wall_goo_base',
    ].forEach(t => this.load.image(t, `${BASE}${t}.png`));

    // Characters — idle + run, 4 frames each
    ALL_CHARS.forEach(c => {
      for (let i = 0; i < 4; i++) {
        this.load.image(`${c}_idle_${i}`, `${BASE}${c}_idle_anim_f${i}.png`);
        this.load.image(`${c}_run_${i}`,  `${BASE}${c}_run_anim_f${i}.png`);
      }
    });
  }

  create() {
    this.onAgentClick = this.registry.get('onAgentClick');
    this.rooms  = this.positionRooms(this.registry.get('rooms')  || this.defaultRooms());
    this.agents = this.registry.get('agents') || [];

    const W = MAP_COLS * T, H = MAP_ROWS * T;

    // Set generous bounds so you can pan freely in all directions
    this.cameras.main.setBackgroundColor('#050505');
    this.cameras.main.setBounds(-W, -H, W*3, H*3);
    this.cameras.main.setZoom(2.5);

    this.glowGfx = this.add.graphics().setDepth(5);

    this.buildWorld();
    this.syncAgentSprites();
    this.setupDrag();

    // Center on the dungeon — delayed to ensure canvas is sized
    this.time.delayedCall(100, () => this.centerOnDungeon());
  }

  private centerOnDungeon() {
    const W = MAP_COLS * T, H = MAP_ROWS * T;
    this.cameras.main.centerOn(W / 2, H / 2);
  }

  // ─── Room positioning ──────────────────────────────────────────────────────

  private positionRooms(rooms: Room[]): Room[] {
    return rooms.map((room, i) => {
      const col = i % 2, row = Math.floor(i / 2);
      const { x, y } = slotPos(col, row);
      return { ...room, gridX: x, gridY: y, gridW: ROOM_W, gridH: ROOM_H };
    });
  }

  private defaultRooms(): Room[] {
    return [
      { id:'room-management', name:'Management', color:'#00e5ff', icon:'⚙', gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0 },
      { id:'room-media',      name:'Media',      color:'#cc44ff', icon:'🎨',gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0 },
      { id:'room-factory',    name:'Factory',    color:'#ffaa00', icon:'🏭',gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0 },
      { id:'room-research',   name:'Research',   color:'#00ff88', icon:'🔬',gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0 },
    ];
  }

  // ─── World build ───────────────────────────────────────────────────────────

  private buildWorld() {
    // Destroy everything except glow + agents
    this.children.list
      .filter(c => c !== this.glowGfx && (c as any).depth <= 8)
      .forEach(c => c.destroy());

    // Void background
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x050505, 1);
    bg.fillRect(0, 0, MAP_COLS*T, MAP_ROWS*T);

    // Draw each room
    this.rooms.forEach(r => this.drawRoom(r));

    // Room labels
    this.rooms.forEach(r => this.drawLabel(r));

    this.glowGfx = this.add.graphics().setDepth(5);
  }

  // ─── Room drawing ──────────────────────────────────────────────────────────

  private drawRoom(room: Room) {
    const { gridX: rx, gridY: ry, gridW: rw, gridH: rh } = room;
    const theme = getTheme(room);
    const ci = parseInt(room.color.replace('#',''), 16);

    // ── Floor ────────────────────────────────────────────────────────────────
    // Interior floor (inside the walls)
    for (let x = rx+1; x < rx+rw-1; x++) {
      for (let y = ry+2; y < ry+rh-1; y++) {
        const v = (x*7 + y*3 + x*y*2) % theme.floors.length;
        this.img(x, y, theme.floors[v], 1);
      }
    }

    // ── Back wall (top 2 rows) ────────────────────────────────────────────────
    // Row 0: crenellations (top_left, top_mid×n, top_right)
    this.img(rx,       ry, 'wall_top_left',  2);
    for (let x = rx+1; x < rx+rw-1; x++) this.img(x, ry, 'wall_top_mid', 2);
    this.img(rx+rw-1,  ry, 'wall_top_right', 2);

    // Row 1: wall face (outer_top_left, mid×n, outer_top_right)
    this.img(rx,       ry+1, 'wall_outer_top_left',  2);
    for (let x = rx+1; x < rx+rw-1; x++) this.img(x, ry+1, 'wall_mid', 2);
    this.img(rx+rw-1,  ry+1, 'wall_outer_top_right', 2);

    // ── Side walls (rows 2 → rh-2) ────────────────────────────────────────────
    for (let y = ry+2; y < ry+rh-2; y++) {
      this.img(rx,      y, 'wall_left',  2);
      this.img(rx+rw-1, y, 'wall_right', 2);
    }
    // Outer side connectors top + bottom
    this.img(rx,      ry+2,    'wall_outer_mid_left',   2);
    this.img(rx+rw-1, ry+2,    'wall_outer_mid_right',  2);
    this.img(rx,      ry+rh-2, 'wall_outer_front_left', 2);
    this.img(rx+rw-1, ry+rh-2,'wall_outer_front_right',2);

    // ── Front wall (bottom row) ───────────────────────────────────────────────
    // Full bottom wall except door opening
    const doorX = rx + Math.floor(rw/2) - 1; // 2 tiles wide door, centered
    for (let x = rx; x < rx+rw; x++) {
      if (x === doorX || x === doorX+1) continue;
      this.img(x, ry+rh-1, 'wall_top_mid', 2);
    }
    // Floor tiles under door opening
    this.img(doorX,   ry+rh-1, theme.floors[0], 1);
    this.img(doorX+1, ry+rh-1, theme.floors[0], 1);

    // ── Door assembly ─────────────────────────────────────────────────────────
    // doors_frame_left/right = 16×32 (2 tiles tall) — place origin at bottom of door
    const dfx = doorX * T + T/2;
    const dfy = (ry + rh - 1) * T; // bottom of front wall row
    this.add.image(dfx,       dfy, 'doors_frame_left')
      .setOrigin(0.5, 1).setDepth(4);
    this.add.image(dfx + T,   dfy, 'doors_frame_right')
      .setOrigin(0.5, 1).setDepth(4);
    // doors_frame_top = 32×16 — sits above the frame
    this.add.image(dfx + T/2, dfy - T*2, 'doors_frame_top')
      .setOrigin(0.5, 0.5).setDepth(4);
    // door leaf (closed) = 32×32
    this.add.image(dfx + T/2, dfy - T/2, 'doors_leaf_closed')
      .setOrigin(0.5, 1).setDepth(4);

    // ── Decorations ───────────────────────────────────────────────────────────
    // Banners on back wall (2 tiles from each corner)
    this.img(rx+2,    ry+1, theme.banner, 3);
    this.img(rx+rw-3, ry+1, theme.banner, 3);

    // Room-specific interior
    this.drawProps(room, theme);

    // ── Neon color border ─────────────────────────────────────────────────────
    const border = this.add.graphics().setDepth(6);
    border.lineStyle(2, ci, 0.8);
    border.strokeRect(rx*T, ry*T, rw*T, rh*T);
    // Corner accents
    const cs = T * 2;
    [[rx,ry],[rx+rw,ry],[rx,ry+rh],[rx+rw,ry+rh]].forEach(([cx,cy]) => {
      const sx = cx===rx?1:-1, sy = cy===ry?1:-1;
      border.lineStyle(3, ci, 1);
      border.lineBetween(cx*T, cy*T, (cx+sx*(cs/T))*T, cy*T);
      border.lineBetween(cx*T, cy*T, cx*T, (cy+sy*(cs/T))*T);
    });
  }

  private drawProps(room: Room, theme: Theme) {
    const { gridX: rx, gridY: ry, gridW: rw, gridH: rh } = room;
    const name = room.name.toLowerCase();
    const cx = rx + Math.floor(rw/2); // center column

    if (name.includes('manage') || name.includes('command')) {
      // Red fountain center-back (3 tiles tall: top→mid→basin)
      this.img(cx, ry+1, 'wall_fountain_top_1',            3);
      this.img(cx, ry+2, 'wall_fountain_mid_red_anim_f0',  3);
      this.img(cx, ry+3, 'wall_fountain_basin_red_anim_f0',3);
      // Columns flanking fountain
      this.imgPx((cx-2)*T + T/2, (ry+1)*T, 'column_wall', 3); // 16×48 — anchored at top
      this.imgPx((cx+2)*T + T/2, (ry+1)*T, 'column_wall', 3);
      // Chests in corners
      this.img(rx+2,    ry+rh-3, 'chest_full_open_anim_f0', 3);
      this.img(rx+rw-3, ry+rh-3, 'chest_full_open_anim_f0', 3);
      // Wall holes
      this.img(rx+1,    ry+3, 'wall_hole_1', 3);
      this.img(rx+rw-2, ry+3, 'wall_hole_2', 3);
    }

    else if (name.includes('media') || name.includes('design') || name.includes('alchemy')) {
      // Blue fountain center-back
      this.img(cx, ry+1, 'wall_fountain_top_2',             3);
      this.img(cx, ry+2, 'wall_fountain_mid_blue_anim_f0',  3);
      this.img(cx, ry+3, 'wall_fountain_basin_blue_anim_f0',3);
      // Flask clusters each side
      this.img(rx+2, ry+4, 'flask_big_blue',   3);
      this.img(rx+3, ry+4, 'flask_big_green',  3);
      this.img(rx+rw-3, ry+4, 'flask_big_red',    3);
      this.img(rx+rw-4, ry+4, 'flask_big_yellow', 3);
      // Goo on walls
      this.img(rx+1,    ry+7, 'wall_goo',      3);
      this.img(rx+1,    ry+8, 'wall_goo_base', 3);
      this.img(rx+rw-2, ry+7, 'wall_goo',      3);
      this.img(rx+rw-2, ry+8, 'wall_goo_base', 3);
    }

    else if (name.includes('factory') || name.includes('forge') || name.includes('smith')) {
      // Crate row across back
      for (let x = rx+2; x < rx+rw-2; x += 3) {
        // crate = 16×24, place at ry+2 to sit on wall face
        this.imgPx((x)*T + T/2, (ry+2)*T, 'crate', 3);
      }
      // Skull center floor
      this.img(cx, ry+rh-4, 'skull', 3);
      // Empty chests sides
      this.img(rx+2,    ry+rh-4, 'chest_empty_open_anim_f0', 3);
      this.img(rx+rw-3, ry+rh-4, 'chest_empty_open_anim_f0', 3);
      // Wall holes industrial
      this.img(rx+1,    ry+4, 'wall_hole_2', 3);
      this.img(rx+rw-2, ry+4, 'wall_hole_1', 3);
    }

    else if (name.includes('research') || name.includes('lab') || name.includes('library')) {
      // Blue fountain one side
      this.img(rx+2, ry+1, 'wall_fountain_top_2',             3);
      this.img(rx+2, ry+2, 'wall_fountain_mid_blue_anim_f0',  3);
      this.img(rx+2, ry+3, 'wall_fountain_basin_blue_anim_f0',3);
      // Flask row other side
      this.img(rx+rw-4, ry+3, 'flask_big_green',  3);
      this.img(rx+rw-3, ry+3, 'flask_big_blue',   3);
      this.img(rx+rw-2, ry+3, 'flask_big_red',    3);
      // Ladder floor hatch
      this.img(cx, ry+rh-4, 'floor_ladder', 3);
      // Wall holes
      this.img(cx-2, ry+2, 'wall_hole_1', 3);
      this.img(cx+2, ry+2, 'wall_hole_2', 3);
    }
  }

  private drawLabel(room: Room) {
    const cx = (room.gridX + room.gridW/2) * T;
    const cy = (room.gridY) * T - 14;
    const count = this.agents.filter(a => a.roomId === room.id).length;

    this.add.text(cx, cy, room.name.toUpperCase(), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize:   '7px',
      color:      room.color,
      backgroundColor: '#00000088',
      padding:    { x:4, y:2 },
    }).setOrigin(0.5, 1).setDepth(12).setResolution(2);

    this.add.text(cx, cy + 11, count > 0 ? `${count} agent${count>1?'s':''}` : 'empty', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize:   '5px',
      color:      count > 0 ? room.color+'cc' : '#555555',
      backgroundColor: '#00000088',
      padding:    { x:3, y:1 },
    }).setOrigin(0.5, 1).setDepth(12).setResolution(2);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  // Place tile by grid coords (centers in tile)
  private img(gx: number, gy: number, key: string, depth: number) {
    this.add.image((gx + 0.5)*T, (gy + 0.5)*T, key)
      .setDepth(depth).setOrigin(0.5, 0.5);
  }

  // Place tile by pixel coords with custom origin
  private imgPx(px: number, py: number, key: string, depth: number) {
    this.add.image(px, py, key).setDepth(depth).setOrigin(0.5, 0);
  }

  // ─── Torch glow ────────────────────────────────────────────────────────────

  private drawGlow() {
    if (!this.glowGfx?.active) return;
    this.glowGfx.clear();
    for (const room of this.rooms) {
      const theme = getTheme(room);
      const { gridX:rx, gridY:ry, gridW:rw } = room;
      // Two subtle torches near the banners (col 2 and col rw-3, row 1)
      [[rx+2, ry+1],[rx+rw-3, ry+1]].forEach(([tx,ty], i) => {
        const f = 0.07 + 0.04 * Math.sin(this.frame * 0.13 + i*1.7 + tx*0.1);
        const px = (tx + 0.5)*T, py = (ty + 0.5)*T;
        this.glowGfx.fillStyle(theme.torch, f);
        this.glowGfx.fillCircle(px, py, T * 2);
        this.glowGfx.fillStyle(0xffffff, f * 0.4);
        this.glowGfx.fillCircle(px, py, T * 0.6);
      });
    }
  }

  // ─── Agents ────────────────────────────────────────────────────────────────

  public syncAgentSprites() {
    const ids = new Set(this.agents.map(a => a.id));

    this.agentSprites.forEach((s, id) => {
      if (!ids.has(id)) {
        s.body.destroy(); s.shadow.destroy(); s.label.destroy(); s.dot.destroy();
        if (s.bubble) s.bubble.destroy();
        this.agentSprites.delete(id);
      }
    });

    for (const agent of this.agents) {
      const room = this.rooms.find(r => r.id === agent.roomId) || null;
      if (this.agentSprites.has(agent.id)) {
        const s = this.agentSprites.get(agent.id)!;
        const prevRoom = s.roomId;
        s.agent = agent; s.roomId = room?.id || null;
        if (room && prevRoom !== room.id) {
          const [nx, ny] = this.randomPosInRoom(room);
          s.body.setPosition(nx, ny); s.tx = nx; s.ty = ny;
        }
      } else if (room) {
        this.spawnSprite(agent, room);
      }
    }
  }

  private randomPosInRoom(room: Room): [number, number] {
    const x = (room.gridX + 2 + Math.random()*(room.gridW-4)) * T;
    const y = (room.gridY + 3 + Math.random()*(room.gridH-5)) * T;
    return [x, y];
  }

  private spawnSprite(agent: Agent, room: Room) {
    const charKey = (agent as any).charModel || 'knight_m';
    const isBig   = BIG_CHARS.has(charKey);
    const [sx, sy] = this.randomPosInRoom(room);

    const shadow = this.add.ellipse(sx, sy+(isBig?14:8), isBig?20:12, isBig?8:5, 0x000000, 0.5).setDepth(7);
    const body   = this.add.image(sx, sy, `${charKey}_idle_0`).setDepth(8).setScale(isBig ? 1 : 1.5);

    body.setInteractive({ useHandCursor: true });
    body.on('pointerdown', () => { this.wasDragged = false; });
    body.on('pointerup',   () => { if (!this.wasDragged && this.onAgentClick) this.onAgentClick(agent.id); });
    body.on('pointerover', () => { body.setScale(isBig?1.3:1.8); this.game.canvas.style.cursor = 'pointer'; });
    body.on('pointerout',  () => { body.setScale(isBig?1:1.5);   this.game.canvas.style.cursor = 'default'; });

    const labelY = sy - (isBig ? 24 : 18);
    const label  = this.add.text(sx, labelY, agent.name, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize:   '4px',
      color:      agent.color,
      backgroundColor: '#00000099',
      padding:    { x:2, y:1 },
    }).setOrigin(0.5, 1).setDepth(10).setResolution(2);

    const dot = this.add.circle(sx+8, sy-(isBig?12:10), 2, 0x4a3820).setDepth(10);

    this.agentSprites.set(agent.id, {
      id: agent.id, agent, roomId: room.id, charKey, isBig,
      body, shadow, label, dot, bubble: null,
      tx: sx, ty: sy, idleTimer: Math.random()*200, facing: true,
    });
  }

  private showBubble(s: AgentSprite, text: string) {
    if (s.bubble) { s.bubble.destroy(); s.bubble = null; }
    const d = text.length > 28 ? text.slice(0,28)+'…' : text;
    const bg = this.add.rectangle(0,0,d.length*5+16,16,0x0a0808,0.95).setDepth(11);
    bg.setStrokeStyle(1, parseInt(s.agent.color.replace('#',''), 16));
    const t = this.add.text(0,0,d,{
      fontFamily:'"Press Start 2P",monospace', fontSize:'4px', color:'#c8b89a',
    }).setOrigin(0.5).setDepth(11).setResolution(2);
    s.bubble = this.add.container(s.body.x, s.body.y-(s.isBig?38:26), [bg,t]).setDepth(11);
    this.time.delayedCall(5000, () => { if(s.bubble){s.bubble.destroy();s.bubble=null;} });
  }

  // ─── Camera drag ───────────────────────────────────────────────────────────

  private setupDrag() {
    const cam = this.cameras.main;

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.wasDragged = false;
      this.dragSX = p.x;
      this.dragSY = p.y;
      // Capture current scroll at the exact moment drag starts
      this.camSX = cam.scrollX;
      this.camSY = cam.scrollY;
    });

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      const dx = p.x - this.dragSX;
      const dy = p.y - this.dragSY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.wasDragged = true;
        // Divide by zoom so drag speed matches visual speed
        cam.setScroll(
          this.camSX - dx / cam.zoom,
          this.camSY - dy / cam.zoom,
        );
        this.game.canvas.style.cursor = 'grabbing';
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.game.canvas.style.cursor = 'default';
    });

    this.input.on('pointerupoutside', () => {
      this.isDragging = false;
      this.game.canvas.style.cursor = 'default';
    });

    // Scroll wheel zoom — zoom toward cursor position
    this.input.on('wheel', (
      p: Phaser.Input.Pointer,
      _go: any, _dx: number, dy: number
    ) => {
      const oldZoom = cam.zoom;
      const newZoom = Phaser.Math.Clamp(oldZoom - dy * 0.001, 0.4, 5);
      cam.setZoom(newZoom);
    });
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  public updateRooms(rooms: Room[]) {
    this.rooms = this.positionRooms(rooms);
    this.buildWorld();
    this.syncAgentSprites();
    this.time.delayedCall(50, () => this.centerOnDungeon());
  }

  public updateAgents(agents: Agent[]) {
    this.agents = agents;
    this.syncAgentSprites();
    agents.forEach(a => {
      const s = this.agentSprites.get(a.id);
      if (!s) return;
      s.agent = a;
      if (a.status==='working' && a.currentTask) this.showBubble(s, a.currentTask);
      else if (a.status==='idle' && s.bubble) { s.bubble.destroy(); s.bubble=null; }
    });
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  update(_t: number, delta: number) {
    this.frame++;
    const dt = delta/1000;
    this.drawGlow();

    const animF = Math.floor(this.frame/8) % 4;
    const SC: Record<string,number> = {
      idle:0x4a3820, working:0xe87830, waiting:0x6090c8, error:0xc83030, offline:0x222233,
    };

    this.agentSprites.forEach(s => {
      s.idleTimer -= delta;
      const room = this.rooms.find(r => r.id === s.roomId);

      if (s.idleTimer <= 0 && room) {
        [s.tx, s.ty] = this.randomPosInRoom(room);
        s.idleTimer = s.agent.status==='working' ? 300+Math.random()*500 : 1200+Math.random()*2500;
      }

      const dx = s.tx-s.body.x, dy = s.ty-s.body.y;
      const dist = Math.sqrt(dx*dx+dy*dy);
      const speed = s.agent.status==='working' ? 55 : 25;
      const sc = s.isBig ? 1 : 1.5;

      if (dist > 3) {
        s.body.x += (dx/dist)*speed*dt;
        s.body.y += (dy/dist)*speed*dt;
        if ((dx>0) !== s.facing) { s.facing=dx>0; s.body.setFlipX(!s.facing); }
        const rk = `${s.charKey}_run_${animF}`;
        s.body.setTexture(this.textures.exists(rk) ? rk : `${s.charKey}_idle_${animF}`);
      } else {
        s.body.setTexture(`${s.charKey}_idle_${animF}`);
      }

      const offY = s.isBig ? 14 : 8;
      s.shadow.setPosition(s.body.x, s.body.y+offY);
      s.label.setPosition(s.body.x,  s.body.y-(s.isBig?24:18));
      s.dot.setPosition(s.body.x+8, s.body.y-(s.isBig?12:10));
      s.dot.setFillStyle(SC[s.agent.status] || 0x4a3820);
      if (s.bubble) s.bubble.setPosition(s.body.x, s.body.y-(s.isBig?38:26));

      s.body.setAlpha(
        s.agent.status==='offline' ? 0.3
        : s.agent.status==='working' ? 0.7+0.3*Math.sin(this.frame*0.15) : 1
      );
      s.body.setScale(sc);
    });
  }
}