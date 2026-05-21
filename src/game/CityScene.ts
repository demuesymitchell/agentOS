import Phaser from 'phaser';
import type { Agent, Room } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const T    = 16;
const BASE = '/assets/tiles/frames/';

// Grid layout
const GRID_COLS = 2;
const GRID_ROWS = 2;
const ROOM_W    = 18; // tiles wide
const ROOM_H    = 14; // tiles tall
const HALL_W    = 5;  // corridor tiles between rooms
const PAD       = 4;  // outer padding

const MAP_COLS = PAD*2 + GRID_COLS*ROOM_W + (GRID_COLS-1)*HALL_W;
const MAP_ROWS = PAD*2 + GRID_ROWS*ROOM_H + (GRID_ROWS-1)*HALL_W;

// All 25 character models
export const ALL_CHARS = [
  'angel','big_demon','big_zombie','chort','doc',
  'dwarf_f','dwarf_m','elf_f','elf_m','goblin',
  'imp','knight_f','knight_m','lizard_f','lizard_m',
  'masked_orc','ogre','orc_shaman','orc_warrior','pumpkin_dude',
  'skelet','tiny_zombie','wizzard_f','wizzard_m','wogol',
];

// Big sprites (32x36) — need special handling
const BIG_CHARS = new Set(['big_demon','big_zombie','ogre']);

// Room themes
const THEMES: Record<string,{floors:string[];wallTint:number;ambientColor:number}> = {
  management: { floors:['floor_1','floor_2','floor_3'], wallTint:0xffffff,  ambientColor:0xffcc44 },
  media:      { floors:['floor_4','floor_5','floor_2'], wallTint:0xddccff,  ambientColor:0x8866ff },
  factory:    { floors:['floor_6','floor_7','floor_8'], wallTint:0xffddaa,  ambientColor:0xff8822 },
  research:   { floors:['floor_3','floor_4','floor_1'], wallTint:0xaaffcc,  ambientColor:0x44ffaa },
};
const DEFAULT_THEME = THEMES.management;

function getTheme(room: Room) {
  const n = room.name.toLowerCase();
  if (n.includes('manage')||n.includes('command')) return THEMES.management;
  if (n.includes('media') ||n.includes('design'))  return THEMES.media;
  if (n.includes('factory')||n.includes('forge'))  return THEMES.factory;
  if (n.includes('research')||n.includes('lab'))   return THEMES.research;
  // cycle through themes for custom rooms
  const all = Object.values(THEMES);
  const hash = room.name.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  return all[hash % all.length];
}

function gridToTile(col:number,row:number){
  return { tx: PAD+col*(ROOM_W+HALL_W), ty: PAD+row*(ROOM_H+HALL_W) };
}

interface AgentSprite {
  id:string; agent:Agent; roomId:string|null;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  label:  Phaser.GameObjects.Text;
  dot:    Phaser.GameObjects.Arc;
  bubble: Phaser.GameObjects.Container|null;
  tx:number; ty:number; idleTimer:number; facing:boolean;
  charKey:string; isBig:boolean;
}

export class CityScene extends Phaser.Scene {
  private rooms:  Room[]  = [];
  private agents: Agent[] = [];
  private agentSprites: Map<string,AgentSprite> = new Map();
  private onAgentClick?: (id:string)=>void;
  private worldContainer!: Phaser.GameObjects.Container;
  private glowGfx!: Phaser.GameObjects.Graphics;
  private labelObjs: Phaser.GameObjects.Text[] = [];
  private frame = 0;
  // drag
  private isDragging=false; private dragSX=0; private dragSY=0;
  private camSX=0; private camSY=0; private wasDragged=false;

  constructor(){ super({key:'CityScene'}); }

