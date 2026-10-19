import json
from pathlib import Path
r=Path('/workspace/COD-guerra/docs/verification/m01-quality-inspector');s=json.loads((r/'scorecard.json').read_text())
for c in s['categories']:
 if c['category']=='Armas':c.update(score=3.5,confidence='média na apresentação, insuficiente na sensação',reason='wz.29 tem estados funcionais, mas arma/braço ficam descompostos depois do resgate, persistindo em aim sem transporte; sensação e realismo auditivo não julgados.')
(r/'scorecard.json').write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
lines=['# Scorecard crítico','','As notas são juízos editoriais sobre o alcance local documentado. High foi inspecionado no início e no percurso até à entrega da mensagem; o percurso técnico usa Low/640×360. Não houve escuta, playtest humano nem gameplay externo observado. Uma categoria sem cobertura suficiente fica NÃO VERIFICADO. Não se calcularam médias para esconder contratos críticos quebrados.','','| Categoria | Nota / 10 | Confiança e fundamento | WaW / WWII / COD 1 |','| --- | ---: | --- | --- |']
for c in s['categories']:
 score='NÃO VERIFICADO' if c['score'] is None else str(c['score']);lines.append(f"| {c['category']} | {score} | {c['confidence']}: {c['reason']} | NÃO VERIFICADO |")
lines+=['','A nota geral 4/10 é um juízo editorial sobre a amostra observada e não aprova a missão como produto acabado. A história escrita tem potencial superior à sua apresentação atual; a distinção é discutida em D. A interpretação deve conservar os limites de observação, sobretudo animação dinâmica, IA, áudio e performance. Validar diversão, emoção e clareza natural exige pessoas no PC-alvo.']
(r/'SCORECARD.md').write_text('\n'.join(lines)+'\n')
