# Guarnição ckm — runtime, 2026-10-03 UTC

Base: b734cb0703013c36416f4cda269d558ae0602394. Código: f4703350e950e5f70bd87d3190b4dc2a1cf0ef04, tree c5323de90866e5d7980664847390e3e67a3f1c46. M01 continua PROTÓTIPO JOGÁVEL.

## Entrega

Três IDs persistidos: ckm_gunner, ckm_loader e ckm_reserve, grupo grp_ckm_crew. Atirador/municiador usam offsets e orientação do manifesto, raiz da arma [22,-3,43], atrás de cv_casemate_emb_s. Terceiro homem usa clips existentes. A casamata fica abaixo do tabuleiro: todos começam a -3 m; a navegação da saída e a subida gradual ao terreno são provisórias.

A simulação guarda ckm.phase/startedAt/visible. Após o evento existente east_demolition, os homens activos passam por abandon (3 s do clip) antes de retreat. MoveActor original conservado; caminho local da guarnição passa pelo portal aberto e termina fora de bz_west. Readiness, relógios, gates, baixas, RNG e combate existentes não foram reescritos. A arma abandonada fica visível até à demolição oeste, segundo os dados da simulação.

Renderer carrega kit opcional, conserva presets/limites e cache, amostra idle/abandon da arma e operadores pelo mesmo tempo guardado e mantém corpos abatidos. Kit incompleto falha como conjunto, devolvendo clips existentes e apresentação procedural. Sem novo relógio de gameplay, disparos ou munição inferidos no renderer.

Schema 2 aceita o elenco legado exacto de 86 actores ou o elenco novo exacto de 89. Grupos parciais/IDs estranhos/fases ilegais são rejeitados antes de modificar a instância. Saves legados recebem apenas a guarnição ausente; os actores anteriores e RNG são conservados. Depois da demolição leste, a guarnição ausente é normalizada directamente na posição segura, sem reabrir a demolição nem voltar à casamata. Saves novos preservam fase/posições/baixas exactamente.

## Limites

Não existe decisão de disparo para esta arma no runtime. ae_s2_ckm_east [1045,0,30] é um emissor diferente; não foi transferido para a casamata oeste. fire_burst/aim/feed e combate real da ckm permanecem pendentes. Altura da seteira/plataforma e passagem da casamata exigem revisão visual/mapa: não elevar/reescalar a arma ou inventar tiros para aparentar integração completa. Guarnição MG34 e estados dos vagões continuam pendentes.

Testes Node usam geometria/rig/clips reais; apenas descodificação de texturas é omitida pelo loader de teste Node. O navegador carrega os GLBs e texturas de produção. Testes automatizados não são playtest humano nem medição no Chromebook.

## Verificação

168/168 Node; build passou (1041,19 kB / 270,17 kB gzip, aviso existente de chunk grande). 2/2 casos novos passaram inicialmente. A suíte integral seguinte encontrou uma regressão: sem clips base, dois operadores da ckm permaneciam activos. Corrigido hasCKM para exigir standing_idle. Após a correcção: 168/168 Node e build; 3/3 navegador focado em 80,748 s, zero falhas/skips/retries/instáveis/erros globais. A suíte integral final foi iniciada, mas o relatório /tmp/ckm-browser-final.json já não está disponível nesta retoma: resultado integral NÃO confirmado, voltar a executar antes de integrar o candidato do PR #32.

12 blocos literais de substituição em substituicoes.txt/json, com linhas originais da base, aplicados em memória e comparados byte a byte com os dois ficheiros finais. 111 outros ficheiros em src/assets e checkpoint Graphify conservados byte a byte, hashes em preserved-files.json. Sem extração Graphify, merge em main, deploy ou workflow_dispatch.

CI da base b734cb: run 37081592590, validate success (Node/build/browser); deploy skipped. CI do novo commit pertence a uma validação separada.

A captura m01-ckm-abandon.png é a vista original do jogador sobre a ponte, não um grande plano da guarnição; prova de amostragem vem dos diagnósticos/testes. Os logs brutos em /tmp desapareceram entre turnos; não atribuir uma aprovação integral a esta entrega.
