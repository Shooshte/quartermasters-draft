// Run the unchanged reference tests while capturing their valid initialization
// inputs. The transform is development-only and never touches engine sources.
import { appendFileSync } from 'node:fs';
export default {
  test:{include:['src/**/*.test.ts'],environment:'node'},
  plugins:[{
    name:'capture-engine-reference-inputs',
    transform(code,id){
      if(!id.endsWith('/src/state.ts')||!id.includes('/engine/'))return;
      return code.replace('validateBattleInput(input);',`validateBattleInput(input);\n__capture(input, options);`)+`\nimport { appendFileSync as __append } from 'node:fs';\nimport { expect as __expect } from 'vitest';\nfunction __capture(input, options) { __append(process.env.QD_ENGINE_CAPTURE_PATH, JSON.stringify({name:__expect.getState().currentTestName??'reference-test',input,options})+'\\n'); }\n`;
    },
  }],
};
