# Ficha — Karabinek wz.29 (Mauser polonês)

Arma inicial de Jan Wrona em M01 (Prompt §79). Perfil data-driven: [`kb_wz29.profile.json`](kb_wz29.profile.json).
Fontes: T21 (Karabinek wz. 1929 — Wikipédia en; opisybroni.pl; dobroni.pl; Muzeum Zgierz), H30 (lida; confirma os dois tipos de Mauser, sem ficha técnica).
Estado: **ficha preliminar**. Os dados documentados vêm de resumos concordantes de várias fontes; H30 foi lida na revisão do PR #10; T21 continua conhecido por resumos. P15 continua aberto para o armamento específico do batalhão.

## 1. Identidade histórica

| Campo | Valor | Certeza |
| --- | --- | --- |
| Designação | *karabinek wz. 29* (kbk wz. 29); "wz." = *wzór*, modelo | ALTA |
| Origem | Desenvolvido a partir do Mauser Kar98 "AZ" (encurtado); produção polonesa | MÉDIA |
| Fabricante | Państwowa Fabryka Broni, Radom, a partir de 1930 | MÉDIA |
| Produção até 1939 | ~264 000 segundo uma fonte; outra cita 634 000 para 1930–1942, incluindo produção alemã depois da ocupação | BAIXA (divergente) |
| Distribuição em 1939 | Chegou a cerca de metade da infantaria no início dos anos 1930. Depois a infantaria voltou a fuzis longos (wz.98a), e o wz.29 ficou sobretudo com sapadores, transmissões, artilharia e parte da cavalaria (P15). | MÉDIA |
| Em M01 | Jan (por exigência do Prompt §79; plausível), Krawiec e os sapadores (caso mais seguro), Zieliński e Pawlak. Bąk usa wz.98a para mostrar a mistura. | — |

## 2. Dados técnicos documentados

| Dado | Valor | Certeza |
| --- | --- | --- |
| Calibre | 7,92 × 57 mm Mauser | ALTA |
| Comprimento total | 1100 mm | MÉDIA (T21) |
| Comprimento do cano | 600 mm | MÉDIA (T21) |
| Massa (descarregado) | 4,0 kg | MÉDIA (T21) |
| Velocidade inicial | ~745 m/s | BAIXA: depende do tipo de projétil; confirmar a munição de 1939 |
| Carregador | Interno, 5 cartuchos, carregado por **clipe de 5** | ALTA |
| Ação | Ferrolho rotativo Mauser: dois ressaltos frontais e um de segurança | ALTA |
| **Alavanca do ferrolho** | **Reta** (a Kar98k tem alavanca dobrada). Variantes dobradas não confirmadas (P14). | MÉDIA |
| Mira traseira | Tangente, graduada de 100 a 2000 m em passos de 100 m | MÉDIA |
| Mira dianteira | Lâmina com **duas orelhas de proteção** laterais | MÉDIA |
| Baioneta | Com encaixe para baioneta; modelo exato a confirmar | BAIXA |
| Cadência prática | ~10–15 tiros/min (fuzil de ferrolho com mira) | MÉDIA |

## 3. Comportamento no jogo

O comportamento deve ser reconhecível e diferente da M1 Carbine: um tiro por ciclo de ferrolho, recarga por clipe e peso visível no recuo. Os valores numéricos estão em `kb_wz29.profile.json`, marcados como `GAMEPLAY` (propostos) ou `DOCUMENTED`.

### Regras invioláveis

1. **Um disparo por ciclo de ferrolho.** Disparar arma o estado `BOLT_REQUIRED`. O ciclo (levantar, recuar, avançar, abaixar) é uma animação obrigatória, ejeta o estojo e só então permite o próximo disparo.
2. **Recarga por clipe só com o carregador vazio.** Com 1 a 4 cartuchos no carregador, a recarga é **cartucho a cartucho**. É mais lenta, mas pode ser interrompida para atirar.
3. Ao fechar o ferrolho após a recarga por clipe, **o clipe vazio é expelido** (som e partícula próprios).
4. Correr interrompe o ciclo e a recarga no ponto seguro mais próximo, sem perder munição nem criar um cartucho extra.
5. A alça (100–2000 m) muda o ponto de impacto de verdade. No jogo há atalhos de 300, 500, 800 e 1000 m, com indicação discreta e sem HUD na mira.
6. Não há modo automático nem tiro de quadril preciso.

