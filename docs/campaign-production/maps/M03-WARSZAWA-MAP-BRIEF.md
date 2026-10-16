# M03 — CIDADE CERCADA (Varsóvia, setor oeste) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M03-WARSZAWA-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** nenhuma rua é afirmada como exata; o quarteirão é `RECONSTRUCTED` (tipo de prédio de rendimento varsoviano de 1939).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | setor oeste de Varsóvia, 25/9/1939 (52,23 N 20,98 E); quarteirão-tipo, não um endereço |
| Classe global | `RECONSTRUCTED`; `EXACT` só a silhueta distante (torre de igreja com sino) e a escala dos prédios (4 pisos, porão abobadado, pátio interior) |
| O que medir depois | nada de cadastro; referência tipológica (plantas de prédios de rendimento de Wola/Ochota pré-1939) para proporções de pátio, escadas e porões — P-C03 |
| Origem proposta | a porta do porão do prédio principal: `(0, 0, 0)` ao nível da rua (o porão está a y −2,8) |
| Eixos | metros; X+ leste (ao longo da rua principal), Y+ altura, Z+ sul (para o interior do quarteirão) |
| Área jogável | X −60…+220 · Z −40…+240; verticalidade: y −3 (porão) … +14 (2.º piso jogável; 3.º/4.º só visuais) |
| Compressões declaradas | o quarteirão é compacto por desenho (200 × 250 m); a escola (posto médico) a 120 m dos pátios: valor de jogo, não real |
| Relógio | 07:40 → 11:40 (elipse até à noite no debrief) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 8 m)

```
     N
   ═══════════════ rua principal (E–W) ══════════════╬══════════  z −10
   ┌─────────────┐ ┌──────────┐ ┌─────────┐ ┌────────╫─────┐
   │ prédio A    │ │ prédio B │ │prédio C │ │ ESQUINA (cai │  ← barricada no cruzamento (x +150)
   │ 4 pisos     │ │          │ │         │ │ às 08:40)    │     janelas 1.º/2.º: defesa
   │ ▼ porão (0) │ │          │ │         │ └──────────────┘
   └──┬──────────┘ └────┬─────┘ └────┬────┘        ║ rua lateral (N–S)
      │ escadas         │ passagem   │             ║ ← MG da 2.ª vaga (10:20)
   ┌──┴────────────────┴────────────┴──────┐       ║
   │          pátio interior (z +30…+60)   │       ║   depósito secundário
   │   porta do pátio = rota segura dos    │       ║   (munição, porão vizinho)
   │   moradores                           │       ║
   └───────────────┬───────────────────────┘       ║
                   │ passagem entre pátios          ║
   ┌───────────────┴───────────────────────┐       ║
   │          2.º pátio (z +90…+130)       │═══════╝
   └───────────────┬───────────────────────┘
                   │ 120 m (rua lateral vista pela MG)
   ┌───────────────┴───────────────────────┐
   │  ESCOLA — posto médico (z +190…+230)  │
   └───────────────────────────────────────┘
                  ⌂ torre da igreja com sino (âncora E/SE)      fumo por bairros (s3)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_block` | perto | porão, escadas, pátio, passagens, cruzamento, prédio da esquina, pátios, escola | agenda própria 07:40 → 11:10 |
| `s2_adjacent_streets` | médio | defesas vizinhas, incêndios, moradores a evacuar por outra rua | sim |
| `s3_city_raids` | longe | bombardeamentos por bairros agendados (08:00, 08:40, 10:20, 12:30…), fumo acumulado | relógio; sem relação com o jogador |
| `s4_west_front` | longe | artilharia alemã, sondas | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | porão (y −2,8) → escadas → pátio | 40 m | 07:40–07:50 | `cs_m03_intro`; CP-A |
| 2 | pátio → passagem → cruzamento | 150 m, por três sinais (relógio parado, sino, acesso pelo pátio) | 07:50–08:10 | `obj_m03_message`; CP-B |
| 3 | cruzamento: janelas 1.º/2.º do prédio C | vertical, 8 m | 08:10–08:40 | `obj_m03_hold_crossing` |
| 4 | prédio da esquina (danificado) → saída libertada | 60 m interiores | 08:40–09:10 | `cs_m03_raid`; rua cortada persistente |
| 5 | pátios ligados → (depósito **ou** civil ferido) → escola | 120–180 m | 09:10–09:50 | `obj_m03_optional`; CP-C |
| 6 | escola → porão | 200 m | 09:50–10:20 | `cs_m03_cellar` |
| 7 | pátios → rua lateral (MG) → escola, com macas | 120 m | 10:20–11:10 | clímax; proteger passagem |
| 8 | escola → porão | 200 m | 11:10–11:40 | `cs_m03_outro`; CP-D |

