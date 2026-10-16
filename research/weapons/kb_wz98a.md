# Ficha: karabin wz.98a (Mauser polaco longo)

Arma de Józef Bąk em M01 (`mission.json`, `loadout: ["kb_wz98a"]`), escolhida para mostrar a mistura de espingardas na secção (`kb_wz29.md` §1; P15).
Fontes: T32 (*Karabin wz. 98a*, Wikipédia en/pl; dws-xip.com; muzeumwp.pl; fóruns de coleccionadores só para pormenores), H30 (lida; confirma os dois tipos de Mauser, sem ficha técnica).
Estado: **ficha preliminar**. Os dados vêm de resumos concordantes de busca: as páginas não foram lidas por inteiro, porque `wikipedia.org` está bloqueada neste ambiente.

## 1. Identidade histórica

| Campo | Valor | Certeza |
| --- | --- | --- |
| Designação | *karabin wz. 98a* (kb wz.98a) | ALTA |
| Origem | Cópia polaca da Gewehr 98, mecanicamente idêntica; alça tangente em vez da alça Lange | MÉDIA |
| Fabricante | Fabryka Broni, Radom, 1936–1939 (atraso por secagem da madeira) | MÉDIA |
| Produção | ~44 500 ou ~70 000 segundo a fonte | BAIXA (divergente) |

## 2. Dados técnicos documentados

| Dado | Valor | Certeza |
| --- | --- | --- |
| Calibre | 7,92 × 57 mm Mauser | ALTA |
| Comprimento total | 1250 mm | MÉDIA (T32) |
| Comprimento do cano | 740 mm | MÉDIA (T32) |
| Massa | 4,4 kg | MÉDIA (T32) |
| Carregador | Interno, 5 cartuchos, **clipe de 5** (o mesmo do wz.29) | ALTA |
| Alavanca do ferrolho | **Recta** | MÉDIA |
| Alça | Tangente, 100–2000 m em passos de 100 m | MÉDIA |
| Massa de mira | Lâmina; **sem capuz/orelhas** de origem (os encaixes do capuz são posteriores) | BAIXA |

## 3. Comportamento no jogo

É igual ao wz.29 (`kb_wz29.md` §3): um disparo por ciclo de ferrolho e recarga por clipe. A arma é mais longa e pesada, o que pede um pouco mais de oscilação, a afinar em playtest.

## 4. Modelo 3D (provisório verificado)

| Item | Especificação |
| --- | --- |
| Ficheiro | Malha `rifle_wz98a` em `m01_soldier_pl_lod{0,1,2}.glb` (escondida por omissão) |
| Escala | 1,25 m (teste); a mesma caixa e o mesmo ferrolho do wz.29, coronha 2 cm mais comprida, fuste e cano até −0,895 m |
| Distinguir do wz.29 | +15 cm de cano e fuste; braçadeiras mais à frente; massa de mira sem orelhas |
| Animações | Os clips das espingardas (`fire_bolt`, `reload_clip`, `aim`, locomoção…) servem sem alteração: o ferrolho e as mãos estão nas mesmas coordenadas |
| Sockets | `extras.weapons.wz98a` (a boca em z −0,895) |

## 5. Pendências

- P15 (armamento do batalhão) continua aberto.
- Confirmar a massa de mira de 1939, a posição dos zarelhos da bandoleira e a baioneta wz.24.
