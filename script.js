lucide.createIcons();

// --- KONFIGURASI DATABASE API ---
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwa0nIMfFYO4ThcDp2hCMpOe3IG8OE7l8VA9YrnWKqjfaBUer-8JslRDOEcPx5_uDPC9A/exec";

// --- GLOBAL VARIABLES ---
let disposisiData=[], suratKeluarData=[], tembusanData=[], arsipData=[], logData=[]; 
let bidangData = [{ code: '01', name: 'Sekretaris / Direktur' }, { code: '02', name: 'Kesiswaan, Humas & PPDB' }, { code: '03', name: 'Kurikulum LPIS' }, { code: '04', name: 'SEP LPIS' }, { code: '05', name: 'SMI LPIS' }, { code: '06', name: 'Bisnis' }];
let pejabatData = [{ id: '1', nama: 'Direktur LPIS', isDefault: true }, { id: '2', nama: 'Sekretaris Direktur', isDefault: false }, { id: '3', nama: 'Plt Asdir I', isDefault: false }];
let kategoriData = [{ id: '1', nama: 'Surat Masuk' }, { id: '2', nama: 'Surat Keluar' }, { id: '3', nama: 'Tembusan' }, { id: '4', nama: 'SK Yayasan' }, { id: '5', nama: 'Sertifikat' }];
const defaultUsers = { 'admin': {name: 'Admin Utama', role: 'admin', pass: 'MTIzNA=='}, 'pimpinan': {name: 'Pimpinan LPIS', role: 'pimpinan', pass: 'MTIzNA=='}, 'yayasan': {name: 'Yayasan', role: 'yayasan', pass: 'MTIzNA=='}, 'tkis1': {name: 'TKIS 1', role: 'tkis1', pass: 'MTIzNA=='}, 'tkis2': {name: 'TKIS 2', role: 'tkis2', pass: 'MTIzNA=='}, 'sdis1': {name: 'SDIS 1', role: 'sdis1', pass: 'MTIzNA=='}, 'sdis2': {name: 'SDIS 2', role: 'sdis2', pass: 'MTIzNA=='}, 'smpis': {name: 'SMPIS', role: 'smpis', pass: 'MTIzNA=='}, 'smais': {name: 'SMAIS', role: 'smais', pass: 'MTIzNA=='}, 'mahad': {name: 'Mahad', role: 'mahad', pass: 'MTIzNA=='} };
let storedUsers = JSON.parse(localStorage.getItem('ea-users')) || defaultUsers;
let deleteTargetTable='', deleteTargetId=null, editBidangModeCode=null, editUserTarget=null, editPejabatModeId=null, editKategoriModeId=null, currentUser=null, editModeId=null;
let currentPageD=1, currentPageSK=1, currentPageArsip=1, currentPageT=1, currentPageLog=1;
const itemsPerPage = 5;
const pageTitles = { dashboard: ['Dashboard', ''], disposisi: ['Disposisi Surat', ''], sk: ['Surat Keluar', ''], tembusan: ['Tembusan Surat', ''], arsip: ['Arsip Dokumen', ''], log: ['Log Aktivitas', ''], pengaturan: ['Pengaturan', ''] };

