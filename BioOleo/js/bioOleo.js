/* BioÓleo - lógica das páginas. Cada página tem data-page no <body>. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const brl = v => 'R$ ' + v.toFixed(2).replace('.', ',');
const load = (k, d) => { try { return JSON.parse(localStorage.getItem('bo_' + k)) || d } catch (e) { return d } };
const save = (k, v) => { try { localStorage.setItem('bo_' + k, JSON.stringify(v)) } catch (e) {} };
function toast(m) { const t = $('#toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 2400) }

const paginas = {

/* ================= CLIENTES ================= */
cliente() {
  let clientes = load('clientes', [{ id: 1, tipo: 'PJ', nome: 'Restaurante Sabor', doc: '12345678000190', tel: '(44) 3631-0000', end: 'Av. Brasil, 500' }]);
  const fmtDoc = d => d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  $('#lTipo').onchange = () => { $('#lDocLbl').textContent = $('#lTipo').value === 'PF' ? 'CPF' : 'CNPJ' };
  function desenhar() {
    const f = $('#busca').value.toLowerCase().trim(), num = f.replace(/\D/g, '');
    const l = clientes.filter(c => !f || c.nome.toLowerCase().includes(f) || (num && c.doc.includes(num)));
    $('#tCli').innerHTML = l.length ? l.map(c => `<tr><td><span class="pill ${c.tipo === 'PJ' ? 'info' : ''}">${c.tipo}</span></td>
      <td>${esc(c.nome)}<br><small>${esc(c.end || '')}</small></td><td>${fmtDoc(c.doc)}</td><td>${esc(c.tel)}</td>
      <td><button class="link" data-id="${c.id}">Remover</button></td></tr>`).join('') : '<tr><td colspan="5" class="vazio">Nenhum cliente encontrado.</td></tr>';
  }
  $('#busca').oninput = desenhar;
  $('#tCli').onclick = e => { const id = e.target.dataset.id; if (!id) return; clientes = clientes.filter(c => c.id != id); save('clientes', clientes); desenhar(); toast('Cliente removido') };
  $('#fCli').onsubmit = e => {
    e.preventDefault();
    const tipo = $('#lTipo').value, nome = $('#lNome').value.trim(), doc = $('#lDoc').value.replace(/\D/g, ''), tel = $('#lTel').value.trim(), end = $('#lEnd').value.trim(), er = $('#lErr');
    if (!nome) return er.textContent = 'Informe o nome ou a razão social.';
    if (doc.length !== (tipo === 'PF' ? 11 : 14)) return er.textContent = (tipo === 'PF' ? 'O CPF precisa ter 11' : 'O CNPJ precisa ter 14') + ' dígitos.';
    if (clientes.some(c => c.doc === doc)) return er.textContent = 'Já existe um cliente com esse documento.';
    if (!tel) return er.textContent = 'Informe um telefone.';
    er.textContent = ''; clientes.unshift({ id: Date.now(), tipo, nome, doc, tel, end }); save('clientes', clientes);
    desenhar(); e.target.reset(); $('#lDocLbl').textContent = 'CPF'; toast('Cliente cadastrado');
  };
  desenhar();
},

/* ================= BARRIS ================= */
barris() {
  let barris = load('barris', [{ id: '0142', desc: 'Com o cliente', st: 'ativo' }, { id: '0143', desc: 'Em trânsito', st: 'coleta' }, { id: '0087', desc: 'Sem devolução há 45 dias', st: 'multa' }]), cur = 0;
  const rot = { ativo: ['Ativo', ''], coleta: ['Coleta', 'info'], multa: ['Multa', 'bad'] };
  function desenhar() {
    $('#tBarris').innerHTML = barris.map(b => `<tr><td><b>#${b.id}</b></td><td>200 L</td><td>${b.desc}</td><td><span class="pill ${rot[b.st][1]}">${rot[b.st][0]}</span></td></tr>`).join('');
    $('#kAtivos').textContent = barris.filter(b => b.st === 'ativo').length;
    $('#kTrans').textContent = barris.filter(b => b.st === 'coleta').length;
    $('#kMulta').textContent = brl(barris.filter(b => b.st === 'multa').length * 150);
    save('barris', barris);
  }
  $('#scan').onclick = () => {
    const v = $('#qr').value.trim(), er = $('#qErr'); let b;
    if (v) { b = barris.find(x => x.id === v.padStart(4, '0')); if (!b) return er.textContent = 'Barril #' + v.padStart(4, '0') + ' não encontrado.' }
    else b = barris[cur++ % barris.length];
    er.textContent = ''; let m;
    if (b.st === 'ativo') { b.st = 'coleta'; b.desc = 'Em trânsito'; m = 'saiu com o coletor' }
    else if (b.st === 'coleta') { b.st = 'ativo'; b.desc = 'Com o cliente'; m = 'voltou ao cliente' }
    else { b.st = 'ativo'; b.desc = 'Devolução registrada'; m = 'devolvido, multa removida' }
    $('#qr').value = ''; desenhar(); toast(`Barril #${b.id} ${m}`);
  };
  desenhar();
},

