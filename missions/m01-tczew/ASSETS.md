# M01 — Lista de assets (fonte, licença e escala)

Dados: [`assets-m01.json`](assets-m01.json) · Ficha da arma: [`../../research/weapons/kb_wz29.md`](../../research/weapons/kb_wz29.md)

**Estado:** lista de necessidades. As duas pontes e o portal de Lisewo têm modelos originais **provisórios verificados**, com três LODs, colisores e estados de demolição por ID. Ver [relatório das pontes](BRIDGE_ASSET_REPORT.md) e [capturas/visualizador](../../docs/assets/m01-bridges/README.md). M01 continua **PROTÓTIPO JOGÁVEL**; partidas contínuas automáticas estão documentadas, mas falta playtest humano.

Os candidatos de terceiros continuam pendentes de importação e verificação directa:
- O Sketchfab respondeu com desafio anti-bot (WAF) e ambientCG e Poly Haven estavam bloqueados.
- Os candidatos e as licenças abaixo vêm de **resumos de busca** e estão marcados `licenseVerified: false` e `scaleVerified: false`.

## Convenções

| Regra | Valor |
| --- | --- |
| Escala | **1 unidade = 1 metro** |
| Eixos | +Y para cima; frente em −Z (câmera Three.js); armas com o cano para −Z |
| Formato | glTF 2.0 `.glb`; texturas PNG ou KTX2 |
| Aceitação de escala | Medir a bounding box após importar; deve bater com a dimensão real em ±2 %. Corrigir a escala uma vez, na importação. |
| Créditos | Cada asset de terceiros entra em `ASSET_CREDITS.md` com autor, URL, licença e data. |

## Política de licenças (repositório público)

| Situação | Licenças |
| --- | --- |
| ✅ Permitido | Original do projeto · CC0 / domínio público · CC-BY (com crédito) |
| ⚠️ Condicional | CC-BY-SA: só se o projeto aceitar compartilhar o derivado sob a mesma licença |
| ❌ Proibido | CC-BY-NC · CC-BY-ND · licenças de loja "royalty free" que proíbem redistribuir o arquivo (Sketchfab Store, CGTrader) · uso editorial · qualquer asset extraído de jogos |

Pôr um `.glb` no Git é **redistribuí-lo**. Por isso, até um modelo pago com licença de uso em jogo fica fora deste repositório.

## Lista

Prioridades:
- **P0** — necessário para o protótipo jogável de M01;
- **P1** — polimento;
- **A PRODUZIR** — original;
- **A VERIFICAR** — candidato de terceiros.

