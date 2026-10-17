import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import validator from 'gltf-validator';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let failed=false;
for(const id of ['60','75','100']){
  const file=path.join(root,'exports',`keyboard_${id}.glb`);
  const report=await validator.validateBytes(new Uint8Array(await fs.readFile(file)),{uri:path.basename(file),maxIssues:1000});
  await fs.writeFile(path.join(root,'exports',`gltf_validation_${id}.json`),JSON.stringify(report,null,2)+'\n');
  console.log(`${id}%: ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
  failed ||= report.issues.numErrors>0||report.issues.numWarnings>0;
}
process.exitCode=failed?1:0;
