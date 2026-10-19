from pathlib import Path
import shutil,json,hashlib,datetime,re
r=Path('/workspace/COD-guerra');out=r/'docs/verification/m01-quality-inspector';e=out/'evidence';s=Path('/workspace/scratch/m01-quality-inspector');run=r/'test-results/m01-quality-inspector-adapted-68301b7'

(e/'observer').mkdir(exist_ok=True)
for p in s.glob('observer-*-g*.png'):shutil.copy2(p,e/'observer'/p.name)
for name in ['observer.jsonl','observer-images.jsonl']:shutil.copy2(s/name,e/'observer'/name)
for name in ['generate-report-a.py','generate-score.py','write-findings.py','dialogue-exposure.py','prepare-final-evidence.py']:shutil.copy2(s/name,e/'tools'/name)
report=json.loads((e/'route/report.json').read_text());reviewed={'01-menu.png','03-intro.png','09-bombing.png','12-sappers-site2.png','13-repair.png','17-hold-access.png','19-withdrawal.png','33-bak-found.png','34-bak-carry-deck.png','35-bak-carry.png','36-bak-delivered.png','39-east-demolition.png','40-east-demolition-6s.png','42-firing-point.png','43-corridor-1.png','45-corridor-3.png'}
# End-stage photos actually inspected are supplied in a local text list, never assumed from capture success.
extra=s/'reviewed-final-images.txt'
if extra.exists():reviewed.update(extra.read_text().splitlines())
keep=set(reviewed)
for x in report['screenshots']:
 if not re.search(r'-(?:corridor|withdrawal)-[0-9]+\.png$',x['file']):keep.add(x['file'])
for prefix in ['corridor','withdrawal']:
 group=[x for x in report['screenshots'] if re.search(r'-'+prefix+r'-[0-9]+\.png$',x['file'])]
 for fraction in [0,.25,.5,.75,1]:
  if group:keep.add(group[round((len(group)-1)*fraction)]['file'])
for name in keep:
 if (run/name).exists():shutil.copy2(run/name,e/'route'/name)

lines=['# Catálogo das capturas do percurso','','Todas as capturas brutas permanecem em `test-results/m01-quality-inspector-adapted-68301b7/` no workspace. O pacote conserva as transições, as provas citadas e uma amostra das séries repetidas. Linhas sem link não foram duplicadas no pacote.','','As descrições vêm do piloto e não garantem que o efeito nomeado esteja visível. A coluna de inspeção regista as fotos efetivamente abertas pelo auditor. Não é vídeo nem playtest humano. Low/640×360 nesta rota; as fotos High independentes estão em pastas próprias.','','| Captura | Real (s) | Batalha | Descrição automática | Inspeção visual |','| --- | ---: | --- | --- | --- |']
for x in report['screenshots']:
 label=f"[{x['file']}](evidence/route/{x['file']})" if (e/'route'/x['file']).exists() else f"{x['file']} — só saída bruta local"
 lines.append(f"| {label} | {x['real']} | {x['battle']} | {x['note']} | "+('Inspecionada' if x['file'] in reviewed else 'Capturada; conteúdo não revisto individualmente')+' |')
(out/'CAPTURAS.md').write_text('\n'.join(lines)+'\n')
manifest=[]
for p in sorted(e.rglob('*')):
 if p.is_file() and p.name!='artifact-manifest.json':manifest.append({'file':str(p.relative_to(out)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(e/'artifact-manifest.json').write_text(json.dumps({'baseline_head':report.get('head','68301b779b856af46ed35a10fde42df9559d9ed4'),'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':manifest,'bytes':sum(p['bytes'] for p in manifest)},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'evidence_files':len(manifest),'bytes':sum(p['bytes'] for p in manifest),'route_screenshots':len(report['screenshots']),'retained_route_images':len(list((e/'route').glob('*.png'))),'individually_reviewed_route_images':len(reviewed)}))
