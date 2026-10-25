//frontend application logic
//handle ui interactions, API communication(like it will call the api from the backend)
//UI rendering and DOM manipulation (Your code controls how the data appears on the webpage)
"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const taskForm = $("#task-form");
const taskTitle = $("#task-title");
const taskDescription = $("#task-description");
const taskDate = $("#task-date");
const taskPriority = $("#task-priority");
const taskList = $("#taskList");
const taskSearch = $("#searchInput");
const emptyState = $("#emptyState");
const emptyTitle = $("#empty-title");
const emptyMessage = $("#empty-message");
const emptyAdd = $("#empty-add");
const taskCountLabel = $("#task-count-label");
const totalCount = $("#totalTasks");
const pendingCount = $("#pendingTasks");
const completedCount = $("#completedTasks");
const modal = $("#task-modal");
const modalTitle = $("#modal-title");
const saveTaskButton = $("#save-task");
const formError = $("#form-error");
const themeToggle = $("#themeToggle");
const themeIcon = $("#theme-icon");
const themeLabel = $("#theme-label");
const toast = $("#toast");
const brandLogo = $("#brand-logo");

const LIGHT_LOGO = "assets/ottoke-logo.png";
const DARK_LOGO = "assets/ottoke-dark.png";

const THEME_KEY = "ottoke-theme-v1";
let tasks = [];
let activeFilter = "all";
let editingTaskId = null;
let lastFocusedElement = null;
let pendingDeleteId = null;
let toastTimer;
let modalCloseTimer;

const deleteModal = document.getElementById("deleteModal");
const deleteModalMessage = document.getElementById("deleteModalMessage");
const cancelDeleteBtn = document.getElementById("cancelDelete");
const confirmDeleteBtn = document.getElementById("confirmDelete");


async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

async function loadTasksFromAPI() {
  try {
    tasks = await apiRequest("/api/tasks");
    renderTasks();
  } catch (error) {
    console.error("Failed to load tasks:", error);
    showToast(error.message || "Could not load tasks.");
  }
}


function formatDate(dateString) {
  if (!dateString) return "No due date";
  const parts = dateString.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return "No due date";
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return "No due date";
  return "Due " + new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function updateCurrentDate() {
  $("#current-date").textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  }).format(new Date());
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

//modal behaviour
function openModal(task = null) {
  clearTimeout(modalCloseTimer);
  modal.classList.remove("is-closing");

  lastFocusedElement = document.activeElement;
  editingTaskId = task ? task._id : null;
  taskForm.reset();
  formError.textContent = "";
  if (task) {
    modalTitle.textContent = "Edit task";
    saveTaskButton.textContent = "Save Changes";
    taskTitle.value = task.title;
    taskDescription.value = task.description || "";
    taskDate.value = task.dueDate || "";
    taskPriority.value = task.priority || "medium";
  } else {
    modalTitle.textContent = "Create a task";
    saveTaskButton.textContent = "Create Task";
    taskPriority.value = "medium";
  }
  modal.inert = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  taskTitle.focus();
}

function closeModal() {
  // Prevent the closing animation from being scheduled twice.
  if (modal.classList.contains("is-closing")) return;

  // Desktop keeps its existing immediate-close behavior.
  if (window.matchMedia("(max-width: 480px)").matches) {
    modal.classList.add("is-closing");

    modalCloseTimer = setTimeout(() => {
      finishClosingModal();
    }, 280);
  } else {
    finishClosingModal();
  }
}
function finishClosingModal() {
  clearTimeout(modalCloseTimer);

  modal.setAttribute("aria-hidden", "true");
  modal.inert = true;
  modal.classList.remove("is-closing");

  document.body.classList.remove("modal-open");

  taskForm.reset();
  formError.textContent = "";
  editingTaskId = null;

  if (lastFocusedElement?.isConnected) {
    lastFocusedElement.focus();
  }
}