  preload(){
    // Floor tiles
    ['floor_1','floor_2','floor_3','floor_4','floor_5','floor_6','floor_7','floor_8'].forEach(t=>
      this.load.image(t,`${BASE}${t}.png`));

    // Wall tiles — all named correctly
    ['wall_top_left','wall_top_mid','wall_top_right',
     'wall_left','wall_mid','wall_right',
     'wall_outer_top_left','wall_outer_top_right',
     'wall_outer_mid_left','wall_outer_mid_right',
     'wall_outer_front_left','wall_outer_front_right',
     'wall_edge_top_left','wall_edge_top_right',
     'wall_edge_mid_left','wall_edge_mid_right',
     'wall_edge_bottom_left','wall_edge_bottom_right',
     'wall_edge_left','wall_edge_right',
     'wall_banner_red','wall_banner_blue','wall_banner_green','wall_banner_yellow',
     'wall_hole_1','wall_hole_2',
     'wall_goo','wall_goo_base',
     'wall_fountain_top_1','wall_fountain_top_2','wall_fountain_top_3',
     'wall_fountain_mid_red_anim_f0','wall_fountain_mid_blue_anim_f0',
     'wall_fountain_basin_red_anim_f0','wall_fountain_basin_blue_anim_f0',
    ].forEach(t=>this.load.image(t,`${BASE}${t}.png`));

    // Door tiles
    ['doors_frame_left','doors_frame_right','doors_frame_top',
     'doors_leaf_closed','doors_leaf_open',
    ].forEach(t=>this.load.image(t,`${BASE}${t}.png`));

    // Props
    ['chest_full_open_anim_f0','chest_empty_open_anim_f0',
     'crate','skull','column','column_wall',
     'flask_big_blue','flask_big_green','flask_big_red','flask_big_yellow',
     'floor_ladder','hole','floor_stairs',
    ].forEach(t=>this.load.image(t,`${BASE}${t}.png`));

    // All character sprites (idle + run, 4 frames each)
    ALL_CHARS.forEach(c=>{
      for(let i=0;i<4;i++){
        this.load.image(`${c}_idle_${i}`,`${BASE}${c}_idle_anim_f${i}.png`);
        // run frames (some chars only have idle)
        const runFile = `${BASE}${c}_run_anim_f${i}.png`;
        this.load.image(`${c}_run_${i}`,runFile);
      }
    });
  }

  create(){
    this.onAgentClick = this.registry.get('onAgentClick');
    this.rooms  = this.positionRooms(this.registry.get('rooms')  || this.defaultRooms());
    this.agents = this.registry.get('agents') || [];

    const W = MAP_COLS*T, H = MAP_ROWS*T;
    this.cameras.main.setBackgroundColor('#050505');
    this.cameras.main.setBounds(-W, -H, W*3, H*3);
    this.cameras.main.setZoom(2.5);

    // Build scene
    this.buildScene();
    this.syncAgentSprites();
    this.setupDrag();
    // Center after a short delay to ensure layout is set
    this.time.delayedCall(50, ()=>this.centerCamera());
  }

  private centerCamera(){
    const W = MAP_COLS*T, H = MAP_ROWS*T;
    this.cameras.main.centerOn(W/2, H/2);
  }

  // ─── Positioning ──────────────────────────────────────────────────────────────

  private positionRooms(rooms:Room[]):Room[]{
    return rooms.map((room,i)=>{
      const col=i%GRID_COLS, row=Math.floor(i/GRID_COLS);
      const {tx,ty}=gridToTile(col,row);
      return {...room,gridX:tx,gridY:ty,gridW:ROOM_W,gridH:ROOM_H};
    });
  }

  private defaultRooms():Room[]{
    return [
      {id:'room-management',name:'Management',color:'#00e5ff',icon:'⚙', gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0},
      {id:'room-media',     name:'Media',     color:'#cc44ff',icon:'🎨',gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0},
      {id:'room-factory',   name:'Factory',   color:'#ffaa00',icon:'🏭',gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0},
      {id:'room-research',  name:'Research',  color:'#00ff88',icon:'🔬',gridX:0,gridY:0,gridW:ROOM_W,gridH:ROOM_H,createdAt:0},
    ];
  }

  // ─── Build scene ─────────────────────────────────────────────────────────────