## 5. Rotas alternativas e decisões espaciais

- **Sem seta** (cena 2): o caminho ao posto é lido por três sinais reais; errar o pátio custa tempo, não dano.
- **Rota cortada** (cena 4): a fachada da esquina cai e fecha a rua principal; a alternativa é o interior danificado (escada partida, saída a libertar) — a rota segura muda e fica cortada até ao fim.
- **Opcional** (cena 5): depósito secundário (munição; mais tempo sob a segunda vaga) ou o Sr. Wójcik ferido (civil; escola); só muda recursos e falas.
- **Segunda vaga** (cena 7): suprimir a MG da rua lateral da janela do 1.º piso ou cobrir as macas por lances no pátio; a porta do pátio é sempre a rota dos moradores.

## 6. Cobertura, linhas de visão e oclusão (vertical)

| Zona | Cobertura | Oclusão |
| --- | --- | --- |
| porão | abóbada de tijolo; uma janela de cave ao nível da rua | sem linha de visão para fora além da janela |
| escadas | patamares; corrimão de ferro | vozes dos moradores por piso |
| pátio | arcos, muro baixo, um carro de mão | cego para a rua principal; aberto ao céu (bombas só ≥ 30 m) |
| cruzamento | barricada (mobília, carris), janelas 1.º/2.º | vê 100 m em cada braço da rua |
| interior danificado | mobília, escada partida | poeira de gesso reduz visão a 10 m sem apagar geometria |
| rua lateral | portais, uma montra | a MG vê 120 m de rua; o pátio não |
| escola | muro do recreio, janelas tapadas | — |

Regra: a IA não vê nem dispara através de paredes e soalhos; sons ocluídos por piso e por pátio.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| bombas por bairro (08:00, 08:40, 10:20, 12:30…) | ≥ 30 m do jogador; o jogador vê o vidro a tremer antes |
| fachada da esquina (08:40) | zona de colapso definida; o jogador está sempre fora dela (cutscene curta) |
| MG da rua lateral (10:20) | só sobre a rua lateral; nunca sobre o pátio |
| alemães por portas e fachadas (cruzamento) | 10–80 m; vêm pela rua, nunca pelos porões |
| moradores | nunca alvo; rota pela porta do pátio |
| limites | o quarteirão; as ruas além dos braços do cruzamento ficam em `s2` (aviso suave) |

## 8. Encenação e objetos por zona

- **Porão** (cs intro/cellar/outro): vela; Helena e Krysia; a chave no banco; o balde; cada regresso tem mais gente.
- **Escadas/pátio**: morador com água, outro com uma criança; relógio parado na fachada; o sino.
- **Cruzamento**: barricada; defensores; o vidro que treme às 08:40.
- **Interior da esquina**: mobília, fotografias, a escada partida, a saída a libertar (interação a dois).
- **Escola**: macas, Kita, moradores; o quadro negro.
- Persistentes: rua cortada; fumo acumulado por bairro; o porão cheio.

## 9. Luz, tempo e som por zona

Sol calculado (52,23 N 20,98 E; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 07:40 | 117° | 19° | manhã clara; a rua E–W em sol baixo de leste |
| 08:40 | 132° | 27° | poeira branca 90 s após a vaga (exposição 1,1) |
| 09:40 | 147° | 33° | sol entre prédios nos pátios |
| 10:40 | 165° | 36° | laranja-cinza pelo fumo |
| 11:40 | 184° | 37° | fumo alto; porão com menos poeira |

Som: porão (vela, vozes, abóbada); pátio (reverberação curta, sino ao longe); cruzamento (tiros a 10–80 m, barricada); vagas (vidro a tremer → impacto ≥ 30 m → poeira); rua lateral (MG); escola (macas). Fumo acumulado por bairro muda a cor da luz ao longo da manhã.

## 10. Requisitos de produção do nível

- **Tamanho:** 280 × 280 m com dois pisos jogáveis e porão; o bairro à volta como fachadas de LOD.
- **Assets:** prédio de rendimento (escadas, patamares, porão abobadado), pátio com arcos, barricada, fachada colapsável (estado antes/depois), escola, elétrico parado, torre de igreja distante.
- **Sistemas novos (roadmap S4/S9):** interiores verticais com oclusão; civis com rotas e abrigos; vaga de bombardeamento por bairro (agenda + fumo).
- **Risco:** 4 (os primeiros interiores e civis da campanha). **Fallback:** civis em cutscene; interiores por pisos sem oclusão dinâmica.
- **Medir primeiro:** nada geográfico; validar proporções tipológicas (P-C03).