/* ================= FROTA ================= */
frota() {
  const NS = 'http://www.w3.org/2000/svg', map = $('#map'), cs = getComputedStyle(document.documentElement);
  let g = '';
  for (let x = 0; x <= 300; x += 50) g += `<line x1="${x}" y1="0" x2="${x}" y2="200" stroke="currentColor" opacity=".12"/>`;
  for (let y = 0; y <= 200; y += 40) g += `<line x1="0" y1="${y}" x2="300" y2="${y}" stroke="currentColor" opacity=".12"/>`;
  map.innerHTML = g + `<text x="150" y="104" text-anchor="middle" fill="currentColor" opacity=".45" font-size="11">Mapa de Cianorte</text><circle cx="240" cy="80" r="7" fill="${cs.getPropertyValue('--cl-red')}"/><circle cx="240" cy="80" r="3" fill="#fff"/>`;
  const cor = cs.getPropertyValue('--cl-truck');
  const trucks = [
    { p: 'ABC-1234', run: true, t: 0, v: .0016, path: [[30, 40], [150, 40], [150, 150], [260, 150]] },
    { p: 'DEF-5678', run: false, t: .3, v: .0012, path: [[270, 30], [270, 110], [80, 110], [80, 170]] }];
  trucks.forEach(t => { t.el = document.createElementNS(NS, 'g'); t.el.innerHTML = `<rect x="-9" y="-6" width="18" height="12" rx="3" fill="${cor}"/><circle cx="-4" cy="7" r="2" fill="#333"/><circle cx="5" cy="7" r="2" fill="#333"/>`; map.appendChild(t.el) });
  function pos(t) {
    const P = t.path, L = []; let tot = 0;
    for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(l); tot += l }
    let d = t.t * tot, i = 0; while (d > L[i] && i < L.length - 1) { d -= L[i]; i++ }
    const k = Math.min(1, d / L[i]); return [P[i][0] + (P[i + 1][0] - P[i][0]) * k, P[i][1] + (P[i + 1][1] - P[i][1]) * k];
  }
  const geo = ([x, y]) => `${(-23.66 - y * .0004).toFixed(5)}, ${(-52.60 + x * .0004).toFixed(5)}`;
  function tabela() { $('#tTrucks').innerHTML = trucks.map((t, i) => `<tr><td>${t.p}</td><td id="gps${i}"></td><td><button class="pill ${t.run ? 'info' : 'warn'}" data-i="${i}" title="Clique para alternar">${t.run ? 'Em rota' : 'Parado'}</button></td></tr>`).join('') }
  $('#tTrucks').onclick = e => { const i = e.target.dataset.i; if (i === undefined) return; trucks[i].run = !trucks[i].run; tabela(); toast(`Caminhão ${trucks[i].p}: ${trucks[i].run ? 'em rota' : 'parado'}`) };
  tabela();
  (function loop() {
    trucks.forEach((t, i) => { if (t.run) { t.t += t.v; if (t.t > 1) t.t = 0 } const p = pos(t); t.el.setAttribute('transform', `translate(${p[0]},${p[1]})`); const c = $('#gps' + i); if (c) c.textContent = geo(p) });
    requestAnimationFrame(loop);
  })();
},

/* ================= CERTIFICADO ================= */
certificado() {
  const per = [{ n: 'Outubro/2026', o: 320, a: 8, c: 480 }, { n: 'Setembro/2026', o: 270, a: 6.75, c: 405 }, { n: 'Agosto/2026', o: 215, a: 5.4, c: 322 }];
  const fA = a => String(a).replace('.', ',') + ' mi L';
  function desenhar() { const p = per[$('#per').value]; $('#kO').textContent = p.o + ' L'; $('#kA').textContent = fA(p.a); $('#kC').textContent = p.c + ' kg' }
  $('#per').onchange = desenhar; desenhar();
  $('#dl').onclick = () => {
    const p = per[$('#per').value];
    const h = `<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>Certificado BioÓleo</title><body style="font-family:Georgia,serif;text-align:center;padding:60px;border:8px double #1f5a3a;margin:30px"><h1>Certificado de Destinação Final</h1><p>A BioÓleo certifica a coleta e a destinação ambientalmente correta de óleo de cozinha usado em <b>${p.n}</b>.</p><h2>${p.o} litros coletados</h2><p>Água preservada: ${fA(p.a)}<br>CO₂ evitado: ${p.c} kg</p><p>Alinhado às ODS 6, 12 e 13.</p><small>Documento de exemplo gerado pelo protótipo.</small></body></html>`;
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([h], { type: 'text/html' })); a.download = 'CDF-' + p.n.replace('/', '-') + '.html'; a.click(); toast('Certificado gerado');
  };
}
};

const pg = document.body.dataset.page; if (paginas[pg]) paginas[pg]();