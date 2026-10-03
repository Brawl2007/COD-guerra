# HANDOFF — M01 yard wagon fit

Branch: `codex/m01-yard-wagon-fit`  
Base: `beec7cd9333cfac38fdc361da481ad4a942e1e37`

## Estado

Investigação concluída sem alterar `src/**`, `missions/**` ou `assets/**`. Foram adicionados apenas o verificador, o teste e documentação dentro dos caminhos autorizados.

O encaixe horizontal está resolvido: os três pontos usam yaw 0 e scale 1. Os dois primeiros casam geometricamente com `cv_wagon_1/2`: delta `[2,0,3]` e normal +X.

A integração está **bloqueada pela cota vertical**. Os GLB esperam root Y no topo do carril; os pontos do mapa dizem Y=0, mas o terreno actual dá um apoio incompatível (até 1,1528 m de variação no primeiro e gap de 3 m nos outros dois).

## Próxima decisão necessária

Antes de ligar qualquer GLB, escolher/documentar uma destas fontes autoritativas:

1. uma superfície/via de desvio do pátio que realmente sustente root Y=0 e preserve a relação com o jogador/cobertura; ou
2. novas cotas dos pontos/covers, justificadas por mapa/world, em vez de baixar os modelos ad hoc.

Não usar pitch/roll/scale para disfarçar a incompatibilidade. O primeiro ponto exigiria uma rampa extrema se simplesmente seguisse o terreno.

Depois de resolver Y:
- reutilizar os transforms X/Z/yaw/scale deste directório;
- manter `VEHICLE` sem collider novo até tarefa separada;
- escolher tipo `covered/open` explicitamente, sem alegar identificação histórica;
- só ligar queimado/danificado quando a simulação identificar o vagão-alvo; `station_wagon_fire` sozinho continua insuficiente.

O trem 963 de 65 vagões é sistema separado e não participa deste handoff.
