(async function () {
  const list = document.getElementById('projects-list');
  const btnNew = document.getElementById('btn-new-project');

  const modalEl = document.getElementById('projectModal');
  const modal = new bootstrap.Modal(modalEl);
  const errBox = document.getElementById('project-error');
  const nameEl = document.getElementById('project-name');
  const descEl = document.getElementById('project-desc');
  const btnSave = document.getElementById('btn-save-project');

  function showErr(msg){ errBox.textContent = msg; errBox.classList.remove('d-none'); }
  function hideErr(){ errBox.classList.add('d-none'); errBox.textContent=''; }

  async function loadProjects() {
    list.innerHTML = `<div class="text-muted">Cargando...</div>`;
    const data = await apiFetch('/api/projects');
    const projects = data.projects || [];
    if (!projects.length) {
      list.innerHTML = `<div class="text-muted">No hay proyectos</div>`;
      return;
    }
    list.innerHTML = projects.map(p => `
      <a class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
         href="/projects/${p.id_project}">
        <div>
          <div class="fw-semibold">${p.nombre}</div>
          <div class="text-muted small">${p.descripcion || ''}</div>
        </div>
        <span class="badge text-bg-secondary">${p.member_role}</span>
      </a>
    `).join('');
  }

  function openModal() {
    hideErr();
    nameEl.value = '';
    descEl.value = '';
    modal.show();
  }

  async function saveProject() {
    hideErr();
    const nombre = nameEl.value.trim();
    const descripcion = descEl.value.trim();
    if (nombre.length < 2) return showErr('Nombre inválido (mín 2).');

    btnSave.disabled = true;
    try {
      await apiFetch('/api/projects', { method:'POST', body:{ nombre, descripcion }});
      modal.hide();
      await loadProjects();
    } catch (e) {
      showErr(e.message || 'Error al crear');
    } finally {
      btnSave.disabled = false;
    }
  }

  btnNew.addEventListener('click', openModal);
  btnSave.addEventListener('click', saveProject);

  await loadProjects();
})();
