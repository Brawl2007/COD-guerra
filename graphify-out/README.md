# Graphify — checkpoint incompleto

O utilizador autorizou o projecto completo e depois pediu passagem para outro chat para reduzir o consumo. Não existe ainda um grafo final. `checkpoint.json` indica a cobertura real; `extraction-checkpoint.json.gz` preserva AST, chunks válidos e filas para continuar sem refazer as imagens concluídas.

Graphify 0.9.73; sem Gemini API ou modelos pagos. Os agentes atingiram o limite de utilização. Os zeros de tokens nos chunks são placeholders do schema: consumo real não está disponível. Não declarar poupança efectiva do ChatGPT a partir deles.

Antes de continuar: reler a skill Graphify, restaurar paths `source_file` para a nova raiz, conferir hashes/fontes, reextrair documentos alterados e terminar imagens pendentes. Só então cache, merge AST/semântica, health check, comunidades, JSON/HTML, benchmark e manifesto. Não carimbar como concluídos documentos desactualizados ou imagens não extraídas.