  private buildScene(){
    this.labelObjs.forEach(t=>t.destroy());
    this.labelObjs=[];

    // Dark void background
    const bg = this.add.graphics().setDepth(0);
    bg.fillStyle(0x050505,1);
    bg.fillRect(0,0,MAP_COLS*T,MAP_ROWS*T);

    // Draw each room
    for(const room of this.rooms) this.buildRoom(room);

    // Draw corridors between rooms
    this.buildCorridors();

    // Room labels (rendered as Phaser text, not using canvas scaling)
    for(const room of this.rooms){
      const cx=(room.gridX+room.gridW/2)*T;
      const cy=(room.gridY-1.8)*T;
      // Use bitmap-style rendering at exact pixel size — NO stroke (causes blur)
      const lbl = this.add.text(cx, cy, room.name.toUpperCase(), {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '8px',
        color: room.color,
        padding: {x:4,y:2},
        backgroundColor: '#00000099',
      }).setOrigin(0.5).setDepth(15).setResolution(2);
      this.labelObjs.push(lbl);

      const cnt = this.agents.filter(a=>a.roomId===room.id).length;
      const sub = this.add.text(cx, cy+14,
        cnt>0?`${cnt} agent${cnt>1?'s':''}`: 'empty',{
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '5px',
        color: cnt>0 ? room.color+'cc' : '#555555',
        backgroundColor: '#00000088',
        padding:{x:3,y:1},
      }).setOrigin(0.5).setDepth(15).setResolution(2);
      this.labelObjs.push(sub);
    }

    this.glowGfx = this.add.graphics().setDepth(3);
  }

  // ─── Room building ────────────────────────────────────────────────────────────

  private buildRoom(room:Room){
    const {gridX:rx,gridY:ry,gridW:rw,gridH:rh}=room;
    const theme=getTheme(room);

    // ── Floor ────────────────────────────────────────────────────────────────
    for(let x=rx+1;x<rx+rw-1;x++){
      for(let y=ry+2;y<ry+rh-1;y++){
        const v=(x*3+y*7+x*y)%theme.floors.length;
        this.add.image((x+.5)*T,(y+.5)*T,theme.floors[v]).setDepth(1);
      }
    }

    // ── Back wall (top 2 rows) ────────────────────────────────────────────────
    // Top edge of wall (crenellations)
    this.add.image((rx+.5)*T,(ry+.5)*T,'wall_top_left').setDepth(2).setTint(theme.wallTint);
    for(let x=rx+1;x<rx+rw-1;x++)
      this.add.image((x+.5)*T,(ry+.5)*T,'wall_top_mid').setDepth(2).setTint(theme.wallTint);
    this.add.image((rx+rw-.5)*T,(ry+.5)*T,'wall_top_right').setDepth(2).setTint(theme.wallTint);

    // Wall face row below top
    this.add.image((rx+.5)*T,(ry+1.5)*T,'wall_outer_top_left').setDepth(2).setTint(theme.wallTint);
    for(let x=rx+1;x<rx+rw-1;x++)
      this.add.image((x+.5)*T,(ry+1.5)*T,'wall_mid').setDepth(2).setTint(theme.wallTint);
    this.add.image((rx+rw-.5)*T,(ry+1.5)*T,'wall_outer_top_right').setDepth(2).setTint(theme.wallTint);

    // ── Side walls ────────────────────────────────────────────────────────────
    for(let y=ry+2;y<ry+rh-1;y++){
      this.add.image((rx+.5)*T,(y+.5)*T,'wall_left').setDepth(2).setTint(theme.wallTint);
      this.add.image((rx+rw-.5)*T,(y+.5)*T,'wall_right').setDepth(2).setTint(theme.wallTint);
    }
    // Side wall outer connectors
    this.add.image((rx+.5)*T,(ry+2.5)*T,'wall_outer_mid_left').setDepth(2).setTint(theme.wallTint);
    this.add.image((rx+rw-.5)*T,(ry+2.5)*T,'wall_outer_mid_right').setDepth(2).setTint(theme.wallTint);
    this.add.image((rx+.5)*T,(ry+rh-1.5)*T,'wall_outer_front_left').setDepth(2).setTint(theme.wallTint);
    this.add.image((rx+rw-.5)*T,(ry+rh-1.5)*T,'wall_outer_front_right').setDepth(2).setTint(theme.wallTint);

    // ── Front wall (bottom row) ───────────────────────────────────────────────
    // Door opening center-bottom (2 tiles wide)
    const doorX = rx + Math.floor(rw/2) - 1;
    for(let x=rx;x<rx+rw;x++){
      if(x===doorX||x===doorX+1) continue; // door gap
      this.add.image((x+.5)*T,(ry+rh-.5)*T,'wall_top_mid').setDepth(2).setTint(theme.wallTint);
    }
    // Floor under door opening
    this.add.image((doorX+.5)*T,(ry+rh-.5)*T,theme.floors[0]).setDepth(1);
    this.add.image((doorX+1.5)*T,(ry+rh-.5)*T,theme.floors[0]).setDepth(1);

    // ── Door frame ────────────────────────────────────────────────────────────
    // doors_frame_left/right are 16x32 (2 tiles tall), place at bottom wall
    this.add.image((doorX+.5)*T, (ry+rh-1)*T, 'doors_frame_left')
      .setOrigin(0.5,1).setDepth(4);
    this.add.image((doorX+1.5)*T,(ry+rh-1)*T,'doors_frame_right')
      .setOrigin(0.5,1).setDepth(4);
    // Door top piece (32x16, spans 2 tiles)
    this.add.image((doorX+1)*T,(ry+rh-2.5)*T,'doors_frame_top')
      .setOrigin(0.5,0.5).setDepth(4);
    // Door leaf (closed)
    this.add.image((doorX+1)*T,(ry+rh-1)*T,'doors_leaf_closed')
      .setOrigin(0.5,1).setDepth(4);

    // ── Room-specific decor ───────────────────────────────────────────────────
    this.decorateRoom(room,theme);
  }

