/* app.js
   Robust fetch + animations + smooth scrolling + mobile nav + modal
   Uses the user's sheet id (already filled).
*/

const SHEET_ID = '16HrAVLb4nsR8KrG_6BjXcdXimmLzErbTC0gmqzm88iQ';
const OPENSHEET = (id, tab) => `https://opensheet.elk.sh/${id}/${encodeURIComponent(tab)}`;
const GVIZ = (id, tab) => `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tab)}`;

/* ---------- helpers ---------- */
function normalizeKey(k){ return (k||'').toString().trim().toLowerCase().replace(/\s+/g,'_'); }
function normalizeRow(row){ const o={}; for (const k in row) o[normalizeKey(k)] = row[k]; return o; }
function safeText(s){ if (s === 0) return '0'; if (!s) return ''; return String(s); }
function toEmbedUrl(url){
  if (!url) return '';
  url = String(url).trim();
  if (url.includes('watch?v=')) return `https://www.youtube.com/embed/${url.split('v=')[1].split('&')[0]}?rel=0`;
  if (url.includes('youtu.be/')) return `https://www.youtube.com/embed/${url.split('youtu.be/')[1].split('?')[0]}?rel=0`;
  if (url.includes('drive.google.com')) { const m = url.match(/[-\w]{25,}/); if (m) return `https://drive.google.com/file/d/${m[0]}/preview`; }
  return url;
}

/* ---------- fetch helpers (opensheet then gviz) ---------- */
async function fetchOpen(tab){
  try {
    const url = OPENSHEET(SHEET_ID, tab);
    const res = await fetch(url);
    if (!res.ok) throw new Error('OpenSheet ' + res.status);
    const json = await res.json();
    if (!Array.isArray(json)) return [];
    return json.map(r => normalizeRow(r));
  } catch (e) { console.warn('OpenSheet failed', tab, e.message); return []; }
}

async function fetchGviz(tab){
  try {
    const url = GVIZ(SHEET_ID, tab);
    const res = await fetch(url);
    if (!res.ok) throw new Error('GViz ' + res.status);
    const txt = await res.text();
    const json = JSON.parse(txt.substr(47).slice(0, -2));
    const cols = (json.table.cols || []).map(c => (c.label || '').toString());
    const rows = json.table.rows || [];
    return rows.map(r => {
      const obj = {};
      for (let i=0;i<cols.length;i++){
        const key = normalizeKey(cols[i] || `col${i}`);
        obj[key] = (r.c[i] && r.c[i].v !== undefined) ? r.c[i].v : '';
      }
      return obj;
    });
  } catch (e) { console.warn('GViz failed', tab, e.message); return []; }
}

async function fetchTab(tab){
  let data = await fetchOpen(tab);
  if (data && data.length) { console.log(`[fetchTab] ${tab} via OpenSheet (${data.length})`); return data; }
  data = await fetchGviz(tab);
  if (data && data.length) console.log(`[fetchTab] ${tab} via GViz (${data.length})`);
  else console.log(`[fetchTab] ${tab} empty`);
  return data || [];
}

/* ---------- typed hero ---------- */
function startTyped(selector, phrases = [], speed = 70, pause = 1400){
  const el = document.querySelector(selector); if (!el || !phrases.length) return;
  let pi=0, ci=0, deleting=false;
  (function tick(){
    const cur = phrases[pi];
    if (!deleting) { el.textContent = cur.slice(0, ci+1); ci++; if (ci === cur.length) { deleting=true; setTimeout(tick, pause); return; } }
    else { el.textContent = cur.slice(0, ci-1); ci--; if (ci === 0) { deleting=false; pi=(pi+1)%phrases.length; } }
    setTimeout(tick, deleting ? speed/2 : speed + Math.random()*50);
  })();
}

/* ---------- UI creators ---------- */
function createSkillCard(val, level){
  const d = document.createElement('div'); d.className='card';
  d.innerHTML = `<h3>${safeText(val)}</h3>` + (level ? `<div class="muted-note" style="margin-top:6px;color:var(--muted);font-size:1rem;">Level: <strong>${safeText(level)}</strong></div>` : '');
  return d;
}

