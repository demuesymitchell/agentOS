'use client';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

export default function MediaPanel() {
  const { tasks, rooms } = useStore();
  const mediaRoom  = rooms.find(r => r.name.toLowerCase().includes('media'));
  const mediaTasks = tasks.filter(t => t.roomId===mediaRoom?.id && t.outputs.length>0 && t.status==='done');

  return (
    <Panel id="media" title="ARTIFACT VAULT" icon="🎨"
      defaultX={420} defaultY={54} defaultW={380} defaultH={300} minW={280} minH={180}>
      <div className="scroll-dungeon flex-1 p-3 space-y-3 min-h-0" style={{overflowY:'auto'}}>
        {mediaTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-3xl">🏺</span>
            <p className="cinzel dim text-center leading-relaxed" style={{fontSize:12}}>
              Vault Empty<br/>
              <span style={{fontSize:10}}>Media agents store creations here</span>
            </p>
          </div>
        ) : (
          mediaTasks.map(task => (
            <div key={task.id} style={{background:'#0c0806',border:'1px solid #4a3820'}} className="p-2">
              <p className="cinzel dim mb-2 truncate" style={{fontSize:12}}>{task.goal}</p>
              {task.outputs.map((out,i) => (
                <div key={i} className="mb-2">
                  {out.label && <p className="cinzel gold mb-1" style={{fontSize:10}}>{out.label}</p>}
                  {out.type==='image' && out.content
                    ? <img src={out.content} alt="artifact" className="w-full" style={{border:'1px solid #4a3820'}}/>
                    : <p className="cinzel parchment leading-snug whitespace-pre-wrap" style={{fontSize:12}}>
                        {out.content?.slice(0,400)}{(out.content?.length??0)>400?'…':''}
                      </p>}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}