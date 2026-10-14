import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
test('well-lit original kit gallery: four types, three LODs and destroyed state',async({page},info)=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>errors.push(r.failure()?.errorText));
 await page.goto('tools/assets/m01-field-structures/viewer.html');await page.waitForFunction(()=>window.fieldGallery?.ready);const out=process.env.M01_FIELD_EVIDENCE==='1'?'docs/assets/m01-field-structures/captures':'test-results/field-structures-gallery';mkdirSync(out,{recursive:true});
 for(const id of ['rail_shed','shelter','forward_post','casemate'])for(const lod of [0,1,2])for(const variant of id==='forward_post'?['intact','destroyed']:['intact']){await page.evaluate(({id,lod,variant})=>window.fieldGallery.set(id,lod,variant),{id,lod,variant});await page.waitForFunction(()=>window.fieldGallery.ready);const state=await page.evaluate(()=>window.fieldGallery.state);expect(state).toMatchObject({id,lod,variant});expect(state.triangles).toBeLessThanOrEqual([5000,1500,300][lod]);const name=`${id}-${variant}-lod${lod}`;const png=await page.screenshot({path:`${out}/${name}.png`});await info.attach(name,{body:png,contentType:'image/png'});}
 expect(errors).toEqual([]);
});
