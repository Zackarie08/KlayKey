import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const mode=process.argv[2]||'assets';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
let failures=[];
if(mode==='secrets'){
 const rules=[['private key',/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/],['GitHub token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],['credential URL',/(?:mysql|postgres(?:ql)?):\/\/[^\s:@]+:[^\s@${}]+@/],['local user path',/[A-Z]:[\\/]Users[\\/][^\s/\\]+/i],['email outside reserved examples',/[A-Z0-9._%+-]+@(?!example\.(?:test|com|org)|test\.invalid)[A-Z0-9.-]+\.[A-Z]{2,}/i],['secret assignment',/(?:SESSION_SECRET|DB_PASSWORD|MYSQL_PASSWORD|MYSQL_ROOT_PASSWORD)[ \t]*=[ \t]*["']?[A-Za-z0-9+/=_-]{20,}/]];
 for(const file of files){if(/(?:^|\/)(?:\.env(?!\.example)|credentials\.json|.*\.pem)$/.test(file))failures.push(file+': forbidden sensitive file');if(!/\.(?:js|mjs|json|html|css|md|txt|ps1|bat|py|ya?ml|sql|example)$/.test(file))continue;const source=await fs.readFile(file,'utf8');for(const [label,re]of rules)if(re.test(source))failures.push(file+': '+label);}
}else if(mode==='lint'){
 for(const file of files.filter(f=>/\.(?:js|mjs)$/.test(f)))try{execFileSync(process.execPath,['--check',file],{stdio:'pipe'});}catch{failures.push(file+': syntax check failed');}
}else{
 for(const file of files){const stat=await fs.stat(file);if(stat.size>=100*1024*1024)failures.push(file+': exceeds normal GitHub file limit');}
 for(const layout of ['60','75','100']){const file='keyboard-3d/exports/keyboard_'+layout+'.glb';const data=await fs.readFile(file);if(data.toString('ascii',0,4)!=='glTF'||data.readUInt32LE(8)!==data.length)failures.push(file+': invalid GLB header');}
 const required=['keyboard-3d/exports/keyboard_manifest.json','keyboard-3d/config/compatibility.json','keyboard-3d/config/sound_profiles.json','keyboard-3d/viewer/typing-audio.js','keyboard-3d/viewer/sound-synthesis.js','public/assets/images/keyboard_75.webp'];
 for(const file of required){let dir='.';for(const part of file.split('/')){if(!(await fs.readdir(dir)).includes(part)){failures.push(file+': missing or wrong filename case');break;}dir=path.join(dir,part);}}
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}else console.log(mode+': passed ('+files.length+' publishable files checked).');
