# M23 — CERCADOS (bosque a sul de Foy; Foy) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M23-BASTOGNE-FOY-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** três atos em três datas com snapshots; Foy só em janeiro; nenhuma figura da Companhia E; setor da Cia. I, largadas e atribuição E/I são P-C23.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | bosque a sul/sudeste de Foy, a leste da estrada Foy–Bastogne; a estrada de retaguarda; Foy (≈ 50,03 N 5,72 E); 23 e 26/12/1944, 13/1/1945 |
| Classe global | Foy (quintas, igreja), a estrada e o bosque `EXACT` em traçado (Overture); a linha da esquadra, o posto avançado, o ponto de recolha de contentores, a quinta do posto de socorro e o pátio do flanco leste `RECONSTRUCTED` (P-C23) |
| O que medir depois | Overture (Foy, a N30, o bosque — Bois Jacques/Bois de Foy), DEM (o campo entre o bosque e Foy), mapas da 101.ª (setores E/I; DZ das largadas de 23/12) |
| Origem proposta | o buraco de Bennett e Shaw na linha do bosque (Atos I–II): `(0, 0, 0)`; Ato III: a orla de partida virada a Foy |
| Eixos | metros; X+ leste, Y+ altura, Z+ sul; Foy a norte (−Z, 400–600 m) |
| Área jogável | Ato I: linha 50 m + posto avançado 150 m à frente + campo de trás 300 m; Ato II: a linha + estrada de retaguarda (200 m atrás) + quinta do posto a 400 m; Ato III: orla + campo de 400 m + flanco leste de Foy (quintas, celeiro, pátio, cave) |
| Compressões declaradas | o DZ das largadas fica fora do mapa (os contentores "desviados" caem no campo de trás): declarado; o campo até Foy em escala real (400 m) |
| Relógio | 23/12 09:30→16:30 (+ noite) · 26/12 15:00→27/12 01:00 · 13/1 08:00→13:00 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 20 m)

```
     N        ⌂ FOY: igreja (silhueta, leste) · quintas · celeiro · PÁTIO com cave (flanco direito/leste, 13/1)
   ┌───────────────────────────────────────────────────────────────────────────────────────┐
   │ CAMPO BRANCO 400 m (13/1): depressão a meio · cerca · monte de estrume · MG numa quinta │
   └───────────────────────────────────────────────────────────────────────────────────────┘
   ♠♠♠ ORLA (13/1: lençóis; Ferraro chega) ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠
   ♠♠ [POSTO AVANÇADO: Ritter] 150 m à frente ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠
   ♠♠♠♠♠ LINHA DA ESQUADRA: 6 buracos com troncos ⊙ (0,0,0) · fogo de lata · Vogel ♠♠ pelotão E/W ♠♠♠
   ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠ caminho de suprimento ⇓ ♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠♠
   ═══ ESTRADA FOY–BASTOGNE (retaguarda, 200 m atrás) ═══╬═══ CRUZAMENTO (26/12) ═══ colunas à noite ⇒
   · · · CAMPO DE TRÁS (23/12): contentores desviados (um seguro, um à vista do morteiro) · · · · · · ·
   · · · · · · · · · · · · · [QUINTA: posto de socorro do batalhão, 400 m] · · · ⇓ Bastogne (s8: corredor por relato)
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_line_woods` | perto (23 e 26/12) | buracos, lona, o fogo de lata | agenda |
| `s2_outpost` | perto (23/12) | o buraco duplo na orla com vista para o campo | — |
| `s3_rear_field` | perto (23/12) | contentores, paraquedas ao longe | 11:20 |
| `s4_rear_road` | perto (26/12) | cruzamento, quinta do posto | 15:00 → 01:00 |
| `s5_foy_field` | perto (13/1) | campo, depressão, cerca, estrume | 09:00 |
| `s6_foy_east` | perto (13/1) | quintas, celeiro, pátio, cave | 10:30 → 13:00 |
| `s7_mid` | médio | pelotão, a outra companhia (sem rosto), colunas na estrada, perímetro | sim |
| `s8_far` | longe | artilharia, C-47 (23/12), o corredor a sul por relato, Noville | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | linha (cs intro: quem tem o que) | 0 | 23/12 09:30 | — |
| 2 | linha → posto avançado (munição) → campo de trás (contentor a dois) | 150 + 300 m | 09:45–12:30 | `obj_m23_supply_run`, `obj_m23_watch_drops`; CP-A |
| 3 | linha: duas sondas; Munro ao ponto de recolha pelo caminho de suprimento | 120 m | 13:30–16:30 | `obj_m23_hold_stretch`, `obj_m23_wounded_back`; CP-B |
| 4 | o buraco (cs night) | 0 | noite | — |
| 5 | linha → cruzamento da estrada (posicionar; sonda) ⇄ quinta do posto (opcional, Ritter) | 200 + 400 m | 26/12 15:00–18:30 | `obj_m23_hold_road`, `obj_m23_aid_station`; CP-C |
| 6 | orla (cs day13: lençóis; Ferraro) | 0 | 13/1 08:00 | CP-D |
| 7 | orla → campo em movimento → caminho de leste (flanco) → celeiro | 400 + 150 m | 09:00–10:30 | `obj_m23_approach`, `obj_m23_right_flank`; CP-E |
| 8 | pátio: consolidar; os rendidos; a cave | 40 m | 10:30–12:30 | `obj_m23_consolidate`, `obj_m23_pows`; CP-F |
| 9 | abrigo (cs outro: as luvas) | 0 | 12:30–13:00 | — |

