const requiredQrCode = 'IJifuiuas4MUE28EFFE51f56ddfs65';
let formData = {}; // crew-only cache

function checkUsernameThenValidate() {
  const form = document.getElementById('registerForm');
  const username = form.username.value.trim();

  if (!username) {
    alert("❌ Zadaj používateľské meno.");
    return;
  }

  fetch(`/check-username?username=${encodeURIComponent(username)}`)
    .then(res => res.json())
    .then(response => {
      if (response.exists) {
        alert("❌ Používateľské meno už existuje.");
      } else {
        validatePasswords();
      }
    })
    .catch(() => {
      alert("❌ Chyba pri overovaní používateľa.");
    });
}

function validatePasswords() {
  const form = document.getElementById('registerForm');
  const password = form.password.value;
  const confirm = form.confirm.value;

  if (password.length < 6) {
    alert("❌ Heslo musí mať aspoň 6 znakov.");
    return;
  }

  if (password !== confirm) {
    alert("❌ Heslá sa nezhodujú.");
    return;
  }

  // Ulož údaje pred skenerom
  formData = {
    username: form.username.value.trim(),
    password: password,
    confirm: confirm
  };

  startScanner();
}

function startScanner() {
  console.log("📷 Spúšťam QR skener...");
  document.getElementById('formWrapper').style.display = 'none';
  document.getElementById('scannerWrapper').style.display = 'block';
  document.getElementById('scannerWrapper').style.marginTop = '200px';

  const qr = new Html5Qrcode("qr-reader");
  qr.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: 250 },
    (decodedText) => {
      console.log("🔍 Naskenovaný kód:", decodedText);
      if (decodedText === requiredQrCode) {
        qr.stop().then(() => {
          document.getElementById('scannerWrapper').innerHTML = "<p style='text-align:center;'>Kód prijatý.</p>";
          submitRegistration(decodedText);
        });
      } else {
        alert("❌ Neplatný QR kód. Skús znova.");
      }
    },
    (errorMessage) => {}
  );
}

function submitRegistration(accessKey) {
  const data = {
    username: formData.username,
    password: formData.password,
    confirm: formData.confirm,
    accessKey: accessKey
  };

  console.log('📤 Odosielam:', data);

  fetch('/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json())
    .then(response => {
      if (response.success) {
        document.getElementById('scannerWrapper').innerHTML += "<p style='text-align:center;'>Prihlás sa!</p>";
      } else {
        document.getElementById('scannerWrapper').innerHTML += `<p style='text-align:center;'>❌ ${response.error}</p>`;
      }
    }).catch(() => {
      document.getElementById('scannerWrapper').innerHTML += "<p style='text-align:center;'>❌ Chyba pri registrácii.</p>";
    });
}

window.checkUsernameThenValidate = checkUsernameThenValidate;