  private decorateRoom(room:Room, theme:typeof DEFAULT_THEME){
    const {gridX:rx,gridY:ry,gridW:rw,gridH:rh}=room;
    const n=room.name.toLowerCase();

    // Every room gets banners on the back wall
    this.add.image((rx+2.5)*T,(ry+1.5)*T,
      n.includes('media')?'wall_banner_blue':
      n.includes('factory')?'wall_banner_yellow':
      n.includes('research')?'wall_banner_green':'wall_banner_red'
    ).setDepth(3);
    this.add.image((rx+rw-2.5)*T,(ry+1.5)*T,
      n.includes('media')?'wall_banner_blue':
      n.includes('factory')?'wall_banner_yellow':
      n.includes('research')?'wall_banner_green':'wall_banner_red'
    ).setDepth(3);

    if(n.includes('manage')||n.includes('command')){
      // Red wall fountain center-back
      const cx=rx+Math.floor(rw/2);
      this.add.image((cx+.5)*T,(ry+.5)*T,'wall_fountain_top_1').setDepth(3);
      this.add.image((cx+.5)*T,(ry+1.5)*T,'wall_fountain_mid_red_anim_f0').setDepth(3);
      this.add.image((cx+.5)*T,(ry+2.5)*T,'wall_fountain_basin_red_anim_f0').setDepth(3);
      // Chests and holes for decoration
      this.add.image((rx+3.5)*T,(ry+2.5)*T,'wall_hole_1').setDepth(3);
      this.add.image((rx+rw-3.5)*T,(ry+2.5)*T,'wall_hole_2').setDepth(3);
      this.add.image((rx+2.5)*T,(ry+rh-3.5)*T,'chest_full_open_anim_f0').setDepth(3);
      this.add.image((rx+rw-2.5)*T,(ry+rh-3.5)*T,'chest_full_open_anim_f0').setDepth(3);
    }
    if(n.includes('media')||n.includes('design')){
      // Blue fountain
      const cx=rx+Math.floor(rw/2);
      this.add.image((cx+.5)*T,(ry+.5)*T,'wall_fountain_top_2').setDepth(3);
      this.add.image((cx+.5)*T,(ry+1.5)*T,'wall_fountain_mid_blue_anim_f0').setDepth(3);
      this.add.image((cx+.5)*T,(ry+2.5)*T,'wall_fountain_basin_blue_anim_f0').setDepth(3);
      // Flask decorations
      this.add.image((rx+2.5)*T,(ry+rh-3.5)*T,'flask_big_blue').setDepth(3);
      this.add.image((rx+rw-2.5)*T,(ry+rh-3.5)*T,'flask_big_blue').setDepth(3);
    }
    if(n.includes('factory')||n.includes('forge')){
      // Crate row near top
      for(let x=rx+2;x<rx+rw-2;x+=3)
        this.add.image((x+.5)*T,(ry+3.5)*T,'crate').setDepth(3);
      this.add.image((rx+Math.floor(rw/2)+.5)*T,(ry+rh-3.5)*T,'skull').setDepth(3);
    }
    if(n.includes('research')||n.includes('lab')){
      // Flask cluster
      this.add.image((rx+2.5)*T,(ry+3.5)*T,'flask_big_green').setDepth(3);
      this.add.image((rx+3.5)*T,(ry+3.5)*T,'flask_big_yellow').setDepth(3);
      this.add.image((rx+rw-2.5)*T,(ry+3.5)*T,'flask_big_red').setDepth(3);
      this.add.image((rx+Math.floor(rw/2)+.5)*T,(ry+rh-3.5)*T,'floor_ladder').setDepth(3);
    }
  }

