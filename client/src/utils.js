import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const rupiah = (n) => (n == null ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID'));

export const label = (s) =>
  (s ?? '').split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export function haversineKm(lat1, lon1, lat2, lon2) {
  const r = (x) => (x * Math.PI) / 180;
  const a =
    Math.sin(r(lat2 - lat1) / 2) ** 2 +
    Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(r(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Wilayah diambil dari bagian terakhir alamat (setelah koma terakhir)
export const wilayah = (alamat) => {
  const p = (alamat || '').split(',').map((s) => s.trim()).filter(Boolean);
  return p.length > 1 ? p[p.length - 1] : p[0] || 'Lainnya';
};

export const bulanKey = (iso) => String(iso || '').slice(0, 7);
export const namaBulan = (key) => {
  const [y, m] = key.split('-');
  return new Date(+y, +m - 1, 1).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
};
export const tanggalIndo = (d) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const SAT = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
export function terbilang(n) {
  n = Math.floor(n);
  if (n < 12) return SAT[n];
  if (n < 20) return terbilang(n - 10) + ' belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
  if (n < 200) return 'seratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'seribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
}

// Ekspor / backup: format 'pdf' | 'xlsx' | 'csv'
export function exportFile(nama, rows, format) {
  if (!rows.length) { alert('Tidak ada data untuk diekspor'); return; }
  if (format === 'pdf') {
    const doc = new jsPDF({ orientation: 'landscape' });
    const cols = Object.keys(rows[0]);
    doc.setFontSize(14);
    doc.text(nama, 14, 14);
    autoTable(doc, { startY: 20, head: [cols], body: rows.map((r) => cols.map((c) => String(r[c] ?? ''))), styles: { fontSize: 8 } });
    doc.save(nama + '.pdf');
    return;
  }
  const ws = XLSX.utils.json_to_sheet(rows);
  if (format === 'csv') {
    const blob = new Blob(['\ufeff' + XLSX.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nama + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    return;
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, nama + '.xlsx');
}
