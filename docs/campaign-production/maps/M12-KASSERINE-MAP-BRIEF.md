# M12 — PRIMEIRO SANGUE (passagem de Kasserine) · Roteiro de mapa

**Estado:** PLANEJADA — intenção de nível, sem medições. **Fonte:** `missions/M12-KASSERINE-PRODUCTION-DOSSIER.md`. **Regra do dossiê:** sem "massacre" inventado; a passagem cai por decisão histórica (fora do espaço do jogador); posição de 1/26.º e via de retirada pendentes (P-C12).

## 1. Ficha do mapa

| Campo | Valor |
| --- | --- |
| Lugar real | passagem de Kasserine entre o Djebel Semmama (norte) e o Djebel Chambi (sul), rio Hatab, bifurcação para Thala (norte) e Tébessa (oeste); ≈ 35,17 N 8,83 E; 20/2/1943 |
| Classe global | relevo e bifurcação `EXACT` (DEM, estradas atuais seguem as de 1943 em traçado); posições `RECONSTRUCTED` (P-C12) |
| O que medir depois | DEM GLO-30 (encostas de Semmama/Chambi, fundo do vale), Overture (estradas de Thala e Tébessa, o Hatab); mapa AFHQ 1:50 000 de 1943 |
| Origem proposta | o acesso da estrada no fundo do vale (posição da cena 3): `(0, 0, 0)` |
| Eixos | metros; X+ leste (de onde o inimigo vem, pela passagem), Y+ altura, Z+ sul; a encosta de Semmama sobe para −Z |
| Área jogável | X −1 100…+400 · Z −400 (encosta baixa) … +150 (rio); a bifurcação em x −600; o ponto de reunião em (−700, −400) na estrada de Thala |
| Compressões declaradas | acesso → bifurcação 600 m e bifurcação → reunião 400 m (dossiê); valores reais a medir — provável `COMPRESSED_FOR_GAMEPLAY` |
| Relógio | 09:00 → 19:30 (`readyScale` entre vagas) |

## 2. Planta esquemática (norte em cima; 1 carácter ≈ 40 m)

```
     N        DJEBEL SEMMAMA (sobe) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
   [ponto de reunião: oliveiras, quinta] ▲▲▲ [posição improvisada: buracos, fios cortados] ▲▲▲▲▲
          ║ estrada de THALA (aberta)      ▲▲▲  (cs intro 09:00)        [posição avançada: vista]
          ║                                ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
   ═══════╬═ BIFURCAÇÃO (16:00) ═══ 600 m: veículos avariados, feridos ═══ ⊙ ACESSO ORIGEM ═══ ⇐ inimigo
   TÉBESSA ⇐  (camião de Boucher: 2 viagens)        [TD M3 GMC] [engenheiros ⇐ lado que cede, 14:00]
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ rio HATAB ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
     S        DJEBEL CHAMBI (em frente)      s4: colunas, tanques (Pz IV na estrada a 600 m, 16:40)
```

## 3. Setores e camadas

| Setor | Camada | O que se vê | Independência |
| --- | --- | --- | --- |
| `s1_slope_access` | perto | buracos na encosta, posição avançada, o acesso, o TD | agenda 09:00 → 16:00 |
| `s2_fork_road` | perto | 600 m de estrada, veículos avariados, a bifurcação, a estrada de Thala | 14:30 → 19:30 |
| `s3_engineers_flank` | médio | o lado que cede, fora de vista (homens a recuar; tiros que mudam de direção) | 14:00 |
| `s4_valley` | médio/longe | colunas, tanques, TD, artilharia; o Pz IV a 600 m (16:40) | sim |
| `s5_passes` | longe | movimentos para Thala/Tébessa | relógio |

## 4. Rota principal

| # | De → para | Distância | Hora | Objetivo / CP |
| --- | --- | --- | --- | --- |
| 1 | posição improvisada (cs intro: dois relatos) | 0 | 09:00 | CP-A |
| 2 | encosta → posição avançada com vista para o vale | 250 m a subir | 09:10–10:30 | `obj_m12_carry_observe` |
| 3 | acesso da estrada: defender com infantaria, engenheiros e o TD | — | 10:30–13:30 | `obj_m12_defend_access` |
| 4 | o flanco cede (cs flank) | — | 14:00–14:30 | CP-B |
| 5 | acesso → bifurcação: reunir, recuperar, carregar feridos | 600 m | 14:30–16:00 | `obj_m12_rally_wounded`; CP-C |
| 6 | bifurcação (cs crossroads: dois grupos, dois lugares) | 0 | 16:00–16:30 | custo humano + decisão |
| 7 | bifurcação → 400 m da estrada de Thala, cobrindo o último transporte | 400 m | 16:30–18:00 | `obj_m12_cover_last_truck`; Yates morto (fixo); CP-D |
| 8 | ponto de reunião (cs outro: a lista) | 0 | 18:00–19:30 | — |

