'use client';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';

export default function MediaPanel() {
  const { tasks, rooms } = useStore();
  const mediaRoom   = rooms.find(r=>r.name.toLowerCase().includes('media'));
  const mediaTasks  = tasks.filter(t=>t.roomId===mediaRoom?.id&&t.outputs.length>0&&t.status==='done');

  return (
    <Panel id="media" title="ARTIFACT VAULT" icon="🎨"
      className="absolute z-20"
      style={{ bottom:0, left:420, width:310, maxHeight:400 }}
    >
      <div className="scroll-dungeon flex-1 p-3 space-y-3" style={{maxHeight:340}}>
        {mediaTasks.length===0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-3xl">🏺</span>
            <p className="pixel-text text-[6px] dim text-center leading-relaxed">
              VAULT EMPTY<br/>
              <span className="text-[5px]">Media agents will store<br/>their creations here</span>
            </p>
          </div>
        ) : (
          mediaTasks.map(task=>(
            <div key={task.id} style={{background:'#120e08',border:'2px solid #4a3820'}} className="p-2">
              <p className="dungeon-text text-[14px] dim mb-2 truncate">{task.goal}</p>
              {task.outputs.map((out,i)=>(
                <div key={i} className="mb-2">
                  {out.label && <p className="pixel-text text-[5px] gold mb-1">{out.label}</p>}
                  {out.type==='image'&&out.content ? (
                    <img src={out.content} alt="artifact" className="w-full"
                      style={{border:'2px solid #4a3820'}} />
                  ) : out.type==='image' ? (
                    <div className="py-4 text-center" style={{background:'#0a0808',border:'2px dashed #3a2818'}}>
                      <p className="dungeon-text text-[14px] dim">🎨 Image — connect DALL-E to conjure</p>
                    </div>
                  ) : (
                    <p className="dungeon-text text-[15px] parchment leading-snug whitespace-pre-wrap">
                      {out.content.slice(0,300)}{out.content.length>300?'…':''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
