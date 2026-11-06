// Actors can remain in the persistent roster while absent from the active
// cell. EVACUATED_B12 is intentionally present: Lis is physically there.
export function m02ActorPresent(actor){
 return Boolean(actor&&!actor.detachedOutOfCell&&!actor.evacuated&&!['EVACUATED','MISSING'].includes(actor.state));
}
