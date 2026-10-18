import test from 'node:test';
import assert from 'node:assert/strict';
import {route,driver,toStationEvacuation} from './helpers/m01-route.js';
import {clippingAudit} from './helpers/m01-clipping.js';

// P0 (owner playtest): NPCs walk through walls. The real mission routes, one observation per tick, every actor against every solid.
// A clipping event is an actor entering a wall (or tunnelling through it between two ticks); the list must be empty.
const audited=(label,run)=>test(`no actor clips a collider, a girder or a sandbag wall: ${label}`,{timeout:300000},()=>{
  const audit=clippingAudit();run(audit.observe);
  assert.ok(audit.ticks>4000,`the route ran (${audit.ticks} ticks)`);
  assert.deepEqual(audit.report(),[],`${audit.events.length} clipping event(s) in ${audit.ticks} ticks`);
});
audited('full route, seed 19390901',observe=>route(19390901,{onStep:observe}));
audited('full route with the covering-fire pilot, seed 19390901',observe=>route(19390901,{support:true,onStep:observe}));
audited('station evacuation observed from the yard',observe=>toStationEvacuation(driver(19390901,{onStep:observe}),{observe:true,phase:'release'}));
