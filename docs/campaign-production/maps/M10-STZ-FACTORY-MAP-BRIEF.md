# M10 — FÁBRICA (Stalingrado, Fábrica de Tratores) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M10-STZ-FACTORY-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** três oficinas com lógica distinta; nenhum corredor afirmado como edifício exato (planta pendente P-C10); o avanço dos tanques no pátio às 13:00 é `COMPRESSED_FOR_GAMEPLAY` (histórico ~16:30).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | Fábrica de Tratores (STZ), norte de Stalingrado (≈ 48,80 N 44,58 E); 14/10/1942 |
| Classe global | `RECONSTRUCTED` (oficinas-tipo de montagem com pontes rolantes, valas de serviço, passarelas); `EXACT` só as silhuetas (chaminés, pontes rolantes) e a direção do ataque (do oeste/noroeste para o Volga) |
| O que medir depois | planta geral da STZ (fontes soviéticas/alemãs de 1942; Overture para o perímetro atual); P-C10 |
| Origem proposta | a máquina grande da oficina de montagem (galpão 1): `(0, 0, 0)` ao nível do chão |
| Eixos | metros; X+ leste (eixo longo dos galpões, para o Volga), Y+ altura, Z+ sul (para o pátio) |
| Área jogável | X −40…+700 · Z −60…+160; vertical: valas −2 m, chão 0, passarelas +6 m, pontes rolantes +9 m (só a MG, não jogável) |
| Compressões declaradas | hora dos tanques no pátio (13:00 vs ~16:30); os galpões têm 120 m cada por desenho |
| Relógio | 07:20 → 17:30 |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 12 m)

```
     N   chaminés ▐▐▐    Barrikady (s5, longe)  ▐▐▐          aviação / artilharia
   ┌─────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
   │   GALPÃO 1          │   │   GALPÃO 2            │   │   GALPÃO 3            │
   │   montagem          │   │   telhado danificado  │   │   aberto ao pátio     │
   │   tornos · ponte    │═══│   máquinas · valas    │═══│   feridos · maqueiros │     [MURO]
   │   rolante · trilhos │pas│   ponto alto = passa- │pas│   trilhos para o pátio│  ═══ posição
   │   ▣ MÁQUINA (0,0,0) │sa-│   rela (MG da ponte   │sa-│                       │      menor
   │   (telhado cai 09:30)│rela│  rolante, 13:30)     │rela│                       │     x +640
   └──────────╥──────────┘   └──────────╥────────────┘   └──────────╥────────────┘
   ───────────╨─ vala de serviço (−2 m) ─╨─────────────────────────────╨─ vala ──────────────►
            [posto de coordenação: cave sob o galpão 2]                     corredor de retirada
   ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  PÁTIO com trilhos  ·  ·  tanques (proxies) 13:00  ·  ·  ·  ·  ·
   ·  ·  ·  ·  ·  oficinas e pátios vizinhos (s4); grupo vizinho  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·
     S
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_shop1` → `s2_shop2` → `s3_shop3_yard` | perto, em sequência | as três oficinas, passarelas, valas, o pátio | agenda 07:30 → 16:30 |
| `s4_other_shops` | médio | oficinas/pátios vizinhos, blindados no perímetro, grupo vizinho | sim |
| `s5_complexes_sky` | longe | Barrikady, aviação (Stukas desde 08:00), artilharia | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | galpão 1 (cs intro: o eixo) | 0 | 07:20 | — |
| 2 | passarela → vala → galpão 2 → cave (posto), com Lobov | 250 m | 07:30–09:15 | `obj_m10_link`, `obj_m10_escort_messenger`; CP-A |
| 3 | regresso ao galpão 1: a rutura (cs rybin) | 150 m | 09:15–09:40 | `evt_m10_rybin_killed` (fixo); CP-B |
| 4 | galpão 1 → galpão 2 entre máquinas | 150 m | 09:40–11:30 | `obj_m10_fight_shop2` |
| 5 | galpão 2 → galpão 3 com caixas e feridos; Zhdan ferido | 150 m | 11:30–13:00 | `obj_m10_transfer`; CP-C |
| 6 | galpão 3 (cs order: "o pátio foi rompido") | 0 | 13:00–13:30 | — |
| 7 | galpão 3 → vala → muro → posição menor | 200 m | 13:30–16:30 | `obj_m10_withdraw`, `obj_m10_zhdan`; CP-D |
| 8 | posição menor (cs outro: a chamada) | 0 | 16:30–17:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **Ligação** (cena 2): passarela (+6 m; rápida; vista das claraboias) vs vala de serviço (−2 m; lenta; cega).
- **Entre máquinas** (cena 4): subir a uma passarela (ponto alto; vê o galpão; exposto) ou avançar pela vala; chapas e blocos obrigam a contornar (obstrução real), vidro e madeira atravessam-se.
- **Transferência** (cena 5): caixas primeiro ou o ferido leve primeiro; Zhdan é ferido num acesso alcançável (evento fixo).
- **Retirada** (cena 7): "Eu seguro este lado. Passe primeiro.": o jogador escolhe que lado segurar; a rota real para Zhdan existe se o corredor da vala for aberto (suprimir a MG da ponte rolante) antes da ordem final.

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| máquinas/tornos | chapa e bloco: cobertura total (obstrução real) | vidro/madeira: não |
| valas de serviço | −2 m; cobertura total; cegas | passagens entre galpões |
| passarelas | guarda-corpo de ferro (parcial) | ponto alto: vê e é visto |
| pontes rolantes | +9 m; só a MG | domina o galpão 2 e a vala |
| claraboias | luz em feixes; os Stukas vêem-se por elas (sombras) | — |
| pátio | trilhos, vagões, pilhas | tanques a 100–300 m (proxies) |
| muro/posição menor | muro de tijolo 2,5 m | vê a área perdida entre o telhado caído |

