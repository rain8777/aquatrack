// src/utils/api.js
// Central API utility for communicating with Google Apps Script backend

const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL;

async function callAPI(action, body = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('aquatrack_token') : null;
  if (!GAS_URL) {
    return { success: false, error: 'API URL is not configured.' };
  }
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, ...body }),
      redirect: 'follow'
    });
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

export async function login(email, password) {
  return callAPI('login', { email, password });
}

export async function registerOwner(data) {
  return callAPI('registerOwner', data);
}

export async function registerCustomer(data) {
  return callAPI('registerCustomer', data);
}

export async function logout() {
  const res = await callAPI('logout');
  if (typeof window !== 'undefined') localStorage.removeItem('aquatrack_token');
  return res;
}

export async function getOwnerDashboard() {
  return callAPI('getOwnerDashboard');
}

export async function getOwnerCustomers() {
  return callAPI('getOwnerCustomers');
}

export async function approveCustomer(customerId) {
  return callAPI('approveCustomer', { customerId });
}

export async function rejectCustomer(customerId) {
  return callAPI('rejectCustomer', { customerId });
}

export async function setPrice(data) {
  return callAPI('setPrice', data);
}

export async function getMapData(filter = 'all') {
  return callAPI('getMapData', { filter });
}

export async function markDelivered(orderId) {
  return callAPI('markDelivered', { orderId });
}

export async function getOrders() {
  return callAPI('getOrders');
}

export async function updateLocation(lat, lng, locationLabel) {
  return callAPI('updateLocation', { lat, lng, locationLabel });
}

export async function placeOrder(data) {
  return callAPI('placeOrder', data);
}

export async function getMyOrders() {
  return callAPI('getMyOrders');
}

export async function cancelOrder(orderId) {
  return callAPI('cancelOrder', { orderId });
}

export async function getMyOwner() {
  return callAPI('getMyOwner');
}

export async function sendMessage(orderId, message) {
  return callAPI('sendMessage', { orderId, message });
}

export async function getMessages(orderId) {
  return callAPI('getMessages', { orderId });
}

export async function clearChat(orderId) {
  return callAPI('clearChat', { orderId });
}
