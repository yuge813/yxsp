'use strict';
// Load all node:test suites in one process. Run with `node tests/run.cjs`.
// This avoids child-process test-context interference in managed cloud runners.
const fs=require('node:fs');
const path=require('node:path');
const files=fs.readdirSync(__dirname).filter(file=>file.endsWith('.test.cjs')).sort();
if(!files.length)throw new Error('No behavior test suites found');
for(const file of files)require(path.join(__dirname,file));
