'use client';
import { useState, useRef, useCallback } from 'react';
import Panel from './panels/Panel';
import { useStore } from '@/lib/store';
import type { RoomAttachment } from '@/types';
import { v4 as uuid } from 'uuid';

function FileIcon({type}:{type:string}) {
  const icons: Record<string,string> = {
    image:'🖼', video:'🎬', pdf:'📄', text:'📝', other:'📎'
  };
  return <span>{icons[type]||icons.other}</span>;
}

function DropZone({roomId}:{roomId:string}) {
  const {addRoomAttachment, addLog} = useStore();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList) => {
    Array.from(files).forEach(file => {
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type === 'application/pdf' ? 'pdf'
        : file.type.startsWith('text/') ? 'text'
        : 'other';

      const reader = new FileReader();
      reader.onload = e => {
        const attachment: RoomAttachment = {
          id: uuid(),
          name: file.name,
          type,
          url: e.target?.result as string,
          size: file.size,
          addedAt: Date.now(),
        };
        addRoomAttachment(roomId, attachment);
        addLog({level:'info', from:'MEDIA', message:`Attached: ${file.name}`});
      };
      reader.readAsDataURL(file);
    });
  }, [roomId, addRoomAttachment, addLog]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={e=>{e.preventDefault();setDragging(true);}}
      onDragLeave={()=>setDragging(false)}
      onDrop={onDrop}
      onClick={()=>inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
      style={{
        border: `2px dashed ${dragging?'#e8c84a':'#4a3820'}`,
        background: dragging ? '#1a1408' : '#0c0806',
        padding: '16px 12px',
        borderRadius: 4,
      }}
    >
      <span style={{fontSize:24}}>🎨</span>
      <p className="cinzel dim text-center" style={{fontSize:11}}>
        Drop files here or click to browse<br/>
        <span style={{fontSize:10}}>Images, videos, PDFs, text</span>
      </p>
      <input ref={inputRef} type="file" multiple accept="image/*,video/*,.pdf,.txt"
        className="hidden" onChange={e=>e.target.files&&handleFiles(e.target.files)}/>
    </div>
  );
}