// --- AUDIO & UI HELPERS ---
let audioCtx;
function initAudio() { if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended')audioCtx.resume(); }
document.addEventListener('click', initAudio, { once:true });
window.playUISound = function(type) {
  if(!audioCtx) return; if(audioCtx.state==='suspended') audioCtx.resume();
  const now=audioCtx.currentTime, osc=audioCtx.createOscillator(), gain=audioCtx.createGain(); osc.connect(gain); gain.connect(audioCtx.destination);
  if(type==='success'){ osc.type='sine'; osc.frequency.setValueAtTime(523.25,now); osc.frequency.setValueAtTime(659.25,now+0.1); gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(0.1,now+0.05); gain.gain.exponentialRampToValueAtTime(0.01,now+0.3); osc.start(now); osc.stop(now+0.3); }
  else if(type==='error'){ osc.type='triangle'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(150,now+0.2); gain.gain.setValueAtTime(0.1,now); gain.gain.exponentialRampToValueAtTime(0.01,now+0.2); osc.start(now); osc.stop(now+0.2); }
  else if(type==='notif'){ osc.type='sine'; osc.frequency.setValueAtTime(783.99,now); gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(0.1,now+0.05); gain.gain.exponentialRampToValueAtTime(0.01,now+0.5); osc.start(now); osc.stop(now+0.5); }
  else if(type==='pop'){ osc.type='sine'; osc.frequency.setValueAtTime(400,now); osc.frequency.exponentialRampToValueAtTime(200,now+0.1); gain.gain.setValueAtTime(0.05,now); gain.gain.exponentialRampToValueAtTime(0.01,now+0.1); osc.start(now); osc.stop(now+0.1); }
};
function escapeHTML(str){ return str?str.toString().replace(/[&<>'"]/g, t=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[t])):''; }
function cleanSt(str){ return escapeHTML(str?String(str).replace(/(&amp;#9679;|&#9679;|●)/g,'').trim():''); }
function formatDate(ds){ return ds?new Date(ds).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}):'—'; }
function getToday(){ return new Date().toISOString().slice(0,10); }
function safeName(str){ return (str||'').trim().replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_').substring(0,30); }
function escapeCSVField(str){ return str?`"${String(str).replace(/"/g,'""')}"`:'""'; }
function getGreeting(){ const hr=new Date().getHours(); return hr<11?"Selamat Pagi":hr<15?"Selamat Siang":hr<18?"Selamat Sore":"Selamat Malam"; }
function getSkeletonHTML(c){ return Array(4).fill(`<tr>${Array(c).fill('<td><div class="skeleton-box"></div></td>').join('')}</tr>`).join(''); }

window.showToast = function(msg, type) {
  if(type==='ok') playUISound('success'); else if(type==='error') playUISound('error'); else playUISound('notif');
  const c=document.getElementById('tsts'), t=document.createElement('div'); t.className=`tst t-${type==='ok'?'ok':type==='error'?'er':'i'}`; t.innerHTML=msg; c.appendChild(t); setTimeout(()=>t.remove(), 3500);
};
window.toggleLoading = function(show, txt='Memproses Data...', wP=false) {
  const ol=document.getElementById('loadingOverlay'), pw=document.getElementById('loadProgWrap'), pb=document.getElementById('loadProgBar'); document.getElementById('loadingText').textContent=txt;
  if(show){ ol.style.display='flex'; if(wP){ pw.style.display='block'; pb.style.width='0%'; ol.prog=0; ol.pI=setInterval(()=>{ol.prog+=Math.random()*20; if(ol.prog>95)ol.prog=95; pb.style.width=ol.prog+'%';},150); } else pw.style.display='none'; }
  else { if(ol.pI)clearInterval(ol.pI); if(pw.style.display==='block'){ pb.style.width='100%'; setTimeout(()=>ol.style.display='none',300); } else ol.style.display='none'; }
};
window.generateFilename = function(ds, p1, p2, oN) {
  if(!oN) return ''; const d=new Date(ds); if(isNaN(d)) return '';
  const yy=String(d.getFullYear()).slice(-2), mm=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0'), dStr=`${yy}${mm}${dd}`; 
  let c=0; if(typeof disposisiData!=='undefined') c+=disposisiData.filter(x=>x.tgl_s===ds||x.tgl_t===ds).length; if(typeof suratKeluarData!=='undefined') c+=suratKeluarData.filter(x=>x.tgl===ds).length; if(typeof tembusanData!=='undefined') c+=tembusanData.filter(x=>x.tgl===ds).length; if(typeof arsipData!=='undefined') c+=arsipData.filter(x=>x.tgl===ds).length;
  const ext=oN.lastIndexOf('.')!==-1?oN.substring(oN.lastIndexOf('.')):''; return `${dStr}_${String(c+1).padStart(2,'0')}_${safeName(p1)}_${safeName(p2)}${ext}`;
};
window.fileSelected = function(i, lId) {
  const l=document.getElementById(lId), f=i.files[0]; if(!f) return;
  if(f.size>5*1024*1024){ showToast('⚠️ Maksimal 5MB!','error'); i.value=''; l.style.display='none'; return; }
  const r=new FileReader(); r.onload=e=>i.setAttribute('data-base64',e.target.result); r.readAsDataURL(f); l.style.display='block'; l.textContent=`📎 File: ${f.name} (${(f.size/1024).toFixed(1)} KB)`;
};

// --- CORE LOGIC (DB, DRAFT, PAGING) ---
window.updateDashboardStats = function() {
  const safeSet = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  safeSet('sv1', disposisiData.length); safeSet('sv2', suratKeluarData.length);
  safeSet('sv3', disposisiData.filter(x => cleanSt(x.st).includes('Pending') || cleanSt(x.st).includes('Proses')).length);
  safeSet('sv4', disposisiData.filter(x => cleanSt(x.st).includes('Selesai')).length);
  let pendingCount = disposisiData.filter(x => cleanSt(x.st).includes('Pending')).length;
  safeSet('notifCountBd', pendingCount); safeSet('bnBdgD', pendingCount);
  const fp = document.getElementById('focusPill');
  if(fp) { if(pendingCount>0) fp.innerHTML=`<span class="pill-icon" style="color:var(--er);"><i data-lucide="bell-ring" class="lucide-sm"></i></span> Ada <strong style="color:var(--er); margin:0 4px; font-size:15px;">${pendingCount}</strong> Surat Masuk tertunda.`; else fp.innerHTML=`<span class="pill-icon" style="color:var(--ok);"><i data-lucide="check-circle-2" class="lucide-sm"></i></span> Hore! Tidak ada tugas tertunda.`; if(window.lucide) lucide.createIcons(); }
  const nd=document.getElementById('notifDot'), bnb=document.getElementById('bnBdgD');
  if(pendingCount>0){ if(nd)nd.style.display='block'; if(bnb)bnb.style.display='block'; } else { if(nd)nd.style.display='none'; if(bnb)bnb.style.display='none'; }
  renderRecentActivities(); renderUnitActivity(); renderRecentTembusan(); renderUnitDashboard(); 
};

window.saveDraft = function(formType) { if(editModeId)return; const dr={}; document.querySelectorAll(`#mod${formType} .fc`).forEach(el=>{if(el.id&&!el.id.includes('f_'))dr[el.id]=el.value;}); localStorage.setItem(`ea_draft_${formType}`,JSON.stringify(dr)); const ind=document.getElementById('draftIndicator'), ts=document.getElementById('draftTime'); if(ind&&ts){ const n=new Date(); ts.textContent=String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0'); ind.classList.add('show'); if(window.draftTimeout)clearTimeout(window.draftTimeout); window.draftTimeout=setTimeout(()=>ind.classList.remove('show'),2500); } };
window.loadDraft = function(formType) { if(editModeId)return; const ds=localStorage.getItem(`ea_draft_${formType}`); if(ds){ const dr=JSON.parse(ds); Object.keys(dr).forEach(k=>{const el=document.getElementById(k); if(el)el.value=dr[k];}); showToast('📝 Draft dimuat','info'); } };
window.clearDraft = function(formType) { localStorage.removeItem(`ea_draft_${formType}`); };
function initAutoSave() { ['D','SK','Tembusan','Arsip'].forEach(t=>{ document.querySelectorAll(`#mod${t} .fc`).forEach(el=>{ el.addEventListener('input',()=>saveDraft(t)); el.addEventListener('change',()=>saveDraft(t)); }); }); }

async function dbQuery(act, tbl, dObj) { const u=APP_SCRIPT_URL; if(!u||u==="MASUKKAN_URL_GAS_ANDA_DISINI")return dObj||{}; try{ const res=await fetch(u,{method:'POST',body:JSON.stringify({action:act,table:tbl,data:dObj})}); const json=await res.json(); return json.data||dObj; } catch(e){ showToast('⚠️ Mode Offline','error'); return dObj||{}; } }
async function loadDataFromServer(url) {
  ['dTb','skTb','arsipTb','tTembusanTb'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=getSkeletonHTML(7);}); toggleLoading(true,'Sinkronisasi...',false);
  try{ let r=await fetch(url+'?action=get'), d=await r.json(); disposisiData=d.disposisi||[]; suratKeluarData=d.sk||[]; arsipData=d.arsip||[]; if(d.tembusan)tembusanData=d.tembusan; if(d.logs)logData=d.logs; showToast('☁️ Sinkronisasi berhasil','ok'); } catch(e){ showToast('⚠️ Gagal memuat data server','error'); }
  toggleLoading(false); updateDashboardStats(); renderDisposisi(); renderSuratKeluar(); renderArsip(); renderTembusan(); if(currentUser&&(currentUser.role==='admin'||currentUser.role==='pimpinan')) renderLog();
}
window.recordLog = async function(act, mod, desc) { if(!currentUser)return; const n=new Date(), nl={id:Date.now(), tgl:n.toISOString().slice(0,10), waktu:String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0')+' WIB', actor:currentUser.name, act:act, mod:mod, desc:desc}; logData.unshift(nl); if(currentUser.role==='admin'||currentUser.role==='pimpinan')renderLog(); if(APP_SCRIPT_URL&&APP_SCRIPT_URL!=="MASUKKAN_URL_GAS_ANDA_DISINI")dbQuery('save','LogAktivitas',nl); };

// --- PAGINATION & NAV ---
window.changePage = function(ctx, p) { playUISound('pop'); if(ctx==='disposisi'){currentPageD=p;renderDisposisi();}else if(ctx==='sk'){currentPageSK=p;renderSuratKeluar();}else if(ctx==='arsip'){currentPageArsip=p;renderArsip();}else if(ctx==='tembusan'){currentPageT=p;renderTembusan();}else if(ctx==='log'){currentPageLog=p;renderLog();} };
window.renderPagination = function(cId, tot, cp, fn) { const c=document.getElementById(cId); if(!c)return; const tP=Math.ceil(tot/itemsPerPage)||1; let h=''; for(let i=1;i<=tP;i++) h+=`<button class="pgb ${i===cp?'act':''}" onclick="changePage('${fn}',${i})">${i}</button>`; c.innerHTML=h; };
window.goToPage = function(p) { playUISound('pop'); document.querySelectorAll('.pg, .ni, .bn-item').forEach(el=>el.classList.remove('act')); document.getElementById('pg-'+p).classList.add('act'); document.querySelector(`.ni[data-page="${p}"]`)?.classList.add('act'); document.querySelector(`.bn-item[data-page="${p}"]`)?.classList.add('act'); const ti=pageTitles[p]||['E-Admin LPIS','']; const pt=document.getElementById('pgT'), bc=document.getElementById('bcText'); if(pt)pt.textContent=ti[0]; if(p==='dashboard'&&currentUser&&(currentUser.role==='admin'||currentUser.role==='pimpinan')){ if(bc)bc.textContent='/ Dashboard'; const ps=document.getElementById('pgS'); if(ps&&window.innerWidth>560)pt.textContent='Dashboard'; }else{ if(bc)bc.textContent='/ '+ti[0]; } if(p==='disposisi')renderDisposisi(); if(p==='sk')renderSuratKeluar(); if(p==='arsip')renderArsip(); if(p==='tembusan')renderTembusan(); if(p==='log')renderLog(); if(p==='pengaturan'){ renderBidangSettings();renderUserSettings();renderPejabatSettings();renderKategoriSettings(); } document.getElementById('sidebar').classList.remove('show'); document.getElementById('sbOv').classList.remove('show'); };
window.toggleSidebar = function() { playUISound('pop'); document.getElementById('sidebar').classList.toggle('show'); document.getElementById('sbOv').classList.toggle('show'); };
window.toggleTheme = function() { playUISound('pop'); const h=document.documentElement, isD=h.getAttribute('data-theme')==='dark'; h.setAttribute('data-theme',isD?'light':'dark'); localStorage.setItem('ea-th',isD?'light':'dark'); };

// --- MODALS & CRUD GLOBAL ---
window.openModal = function(id, md) { playUISound('pop'); editModeId=null; const m=document.getElementById(id); if(md==='add'){ m.querySelectorAll('input:not([type=file]), textarea, select').forEach(i=>i.tagName==='SELECT'?i.selectedIndex=0:i.value=''); if(id==='modSK'){ document.getElementById('modSKT').innerHTML='<i data-lucide="plus-circle"></i> Tambah Surat Keluar'; document.getElementById('sk_tgl').value=getToday(); populateBidangDropdown(); populatePejabatDropdown(); toggleSKAcc(); const dp=pejabatData.find(p=>p.isDefault); if(dp)document.getElementById('sk_ttd').value=dp.nama; } if(id==='modD'){ document.getElementById('modDT').innerHTML='<i data-lucide="plus-circle"></i> Tambah Disposisi'; document.getElementById('d_tgl_s').value=getToday(); document.getElementById('d_tgl_t').value=getToday(); toggleHasilDisposisi(); } setTimeout(()=>loadDraft(id.replace('mod','')),50); } m.classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.closeModal = function(id) { playUISound('pop'); document.getElementById(id).classList.remove('op'); };
window.confirmDelete = function(tb, id) { playUISound('pop'); deleteTargetTable=tb; deleteTargetId=id; document.getElementById('modDelete').classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.executeDelete = async function() { if(!deleteTargetId)return; document.getElementById('modDelete').classList.remove('op'); toggleLoading(true,'Menghapus Data...'); const tu=deleteTargetTable; await dbQuery('delete',tu,{id:deleteTargetId}); if(tu==='Disposisi')disposisiData=disposisiData.filter(x=>x.id!=deleteTargetId); if(tu==='SuratKeluar')suratKeluarData=suratKeluarData.filter(x=>x.id!=deleteTargetId); if(tu==='Arsip')arsipData=arsipData.filter(x=>x.id!=deleteTargetId); if(tu==='Tembusan'){tembusanData=tembusanData.filter(x=>x.id!=deleteTargetId); localStorage.setItem('ea-tembusan',JSON.stringify(tembusanData));} recordLog('DELETE',tu,`Hapus data ID: ${deleteTargetId}`); deleteTargetTable=''; deleteTargetId=null; toggleLoading(false); showToast('🗑️ Data dihapus','info'); updateDashboardStats(); if(tu==='Disposisi')renderDisposisi(); if(tu==='SuratKeluar')renderSuratKeluar(); if(tu==='Arsip')renderArsip(); if(tu==='Tembusan')renderTembusan(); };
window.cloneDoc = function(t, id) { if(t==='Disposisi'){ const i=disposisiData.find(x=>x.id==id); if(i){openModal('modD','add'); setTimeout(()=>{document.getElementById('d_fr').value=i.fr; document.getElementById('d_hl').value=i.hl; showToast('📝 Disposisi diduplikasi','info');},150);} }else if(t==='SuratKeluar'){ const i=suratKeluarData.find(x=>x.id==id); if(i){openModal('modSK','add'); setTimeout(()=>{document.getElementById('sk_to').value=i.to; document.getElementById('sk_hl').value=i.hl; const sj=document.getElementById('sk_j'); for(let k=0;k<sj.options.length;k++)if(sj.options[k].value===i.j)sj.selectedIndex=k; const sb=document.getElementById('sk_bdg'); for(let k=0;k<sb.options.length;k++)if(sb.options[k].value===i.bdg)sb.selectedIndex=k; generateNoSK(); showToast('📝 Surat Keluar diduplikasi','info');},150);} } };
window.shareDriveLink = function(url) { if(!url)return showToast('⚠️ Link file kosong','error'); const qB=document.getElementById('qrRenderBox'), lT=document.getElementById('qrLinkText'), wB=document.getElementById('waShareBtn'); if(qB){qB.innerHTML=''; new QRCode(qB,{text:url,width:160,height:160,colorDark:"#0f172a",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.H});} if(lT)lT.textContent=url; if(wB)wB.href=`https://wa.me/?text=${encodeURIComponent('Link dokumen E-Admin LPIS:\n\n'+url)}`; document.getElementById('modShare').classList.add('op'); };

// --- DISPOSISI ---
window.renderDisposisi = function() {
  let d=[...disposisiData]; const q=(document.querySelector('#pg-disposisi .sri')?.value||'').toLowerCase(), st=cleanSt(document.getElementById('f_d_st')?.value||''), strt=document.getElementById('f_d_start')?.value||'', end=document.getElementById('f_d_end')?.value||'';
  if(q) d=d.filter(x=>x.no.toLowerCase().includes(q)||x.fr.toLowerCase().includes(q)); if(st) d=d.filter(x=>cleanSt(x.st)===st); if(strt) d=d.filter(x=>x.tgl_s>=strt||x.tgl_t>=strt); if(end) d=d.filter(x=>x.tgl_s<=end||x.tgl_t<=end);
  const t=d.length, sI=(currentPageD-1)*itemsPerPage, pd=d.slice(sI,sI+itemsPerPage), ct=document.getElementById('dCt'), tb=document.getElementById('dTb');
  if(ct)ct.textContent=`Menampilkan ${t===0?0:sI+1}-${Math.min(sI+itemsPerPage,t)} dari ${t} entri`;
  if(tb){ if(pd.length===0)tb.innerHTML=`<tr><td colspan="8"><div class="empty-state-wrap"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Open%20file%20folder/3D/open_file_folder_3d.png" class="empty-state-img"><div class="empty-state-t">Data Kosong</div></div></td></tr>`;
  else tb.innerHTML=pd.map((x,i)=>{ let cs=cleanSt(x.st), is=cs.includes('Selesai')?'<i data-lucide="check-circle" class="lucide-sm"></i>':'<i data-lucide="clock" class="lucide-sm"></i>'; return `<tr class="${cs.includes('Pending')?'unread':''}"><td style="color:var(--tm)">${sI+i+1}</td><td><strong>${escapeHTML(x.no)}</strong></td><td>${formatDate(x.tgl_s)}</td><td>${escapeHTML(x.fr)}</td><td class="text-wrap">${escapeHTML(x.hl)}</td><td>${x.to?escapeHTML(x.to):'<span style="color:var(--tm);font-size:11px"><i>Menunggu</i></span>'}</td><td><span class="bdg ${cs.includes('Pending')?'bp':'bd'}">${is} ${cs}</span></td><td style="text-align:right;"><div style="display:inline-flex;gap:6px"><button class="btn bg2 bxs" onclick="viewDisposisi('${x.id}')"><i data-lucide="eye" class="lucide-sm"></i></button>${cs.includes('Selesai')?`<button class="btn bg2 bxs" onclick="printDisposisi('${x.id}')"><i data-lucide="printer" class="lucide-sm"></i></button>`:''}${currentUser&&currentUser.role==='admin'?`<button class="btn bg2 bxs" onclick="cloneDoc('Disposisi','${x.id}')"><i data-lucide="copy" class="lucide-sm"></i></button><button class="btn bg2 bxs" onclick="editDisposisi('${x.id}')"><i data-lucide="edit-2" class="lucide-sm"></i></button><button class="btn bd2 bxs" onclick="confirmDelete('Disposisi','${x.id}')"><i data-lucide="trash-2" class="lucide-sm"></i></button>`:''}</div></td></tr>`; }).join(''); }
  renderPagination('dPg',t,currentPageD,'disposisi'); if(window.lucide)setTimeout(()=>lucide.createIcons(),50);
};
window.filterDisposisi = function(){currentPageD=1;renderDisposisi();}; window.toggleHasilDisposisi = function(){const s=document.getElementById('d_st'), c=document.getElementById('sec_hasil_disp'); if(s&&c)c.style.display=cleanSt(s.value).includes('Selesai')?'block':'none';};
window.editDisposisi = function(id) { playUISound('pop'); const i=disposisiData.find(x=>x.id==id); if(!i)return; editModeId=id; document.getElementById('modDT').innerHTML='<i data-lucide="edit-3"></i> Edit Disposisi'; document.getElementById('d_no').value=i.no||''; document.getElementById('d_tgl_s').value=i.tgl_s||''; document.getElementById('d_tgl_t').value=i.tgl_t||''; document.getElementById('d_fr').value=i.fr||''; document.getElementById('d_hl').value=i.hl||''; const st=document.getElementById('d_to'); for(let k=0;k<st.options.length;k++)if(st.options[k].value===i.to)st.selectedIndex=k; const ss=document.getElementById('d_st'); for(let k=0;k<ss.options.length;k++)if(cleanSt(ss.options[k].value)===cleanSt(i.st))ss.selectedIndex=k; document.getElementById('d_ct').value=i.ct||''; toggleHasilDisposisi(); document.getElementById('modD').classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.saveDisposisi = async function() {
  const n=document.getElementById('d_no').value.trim(), st=cleanSt(document.getElementById('d_st').value), to=document.getElementById('d_to').value, ts=document.getElementById('d_tgl_s').value, tt=document.getElementById('d_tgl_t').value, f=document.getElementById('d_fr').value, h=document.getElementById('d_hl').value;
  if(!n)return showToast('⚠️ No Surat wajib!','error'); if(st.includes('Selesai')&&!to)return showToast('⚠️ Pilih tujuan disposisi!','error');
  closeModal('modD'); toggleLoading(true,'Menyimpan...',true);
  setTimeout(async()=>{
    const fi=document.getElementById('d_f'), fhi=document.getElementById('d_f_hasil');
    const fn=fi.files[0]?generateFilename(ts,f,h,fi.files[0].name):(editModeId?disposisiData.find(x=>x.id==editModeId).fi:'');
    const fnh=fhi.files[0]?generateFilename(tt,'Hasil',h,fhi.files[0].name):(editModeId?disposisiData.find(x=>x.id==editModeId).fi_h:'');
    const nd={id:editModeId||Date.now(), no:n, tgl_s:ts, tgl_t:tt, fr:f, hl:h, to:to, ct:document.getElementById('d_ct').value, st:st, fi:fn, fi_data:fi.files[0]?fi.getAttribute('data-base64'):'', fi_h:fnh, fi_h_data:fhi.files[0]?fhi.getAttribute('data-base64'):''};
    const rd=await dbQuery('save','Disposisi',nd);
    if(editModeId){ disposisiData[disposisiData.findIndex(x=>x.id==editModeId)]=rd||nd; recordLog('UPDATE','Disposisi',`Update Disposisi No: ${n}`); } else { disposisiData.unshift(rd||nd); recordLog('CREATE','Disposisi',`Disposisi Baru No: ${n}`); }
    if(st.includes('Selesai')&&!arsipData.find(a=>a.no===n)){ const nA={id:Date.now()+1, no:n, tgl:tt, kat:'Surat Masuk', hl:h+' (ACC)', lok:'Arsip Digital', fi:(rd||nd).fi_h||(rd||nd).fi, fi_url:(rd||nd).fi_h_url||(rd||nd).fi_url}; arsipData.unshift(await dbQuery('save','Arsip',nA)||nA); }
    clearDraft('D'); toggleLoading(false); updateDashboardStats(); renderDisposisi(); showToast('✅ Tersimpan','ok');
  },100);
};
window.viewDisposisi = function(id) {
  playUISound('pop'); const i=disposisiData.find(x=>x.id==id); if(!i)return; const s=(eid,t)=>{const e=document.getElementById(eid);if(e)e.textContent=t;};
  s('vd_no',i.no); s('vd_fr',i.fr); s('vd_tgl_s',formatDate(i.tgl_s)); s('vd_tgl_t',formatDate(i.tgl_t)); s('vd_hl',i.hl);
  const bl=document.getElementById('vd_lamp_btn'), ll=document.getElementById('vd_lamp_link'); if(i.fi_url){bl.style.display='block';ll.href=i.fi_url;}else bl.style.display='none';
  let cs=cleanSt(i.st), is=cs.includes('Selesai')?'<i data-lucide="check-circle" class="lucide-sm"></i>':'<i data-lucide="clock" class="lucide-sm"></i>'; const vds=document.getElementById('vd_st'); if(vds)vds.innerHTML=`<span class="bdg bd">${is} ${cs}</span>`;
  s('vd_to',i.to||'—'); s('vd_ct',i.ct||'—'); const hs=document.getElementById('vd_hasil_section'); if(hs)hs.style.display=cs.includes('Selesai')?'block':'none';
  const bh=document.getElementById('vd_hasil_btn'), lh=document.getElementById('vd_hasil_link'); if(i.fi_h_url){bh.style.display='block';lh.href=i.fi_h_url;}else bh.style.display='none';
  document.getElementById('btnShareDTop')?.setAttribute('onclick',`shareDriveLink('${i.fi_h_url||''}')`); document.getElementById('btnDownloadJPGTop')?.setAttribute('onclick',`downloadJPG('${id}')`); document.getElementById('btnCetakDisposisiTop')?.setAttribute('onclick',`printDisposisi('${id}')`);
  openModal('modViewD','view'); if(window.lucide)lucide.createIcons();
};

window.printDisposisi = function(id) {
  const i=disposisiData.find(x=>x.id==id); if(!i)return; const s=(eid,t)=>{const e=document.getElementById(eid);if(e)e.textContent=t;};
  s('pr_tgl_t',formatDate(i.tgl_t)); s('pr_fr',i.fr); s('pr_no',i.no); s('pr_tgl_s',formatDate(i.tgl_s)); s('pr_hl',i.hl); s('pr_ct',i.ct||'');
  const tt=document.getElementById('pr_to_table'); if(tt){tt.querySelectorAll('td[data-role]').forEach(td=>td.textContent=''); const tgt=tt.querySelector(`td[data-role="${i.to}"]`); if(tgt)tgt.textContent='V';}
  const qb=document.getElementById('printQrBox'); if(qb){qb.innerHTML=''; try{new QRCode(qb,{text:i.fi_h_url||i.fi_url||'https://google.com',width:70,height:70,correctLevel:QRCode.CorrectLevel.L});}catch(e){}}
  const he=document.getElementById('printHistory'); if(he)he.textContent=`Dicetak oleh: ${currentUser?currentUser.name:'Admin'} pada ${new Date().toLocaleString('id-ID')}`;
  document.body.classList.add('print-disposisi-mode'); setTimeout(()=>{window.print(); setTimeout(()=>document.body.classList.remove('print-disposisi-mode'),500);},300);
};
window.downloadJPG = function(id) {
  const d=disposisiData.find(x=>x.id==id); if(!d)return; const s=(eid,t)=>{const e=document.getElementById(eid);if(e)e.textContent=t;};
  s('pr_tgl_t',formatDate(d.tgl_t)); s('pr_fr',d.fr); s('pr_no',d.no); s('pr_tgl_s',formatDate(d.tgl_s)); s('pr_hl',d.hl); s('pr_ct',d.ct||'');
  const tt=document.getElementById('pr_to_table'); if(tt){tt.querySelectorAll('td[data-role]').forEach(td=>td.textContent=''); const tgt=tt.querySelector(`td[data-role="${d.to}"]`); if(tgt)tgt.textContent='V';}
  const qb=document.getElementById('printQrBox'); if(qb){qb.innerHTML=''; try{new QRCode(qb,{text:d.fi_h_url||d.fi_url||'https://google.com',width:70,height:70,correctLevel:QRCode.CorrectLevel.L});}catch(e){}}
  showToast('⏳ Menyiapkan gambar...','info');
  setTimeout(()=>{ const pa=document.getElementById('printArea'), w=document.getElementById('printAreaWrapper'); if(!w||!pa)return showToast('⚠️ Elemen tidak ditemukan','error'); w.style.display='block'; w.style.position='absolute'; w.style.left='-9999px'; w.style.top='0';
    html2canvas(pa,{scale:2,useCORS:true,backgroundColor:'#ffffff'}).then(c=>{ const l=document.createElement('a'); l.download=`Disposisi_${(d.no||'Surat').replace(/[^a-zA-Z0-9]/g,'_')}.jpg`; l.href=c.toDataURL('image/jpeg',0.9); l.click(); w.style.display='none'; showToast('✅ Unduhan Selesai','ok'); }).catch(err=>{if(w)w.style.display='none'; showToast('⚠️ Gagal membuat gambar','error');});
  },500);
};

// --- SURAT KELUAR ---
window.generateNoSK = function() { const t=document.getElementById('sk_tgl').value, b=document.getElementById('sk_bdg').value; if(!t||!b)return document.getElementById('sk_no').value=''; const d=new Date(t); let c=0; suratKeluarData.forEach(sk=>{if((!editModeId||sk.id!=editModeId)&&sk.tgl===t)c++;}); document.getElementById('sk_no').value=`${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}/${String(c+1).padStart(2,'0')}/IV.1/${b}/${d.getFullYear()}`; };
window.renderSuratKeluar = function() {
  let d=[...suratKeluarData]; const q=(document.querySelector('#pg-sk .sri')?.value||'').toLowerCase(), st=cleanSt(document.getElementById('f_sk_st')?.value||''), strt=document.getElementById('f_sk_start')?.value||'', end=document.getElementById('f_sk_end')?.value||'';
  if(q) d=d.filter(x=>x.no.toLowerCase().includes(q)||x.to.toLowerCase().includes(q)); if(st) d=d.filter(x=>cleanSt(x.st)===st); if(strt) d=d.filter(x=>x.tgl>=strt); if(end) d=d.filter(x=>x.tgl<=end);
  const t=d.length, sI=(currentPageSK-1)*itemsPerPage, pd=d.slice(sI,sI+itemsPerPage), ct=document.getElementById('skCt'), tb=document.getElementById('skTb');
  if(ct)ct.textContent=`Menampilkan ${t===0?0:sI+1}-${Math.min(sI+itemsPerPage,t)} dari ${t} entri`;
  if(tb){ if(pd.length===0)tb.innerHTML=`<tr><td colspan="7"><div class="empty-state-wrap"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Outbox%20tray/3D/outbox_tray_3d.png" class="empty-state-img"><div class="empty-state-t">Data Kosong</div></div></td></tr>`;
  else tb.innerHTML=pd.map((x,i)=>{ let cs=cleanSt(x.st), is=cs.includes('Selesai')?'<i data-lucide="check-circle" class="lucide-sm"></i>':(cs.includes('Dibagikan')?'<i data-lucide="send" class="lucide-sm"></i>':'<i data-lucide="clock" class="lucide-sm"></i>'); return `<tr class="${cs.includes('Proses')?'unread':''}"><td style="color:var(--tm)">${sI+i+1}</td><td><strong>${escapeHTML(x.no)}</strong></td><td>${formatDate(x.tgl)}</td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(x.to)}</td><td class="text-wrap">${escapeHTML(x.hl)}</td><td><span class="bdg ${cs.includes('Proses')?'bp':(cs.includes('Selesai')?'bpr':'bd')}">${is} ${cs}</span></td><td style="text-align:right;"><div style="display:inline-flex;gap:6px"><button class="btn bg2 bxs" onclick="viewSuratKeluar('${x.id}')"><i data-lucide="eye" class="lucide-sm"></i></button>${currentUser&&currentUser.role==='admin'?`<button class="btn bg2 bxs" onclick="cloneDoc('SuratKeluar','${x.id}')"><i data-lucide="copy" class="lucide-sm"></i></button><button class="btn bg2 bxs" onclick="editSuratKeluar('${x.id}')"><i data-lucide="edit-2" class="lucide-sm"></i></button><button class="btn bd2 bxs" onclick="confirmDelete('SuratKeluar','${x.id}')"><i data-lucide="trash-2" class="lucide-sm"></i></button>`:''}</div></td></tr>`; }).join(''); }
  renderPagination('skPg',t,currentPageSK,'sk'); if(window.lucide)setTimeout(()=>lucide.createIcons(),50);
};
window.filterSuratKeluar = function(){currentPageSK=1;renderSuratKeluar();}; window.toggleSKAcc = function(){const s=document.getElementById('sk_st'), c=document.getElementById('sec_sk_acc'); if(s&&c)c.style.display=(cleanSt(s.value).includes('Selesai')||cleanSt(s.value).includes('Dibagikan'))?'block':'none';};
window.editSuratKeluar = function(id) { playUISound('pop'); const i=suratKeluarData.find(x=>x.id==id); if(!i)return; editModeId=id; document.getElementById('modSKT').innerHTML='<i data-lucide="edit-3"></i> Edit SK'; populateBidangDropdown(); populatePejabatDropdown(); document.getElementById('sk_no').value=i.no||''; document.getElementById('sk_tgl').value=i.tgl||''; const sb=document.getElementById('sk_bdg'); for(let k=0;k<sb.options.length;k++)if(sb.options[k].value===i.bdg)sb.selectedIndex=k; document.getElementById('sk_to').value=i.to||''; document.getElementById('sk_hl').value=i.hl||''; const st=document.getElementById('sk_ttd'); for(let k=0;k<st.options.length;k++)if(st.options[k].value===i.ttd)st.selectedIndex=k; const sj=document.getElementById('sk_j'); for(let k=0;k<sj.options.length;k++)if(sj.options[k].value===i.j)sj.selectedIndex=k; const ss=document.getElementById('sk_st'); for(let k=0;k<ss.options.length;k++)if(cleanSt(ss.options[k].value)===cleanSt(i.st))ss.selectedIndex=k; toggleSKAcc(); document.getElementById('modSK').classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.copyNoSurat = function() { const c=document.getElementById('copyNoSkVal'); c.select(); c.setSelectionRange(0,99999); try{document.execCommand("copy"); showToast('📋 Disalin!','ok');}catch(e){showToast('⚠️ Gagal salin','error');} };
window.saveSuratKeluar = async function() {
  const n=document.getElementById('sk_no').value, ts=document.getElementById('sk_tgl').value, h=document.getElementById('sk_hl').value, bs=document.getElementById('sk_bdg');
  if(!n)return showToast('⚠️ Pilih tanggal & bidang','error'); const ib=!editModeId;
  closeModal('modSK'); toggleLoading(true,'Menyimpan...',true);
  setTimeout(async()=>{
    const fi=document.getElementById('sk_f'), fia=document.getElementById('sk_f_acc'), stv=cleanSt(document.getElementById('sk_st').value);
    let bt='Umum'; if(bs.selectedIndex>0)bt=bs.options[bs.selectedIndex].text.replace(/^\d+\s*-\s*/,'').split(/[,&]/)[0].trim();
    const fnd=fi.files[0]?generateFilename(ts,bt,h,fi.files[0].name):(editModeId?suratKeluarData.find(x=>x.id==editModeId).fi:'');
    const fna=fia.files[0]?generateFilename(ts,bt,h+'_ACC',fia.files[0].name):(editModeId?suratKeluarData.find(x=>x.id==editModeId).fi_acc:'');
    const nd={id:editModeId||Date.now(), no:n, tgl:ts, bdg:bs.value, to:document.getElementById('sk_to').value, hl:h, j:document.getElementById('sk_j').value, ttd:document.getElementById('sk_ttd').value, st:stv, fi:fnd, fi_data:fi.files[0]?fi.getAttribute('data-base64'):'', fi_acc:fna, fi_acc_data:fia.files[0]?fia.getAttribute('data-base64'):''};
    const rd=await dbQuery('save','SuratKeluar',nd);
    if(editModeId){ suratKeluarData[suratKeluarData.findIndex(x=>x.id==editModeId)]=rd||nd; recordLog('UPDATE','Surat Keluar',`Update SK No: ${n}`); } else { suratKeluarData.unshift(rd||nd); recordLog('CREATE','Surat Keluar',`SK Baru No: ${n}`); }
    if(stv.includes('Dibagikan')&&!arsipData.find(a=>a.no===n)){ const nA={id:Date.now()+1, no:n, tgl:ts, kat:'Surat Keluar', hl:h+' (Distribusi)', lok:'Arsip Digital', fi:(rd||nd).fi_acc||(rd||nd).fi, fi_url:(rd||nd).fi_acc_url||(rd||nd).fi_url}; arsipData.unshift(await dbQuery('save','Arsip',nA)||nA); }
    clearDraft('SK'); toggleLoading(false); updateDashboardStats(); renderSuratKeluar();
    if(ib){ const cp=document.getElementById('copyNoSkVal'); if(cp)cp.value=(rd||nd).no; openModal('modCopy','view'); if(window.lucide)lucide.createIcons(); } else showToast('✅ Diperbarui','ok');
  },100);
};
window.viewSuratKeluar = function(id) {
  playUISound('pop'); const i=suratKeluarData.find(x=>x.id==id); if(!i)return; const s=(eid,t)=>{const e=document.getElementById(eid);if(e)e.textContent=t;};
  s('vsk_no',i.no); s('vsk_tgl',formatDate(i.tgl)); s('vsk_bdg',i.bdg); s('vsk_to',i.to); s('vsk_hl',i.hl); s('vsk_j',i.j); s('vsk_ttd',i.ttd);
  const bd=document.getElementById('vsk_draft_btn'), ld=document.getElementById('vsk_draft_link'); if(i.fi_url){bd.style.display='block';ld.href=i.fi_url;}else bd.style.display='none';
  let cs=cleanSt(i.st), is=cs.includes('Selesai')?'<i data-lucide="check-circle" class="lucide-sm"></i>':(cs.includes('Dibagikan')?'<i data-lucide="send" class="lucide-sm"></i>':'<i data-lucide="clock" class="lucide-sm"></i>'); const vse=document.getElementById('vsk_st'); if(vse)vse.innerHTML=`<span class="bdg bd">${is} ${cs}</span>`;
  const ba=document.getElementById('vsk_acc_btn'), la=document.getElementById('vsk_acc_link'); if(i.fi_acc_url){ba.style.display='block';la.href=i.fi_acc_url;}else ba.style.display='none';
  document.getElementById('btnShareSKTop')?.setAttribute('onclick',`shareDriveLink('${i.fi_acc_url||''}')`); openModal('modViewSK','view'); if(window.lucide)lucide.createIcons();
};

// --- TEMBUSAN ---
window.renderTembusan = function() {
  let d=[...tembusanData]; const q=(document.querySelector('#pg-tembusan .sri')?.value||'').toLowerCase(), uf=document.getElementById('f_t_unit')?.value||'', strt=document.getElementById('f_t_start')?.value||'', end=document.getElementById('f_t_end')?.value||'';
  if(currentUser&&currentUser.role!=='admin'&&currentUser.role!=='pimpinan') d=d.filter(x=>x.unit===currentUser.name);
  if(q) d=d.filter(x=>x.no.toLowerCase().includes(q)||x.hl.toLowerCase().includes(q)||x.to.toLowerCase().includes(q)); if(uf) d=d.filter(x=>x.unit===uf); if(strt) d=d.filter(x=>x.tgl>=strt); if(end) d=d.filter(x=>x.tgl<=end);
  const t=d.length, sI=(currentPageT-1)*itemsPerPage, pd=d.slice(sI,sI+itemsPerPage), ct=document.getElementById('tTembusanCt'), tb=document.getElementById('tTembusanTb');
  if(ct)ct.textContent=`Menampilkan ${t===0?0:sI+1}-${Math.min(sI+itemsPerPage,t)} dari ${t} dokumen`;
  if(tb){ if(pd.length===0)tb.innerHTML=`<tr><td colspan="8"><div class="empty-state-wrap"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Clipboard/3D/clipboard_3d.png" class="empty-state-img"><div class="empty-state-t">Data Kosong</div></div></td></tr>`;
  else tb.innerHTML=pd.map((x,i)=>`<tr><td style="color:var(--tm)">${sI+i+1}</td><td><strong>${escapeHTML(x.no)}</strong></td><td><div style="display:flex; flex-direction:column; gap:6px;"><div style="font-size:12.5px; font-weight:700; color:var(--tp);"><i data-lucide="calendar" class="lucide-sm" style="color:var(--tm); margin-right:4px;"></i>${formatDate(x.tgl)}</div><div class="bdg b-time" style="width:max-content; background:transparent; padding:0;"><i data-lucide="upload-cloud" class="lucide-sm" style="color:var(--a1); margin-right:4px;"></i>${formatDate(x.tgl_up||x.tgl)} - ${escapeHTML(x.waktu||'-')}</div></div></td><td><span class="bdg bpr">${escapeHTML(x.unit)}</span></td><td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(x.to)}</td><td class="text-wrap">${escapeHTML(x.hl)}</td><td>${x.fi_url?`<a href="${x.fi_url}" target="_blank" class="btn bg2 bxs" style="color:var(--a1)"><i data-lucide="cloud" class="lucide-sm"></i> Drive</a>`:'<span style="font-size:11px;color:var(--tm)">No File</span>'}</td><td style="text-align:right;"><div style="display:inline-flex;gap:6px"><button class="btn bg2 bxs" onclick="viewTembusan('${x.id}')"><i data-lucide="eye" class="lucide-sm"></i></button><button class="btn bg2 bxs" onclick="editTembusan('${x.id}')"><i data-lucide="edit-2" class="lucide-sm"></i></button><button class="btn bd2 bxs" onclick="confirmDelete('Tembusan','${x.id}')"><i data-lucide="trash-2" class="lucide-sm"></i></button></div></td></tr>`).join(''); }
  renderPagination('tTembusanPg',t,currentPageT,'tembusan'); if(window.lucide)setTimeout(()=>lucide.createIcons(),50);
};
window.filterTembusan = function(){currentPageT=1;renderTembusan();}; window.clearTembusanFilter = function(){document.querySelector('#pg-tembusan .sri').value=''; document.getElementById('f_t_start').value=''; document.getElementById('f_t_end').value=''; document.getElementById('f_t_unit').selectedIndex=0; filterTembusan();};
window.editTembusan = function(id) { playUISound('pop'); const i=tembusanData.find(x=>x.id==id); if(!i)return; editModeId=id; document.getElementById('modTembusanT').innerHTML='<i data-lucide="edit-3"></i> Edit Tembusan'; document.getElementById('t_no').value=i.no||''; document.getElementById('t_tgl').value=i.tgl||''; document.getElementById('t_jenis').value=i.j||''; document.getElementById('t_to').value=i.to||''; document.getElementById('t_hl').value=i.hl||''; const su=document.getElementById('t_unit'); for(let k=0;k<su.options.length;k++)if(su.options[k].value===i.unit)su.selectedIndex=k; openModalTembusan('edit'); };
window.openModalTembusan = function(mode) {
  playUISound('pop'); if(mode==='add'){ editModeId=null; document.getElementById('modTembusanT').innerHTML='<i data-lucide="plus-circle"></i> Tambah Tembusan'; document.getElementById('t_tgl').value=getToday(); document.getElementById('t_jenis').value=''; document.getElementById('t_no').value=''; document.getElementById('t_to').value=''; document.getElementById('t_hl').value=''; document.getElementById('t_f').value=''; document.getElementById('t_fl').style.display='none'; }
  const su=document.getElementById('t_unit'); if(currentUser&&currentUser.role!=='admin'&&currentUser.role!=='pimpinan'){ su.value=currentUser.name; su.style.pointerEvents='none'; su.style.backgroundColor='var(--bg)'; su.style.color='var(--ts)'; } else { su.style.pointerEvents='auto'; su.style.backgroundColor='var(--sb)'; su.style.color='var(--tp)'; if(mode==='add')su.selectedIndex=0; }
  document.getElementById('modTembusan').classList.add('op'); if(window.lucide)lucide.createIcons(); setTimeout(()=>loadDraft('Tembusan'),50);
};
window.saveTembusan = async function() {
  const u=document.getElementById('t_unit').value, j=document.getElementById('t_jenis').value.trim(), ts=document.getElementById('t_tgl').value, n=document.getElementById('t_no').value.trim(), to=document.getElementById('t_to').value.trim(), h=document.getElementById('t_hl').value.trim();
  if(!u||!ts||!h||!n)return showToast('⚠️ Wajib diisi','error'); const nw=new Date(), tup=nw.toISOString().slice(0,10), wup=String(nw.getHours()).padStart(2,'0')+':'+String(nw.getMinutes()).padStart(2,'0')+' WIB';
  closeModal('modTembusan'); toggleLoading(true,'Menyimpan...',true);
  setTimeout(async()=>{
    const fi=document.getElementById('t_f'), fn=fi.files[0]?generateFilename(tup,`${safeName(u)}_${safeName(h)}`,'',fi.files[0].name):(editModeId?tembusanData.find(x=>x.id==editModeId).fi:'');
    const nd={id:editModeId||Date.now(), unit:u, j:j, tgl:ts, tgl_up:tup, waktu:wup, no:n, to:to, hl:h, fi:fn, fi_data:fi.files[0]?fi.getAttribute('data-base64'):''};
    const rd=await dbQuery('save','Tembusan',nd);
    if(editModeId){ tembusanData[tembusanData.findIndex(x=>x.id==editModeId)]=rd||nd; recordLog('UPDATE','Tembusan',`Update No: ${n}`); } else { tembusanData.unshift(rd||nd); recordLog('CREATE','Tembusan',`Tembusan Baru No: ${n}`); }
    localStorage.setItem('ea-tembusan',JSON.stringify(tembusanData)); clearDraft('Tembusan'); toggleLoading(false); renderTembusan(); updateDashboardStats(); showToast('✅ Tersimpan','ok');
  },100);
};
window.viewTembusan = function(id) {
  playUISound('pop'); const i=tembusanData.find(x=>x.id==id); if(!i)return;
  document.getElementById('vt_unit').textContent=i.unit; document.getElementById('vt_no').textContent=i.no; document.getElementById('vt_tgl').textContent=formatDate(i.tgl); document.getElementById('vt_jenis').textContent=i.j; document.getElementById('vt_to').textContent=i.to; document.getElementById('vt_hl').textContent=i.hl;
  const bl=document.getElementById('vt_lamp_btn'), ll=document.getElementById('vt_lamp_link'); if(i.fi_url){bl.style.display='block';ll.href=i.fi_url;}else bl.style.display='none';
  document.getElementById('btnShareTTop')?.setAttribute('onclick',`shareDriveLink('${i.fi_url||''}')`); document.getElementById('modViewTembusan').classList.add('op'); if(window.lucide)lucide.createIcons();
};

// --- ARSIP ---
window.renderArsip = function() {
  let d=[...arsipData]; const q=(document.querySelector('#pg-arsip .sri')?.value||'').toLowerCase(), k=document.getElementById('f_a_kat')?.value||'', strt=document.getElementById('f_a_start')?.value||'', end=document.getElementById('f_a_end')?.value||'';
  if(q) d=d.filter(x=>x.no.toLowerCase().includes(q)||x.hl.toLowerCase().includes(q)); if(k) d=d.filter(x=>x.kat===k); if(strt) d=d.filter(x=>x.tgl>=strt); if(end) d=d.filter(x=>x.tgl<=end);
  const t=d.length, sI=(currentPageArsip-1)*itemsPerPage, pd=d.slice(sI,sI+itemsPerPage), ct=document.getElementById('arsipCt'), tb=document.getElementById('arsipTb');
  if(ct)ct.textContent=`Total ${t} Data`;
  if(tb){ if(pd.length===0)tb.innerHTML=`<tr><td colspan="7"><div class="empty-state-wrap"><img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/File%20cabinet/3D/file_cabinet_3d.png" class="empty-state-img"><div class="empty-state-t">Data Kosong</div></div></td></tr>`;
  else tb.innerHTML=pd.map((x,i)=>`<tr><td style="color:var(--tm)">${sI+i+1}</td><td><strong>${escapeHTML(x.no)}</strong></td><td>${formatDate(x.tgl)}</td><td><span class="bdg ${x.kat==='Surat Masuk'?'bpr':'bo'}"><i data-lucide="folder" class="lucide-sm"></i> ${x.kat}</span></td><td class="text-wrap">${escapeHTML(x.hl)}</td><td>${x.fi_url?`<a href="${x.fi_url}" target="_blank" class="btn bg2 bxs" style="color:var(--a1)"><i data-lucide="cloud" class="lucide-sm"></i> Drive</a>`:'<span style="font-size:11px;color:var(--tm)">Tidak ada file</span>'}</td><td style="text-align:right;"><div style="display:inline-flex;gap:8px;"><button class="btn btn-act-view" onclick="shareDriveLink('${x.fi_url||''}')"><i data-lucide="share-2" class="lucide-sm"></i></button>${currentUser&&currentUser.role==='admin'?`<button class="btn btn-act-del" onclick="confirmDelete('Arsip','${x.id}')"><i data-lucide="trash-2" class="lucide-sm"></i></button>`:''}</div></td></tr>`).join(''); }
  renderPagination('arsipPg',t,currentPageArsip,'arsip'); if(window.lucide)setTimeout(()=>lucide.createIcons(),50);
};
window.filterArsip = function(){currentPageArsip=1;renderArsip();};
window.saveArsip = async function() {
  const ts=document.getElementById('a_tgl').value, k=document.getElementById('a_kat').value, n=document.getElementById('a_no').value.trim(), h=document.getElementById('a_hl').value.trim();
  if(!ts||!k||!h||!n)return showToast('⚠️ Wajib diisi','error');
  closeModal('modArsip'); toggleLoading(true,'Menyimpan...',true);
  setTimeout(async()=>{
    const fi=document.getElementById('a_f'), fn=fi.files[0]?generateFilename(ts,`${safeName(k)}_${safeName(h)}`,'',fi.files[0].name):'';
    const nd={id:Date.now(), no:n, tgl:ts, kat:k, hl:h, lok:'Arsip Digital', fi:fn, fi_data:fi.files[0]?fi.getAttribute('data-base64'):''};
    const rd=await dbQuery('save','Arsip',nd); arsipData.unshift(rd||nd); recordLog('CREATE','Arsip',`Simpan: ${h}`); clearDraft('Arsip'); toggleLoading(false); renderArsip(); showToast('✅ Tersimpan','ok');
  },100);
};

// --- SETTINGS (ADMIN) ---
window.renderUserSettings = function() {
  const c=document.getElementById('userListContainer'); if(!c)return; let h='';
  for(const[uId,uData] of Object.entries(storedUsers)){ if(uId==='admin'||uId==='pimpinan')continue; h+=`<div class="bdg-list-item"><div class="bdg-list-text" style="width:120px">${escapeHTML(uData.name)}</div><div style="font-size:11px; color:var(--tm); flex:1">Pass: <strong style="color:var(--tp); letter-spacing:2px">••••••</strong></div><button class="btn bg2 bxs" onclick="openModalUser('${uId}')" style="padding:0; width:28px; height:28px;"><i data-lucide="edit-2" style="width:14px; height:14px;"></i></button></div>`; }
  c.innerHTML=h; if(window.lucide)lucide.createIcons();
};
window.openModalUser = function(uId) { playUISound('pop'); editUserTarget=uId; document.getElementById('resetUserTarget').textContent=storedUsers[uId].name; document.getElementById('new_password_input').value=''; document.getElementById('modUser').classList.add('op'); };
window.saveNewPassword = function() { const np=document.getElementById('new_password_input').value.trim(); if(!np||np.length<4)return showToast('⚠️ Min 4 karakter','error'); storedUsers[editUserTarget].pass=btoa(np); localStorage.setItem('ea-users',JSON.stringify(storedUsers)); showToast('✅ Update sandi sukses!','ok'); recordLog('UPDATE','Sistem',`Update sandi unit: ${storedUsers[editUserTarget].name}`); closeModal('modUser'); renderUserSettings(); };
window.renderBidangSettings = function() { const c=document.getElementById('bidangListContainer'); if(!c)return; if(bidangData.length===0)return c.innerHTML=`<div style="text-align:center; padding:20px; color:var(--tm); font-size:13px;">Belum ada bidang</div>`; c.innerHTML=bidangData.map(b=>`<div class="bdg-list-item"><div class="bdg-list-text"><span class="bdg-list-code">${escapeHTML(b.code)}</span> ${escapeHTML(b.name)}</div><div style="display:flex; gap:6px;"><button class="btn bg2 bxs" onclick="openModalBidang('edit', '${b.code}')" style="padding:0; width:28px; height:28px;"><i data-lucide="edit-2" style="width:14px; height:14px;"></i></button><button class="btn bd2 bxs" onclick="deleteBidang('${b.code}')" style="padding:0; width:28px; height:28px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></div></div>`).join(''); if(window.lucide)lucide.createIcons(); };
window.populateBidangDropdown = function() { const s=document.getElementById('sk_bdg'); if(!s)return; s.innerHTML='<option value="">Pilih Bidang</option>'+bidangData.map(b=>`<option value="${b.code}">${b.code} - ${escapeHTML(b.name)}</option>`).join(''); };
window.openModalBidang = function(md, cd) { playUISound('pop'); editBidangModeCode=null; document.getElementById('bdg_code').value=''; document.getElementById('bdg_name').value=''; if(md==='edit'){ editBidangModeCode=cd; const b=bidangData.find(x=>x.code==cd); if(b){ document.getElementById('modBdgT').innerHTML='<i data-lucide="edit-3"></i> Edit Bidang'; document.getElementById('bdg_code').value=b.code; document.getElementById('bdg_name').value=b.name; } } else document.getElementById('modBdgT').innerHTML='<i data-lucide="folder-plus"></i> Tambah Bidang'; document.getElementById('modBidang').classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.saveBidang = function() { let c=document.getElementById('bdg_code').value.trim(), n=document.getElementById('bdg_name').value.trim(); if(!c||!n)return showToast('⚠️ Wajib diisi!','error'); c=c.padStart(2,'0'); if(editBidangModeCode){ const idx=bidangData.findIndex(x=>x.code==editBidangModeCode); if(idx>-1){bidangData[idx]={code:c,name:n};showToast('✅ Diperbarui','ok');} } else { if(bidangData.find(x=>x.code==c))return showToast('⚠️ Kode sudah ada!','error'); bidangData.push({code:c,name:n}); bidangData.sort((a,b)=>parseInt(a.code)-parseInt(b.code)); showToast('✅ Ditambahkan','ok'); } localStorage.setItem('ea-bidang',JSON.stringify(bidangData)); closeModal('modBidang'); renderBidangSettings(); };
window.deleteBidang = function(cd) { playUISound('pop'); if(!confirm(`Hapus kode ${cd}?`))return; bidangData=bidangData.filter(x=>x.code!=cd); localStorage.setItem('ea-bidang',JSON.stringify(bidangData)); showToast('🗑️ Dihapus','info'); renderBidangSettings(); };
window.renderPejabatSettings = function() { const c=document.getElementById('pejabatListContainer'); if(!c)return; if(pejabatData.length===0)return c.innerHTML=`<div style="text-align:center; padding:20px; color:var(--tm); font-size:13px;">Belum ada pejabat</div>`; c.innerHTML=pejabatData.map(p=>`<div class="bdg-list-item"><div class="bdg-list-text" style="flex:1; white-space:normal; overflow:visible; display:flex; align-items:center; gap:8px;">${p.isDefault?'<i data-lucide="star" style="color:var(--a1); fill:var(--a1); width:16px; height:16px;"></i>':''}${escapeHTML(p.nama)}</div><div style="display:flex; gap:6px;">${!p.isDefault?`<button class="btn bg2 bxs" onclick="setDefaultPejabat('${p.id}')" style="padding:0; width:28px; height:28px;"><i data-lucide="star" style="width:14px; height:14px;"></i></button>`:''}<button class="btn bg2 bxs" onclick="openModalPejabat('edit', '${p.id}')" style="padding:0; width:28px; height:28px;"><i data-lucide="edit-2" style="width:14px; height:14px;"></i></button><button class="btn bd2 bxs" onclick="deletePejabat('${p.id}')" style="padding:0; width:28px; height:28px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></div></div>`).join(''); if(window.lucide)lucide.createIcons(); };
window.setDefaultPejabat = function(id) { playUISound('pop'); pejabatData.forEach(p=>p.isDefault=(p.id==id)); localStorage.setItem('ea-pejabat',JSON.stringify(pejabatData)); renderPejabatSettings(); showToast('⭐ Diatur Default','ok'); };
window.populatePejabatDropdown = function() { const s=document.getElementById('sk_ttd'); if(!s)return; s.innerHTML='<option value="">Pilih TTD</option>'+pejabatData.map(p=>`<option value="${escapeHTML(p.nama)}">${escapeHTML(p.nama)}</option>`).join(''); };
window.openModalPejabat = function(md, id) { playUISound('pop'); editPejabatModeId=null; document.getElementById('pejabat_name').value=''; if(md==='edit'){ editPejabatModeId=id; const p=pejabatData.find(x=>x.id==id); if(p){ document.getElementById('modPejabatT').innerHTML='<i data-lucide="edit-3"></i> Edit Pejabat'; document.getElementById('pejabat_name').value=p.nama; } } else document.getElementById('modPejabatT').innerHTML='<i data-lucide="user-plus"></i> Tambah Pejabat'; document.getElementById('modPejabat').classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.savePejabat = function() { let n=document.getElementById('pejabat_name').value.trim(); if(!n)return showToast('⚠️ Wajib diisi!','error'); if(editPejabatModeId){ const idx=pejabatData.findIndex(x=>x.id==editPejabatModeId); if(idx>-1){pejabatData[idx].nama=n;showToast('✅ Diperbarui','ok');} } else { if(pejabatData.find(x=>x.nama.toLowerCase()===n.toLowerCase()))return showToast('⚠️ Sudah ada!','error'); pejabatData.push({id:Date.now().toString(),nama:n,isDefault:pejabatData.length===0}); showToast('✅ Ditambahkan','ok'); } localStorage.setItem('ea-pejabat',JSON.stringify(pejabatData)); closeModal('modPejabat'); renderPejabatSettings(); };
window.deletePejabat = function(id) { playUISound('pop'); if(!confirm(`Hapus data pejabat?`))return; pejabatData=pejabatData.filter(x=>x.id!=id); localStorage.setItem('ea-pejabat',JSON.stringify(pejabatData)); showToast('🗑️ Dihapus','info'); renderPejabatSettings(); };
window.renderKategoriSettings = function() { const c=document.getElementById('kategoriListContainer'); if(!c)return; if(kategoriData.length===0)return c.innerHTML=`<div style="text-align:center; padding:20px; color:var(--tm); font-size:13px;">Belum ada kategori</div>`; c.innerHTML=kategoriData.map(p=>`<div class="bdg-list-item"><div class="bdg-list-text" style="flex:1;"><i data-lucide="folder" class="lucide-sm" style="color:var(--tm)"></i> ${escapeHTML(p.nama)}</div><div style="display:flex; gap:6px;"><button class="btn bg2 bxs" onclick="openModalKategori('edit', '${p.id}')" style="padding:0; width:28px; height:28px;"><i data-lucide="edit-2" style="width:14px; height:14px;"></i></button><button class="btn bd2 bxs" onclick="deleteKategori('${p.id}')" style="padding:0; width:28px; height:28px;"><i data-lucide="trash-2" style="width:14px; height:14px;"></i></button></div></div>`).join(''); if(window.lucide)lucide.createIcons(); };
window.populateKategoriDropdown = function() { const sA=document.getElementById('a_kat'), sF=document.getElementById('f_a_kat'); let o1='<option value="">Semua</option>', o2='<option value="">Pilih</option>'; kategoriData.forEach(k=>{ o1+=`<option value="${escapeHTML(k.nama)}">${escapeHTML(k.nama)}</option>`; o2+=`<option value="${escapeHTML(k.nama)}">${escapeHTML(k.nama)}</option>`; }); if(sF)sF.innerHTML=o1; if(sA)sA.innerHTML=o2; };
window.openModalKategori = function(md, id) { playUISound('pop'); editKategoriModeId=null; document.getElementById('kategori_name').value=''; if(md==='edit'){ editKategoriModeId=id; const p=kategoriData.find(x=>x.id==id); if(p){ document.getElementById('modKategoriT').innerHTML='<i data-lucide="edit-3"></i> Edit'; document.getElementById('kategori_name').value=p.nama; } } else document.getElementById('modKategoriT').innerHTML='<i data-lucide="folder-plus"></i> Tambah'; document.getElementById('modKategori').classList.add('op'); if(window.lucide)lucide.createIcons(); };
window.saveKategori = function() { let n=document.getElementById('kategori_name').value.trim(); if(!n)return showToast('⚠️ Wajib diisi!','error'); if(editKategoriModeId){ const idx=kategoriData.findIndex(x=>x.id==editKategoriModeId); if(idx>-1){kategoriData[idx].nama=n;showToast('✅ Diperbarui','ok');} } else { if(kategoriData.find(x=>x.nama.toLowerCase()===n.toLowerCase()))return showToast('⚠️ Sudah ada!','error'); kategoriData.push({id:Date.now().toString(),nama:n}); showToast('✅ Ditambahkan','ok'); } localStorage.setItem('ea-kategori',JSON.stringify(kategoriData)); closeModal('modKategori'); renderKategoriSettings(); populateKategoriDropdown(); };
window.deleteKategori = function(id) { playUISound('pop'); if(!confirm(`Hapus kategori?`))return; kategoriData=kategoriData.filter(x=>x.id!=id); localStorage.setItem('ea-kategori',JSON.stringify(kategoriData)); showToast('🗑️ Dihapus','info'); renderKategoriSettings(); populateKategoriDropdown(); };

window.printRekap = function(tipe) {
  let title = "", headers = [], rows = "", data = [];
  if(tipe === 'disposisi') { title = "Rekapitulasi Disposisi"; headers = ['No', 'No. Surat', 'Tanggal', 'Pengirim', 'Perihal', 'Status']; data = disposisiData; rows = data.map((d,i) => `<tr><td>${i+1}</td><td>${d.no}</td><td>${formatDate(d.tgl_s)}</td><td>${d.fr}</td><td>${d.hl}</td><td>${d.st}</td></tr>`).join(''); }
  else if (tipe === 'sk') { title = "Rekap Surat Keluar"; headers = ['No', 'No. Surat', 'Tanggal', 'Tujuan', 'Perihal', 'Status']; data = suratKeluarData; rows = data.map((d,i) => `<tr><td>${i+1}</td><td>${d.no}</td><td>${formatDate(d.tgl)}</td><td>${d.to}</td><td>${d.hl}</td><td>${d.st}</td></tr>`).join(''); }
  else if (tipe === 'arsip') { title = "Rekap Arsip"; headers = ['No', 'No. Surat', 'Tanggal', 'Kategori', 'Perihal']; data = arsipData; rows = data.map((d,i) => `<tr><td>${i+1}</td><td>${d.no}</td><td>${formatDate(d.tgl)}</td><td>${d.kat}</td><td>${d.hl}</td></tr>`).join(''); }
  else if (tipe === 'tembusan') { title = "Rekap Tembusan"; headers = ['No', 'No. Surat', 'Tanggal', 'Unit', 'Tujuan', 'Perihal']; data = (currentUser && currentUser.role !== 'admin' && currentUser.role !== 'pimpinan') ? tembusanData.filter(x => x.unit === currentUser.name) : tembusanData; rows = data.map((d,i) => `<tr><td>${i+1}</td><td>${d.no}</td><td>${formatDate(d.tgl)}</td><td>${d.unit}</td><td>${d.to}</td><td>${d.hl}</td></tr>`).join(''); }
  if(data.length === 0) return showToast('⚠️ Data kosong', 'error');
  const html = `<div style="text-align:center; margin-bottom:20px;"><h2>${title}</h2><p>LPIS Malang</p></div><table style="width:100%; border-collapse:collapse; font-size:12px;"><thead><tr>${headers.map(h => `<th style="border:1px solid #000; padding:8px; background:#f4f4f4; text-align:left;">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
  document.getElementById('printRekapArea').innerHTML = html; document.body.classList.add('print-rekap-mode'); setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('print-rekap-mode'), 500); }, 300);
};

// --- OMNI SEARCH & INIT ---
window.openOmniSearch = function() { playUISound('pop'); const input=document.getElementById('omniInput'), res=document.getElementById('omniResults'); if(input)input.value=''; if(res)res.innerHTML='<div style="padding:20px; text-align:center; color:var(--tm); font-size:13px;">Ketik minimal 2 karakter...</div>'; document.getElementById('modOmniSearch').classList.add('op'); setTimeout(()=>{if(input)input.focus();},100); };
window.runOmniSearch = function(q) {
  const rc=document.getElementById('omniResults'); if(!q||q.length<2)return rc.innerHTML='<div style="padding:20px; text-align:center; color:var(--tm); font-size:13px;">Ketik minimal 2 karakter...</div>';
  q=q.toLowerCase(); let r=[];
  disposisiData.forEach(d=>{if((d.no||'').toLowerCase().includes(q)||(d.hl||'').toLowerCase().includes(q)||(d.fr||'').toLowerCase().includes(q))r.push({t:'Disposisi',i:'inbox',ti:d.no,ds:d.hl,a:`goToPage('disposisi'); viewDisposisi('${d.id}'); closeModal('modOmniSearch');`});});
  suratKeluarData.forEach(d=>{if((d.no||'').toLowerCase().includes(q)||(d.hl||'').toLowerCase().includes(q)||(d.to||'').toLowerCase().includes(q))r.push({t:'Surat Keluar',i:'send',ti:d.no,ds:d.hl,a:`goToPage('sk'); viewSuratKeluar('${d.id}'); closeModal('modOmniSearch');`});});
  tembusanData.forEach(d=>{if((d.no||'').toLowerCase().includes(q)||(d.hl||'').toLowerCase().includes(q))r.push({t:'Tembusan',i:'copy',ti:d.no,ds:d.hl,a:`goToPage('tembusan'); viewTembusan('${d.id}'); closeModal('modOmniSearch');`});});
  arsipData.forEach(d=>{if((d.no||'').toLowerCase().includes(q)||(d.hl||'').toLowerCase().includes(q))r.push({t:'Arsip',i:'archive',ti:d.no,ds:d.hl,a:`goToPage('arsip'); shareDriveLink('${d.fi_url||''}'); closeModal('modOmniSearch');`});});
  if(r.length===0)rc.innerHTML='<div style="padding:20px; text-align:center; color:var(--tm); font-size:13px;">Tidak ada hasil.</div>';
  else { rc.innerHTML=r.slice(0,15).map(x=>`<div class="bdg-list-item" style="cursor:pointer; margin-bottom:8px;" onclick="${x.a}"><div style="display:flex; align-items:center; gap:12px;"><div style="background:var(--bg); padding:8px; border-radius:10px; color:var(--a1);"><i data-lucide="${x.i}" class="lucide-sm"></i></div><div><div style="font-size:13px; font-weight:700; color:var(--tp); margin-bottom:2px;">${escapeHTML(x.ti)} <span style="font-size:10px; padding:2px 6px; background:var(--a1); color:#fff; border-radius:4px; margin-left:6px;">${x.t}</span></div><div style="font-size:12px; color:var(--ts);">${escapeHTML(x.ds)}</div></div></div></div>`).join(''); if(window.lucide)lucide.createIcons(); }
};

document.addEventListener('keydown', e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openOmniSearch();}});
document.addEventListener('DOMContentLoaded', () => {
  const th=localStorage.getItem('ea-th')||'light'; document.documentElement.setAttribute('data-theme',th);
  const a=localStorage.getItem('ea-auth'); if(a){currentUser=JSON.parse(a);applyLoginState();} else {document.getElementById('loginScreen').style.display='flex';document.getElementById('loginScreen').style.opacity='1';document.getElementById('appShell').classList.remove('visible');}
  initAutoSave();
});
window.exportCSV = function(type) {
  playUISound('pop'); let c, fn;
  if(type==='disposisi'){ c=['No. Surat,Tanggal Surat,Tanggal Terima,Pengirim,Perihal,Disposisi Ke,Status,File']; disposisiData.forEach(d=>c.push(`${escapeCSVField(d.no)},${escapeCSVField(d.tgl_s)},${escapeCSVField(d.tgl_t)},${escapeCSVField(d.fr)},${escapeCSVField(d.hl)},${escapeCSVField(d.to)},${escapeCSVField(cleanSt(d.st))},${escapeCSVField(d.fi_url)}`)); fn='data_disposisi.csv'; }
  else if(type==='sk'){ c=['No. Surat,Tanggal,Bidang,Tujuan,Perihal,Jenis,TTD,Status,File']; suratKeluarData.forEach(d=>c.push(`${escapeCSVField(d.no)},${escapeCSVField(d.tgl)},${escapeCSVField(d.bdg)},${escapeCSVField(d.to)},${escapeCSVField(d.hl)},${escapeCSVField(d.j)},${escapeCSVField(d.ttd)},${escapeCSVField(cleanSt(d.st))},${escapeCSVField(d.fi_acc_url)}`)); fn='data_surat_keluar.csv'; }
  else if(type==='arsip'){ c=['No. Surat,Tanggal,Kategori,Perihal,Lokasi Arsip,File']; arsipData.forEach(d=>c.push(`${escapeCSVField(d.no)},${escapeCSVField(d.tgl)},${escapeCSVField(d.kat)},${escapeCSVField(d.hl)},${escapeCSVField(d.lok)},${escapeCSVField(d.fi_url)}`)); fn='data_arsip.csv'; }
  const b=new Blob([c.join('\n')],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(b), a=document.createElement('a'); a.href=url; a.download=fn; a.click(); URL.revokeObjectURL(url); showToast('📥 Berhasil Mengunduh Laporan','info');
};
