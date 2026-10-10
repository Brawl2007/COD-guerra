import wagonManifest from '../../assets/models/provisional/m01-wagons/manifest.json' with {type:'json'};

// Single source of truth for the drawn yard wagons: the renderer draws them and TczewWorld makes them solid from this table.
export const M01_YARD_WAGON_PLAN=Object.freeze([
  Object.freeze({id:'yard_wagon_1',type:'covered',position:Object.freeze([-320,0,-6]),cover:'cv_wagon_1'}),
  Object.freeze({id:'yard_wagon_2',type:'open',position:Object.freeze([-340,0,8]),cover:'cv_wagon_2'}),
  Object.freeze({id:'yard_wagon_3',type:'covered',position:Object.freeze([-352,0,8]),damageKey:'station_wagon_fire'}),
]);

// Metres, derived from the manifest. Roots have no rotation; the long axis is Z.
const sizeOf=type=>{
  const d=wagonManifest.dimensions_m;
  return Object.freeze({halfX:d.width/2,halfZ:d.frame/2,height:d[type].height});
};
export const M01_YARD_WAGON_SIZE=Object.freeze({covered:sizeOf('covered'),open:sizeOf('open')});

// Solid box of a wagon. min.y is the lowest ground under the 3x3 footprint sample so that nobody can walk under the downhill end on a slope.
export function yardWagonFootprint(wagon,heightAt){
  const [x,,z]=wagon.position,s=M01_YARD_WAGON_SIZE[wagon.type],cy=heightAt(x,z);
  let low=cy;
  for(const dx of [-s.halfX,0,s.halfX])for(const dz of [-s.halfZ,0,s.halfZ])low=Math.min(low,heightAt(x+dx,z+dz));
  return {id:wagon.id,min:{x:x-s.halfX,y:low,z:z-s.halfZ},max:{x:x+s.halfX,y:cy+s.height,z:z+s.halfZ}};
}
