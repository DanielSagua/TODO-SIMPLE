(async function () {
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } finally {
        location.href = '/login';
      }
    });
  }

  const adminLink = document.getElementById('nav-admin-link');
  if (adminLink) {
    try {
      const me = await apiFetch('/api/auth/me');
      if (me?.user?.role === 'Admin') adminLink.classList.remove('d-none');
    } catch (_) {}
  }
})();
