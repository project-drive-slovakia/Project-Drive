document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const form = e.target;

  // 🔧 Vygeneruj deviceId
  const deviceId = 'device-' + Math.random().toString(36).substring(2, 10);
  localStorage.setItem('crewDeviceId', deviceId);

  const data = {
    username: form.username.value.trim(),
    password: form.password.value,
    deviceId // ➕ pošli do backendu
  };

  fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(response => {
    if (response.success && response.token) {
      localStorage.setItem('crewLoggedIn', 'true');
      localStorage.setItem('crewUsername', data.username);
      localStorage.setItem('crewToken', response.token);
      window.location.href = 'main.html';
    } else {
      alert(`❌ ${response.error || 'Neplatné meno alebo heslo.'}`);
    }
  })
  .catch(() => {
    alert("❌ Chyba pri prihlasovaní.");
  });
});
