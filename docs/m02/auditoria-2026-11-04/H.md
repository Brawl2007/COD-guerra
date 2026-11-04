# Auditoria M02 — Secção H «Horizonte e mundo distante»
Fontes: PDF `docs/m02/preproducao/M02-BZURA-PRE-PRODUCAO.pdf` pp. 30–32 (H1–H7).
Código: `origin/gemini/m02-01-quinta` (HEAD 56e98cbf): `src/world/m02-horizon-system.js`, `src/render/m02-01-renderer.js`, `tests/m02-03-area-a-horizon-c01.test.js`, `missions/m02-bzura/m02-cells-bc-layout.json`.
Reuso: `/home/user/COD-guerra/src/render/m01-far-landscape.js`, `src/render/m01-lod-policy.js` (main).
## H1 Geografia antes da cenografia
- Pipeline NMT/WIG/DEM/georreferenciação: EM FALTA (esperado; PDF diz que não existe nesta entrega).
## H2 Quatro camadas
- Limiar L1/L2 de 250 m com histerese: IMPLEMENTADO na sim (ver H5).
- L3 sem dano por proximidade: IMPLEMENTADO (módulo não altera vida do jogador).
- L4 atmosfera: PARCIAL (só `lightingPreset` por T0–T3; sem névoa/dispersão própria).
- Distâncias L3: CONTRADIZ. Silhuetas a ~340 m (Łęczyca) e ~382 m (Tum); eventos HS-A2 a ~324–461 m marcados L3. PDF exige 1,5–8 km.
## H3 Landmarks e setores em 360°
- Azimutes fixos de Tum/Łęczyca antes de GEO-01: CONTRADIZ (`HORIZON_SECTORS_360`: SW=225° Tum, E=90° Łęczyca).
- Łęczyca «sem torre inventada»: CONTRADIZ (renderer cria `leczycaTower` 8×28×8 m).
- Tum como volume provisório: PARCIAL (provisório só em comentário; sem marcador visível; tem torres).
- Armazém B09, vale/canais, quintas distantes: EM FALTA.
- Oito setores de 45°: PARCIAL (dados testados; renderer não usa `HORIZON_SECTORS_360`).
- Filas sem repetição idêntica: PARCIAL (anel de 32 blocos com padrão periódico `i%3`/`i%4`).
- Retaguarda com campos e circulação: PARCIAL (só HS-A3 com 3 carros).
## H4 Guerra distante com estados finitos
- HS-A1 estados e 6 atores com ID/vida/munição: IMPLEMENTADO (sim + teste HZ-01/02). Tarefa e baixa: PARCIAL.
- HS-A2 5 eventos finitos, atraso d/343 m/s, sem loop: IMPLEMENTADO (teste HZ-03; renderer `flash`/`plume`).
- HS-A3 passagem única: IMPLEMENTADO (teste HZ-03).
- HS-B1 combate urbano: PARCIAL (estado por flags; `maxFlashes` sem uso; sem renderer; sem mensageiro).
- HS-C1 LG01–LG12 a 70–110 m: PARCIAL (IDs em `linkedRosterIds`; sem distância; renderer não lê `hsC1`).
- HS-C2 impacto com ID único: PARCIAL (`impactId`/`detonatedOnce`; sem dano residual; renderer não lê `hsC2`; teste de não-repetição só para HS-A2).
- Movimento como compressão visual, sem reiniciar ao olhar: IMPLEMENTADO (HS-A2).
- Ator distante com identidade completa, sem billboard: IMPLEMENTADO (renderer usa malha de soldado).
- Despromoção só fora de interação relevante: CONTRADIZ (só por distância ≥268 m).
## H5 LOD, terreno e impostores
- Histerese ~15% (230/268 m): IMPLEMENTADO na sim (banda 38 m ≈ 15,2% de 250 m; a confirmar).
- Fade de 0,3 s: EM FALTA no horizonte (renderer não faz fade; `selectLodBand` M01 não usado para HS-A1).
- Impostores de edifícios, segmentos de terreno, pré-carregamento, frustum culling, oclusão, dithering: EM FALTA.
- Fumo reduz partículas sem mudar posição: PARCIAL (plume estático de 2 primitivas).
- Cobertura com colisão em todos os LODs: EM FALTA (não verificado).
## H6 Evolução temporal
- Estados T0–T3 com etiquetas e luz: IMPLEMENTADO (sim + renderer + teste HZ-01).
- Persistência do estado temporal em snapshot: IMPLEMENTADO.
- Etiquetas coerentes sim/renderer: PARCIAL (T3 «Eixo de Leśmierz» vs «Fumo denso»).
- Ju 87 fora do plano base (#58): IMPLEMENTADO (ausência verificada por `git grep`).
- Fumo residual entre células: PARCIAL (só em HS-A2).
## H7 Prova panorâmica
- Pontos P1–P5: PARCIAL. P4 (0,0) e P5 (-6,-10) em `m02-cells-bc-layout.json`; P1 só como spawn; P2 e P3 ausentes.
- Oito vistas de 45°, equirretangular e vídeo: EM FALTA.
- 60 conjuntos (5×4×3) e slice 30: EM FALTA (teste só conta setores e estados).
- Aproximação/recuo, checkpoint, frame time: EM FALTA.
## Reuso M01 (possível)
- `m01-lod-policy.js` (`selectLodBand`, 0,15, fade 0,3 s): reuso recomendado para H5.
- `m01-far-landscape.js`: coordenadas e torre Lisewo são M01; reutilizar só o padrão (geometria fundida, envelope fail-closed, névoa para L4).
