import {preview} from 'vite';

const host=process.env.M01_BROWSER_HOST??'127.0.0.1';
const port=Number(process.env.M01_BROWSER_PORT??4173);
if(!Number.isInteger(port)||port<=0||port>65535)throw new Error(`Invalid M01_BROWSER_PORT: ${process.env.M01_BROWSER_PORT}`);

const parentPid=process.ppid;
let server;
let closing=false;
let parentWatch;
async function close(signal){
  if(closing)return;
  closing=true;
  try{await server?.close();}
  finally{
    if(parentWatch)clearInterval(parentWatch);
    if(signal)process.stderr.write(`[m01-browser-preview] closed on ${signal}\n`);
    process.exit(0);
  }
}
process.once('SIGINT',()=>{void close('SIGINT');});
process.once('SIGTERM',()=>{void close('SIGTERM');});
process.once('SIGHUP',()=>{void close('SIGHUP');});

try{
  server=await preview({preview:{host,port,strictPort:true}});
  parentWatch=setInterval(()=>{
    if(process.ppid===1||process.ppid!==parentPid){void close('parent-exit');return;}
    try{process.kill(parentPid,0);}catch{void close('parent-exit');}
  },500);
  parentWatch.unref();
  server.printUrls();
  process.stderr.write(`[m01-browser-preview] ready http://${host}:${port}/COD-guerra/\n`);
}catch(error){
  process.stderr.write(`[m01-browser-preview] failed: ${error?.stack??error}\n`);
  process.exitCode=1;
}
