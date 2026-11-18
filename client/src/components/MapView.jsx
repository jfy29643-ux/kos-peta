import { useEffect, useRef } from 'react';
import L from 'leaflet';

const ikon = (warna) =>
  L.divIcon({ className: '', html: `<div class="pin" style="background:${warna}"></div>`, iconSize: [22, 22], iconAnchor: [11, 22], popupAnchor: [0, -20] });

/**
 * markers: [{ lat, lng, warna, popup?: { html, onDetail } }]  (harus di-memo di parent)
 * acuan: { lat, lng } | null, radiusKm: number
 */
export default function MapView({ markers = [], acuan = null, radiusKm = 0, onMapClick, center = [-6.3, 107.15], zoom = 11, height = 480, fit = false }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const acuanLayer = useRef(null);
  const klik = useRef(onMapClick);
  const sudahFit = useRef(false);
  klik.current = onMapClick;

  useEffect(() => {
    const m = L.map(el.current).setView(center, zoom);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    acuanLayer.current = L.layerGroup().addTo(m);
    m.on('click', (e) => klik.current?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    return () => m.remove();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    layer.current.clearLayers();
    markers.forEach((k) => {
      const mk = L.marker([k.lat, k.lng], { icon: ikon(k.warna) });
      if (k.popup) {
        const d = document.createElement('div');
        d.className = 'pop';
        d.innerHTML = k.popup.html;
        d.querySelector('[data-detail]')?.addEventListener('click', () => k.popup.onDetail());
        mk.bindPopup(d);
      }
      mk.addTo(layer.current);
    });
    if (fit && !sudahFit.current && markers.length) {
      map.current.fitBounds(markers.map((k) => [k.lat, k.lng]), { padding: [40, 40], maxZoom: 15 });
      sudahFit.current = true;
    }
  }, [markers, fit]);

  useEffect(() => {
    const g = acuanLayer.current;
    g.clearLayers();
    if (!acuan) return;
    L.marker([acuan.lat, acuan.lng], {
      icon: L.divIcon({ className: '', html: '<div class="pin acuan"></div>', iconSize: [22, 22], iconAnchor: [11, 22] }),
    }).bindTooltip('Titik acuan').addTo(g);
    if (radiusKm > 0) L.circle([acuan.lat, acuan.lng], { radius: radiusKm * 1000, color: '#2563eb', weight: 1, fillOpacity: 0.07 }).addTo(g);
  }, [acuan, radiusKm]);

  useEffect(() => {
    if (acuan) map.current.setView([acuan.lat, acuan.lng], Math.max(map.current.getZoom(), 13));
    // eslint-disable-next-line
  }, [acuan]);

  return <div ref={el} className={'map' + (onMapClick ? ' klik' : '')} style={{ height }} />;
}
