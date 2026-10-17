import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const portIndex=process.argv.indexOf('--port');
const port=portIndex>=0?Number(process.argv[portIndex+1]):8080;
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Choose a port between 1024 and 65535.');
const origin=`http://127.0.0.1:${port}`;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.wav':'audio/wav','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const server=http.createServer((req,res)=>{
  if(req.url==='/__health'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({service:'klaykeys',version:2,pid:process.pid}));return;}
  if(req.method==='POST'&&req.url==='/__qa/report'){
    // One bounded local QA artifact, not a general-purpose filesystem endpoint.
    if(req.headers.origin!==origin){res.writeHead(403).end();return;}
    let body='';req.on('data',chunk=>{body+=chunk;if(body.length>200000)req.destroy();});
    req.on('end',()=>{try{const report=JSON.parse(body);if(!Array.isArray(report.checks)||typeof report.passed!=='boolean')throw Error('Invalid report');
      fs.writeFile(path.join(root,'exports','viewer_validation.json'),JSON.stringify(report,null,2)+'\n',err=>{res.writeHead(200).end(err?'Use Save report to download; this server cannot write the project folder.':'Saved');});
    }catch{res.writeHead(400).end('Invalid report');}});return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  let relative;
  try { relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400).end('Invalid URL'); return; }
  if(relative==='/'){res.writeHead(302,{Location:'/viewer/index.html'+new URL(req.url,'http://localhost').search}).end();return;}
  const file=path.resolve(root,'.'+relative);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
  fs.stat(file,(err,stat)=>{
    if(err||!stat.isFile()){res.writeHead(404).end('File not found');return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Close the previous viewer server with Ctrl+C, or run start-viewer.ps1 -Port ${port+1}. No processes were stopped.`:error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',async()=>{
  const url=origin+'/viewer/index.html';console.log(`KlayKeys viewer: ${url}\nKeep this window open. Press Ctrl+C here to stop the server.\nServer PID: ${process.pid}`);
  if(process.argv.includes('--open')){
    const browser=spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});browser.on('error',()=>console.log('Open the URL above in your browser.'));
  }
  if(process.argv.includes('--smoke')){
    try{for(const relative of ['/viewer/index.html','/viewer/app.js','/exports/keyboard_manifest.json','/node_modules/three/build/three.module.js',...['60','75','100'].map(s=>`/exports/keyboard_${s}.glb`)]){
      const response=await fetch(origin+relative);if(!response.ok)throw Error(relative+': HTTP '+response.status);await response.arrayBuffer();
    }console.log('LAUNCHER_SMOKE_OK: viewer, dependencies, manifest and all three GLBs served.');}
    catch(error){console.error(error.message);process.exitCode=1;}finally{server.close();server.closeAllConnections();}
  }
});
process.on('SIGINT',()=>{server.close();server.closeAllConnections();});
