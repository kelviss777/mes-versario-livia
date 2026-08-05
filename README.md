# Kelvin + Livia — 02 meses

Uma experiência web romântica, cinematográfica e mobile first feita com HTML, CSS, JavaScript, GSAP, ScrollTrigger e YouTube IFrame Player API.

## 1. Adicionar as fotos

As fotos reais ficam dentro de `assets/images/` usando exatamente estes nomes:

```text
foto-01.jpg
foto-02.jpg
foto-03.jpg
foto-04.jpg
foto-05.jpg
foto-06.jpg
foto-07.jpeg
foto-08.jpeg
```

As classes `.photo-01` até `.photo-06`, no arquivo `assets/css/style.css`, controlam individualmente o enquadramento de cada foto com `object-position`.

## 2. Adicionar os vídeos

Os arquivos reais ficam em `assets/videos/` com os nomes:

```text
vd-01.mp4
vd-02.mp4
vd-03.mp4
vd-04.mp4
```

Use MP4 com codec H.264 para maior compatibilidade. Os vídeos iniciam mudos, tocam quando entram na tela e pausam quando saem.

## 3. Alterar a música

Abra `assets/js/script.js` e procure, logo no começo, por:

```js
const YOUTUBE_VIDEO_ID = "f7gcY9_4Cw4";
```

A música já está configurada com o ID `f7gcY9_4Cw4`. Para trocar no futuro, altere apenas o valor de `YOUTUBE_VIDEO_ID`.

Para testar a música, abra a experiência por um servidor local ou pelo GitHub Pages. Abrir `index.html` diretamente como `file://` pode fazer o YouTube recusar a reprodução por falta do cabeçalho de referência.

## 4. Colar a carta

Abra `index.html` e procure pelo comentário:

```html
<!-- COLE A CARTA DE KELVIN PARA LIVIA AQUI -->
```

Substitua os parágrafos logo abaixo, dentro de `<div class="letter-paper__body">`. Coloque cada parágrafo entre `<p>` e `</p>`.

O botão **Guardar essa carta** gera o PDF a partir desses mesmos parágrafos; não é necessário atualizar o texto em outro lugar.

## 5. Alterar nomes, data e frases

- Data e horário do início do namoro: objeto `RELATIONSHIP_START`, no início de `assets/js/script.js`. O contador usa o timezone `America/Sao_Paulo` e atualiza a cada segundo.
- Nomes, número de meses e data exibida na abertura: objeto `COUPLE`, logo abaixo.
- Frases da experiência: diretamente em `index.html`.
- Cores principais: variáveis no topo de `assets/css/style.css`.

## 6. Executar localmente

Você pode abrir `index.html` diretamente, mas um servidor local representa melhor o GitHub Pages. Na pasta do projeto, execute uma destas opções:

```bash
python -m http.server 8000
```

Depois acesse `http://localhost:8000` no navegador.

## 7. Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie todos os arquivos mantendo `index.html` na raiz.
2. No repositório, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**.
4. Selecione a branch `main`, pasta `/ (root)`, e salve.
5. O GitHub exibirá o endereço público quando a publicação terminar.

Todos os caminhos usados pelo projeto são relativos e compatíveis com GitHub Pages.
