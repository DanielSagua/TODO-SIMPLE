(async function () {
  const meInfo = document.getElementById('me-info');

  const currentPass = document.getElementById('current-pass');
  const newPass = document.getElementById('new-pass');
  const btn = document.getElementById('btn-change-pass');
  const okBox = document.getElementById('pass-ok');
  const errBox = document.getElementById('pass-error');

  function showOk() { okBox.classList.remove('d-none'); }
  function hideOk() { okBox.classList.add('d-none'); }
  function showErr(msg) { errBox.textContent = msg; errBox.classList.remove('d-none'); }
  function hideErr() { errBox.classList.add('d-none'); errBox.textContent=''; }

  const me = await apiFetch('/api/auth/me');
  meInfo.textContent = `${me.user.nombre} (${me.user.correo}) - Rol: ${me.user.role}`;

  btn.addEventListener('click', async () => {
    hideOk(); hideErr();
    const cp = currentPass.value;
    const np = newPass.value;
    if (np.length < 6) return showErr('Contraseña nueva muy corta (mín 6).');

    btn.disabled = true;
    try {
      await apiFetch('/api/users/me/password', { method:'PATCH', body:{ currentPassword: cp, newPassword: np }});
      currentPass.value = '';
      newPass.value = '';
      showOk();
    } catch (e) {
      showErr(e.message || 'Error');
    } finally {
      btn.disabled = false;
    }
  });
})();