Regra: armas não disparam através de chapas; a poeira reduz visão a 20–40 m sem cegar (densidade 0,3 por 60 s após impactos).

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| telhado do galpão 1 (09:30) | zona de colapso sobre a máquina; sequência sinalizada (três avisos); o jogador fica a ≥ 15 m por desenho (Gromov pode correr para lá depois: nada a fazer) |
| Stukas (desde 08:00) | a fábrica treme; impactos ≥ 30 m; sombras pelas claraboias |
| MG da ponte rolante (13:30) | domina a vala do galpão 2/3; silencia por supressão (abre o corredor) |
| tanques no pátio (13:00) | proxies; nunca entram nos galpões; disparam contra fachadas |
| Zhdan (11:30–13:00) | ferimento fixo num acesso alcançável |
| limites | além do muro (perdido); pátio além dos trilhos (tanques) |

## 8. Encenação e objetos por zona

- **Galpão 1** (cs intro/rybin): a máquina com ruído residual (o "eixo"), tornos, trilhos; o trabalhador com braçadeira; o telhado que cai; o zumbido que para.
- **Cave** (posto): telefone, mapa da fábrica, Lobov.
- **Galpão 2**: máquinas, valas, a ponte rolante.
- **Galpão 3**: feridos, maqueiros, caixas; o rádio da ordem.
- **Posição menor** (cs outro): a chamada interrompida; a máquina da abertura visível entre o telhado caído; o trator inacabado.
- Persistentes: telhado caído, Rybin (coberto), galpões perdidos (`workshops_lost = 3`).

## 9. Luz, tempo e som por zona

Sol calculado (48,80 N 44,58 E, UTC+4; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 07:20 | 101° | −1° | nascer ≈ 07:25; claraboias cinzentas |
| 10:20 | 139° | 25° | feixes pelas claraboias partidas |
| 13:20 | 189° | 33° | pátio com sol filtrado por fumo |
| 16:20 | 236° | 17° | sol baixo laranja |
| 17:30 | — | ~6° | — |

Som: galpão 1 (o eixo; tornos; reverberação de chapa), passarela/vala (metal; abafado), Stukas (sirene; a fábrica a tremer), galpão 2 (combate entre máquinas; ricochetes em chapa), galpão 3 (feridos; rádio), pátio (motores de tanques; canhão contra fachadas), posição menor (a chamada; fogo atrás dos galpões).

## 10. Requisitos de produção do nível

- **Tamanho:** 740 × 220 m com três níveis (vala/chão/passarela) e pontes rolantes não jogáveis.
- **Assets:** oficinas de montagem (estrutura, claraboias, pontes rolantes), máquinas e tornos (instâncias com colisão balística), valas de serviço, passarelas, trator inacabado, vagões, tanques proxies, chaminés.
- **Sistemas (roadmap S9/S7):** interiores industriais com níveis e obstrução por material; poeira volumétrica por evento; tanques proxies no pátio.
- **Risco:** 3. **Fallback:** poeira por setor; MG da ponte rolante como posição fixa com janelas.
- **Medir primeiro:** nada de cadastro antes da planta geral (P-C10); fixar a sequência de colapso do telhado em bancada.
