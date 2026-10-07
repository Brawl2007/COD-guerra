# Assets binários necessários após a V4 textual

Este PR mantém apenas código e assets de texto. Os modelos `.obj/.mtl` atuais e o áudio procedural são placeholders originais e redistribuíveis. Os seguintes assets deverão ser produzidos ou licenciados antes de uma versão de produção:

| Nome | Tipo | Finalidade | Caminho esperado |
| --- | --- | --- | --- |
| M1 Carbine final | GLB | Modelo final da arma, mãos, rig e clips de tiro/recarga | `assets/models/production/m1-carbine.glb` |
| Soldado aliado final | GLB | Humanoide aliado com esqueleto, equipamento e animações | `assets/models/production/allied-rifleman.glb` |
| Soldado inimigo final | GLB | Humanoide inimigo com esqueleto, uniforme e animações | `assets/models/production/axis-rifleman.glb` |
| Materiais da aldeia | PNG/KTX2 | Albedo, normal e roughness para pedra, tijolo, madeira, terra, metal e tecido | `assets/textures/production/` |
| Disparo M1 | WAV/OGG | Disparo próximo e variações distantes | `assets/audio/production/m1-shot.ogg` |
| Recarga M1 | WAV/OGG | Magazine, ferrolho e manuseio da arma | `assets/audio/production/m1-reload.ogg` |
| Impactos | WAV/OGG | Variações para madeira, pedra, metal e terra | `assets/audio/production/impacts/` |
| Explosão de granada | WAV/OGG | Explosão próxima e cauda distante | `assets/audio/production/grenade-explosion.ogg` |
| Ambiente de guerra | WAV/OGG | Artilharia, metralhadoras, aviões e explosões distantes | `assets/audio/production/ambience/` |
| Vozes de esquadrão | WAV/OGG | Ordens, alertas, granadas, avanço e contato | `assets/audio/production/voices/` |

Todos os arquivos futuros deverão possuir autoria original ou licença compatível documentada antes de serem adicionados ao repositório.

## M01 — Tczew (1939)

Ainda não adquiridos, modelados nem licenciados. Referências históricas constam em `missions/m01-tczew/` e `research/`; fotografias de arquivo servem de referência, sem autorização automática para redistribuição.

| Asset | Requisito | Estado / dependência |
| --- | --- | --- |
| Karabinek wz.29 e braços | Modelo próprio, cinco tiros, ferrolho após tiro, clipe, sockets e animações; sons próprios | Pendente; não adaptar o modelo M1 |
| Pontes ferroviária e rodoviária | Treliças, torres, portais, encontros e estados de destruição separados; metros e colisores coerentes | P1/P4/P5 e fotografias verificadas |
| Trem 963 e Panzerzug 7 | Locomotiva/vagões, LOD com identidade persistente e armamento correcto de 1939 | P6 |
| Poloneses de 1939 | Uniformes, wz.31/wz.37, equipamento e rig humano; clips de cobertura, ferido e arrasto | P3 e autoria/licença |
| Grenzwacht e pioneiros alemães | Uniforme/equipamento de 1939, MG34/Kar98k, sem MP40/MG42 | P7/P8 |
| Ju 87 | Variante de 1939, escala, trajectória e som próximo/distante | Fonte e licença pendentes |
| Vozes e sons de M01 | IDs de falas, gravações licenciadas, wz.29, ponte, comboio e ambiente | Pendente; sem clone de voz histórica. Lista de IDs, patamares de carregamento e ordem de produção em `docs/M01_AUDIO_PRODUCTION_PLAN.md` (§2.1, §9.3, T4) |
