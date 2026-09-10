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

- **Schema.org Article** no `<head>`: `headline`, `image`, `author`,
  `publisher`, `datePublished` e `dateModified`.
- **Imagem OG própria** em `assets/og/{slug}.png` (1200x630). Nunca reaproveite
  a imagem de outro artigo: o card de compartilhamento fica igual e o Google
  trata como conteúdo duplicado.
- **Entrada em `blog/queue.json`** com `date` (AAAA-MM-DD), `file`, `title`,
  `excerpt` e `date_label`.

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
