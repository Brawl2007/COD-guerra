# Auditoria J (PDF M02 pp. 36-37) vs origin/gemini/m02-01-quinta @ 56e98cb (2026-11-04). Leitura de código e grep; testes não executados; repositório não editado.
## J1 SP01 - O portão e as duas rotas (Área A, C03)
- [PARCIAL] Cena e fundamento (Gruca/Wierzba, DRAMATIZAÇÃO): bz39_c03_01..04 e ordem flank_east; sem cena ou estado SP01 próprio.
- [IMPLEMENTADO] MG com visão separada de tiro (hasVisualLoS vs canHitTarget, arco, obstrução por material).
- [PARCIAL] MG no arco, recarga e perda de eficiência sob supressão: arco existe; supressão não verificada.
- [PARCIAL] Portão abre por jogador ou aliado: interactDoor só para jogador; aliados abrem portas na rota (handoff); sem objeto «portão»; cerca breached só por granada, sem rota dedicada.
- [PARCIAL] Reação não explosiva: SURRENDERED automático com MG morta e >= 7 neutralizados (m02-combat-ai.js ~921); sem interação do jogador; retirada não verificada. Handoff diz >= 6 (divergência documental).
- [PARCIAL] Checkpoint B só com posição segura: gravado sem defensores ativos fora de EA0 ou com pz >= 44; «segura» não verificado.
- [PARCIAL] Requisitos técnicos: portas, janelas, supressão e IDs existem; câmara, áudio espacial e versão de bancada não verificados.
- [EM FALTA] Mapa dobrado, rejeição e prova (aliado dispara sem consequência; MG atravessa parede; 60 s): sem teste nos três ficheiros.
## J2 SP02 - A carroça não passa sozinha (Área B, C06)
- [IMPLEMENTADO] Fundamento e volumes água/munição (supplyCart, vol_water, vol_ammo).
- [PARCIAL] Preparação: mensageiro (bz39_c06_01) existe; tripulante a verificar roda e cavalo sem animação nem cavalo.
- [PARCIAL] Avanço sem fogo direto identificado é proxy (inimigo vivo com z < 25 ou em B05/B06 e supressão < 0.65), não linha de tiro; flanco leste (DE-B09..B11) sem percurso testado nem verificação de spawn.
- [IMPLEMENTADO] Roda danificada: IMMOBILIZED, volumes soltos junto à carroça (damageCartWheel).
- [IMPLEMENTADO] Transporte por cobertura com anti-duplicação (SAVE-02, testado); sem explosão da carroça de água.
- [EM FALTA] Cavalo atingido, consequência e tração manual: não existe entidade cavalo.
- [IMPLEMENTADO] Depois: supply_reached, carroça imobilizada no local, TR02 e cp_m02_c_reorganizacao (testado); falta de água sem mensagem moralizante.
- [PARCIAL] Navegação simples: interpolação linear entre waypoints; sem raio de viragem nem colisão de veículo.
- [EM FALTA] Animação de cavalo e arreios; mãos e volume sem atravessar a arma (sem evidência).
- [CONTRADIZ] Alternativa explícita sem cavalo (carroça estacionada): a carroça avança sozinha por waypoints e o handoff apresenta-a como «avança até (0,-48)», sem cavalo nem rótulo de fallback.
- [PARCIAL] Provas: 2/1/0 volumes e SAVE-02 testados; bloqueio do caminho pelo jogador e neutralização cedo não testados.
## J3 SP03 - Um último atravessamento (Área C, C10-C11)
- [IMPLEMENTADO] Local B09 a B12, C10-C11, LG01..LG12 com LG03 e LG09 feridos (layout); dependência HIST-02 não verificada.
- [PARCIAL] Reserva DE-C09..C20 só avança quando o estado exige: goals atribuídos ao entrar em C10; condição não verificada.
- [PARCIAL] Aviso de artilharia visual e sonoro não encontrado (temporizador de 6,0 s existe); impacto fixo não rompe cerca.
- [IMPLEMENTADO] Impacto fixo (4, 0, 18), explosão causal e cratera/entulho persistente que bloqueia a rua exterior (testado); sem calibre histórico fixado.
- [IMPLEMENTADO] Lis em ligação fora da célula em C09-C10 (detachedOutOfCell, testado); regressa ferido com ID único (testado).
- [CONTRADIZ] Regresso com percurso persistente: Lis é posto em (-28, -22) e depois movido diretamente para (-58, 52), dentro de B12, sem percurso.
- [PARCIAL] Lis já incapacitado: estado mantido, mas nenhum substituto faz a ligação.
- [EM FALTA] Entrada de Lis suspensa se a rota estiver sob fogo.
- [PARCIAL] Desenvolvimento (ordem de Gruca, Piotr suprime, apoia rkm, transporta Lis, cobre Szymczak): só dlg_m02_002 e assistência a Lis; rkm e Szymczak não encontrados; retiradas inimigas, rota larga e porta estreita não verificadas.
- [IMPLEMENTADO] Clímax: fala 003 no contacto (3,5 m); sem vitória antes de fechar os destinos (allResolved, O09).
- [EM FALTA] Socorro interrompível, áudio de esforço e persistência entre escalas visuais: sem evidência suficiente.
- [IMPLEMENTADO] Checkpoint antes da resolução (cp_m02_d_cobertura_retirada), importação M03 e os 3 estados de Lis sem duplicação (testado).
- [PARCIAL] Provas de reserva morta cedo, rota bloqueada, auxiliares perdidos e socorro interrompido: código parcial, não testado nos três ficheiros.
Resumo: 32 requisitos; IMPLEMENTADO 10, PARCIAL 15, EM FALTA 5, CONTRADIZ 2. Contagem verificada por grep.
