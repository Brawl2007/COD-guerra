// Trajectórias de apresentação dos Ju 87 de M01 (metros, x/z no solo, y altura).
// Partilhadas pelo renderer e pelo áudio para que o motor se ouça onde o avião se vê.
// Não são dados de simulação: nenhum dano, alvo ou evento depende delas.
export const M01_STUKA_COUNT=3;
export const m01StukaPosition=(time,i=0)=>({x:80+Math.sin(time*.02+i)*250,y:160+i*20,z:240-time%90*4+i*30});
export const m01RaidPlanePosition=time=>({x:-700,y:1100,z:800-(time%150)*8});
