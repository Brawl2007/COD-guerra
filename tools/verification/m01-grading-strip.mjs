// Removes the T44 post-process grading (src/render/m01-grading.js and its integration in src/render/m01-view.js) from a copy of this tree.
// Usage: node tools/verification/m01-grading-strip.mjs <directory containing a checkout of this repository>
//
// tests/browser/m01-postprocess-grading.spec.js compares every graded frame with a BEFORE frame: the same game, same sim state and same
// decal atlas, WITHOUT the grading pass. The integrated candidate has no such earlier commit (T44 sits in the middle of the stack together with
// T20, T42 and the later work), so CI makes it by taking the tree under test and undoing exactly the T44 hunks of e9234e8 on top of it.
// Every replacement must match exactly once; anything else exits non-zero, so a drifted m01-view.js can never yield a BEFORE that silently still grades.
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(process.argv[2]??'');
if(!process.argv[2]||!fs.existsSync(path.join(root,'src/render/m01-view.js'))){console.error('usage: node tools/verification/m01-grading-strip.mjs <repository checkout>');process.exit(2);}
const file=path.join(root,'src/render/m01-view.js');
let source=fs.readFileSync(file,'utf8');
const once=(from,to,label)=>{
  const hits=source.split(from).length-1;
  if(hits!==1){console.error(`m01-grading-strip: "${label}" matched ${hits} times in src/render/m01-view.js (expected 1); the T44 integration points moved, update this script`);process.exit(1);}
  source=source.replace(from,()=>to);
};
once("import { M01Grading } from './m01-grading.js';\n",'','import');
once('this.grading=new M01Grading();','','constructor');
once('grading:this.grading.stateKey,','','paused-frame key');
once("    // T44: Medium/High draw the world into the grade's target and composite it once; Low (post===null) runs the exact statements it always ran.\n",'','render comment');
once('    const post=this.grading.begin(this.engine,this.owner.quality,this.lightingModel,this.camera);\n','','grading.begin');
once('    if(post)this.drawGraded(post);else this.engine.clear();\n    if(!post)this.engine.render(this.scene,this.camera);\n','    this.engine.clear();this.engine.render(this.scene,this.camera);\n','render statements');
once(/\n  \/\*\* T44 \(Medium\/High\): the world goes into[^\n]*\n  drawGraded\(post\)\{[\s\S]*?\n  \}\n/.exec(source)?.[0]??'<no drawGraded>','\n','drawGraded');
once('grading:this.grading.diagnostics,','','diagnostics');
once('this.grading.dispose();','','dispose');
if(/grading/i.test(source.replace(/\/\/[^\n]*/g,''))){console.error('m01-grading-strip: m01-view.js still mentions grading after the strip');process.exit(1);}
fs.writeFileSync(file,source);
fs.rmSync(path.join(root,'src/render/m01-grading.js'),{force:true});
// Nothing else in src may import the module (a leftover import would fail the build, which is the point).
console.log('m01-grading-strip: T44 grading removed from',root);
