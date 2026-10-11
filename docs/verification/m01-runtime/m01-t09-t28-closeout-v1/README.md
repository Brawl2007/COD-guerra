# T09 / T28 — biblioteca de materiais e terreno macro

TASK_ID: `M01-T09-T28-MATERIALS-CLOSEOUT-V1`. Base: `claude/m01-integration` em `6edc3d6f90ea5e12b4d0f554555bac8499423acc`. Código aceite: `codex/m01-t09-t28-materials-closeout-v1` em `c739b08549d5f08963984eb644b40bebcb91cfd8`. Estado: **ACEITE** (verifier PASS, reviewer ACCEPT, ambos os CI verdes). Publicação da integração depende dos testes do resultado da junção.

Retomada selectiva do WIP parado `7010f0f`: preserva o kit de props aceite e as restantes entregas da integração. T09 fornece 16 materiais originais, albedo/normal/ORM partilhados, High 1024² e Low 512², gutters periódicos, manifesto SHA/licença e galeria a 1/5/20 m. T28 aplica a máscara macro, caminhos, balastro, lama, margens húmidas e projecção triplanar nas encostas. Low usa só a máscara; High e Média usam quatro mapas de detalhe. O conjunto High ocupa 27 MiB RGBA8 descodificados, sem contar mipmaps.

## Evidência

- `build.log`: build de produção, 84 módulos; aviso habitual de bundle acima de 500 kB.
- `agent-tooling.log`: 173 testes Python, PASS. O sandbox sem rede impedia sockets/subprocessos; a execução válida permitiu essas capacidades.
- `node-full.log`: primeira execução, 635/638; dois contratos de cache de água/grading corrigidos sem alterar os seus testes. A terceira falha já existia na base.
- `baseline-ci-failure.txt`: CI `38170611906`, commit de reivindicação sem alterações de código, 605/606; falha no gerador de props.
- `terrain-browser.log` / JSON: primeira execução, 7/9. Margem húmida e comparação depois da troca de qualidade tiveram critérios corrigidos na ferramenta de prova, sem mudanças no produto.
- `terrain-bank-recheck.log` / JSON: margem húmida passou com mudança de píxeis no solo e controlo de céu exacto.
- `terrain-churn-recheck.log` / JSON: PASS 1/1; Low/High regressam a 102/132 texturas globais, respectivamente, e o relógio continua em 0,75 s.
- `atlas-browser.log` / JSON: PASS 3/3; 96 capturas, 16 materiais × três distâncias × duas qualidades, mais troca High/Low/High. A primeira execução (`atlas-first-browser.log`) detectou o favicon ausente; a página agora declara um ícone inline e conserva as verificações rigorosas de HTTP/console.
- Capturas e diagnósticos de terreno: `../m01-terrain-war-ground-v1/`. `terrain-comparison.jpg` combina as capturas originais, anterior/T28 a 1/5/50 m.

O A/B troca somente o material no mesmo quadro pausado, verifica estado de save/eventos/relógio, igualdade de geometria/chamadas de desenho e retorno ON/OFF/ON a píxeis idênticos. Solo seco exige mais detalhe local; lama molhada conserva o requisito macro e prova de mudança visível. A troca de qualidade pode actualizar LODs de outros sistemas: a comparação exclusiva de materiais começa no quadro High obtido depois da troca, enquanto os testes de relógio/save e recuperação de texturas abrangem toda a sequência.

## Correcção prévia necessária para integrar

Os GLB de dois carrinhos diferiam da regeneração em apenas oito componentes NORMAL quase zero: diferença máxima `2.45e-16`, sem diferenças de JSON, posições, cores, índices ou tamanhos. O comparador de reprodução agora normaliza exclusivamente componentes Float32 NORMAL com valor absoluto abaixo de `1e-12`. Todas as outras bytes continuam exactas; os SHA do manifesto em disco continuam a validar as bytes reais. O gerador repetido na mesma plataforma continua obrigado a produzir bytes idênticas. Casos de mutação rejeitam posições, normais maiores, cores, índices, JSON e metadados. Nenhum modelo nem manifesto existente foi regravado.

## Limites

M01 continua PROTÓTIPO JOGÁVEL. Não foram medidos FPS nem VRAM em GPU real; os bytes são calculados. High/Média têm aproximadamente 9 leituras de textura por fragmento plano e até 45 no caminho triplanar antes das optimizações do compilador. A galeria é uma ferramenta de autoria em Vite; o terreno foi executado no build de produção. O atlas é opt-in para futuros consumidores: `surface()` mantém as bytes originais e os materiais de props/modelos existentes são preservados.

CI final **PASS**: [38174455690](https://github.com/Brawl2007/COD-guerra/actions/runs/38174455690), **639/639 Node**, **173 tooling**, build; [38174455699](https://github.com/Brawl2007/COD-guerra/actions/runs/38174455699), **terreno 9/9**, **atlas 3/3**, regeneração exacta e autoridade preservada. Logs originais completos: `ci-final-node.log` e `ci-final-browser.log`. Artefacto CI `11714853806`, 21.9 MB. A cabeça inclui o favicon corrigido; material do jogo igual a `3c3a66c`.

Verificador e revisor independentes deram PASS/ACCEPT em `c739b08`, sem defeitos de código restantes. O workflow visual só volta a executar quando código, ferramentas, texturas ou testes mudam; actualizações documentais conservam as provas da mesma árvore de código. O resultado da integração será registado no handoff após testar a junção.