  // ─── Corridors with proper walls ─────────────────────────────────────────────

  private buildCorridors(){
    // Horizontal corridor: top-left ↔ top-right (row 0)
    if(this.rooms.length>=2){
      const r0=this.rooms[0], r1=this.rooms[1];
      const x1=r0.gridX+r0.gridW, x2=r1.gridX;
      const midY=r0.gridY+Math.floor(r0.gridH/2);
      this.buildHCorridor(x1,x2,midY);
    }
    // Horizontal corridor: bottom-left ↔ bottom-right (row 1)
    if(this.rooms.length>=4){
      const r2=this.rooms[2], r3=this.rooms[3];
      const x1=r2.gridX+r2.gridW, x2=r3.gridX;
      const midY=r2.gridY+Math.floor(r2.gridH/2);
      this.buildHCorridor(x1,x2,midY);
    }
    // Vertical corridors: top-left ↔ bottom-left, top-right ↔ bottom-right
    if(this.rooms.length>=3){
      const r0=this.rooms[0], r2=this.rooms[2];
      const midX=r0.gridX+Math.floor(r0.gridW/2);
      const y1=r0.gridY+r0.gridH, y2=r2.gridY;
      this.buildVCorridor(midX,y1,y2);
    }
    if(this.rooms.length>=4){
      const r1=this.rooms[1], r3=this.rooms[3];
      const midX=r1.gridX+Math.floor(r1.gridW/2);
      const y1=r1.gridY+r1.gridH, y2=r3.gridY;
      this.buildVCorridor(midX,y1,y2);
    }
  }

  private buildHCorridor(x1:number,x2:number,midY:number){
    // midY is center tile row
    const floorY=[midY,midY+1]; // 2-tile wide floor
    const wallTop=midY-1, wallBot=midY+2;

    for(let x=x1;x<x2;x++){
      // Floor
      floorY.forEach(y=>this.add.image((x+.5)*T,(y+.5)*T,'floor_2').setDepth(1));
      // Top wall of corridor
      this.add.image((x+.5)*T,(wallTop+.5)*T,'wall_top_mid').setDepth(2);
      this.add.image((x+.5)*T,(wallTop+1.5)*T,'wall_mid').setDepth(2);
      // Bottom wall of corridor
      this.add.image((x+.5)*T,(wallBot+.5)*T,'wall_top_mid').setDepth(2);
    }
  }

  private buildVCorridor(midX:number,y1:number,y2:number){
    const floorX=[midX,midX+1];
    const wallLeft=midX-1, wallRight=midX+2;

    for(let y=y1;y<y2;y++){
      floorX.forEach(x=>this.add.image((x+.5)*T,(y+.5)*T,'floor_2').setDepth(1));
      // Side walls of corridor
      this.add.image((wallLeft+.5)*T,(y+.5)*T,'wall_left').setDepth(2);
      this.add.image((wallRight+.5)*T,(y+.5)*T,'wall_right').setDepth(2);
    }
  }

  // ─── Torch glow (subtle, only at banner positions) ────────────────────────────

  private drawGlow(){
    this.glowGfx.clear();
    for(const room of this.rooms){
      const theme=getTheme(room);
      // Only 2 subtle glows per room — near the banners on the back wall
      const torchX=[room.gridX+2, room.gridX+room.gridW-3];
      torchX.forEach((tx,i)=>{
        const ty=room.gridY+1;
        const f=0.05+0.03*Math.sin(this.frame*0.12+i*1.7);
        const px=(tx+.5)*T, py=(ty+.5)*T;
        this.glowGfx.fillStyle(theme.ambientColor,f);
        this.glowGfx.fillCircle(px,py,T*1.8);
      });
    }
  }

  // ─── Agent sprites ────────────────────────────────────────────────────────────

