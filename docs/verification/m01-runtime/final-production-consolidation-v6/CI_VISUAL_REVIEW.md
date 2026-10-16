# Inspeção das capturas Battlefield FX

Foram inspecionadas as 12 imagens PNG do artefacto CI `11552374346`, depois de verificar o SHA256 do ZIP. O [contact sheet](ci-visual/fx-contact-sheet.jpg) reúne todas; as originais permanecem no artefacto do [run 37782266838](https://github.com/Brawl2007/COD-guerra/actions/runs/37782266838). Granada e demolição oeste estão também preservadas nesta pasta à resolução original.

- A [granada](ci-visual/grenade-small-near-high.png) mostra a emissão quente compacta e poeira junto ao solo. O contraste amarelo distingue-a do ambiente, sem preencher todo o ecrã.
- A [demolição oeste](ci-visual/west-demolition-high.png) mostra fumo escuro elevado, com camadas e bordos suaves. A estrutura, estação, vagão, soldados e vegetação continuam visíveis no mesmo frame.
- A demolição leste High/Low e a fase smoke usam uma vista axial dentro da treliça. A explosão fica distante/oculta pela estrutura; a comparação dessas imagens é prova limitada da composição do efeito. Os contadores, IDs e fases correlacionados no teste provam geração/expiração, mas não transformam esta vista numa demonstração clara do colapso.
- Nas vistas de impacto de terra/pedra/madeira, os chips são pequenos à distância normal e no contact sheet não têm leitura forte. Foi conferida a imagem inteira, não só thumbnails. Mantém-se a necessidade de playtest para legibilidade; não se acrescentaram emissões ou se prolongaram tempos nesta consolidação.
- As vistas de raid/bombardeio têm escala distante. O ambiente não apresenta corrupção de materiais, massas de partículas no primeiro plano ou contagem ilimitada. Elas não certificam a encenação do Ju87 ou a fidelidade histórica da arquitetura.

Os seis testes críticos passaram; esta inspeção distingue sucesso funcional de qualidade artística. A ferramenta de pausa captura relógio e apresentação reais. Nenhum frame gerado, composição substituída ou FPS estimado foi usado como evidência.
