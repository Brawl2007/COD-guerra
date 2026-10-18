# M30 — SILÊNCIO (USS Missouri; quatro epílogos) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M30-TOKYO-BAY-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** sem combate; o jogador nunca acede à mesa; planta do convés ("veranda" vs principal), locais dos epílogos e licenças são P-C30.

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | USS Missouri (BB-63) ancorado na Baía de Tóquio (≈ 35,43 N 139,72 E); 2/9/1945; epílogos em Tczew, um campo de refugiados polacos, Okinawa e uma cidade europeia em reconstrução (setembro de 1945) |
| Classe global | o navio `EXACT` (plantas do Iowa-class; o Missouri é museu); a cerimónia `DOCUMENTED` (S-C25); a área acessível a Cross `RECONSTRUCTED`; epílogos `RECONSTRUCTED` com locais pendentes |
| O que medir depois | planta do convés 01 a estibordo e do convés principal (P-C30); fotografias da cerimónia (posição da mesa, da bandeira de Perry, das multidões nas torres); Tczew em setembro de 1945 (pontes); locais dos campos de refugiados polacos; onde estava a 101.ª em setembro |
| Origem proposta | o pé de guarda-corpo que Cross confere primeiro, a estibordo no convés principal: `(0, 0, 0)` |
| Eixos | metros; X+ proa, Y+ altura, Z+ estibordo (o navio como referencial; norte real a fixar pela ancoragem) |
| Área jogável | convés principal a estibordo 30 m (X 0…+30, Z 0…+6); escada para o nível 01 (+4 m); passagem do nível 01 com três posições (X +20…+45); a veranda a 15–25 m (**nunca** acessível); epílogos: quatro cenas de 20–40 m cada |
| Compressões declaradas | nenhuma no navio; os epílogos são cenas pequenas com cartela de lugar/data |
| Relógio | 07:30 → 10:30; epílogos sem relógio (cartelas) |

## 2. Planta esquemática (vista de cima, proa à direita; 1 carácter ≈ 2 m)

```
   bombordo
   ┌──────────────────────────────────────────────────────────────────────────────────────────┐
   │  torre III    superestrutura (marinheiros em todas as superfícies)   torre II   torre I  │
   │                     ┌───── NÍVEL 01 (+4 m) ─────────────────────────────┐                │
   │                     │  VERANDA (estibordo): MESA (pano verde) · cadeiras │  ⟵ 15–25 m     │
   │                     │  bandeira de Perry na antepara · microfones        │  (nunca)        │
   │                     │  cordas ‖ GUARDA ‖ PASSAGEM: ◉ ◉ ◉ três ângulos ◄──┼──── escada      │
   │                     └────────────────────────────────────────────────────┘      │         │
   │  CONVÉS PRINCIPAL a estibordo: ⊙ pé de guarda-corpo (0,0,0) · 5 encaixes · pano · amurada │
   └──────────────────────────────────────────────────────────────────────────────────────────┘
   estibordo ≈≈≈≈≈≈≈≈≈≈≈≈≈≈ BAÍA DE TÓQUIO: frota (s4); passagem aérea 09:26–09:40 ≈≈≈≈≈≈≈≈≈≈≈≈≈≈
   ·····································································································
   EPÍLOGOS (mapa-mundo sem setas, ordem livre):
   e1 TCZEW — estação; carris; as pontes destruídas ao fundo; Lipski (Krawiec e a caneca: variante [C])
   e2 CAMPO DE REFUGIADOS — tenda; envelope manchado (só com m16.*)
   e3 OKINAWA — tenda-hospital; Gray; Marsh com a carta; a cama vazia
   e4 CIDADE EM RECONSTRUÇÃO — abrigo com parede caída; tábuas; a mão enfaixada; (Ferraro e as luvas, condicional)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_main_deck_stbd` | perto | 30 m de convés, 5 encaixes, a chave, o pano, a amurada | 07:35 → 08:45; 09:30+ |
