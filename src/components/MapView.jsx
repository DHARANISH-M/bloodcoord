import React, { useEffect, useRef } from 'react'

export default function MapView({ center=[20,0], zoom=4, markers=[] }){
  const mapRef = useRef(null)
  useEffect(()=>{
    if(!window.L) return
    const L = window.L
    if(mapRef.current) return
    mapRef.current = L.map('map').setView(center, zoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapRef.current)
  },[])

  useEffect(()=>{
    if(!mapRef.current || !window.L) return
    const L = window.L
    // clear existing
    mapRef.current.eachLayer((layer)=>{ if(layer && layer._url===undefined) mapRef.current.removeLayer(layer) })
    markers.forEach(m=>{
      let markerOptions = {}
      if (m.color) {
        markerOptions.icon = new L.Icon({
          iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${m.color}.png`,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        })
      }
      const marker = L.marker([m.lat,m.lng], markerOptions)
      marker.bindPopup(m.label||'')
      if (m.onClick) {
        marker.on('click', m.onClick)
      }
      marker.addTo(mapRef.current)
    })
    if(markers.length) mapRef.current.setView([markers[0].lat, markers[0].lng], 12)
  },[markers])

  return <div id="map" style={{height: '100%', minHeight: '350px'}} className="rounded-xl shadow-none" />
}