$("#addTaskBtn").addEventListener("click", () => openModal());
emptyAdd.addEventListener("click", () => openModal());
$("#close-modal").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);
$$("[data-close-modal]", modal).forEach(el => el.addEventListener("click", closeModal));

document.addEventListener("keydown", event => {
  if (modal.getAttribute("aria-hidden") !== "false") return;
  if (event.key === "Escape") closeModal();
  if (event.key === "Tab") {
    const focusable = $$("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)", modal)
      .filter(el => el.getClientRects().length > 0);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
});

//create task and save in db
taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = taskTitle.value.trim();
  const description = taskDescription.value.trim();
  const dueDate = taskDate.value;
  const priority = taskPriority.value;

  if (!title) {
    showToast("Please enter a task title.");
    return;
  }

  const taskData = {
    title,
    description,
    dueDate,
    priority,
  };

  //edit task
  try {
    if (editingTaskId) {
      const updatedTask = await apiRequest(
        `/api/tasks/${editingTaskId}`,
        {
          method: "PATCH",
          body: JSON.stringify(taskData),
        }
    );

    tasks = tasks.map((task) =>
      task._id === editingTaskId ? updatedTask : task
    );

    closeModal();
    taskForm.reset();
    renderTasks();

    showToast("Task updated successfully!");
    return;
  }

    // Send the new task to Express and MongoDB.
    const savedTask = await apiRequest("/api/tasks", {
      method: "POST",
      body: JSON.stringify(taskData),
    });

    // Use the task returned by the backend.
    tasks.unshift(savedTask);

    closeModal();
    taskForm.reset();

    activeFilter = "all";
    updateFilterButtons();
    renderTasks();

    showToast("Task added successfully!");
  } catch (error) {
    console.error("Failed to create task:", error);
    showToast(error.message || "Could not add task.");
  }
});

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

//display tasks in html
function renderTasks() {
  const searchTerm = taskSearch.value.trim().toLowerCase();
  const filteredTasks = tasks.filter(task => {
    const matchesFilter = activeFilter === "all" ||
      (activeFilter === "pending" && !task.completed) ||
      (activeFilter === "completed" && task.completed);
    const searchText = `${task.title} ${task.description || ""}`.toLowerCase();
    return matchesFilter && searchText.includes(searchTerm);
  });

  taskList.replaceChildren();
  filteredTasks.forEach(task => taskList.appendChild(createTaskElement(task)));

  totalCount.textContent = tasks.length;
  pendingCount.textContent = tasks.filter(task => !task.completed).length;
  completedCount.textContent = tasks.filter(task => task.completed).length;

  const isEmpty = filteredTasks.length === 0;
  emptyState.hidden = !isEmpty;
  if (isEmpty && searchTerm) {
    emptyTitle.textContent = "No matching tasks";
    emptyMessage.textContent = "Try another search term.";
  } else if (isEmpty && activeFilter === "pending" && tasks.length) {
    emptyTitle.textContent = "All caught up!";
    emptyMessage.textContent = "You have no pending tasks.";
  } else if (isEmpty && activeFilter === "completed" && tasks.length) {
    emptyTitle.textContent = "Nothing completed yet";
    emptyMessage.textContent = "Complete a task to see it here.";
  } else {
    emptyTitle.textContent = "No tasks yet";
    emptyMessage.textContent = "Add your first task to get started!";
  }
  emptyAdd.hidden = searchTerm !== "" || (activeFilter !== "all" && tasks.length > 0);
  taskCountLabel.textContent = `${filteredTasks.length} of ${tasks.length} task(s) shown`;
}

