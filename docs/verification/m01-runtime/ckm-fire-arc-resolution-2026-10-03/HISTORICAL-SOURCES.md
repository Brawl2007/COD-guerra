# Fontes históricas consultadas — arco da ckm da casamata oeste

## Fontes já existentes no repositório

### `missions/m01-tczew/HISTORICAL_RESEARCH.md`

**Prova:** encontros rodoviários de cerca de 32 m com casamatas defensivas sob o tabuleiro; a cabeça de ponte leste tinha pelotão reforçado com duas metralhadoras pesadas; dois postos de disparo das cargas são documentados.

**Confiança:** média para os resumos identificados; o próprio ficheiro marca detalhes de posições como pendentes/reconstruídos.

**Não prova:** ckm específica na seteira sul oeste, orientação ou dimensões da abertura.

### `missions/m01-tczew/BRIDGE_ASSET_REPORT.md`

**Prova de estado do projeto:** existe conflito explícito entre `casemates_west x=0…26` do mapa e o encontro rodoviário modelado `x=-22…10`; interior das casamatas não modelado.

**Confiança:** alta para o estado do asset/repo.

### `research/equipment-timeline.json` / `research/weapons/ckm_wz30.md`

**Prova:** ckm wz.30 é arma plausível do batalhão e o kit tem medidas/documentação própria.

**Limite declarado pelo próprio repo:** “confirmar alocação real na cabeça de ponte”; altura da seteira e tipo de tripé também pendentes.

## Fontes públicas consultadas nesta revisão

### Mosty Tczewskie — “Most drogowy”
URL: https://www.mostytczewskie.pl/index.php/pl/historia/most-drogowy

**Prova:** descreve os dois encontros como estruturas maciças de cerca de 32 m com **casamatas de função defensiva abaixo do nível do tabuleiro**; também descreve a defesa de 1/9/1939 e a destruição dos encontros.

**Confiança:** média-alta para a história/estrutura geral (portal local especializado; detalhes coerentes com a bibliografia técnica).

**Não prova:** planta das casamatas, seteiras específicas ou posição de uma ckm em 1939.

### Tczewska Biblioteka Wirtualna — fotografias/catalogação das pontes
Exemplos:
- https://skarbnica.tczew.pl/1918/tczew-mosty-przez-wisle-mosty-tczewskie-przed-zniszczeniem/
- https://skarbnica.tczew.pl/5768/tczew-mosty-tczewskie-zniszczone-mosty-tczewskie-6/

**Prova:** documentação fotográfica/catalográfica dos portais, torres e pontes antes/depois da destruição.

**Confiança:** alta para identificação dos objetos fotografados.

**Não prova a partir do material encontrado:** geometria interior/abertura de uma seteira da casamata oeste.

### A. Siemaszko et al., Technical Transactions — estudos do Most Tczewski
Consulta pública encontrada via repositório técnico/ResearchGate.

**Prova:** configuração estrutural histórica do bridge/abutments/gates e relevância patrimonial.

**Confiança:** alta para estrutura geral.

**Não prova:** arco de fogo militar das casamatas em 1939.

## Conclusão histórica

A existência e função defensiva geral das casamatas é sustentada. A **orientação útil da seteira sul e a presença de uma ckm wz.30 exatamente naquele ponto não estão sustentadas pelas fontes encontradas**.

Portanto os raios geométricos livres encontrados no scanner não podem ser convertidos em “setor histórico real” sem nova fonte.

## Plantas de arquivo localizadas nesta revisão

### Deutsche Digitale Bibliothek / Deutsches Historisches Museum — *Weichsel-Brücke bei Dirschau – Längsschnitt durch einen Endpfeiler, Tafel VI* (1855)
URL: https://www.deutsche-digitale-bibliothek.de/item/OUY27SXFAM636UQHFUJUO773L4BZUQXO

**Prova:** existe uma prancha histórica específica do corte longitudinal de um encontro da ponte de Dirschau/Tczew, atribuída a Karl Lentze/August Stüler e datada de 1855.

**Confiança:** alta para a existência/proveniência da prancha (catálogo institucional).

**Limite:** nesta tarefa não foram extraídas cotas da imagem da prancha. O registo está em acesso livre, mas sem autorização de reutilização indicada; portanto ele serve como pista documental para revisão, não como geometria copiada para o asset.

### Deutsche Digitale Bibliothek / Architekturmuseum TU Berlin — *Weichselbrücke, Dirschau: Grundriss, Ansicht* (ZFB 05,064)
URL: https://www.deutsche-digitale-bibliothek.de/item/Y4BF32BJWI627F2GITIAJH3QTWPUT7RW

**Prova:** existe planta/vista do conjunto da ponte de 1851–1857 em coleção arquitetónica institucional.

**Confiança:** alta para o documento/catalogação. O item indica licença CC0 para o objeto digital.

**Limite:** a metadata por si só não determina qual abertura corresponde à seteira sul modelada nem fornece automaticamente o seu arco útil.

### Deutsche Digitale Bibliothek / Architekturmuseum TU Berlin — *Weichselbrücke, Dirschau: Längsschnitt Endpfeiler* (ZFB 05,061)
URL: https://www.deutsche-digitale-bibliothek.de/item/E2J37R7RSDYUS232XBNCBRN2SHYIAIE7

**Prova:** existe outro corte longitudinal do encontro no acervo técnico, também licenciado CC0 no catálogo.

**Confiança:** alta para a proveniência do desenho.

**Limite:** ainda precisa de leitura gráfica/cotas antes de alterar `map-layout` ou o gerador dos colliders. Não foi usada uma interpretação visual não verificada para mover a arma nesta tarefa.

### Consequência prática

Estas plantas são a melhor próxima fonte encontrada para resolver o conflito `casemates_west x=0…26` versus encontro do asset `x=-22…10`. Elas **não autorizam uma correção automática nesta branch**: primeiro é necessário interpretar as pranchas, relacionar o encontro desenhado com o sistema de coordenadas do asset e só então alterar a fonte autoritativa do modelo/collider.
