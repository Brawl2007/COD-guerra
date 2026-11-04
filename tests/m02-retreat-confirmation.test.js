import test from 'node:test';
import assert from 'node:assert/strict';
import {M02RetreatConfirmation} from '../src/m02/m02-retreat-confirmation.js';

test('early withdrawal needs two inputs for the same situation and clears on pause or restore',()=>{
 const state=new M02RetreatConfirmation(),player={},prompt={count:5,lisUnsafe:true};
 assert.equal(state.request(prompt,player),false);assert.equal(state.armed,true);
 state.sync(prompt,player,true);assert.equal(state.armed,true);assert.equal(state.request(prompt,player),true);assert.equal(state.armed,false);
 assert.equal(state.request(prompt,player),false);state.sync({...prompt,count:4},player,true);assert.equal(state.armed,false);
 assert.equal(state.request(prompt,player),false);state.sync({...prompt,lisUnsafe:false},player,true);assert.equal(state.armed,false);
 assert.equal(state.request(prompt,player),false);state.sync(prompt,player,false);assert.equal(state.armed,false);
 assert.equal(state.request(prompt,player),false);state.sync(prompt,{},true);assert.equal(state.armed,false);
 assert.equal(state.request(null,player),false);assert.equal(state.armed,false);
});