export default function MediaPanel() {
  const {tasks, rooms, removeRoomAttachment, updateRoom} = useStore();
  const [activeTab, setActiveTab] = useState<'outputs'|'files'|'config'>('outputs');

  const mediaRoom = rooms.find(r=>r.name.toLowerCase().includes('media'));
  const allOutputTasks = tasks.filter(t=>t.outputs.length>0&&t.status==='done');
  const mediaOutputs = tasks.filter(t=>t.roomId===mediaRoom?.id&&t.outputs.length>0);

  const [configForm, setConfigForm] = useState({
    systemPromptOverride: mediaRoom?.systemPromptOverride||'',
    maxTokens: mediaRoom?.maxTokens||2000,
    outputFormat: mediaRoom?.outputFormat||'text',
  });

  const saveConfig = () => {
    if (!mediaRoom) return;
    updateRoom(mediaRoom.id, {
      systemPromptOverride: configForm.systemPromptOverride||undefined,
      maxTokens: configForm.maxTokens,
      outputFormat: configForm.outputFormat as any,
    });
  };

  return (
    <Panel id="media" title="MEDIA ROOM" icon="🎨" minW={320} minH={240}>
      {/* Tabs */}
      <div className="flex flex-shrink-0 border-b border-[#3a2818]">
        {[
          {id:'outputs',label:'Outputs',count:mediaOutputs.length},
          {id:'files',  label:'Files',  count:mediaRoom?.attachments?.length||0},
          {id:'config', label:'Config', count:0},
        ].map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
            className="flex-1 py-1.5 cinzel hover:bg-[#140e08] transition-colors"
            style={{
              fontSize:11,color:activeTab===tab.id?'#e8c84a':'#4a3820',
              borderBottom:activeTab===tab.id?'2px solid #e8c84a':'2px solid transparent',
            }}>
            {tab.label}{tab.count>0&&<span className="ml-1" style={{fontSize:9}}>({tab.count})</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0" style={{overflowY:'auto'}}>

        {/* OUTPUTS TAB */}
        {activeTab==='outputs' && (
          <div className="p-2 space-y-2">
            {allOutputTasks.length===0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <span className="text-3xl">🏺</span>
                <p className="cinzel dim text-center" style={{fontSize:11}}>
                  No outputs yet<br/>
                  <span style={{fontSize:10}}>Completed tasks appear here</span>
                </p>
              </div>
            ) : (
              allOutputTasks.map(task=>(
                <div key={task.id} style={{background:'#0c0806',border:'1px solid #3a2818',borderRadius:4}}>
                  <div className="px-2 py-1.5 border-b border-[#2a1812]"
                    style={{background:'#120e06'}}>
                    <div className="flex items-center gap-2">
                      <span className="cinzel" style={{fontSize:10,color:rooms.find(r=>r.id===task.roomId)?.color||'#e8c84a'}}>
                        {rooms.find(r=>r.id===task.roomId)?.name||'Room'}
                      </span>
                      {task.agentName&&<span className="cinzel dim" style={{fontSize:10}}>· {task.agentName}</span>}
                      <span className="cinzel dim ml-auto" style={{fontSize:9}}>
                        {new Date(task.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="cinzel parchment truncate mt-0.5" style={{fontSize:11}}>{task.goal}</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {task.outputs.map((out,i)=>(
                      <div key={i}>
                        {out.label&&<p className="cinzel gold mb-1" style={{fontSize:10}}>{out.label}</p>}
                        {out.type==='image'&&out.content ? (
                          <img src={out.content} alt="output" className="w-full rounded"/>
                        ) : out.type==='image' ? (
                          <div className="py-3 text-center cinzel dim" style={{fontSize:11,border:'1px dashed #3a2818'}}>
                            🎨 Image — wire up DALL-E to generate
                          </div>
                        ) : (
                          <p className="cinzel parchment leading-relaxed whitespace-pre-wrap"
                            style={{fontSize:12,maxHeight:200,overflowY:'auto'}}>
                            {out.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* FILES TAB */}
        {activeTab==='files' && (
          <div className="p-2 space-y-2">
            {mediaRoom && <DropZone roomId={mediaRoom.id}/>}
            {!mediaRoom && (
              <p className="cinzel dim text-center py-4" style={{fontSize:11}}>
                No Media room found
              </p>
            )}
            {(mediaRoom?.attachments||[]).length>0 && (
              <div className="space-y-1 mt-2">
                <p className="cinzel dim" style={{fontSize:10}}>
                  {mediaRoom?.attachments?.length} file{(mediaRoom?.attachments?.length||0)!==1?'s':''} attached
                  — agents can reference these in tasks
                </p>
                {(mediaRoom?.attachments||[]).map(att=>(
                  <div key={att.id} className="flex items-center gap-2 p-2"
                    style={{background:'#0c0806',border:'1px solid #3a2818',borderRadius:4}}>
                    <FileIcon type={att.type}/>
                    <div className="flex-1 min-w-0">
                      <p className="cinzel parchment truncate" style={{fontSize:12}}>{att.name}</p>
                      <p className="cinzel dim" style={{fontSize:10}}>
                        {att.type} · {(att.size/1024).toFixed(1)}KB
                      </p>
                    </div>
                    {att.type==='image'&&att.url&&(
                      <img src={att.url} alt="" style={{width:36,height:36,objectFit:'cover',borderRadius:2}}/>
                    )}
                    <button onClick={()=>mediaRoom&&removeRoomAttachment(mediaRoom.id,att.id)}
                      className="btn-dungeon danger" style={{fontSize:9,padding:'1px 5px'}}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFIG TAB */}
        {activeTab==='config' && (
          <div className="p-3 space-y-3">
            <p className="cinzel dim" style={{fontSize:10}}>
              Room config overrides how agents in this room behave
            </p>
            <div>
              <label className="cinzel dim block mb-1" style={{fontSize:11}}>
                SYSTEM PROMPT OVERRIDE
              </label>
              <textarea
                value={configForm.systemPromptOverride}
                onChange={e=>setConfigForm(f=>({...f,systemPromptOverride:e.target.value}))}
                rows={4} className="input-dungeon resize-none"
                style={{fontSize:12,lineHeight:1.5}}
                placeholder="Optional — prepended to each agent's system prompt in this room"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="cinzel dim block mb-1" style={{fontSize:11}}>MAX TOKENS</label>
                <input type="number" value={configForm.maxTokens}
                  onChange={e=>setConfigForm(f=>({...f,maxTokens:parseInt(e.target.value)||2000}))}
                  className="input-dungeon" style={{fontSize:12}}
                  min={256} max={8000} step={256}/>
              </div>
              <div>
                <label className="cinzel dim block mb-1" style={{fontSize:11}}>OUTPUT FORMAT</label>
                <select value={configForm.outputFormat}
                  onChange={e=>setConfigForm(f=>({...f,outputFormat:e.target.value}))}
                  className="input-dungeon" style={{fontSize:12}}>
                  <option value="text">Text</option>
                  <option value="image">Image (+ DALL-E)</option>
                  <option value="listing">Listing</option>
                  <option value="json">JSON</option>
                </select>
              </div>
            </div>
            <button onClick={saveConfig} className="btn-dungeon primary w-full" style={{fontSize:11}}>
              SAVE CONFIG
            </button>
          </div>
        )}
      </div>
    </Panel>
  );
}