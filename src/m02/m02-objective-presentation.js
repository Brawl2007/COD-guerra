const TITLES={O00:'Siga Gruca até à vala e tome o posto avançado.',O01:'Escolha o eixo de aproximação à quinta.',O02:'Tome a casa e flanqueie a posição no celeiro.',O03:'Consolide o pátio e neutralize a guarnição.',C04:'Reagrupe no pomar e sinalize o ferido com giz.',COMPLETE:'A quinta está segura. Siga com a secção.',O04:'Abra o corredor e proteja a carroça de abastecimento.',O05:'Reagrupe na estrada com a água e as munições.',O06:'Conquiste a passagem para a casa de socorro.',O07:'Cubra a travessia do grupo da direita.',O08:'Ajude Lis e mantenha aberto o caminho dos feridos.',O09:'Recue para a casa de socorro e rompa contacto.'};
export function m02ObjectivePresentation(sim){
 const id=sim.objective.id,points={O00:[-18,-110],O01:[-42,-60],O02:[-25,-15],O03:[0,-24],C04:[-5,38],COMPLETE:[0,50],O05:[0,-70],O06:[-12,-36],O07:[-55,52],O09:[-55,54]};
 let point=points[id];
 if(id==='O04'){const cart=sim.areaB.supplyCart;point=sim.player.carryingVolumeId||sim.supplies.ammoDelivered&&sim.supplies.waterDelivered?[cart.goalX,cart.goalZ]:[cart.x,cart.z];}
 if(id==='O08'){const lis=sim.allies.find(a=>a.id==='pl_lis'&&a.alive&&!a.detachedOutOfCell);point=sim.areaC.lisContactedInC11||!lis?[-55,52]:[lis.x,lis.z];}
 return {title:TITLES[id]??'Siga as ordens da secção.',point};
}
