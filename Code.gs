/**
 * SPPD Web App - UPTD Puskesmas Tanjung Puri
 */
const CONFIG = {
  APP_NAME: 'SPPD UPTD Puskesmas Tanjung Puri',
  TZ: 'Asia/Jakarta',
  MAIN_SHEET_ID: SpreadsheetApp.getActive().getId(),
  PEGAWAI_SHEET_ID: '1vQBjRbWOH3IpODEuX6lnJum0M0Jcnh8Eo-kKEHz8k4o',
  ABSENSI_SHEET_ID: '1s1zVQStEiZ9va2HGH-LTOZ6blW-OvajopNjgfEv3EsE',
  LOCKED_ABSENSI: ['SAKIT', 'IZIN', 'CUTI', 'ALPA']
};

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate().setTitle(CONFIG.APP_NAME).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }

function getInitialData() {
  validSession();
  return {
    profile: getSessionUser(),
    dashboard: getDashboardStats(),
    pegawai: getPegawai(),
    anggaran: getAnggaranTree(),
    settings: getSettings()
  };
}

function login(username, password) {
  const sh = getSheet_('Users');
  const rows = toObjects_(sh.getDataRange().getValues());
  const user = rows.find(r => String(r.username || '').toLowerCase() === String(username).toLowerCase() && String(r.password) === String(password));
  if (!user) return { ok: false, message: 'Username/password salah.' };
  const token = Utilities.getUuid();
  PropertiesService.getUserProperties().setProperties({ session_token: token, session_user: JSON.stringify({ username: user.username, nama: user.nama || user.username, role: user.role || 'admin' }) });
  return { ok: true, message: 'Login berhasil', token };
}
function logout(){ PropertiesService.getUserProperties().deleteAllProperties(); return {ok:true}; }
function validSession(){ const t=PropertiesService.getUserProperties().getProperty('session_token'); if(!t) throw new Error('Sesi berakhir, silakan login ulang.'); return true; }
function getSessionUser(){ const raw=PropertiesService.getUserProperties().getProperty('session_user'); return raw?JSON.parse(raw):null; }

function getDashboardStats() {
  return {
    totalPegawai: getPegawai().length,
    totalSPT: countSheetRows_('SPT'),
    totalSPPD: countSheetRows_('SPPD'),
    perjalananAktif: toObjects_(getSheet_('Monitoring').getDataRange().getValues()).filter(r => r.status_perjalanan === 'Berjalan').length,
    statusChart: getStatusChart_()
  };
}

function getPegawai() {
  const ss = SpreadsheetApp.openById(CONFIG.PEGAWAI_SHEET_ID);
  const sh = ss.getSheets()[0];
  return toObjects_(sh.getDataRange().getValues()).map(safeObj_);
}

function searchPegawai(keyword, status){
  validSession();
  keyword = String(keyword || '').toLowerCase();
  return getPegawai().filter(p => (!status || p.status === status) && (!keyword || Object.values(p).join(' ').toLowerCase().includes(keyword)));
}

function checkAbsensiForPegawai(idQr, tanggal){
  validSession();
  const ss = SpreadsheetApp.openById(CONFIG.ABSENSI_SHEET_ID);
  const sh = ss.getSheetByName('Absensi');
  const vals = sh.getDataRange().getValues();
  const t = Utilities.formatDate(new Date(tanggal), CONFIG.TZ, 'yyyy-MM-dd');
  for (let i=1;i<vals.length;i++) {
    const rowDate = Utilities.formatDate(new Date(vals[i][1]), CONFIG.TZ, 'yyyy-MM-dd');
    if (String(vals[i][4]) === String(idQr) && rowDate === t) {
      const status = String(vals[i][10] || '').toUpperCase();
      return {
        found: true,
        idQr,
        tanggal: t,
        status,
        blocked: CONFIG.LOCKED_ABSENSI.includes(status),
        needConfirm: status === 'TL',
        message: CONFIG.LOCKED_ABSENSI.includes(status)
          ? `Pegawai tidak dapat digunakan karena berstatus ${status} pada tanggal ${t}`
          : (status === 'TL' ? 'Pegawai ini berstatus TL, perlu konfirmasi' : 'Pegawai dapat digunakan')
      };
    }
  }
  return { found:false, idQr, tanggal:t, status:'TIDAK_ADA_DATA', blocked:false, needConfirm:true, message:'Data absensi tidak ada, perlu konfirmasi' };
}

