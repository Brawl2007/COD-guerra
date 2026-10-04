import {preview} from 'vite';

const host=process.env.M01_BROWSER_HOST??'127.0.0.1';
const port=Number(process.env.M01_BROWSER_PORT??4173);
if(!Number.isInteger(port)||port<=0||port>65535)throw new Error(`Invalid M01_BROWSER_PORT: ${process.env.M01_BROWSER_PORT}`);

let server;
let closing=false;
async function close(signal){
  if(closing)return;
  closing=true;
  try{await server?.close();}
  finally{
    if(signal)process.stderr.write(`[m01-browser-preview] closed on ${signal}\n`);
    process.exit(0);
  }
}
process.once('SIGINT',()=>{void close('SIGINT');});
process.once('SIGTERM',()=>{void close('SIGTERM');});
process.once('SIGHUP',()=>{void close('SIGHUP');});

try{
  server=await preview({preview:{host,port,strictPort:true}});
  server.printUrls();
  process.stderr.write(`[m01-browser-preview] ready http://${host}:${port}/COD-guerra/\n`);
}catch(error){
  process.stderr.write(`[m01-browser-preview] failed: ${error?.stack??error}\n`);
  process.exitCode=1;
}
