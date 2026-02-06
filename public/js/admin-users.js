(async function () {
  const tbody = document.getElementById('users-tbody');
  const btnNew = document.getElementById('btn-new-user');

  const userModalEl = document.getElementById('userModal');
  const userModal = new bootstrap.Modal(userModalEl);
  const userError = document.getElementById('user-error');
  const userName = document.getElementById('user-name');
  const userEmail = document.getElementById('user-email');
  const userPass = document.getElementById('user-pass');
  const userRole = document.getElementById('user-role');
  const btnSave = document.getElementById('btn-save-user');

  const resetModalEl = document.getElementById('resetModal');
  const resetModal = new bootstrap.Modal(resetModalEl);
  const resetError = document.getElementById('reset-error');
  const resetUserId = document.getElementById('reset-user-id');
  const resetPass = document.getElementById('reset-pass');
  const btnReset = document.getElementById('btn-reset-pass');

  function showErr(box, msg){ box.textContent = msg; box.classList.remove('d-none'); }
  function hideErr(box){ box.classList.add('d-none'); box.textContent=''; }

  async function loadUsers() {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Cargando...</td></tr>`;
    const data = await apiFetch('/api/admin/users');
    const users = data.users || [];
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-muted">Sin usuarios</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => `
      <tr>
        <td>${u.nombre}</td>
        <td>${u.correo}</td>
        <td>${u.roles || ''}</td>
        <td>${u.activo ? '<span class="badge text-bg-success">Sí</span>' : '<span class="badge text-bg-danger">No</span>'}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-${u.activo ? 'warning' : 'success'}" data-action="toggle" data-id="${u.id_user}" data-active="${u.activo}">
            ${u.activo ? 'Desactivar' : 'Activar'}
          </button>
          <button class="btn btn-sm btn-outline-primary" data-action="reset" data-id="${u.id_user}">Reset pass</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('button[data-action="toggle"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const active = btn.dataset.active === 'true';
        await apiFetch(`/api/admin/users/${id}/active`, { method:'PATCH', body:{ activo: !active } });
        await loadUsers();
      });
    });

    tbody.querySelectorAll('button[data-action="reset"]').forEach(btn => {
      btn.addEventListener('click', () => openReset(parseInt(btn.dataset.id, 10)));
    });
  }

  function openNewUser() {
    hideErr(userError);
    userName.value = '';
    userEmail.value = '';
    userPass.value = '';
    userRole.value = 'User';
    userModal.show();
  }

  async function saveUser() {
    hideErr(userError);
    const payload = {
      nombre: userName.value.trim(),
      correo: userEmail.value.trim(),
      password: userPass.value,
      roleName: userRole.value
    };

    if (payload.nombre.length < 2) return showErr(userError, 'Nombre inválido');
    if (!payload.correo.includes('@')) return showErr(userError, 'Correo inválido');
    if (payload.password.length < 6) return showErr(userError, 'Contraseña mínima 6');

    btnSave.disabled = true;
    try {
      await apiFetch('/api/admin/users', { method:'POST', body: payload });
      userModal.hide();
      await loadUsers();
    } catch (e) {
      showErr(userError, e.message || 'Error al crear');
    } finally {
      btnSave.disabled = false;
    }
  }

  function openReset(id_user) {
    hideErr(resetError);
    resetUserId.value = id_user;
    resetPass.value = '';
    resetModal.show();
  }

  async function doReset() {
    hideErr(resetError);
    const id = parseInt(resetUserId.value, 10);
    const p = resetPass.value;
    if (p.length < 6) return showErr(resetError, 'Contraseña mínima 6');

    btnReset.disabled = true;
    try {
      await apiFetch(`/api/admin/users/${id}/reset-password`, { method:'PATCH', body:{ newPassword: p } });
      resetModal.hide();
      alert('Contraseña reseteada.');
    } catch (e) {
      showErr(resetError, e.message || 'Error al resetear');
    } finally {
      btnReset.disabled = false;
    }
  }

  btnNew.addEventListener('click', openNewUser);
  btnSave.addEventListener('click', saveUser);
  btnReset.addEventListener('click', doReset);

  await loadUsers();
})();