## 5. Rotas alternativas e decisões espaciais

- **O vale** (cena 2): dois relatos contraditórios; a posição avançada mostra qual via está sob ameaça (poeira, patrulhas a recuar).
- **Acesso** (cena 3): posições de infantaria junto do TD (apoio; alvo) ou nos buracos da encosta (vista; longe do apoio).
- **Retirada** (cena 5): recuperar uma caixa e um rádio dos veículos avariados (tempo) vs ir direto à bifurcação.
- **Bifurcação** (cena 6): o camião leva dois; a prioridade segue a via realmente aberta (Thala); Ballard acusa o grupo B — a decisão é espacial (quem sobe) e moral.
- **Último transporte** (cena 7): cobrir da bifurcação ou dos 400 m de estrada por lances; o TD dispara duas vezes e recua; nunca "matar o Pz IV".

## 6. Cobertura, linhas de visão e oclusão

| Zona | Cobertura | Observações |
| --- | --- | --- |
| encosta baixa | buracos, rochas | vê o fundo do vale (400–800 m) |
| posição avançada | rochas | vista para a estrada, o Hatab e Chambi |
| acesso | muros de pedra seca, o TD, valetas | batido pela estrada a leste |
| estrada de retirada | veículos avariados (param tiros), valetas | vista do vale |
| bifurcação | um edifício de pedra, oliveiras | o camião manobra aqui |
| estrada de Thala | oliveiras, muros; a quinta | o Pz IV a 600 m vê a estrada em dois troços |

Linhas de visão: posição avançada → vale (800 m); acesso → estrada leste (400 m); bifurcação → estrada do vale (600 m: o Pz IV). Regra: o lado que cede está **fora de vista** (s3), só por homens a recuar e tiros que mudam de direção.

## 7. Zonas de segurança e perigo

| Zona | Regra |
| --- | --- |
| sondas e vagas (10:30; 11:30; 12:30) | pela estrada e encostas baixas; dados |
| artilharia | ≥ 30 m; assobio |
| flanco que cede (14:00) | fora do espaço do jogador; nenhum "spawn" atrás |
| Pz IV (16:40) | a 600 m na estrada do vale; dispara contra veículos e a bifurcação; nunca entra na estrada de Thala |
| Yates (cena 7) | tiro real sem possibilidade de intervenção (fixo) |
| camião de Boucher | duas viagens por agenda; lugares contados |
| limites | encostas altas (aviso); o vale a leste além do acesso (inimigo) |

## 8. Encenação e objetos por zona

- **Posição improvisada** (cs intro): fios de telefone cortados, caixas, dois mensageiros.
- **Posição avançada**: binóculos; poeira no vale; patrulhas a recuar.
- **Acesso**: o TD, os engenheiros, ordens sucessivas e atrasos.
- **Estrada**: veículos avariados, tripulações a abandonar, uma caixa, um rádio, feridos.
- **Bifurcação** (cs crossroads): o camião com motor ligado; os dois grupos; Ballard.
- **Ponto de reunião** (cs outro): oliveiras, a quinta, a lista com nomes em branco.
- Persistentes: veículos abandonados, a estrada do vale perdida, o camião partido.

## 9. Luz, tempo e som por zona

Sol calculado (35,17 N 8,83 E, UTC+1; a validar):

| Hora | Azimute | Elevação | Leitura |
| --- | --- | --- | --- |
| 09:00 | 121° | 21° | céu encoberto; luz plana; lama recente |
| 12:00 | 167° | 43° | nuvens |
| 15:00 | 223° | 33° | aberturas |
| 16:30 | 241° | 18° | luz baixa na bifurcação |
| 18:00 | 255° | 1° | pôr do sol ≈ 18:05; crepúsculo frio |
| 19:00 | — | −10° | noite |

Som: encosta (vento, fios), vale (poeira, motores ao longe, artilharia), acesso (TD, ordens, atrasos), estrada (veículos a arder, feridos), bifurcação (motor do camião, a discussão), estrada de Thala (o Pz IV ao longe; o TD duas vezes), reunião (frio; a lista).

## 10. Requisitos de produção do nível

- **Tamanho:** 1 500 × 550 m com relevo real (encosta de Semmama).
- **Assets:** buracos e muros de pedra seca, TD M3 GMC (proxy com agenda), camião GMC (NPC), veículos avariados (half-track, jipe), oliveiras, quinta tunisina, Pz IV (proxy), estradas de terra.
- **Sistemas (roadmap S7):** camião com agenda (2 viagens), TD/Pz IV proxies com eventos.
- **Risco:** 2. **Fallback:** camião por evento; Pz IV estático a disparar.
- **Medir primeiro:** DEM e as estradas de Thala/Tébessa; posição de 1/26.º (P-C12) para fixar as compressões.
