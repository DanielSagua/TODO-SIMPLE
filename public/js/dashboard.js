(async function () {
  const uiScript = document.createElement('script');
  uiScript.src = '/public/js/ui.js';
  uiScript.defer = true;
  document.head.appendChild(uiScript);

  const subtitle = document.getElementById('subtitle');
  const tbody = document.getElementById('tasks-tbody');
  const count = document.getElementById('tasks-count');

  const filterProject = document.getElementById('filter-project');
  const filterStatus = document.getElementById('filter-status');
  const filterPriority = document.getElementById('filter-priority');
  const filterDue = document.getElementById('filter-due');
  const filterSearch = document.getElementById('filter-search');
  const filterAssignedMe = document.getElementById('filter-assigned-me');

  const btnRefresh = document.getElementById('btn-refresh');
  const btnNewTask = document.getElementById('btn-new-task');

  // Modal fields
  const taskModalEl = document.getElementById('taskModal');
  const taskModal = new bootstrap.Modal(taskModalEl);
  const taskModalTitle = document.getElementById('taskModalTitle');
  const taskError = document.getElementById('task-error');

  const taskId = document.getElementById('task-id');
  const taskProject = document.getElementById('task-project');
  const taskAssigned = document.getElementById('task-assigned-user-id'); // <select>
  const taskTitle = document.getElementById('task-title');
  const taskDesc = document.getElementById('task-desc');
  const taskStatus = document.getElementById('task-status');
  const taskPriority = document.getElementById('task-priority');
  const taskDue = document.getElementById('task-due');
  const btnSaveTask = document.getElementById('btn-save-task');
  const btnDeleteTask = document.getElementById('btn-delete-task');

  let lookups = { statuses: [], priorities: [] };
  let projects = [];
  let tasks = [];
  let membersByProject = new Map();

  function showTaskError(msg) {
    taskError.textContent = msg;
    taskError.classList.remove('d-none');
  }
  function hideTaskError() {
    taskError.classList.add('d-none');
    taskError.textContent = '';
  }

  function fillSelect(select, items, valueKey, textKey, includeAll) {
    const keepFirst = includeAll ? 1 : 0;
    while (select.options.length > keepFirst) select.remove(keepFirst);
    for (const it of items) {
      const opt = document.createElement('option');
      opt.value = it[valueKey];
      opt.textContent = it[textKey];
      select.appendChild(opt);
    }
  }

  function fillAssignedSelect(members, selectedId = '') {
    // Mantiene el primer option (Sin asignar)
    while (taskAssigned.options.length > 1) taskAssigned.remove(1);
    for (const m of members) {
      const opt = document.createElement('option');
      opt.value = m.id_user;
      opt.textContent = `${m.nombre} (${m.correo})`;
      taskAssigned.appendChild(opt);
    }
    taskAssigned.value = selectedId ? String(selectedId) : '';
  }

  async function loadMembersForProject(projectId) {
    if (!projectId) {
      fillAssignedSelect([], '');
      return [];
    }
    const pid = String(projectId);
    if (membersByProject.has(pid)) {
      const cached = membersByProject.get(pid);
      fillAssignedSelect(cached, taskAssigned.value);
      return cached;
    }
    const data = await apiFetch(`/api/projects/${pid}/members`);
    const members = data.members || [];
    membersByProject.set(pid, members);
    fillAssignedSelect(members, taskAssigned.value);
    return members;
  }

  async function loadInitial() {
    const [me, lk, pr] = await Promise.all([
      apiFetch('/api/auth/me'),
      apiFetch('/api/lookups'),
      apiFetch('/api/projects')
    ]);

    subtitle.textContent = `Hola, ${me.user.nombre} (${me.user.correo})`;
    lookups = { statuses: lk.statuses, priorities: lk.priorities };
    projects = pr.projects;

    fillSelect(filterStatus, lookups.statuses, 'id_status', 'nombre', true);
    fillSelect(filterPriority, lookups.priorities, 'id_priority', 'nombre', true);

    fillSelect(filterProject, projects, 'id_project', 'nombre', true);
    fillSelect(taskProject, projects, 'id_project', 'nombre', false);

    fillSelect(taskStatus, lookups.statuses, 'id_status', 'nombre', false);
    fillSelect(taskPriority, lookups.priorities, 'id_priority', 'nombre', false);

    taskProject.addEventListener('change', async () => {
      try { await loadMembersForProject(taskProject.value); } catch (_) {}
    });

    if (projects[0]) {
      taskProject.value = projects[0].id_project;
      await loadMembersForProject(taskProject.value);
    }
  }

  function buildQuery() {
    const q = new URLSearchParams();
    if (filterProject.value) q.set('projectId', filterProject.value);
    if (filterStatus.value) q.set('statusId', filterStatus.value);
    if (filterPriority.value) q.set('priorityId', filterPriority.value);
    if (filterDue.value) q.set('due', filterDue.value);
    if (filterSearch.value.trim()) q.set('search', filterSearch.value.trim());
    if (filterAssignedMe.checked) q.set('assignedTo', 'me');
    return q.toString();
  }

  async function loadTasks() {
    tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Cargando...</td></tr>`;
    const qs = buildQuery();
    const data = await apiFetch('/api/tasks' + (qs ? `?${qs}` : ''));
    tasks = data.tasks || [];
    renderTasks();
  }

  function renderTasks() {
    if (!window.escapeHtml) {
      setTimeout(renderTasks, 50);
      return;
    }

    count.textContent = `${tasks.length} tarea(s)`;

    if (!tasks.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-muted">Sin tareas</td></tr>`;
      return;
    }

    tbody.innerHTML = tasks.map(t => {
      const due = t.due_at_utc ? formatDateShort(t.due_at_utc) : '';
      return `
        <tr>
          <td>
            <div class="fw-semibold">${escapeHtml(t.title)}</div>
            <div class="text-muted small text-truncate" style="max-width: 360px">${escapeHtml(t.description || '')}</div>
          </td>
          <td>${escapeHtml(t.project_name || '')}</td>
          <td>${badge(escapeHtml(t.status_name), t.is_final ? 'success' : 'secondary')}</td>
          <td>${badge(escapeHtml(t.priority_name), t.priority_name === 'Alta' ? 'danger' : (t.priority_name === 'Media' ? 'warning' : 'info'))}</td>
          <td>${due || '<span class="text-muted">—</span>'}</td>
          <td>${escapeHtml(t.assigned_name || '') || '<span class="text-muted">—</span>'}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${t.id_task}">Editar</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('button[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id, 10)));
    });
  }

  function resetModal() {
    hideTaskError();
    taskId.value = '';
    taskTitle.value = '';
    taskDesc.value = '';
    taskDue.value = '';
    btnDeleteTask.classList.add('d-none');

    const defStatus = lookups.statuses.find(s => s.nombre === 'Pendiente') || lookups.statuses[0];
    const defPrio = lookups.priorities.find(p => p.nombre === 'Baja') || lookups.priorities[0];
    if (defStatus) taskStatus.value = defStatus.id_status;
    if (defPrio) taskPriority.value = defPrio.id_priority;

    if (projects[0]) taskProject.value = projects[0].id_project;
    taskAssigned.value = '';
    loadMembersForProject(taskProject.value).catch(() => {});
  }

  function openNewModal() {
    resetModal();
    taskModalTitle.textContent = 'Nueva tarea';
    taskModal.show();
  }

  async function openEditModal(id) {
    resetModal();
    taskModalTitle.textContent = 'Editar tarea';
    btnDeleteTask.classList.remove('d-none');

    try {
      const data = await apiFetch(`/api/tasks/${id}`);
      const t = data.task;

      taskId.value = t.id_task;
      taskProject.value = t.id_project;

      await loadMembersForProject(taskProject.value);
      taskAssigned.value = t.assigned_user_id || '';

      taskTitle.value = t.title || '';
      taskDesc.value = t.description || '';
      taskStatus.value = t.id_status;
      taskPriority.value = t.id_priority;
      taskDue.value = toDateInputValue(t.due_at_utc);

      taskModal.show();
    } catch (e) {
      alert(e.message);
    }
  }

  async function saveTask() {
    hideTaskError();
    const payload = {
      id_project: taskProject.value,
      title: taskTitle.value.trim(),
      description: taskDesc.value.trim(),
      id_status: taskStatus.value,
      id_priority: taskPriority.value,
      due_date: taskDue.value || null,
      assigned_user_id: (taskAssigned.value ? String(taskAssigned.value).trim() : null)
    };

    if (!payload.title || payload.title.length < 2) return showTaskError('El título es obligatorio (mín 2).');

    btnSaveTask.disabled = true;
    try {
      if (taskId.value) {
        await apiFetch(`/api/tasks/${taskId.value}`, { method: 'PATCH', body: payload });
      } else {
        await apiFetch('/api/tasks', { method: 'POST', body: payload });
      }
      taskModal.hide();
      await loadTasks();
    } catch (e) {
      showTaskError(e.message || 'Error al guardar');
    } finally {
      btnSaveTask.disabled = false;
    }
  }

  async function deleteTask() {
    if (!taskId.value) return;
    if (!confirm('¿Eliminar esta tarea?')) return;

    btnDeleteTask.disabled = true;
    try {
      await apiFetch(`/api/tasks/${taskId.value}`, { method: 'DELETE' });
      taskModal.hide();
      await loadTasks();
    } catch (e) {
      showTaskError(e.message || 'Error al eliminar');
    } finally {
      btnDeleteTask.disabled = false;
    }
  }

  btnRefresh.addEventListener('click', loadTasks);
  btnNewTask.addEventListener('click', openNewModal);
  btnSaveTask.addEventListener('click', saveTask);
  btnDeleteTask.addEventListener('click', deleteTask);

  [filterProject, filterStatus, filterPriority, filterDue].forEach(el => el.addEventListener('change', loadTasks));
  filterAssignedMe.addEventListener('change', loadTasks);
  filterSearch.addEventListener('input', () => {
    clearTimeout(window.__searchT);
    window.__searchT = setTimeout(loadTasks, 350);
  });

  try {
    await loadInitial();
    await loadTasks();
  } catch (e) {
    subtitle.textContent = e.message || 'Error al cargar';
  }
})();
