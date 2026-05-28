const API = 'https://drivergo-production.up.railway.app/api';

function getToken() {
  return localStorage.getItem('token');
}

function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function apiPost(endpoint, data) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiPostForm(endpoint, formData) {
  const res = await fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + getToken() },
    body: formData
  });
  return res.json();
}

async function apiPutForm(endpoint, formData) {
  const res = await fetch(API + endpoint, {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + getToken() },
    body: formData
  });
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(API + endpoint, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  return res.json();
}

async function apiPut(endpoint, data) {
  const res = await fetch(API + endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getToken()
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(API + endpoint, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  return res.json();
}

function showToast(title, onAccept) {
  const overlay = document.getElementById('overlay');
  const toast = document.getElementById('toast');
  const toastTitle = document.getElementById('toast-title');
  if (toastTitle) toastTitle.textContent = title;
  if (overlay) overlay.classList.add('show');
  if (toast) toast.classList.add('show');
  const btnAceptar = document.getElementById('toast-aceptar');
  if (btnAceptar && onAccept) {
    btnAceptar.onclick = () => {
      hideToast();
      onAccept();
    };
  }
}

function hideToast() {
  const overlay = document.getElementById('overlay');
  const toast = document.getElementById('toast');
  if (overlay) overlay.classList.remove('show');
  if (toast) toast.classList.remove('show');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function formatCurrency(n) {
  return '$' + parseFloat(n).toFixed(2);
}

function formatDate(str) {
  const d = new Date(str);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function getEstadoLabel(estado) {
  const map = {
    'pendiente': 'Pendiente',
    'recibido': 'Pedido recibido por el negocio',
    'buscando_repartidor': 'Buscando repartidor',
    'en_proceso': 'Pedido en proceso',
    'en_camino': 'Pedido en camino',
    'entregado': 'Pedido entregado',
    'cancelado': 'Cancelado'
  };
  return map[estado] || estado;
}