# Assets binários necessários após a V4 textual

Este PR mantém apenas código e assets de texto. Os modelos `.obj/.mtl` atuais e o áudio procedural são placeholders originais e redistribuíveis. Os seguintes assets deverão ser produzidos ou licenciados antes de uma versão de produção:

| Nome | Tipo | Finalidade | Caminho esperado |
| --- | --- | --- | --- |
| M1 Carbine final | GLB | Modelo final da arma, mãos, rig e clips de tiro/recarga | `assets/models/production/m1-carbine.glb` |
| Soldado aliado final | GLB | Humanoide aliado com esqueleto, equipamento e animações | `assets/models/production/allied-rifleman.glb` |
| Soldado inimigo final | GLB | Humanoide inimigo com esqueleto, uniforme e animações | `assets/models/production/axis-rifleman.glb` |
| Materiais da aldeia | PNG/KTX2 | Albedo, normal e roughness para pedra, tijolo, madeira, terra, metal e tecido | `assets/textures/production/` |
| Disparo M1 | WAV/OGG | Disparo próximo e variações distantes | `assets/audio/production/m1-shot.ogg` |
| Recarga M1 | WAV/OGG | Magazine, ferrolho e manuseio da arma | `assets/audio/production/m1-reload.ogg` |
| Impactos | WAV/OGG | Variações para madeira, pedra, metal e terra | `assets/audio/production/impacts/` |
| Explosão de granada | WAV/OGG | Explosão próxima e cauda distante | `assets/audio/production/grenade-explosion.ogg` |
| Ambiente de guerra | WAV/OGG | Artilharia, metralhadoras, aviões e explosões distantes | `assets/audio/production/ambience/` |
| Vozes de esquadrão | WAV/OGG | Ordens, alertas, granadas, avanço e contato | `assets/audio/production/voices/` |

Todos os arquivos futuros deverão possuir autoria original ou licença compatível documentada antes de serem adicionados ao repositório.
