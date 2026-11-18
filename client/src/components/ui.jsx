import { useState } from 'react';
import { label, exportFile } from '../utils.js';

export const Badge = ({ s }) => <span className={'badge b-' + s}>{label(s)}</span>;

export const Stars = ({ n }) =>
  n == null ? <span className="muted">Belum ada rating</span> : (
    <span className="stars">{'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))} <b>{n}</b></span>
  );

export const Pesan = ({ tipe = 'err', children }) => (children ? <div className={'msg ' + tipe}>{children}</div> : null);

export function Modal({ judul, onClose, children, cetak, lebar }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={'modal' + (cetak ? ' print-area' : '')} style={lebar ? { maxWidth: lebar } : null} onClick={(e) => e.stopPropagation()}>
        <div className="modal-h no-print"><h3>{judul}</h3><button className="x" onClick={onClose}>×</button></div>
        {children}
      </div>
    </div>
  );
}

// sumber: { nama_dataset: () => rows }
export function ExportBar({ sumber }) {
  const keys = Object.keys(sumber);
  const [pilih, setPilih] = useState(keys[0]);
  return (
    <div className="row">
      <select value={pilih} onChange={(e) => setPilih(e.target.value)}>
        {keys.map((k) => <option key={k} value={k}>{label(k)}</option>)}
      </select>
      {['pdf', 'xlsx', 'csv'].map((f) => (
        <button key={f} className="btn sm" onClick={() => exportFile('data-' + pilih, sumber[pilih](), f)}>
          {f === 'xlsx' ? 'Excel' : f.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
