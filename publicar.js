#!/usr/bin/env node
/**
 * publicar.js — publica os artigos da fila cuja data já chegou.
 *
 * Uso:
 *   node publicar.js            → mostra o que faria, sem gravar nada
 *   node publicar.js --aplicar  → grava as alterações
 *
 * O que faz, para cada artigo da fila com data <= hoje:
 *   1. adiciona o card no topo de blog/index.html
 *   2. adiciona a <url> no sitemap.xml
 *   3. remove o artigo de blog/queue.json
 *
 * Depois é só conferir com `git diff` e dar push.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = __dirname;
const QUEUE = path.join(RAIZ, 'blog', 'queue.json');
const INDEX = path.join(RAIZ, 'blog', 'index.html');
const SITEMAP = path.join(RAIZ, 'sitemap.xml');
const BASE = 'https://www.rodrigorochaads.com.br';

const aplicar = process.argv.includes('--aplicar');
const hoje = new Date().toISOString().slice(0, 10);

function escapaHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function erro(msg) {
  console.error(`\n  ERRO: ${msg}\n`);
  process.exit(1);
}

// ---------- leitura ----------

let fila;
try {
  fila = JSON.parse(fs.readFileSync(QUEUE, 'utf8'));
} catch (e) {
  erro(`não consegui ler blog/queue.json: ${e.message}`);
}

let index = fs.readFileSync(INDEX, 'utf8');
let sitemap = fs.readFileSync(SITEMAP, 'utf8');

const vencidos = fila.filter((a) => a.date <= hoje);
const pendentes = fila.filter((a) => a.date > hoje);

console.log(`\n  Hoje: ${hoje}`);

if (vencidos.length === 0) {
  console.log(`  Nenhum artigo com data vencida. Nada a publicar.`);
  if (pendentes.length) {
    console.log(`\n  Próximo da fila: ${pendentes[0].date} — ${pendentes[0].title}`);
  }
  console.log('');
  process.exit(0);
}

// ---------- validação (antes de tocar em qualquer arquivo) ----------

const ancora = '<div class="blog-grid">';
if (!index.includes(ancora)) {
  erro(`não achei '${ancora}' em blog/index.html. O layout mudou — ajuste o script antes de usar.`);
}
if (!sitemap.includes('</urlset>')) {
  erro(`sitemap.xml não tem </urlset>. Arquivo inesperado.`);
}

for (const a of vencidos) {
  for (const campo of ['file', 'title', 'excerpt', 'date_label']) {
    if (!a[campo]) erro(`artigo ${a.file || '(sem file)'} está sem o campo "${campo}" no queue.json.`);
  }
  if (!fs.existsSync(path.join(RAIZ, 'blog', a.file))) {
    erro(`o arquivo blog/${a.file} não existe. Escreva o artigo antes de publicar.`);
  }
  if (index.includes(`/blog/${a.file}`)) {
    erro(`blog/${a.file} já está listado em blog/index.html. Remova do queue.json ou revise à mão.`);
  }
}

// ---------- aplicação ----------

// mais antigo primeiro: cada card entra no topo, então o último inserido fica em cima
const ordenados = [...vencidos].sort((a, b) => a.date.localeCompare(b.date));

for (const a of ordenados) {
  const url = `/blog/${a.file}`;
  const card =
    `\n          <article class="blog-card">\n` +
    `            <span class="blog-card-date">${escapaHtml(a.date_label)}</span>\n` +
    `            <h2><a href="${url}">${escapaHtml(a.title)}</a></h2>\n` +
    `            <p>${escapaHtml(a.excerpt)}</p>\n` +
    `            <a href="${url}" class="blog-card-link">Ler artigo &rarr;</a>\n` +
    `          </article>`;
  index = index.replace(ancora, ancora + card);

  const loc = `${BASE}${url}`;
  if (!sitemap.includes(loc)) {
    sitemap = sitemap.replace(
      '</urlset>',
      `  <url>\n    <loc>${loc}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n</urlset>`
    );
  }
}

console.log(`\n  ${vencidos.length} artigo(s) para publicar:\n`);
for (const a of ordenados) {
  console.log(`    ${a.date}  ${a.title}`);
  console.log(`              card no index + <loc> no sitemap + saída da fila`);
}

if (!aplicar) {
  console.log(`\n  (simulação — nada foi gravado)`);
  console.log(`  Para gravar de verdade:  node publicar.js --aplicar\n`);
  process.exit(0);
}

fs.writeFileSync(INDEX, index);
fs.writeFileSync(SITEMAP, sitemap);
fs.writeFileSync(QUEUE, JSON.stringify(pendentes, null, 2) + '\n');

console.log(`\n  Gravado. Confira com "git diff" antes de subir.`);
console.log(`\n  LEMBRETE: agora que ${ordenados.map((a) => a.file).join(', ')} está no ar,`);
console.log(`  adicione links internos de outros artigos apontando pra ele.`);
console.log(`  Artigo sem link de entrada demora muito mais pra ranquear.\n`);
