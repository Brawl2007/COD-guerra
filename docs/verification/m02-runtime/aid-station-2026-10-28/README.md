# B12 — macas no posto de socorro

Código testado: `7221862`. As duas macas usam as proporções de lona e varais da M01 e os materiais de lona/madeira partilhados, adaptados aos dois obstáculos B12 existentes. As duas caixas decorativas que não tinham colisão foram removidas. A colisão continua a ser a caixa original, incluindo o espaço vazio à volta e acima dos varais; não é uma colisão detalhada da lona.

- `node --test tests/m02*.test.js`: 115 testes, zero falhas.
- `npm run build`: concluído; aviso existente sobre tamanho dos bundles.
- `CI=1 CHROME_EXECUTABLE=/usr/bin/chromium npx playwright test tests/browser/m02-mission.spec.js --grep 'B12 aid station|C11 Lis is helped' --reporter=line`: dois testes passaram. A primeira tentativa sem `CHROME_EXECUTABLE` falhou porque o Chromium do Playwright não estava instalado no cache; foi repetida com o Chromium do sistema.
- [Captura High de B12](b12-aid-stretchers.png): Chromium/SwiftShader, 1280 × 720, cenário controlado com Piotr posicionado no posto e atores removidos. Não é playtest humano nem medição de GPU. O cenário continua simples e precisa de desenvolvimento artístico.
- A simulação, mundo e missões são idênticos a `e4a4632`; o último percurso completo foi executado nessa versão e não foi repetido para esta alteração visual. A prova de percurso está em [Lis](../lis-contact-2026-10-28/README.md).
