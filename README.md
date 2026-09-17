# rodrigo-rocha-lp

Site e blog de rodrigorochaads.com.br. HTML estático, sem build. O deploy é
automático: o que entra na branch `main` vai pro ar via Vercel em ~1 minuto.

## Publicar um artigo do blog

**Publicação é automática.** Todo dia às 08:00 BRT, o GitHub Action
`.github/workflows/publicar-blog.yml` roda `node publicar.js --aplicar`. Se
tiver algum artigo em `blog/queue.json` com data igual ou anterior a hoje,
ele publica (card no index + `<loc>` no sitemap + saída da fila), commita e
dá push. O Vercel sobe em seguida.

Ou seja: escreveu o artigo, colocou no `queue.json` com a data certa, deu
push. No dia, publica sozinho. Não precisa fazer nada.

Pra publicar na hora (fora do horário do Action), ou pra testar:

```bash
node publicar.js            # simula, não grava nada
node publicar.js --aplicar  # grava; depois: git add -A && git commit && git push
```

O script se recusa a rodar (sem gravar nada) se o arquivo do artigo não
existir, se ele já estiver listado no index, ou se faltar campo no
`queue.json`.

## Escrever um artigo novo

Copie um artigo existente de `blog/` como base — todos seguem a mesma
estrutura. Não esqueça de:

- **Schema.org no `<head>`**, três blocos: `Article` (`headline`, `image`,
  `author`, `publisher`, `datePublished`, `dateModified`), `FAQPage` (as mesmas
  perguntas do bloco visível) e `BreadcrumbList` (Início > Blog > título).
- **Bloco "Perguntas frequentes"** (`<section class="article-faq">`) entre o
  fim do `article-body` e o `diag-promo`: 3 perguntas curtas que alguém
  digitaria no Google, com resposta direta de 2 a 4 frases tirada do próprio
  artigo. É o que o Google usa pra snippet e o que a IA cita. As perguntas do
  `FAQPage` têm que ser idênticas às visíveis, senão o Google ignora o schema.
- **`llms.txt`** é regenerado sozinho na publicação (a partir do sitemap e da
  meta description). Não edite a lista de artigos à mão.
- **Imagem OG própria** em `assets/og/{slug}.png` (1200x630). Nunca reaproveite
  a imagem de outro artigo: o card de compartilhamento fica igual e o Google
  trata como conteúdo duplicado.
- **Entrada em `blog/queue.json`** com `date` (AAAA-MM-DD), `file`, `title`,
  `excerpt` e `date_label`.
- **Bloco de tags no fim do `<body>`** igual ao dos outros artigos (vem junto ao
  copiar). Nunca cole o snippet do Meta Pixel ou do Clarity direto na página:
  eles só podem carregar depois do aceite, e quem faz isso é o
  `assets/consent.js`. Pra conferir que nenhuma página escapou:

```bash
grep -L 'src="/assets/consent.js"' index.html politica-de-privacidade.html blog/*.html diagnostico-compliance/index.html; grep -l 'fbevents.js\|clarity.ms/tag' index.html politica-de-privacidade.html blog/*.html diagnostico-compliance/index.html
```

  (a primeira lista deve sair vazia, a segunda também).

## Cookies e LGPD

O aviso de cookies, a política de privacidade (`politica-de-privacidade.html`)
e o carregamento condicional das tags vivem em `assets/consent.js`. Modo
básico: nada de terceiros (nem o GA4) carrega antes do aceite. Duas categorias:
"estatísticas" (GA4 + Clarity) e "anúncios" (Meta Pixel + sinais de anúncio do
GA4). A escolha fica em `localStorage` por 12 meses, com `CONSENT_VERSION`:
se a política mudar de forma relevante, suba o número no `consent.js` e o
aviso reaparece pra todo mundo. O botão "Preferências de cookies" do rodapé
reabre o aviso. Os `gtag('event', ...)` das páginas ficam guardados por
`typeof gtag === 'function'`, então sem aceite eles simplesmente não rodam.

## Duas armadilhas que já morderam este blog

**Link prematuro.** Nunca linke pra um artigo que ainda está na fila com data
posterior à do artigo que está linkando — o leitor cai num 404. Isso já
aconteceu duas vezes. Pra checar tudo de uma vez:

```bash
node -e "const f=require('fs'),q={};for(const a of require('./blog/queue.json'))q[a.file]=a.date;let n=0;for(const x of f.readdirSync('blog').filter(x=>x.endsWith('.html')&&x!=='index.html')){const s=q[x]||'2000-01-01';for(const t of new Set([...f.readFileSync('blog/'+x,'utf8').matchAll(/href=\"\/blog\/([a-z0-9-]+\.html)\"/g)].map(m=>m[1])))if(!f.existsSync('blog/'+t)){console.log('404:',x,'->',t);n++}else if((q[t]||'2000-01-01')>s){console.log('PREMATURO:',x,'->',t);n++}}console.log(n+' problema(s)')"
```

**Artigo órfão.** Todo artigo novo precisa receber pelo menos 2 links vindos de
outros artigos, no meio do texto, saindo de uma frase que já fazia sentido —
não numa caixinha de "leia também" no rodapé. Artigo que ninguém linka o Google
entende como pouco importante e demora muito mais pra ranquear. Pra ver quem
está órfão:

```bash
cd blog && for f in *.html; do [ "$f" = index.html ] && continue; echo "$(grep -l "href=\"/blog/$f\"" *.html | grep -vx "index.html\|$f" | wc -l) <- $f"; done | sort -n
```
