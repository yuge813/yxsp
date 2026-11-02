#!/usr/bin/env node
'use strict';
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
let failed=false;
for(const args of [['tests/run.cjs'],['scripts/check-project.cjs','--json=scripts/validation-report.json']]){
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit'});
 if(result.error){console.error(result.error.message);failed=true;}
 if(result.signal){console.error(`Validation terminated by ${result.signal}`);failed=true;}
 if(result.status!==0)failed=true;
}
process.exitCode=failed?1:0;