  public syncAgentSprites(){
    const ids=new Set(this.agents.map(a=>a.id));
    this.agentSprites.forEach((s,id)=>{
      if(!ids.has(id)){
        s.sprite.destroy(); s.shadow.destroy(); s.label.destroy(); s.dot.destroy();
        if(s.bubble){s.bubble.destroy();}
        this.agentSprites.delete(id);
      }
    });
    for(const agent of this.agents){
      const room=this.rooms.find(r=>r.id===agent.roomId)||null;
      if(this.agentSprites.has(agent.id)){
        const s=this.agentSprites.get(agent.id)!;
        const prev=s.roomId;
        s.agent=agent; s.roomId=room?.id||null;
        if(room&&prev!==room.id){
          const nx=(room.gridX+3+Math.random()*(room.gridW-6))*T;
          const ny=(room.gridY+4+Math.random()*(room.gridH-6))*T;
          s.sprite.setPosition(nx,ny); s.tx=nx; s.ty=ny;
        }
      } else if(room){
        this.spawnSprite(agent,room);
      }
    }
  }

  private spawnSprite(agent:Agent,room:Room){
    const charKey = (agent as any).charModel || 'knight_m';
    const isBig   = BIG_CHARS.has(charKey);
    const sx=(room.gridX+3+Math.random()*(room.gridW-6))*T;
    const sy=(room.gridY+4+Math.random()*(room.gridH-7))*T;

    // Shadow
    const sw = isBig?20:12, sh=isBig?8:5;
    const shadow=this.add.ellipse(sx,sy+(isBig?14:7),sw,sh,0x000000,0.5).setDepth(3);

    // Sprite — use image (no spritesheet)
    const sprite=this.add.image(sx,sy,`${charKey}_idle_0`)
      .setDepth(4)
      .setScale(isBig?1:1.5);

    sprite.setInteractive({useHandCursor:true});
    sprite.on('pointerdown',()=>{this.wasDragged=false;});
    sprite.on('pointerup',()=>{if(!this.wasDragged&&this.onAgentClick)this.onAgentClick(agent.id);});
    sprite.on('pointerover',()=>{sprite.setScale(isBig?1.3:1.8);this.game.canvas.style.cursor='pointer';});
    sprite.on('pointerout', ()=>{sprite.setScale(isBig?1:1.5);  this.game.canvas.style.cursor='default';});

    // Name label — small, crisp, no stroke
    const label=this.add.text(sx,sy-(isBig?26:18),agent.name,{
      fontFamily:'"Press Start 2P",monospace',
      fontSize:'4px',
      color:agent.color,
      backgroundColor:'#00000088',
      padding:{x:2,y:1},
    }).setOrigin(0.5,1).setDepth(6).setResolution(2);

    const dot=this.add.circle(sx+8,sy-(isBig?12:10),2,0x4a3820).setDepth(6);

    this.agentSprites.set(agent.id,{
      id:agent.id,agent,roomId:room.id,charKey,isBig,
      sprite,shadow,label,dot,bubble:null,
      tx:sx,ty:sy,idleTimer:Math.random()*200,facing:true,
    });
  }

  private showBubble(s:AgentSprite,text:string){
    if(s.bubble){s.bubble.destroy();s.bubble=null;}
    const d=text.length>26?text.slice(0,26)+'…':text;
    const bg=this.add.rectangle(0,0,d.length*5+14,14,0x0a0808,0.95).setDepth(9);
    bg.setStrokeStyle(1,parseInt(s.agent.color.replace('#',''),16));
    const t=this.add.text(0,0,d,{
      fontFamily:'"Press Start 2P",monospace',fontSize:'4px',color:'#c8b89a',
    }).setOrigin(0.5).setDepth(9).setResolution(2);
    s.bubble=this.add.container(s.sprite.x,s.sprite.y-(s.isBig?40:26),[bg,t]).setDepth(9);
    this.time.delayedCall(5000,()=>{if(s.bubble){s.bubble.destroy();s.bubble=null;}});
  }

  // ─── Camera drag + zoom ───────────────────────────────────────────────────────

