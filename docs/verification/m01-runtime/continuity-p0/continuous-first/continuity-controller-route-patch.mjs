// Adjust only the Node pilot's future keyboard/mouse waypoint arrays.
// The browser simulation, clock, flags, saves and actors are never evaluated or written here.
import {appendFileSync,writeFileSync} from 'node:fs';
const out='/workspace/artifacts/continuity-controller-route-patch.jsonl';writeFileSync(out,'');
const [target]=await (await fetch('http://127.0.0.1:9229/json/list')).json();
const socket=new WebSocket(target.webSocketDebuggerUrl),pending=new Map();let serial=0;
const record=value=>{appendFileSync(out,JSON.stringify(value)+'\n');console.log(JSON.stringify(value));};
const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
const done=new Set();let breakpoint;
socket.addEventListener('message',async event=>{
 const data=JSON.parse(event.data);
 if(data.id){const p=pending.get(data.id);if(!p)return;pending.delete(data.id);if(data.error)p.reject(Error(data.error.message));else p.resolve(data.result);return;}
 if(data.method!=='Debugger.paused')return;
 try{
  const frame=data.params.callFrames[0];
  const result=await call('Debugger.evaluateOnCallFrame',{callFrameId:frame.callFrameId,returnByValue:true,expression:`(()=>{
   const before=points.map(p=>[...p]);
   if(label==='acesso rodoviário'){const i=points.findIndex(p=>p[0]===-10&&p[1]===32);if(i>=0)points.splice(i,1,[-30,40]);}
   if(label==='posto de disparo'&&!points.some(p=>p[0]===-30&&p[1]===40))points.splice(1,0,[-30,40]);
   return {controllerOnly:true,label,before,after:points.map(p=>[...p]),gameStateWrites:0};
  })()`});
  if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));
  record(result.result.value);done.add(result.result.value.label);
 }catch(e){record({error:e.message});}
 finally{
  await call('Debugger.resume');
  if(done.size===2){await call('Debugger.removeBreakpoint',{breakpointId:breakpoint});socket.close();}
 }
});
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
await call('Debugger.enable');
const result=await call('Debugger.setBreakpointByUrl',{url:'file:///workspace/COD-guerra/tools/m01-browser-playthrough.mjs',lineNumber:161,condition:`(label==='acesso rodoviário'&&points.some(p=>p[0]===-10&&p[1]===32))||(label==='posto de disparo'&&!points.some(p=>p[0]===-30&&p[1]===40))`});
breakpoint=result.breakpointId;record({armed:true,locations:result.locations,scope:'Node pilot waypoints only'});
await new Promise(resolve=>socket.addEventListener('close',resolve,{once:true}));
