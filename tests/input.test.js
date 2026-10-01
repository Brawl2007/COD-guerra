import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/input.js';

test('pointer lock entry and resume ignore cursor warps while later mouse movement works',()=>{
  const previousWindow=globalThis.window,previousDocument=globalThis.document;
  const windowTarget=new EventTarget(),documentTarget=new EventTarget(),canvas=new EventTarget();
  const emit=(target,type,properties={})=>{
    const event=new Event(type);Object.assign(event,properties);target.dispatchEvent(event);
  };
  globalThis.window=windowTarget;globalThis.document=documentTarget;
  let input;
  try{
    input=new Input(canvas);
    // The element can change before the queued pointerlockchange event arrives.
    documentTarget.pointerLockElement=canvas;
    emit(windowTarget,'mousemove',{movementX:-210,movementY:-440});
    assert.equal(input.consumeLook(),0);assert.equal(input.consumeLookY(),0);
    emit(documentTarget,'pointerlockchange');
    // Chromium can deliver its cursor repositioning sample after the event too.
    emit(windowTarget,'mousemove',{movementX:-210,movementY:-440});
    assert.equal(input.consumeLook(),0);assert.equal(input.consumeLookY(),0);
    emit(windowTarget,'mousemove',{movementX:12,movementY:-8});
    assert.equal(input.consumeLook(),12);assert.equal(input.consumeLookY(),-8);
    emit(windowTarget,'keydown',{code:'KeyW'});
    emit(windowTarget,'mousedown',{button:0});
    emit(windowTarget,'mousemove',{movementX:7,movementY:4});
    documentTarget.pointerLockElement=null;emit(documentTarget,'pointerlockchange');
    assert.equal(input.down('KeyW'),false);assert.equal(input.consumeFire(),false);
    assert.equal(input.consumeLook(),0);assert.equal(input.consumeLookY(),0);
    emit(windowTarget,'mousemove',{movementX:500,movementY:500});
    assert.equal(input.consumeLook(),0);
    documentTarget.pointerLockElement=canvas;emit(documentTarget,'pointerlockchange');
    emit(windowTarget,'mousemove',{movementX:320,movementY:180});
    emit(windowTarget,'mousemove',{movementX:-3,movementY:6});
    assert.equal(input.consumeLook(),-3);assert.equal(input.consumeLookY(),6);
  }finally{
    input?.dispose();
    if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
    if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;
  }
});