function createProjectCard(row){
  const title = safeText(row.projectname || row.title || row.project_name || row.name || row.project);
  const desc = safeText(row.description || row.desc || row.details || row.summary);
  const status = safeText(row.status || row.progress || '');
  const tags = safeText(row.tags || row.technologies || row.skills || row.tags_list);
  const video = safeText(row.videolink || row.video || row.demovideo || row.video_link || row.video_url || row.demo);
  const image = safeText(row.image_url || row.image || row.thumbnail);
  const link = safeText(row.link || row.project_link || row.url || row.github || row.repo);

  const card = document.createElement('div'); card.className='card project-card';
  if (status) card.dataset.status = status.toLowerCase();

  const media = document.createElement('div'); media.className='project-video';
  if (video) {
    const iframe = document.createElement('iframe'); iframe.src = toEmbedUrl(video); iframe.allow='autoplay; fullscreen'; media.appendChild(iframe);
  } else if (image) {
    const img = document.createElement('img'); img.src = image; img.alt = title; img.style.width='100%'; img.style.borderRadius='8px'; media.appendChild(img);
  } else {
    const ph = document.createElement('div'); ph.style.padding='36px'; ph.style.color='#9fb0c8'; ph.textContent='No demo'; media.appendChild(ph);
  }
  card.appendChild(media);

  card.innerHTML += `<h3>${title || 'Untitled Project'}</h3><p>${desc}</p>`;

  if (tags) {
    const tagWrap = document.createElement('div'); tagWrap.style.margin='8px 0';
    tags.split(',').map(t=>t.trim()).filter(Boolean).forEach(t=>{
      const s = document.createElement('span'); s.className='tag'; s.textContent = t; tagWrap.appendChild(s);
    });
    card.appendChild(tagWrap);
  }

  const actions = document.createElement('div'); actions.className='card-actions';
  if (link) {
    const a = document.createElement('a'); a.className='icon-btn'; a.href = link; a.target='_blank'; a.rel='noopener';
    a.innerHTML = `<svg class="icon" viewBox="0 0 24 24" width="14" height="14"><path d="M14 3h7v7" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M21 3L10 14" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M21 21H3V3" stroke="currentColor" stroke-width="1.6" fill="none"/></svg> View`;
    actions.appendChild(a);
  }
  if (video) {
    const m = document.createElement('button'); m.className='icon-btn'; m.innerHTML = `<svg class="icon" viewBox="0 0 24 24" width="14" height="14"><path d="M5 3v18l15-9L5 3z" fill="currentColor"/></svg> Demo`;
    m.addEventListener('click', ()=> openModal(toEmbedUrl(video)));
    actions.appendChild(m);
  }
  if (actions.children.length) card.appendChild(actions);
  return card;
}

function createExpCard(row){
  const role = safeText(row.role || row.title || row.position);
  const company = safeText(row.company || '');
  const period = safeText(row.duration || row.period || '');
  const details = safeText(row.description || row.details || '');
  const card = document.createElement('div'); card.className='card';
  card.innerHTML = `<h3>${role}</h3><p><strong>${company}</strong> ${period ? '— ' + period : ''}</p><p>${details}</p>`;
  return card;
}

