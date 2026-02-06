(function () {
  const form = document.getElementById('login-form');
  const correo = document.getElementById('correo');
  const password = document.getElementById('password');
  const alertBox = document.getElementById('alert-error');
  const btn = document.getElementById('btn-login');

  function showError(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove('d-none');
  }
  function hideError() {
    alertBox.classList.add('d-none');
    alertBox.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();
    btn.disabled = true;

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: {
          correo: correo.value.trim(),
          password: password.value
        }
      });
      if (data.ok) location.href = '/';
    } catch (err) {
      showError(err.message || 'Error al iniciar sesión');
    } finally {
      btn.disabled = false;
    }
  });
})();
