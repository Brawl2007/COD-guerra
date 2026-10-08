// A WebGL2 context that does nothing but answer like a working one, so three's real WebGLRenderer can compile, link
// and draw in Node: shaders and programs always compile and link, upper-case names are enum constants, create* calls
// return fresh handles and every other call is a no-op. `stats.programs` counts the programs created.
export function fakeWebGL2(){
  const constants=new Map();let next=0x9000;
  const constant=name=>{if(!constants.has(name))constants.set(name,name==='NO_ERROR'?0:next++);return constants.get(name);};
  const stats={programs:0};
  const canvas={addEventListener(){},removeEventListener(){},width:4,height:4,style:{},getContext:()=>gl};
  const base={canvas,drawingBufferWidth:4,drawingBufferHeight:4,
    getContextAttributes:()=>({alpha:false,antialias:false,depth:true,stencil:false,premultipliedAlpha:true,preserveDrawingBuffer:false}),
    getParameter(p){
      if(p===constant('VERSION'))return 'WebGL 2.0 (fake)';if(p===constant('SHADING_LANGUAGE_VERSION'))return 'WebGL GLSL ES 3.00 (fake)';
      if(p===constant('SCISSOR_BOX')||p===constant('VIEWPORT'))return new Int32Array([0,0,4,4]);
      if(p===constant('MAX_TEXTURE_SIZE'))return 4096;if(p===constant('MAX_SAMPLES'))return 4;return 16;
    },
    getShaderPrecisionFormat:()=>({precision:23,rangeMin:127,rangeMax:127}),getExtension:()=>null,getSupportedExtensions:()=>[],
    createProgram(){stats.programs++;return {};},getShaderParameter:()=>true,
    getProgramParameter:(_,p)=>p===constant('ACTIVE_UNIFORMS')||p===constant('ACTIVE_ATTRIBUTES')?0:true,
    getProgramInfoLog:()=>'',getShaderInfoLog:()=>'',getShaderSource:()=>'',getError:()=>0,isContextLost:()=>false,
    checkFramebufferStatus:()=>constant('FRAMEBUFFER_COMPLETE'),getUniformLocation:()=>null,getAttribLocation:()=>-1};
  const gl=new Proxy(base,{get(target,key){
    if(key in target)return target[key];if(typeof key!=='string')return undefined;
    if(/^[A-Z0-9_]+$/.test(key))return constant(key);if(key.startsWith('create'))return ()=>({});return ()=>null;
  }});
  return {gl,canvas,stats};
}
