/**
 * ComfyUI Workflows SPA Application Engine
 */

let workflowsData = [];
let currentCategory = 'ALL';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  try {
    const response = await fetch('workflow_details.json');
    if (!response.ok) {
      throw new Error(`Failed to load workflow details: ${response.statusText}`);
    }
    workflowsData = await response.json();
    
    renderCategoryFilters();
    bindEvents();
    renderTable();
  } catch (error) {
    console.error('Initialization error:', error);
    document.getElementById('workflowTableBody').innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 2rem; color: #ef4444;">
          Error loading workflow_details.json: ${error.message}
        </td>
      </tr>
    `;
  }
}

function renderCategoryFilters() {
  const container = document.getElementById('categoryFilters');
  const categories = Array.from(new Set(workflowsData.map(item => item.category))).filter(Boolean);
  
  let html = `<button class="filter-btn ${currentCategory === 'ALL' ? 'active' : ''}" data-category="ALL">All Categories</button>`;
  
  categories.forEach(cat => {
    html += `<button class="filter-btn ${currentCategory === cat ? 'active' : ''}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
  });
  
  container.innerHTML = html;
}

function bindEvents() {
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderTable();
  });

  const categoryFilters = document.getElementById('categoryFilters');
  categoryFilters.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.getAttribute('data-category');
      renderTable();
    }
  });
}

function renderTable() {
  const tbody = document.getElementById('workflowTableBody');
  const statsCounter = document.getElementById('statsCounter');

  const filtered = workflowsData.filter(item => {
    const matchesCategory = currentCategory === 'ALL' || item.category === currentCategory;
    
    if (!matchesCategory) return false;
    if (!searchQuery) return true;

    const searchableText = [
      item.name,
      item.filename,
      item.category,
      item.target_model,
      item.description,
      item.use_cases
    ].join(' ').toLowerCase();

    return searchableText.includes(searchQuery);
  });

  statsCounter.innerHTML = `Showing <strong>${filtered.length}</strong> of <strong>${workflowsData.length}</strong> loaded workflows`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No matching workflows found for "${escapeHtml(searchQuery)}".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    return `
      <tr>
        <td style="text-align: center; font-weight: 600; color: var(--text-muted);">${item.id}</td>
        <td>
          <div class="wf-name">${highlightText(escapeHtml(item.name), searchQuery)}</div>
          <div class="wf-file">${highlightText(escapeHtml(item.filename), searchQuery)}</div>
          <div class="badge-group">
            <span class="badge-category">${highlightText(escapeHtml(item.category), searchQuery)}</span>
            <span class="badge-model">${highlightText(escapeHtml(item.target_model), searchQuery)}</span>
          </div>
        </td>
        <td>
          <div class="desc-text">${highlightText(escapeHtml(item.description), searchQuery)}</div>
          <div class="use-case-box">
            <strong>🎯 Best For & Applications:</strong><br>
            ${highlightText(escapeHtml(item.use_cases), searchQuery)}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
