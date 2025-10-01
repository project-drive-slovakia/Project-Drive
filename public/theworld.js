const map = L.map('map', { zoomControl: false }).setView([48.33, 19.67], 13);

L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
  maxZoom: 20,
  attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const username = localStorage.getItem('crewUsername') || 'crew';
let userMarker = null;
let crewMarkers = [];
let tracking = false;
let watchId = null;

// 🔁 Sledovanie polohy a posielanie na server
function startTracking() {
  if (!watchId) {
    watchId = navigator.geolocation.watchPosition((pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // Tvoj marker — biely kruh
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([lat, lon], {
        radius: 10,
        color: 'white',
        fillColor: 'white',
        fillOpacity: 1
      }).addTo(map);

      // Centrovanie len ak tracking je zapnutý
      if (tracking) {
        map.setView([lat, lon], 16);
      }

      // Pošli polohu na server
      fetch('/api/crew-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, lat, lon })
      });
    });
  }
}

// 🔘 Prepínanie centrovania
function centerMap() {
  tracking = !tracking;
  if (!tracking && watchId) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  } else {
    startTracking();
  }
}

// 🧭 Zrušiť centrovanie pri pohybe mapy
map.on('movestart', () => {
  if (tracking) {
    tracking = false;
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
});

// 💬 Chat logika
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

chatInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const msg = chatInput.value.trim();
    if (msg.length > 0) {
      sendMessage(msg);
      chatInput.value = '';
    }
  }
});

function sendMessage(msg) {
  const formatted = { username, message: msg };
  displayMessage(formatted);

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formatted)
  });
}

function fetchMessages() {
  fetch('/api/chat')
    .then(res => res.json())
    .then(data => {
      const existing = Array.from(chatMessages.children).map(el => el.textContent);
      data.forEach(msg => {
        const text = `${msg.username}: ${msg.message}`;
        if (!existing.includes(text)) {
          displayMessage(msg);
        }
      });
    })
    .catch(err => {
      console.error('❌ Chyba pri načítaní správ:', err);
    });
}

function displayMessage({ username, message }) {
  const el = document.createElement('div');
  el.textContent = `${username}: ${message}`;
  el.classList.add('fade-message');
  chatMessages.appendChild(el);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 1000);
  }, 10000);
}

// 🧍‍♂️ Crew-only polohy ostatných členov
function fetchCrewLocations() {
  crewMarkers.forEach(m => map.removeLayer(m));
  crewMarkers = [];

  fetch('/api/crew-locations')
    .then(res => res.json())
    .then(data => {
      data.forEach(({ username: crewName, lat, lon }) => {
        if (crewName !== username) {
          const marker = L.circleMarker([lat, lon], {
            radius: 6,
            color: '#00aaff',
            fillColor: '#00aaff',
            fillOpacity: 0.8
          }).addTo(map);
          crewMarkers.push(marker);
        }
      });
    });
}

// 🔁 Crew-only cyklus
setInterval(() => {
  fetchMessages();
  fetchCrewLocations();
}, 3000);

// 🚀 Spusti sledovanie hneď po načítaní
startTracking();

window.centerMap = centerMap;
