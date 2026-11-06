# Handoff do Capitão — M01, 2026-11-06

**Linha:** `claude/dreamy-ramanujan-6v62vr` @ `a881058b` (publicada). **Não é a #80; nada está na #80 nem na `main`; sem deploy.** Resumo com SHAs: topo de `docs/direction/M01_INTEGRATION_LEDGER.md`. Estado de tudo: **INTEGRADA SEM VALIDAÇÃO DE JOGO**.

## O que a M01 tem nesta linha

- **Ato I (jogo distribuído):** pacote 2 (pó que cega a IA, desenhado com a mesma espessura; socorro por Dudek; granadas alemãs reais; saves antigos compatíveis com mudanças de `safeX`) e emenda 22 (textos PT-PT, Pawlak mensageiro, tiro de apoio alemão e busca com movimento; efeito de obus).
- **Atos novos atrás de `acts.enabled=false`:** VII-a (duas vagas, CP-E/CP-F, supressão das MG34, morte justa D35), VII-b (barragens que só atordoam o jogador, maqueiros em fila com maca, CP-I/CP-I2, morte justa), VII-c (ordem «Por volta das 17:00», retirada ao anoitecer com luzes de guia, CP-J/CP-K, estado final guardado). QA: `?act=vii-a|vii-b|vii-c`, `?acts=1`. «Continuar» seguro com saves dos atos.
- **Apresentação e desempenho:** alça da kb wz.29, mãos, campo/árvores/berma, áudio provisório dos atos da área, renderer da área com níveis e libertação de recursos.

## Verificação feita

- Revisões críticas independentes em cada pacote e uma revisão de toda a linha (23 achados, 16 confirmados, todos corrigidos e verificados).
- `npm test` completo **2042/2042** em `7b282723` (as mudanças seguintes só tocam um spec de browser e documentos).
- Browser completo em `7b282723`: 216/233; as 17 restantes resolvidas: 1 spec corrigido (`m01-german-retreat`, a nuvem da demolição leste tapa a vista como a simulação manda), 16 de ambiente/instáveis a passar com a configuração certa (`npm run build:browser`; grading sem `CI` ou com `M01_GRADING_BEFORE_DIR`).
- Goldens: Ato I emenda 22 `check: identical`; VII-a/b/c `check: identical`.

## Para o proprietário (não faço sem ti)

1. **Playtest** com `docs/direction/M01_PLAYTEST_GUIDE.md` (Ato I e, com `?acts=1`, VII-a → VII-c).
2. **FPS** no PC de referência (Intel HD 5500, 1366×768) — T49.
3. **Revisão nativa do polaco** (falas 118, 220–226 e as novas dos atos).
4. **Decisões:** `safeX` 190 / `closeExtraSec` 100; nuvem da demolição leste (escolta mais fácil; também tapa a vista do tabuleiro às 06:12); D45 (luta do VII-a sob a opção B); D-2 insígnias; D-5 sonda na retirada (fora); tamanho da 2.ª vaga do VII-a; ligar `acts.enabled`; **autorizar o merge `--no-ff` desta linha na #80**.
5. **Fontes:** muzeum1939.pl (H01-PDF), wikipedia.org, konflikty.pl e warhistory.org não abrem nesta sessão cloud. Fornece os PDFs ou permite esses domínios; até lá a tarde de 1/9 (VII-b/VII-c) fica RECONSTRUCTED/BLOQUEADA. `research/SOURCES.md` diz H01-PDF «INTEGRAL» mas o R4 diz que não foi guardado: por resolver.

## Notas de operação

- Disco: cada cópia de trabalho do repositório ocupa ~1 GB; remover as que já estão integradas (`git worktree list`). Ramos locais de pacote (`fix*`, `area-*`, `pkg*`, `inc*`…) já estão integrados e podem ser apagados quando quiseres.
- Specs de browser: `CHROME_EXECUTABLE=/opt/pw-browsers/chromium`; nunca `playwright install`; páginas de autoria só com `npm run build:browser`.
- M02: integrada só com ficheiros novos; o trabalho segue noutra conversa (prompt dado ao proprietário); `docs/direction/M02_BZURA_DESIGN.md`.
