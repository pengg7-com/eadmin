lucide.createIcons();

// --- KONFIGURASI DATABASE API ---
const APP_SCRIPT_URL = "MASUKKAN_URL_GAS_ANDA_DISINI";

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
  if(f.size>5*1024*1024){ showToast('⚠️ Maksimal 5MB!','error'); i.value