function logAktivitas(modul, aksi, data){
  const sh = getSheet_('Log_Aktivitas');
  sh.appendRow([new Date(), (getSessionUser()||{}).username || 'unknown', modul, aksi, JSON.stringify(data||{})]);
  return true;
}

function saveSPT(payload){
  validSession();
  payload.lama_hari = diffDays_(payload.tanggal_berangkat, payload.tanggal_kembali);
  if (!payload.nomor_spt) payload.nomor_spt = nextNumber_('SPT','SPT-');
  upsert_('SPT','nomor_spt',payload.nomor_spt,payload);
  (payload.pegawai_ids||[]).forEach(id => upsert_('SPT_Detail','id_detail',Utilities.getUuid(),{id_detail:Utilities.getUuid(),nomor_spt:payload.nomor_spt,id_qr:id}));
  logAktivitas('SPT','CREATE',payload);
  return {ok:true,nomor_spt:payload.nomor_spt};
}

function generateSPPDFromSPT(nomorSpt, pejabat, rute){
  validSession();
  const spt = findByKey_('SPT','nomor_spt',nomorSpt);
  if(!spt) throw new Error('SPT tidak ditemukan');
  const nomor_sppd = nextNumber_('SPPD','SPD-');
  const data = {
    nomor_sppd, nomor_spt:nomorSpt, pejabat_pemberi_tugas:pejabat||'-', tujuan:spt.tujuan||'-', lama_hari:spt.lama_hari||0,
    tanggal:new Date(), rute:rute||'-', status_perjalanan:'Direncanakan'
  };
  upsert_('SPPD','nomor_sppd',nomor_sppd,data);
  logAktivitas('SPPD','CREATE',data);
  return {ok:true,nomor_sppd};
}

function saveLaporan(payload){ validSession(); if(!payload.id_laporan) payload.id_laporan=Utilities.getUuid(); upsert_('Laporan','id_laporan',payload.id_laporan,payload); logAktivitas('Laporan','SAVE',payload); return {ok:true,id:payload.id_laporan}; }

function hitungKwitansi(payload){
  const h = getHargaStandar_(payload.kode_lokasi || 'default');
  const hari = Number(payload.lama_hari || 1);
  const total = (h.penginapan*hari)+(h.makan*hari)+(h.uang_saku*hari)+(h.transport||0);
  return { ...h, total, terbilang: terbilang_(Math.round(total)) + ' rupiah' };
}
function saveKwitansi(payload){ validSession(); const calc=hitungKwitansi(payload); const data={...payload,...calc,id_kwitansi:payload.id_kwitansi||Utilities.getUuid()}; upsert_('Kwitansi','id_kwitansi',data.id_kwitansi,data); logAktivitas('Kwitansi','SAVE',data); return {ok:true,data}; }

function getMonitoring(filter){
  validSession();
  let rows = toObjects_(getSheet_('Monitoring').getDataRange().getValues()).map(safeObj_);
  if(filter){
    if(filter.pegawai) rows = rows.filter(r=>r.id_qr===filter.pegawai);
    if(filter.status) rows = rows.filter(r=>r.status_perjalanan===filter.status);
  }
  return { rows, statistik: statistikPerPegawai_(rows), warning: rows.filter(r=>Number(r.jumlah_perjalanan||0)>4) };
}

function getAnggaranTree(){ return toObjects_(getSheet_('Anggaran').getDataRange().getValues()).map(safeObj_); }
function getSubKegiatan(kegiatan){ return getAnggaranTree().filter(r=>r.kegiatan===kegiatan); }
function getObjekBelanja(kegiatan, sub){ return getAnggaranTree().filter(r=>r.kegiatan===kegiatan && r.sub_kegiatan===sub); }

function saveLogo(base64, mimeType, fileName){
  validSession();
  const bytes = Utilities.base64Decode(base64.split(',').pop());
  const file = DriveApp.createFile(bytes, fileName || 'logo-instansi', mimeType || 'image/png');
  const logoUrl = file.getDownloadUrl();
  upsert_('Setting','key','logo',{key:'logo',value:logoUrl,file_id:file.getId()});
  return {ok:true,url:logoUrl};
}
function deleteLogo(){ const rec=findByKey_('Setting','key','logo'); if(rec&&rec.file_id){ try{DriveApp.getFileById(rec.file_id).setTrashed(true);}catch(e){} } upsert_('Setting','key','logo',{key:'logo',value:'',file_id:''}); return {ok:true}; }
function getSettings(){ return {logo:(findByKey_('Setting','key','logo')||{}).value || ''}; }

