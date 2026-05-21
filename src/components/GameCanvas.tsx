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

      const W = containerRef.current!.clientWidth  || window.innerWidth;
      const H = containerRef.current!.clientHeight || (window.innerHeight - 44);

      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current!,
        backgroundColor: '#050505',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        scene: [sceneInstance],
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: W,
          height: H,
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

      // Poll until scene is active
      const poll = setInterval(() => {
        const s = game?.scene?.getScene('CityScene') as any;
        if (s?.sys?.isActive()) {
          sceneRef.current = s;
          clearInterval(poll);
        }
      }, 100);
    };

    init();
    return () => {
      if (game) { game.destroy(true); gameRef.current = null; sceneRef.current = null; }
    };
  }, []);

  // Sync rooms → scene
  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('rooms', rooms);
    sceneRef.current?.updateRooms?.(rooms);
  }, [rooms]);

  // Sync agents → scene (fires immediately when agent added)
  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.registry.set('agents', agents);
    sceneRef.current?.updateAgents?.(agents);
    // Also call syncAgentSprites directly in case scene already running
    if (sceneRef.current?.syncAgentSprites) {
      sceneRef.current.agents = agents;
      sceneRef.current.syncAgentSprites();
    }
  }, [agents]);

  return (
    <div
      ref={containerRef}
      style={{ position:'absolute', inset:0, background:'#050505' }}
    />
  );
}