// Replace existing createContactCard with this function
function createContactCard(row){
  const n = normalizeRow(row);
  const key = safeText(n.field || n.type || n.name || Object.keys(n)[0]);
  const val = safeText(n.value || n.info || n.link || n.url || Object.values(n)[0]);

  const card = document.createElement('div');
  card.className = 'card contact-card';
  // show key/title (still show the label)
  card.innerHTML = `<h3>${key}</h3><p style="color:var(--muted);margin-bottom:8px">${/* do not display raw link/value here */ ''}</p>`;

  const btn = document.createElement('a');
  btn.className = 'contact-btn';
  btn.style.textDecoration = 'none';
  btn.style.display = 'inline-flex';
  btn.style.alignItems = 'center';
  btn.style.gap = '8px';

  // helper to set icon + label without showing the raw url/text
  const setBtnLabel = (iconText, label) => {
    btn.innerHTML = `${iconText} ${label}`;
  };

  // Detect common contact types and produce appropriate button label & action
  const lower = val.toLowerCase();

  if (!val) {
    // fallback — no value provided
    setBtnLabel('📋', 'No info');
    btn.href = '#';
    btn.addEventListener('click', e => e.preventDefault());
  }
  else if (/^mailto:/i.test(val) || val.includes('@')) {
    const email = val.replace(/^mailto:/i,'');
    setBtnLabel('✉️', 'Email');
    btn.href = `mailto:${email}`;
    btn.target = '_blank';
  }
  else if (/^\+?\d[\d\s\-\(\)]{6,}$/.test(val) || val.startsWith('tel:')) {
    const tel = val.replace(/^tel:/i,'');
    setBtnLabel('📞', 'Call');
    btn.href = `tel:${tel}`;
  }
  else if (lower.includes('wa.me') || lower.includes('whatsapp')) {
    setBtnLabel('💬', 'WhatsApp');
    btn.href = val;
    btn.target = '_blank';
  }
  else if (lower.includes('github.com') || lower.includes('github')) {
    setBtnLabel('🐙', 'GitHub');
    btn.href = val.startsWith('http') ? val : `https://${val}`;
    btn.target = '_blank';
  }
  else if (lower.includes('linkedin.com') || lower.includes('linkedin')) {
    setBtnLabel('🔗', 'LinkedIn');
    btn.href = val.startsWith('http') ? val : `https://${val}`;
    btn.target = '_blank';
  }
  else if (lower.includes('instagram.com') || lower.includes('facebook.com') || lower.includes('twitter.com') || lower.includes('t.me')) {
    setBtnLabel('🔗', 'Open');
    btn.href = val.startsWith('http') ? val : `https://${val}`;
    btn.target = '_blank';
  }
  else if (val.startsWith('http')) {
    // generic website / other link
    setBtnLabel('🔗', 'Open Link');
    btn.href = val;
    btn.target = '_blank';
  }
  else {
    // fallback: treat as plain text (address, handle, etc.) — copy button
    setBtnLabel('📋', 'Copy');
    btn.href = '#';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigator.clipboard?.writeText(val).then(() => {
        const prev = btn.innerHTML;
        btn.innerHTML = 'Copied';
        setTimeout(()=> btn.innerHTML = prev, 1200);
      }).catch(()=> {
        // if clipboard not available, show prompt
        prompt('Copy this value:', val);
      });
    });
  }

  card.appendChild(btn);
  return card;
}


/* ---------- modal ---------- */
function openModal(src){
  const modal = document.getElementById('modal'); if (!modal) return;
  modal.setAttribute('aria-hidden','false');
  const body = document.getElementById('modal-body'); body.innerHTML = '';
  const iframe = document.createElement('iframe'); iframe.src = src; iframe.allow='autoplay; fullscreen'; iframe.setAttribute('frameborder','0');
  body.appendChild(iframe);
}
function closeModal(){ const modal = document.getElementById('modal'); if (!modal) return; modal.setAttribute('aria-hidden','true'); document.getElementById('modal-body').innerHTML = ''; }

/* ---------- reveal & scroll ---------- */
function setupReveal(){
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.card, .reveal').forEach(el => io.observe(el));
}
function smoothScrollHandler(){
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e){
      const href = this.getAttribute('href'); if (!href || href === '#') return;
      const target = document.querySelector(href); if (!target) return;
      e.preventDefault();
      const header = document.getElementById('site-header');
      const offset = header ? header.offsetHeight + 8 : 8;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      // close mobile nav
      const navLinks = document.getElementById('nav-links');
      const toggle = document.getElementById('nav-toggle');
      if (window.innerWidth <= 980 && navLinks) { navLinks.classList.remove('active'); toggle?.classList.remove('active'); }
    });
  });
}
function updateProgressBar(){
  const doc = document.documentElement; const scrolled = (window.scrollY / (doc.scrollHeight - window.innerHeight)) * 100;
  const bar = document.getElementById('progress-bar'); if (bar) bar.style.width = `${Math.min(100, Math.max(0, scrolled))}%`;
}

/* ---------- nav ---------- */
function setupNav(){
  const toggle = document.getElementById('nav-toggle'); const navLinks = document.getElementById('nav-links');
  toggle?.addEventListener('click', ()=> { navLinks.classList.toggle('active'); toggle.classList.toggle('active'); });
  document.querySelectorAll('#nav-links a').forEach(a => a.addEventListener('click', ()=> { if (window.innerWidth <= 980) { navLinks.classList.remove('active'); toggle?.classList.remove('active'); } }));
  window.addEventListener('resize', ()=> { if (window.innerWidth > 980) { navLinks.classList.remove('active'); toggle?.classList.remove('active'); } });
}

