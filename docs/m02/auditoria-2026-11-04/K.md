# Auditoria M02 — secção K (Personagens, diálogo e continuidade), PDF pp. 38–40 vs origin/gemini/m02-01-quinta @ 56e98cbf
(transcrito pelo Capitão a partir do relatório do auditor; dados de apoio: pdf_k3.tsv, cmp.py nesta pasta)
- OK: elenco e patentes (sierż. Gruca, strz. Lis, strz. Wierzba, strz. Małek, sanit. Szymczak, strz. Piotr Sokół); ids pl_gruca/pl_lis/pl_wierzba/pl_malek/pl_szymczak/piotr_sokol; patentes propostas até aprovação (K1); falas protegidas dlg_m02_001..003 literais; sem Jan Wrona nem Zieliński no código M02 (K1 manda não importar o protagonista nem a secção da M01).
- DIVERGÊNCIAS (PENDENTE): bz39_c01_02 (Małek «Levo estas também?») e bz39_c01_03 (Lis «Deixa espaço para a água.») ausentes; bz39_c01_01 «Depois a quinta» ≠ PDF «Depois da quinta»; bz39_c04_05 «Baixe» ≠ PDF «Baixa».
- ALERTAS: Nowak, Kowalski e LG01–LG12 não estão no PDF; datas fixas 10 Set (afternoon_1939_09_10) e 25 Set (M03) contrariam K5 até CONT-01; dlg_m02_001 e bz39_c01_01 disparam no início de C01 sem a condição «olhar livre» de K2.
- Continuidade M01: o PDF não diz como Jan Wrona se relaciona com Piotr Sokół; a única ligação é a transitionNote de missions/m01-tczew/mission.json (troca para Piotr Sokół, Exército Poznań).

## Correção pós-auditoria (Capitão M02 / worker de texto, 2026-11-04)
- Conferido contra o PDF (camada de texto e imagem, K3 p. 39): `bz39_c01_01` = «Ao próximo talude. Depois a quinta.» e `bz39_c04_05` = «Baixe a arma. Ele já não combate.». O código já tinha estes textos literais; as divergências «Depois da quinta» e «Baixa» listadas acima eram falsos positivos do auditor. Os testes `tests/m02-08-dialogue-k.test.js` fixam os literais.
- `bz39_c01_02` e `bz39_c01_03` acrescentadas (K3). `dlg_m02_001` passou a exigir «olhar livre» e ausência de ordem crítica (K2).
- Nowak, Kowalski e LG01–LG12 marcados `sourceStatus: 'fora_do_pdf'` (não apagados). Nota: o PDF usa LG01…LG12 como IDs agregados (I4) e cita Nowak em I6 (p. 35); só os nomes/identidades estão fora do PDF.
