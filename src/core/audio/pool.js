/**
 * Voice pools with priority stealing (AUDIO-DESIGN §2 "Voice limits and priorities").
 *  - `sfx`: one-shot and loop events (32; 20 on `low`). The SFX pool is owned by AudioManager.voices (same Set).
 *  - `voice`: dialogue lines, hard cap 3.
 * Music is deliberately NOT here: it has its own slots (constants.MUSIC_SLOTS) outside the SFX pool.
 * Stealing rule: when full, the lowest-priority non-loop entry is released (oldest first on equal priority), but only if it
 * is strictly lower than the incoming priority; otherwise the incoming request is refused. Loops are never victims.
 * Presentation only: no simulation state is read or written.
 */
export class VoicePool{
  constructor({sfx=32,voice=3}={}){
    this.caps={sfx,voice};this.sets={sfx:new Set(),voice:new Set()};
    this.stolen={sfx:0,voice:0};this.refused={sfx:0,voice:0};this.serial=0;
  }
  setCap(bus,cap){if(bus in this.caps&&Number.isFinite(cap)&&cap>=0)this.caps[bus]=Math.floor(cap);}
  count(bus){return this.sets[bus]?.size??0;}
  /** Lowest priority, then oldest `serial`; loops are skipped. Allocation-free. */
  victim(bus){
    let victim=null;
    for(const v of this.sets[bus])if(!v.loop&&(!victim||v.priority<victim.priority||(v.priority===victim.priority&&v.serial<victim.serial)))victim=v;
    return victim;
  }
  /** Makes room for one entry of `priority`. `release(victim)` must free the victim (and remove it from the set). */
  admit(bus,priority,release){
    const set=this.sets[bus];if(!set)return false;
    while(set.size>=this.caps[bus]){
      const v=this.victim(bus);
      if(!v||v.priority>=priority){this.refused[bus]++;return false;}
      release(v);set.delete(v);this.stolen[bus]++;
    }
    return true;
  }
  add(bus,entry){this.sets[bus].add(entry);return entry;}
  delete(bus,entry){return this.sets[bus].delete(entry);}
  clear(){this.sets.sfx.clear();this.sets.voice.clear();}
}
