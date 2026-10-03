# Validação — M01 ViewModel Visual V2

Base: `2cfa9520a09c68629e3d98d6e7f4dc0d8f9e6732`

## Teste focado

Com Node 24.21.0:

```sh
node --test tests/m01-character-assets.test.js
```

Resultado real: **11/11 passed**, zero fail/skip.

Esse teste já cobre directamente:
- recorte real dos braços do GLB;
- fonte world intacta;
- atributos interleaved;
- reload real em LOD0/LOD1;
- arma, `weapon_clip` e `hand_r` dentro do frustum;
- vértices de manga atrás da near plane;
- frame reproduzível em pausa.

Uma experiência de diminuir o pitch/offset de reload foi rejeitada porque o teste legítimo colocou `hand_r` fora do frustum. A assertion não foi relaxada.

## Suíte Node completa

Comando equivalente executado com Node 24:

```sh
node --test tests/*.test.js
```

Resultado real: **178/178 passed**, zero fail/cancelled/skipped/todo.  
Duração reportada: **23893.545798 ms**.

## Build

```sh
npm run build
```

Resultado real: sucesso com Vite 8.3.1.

Artefactos reportados:
- `dist/index.html` 3.99 kB / 1.79 kB gzip
- CSS 8.12 kB / 2.69 kB gzip
- JS 1,041.67 kB / 270.38 kB gzip

Aviso existente de chunk >500 kB; não é regressão específica deste patch.

## Browser proporcional

Preview de produção servido somente em `127.0.0.1:5184/COD-guerra/`, viewport **1280x720**, qualidade **low**.

Foram exercitados com UI/controles reais:
- idle/arma baixa;
- aim;
- tiro;
- início/meio/fim de `fire_bolt`;
- início de `reload_clip`;
- clipe entrando;
- fim da recarga;
- recarga parcial de cartucho único;
- sprint;
- pausa;
- restart/restore do checkpoint.

Resultado depois do patch:
- `errors.json = []`;
- pausa: `clockEqual=true`;
- pausa: `viewModelEqual=true`;
- restore voltou a um ViewModel activo/visível;
- LOD0 passou de **1603** para **1631** triângulos no recorte dos braços por conservar a transição de clavícula.

Não foi declarado playtest humano nem FPS de Chromebook.
