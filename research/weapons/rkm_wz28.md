# Ficha: rkm wz.28 (Browning polaca)

Arma de Szymon Kowal, atirador de apoio da secção em M01 (`mission.json`, `loadout: ["rkm_wz28"]`).
Fontes: T31 (*Rkm wz. 28*, Wikipédia en/pl; opisybroni.pl; 1939.pl; ioh.pl; quartermastersection.com), H30 (lida; confirma a rkm como arma da secção, sem ficha técnica).
Estado: **ficha preliminar**. Os dados vêm de resumos concordantes de busca: as páginas não foram lidas por inteiro, porque `wikipedia.org` está bloqueada neste ambiente.

## 1. Identidade histórica

| Campo | Valor | Certeza |
| --- | --- | --- |
| Designação | *ręczny karabin maszynowy wz. 28* (rkm Browning wz.28) | ALTA |
| Origem | Browning Automatic Rifle M1918 via FN Model 1928; produção na Państwowa Fabryka Karabinów (Varsóvia) | MÉDIA |
| Alterações polacas | Calibre 7,92 mm; **bípode no tubo de gases, logo atrás do regulador** (não na boca); **patins** (*płozy*) em vez de espigões; **punho de pistola** inclinado para trás (tipo Colt Monitor); miras invertidas | MÉDIA (T31) |
| Em M01 | Kowal, a disparar rajadas curtas sobre os clarões do dique (dlg_m01_026/027), a trocar carregador em cobertura (dlg_m01_029) e a limpar a arma na abertura | — |

## 2. Dados técnicos documentados

| Dado | Valor | Certeza |
| --- | --- | --- |
| Calibre | 7,92 × 57 mm Mauser | ALTA |
| Comprimento total | 1110 mm | MÉDIA (T31) |
| Comprimento do cano | 611 mm | MÉDIA (T31) |
| Massa | 9,0 kg vazia (há fontes com 9,5 kg) | MÉDIA |
| Carregador | Destacável, **20 cartuchos**, por baixo da caixa | ALTA |
| Cadência | ~600 tiros/min teóricos; prática 80–400 | MÉDIA |
| Modos | Tiro a tiro e contínuo; o selector é também a segurança | MÉDIA |
| Funcionamento | Por gases, ferrolho aberto (herdado do BAR); alavanca de armar no lado esquerdo | MÉDIA (BAR) |
| Miras | Massa prismática; alça em quadro com entalhe triangular, 300–1600 m | MÉDIA |
| Velocidade inicial | ~853 m/s | BAIXA (depende da munição) |
| Alcance eficaz | ~600 m | MÉDIA |

## 3. Comportamento no jogo

A simulação (`src/game/m01-simulation.js`) dá a Kowal um carregador de 20, gasta 3 cartuchos por rajada e troca de carregador com 5 s de pausa e a fala dlg_m01_029. Os clips seguem esses números: rajada de 3 a 600 tiros/min e troca em 3,4 s, dentro da pausa. Estes valores são **GAMEPLAY**, não medições.

## 4. Modelo 3D (provisório verificado)

| Item | Especificação |
| --- | --- |
| Ficheiro | Malha `rkm_wz28` em `assets/models/provisional/m01/characters/m01_soldier_pl_lod{0,1,2}.glb` (escondida por omissão), mais `rkm_bipod_open`, `rkm_bipod_folded` e `rkm_pouch` (bolsa de carregadores) |
| Escala | 1 unidade = 1 m; 1,11 m (teste); origem no punho; cano para −Z |
| Peças animadas | carregador no osso `weapon_mag` (filho de `weapon`); alavanca de armar no osso `weapon_bolt`. Na pose de ligação a alavanca está atrás (armada, ferrolho aberto) e avança 0,10 m |
| Sockets | `extras.weapons.rkm_wz28` do nó raiz: `muzzle`, `ejection_port`, `bolt_handle`, `bolt_handle_forward`, `mag_well`, `rear_sight`, `grip_r`, `grip_l`, `butt`, `bipod_mount`, `bipod_feet` |
| Triângulos | LOD0 ~1,1 mil (arma) + 128 (bípode); LOD1 ~0,9 mil; LOD2 ~130 |
| Por confirmar | Forma exacta da boca/tapa-chamas, bandoleira, bolsa do atirador (forma e número de carregadores) e cor da madeira. A bolsa de couro no lugar da cartucheira esquerda é uma **reconstrução** |

## 5. Animações (`m01_soldier_animations.glb`, prefixo `rkm_`)

| Clip | Duração | Notas |
| --- | --- | --- |
| `rkm_standing_idle`, `rkm_walk`, `rkm_run`, `rkm_crouched_idle` | 4 / 1,05 / 0,72 / 3 s | arma pronta ou atravessada no peito |
| `rkm_aim` / `rkm_fire_burst` | 2 / 0,8 s | ao ombro; rajada de 3, com recuo, subida e alavanca a vibrar |
| `rkm_prone` / `rkm_prone_fire` | 3 / 0,8 s | deitado, bípode aberto no chão, mão esquerda sob a coronha |
| `rkm_reload` | 3,4 s | de joelho: solta o vazio, que cai (`mag_drop` 1,05 s), tira o novo da bolsa (1,15), encaixa (1,9) e arma a alavanca (2,45) |
| `rkm_clean` | 6 s | sentado, rkm deitada nos joelhos; pano no osso `weapon_clip`; puxa a alavanca e acompanha-a à frente devagar |

## 6. Pendências

- Ler integralmente T31 (Wikipédia pl e opisybroni) e confirmar massa, boca e bandoleira.
- Equipamento do atirador e do municiador (bolsas, número de carregadores): fonte a encontrar.
- Som: só gravações originais ou CC0; nada extraído de jogos.