  private setupDrag(){
    const cam=this.cameras.main;
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      this.isDragging=true; this.wasDragged=false;
      this.dragSX=p.x; this.dragSY=p.y;
      this.camSX=cam.scrollX; this.camSY=cam.scrollY;
    });
    this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{
      if(!this.isDragging)return;
      const dx=p.x-this.dragSX,dy=p.y-this.dragSY;
      if(Math.abs(dx)>3||Math.abs(dy)>3){
        this.wasDragged=true;
        cam.setScroll(this.camSX-dx/cam.zoom,this.camSY-dy/cam.zoom);
        this.game.canvas.style.cursor='grabbing';
      }
    });
    this.input.on('pointerup',()=>{this.isDragging=false;this.game.canvas.style.cursor='default';});
    this.input.on('wheel',(_p:any,_g:any,_dx:number,dy:number)=>{
      cam.zoom=Phaser.Math.Clamp(cam.zoom-dy*0.002,0.5,5);
    });
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  public updateRooms(rooms:Room[]){
    this.rooms=this.positionRooms(rooms);
    this.children.list.filter(c=>
      c!==this.glowGfx&&((c as any).depth<=4)&&!(c instanceof Phaser.GameObjects.Graphics)
    ).forEach(c=>c.destroy());
    this.buildScene();
    this.syncAgentSprites();
    this.centerCamera();
  }

  public updateAgents(agents:Agent[]){
    this.agents=agents;
    this.syncAgentSprites();
    // update labels after sync
    this.labelObjs.filter(l=>l.active).forEach(l=>{
      const room=this.rooms.find(r=>l.text===r.name.toUpperCase());
      if(room){
        const cnt=agents.filter(a=>a.roomId===room.id).length;
        // find the sub-label (next one)
      }
    });
    agents.forEach(a=>{
      const s=this.agentSprites.get(a.id);
      if(!s)return;
      s.agent=a;
      if(a.status==='working'&&a.currentTask) this.showBubble(s,a.currentTask);
      else if(a.status==='idle'&&s.bubble){s.bubble.destroy();s.bubble=null;}
    });
  }

  // ─── Update ───────────────────────────────────────────────────────────────────

  update(_t:number,delta:number){
    this.frame++;
    const dt=delta/1000;
    this.drawGlow();

    const animF=Math.floor(this.frame/8)%4;
    const SC:Record<string,number>={
      idle:0x4a3820,working:0xe87830,waiting:0x6090c8,error:0xc83030,offline:0x2a1810,
    };

    this.agentSprites.forEach(s=>{
      s.idleTimer-=delta;
      const room=this.rooms.find(r=>r.id===s.roomId);
      if(s.idleTimer<=0&&room){
        s.tx=(room.gridX+3+Math.random()*(room.gridW-6))*T;
        s.ty=(room.gridY+4+Math.random()*(room.gridH-7))*T;
        s.idleTimer=s.agent.status==='working'?300+Math.random()*500:1200+Math.random()*2500;
      }
      const dx=s.tx-s.sprite.x, dy=s.ty-s.sprite.y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const speed=s.agent.status==='working'?50:22;
      const moving=dist>3;
      const sc=s.isBig?1:1.5;

      if(moving){
        s.sprite.x+=(dx/dist)*speed*dt;
        s.sprite.y+=(dy/dist)*speed*dt;
        const goR=dx>0;
        if(goR!==s.facing){s.facing=goR;s.sprite.setFlipX(!goR);}
        // Try run frame, fall back to idle if not loaded
        const runKey=`${s.charKey}_run_${animF}`;
        const idleKey=`${s.charKey}_idle_${animF}`;
        try{
          if(this.textures.exists(runKey)) s.sprite.setTexture(runKey);
          else s.sprite.setTexture(idleKey);
        }catch{s.sprite.setTexture(idleKey);}
      } else {
        const key=`${s.charKey}_idle_${animF}`;
        try{ s.sprite.setTexture(key); }catch{}
      }

      const offY=s.isBig?14:7;
      s.shadow.setPosition(s.sprite.x,s.sprite.y+offY);
      s.label.setPosition(s.sprite.x,s.sprite.y-(s.isBig?26:18));
      s.dot.setPosition(s.sprite.x+8,s.sprite.y-(s.isBig?12:10));
      s.dot.setFillStyle(SC[s.agent.status]||0x4a3820);
      if(s.bubble) s.bubble.setPosition(s.sprite.x,s.sprite.y-(s.isBig?40:26));

      const working=s.agent.status==='working';
      s.sprite.setAlpha(s.agent.status==='offline'?0.3:working?0.7+0.3*Math.sin(this.frame*0.15):1);
      s.sprite.setScale(sc);
    });
  }
}
// (file already written above)