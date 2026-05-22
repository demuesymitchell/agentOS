'use client';
import { useEffect, useRef } from 'react';
import { useStore } from '@/lib/store';

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef  = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const { agents, rooms, setSelectedAgent, openPanel } = useStore();

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;
    let game: any;

    const init = async () => {
      const Phaser  = (await import('phaser')).default;
      const { CityScene } = await import('@/game/CityScene');

      const state = useStore.getState();
      const sceneInstance = new CityScene();

      const cw = containerRef.current!.clientWidth  || window.innerWidth;
      const ch = containerRef.current!.clientHeight || window.innerHeight - 44;

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        backgroundColor: '#050505',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scene: [sceneInstance],
        scale: {
          // NONE = fixed canvas, no auto-resize that resets camera
          mode: Phaser.Scale.NONE,
          width:  cw,
          height: ch,
        },
        callbacks: {
          preBoot: (g: any) => {
            g.registry.set('rooms',  state.rooms);
            g.registry.set('agents', state.agents);
            g.registry.set('onAgentClick', (id: string) => {
              setSelectedAgent(id);
              openPanel('agentInspect');
            });
          },
        },
      });

      gameRef.current = game;

      // Handle window resize — manually resize canvas and re-center
      const onResize = () => {
        const cw2 = containerRef.current?.clientWidth  || window.innerWidth;
        const ch2 = containerRef.current?.clientHeight || window.innerHeight - 44;
        game.scale.resize(cw2, ch2);
        const scene = sceneRef.current;
        if (scene?.cameras?.main) {
          const W = scene.MAP_COLS * 16;
          const H = scene.MAP_ROWS * 16;
          scene.cameras.main.centerOn(W/2, H/2);
        }
      };
      window.addEventListener('resize', onResize);

      // Poll until scene active
      const poll = setInterval(() => {
        const s = game?.scene?.getScene('CityScene') as any;
        if (s?.sys?.isActive()) {
          sceneRef.current = s;
          clearInterval(poll);
        }
      }, 100);

      return () => window.removeEventListener('resize', onResize);
    };

    init();
    return () => {
      if (game) { game.destroy(true); gameRef.current = null; sceneRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('rooms', rooms);
    sceneRef.current?.updateRooms?.(rooms);
  }, [rooms]);

  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('agents', agents);
    if (sceneRef.current) {
      sceneRef.current.agents = agents;
      sceneRef.current.syncAgentSprites?.();
    }
  }, [agents]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        background: '#050505',
        overflow: 'hidden',
      }}
    />
  );
}