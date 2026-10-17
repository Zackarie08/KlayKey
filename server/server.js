import {createApp} from './app.js';
import {pool,rows} from './database/connection.js';
import {migrate,seed} from './database/migrate.js';
import {config} from './config.js';
import {spawn} from 'node:child_process';
let server,cleanup;
async function shutdown(){clearInterval(cleanup);const deadline=setTimeout(()=>process.exit(1),10000);deadline.unref();if(server)await new Promise(resolve=>server.close(resolve));await pool.end();clearTimeout(deadline);}
try{
 await migrate();if(config.seedOnStart)await seed();await rows('SELECT id FROM products LIMIT 1');
 await rows('DELETE FROM sessions WHERE expires_at<?',[Date.now()]);
 cleanup=setInterval(()=>rows('DELETE FROM sessions WHERE expires_at<?',[Date.now()]).catch(()=>console.error('Session cleanup failed.')),900000);cleanup.unref();
 server=createApp().listen(config.port,'0.0.0.0',()=>{console.log(config.appName+' listening on port '+config.port);const url='http://localhost:'+config.port;if(!config.production)console.log(url);if(!config.production&&process.argv.includes('--open'))spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'}).on('error',()=>console.log('Open the local URL above.'));});
 server.on('error',async()=>{console.error('Unable to listen on configured port.');await shutdown();process.exitCode=1;});
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>shutdown().then(()=>process.exit(0)));
}catch(e){console.error('Startup failed:',config.production?'Database or migration unavailable.':e.message);await shutdown();process.exitCode=1;}