function exportPdf(type,id){
  validSession();
  const templateMap = {SPT:'TemplateSPT',SPPD:'TemplateSPPD',LAPORAN:'TemplateLaporan',KWITANSI:'TemplateKwitansi'};
  const html = HtmlService.createTemplateFromFile(templateMap[type]);
  html.data = type==='SPT'?findByKey_('SPT','nomor_spt',id): type==='SPPD'?findByKey_('SPPD','nomor_sppd',id): type==='LAPORAN'?findByKey_('Laporan','id_laporan',id):findByKey_('Kwitansi','id_kwitansi',id);
  const blob = html.evaluate().getBlob().getAs('application/pdf').setName(type+'-'+id+'.pdf');
  const f=DriveApp.createFile(blob);
  return {ok:true,url:f.getUrl()};
}

function getSheet_(name){ const sh=SpreadsheetApp.openById(CONFIG.MAIN_SHEET_ID).getSheetByName(name); if(!sh) throw new Error('Sheet '+name+' tidak ditemukan'); return sh; }
function toObjects_(values){ if(!values.length) return []; const h=values[0].map(x=>String(x).trim().toLowerCase()); return values.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]]))); }
function safeObj_(o){ Object.keys(o).forEach(k=>{ if(o[k]===''||o[k]===null||typeof o[k]==='undefined') o[k]='-';}); return o; }
function upsert_(sheet,key,val,obj){ const sh=getSheet_(sheet); const vals=sh.getDataRange().getValues(); const hdr=vals[0].map(x=>String(x).toLowerCase()); const idx=hdr.indexOf(String(key).toLowerCase()); if(idx<0) throw new Error('Kolom key tidak ditemukan: '+key); const row=vals.findIndex((r,i)=>i>0&&String(r[idx])===String(val)); const out=hdr.map(h=>obj[h]||obj[h.toLowerCase()]||'-'); if(row>0) sh.getRange(row+1,1,1,hdr.length).setValues([out]); else sh.appendRow(out); }
function findByKey_(sheet,key,val){ return toObjects_(getSheet_(sheet).getDataRange().getValues()).find(r=>String(r[key])===String(val)); }
function countSheetRows_(name){ const lr=getSheet_(name).getLastRow(); return Math.max(0,lr-1); }
function nextNumber_(sheet,prefix){ return prefix+Utilities.formatDate(new Date(),CONFIG.TZ,'yyyyMMdd')+'-'+(countSheetRows_(sheet)+1); }
function diffDays_(a,b){ const d1=new Date(a),d2=new Date(b); return Math.max(1,Math.floor((d2-d1)/86400000)+1); }
function getStatusChart_(){ const rows=toObjects_(getSheet_('Monitoring').getDataRange().getValues()); const map={Direncanakan:0,Berjalan:0,Selesai:0,Dibatalkan:0}; rows.forEach(r=>{ if(map[r.status_perjalanan]!==undefined) map[r.status_perjalanan]++;}); return map; }
function getHargaStandar_(kode){ const r=toObjects_(getSheet_('Standar_Harga').getDataRange().getValues()).find(x=>String(x.kode_lokasi)===String(kode))||{}; return { penginapan:Number(r.penginapan||0), makan:Number(r.makan||0), uang_saku:Number(r.uang_saku||0), transport:Number(r.transport||0)}; }
function statistikPerPegawai_(rows){ const m={}; rows.forEach(r=>{ const id=r.id_qr||'-'; m[id]=(m[id]||0)+1;}); return Object.keys(m).map(k=>({id_qr:k,jumlah:m[k],warning:m[k]>4})); }

function terbilang_(n){
  const s=['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  n=Math.floor(Math.abs(n));
  if(n<12) return s[n];
  if(n<20) return terbilang_(n-10)+' belas';
  if(n<100) return terbilang_(Math.floor(n/10))+' puluh '+terbilang_(n%10);
  if(n<200) return 'seratus '+terbilang_(n-100);
  if(n<1000) return terbilang_(Math.floor(n/100))+' ratus '+terbilang_(n%100);
  if(n<2000) return 'seribu '+terbilang_(n-1000);
  if(n<1000000) return terbilang_(Math.floor(n/1000))+' ribu '+terbilang_(n%1000);
  if(n<1000000000) return terbilang_(Math.floor(n/1000000))+' juta '+terbilang_(n%1000000);
  return terbilang_(Math.floor(n/1000000000))+' miliar '+terbilang_(n%1000000000);
}
