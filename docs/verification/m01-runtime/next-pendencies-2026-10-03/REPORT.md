# Auditoria das próximas pendências M01 — 2026-10-03

Base analisada: `codex/m01-support-runtime` @ `191b436ad7ca5023dd84b85a07107a82cb06ce92`.
Esta branch de auditoria não altera produção, assets, testes, saves, RNG, gates ou Graphify.

## 1. MG34 deitada + municiador

### Factos confirmados

- O kit visual existe em `assets/models/provisional/m01/weapons/mg34-prone/` e fornece:
  - `mg34_prone_enter`
  - `mg34_prone_idle`
  - `mg34_prone_aim`
  - `mg34_prone_fire_burst`
  - `mg34_prone_reload`
  - `mg34_prone_exit`
  - `mg34_loader_prone_idle`
  - `mg34_loader_prone_feed`
  - `mg34_loader_prone_leave`
- O runtime real usa `de_east_0` e `de_east_1` como os dois atiradores MG34.
- `mission.json` define explicitamente `de_east_2..de_east_13` como atiradores Kar98k nos portões.
- `grp_de_east.sizeVisible` é 40; o runtime já instancia exactamente os 40 IDs `de_east_0..39`.
- Não existe actualmente:
  - ID de municiador MG34;
  - pareamento gunner→loader;
  - estado persistido de postura `prone`;
  - fase persistida enter/idle/fire/reload/exit;
  - regra de simulação dizendo quando um atirador monta/desmonta a posição deitada.

### Conclusão

Não é seguro integrar o municiador agora. Reaproveitar `de_east_2` ou outro atirador mudaria um actor que o contrato da missão já declara como Kar98k. Adicionar novos actores mudaria novamente o roster/schema e `sizeVisible`.

Também não é seguro o renderer decidir sozinho que `de_east_0/1` ficam deitados por estarem parados, em cover ou por terem MG34; isso criaria uma decisão de postura fora da simulação.

### Menor desbloqueio necessário

Antes de tocar no renderer, definir na simulação um contrato explícito e persistível, por exemplo:
- quais IDs são operadores/municiadores;
- `mgPosture` / fase real da equipa;
- se o municiador é actor novo ou actor já existente;
- transições autorizadas.

A decisão de roster deve ser resolvida primeiro. Até lá, manter a integração MG34 de pé já validada.

## 2. Vagões queimados/danificados

### Factos confirmados

- O kit de dano existe em `assets/models/provisional/m01-wagon-damage/`, com `covered/open × burned/damaged × LOD0/1/2`.
- O manifesto exige que a **simulação escolha o vagão e o estado**; o renderer apenas troca o GLB.
- `station_wagon_fire` já é estado persistido em `destruction`.
- A cutscene do bombardeio diz em t=8,5 s: “terceira bomba: pátio da estação; vagão pega fogo”.
- O mapa define `freight_wagons_west` com três pontos:
  - `[-320,0,-6]`
  - `[-340,0,8]`
  - `[-352,0,8]`
- As coberturas existentes são:
  - `cv_wagon_1 = [-318,0,-3]`
  - `cv_wagon_2 = [-338,0,11]`
- Esses pontos não possuem IDs individuais de vagão nem tipo `covered/open`.
- `station_wagon_fire` não identifica qual dos três vagões arde.
- O trem 963 é outro conjunto, a leste, e não deve ser usado como alvo do incêndio do pátio.

### Conclusão

O kit queimado ainda não pode ser ligado sem inventar:
1. qual vagão do pátio é o alvo;
2. qual é o tipo desse vagão.

O facto de `cv_wagon_1/2` estarem próximos de dois pontos não autoriza escolher automaticamente um deles. O terceiro ponto nem sequer tem cover node correspondente.

### Menor desbloqueio necessário

Adicionar um dado autoritativo de missão/simulação, por exemplo:
- três IDs estáveis para os vagões do pátio;
- tipo visual de cada um (`covered/open`);
- `station_wagon_fire` → ID alvo + estado `burned`.

A opção de menor risco para saves é **não criar temporizador nem novo RNG**: derivar o estado visual do evento persistido `station_wagon_fire` + um alvo estático definido no contrato da missão, e expor isso via `renderState`. O renderer continuaria apenas lendo a decisão.

## 3. Trabalho que pode avançar sem risco agora

- Não repetir ckm: outro agente está a fechar a CI integral.
- Não mexer em `main`, publicação, `workflow_dispatch`, M02 ou Graphify.
- Não implementar prone/loader MG34 antes da decisão de roster.
- Não escolher por conta própria qual vagão arde.

Próxima decisão útil para GPT-6.1:
**resolver primeiro o contrato mínimo dos vagões do pátio**, porque `station_wagon_fire` já existe e a solução pode reutilizar estado persistido sem alterar RNG. A MG34 deitada requer uma decisão de roster/postura mais invasiva.