### Por que a alça importa em M01

Os alvos de M01 estão a 150–1100 m (cabeça de ponte leste a ~1,05 km). Com queda balística real, quem atira "reto" a 1000 m erra por muitos metros. Zieliński ensina isto com dlg_m01_028 ("Wrona, alça em mil."). Se a engine usar trajetória reta, a dispersão por distância deve imitar a dificuldade sem tornar o tiro impossível.

## 4. Modelo 3D (arma e ViewModel)

| Item | Especificação |
| --- | --- |
| Escala | 1 unidade = 1 m. Comprimento total 1,10 m; cano 0,60 m. |
| Orientação de exportação (proposta) | +Y para cima, **cano para −Z** (frente da câmera Three.js), origem no punho. |
| Sockets | `muzzle` (boca), `ejection_port`, `bolt_handle`, `clip_guide` (ranhura do clipe), `rear_sight` (folha com estado de elevação), `sling_front`/`sling_rear`, `grip_r` e `grip_l` para as mãos. |
| Peças animadas | ferrolho (rotação + translação), alavanca reta, folha da alça (elevação), clipe, 5 cartuchos visíveis, gatilho e mola do carregador (opcional). |
| Silhueta | Coronha inteiriça de madeira, cano exposto curto à frente da braçadeira, mira dianteira com orelhas, **alavanca reta**. Deve ser distinguível da Kar98k (alavanca dobrada) a 2 m. |
| Materiais | Madeira oleada (espécie a confirmar), aço oxidado/brunido com desgaste nas arestas, latão dos cartuchos. Texturas PBR: albedo, normal, roughness e AO. |
| Orçamento | ViewModel: ≤ 12 k triângulos com braços à parte. Modelo de mundo: LOD0 ≤ 3 k, LOD1 ≤ 800. |
| Referências visuais | Fotos de museu (Muzeum Zgierz, Museu da II Guerra) **só como referência**, não como textura. O modelo existente no Sketchfab (TomPL, de um mod de Battlefield 1942) **não tem licença de uso** → só referência. |

## 5. Animações

Tempos em segundos. Valores de **GAMEPLAY** a afinar em playtest, não medidos.

| Estado | Duração | Notas |
| --- | --- | --- |
| EQUIP | 0,7 | Sai da bandoleira, encosta ao ombro |
| HOLSTER | 0,5 | — |
| IDLE / WALK / SPRINT | contínuo | Sway e bob próprios, mais pesados que a M1 |
| AIM (entrar/sair) | 0,30 / 0,22 | Olho alinhado pela alça tangente |
| FIRE | 0,12 | Recuo, kick de câmera, flash e fumaça |
| BOLT_CYCLE | 1,05 | Levantar 0,18 · recuar 0,27 (ejeta estojo) · avançar 0,30 · abaixar 0,18 · reassentar 0,12 |
| RELOAD (clipe, vazio) | 3,40 | Abrir ferrolho 0,45 · clipe na guia 0,55 · empurrar 5 cartuchos 1,10 · fechar ferrolho e expelir clipe 0,60 · reassentar 0,70 |
| RELOAD_SINGLE (cada cartucho) | 0,80 | Ferrolho aberto uma vez no início (0,45) e fechado no fim (0,50) |
| SIGHT_ADJUST | 0,6 | Polegar na folha da alça; clique por passo |
| DRY_FIRE | 0,25 | Clique seco do percussor |

Evitar: mãos atravessando o ferrolho; carregador "mágico" sem clipe visível; cartuchos que não aparecem.

## 6. Som (Prompt §5)

| Camada / evento | Variantes |
| --- | --- |
| Disparo — transiente + corpo | próximo, médio e distante (por timbre, não só volume); interior (casamata) e exterior |
| Cauda ambiente | sobre água (rio), campo aberto e pedra (casamata) |
| Mecânica | ferrolho levantar, recuar, avançar, abaixar; estojo no chão (terra, pedra, madeira, ferro do tabuleiro); clipe na guia; cartuchos empurrados; clipe expelido; clique seco; clique da alça |

Somente gravações originais ou CC0. Nada extraído de jogos.

## 7. Pendências

- P14: resolvida (alavanca reta).
- P15: armamento individual do batalhão.
- Confirmar velocidade inicial e munição, modelo de baioneta e madeira em H30 ou em fonte de museu.
