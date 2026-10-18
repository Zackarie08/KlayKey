import express from 'express';
import fs from 'node:fs';
import {rows} from './database/connection.js';
import helmet from 'helmet';
import session from 'express-session';
import {root,config} from './config.js';
import {MySQLSessionStore,csrf,auth} from './middleware/security.js';
import {api} from './routes/api.js';
import {safeReturn} from './validators.js';
export function createApp(){
 if(!config.secret||config.secret.length<32)throw Error('Set SESSION_SECRET to at least 32 random characters in .env.');
 const app=express();app.disable('x-powered-by');app.set('trust proxy',config.trustProxy);
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:','blob:'],connectSrc:["'self'",'blob:'],frameSrc:["'self'"],upgradeInsecureRequests:config.production?[]:null}},crossOriginEmbedderPolicy:false}));
 app.get('/api/health',(req,res)=>res.json({status:'ok'}));
 app.get('/api/health/ready',async(req,res)=>{try{await rows('SELECT 1');res.json({status:'ready'});}catch{res.status(503).json({status:'unavailable'});}});
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html=fs.readFileSync(root+'/public/index.html','utf8').replaceAll('__APP_NAME__',escape(config.appName));
 const sendPage=(req,res)=>res.set('Cache-Control','no-store').type('html').send(html);
 app.use(express.json({limit:'40kb'}));
 app.use(session({name:config.cookieName,secret:config.secret,store:new MySQLSessionStore(),resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:config.production,maxAge:config.sessionMaxAge}}));
 app.use('/api',csrf,api);app.use('/api',(req,res)=>res.status(404).json({error:'API route not found.'}));
 app.use('/assets',express.static(root+'/public/assets',{maxAge:'1d'}));app.use('/css',express.static(root+'/public/css'));app.use('/js',express.static(root+'/public/js'));
 app.use('/keyboard-3d/previews',express.static(root+'/keyboard-3d/previews'));
 // Public audio modules reuse the exact existing sound engine without loading Three.js.
 for(const name of ['typing-audio.js','sound-synthesis.js'])app.get('/keyboard-3d/viewer/'+name,(req,res)=>res.sendFile(root+'/keyboard-3d/viewer/'+name));
 app.get('/keyboard-3d/config/sound_profiles.json',(req,res)=>res.sendFile(root+'/keyboard-3d/config/sound_profiles.json'));
 app.use('/keyboard-3d',auth,express.static(root+'/keyboard-3d',{dotfiles:'deny',index:false,maxAge:'1h',setHeaders:(res,file)=>{if(file.endsWith('.glb'))res.type('model/gltf-binary');if(/\.(html|js|json|css)$/.test(file))res.set('Cache-Control','no-store');}}));
 app.post('/__qa/report',auth,(req,res)=>res.json({message:'Use Save report to download the asset QA report.'}));
 app.get('/health',(req,res)=>res.json({service:config.appName,status:'ok'}));
 app.get(['/builder','/cart','/checkout','/account','/account/builds','/account/orders','/order-confirmation/:number'],(req,res,next)=>{if(!req.session.userId)return res.redirect('/login?returnTo='+encodeURIComponent(safeReturn(req.originalUrl))+'&reason=protected');next();});
 app.get(['/','/shop','/shop/:slug','/parts','/builder','/cart','/checkout','/order-confirmation/:number','/login','/register','/account','/account/builds','/account/orders','/about','/contact','/faq','/terms','/privacy'],(req,res)=>sendPage(req,res));
 app.use((req,res)=>sendPage(req,res.status(404)));
 app.use((error,req,res,next)=>{if(res.headersSent)return next(error);const status=error.status||500;if(status>=500)console.error('Request failed:',config.production?'Internal request error':error.message);res.status(status).json({error:status>=500?'Something went wrong. Please try again.':error.message,fields:error.fields||{}});});return app;
}