| `s2_passage_01` | perto | a passagem com três ângulos, a guarda, as cordas | 08:45 → 09:40 |
| `s3_veranda` | médio (15–25 m) | a mesa, os de longe (sem rostos em grande plano), a bandeira | agenda 08:56 → 09:25 |
| `s4_ship_far` | longe | torres e superestrutura cheias, a frota, a passagem aérea | relógio |
| `e1…e4` | epílogos | quatro lugares com objetos por flag | ordem livre |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | o encaixe (cs intro: água, metal, passos) | 0 | 07:30 | — |
| 2 | convés: conferir 5 encaixes; apertar um; entregar o pano na escada; olhar a frota | 60 m | 07:35–08:45 | `obj_m30_prepare`; CP-A |
| 3 | passagem do nível 01: três ângulos; a cerimónia; a passagem aérea | 25 m | 08:45–09:40 | `obj_m30_observe`; CP-B |
| 4 | descer; caminhar até à amurada | 40 m | 09:30–10:00 | `obj_m30_walk` |
| 5 | epílogos: e1–e4 em qualquer ordem | 20–40 m cada | — | `obj_m30_epilogues`; CP-C |
| 6 | a amurada (cs rail: a mão que não toca) | 0 | 10:00 | — |
| 7 | e4 retomado (cs outro: "Vamos começar por esta parede.") + créditos | 0 | — | `m30.completed`, `campaign.completed` |

## 5. Rotas alternativas e decisões espaciais

- **Preparação:** só a ordem das tarefas.
- **Cerimónia:** três ângulos (junto da escada; junto do guarda-corpo; atrás de um marinheiro mais alto, com visão parcial) — muda o que se vê, nunca o que acontece.
- **Epílogos:** a ordem de visita; rever não altera flags.

## 6. Cobertura, linhas de visão e referências

- Não há cobertura nem inimigo. As **linhas de visão** são o desenho: da passagem à mesa (15–25 m; as costas dos que assinam), das torres para o convés (a escala), da amurada para a baía e a frota, do convés para o céu (a passagem aérea por vagas).
- Referências do navio: os encaixes de guarda-corpo (a tarefa), a escada, as cordas e a guarda (o limite), a bandeira de Perry (ao contrário), o pano verde.

## 7. Zonas de segurança e limites

| Zona | Regra |
| --- | --- |
| a veranda | nunca acessível (cordas e guarda; um aviso, sem punição) |
| armas | nenhuma no inventário; nenhum input de disparo com efeito |
| bordas do navio | amurada; sem queda |
| epílogos | sem dano; sem falha; skip por epílogo sem desbloqueio duplicado |

## 8. Encenação e objetos por zona

- **Convés** (cs intro): o pino do encaixe, a chave, o pano verde dobrado; a frota.
- **Passagem**: cordas, a guarda; a mesa, a bandeira ao contrário, a cartola (vistos de longe).
- **Amurada** (cs rail): a mão que pára antes do encaixe.
- **e1 Tczew**: carris, carroça, lanterna apagada, as pontes destruídas; (a caneca no parapeito, variante).
- **e2 campo**: tenda, envelope manchado (condicional).
- **e3 Okinawa**: lona, macas, a cama vazia (cartela de Cole), papel novo e a carta enlameada.
- **e4 cidade**: parede caída, tábuas, a mão enfaixada; (as luvas, condicional).

## 9. Luz, tempo e som

Sol calculado (35,43 N 139,72 E, UTC+9; a validar — manhã encoberta, o sol rompe depois da cerimónia):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 07:30 | 99° | 27° | encoberto; luz plana |
| 09:00 | 117° | 44° | encoberto |
| 09:30 | 124° | 50° | o sol rompe; a passagem aérea |
| 10:30 | 145° | 58° | a água com brilho |

Som: convés (**água → metal → passos**; a chave no pino), preparação (pano; cabo; milhares em superestrutura), cerimónia (**multidão em silêncio**; vento; a voz abafada sem palavras por defeito; a passagem aérea por vagas), intervalo (**a água**; passos a afastar-se), epílogos (carris/vento; tecido/vento quente; chuva fina na lona; madeira/pedra), amurada (a água), última cena (a tábua; pedra; uma criança). Música: nenhuma até aos créditos.

## 10. Requisitos de produção do nível

- **Tamanho:** 45 × 10 m de convés jogável + nível 01 + o navio em LOD; quatro cenas de epílogo.
- **Assets:** USS Missouri (EXACT: convés principal, nível 01, torres, superestrutura), pé de guarda-corpo com pino, pano verde, mesa e cadeiras, bandeira de Perry (31 estrelas), uniformes (dungarees/whites), participantes à distância (silhuetas corretas, sem rostos), aviões da passagem aérea (NPC); epílogos: estação de Tczew, tenda de campo, tenda-hospital, abrigo europeu em reconstrução.
- **Sistemas (roadmap S16):** cerimónia como cena com NPCs à distância e câmara externa permitida; epílogos interativos com mapa sem setas; ator sem arma.
- **Risco:** 4. **Fallback:** multidão pelas costas + cartelas; quatro planos fixos com leitura.
- **Medir primeiro:** a planta do convés 01/principal e as fotografias da cerimónia (P-C30); licença do áudio histórico antes de qualquer transcrição.
