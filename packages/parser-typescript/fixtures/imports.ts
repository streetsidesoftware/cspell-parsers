import { expl } from './example.js';
import { expl as myExample } from './example.js';
import defaultExport from './default-export.js';
import * as namespaceImport from './namespace-module.js';

export { expl } from './example.js';
export { expl as myExport };

expl.callSomething();
myExample.explReal;
myExample.explReal.subProp;
namespaceImport.doThing();
defaultExport();
