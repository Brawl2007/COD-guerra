# M01 — Pass Ferroviário Re-baseado (T24 · `M01-TRAIN-ARRIVAL-AND-LIFE-V1` / BX-07)

Este documento consolida e re-baseia a arquitetura ferroviária da Missão 01 (Tczew, 1 de Setembro de 1939) sobre o HEAD da `codex/m01-final-production-consolidation-v7`, fechando as decisões **D1 a D10** conforme o **Anexo B (`B3`)** de `docs/M01_FINAL_ROADMAP.md`.

## 1. Fecho das Decisões D1–D10 (Anexo B · B3)

| ID | Tópico | Decisão Fechada (Anexo B · B3) | Implementação no Código |
| :--- | :--- | :--- | :--- |
| **D1** | Re-base na V7 | **Sim** | Preserva `M01Locomotive`, `M01Panzerzug`, `M01TrainWagons` e `M01TrainConsistDetail` (`m01-train-detail-coupling-polish-v1`). |
| **D2** | Re-autoria de LOD0 da locomotiva/Panzerzug | **Adiado** | Mantém os GLBs atuais (`m01_locomotive_freight_lod0..2.glb` e `m01_panzerzug_visual_lod0..2.glb`) e os proxies de segurança. |
| **D3** | Chegada cinemática, lanternas e fornalha | **Sim** | `trainX(battleClock)` (`04:43:30 -> 04:45:00`) e `panzerzugX(battleClock)` (`04:51:00 -> 04:52:00`) estritamente monótonos, com paragem exata nas âncoras autoritativas (`[1075, 0, -2.5]` e `[1119, 0, 2.5]`), lâmpada frontal `fog: false` e brilho da fornalha (`firebox`). |
| **D4** | Preservação dos 65 vagões autoritativos | **Sim** | `M01_TRAIN_WAGON_PLAN` (`65` vagões em `x = 1090 + i * 9.1`, `z = -2.5`) permanece 100% inalterado; o deslocamento de chegada é zero a partir das `04:45:00`. |
| **D5** | Orçamento de draw calls ferroviários | **Sim (`<= 12`)** | `M01_TRAIN_DETAIL_BUDGET.drawCalls = 12` respeitado; lanternas e fornalha fundidas num único mesh com `vertexColors: true` (1 draw call). |
| **D6** | Fumo de carvão e vapor em pool com tectos | **Sim (`12/18/24`)** | Emissores integrados no pool `this.puffs` de `M01Atmosphere` (0 draw calls extra) com tectos de `12` (`low`), `18` (`medium`) e `24` (`high`). |
| **D7** | Coluna de fumo do Panzerzug 7 | **Sim** | Coluna dedicada sobre a locomotiva blindada do Panzerzug em `(panzerzugX(clock) + 38, 4.2, 2.5)`. |
| **D8** | Manobra parada a oeste | **Sim** | Emissor subtil de vapor/fumo estacionário no pátio da estação oeste (`x = -292, y = 3.6, z = -18`). |
| **D9** | Sons `veh.train.*` com atraso acústico | **Sim** | Eventos `veh.train.approach`, `veh.train.chuff`, `veh.train.clatter`, `veh.train.brake_squeal`, `veh.train.steam_blowdown`, `veh.train.whistle`, `veh.train.panzerzug_arrive` e `veh.train.panzerzug_horn` com atraso físico `distance / 343 m/s`. |
| **D10** | Alinhamento vertical com o topo do carril | **Sim (`-0.82 m`)** | Mantém o topo do carril a `-0.82 m` (`M01_TRAIN_TRACK.railTop`) e o abatimento de roda `M01_WAGON_TREAD_AT_RAIL = 0.0125 m` (`-0.8325 m`). |

## 2. Equações de Chegada Determinística

- **Comboio 963 (`04:43:30` = `17010 s` $\rightarrow$ `04:45:00` = `17100 s`)**:
  $$\Delta x_{963}(t) = \begin{cases} 360, & t \le 17010 \\ 360 \cdot \left(1 - \frac{t - 17010}{90}\right)^2, & 17010 < t < 17100 \\ 0, & t \ge 17100 \end{cases}$$
  $$x_{963}(t) = 1075 + \Delta x_{963}(t), \quad v_{963}(t) = 8.0 \cdot \left(1 - \frac{t - 17010}{90}\right)\text{ m/s}$$

- **Panzerzug 7 (`04:51:00` = `17460 s` $\rightarrow$ `04:52:00` = `17520 s`)**:
  $$\Delta x_{\text{PZ}}(t) = \begin{cases} 240, & t \le 17460 \\ 240 \cdot \left(1 - \frac{t - 17460}{60}\right)^2, & 17460 < t < 17520 \\ 0, & t \ge 17520 \end{cases}$$
  $$x_{\text{PZ}}(t) = 1119 + \Delta x_{\text{PZ}}(t), \quad v_{\text{PZ}}(t) = 8.0 \cdot \left(1 - \frac{t - 17460}{60}\right)\text{ m/s}$$