| Asset | Prioridade | Dimensões de referência | Estratégia | Candidatos (licença declarada) | Estado |
| --- | --- | --- | --- | --- | --- |
| Ponte ferroviária 1891/1912 | P0 | 1030–1037 m; 6 × 129 m (lenticulares) + 3 × 81,6 m; via dupla; pilares em `map-layout.json` | **Original**, kit modular instanciável com estados de dano das 06:10 e 06:45 | *Railway Bridges Pack 01* (Szakal, CC-BY) — só placeholder, treliça diferente | FINAL A PRODUZIR · [provisório verificado, 3 LODs](BRIDGE_ASSET_REPORT.md) |
| Ponte rodoviária Lentze 1857/1912 | P0 | 6 × 130,9 m + 3 × 81,6 m; vigas de 8,68 m a 6,43 m entre si; 5 pares de torres de ~23 m, Ø 5,3 m | **Original**: vão Lentze, par de torres, portal oeste de Stüler, antigo portal leste | — (fotos da Skarbnica só como referência) | FINAL A PRODUZIR · [provisório verificado, 3 LODs](BRIDGE_ASSET_REPORT.md) |
| Estação de 1939 (Stüler) | P1 | Contorno pendente (P4) | **Original**, fachada de média distância com dano | — | depois de P4 |
| Ju 87 B-1 | P0 | 11,1 × 13,8 × 4,24 m | CC-BY ou original; conferir variante **B** (não D/G) | scorpion81 · manilov.ap · philano · helijah (todos CC-BY, não verificados: Sketchfab com WAF); museu @wwIImuseum só como referência | [provisório original verificado em galeria](../../docs/assets/m01-aircraft/README.md): B-1 ligado aos três aviões do primeiro raid, 3 LODs, hélice pelo relógio; freios disponíveis no kit, medidas estimadas marcadas |
| Locomotiva do trem 963 | P1 | Classe desconhecida (P16) | **Original** genérica da época | BR 52 (rejeitada: 1942) · BR 01 (rejeitada: expresso) | depois de P16 |
| Vagões (65) | P1 | ~9–10 m entre para-choques (a confirmar) | **Original**, 2–3 tipos instanciados com portas de correr | — | [provisório original verificado](../../docs/assets/m01-wagons/README.md): coberto (portas de correr) e aberto, 9,10 m entre tampões, genéricos até P16 |
| Panzerzug 7 | P1 | 2 × 7,5 cm + 2 × 2 cm antiaéreos (T20) | **Original**, silhueta a ~1,1 km | — | depois de P6 |
| Soldado polonês 1939 (rig) | P0 | 1,65–1,85 m; wz.36 ou anterior, capacete wz.31, *rogatywka* wz.37, patches azul-marinho com vivo verde-claro | **Original** modular (cabeças e peças trocáveis, Prompt §6–8) | *Polish soldier* (buh, CC-BY): verificar época e rig · capacete wz.31 da CGTrader: **rejeitado** (licença de loja) | FINAL A PRODUZIR · [provisório verificado: 8 cabeças, wz.31/rogatywka, 3 LODs, 25 clips](../../docs/assets/m01-soldiers/README.md) |
| Soldado alemão 1939 (rig) | P1 | 1,65–1,85 m; M35, M36; Grenzwacht pendente (P7) | Corpo original + capacete CC0/CC-BY | *WW2 headwear* (britdawgmasterfunk, **CC0**) · *Stahlhelm M35* (PL_historyfan_K, CC-BY) · *M35 Stahlhelm* (Cyril Demetrius, CC-BY) | [provisório original verificado](../../docs/assets/m01-soldiers/README.md) (M35 próprio, sem decalques); Grenzwacht pendente (P7) |
| Kar98k (inimigos) | P1 | ~1,11 m, alavanca **dobrada** | CC-BY ou original | Dima_Biliakkk (CC-BY) · The Unknown... (CC-BY) | [provisório original](../../docs/assets/m01-soldiers/README.md): modelo de mundo de 1,11 m com ferrolho animável |
| **kb wz.29 (jogador)** | P0 | 1,10 m; cano 0,60 m; 4,0 kg; alavanca **reta** | **Original** (ViewModel ≤ 12 k triângulos) | TomPL (mod de BF1942, sem licença) — só referência | ViewModel A PRODUZIR · [modelo de mundo provisório](../../docs/assets/m01-soldiers/README.md) (1,10 m, alavanca recta, clipe de 5) |
| rkm wz.28 (Kowal) | P1 | 1,11 m; cano 0,611 m; 9,0 kg; carregador de 20; bípode no tubo de gases com patins (T31) | **Original** | — | FINAL A PRODUZIR · [provisório verificado](../../docs/assets/m01-soldiers/README.md): carregador e alavanca animáveis, bípode aberto/dobrado, 10 clips `rkm_*` ([ficha](../../research/weapons/rkm_wz28.md)) · [arma isolada](../../docs/assets/m01-rkm-wz28/README.md): 3 LODs, sockets e clips de transporte, pontaria e rajada |
| MG 34 (alemães) | P1 | 1,219 m; cano 0,627 m; 12,1 kg; 800–900/min; tambor de cinta de 50 à esquerda; manga perfurada (T33) | **Original**; **não** MG 42 | — | FINAL A PRODUZIR · [provisório verificado](../../docs/assets/m01-mg34/README.md): 3 LODs, tampa, alavanca, tambor e cinta animáveis, clips `mg34_aim`, `mg34_fire_burst` e `mg34_reload` ([ficha](../../research/weapons/mg34.md)) |
| kb wz.98a (Bąk) | P1 | 1,25 m; cano 0,74 m; 4,4 kg; alavanca recta (T32) | **Original** | — | FINAL A PRODUZIR · [provisório verificado](../../docs/assets/m01-soldiers/README.md) com os clips das espingardas ([ficha](../../research/weapons/kb_wz98a.md)) |
| ckm wz.30, Vis wz.35, granada wz.33 | P1 | A levantar (H30) | **Original** | — | A PRODUZIR (coldre da Vis já no equipamento `nco`) |
| Materiais PBR | P0 | Aço rebitado, tijolo, cantaria, lastro, terra/lama, grama seca, sacos de areia, madeira velha, água | **CC0** (ambientCG, Poly Haven) | Bibliotecas inteiras CC0 (licença declarada pelas plataformas) | A ESCOLHER |
| Céu / HDRI | P1 | Crepúsculo civil (Sol a −3°, faixa clara a ENE) e manhã | CC0 ou procedural | Poly Haven (CC0) | A ESCOLHER |

Links completos e orçamentos de triângulos estão em `assets-m01.json`.

## Checklist para aceitar um asset de terceiros

1. Abrir a página do asset e **copiar a licença exata**. Recusar NC, ND e licenças de loja.
2. Baixar e importar; medir a bounding box; comparar com `realDimensions` (±2 %).
3. Conferir a época: variante, insígnias e equipamento de 1939 (`research/equipment-timeline.json`).
4. Conferir orientação (+Y para cima, frente em −Z), pivô e escala aplicada na importação.
5. Conferir o orçamento de triângulos e texturas; gerar LODs.
6. Registrar em `ASSET_CREDITS.md`: autor, URL, licença, data e alterações feitas.
7. Política de símbolos históricos (insígnias) definida antes de publicar.