## 5. Rotas alternativas e decisões espaciais

- **O céu** (cena 2): recolher o contentor seguro (esquerda) vs tentar o exposto (Ingram proíbe; morteiro ≥ 30 m).
- **Cinquenta metros** (cena 3): posição por buraco; entre sondas, mexer os pés (estado, sem punição); carregar Munro a dois pelo caminho de suprimento.
- **A estrada** (cena 5): um homem na valeta, outro na quinta; ir ao posto de socorro com Vogel (vê Ritter no camião: `evacuated_wounded`) ou ficar (`missing` para Bennett).
- **O campo** (cena 7): atravessar em movimento com duas pausas reais (depressão, estrume); flanquear a MG pelo caminho de leste (sebe) vs correr direto.
- **Os rendidos** (cena 8): abrir a cave e dar passagem vs calar-se (Ingram decide em 15 s).

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| buracos com troncos | cobertura total | neve nova entre datas |
| orla/posto avançado | buraco duplo; troncos | vê o campo de Foy (400 m) |
| campo de trás | nenhuma | o contentor exposto está à vista de um morteiro |
| cruzamento/valeta/quinta | valeta 0,8 m; muros da quinta | vê a estrada 150 m para cada lado |
| campo branco | depressão a meio, cerca, monte de estrume | a MG da quinta vê o campo inteiro |
| quintas de Foy | pedra, celeiro, muro, cave | recuo casa a casa para o centro |

Linhas de visão: MG da quinta → campo (400 m); orla → campo; cruzamento → estrada; o pátio → caminho para o centro (100 m). Regra: parar no campo > 8 s chama o morteiro; a IA não vê através do bosque nem das quintas.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| frio | nunca dano ao jogador; o frio é dos NPCs e das escolhas |
| sondas (23/12 14:00; 15:30; 26/12 15:30; 17:20) | pela orla e pelo bosque à direita; 50–200 m |
| Munro (15:40) | ferimento fixo na perna |
| morteiros | sobre o contentor exposto; sobre quem pára no campo (13/1) > 8 s; sempre ≥ 30 m e com aviso |
| C-47 e colunas blindadas | nunca interativos; só ao largo/atrás |
| rendidos | nunca alvo da IA aliada; disparar tem custo |
| limites | Foy além do flanco leste (centro: nunca); Bastogne (só relato); o DZ (fora do mapa) |

## 8. Encenação e objetos por zona

- **Linha** (cs intro): buracos com ramos, fogo de lata, caixa de rações vazia, o cobertor partilhado; as luvas no cinto.
- **Posto avançado**: meias nas mãos de Ritter; duas caixas.
- **Campo de trás**: paraquedas coloridos ao longe (código P-C23), o contentor com fita.
- **Buraco** (cs night): a luva na mão; neve pela abertura.
- **Cruzamento/posto**: rodados novos; o camião da evacuação; cobertores ensanguentados.
- **Orla 13/1** (cs day13): lençóis, galochas de morto, caixas cheias, o mapa de Foy a lápis.
- **Pátio/cave**: prisioneiros sentados, a porta da cave, dois cobertores; **abrigo** (cs outro): as luvas calçadas; a bolsa de Vogel.
- Persistentes por data: buracos de morteiro na neve, o celeiro, o muro; snapshots (Munro/Ritter ausentes; Ferraro presente).

## 9. Luz, tempo e som por zona

Sol calculado (50,03 N 5,72 E, UTC+1; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 23/12 09:30 | 138° | 6° | céu limpo; sol baixo e límpido; sombras longas azuis |
| 12:30 | 178° | 17° | — |
| 15:30 | 219° | 7° | âmbar → azul; pôr do sol ≈ 16:35 |
| 26/12 15:00 | 213° | 10° | cinzento; neve |
| 17:00 | 237° | −3° | noite a cair; colunas atrás às 20:00+ |
| 13/1 08:00 | 118° | −5° | branco difuso; nascer ≈ 08:35 |
| 13:00 | 183° | 18° | meio-dia branco sem sombras |

Som: linha (vento sobre madeira; neve a ranger; fogo de lata), céu (C-47 em formação; AA ao longe; paraquedas), sondas (Garands abafados), noite (neve a cair; a respiração de Shaw), 26/12 (rádio com interferência; colunas e camiões ao longe), posto de socorro (camião; Vogel), 13/1 (lençóis; preparação; a MG abafada pela quinta; dentes a bater no pátio), abrigo (ligadura; vento na porta).

## 10. Requisitos de produção do nível

- **Tamanho:** três tiles no mesmo lugar com três estados (bosque 300 × 200 m; retaguarda 400 m de caminho + cruzamento + quinta; campo 400 m + flanco leste de Foy 200 × 150 m).
- **Assets:** buracos com troncos, pinhal nevado, contentores e paraquedas, estrada com rodados, quinta ardenesa (posto), lençóis, campo nevado com depressão/cerca/estrume, quintas de Foy, celeiro, pátio, cave, igreja (silhueta), C-47 e Sherman (NPC).
- **Sistemas (roadmap S2 [D]/S5/S14/S3):** três snapshots; neve com pegadas e capas; C-47/colunas NPC; `SURRENDERED` em lote.
- **Risco:** 5. **Fallback:** pegadas pré-cozidas; cena encenada na cave; C-47 como som + 2D.
- **Medir primeiro:** o bosque a sul de Foy e o campo até às quintas (Overture/DEM); setores E/I e DZ (P-C23).