//create one task element for html
function createTaskElement(task) {
  const article = document.createElement("article");
  article.className = `task-item${task.completed ? " completed" : ""}`;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = task.completed;
  checkbox.setAttribute("aria-label", `Mark "${task.title}" as ${task.completed ? "pending" : "completed"}`);
  checkbox.addEventListener("change", () => updateTaskStatus(task._id, checkbox.checked));

  const info = document.createElement("div");
  info.className = "task-info";
  const title = document.createElement("h3");
  title.className = "task-title";
  title.textContent = task.title;
  const details = document.createElement("p");
  details.className = "task-description";
  const dueText = formatDate(task.dueDate);
  details.textContent = task.description ? `${dueText} · ${task.description}` : (task.completed ? "Completed" : dueText);
  info.append(title, details);

  const priority = document.createElement("span");
  const safePriority = ["low", "medium", "high"].includes(task.priority) ? task.priority : "medium";
  priority.className = `priority priority-${safePriority}`;
  priority.textContent = safePriority.charAt(0).toUpperCase() + safePriority.slice(1);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "task-action edit-task-btn";
  editButton.textContent = "✎";
  editButton.setAttribute("aria-label", `Edit ${task.title}`);
  editButton.addEventListener("click", () => openModal(task));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "task-action delete-task-btn";
  deleteButton.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.addEventListener("click", () => deleteTask(task._id));

  actions.append(editButton, deleteButton);
  article.append(checkbox, info, priority, actions);
  return article;
}

//update task completion status
async function updateTaskStatus(id, completed) {
  try {
    const updatedTask = await apiRequest(`/api/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });

    tasks = tasks.map((task) =>
      task._id === id ? updatedTask : task
    );

    renderTasks();
    showToast(
      completed ? "Task completed!" : "Task marked as pending."
    );
  } catch (error) {
    console.error("Failed to update task status:", error);
    showToast(error.message || "Could not update task.");

    // Restore the UI to match the current in-memory data.
    renderTasks();
  }
}

function deleteTask(id) {
  const task = tasks.find(item => item._id === id);
  if (!task) return;

  pendingDeleteId = id;

  deleteModalMessage.textContent =
    `Are you sure you want to delete "${task.title}"? This action cannot be undone.`;

  deleteModal.hidden = false;
}


function closeDeleteModal() {
  deleteModal.hidden = true;
  pendingDeleteId = null;
}

//remove task in the array
async function confirmDeleteTask() {
  if (!pendingDeleteId) return;

  const id = pendingDeleteId;

  try {
    await apiRequest(`/api/tasks/${id}`, {
      method: "DELETE",
    });

    tasks = tasks.filter((task) => task._id !== id);

    pendingDeleteId = null;

    // Use your existing function to close the delete modal.
    closeDeleteModal();
    renderTasks();

    showToast("Task deleted successfully!");
  } catch (error) {
    console.error("Failed to delete task:", error);
    showToast(error.message || "Could not delete task.");
  }
}

cancelDeleteBtn.addEventListener("click", closeDeleteModal);
confirmDeleteBtn.addEventListener("click", confirmDeleteTask);

deleteModal.addEventListener("click", event => {
  if (event.target === deleteModal) {
    closeDeleteModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !deleteModal.hidden) {
    closeDeleteModal();
  }
});

taskSearch.addEventListener("input", renderTasks);
$$("[data-filter]").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  updateFilterButtons();
  renderTasks();
}));

function updateFilterButtons() {
  $$("[data-filter]").forEach(button => {
    const active = button.dataset.filter === activeFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function applyTheme(theme) {
  const dark = theme === "dark";

  document.documentElement.dataset.theme = dark ? "dark" : "light";
  brandLogo.src = dark ? DARK_LOGO : LIGHT_LOGO;
  brandLogo.alt = dark ? "Ottoke dark mode logo" : "Ottoke logo";

  // Update the theme toggle
  themeIcon.className =  dark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  themeLabel.textContent = dark ? "Light mode" : "Dark mode";

  themeToggle.setAttribute(
    "aria-label",
    dark ? "Switch to light mode" : "Switch to dark mode"
  );

  // Update the browser theme color
  $('meta[name="theme-color"]').setAttribute(
    "content",
    dark ? "#211b19" : "#e4cfbe"
  );
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

themeToggle.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* session-only theme */ }
});

applyTheme(loadTheme());
updateCurrentDate();
updateFilterButtons();
renderTasks();
loadTasksFromAPI();