/* ---------- main loader ---------- */
async function loadAll(){
  try {
    // typed hero
    startTyped('#typed-text', ['Software Engineer','AI Enthusiast','Game Developer','Smart Chatbot Builder'], 80, 1400);

    // Projects
    const projects = await fetchTab('Projects');
    console.log('[projects]', projects.slice(0,3));
    const projectsContainer = document.getElementById('projects-container');
    const noProjects = document.getElementById('no-projects');
    if (projectsContainer) projectsContainer.innerHTML = '';
    if (!projects || projects.length === 0) { if (noProjects) noProjects.hidden = false; }
    else {
      if (noProjects) noProjects.hidden = true;
      projects.forEach(r => projectsContainer.appendChild(createProjectCard(normalizeRow(r))));
    }

    // Skills
    let skills = await fetchTab('Skills');
    const skillsContainer = document.getElementById('skills-container');
    if (skillsContainer) {
      skillsContainer.innerHTML = '';
      if (!skills || skills.length === 0) {
        [
          { skill: 'Python', level: 'Expert' },
          { skill: 'JavaScript', level: 'Intermediate' },
          { skill: 'HTML/CSS', level: 'Intermediate' },
          { skill: 'SQL', level: 'Beginner' },
          { skill: 'Unity', level: 'Beginner' }
        ].forEach(s => skillsContainer.appendChild(createSkillCard(s.skill, s.level)));
      } else {
        skills.forEach(r => {
          const n = normalizeRow(r);
          const v = n.skill || n.skill_name || n.name || Object.values(n)[0];
          const level = n.level || n.skill_level || n.proficiency || '';
          if (v) skillsContainer.appendChild(createSkillCard(v, level));
        });
      }
    }

    // Experience
    const exp = await fetchTab('Experience');
    const expContainer = document.getElementById('experience-container');
    if (expContainer) {
      expContainer.innerHTML = '';
      if (!exp || exp.length === 0) expContainer.innerHTML = `<p style="color:var(--muted)">No experience found.</p>`;
      else exp.forEach(r => expContainer.appendChild(createExpCard(normalizeRow(r))));
    }

    // Contact
    const contact = await fetchTab('Contact');
    const contactContainer = document.getElementById('contact-container');
    if (contactContainer) {
      contactContainer.innerHTML = '';
      if (!contact || contact.length === 0) contactContainer.innerHTML = `<p style="color:var(--muted)">No contact info found.</p>`;
      else contact.forEach(r => contactContainer.appendChild(createContactCard(normalizeRow(r))));
    }

    // filter handlers
    document.querySelectorAll('.filter').forEach(btn => btn.addEventListener('click', ()=>{
      document.querySelectorAll('.filter').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter.toLowerCase();
      document.querySelectorAll('#projects-container .project-card').forEach(card=>{
        const st = (card.dataset.status || '').toLowerCase();
        card.style.display = (f === 'all' || st.includes(f)) ? '' : 'none';
      });
    }));

    // setup UI
    setupReveal();
    setupNav();
    smoothScrollHandler();

    // modal events
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal-backdrop')?.addEventListener('click', closeModal);

    // progress bar
    window.addEventListener('scroll', updateProgressBar, {passive:true});

    // year
    const y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();
  } catch (err) {
    console.error('loadAll error', err);
  }
}

function renderMedia(link) {
  if (!link) return '';
  if (link.endsWith('.mp4') || link.endsWith('.webm')) {
    return `<video src="${link}" controls class="project-media"></video>`;
  } else if (link.endsWith('.jpg') || link.endsWith('.png') || link.endsWith('.jpeg') || link.endsWith('.gif')) {
    return `<img src="${link}" alt="Project Image" class="project-media">`;
  } else {
    return '';
  }
}

// // Example in your fetch code
// fetch('https://opensheet.elk.sh/16HrAVLb4nsR8KrG_6BjXcdXimmLzErbTC0gmqzm88iQ/Projects')
//   .then(res => res.json())
//   .then(data => {
//     const projectsContainer = document.getElementById('projects-container');
//     projectsContainer.innerHTML = data.map(item => `
//       <div class="project-card">
//         <h3>${item.Title}</h3>
//         ${renderMedia(item.Video)}  <!-- This line decides image/video -->
//         <p>${item.Description}</p>
//         <a href="${item.Link}" target="_blank" class="btn">View Project</a>
//       </div>
//     `).join('');
//   });


document.addEventListener('DOMContentLoaded', loadAll);