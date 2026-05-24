// ============================================================
// AQUATRACK - Water Refilling Station Management System
// Google Apps Script Backend
// ============================================================

const SHEET_ID = PropertiesService.getScriptProperties().getProperty('GSHEET_ID');
const SECRET   = PropertiesService.getScriptProperties().getProperty('SECRET');
const GAS_URL  = PropertiesService.getScriptProperties().getProperty('GAS_URL');

// Sheet names
const SHEETS = {
  OWNERS:    'Owners',
  CUSTOMERS: 'Customers',
  ORDERS:    'Orders',
  PRICES:    'Prices',
  CHAT:      'Chat',
  SESSIONS:  'Sessions'
};

// Super Admin credentials stored in Script Properties
// Set ADMIN_EMAIL and ADMIN_PASSWORD in Apps Script > Project Settings > Script Properties
const ADMIN_EMAIL    = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL')    || 'superadmin@aquatrack.com';
const ADMIN_PASSWORD = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD') || 'AquaTrack@Admin2024!';

// ============================================================
// MAIN ENTRY POINT
// ============================================================
function doPost(e) {
  try {
    const body   = JSON.parse(e.postData.contents);
    const action = body.action;
    const token  = body.token || '';

    // Public actions (no auth needed)
    const publicActions = ['login', 'registerOwner', 'registerCustomer'];
    if (!publicActions.includes(action)) {
      const user = verifyToken(token);
      if (!user) return respond({ success: false, error: 'Unauthorized' });
      body._user = user;
    }

    switch (action) {
      // Auth
      case 'login':            return respond(login(body));
      case 'registerOwner':    return respond(registerOwner(body));
      case 'registerCustomer': return respond(registerCustomer(body));
      case 'logout':           return respond(logout(body));

      // Admin actions (superadmin only)
      case 'adminGetOwners':    return respond(adminGetOwners(body));
      case 'adminApproveOwner': return respond(adminApproveOwner(body));
      case 'adminLockOwner':    return respond(adminLockOwner(body));
      case 'adminUnlockOwner':  return respond(adminUnlockOwner(body));
      case 'adminDeleteOwner':  return respond(adminDeleteOwner(body));
      case 'adminExtendTrial':  return respond(adminExtendTrial(body));

      // Owner actions
      case 'getOwnerDashboard':    return respond(getOwnerDashboard(body));
      case 'getOwnerCustomers':    return respond(getOwnerCustomers(body));
      case 'approveCustomer':      return respond(approveCustomer(body));
      case 'ownerAddCustomer':     return respond(ownerAddCustomer(body));
      case 'rejectCustomer':       return respond(rejectCustomer(body));
      case 'setPrice':             return respond(setPrice(body));
      case 'getMapData':           return respond(getMapData(body));
      case 'markDelivered':        return respond(markDelivered(body));
      case 'getOrders':            return respond(getOrders(body));

      // Queue management
      case 'getQueue':           return respond(getQueue(body));
      case 'updateQueueOrder':   return respond(updateQueueOrder(body));

      // Customer actions
      case 'updateLocation':     return respond(updateLocation(body));
      case 'placeOrder':         return respond(placeOrder(body));
      case 'getMyOrders':        return respond(getMyOrders(body));
      case 'cancelOrder':        return respond(cancelOrder(body));
      case 'getMyOwner':              return respond(getMyOwner(body));
      case 'getMyOrdersAllStations':  return respond(getMyOrdersAllStations(body));
      case 'getAllStationsForCustomer':return respond(getAllStationsForCustomer(body));
      case 'switchStation':           return respond(switchStation(body));
      case 'getInactiveCustomers':    return respond(getInactiveCustomers(body));

      // Chat
      case 'sendMessage':   return respond(sendMessage(body));
      case 'getMessages':   return respond(getMessages(body));
      case 'clearChat':     return respond(clearChat(body));

      default:
        return respond({ success: false, error: 'Unknown action' });
    }
  } catch (err) {
    return respond({ success: false, error: err.message });
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'AquaTrack API Running' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// SHEET HELPERS
// ============================================================
function getSheet(name) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    initSheet(sheet, name);
  }
  return sheet;
}

function initSheet(sheet, name) {
  const headers = {
    Owners:    ['id','name','email','password','businessName','phone','address','pricePerContainer','discountEnabled','discountPercent','createdAt','approved','locked','trialEnd'],
    Customers: ['id','ownerId','name','email','password','phone','lat','lng','locationLabel','approved','createdAt'],
    Orders:    ['id','customerId','ownerId','containers','totalAmount','urgency','status','notes','queuePosition','createdAt','deliveredAt'],
    Prices:    ['ownerId','pricePerContainer','discountEnabled','discountPercent','updatedAt'],
    Chat:      ['id','orderId','senderId','senderRole','message','createdAt'],
    Sessions:  ['token','userId','role','createdAt','expiresAt']
  };
  if (headers[name]) sheet.appendRow(headers[name]);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function findRow(sheet, field, value) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx = headers.indexOf(field);
  if (colIdx === -1) return -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]) === String(value)) return i + 1; // 1-based row
  }
  return -1;
}

function updateRow(sheet, rowNum, updates) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  Object.keys(updates).forEach(key => {
    const idx = headers.indexOf(key);
    if (idx !== -1) row[idx] = updates[key];
  });
  sheet.getRange(rowNum, 1, 1, row.length).setValues([row]);
}

function generateId() {
  return Utilities.getUuid().replace(/-/g, '').substring(0, 16);
}

function now() {
  return new Date().toISOString();
}

// ============================================================
// AUTH
// ============================================================
function hashPassword(pw) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,
    pw + SECRET, Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function generateToken() {
  return Utilities.getUuid() + '-' + Date.now();
}

function verifyToken(token) {
  if (!token) return null;
  const sheet = getSheet(SHEETS.SESSIONS);
  const sessions = sheetToObjects(sheet);
  const session = sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date());
  if (!session) return null;
  return { userId: session.userId, role: session.role };
}

function login(body) {
  const { email, password } = body;

  // Super Admin check (credentials stored in Script Properties)
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = createSession('superadmin', 'superadmin');
    return { success: true, token, role: 'superadmin', user: { id: 'superadmin', name: 'Super Admin', email } };
  }

  const hash = hashPassword(password);

  // Try owners
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  const owner = owners.find(o => o.email === email && o.password === hash);
  if (owner) {
    const isApproved = owner.approved === true || owner.approved === 'TRUE' || owner.approved === 'true';
    const isLocked   = owner.locked   === true || owner.locked   === 'TRUE' || owner.locked   === 'true';
    if (!isApproved) return { success: false, error: 'Your account is pending approval from AquaTrack admin. You will be notified once approved.' };
    if (isLocked)    return { success: false, error: 'Your account has been locked. Please contact AquaTrack support to reactivate.' };
    // Check trial expiry
    const trialEnd = owner.trialEnd ? new Date(owner.trialEnd) : null;
    const daysLeft = trialEnd ? Math.ceil((trialEnd - new Date()) / 86400000) : 999;
    if (trialEnd && daysLeft < 0) return { success: false, error: 'Your 15-day free trial has ended. Please contact AquaTrack admin to continue using the system.' };
    const token = createSession(owner.id, 'owner');
    return { success: true, token, role: 'owner', user: { ...sanitizeOwner(owner), daysLeft } };
  }

  // Try customers
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const customer = customers.find(c => c.email === email && c.password === hash);
  if (customer) {
    if (customer.approved !== true && customer.approved !== 'TRUE' && customer.approved !== 'true') {
      return { success: false, error: 'Your account is pending approval from your water station.' };
    }
    const token = createSession(customer.id, 'customer');
    return { success: true, token, role: 'customer', user: sanitizeCustomer(customer) };
  }

  return { success: false, error: 'Invalid email or password.' };
}

function createSession(userId, role) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  getSheet(SHEETS.SESSIONS).appendRow([token, userId, role, now(), expiresAt]);
  return token;
}

function logout(body) {
  const sheet = getSheet(SHEETS.SESSIONS);
  const row = findRow(sheet, 'token', body.token);
  if (row > 0) sheet.deleteRow(row);
  return { success: true };
}

function registerOwner(body) {
  const { name, email, password, businessName, phone, address } = body;
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  if (owners.find(o => o.email === email)) return { success: false, error: 'Email already registered.' };
  const id = generateId();
  const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(); // 15 days from now
  // approved=false, locked=false, trialEnd set but won't activate until admin approves
  getSheet(SHEETS.OWNERS).appendRow([id, name, email, hashPassword(password), businessName, phone, address, 25, false, 0, now(), false, false, '']);
  // Init price row
  getSheet(SHEETS.PRICES).appendRow([id, 25, false, 0, now()]);
  // Do NOT create session — owner must wait for admin approval
  return { success: true, pending: true, message: 'Registration submitted! Our team will review and approve your account within 24 hours.' };
}

function registerCustomer(body) {
  const { name, email, password, phone, ownerId } = body;
  // Validate owner exists
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  const owner = owners.find(o => o.id === ownerId);
  if (!owner) return { success: false, error: 'Water station not found.' };

  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  if (customers.find(c => c.email === email)) return { success: false, error: 'Email already registered.' };

  const id = generateId();
  getSheet(SHEETS.CUSTOMERS).appendRow([id, ownerId, name, email, hashPassword(password), phone, '', '', '', false, now()]);
  return { success: true, message: 'Registration successful! Please wait for your water station to approve your account.' };
}

function sanitizeOwner(o) {
  return { id: o.id, name: o.name, email: o.email, businessName: o.businessName, phone: o.phone, address: o.address, pricePerContainer: o.pricePerContainer, discountEnabled: o.discountEnabled, discountPercent: o.discountPercent };
}
function sanitizeCustomer(c) {
  return { id: c.id, ownerId: c.ownerId, name: c.name, email: c.email, phone: c.phone, lat: c.lat, lng: c.lng, locationLabel: c.locationLabel, approved: c.approved };
}

// ============================================================
// OWNER ACTIONS
// ============================================================
function getOwnerDashboard(body) {
  const ownerId = body._user.userId;
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS)).filter(o => o.ownerId === ownerId);
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS)).filter(c => c.ownerId === ownerId);
  const approved = customers.filter(c => c.approved === true || c.approved === 'TRUE' || c.approved === 'true');
  const pending = customers.filter(c => !(c.approved === true || c.approved === 'TRUE' || c.approved === 'true'));
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const delivered = orders.filter(o => o.status === 'delivered');
  const totalRevenue = delivered.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const todayRevenue = delivered.filter(o => new Date(o.deliveredAt).toDateString() === today)
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const pending_orders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed');

  // Weekly data (last 7 days)
  const weekly = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const dayOrders = delivered.filter(o => new Date(o.deliveredAt).toDateString() === ds);
    weekly.push({ day: d.toLocaleDateString('en-US',{weekday:'short'}), revenue: dayOrders.reduce((s,o) => s + Number(o.totalAmount||0), 0), orders: dayOrders.length });
  }

  return { success: true, dashboard: {
    totalCustomers: approved.length, pendingApprovals: pending.length,
    totalOrders: orders.length, todayOrders: todayOrders.length,
    totalRevenue, todayRevenue,
    pendingDeliveries: pending_orders.length,
    weeklyData: weekly
  }};
}

function getOwnerCustomers(body) {
  const ownerId = body._user.userId;
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS))
    .filter(c => c.ownerId === ownerId)
    .map(sanitizeCustomer);
  return { success: true, customers };
}

function ownerAddCustomer(body) {
  // Owner manually adds a customer - auto-approved
  const ownerId = body._user.userId;
  const { name, email, phone, username, password } = body;
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const loginEmail = email || (username + '@aquatrack.local');
  if (customers.find(c => c.email === loginEmail)) return { success: false, error: 'Username already taken. Try a different one.' };
  const id = generateId();
  getSheet(SHEETS.CUSTOMERS).appendRow([id, ownerId, name, loginEmail, hashPassword(password), phone || '', '', '', '', true, now()]);
  return { success: true, customer: { id, ownerId, name, email: loginEmail, phone, approved: true } };
}

function approveCustomer(body) {
  const sheet = getSheet(SHEETS.CUSTOMERS);
  const row = findRow(sheet, 'id', body.customerId);
  if (row < 0) return { success: false, error: 'Customer not found' };
  updateRow(sheet, row, { approved: true });
  return { success: true };
}

function rejectCustomer(body) {
  const sheet = getSheet(SHEETS.CUSTOMERS);
  const row = findRow(sheet, 'id', body.customerId);
  if (row < 0) return { success: false, error: 'Customer not found' };
  sheet.deleteRow(row);
  return { success: true };
}

function setPrice(body) {
  const ownerId = body._user.userId;
  const { pricePerContainer, discountEnabled, discountPercent } = body;
  const ownerSheet = getSheet(SHEETS.OWNERS);
  const row = findRow(ownerSheet, 'id', ownerId);
  if (row > 0) updateRow(ownerSheet, row, { pricePerContainer, discountEnabled, discountPercent });
  const priceSheet = getSheet(SHEETS.PRICES);
  const prow = findRow(priceSheet, 'ownerId', ownerId);
  if (prow > 0) updateRow(priceSheet, prow, { pricePerContainer, discountEnabled, discountPercent, updatedAt: now() });
  else priceSheet.appendRow([ownerId, pricePerContainer, discountEnabled, discountPercent, now()]);
  return { success: true };
}

function getMapData(body) {
  const ownerId = body._user.userId;
  const filter = body.filter || 'all'; // 'all' or 'requesting'
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS))
    .filter(c => c.ownerId === ownerId && (c.approved === true || c.approved === 'TRUE' || c.approved === 'true'))
    .map(sanitizeCustomer);
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS))
    .filter(o => o.ownerId === ownerId && (o.status === 'pending' || o.status === 'confirmed'));
  const requestingIds = new Set(orders.map(o => o.customerId));
  let result = customers.filter(c => c.lat && c.lng);
  if (filter === 'requesting') result = result.filter(c => requestingIds.has(c.id));
  // Attach order info
  result = result.map(c => ({
    ...c,
    order: orders.find(o => o.customerId === c.id) || null
  }));
  return { success: true, customers: result };
}

function markDelivered(body) {
  const sheet = getSheet(SHEETS.ORDERS);
  const row = findRow(sheet, 'id', body.orderId);
  if (row < 0) return { success: false, error: 'Order not found' };
  updateRow(sheet, row, { status: 'delivered', deliveredAt: now() });
  // Clear chat for this order
  clearChatByOrder(body.orderId);
  return { success: true };
}

function getOrders(body) {
  const ownerId = body._user.userId;
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS)).filter(o => o.ownerId === ownerId);
  // Attach customer names
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const enriched = orders.map(o => {
    const cust = customers.find(c => c.id === o.customerId);
    return { ...o, customerName: cust ? cust.name : 'Unknown', customerPhone: cust ? cust.phone : '' };
  });
  return { success: true, orders: enriched.reverse() };
}

// ============================================================
// CUSTOMER ACTIONS
// ============================================================
function updateLocation(body) {
  const customerId = body._user.userId;
  const { lat, lng, locationLabel } = body;
  const sheet = getSheet(SHEETS.CUSTOMERS);
  const row = findRow(sheet, 'id', customerId);
  if (row < 0) return { success: false, error: 'Customer not found' };
  updateRow(sheet, row, { lat, lng, locationLabel: locationLabel || '' });
  return { success: true };
}

function placeOrder(body) {
  const customerId = body._user.userId;
  const { containers, urgency, notes } = body;
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return { success: false, error: 'Customer not found' };

  // Get price
  const prices = sheetToObjects(getSheet(SHEETS.PRICES));
  const price = prices.find(p => p.ownerId === customer.ownerId);
  const base = Number(price ? price.pricePerContainer : 25);
  const discount = (price && (price.discountEnabled === true || price.discountEnabled === 'TRUE' || price.discountEnabled === 'true'))
    ? Number(price.discountPercent || 0) : 0;
  const total = containers * base * (1 - discount / 100);

  // Check no existing pending order
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS));
  const existing = orders.find(o => o.customerId === customerId && (o.status === 'pending' || o.status === 'confirmed'));
  if (existing) return { success: false, error: 'You already have an active order. Please wait for delivery.' };

  const id = generateId();
  // Assign queue position = current pending count + 1
  const allOrders = sheetToObjects(getSheet(SHEETS.ORDERS));
  const pendingCount = allOrders.filter(o => o.ownerId === customer.ownerId && (o.status === 'pending' || o.status === 'confirmed')).length;
  const queuePos = pendingCount + 1;
  getSheet(SHEETS.ORDERS).appendRow([id, customerId, customer.ownerId, containers, total, urgency || 'normal', 'pending', notes || '', queuePos, now(), '']);
  return { success: true, order: { id, containers, totalAmount: total, urgency, status: 'pending' } };
}

function getMyOrders(body) {
  const customerId = body._user.userId;
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS)).filter(o => o.customerId === customerId);
  return { success: true, orders: orders.reverse() };
}

function cancelOrder(body) {
  const sheet = getSheet(SHEETS.ORDERS);
  const row = findRow(sheet, 'id', body.orderId);
  if (row < 0) return { success: false, error: 'Order not found' };
  updateRow(sheet, row, { status: 'cancelled' });
  return { success: true };
}

function getMyOwner(body) {
  const customerId = body._user.userId;
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return { success: false, error: 'Not found' };
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  const owner = owners.find(o => o.id === customer.ownerId);
  if (!owner) return { success: false, error: 'Owner not found' };
  const prices = sheetToObjects(getSheet(SHEETS.PRICES));
  const price = prices.find(p => p.ownerId === owner.id);
  return { success: true, owner: sanitizeOwner(owner), price };
}

// ============================================================
// CHAT
// ============================================================
function sendMessage(body) {
  const { orderId, message } = body;
  const senderId = body._user.userId;
  const senderRole = body._user.role;
  const id = generateId();
  getSheet(SHEETS.CHAT).appendRow([id, orderId, senderId, senderRole, message, now()]);
  return { success: true };
}

function getMessages(body) {
  const { orderId } = body;
  const messages = sheetToObjects(getSheet(SHEETS.CHAT)).filter(m => m.orderId === orderId);
  // Attach sender names
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const enriched = messages.map(m => {
    let senderName = 'Unknown';
    if (m.senderRole === 'owner') {
      const o = owners.find(o => o.id === m.senderId);
      senderName = o ? o.businessName : 'Station';
    } else {
      const c = customers.find(c => c.id === m.senderId);
      senderName = c ? c.name : 'Customer';
    }
    return { ...m, senderName };
  });
  return { success: true, messages: enriched };
}

function clearChat(body) {
  clearChatByOrder(body.orderId);
  return { success: true };
}

function clearChatByOrder(orderId) {
  const sheet = getSheet(SHEETS.CHAT);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return;
  const orderCol = data[0].indexOf('orderId');
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][orderCol]) === String(orderId)) sheet.deleteRow(i + 1);
  }
}



// ============================================================
// QUEUE MANAGEMENT
// ============================================================
function getQueue(body) {
  const ownerId = body._user.userId;
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS))
    .filter(o => o.ownerId === ownerId && (o.status === 'pending' || o.status === 'confirmed'));
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS));
  const enriched = orders.map(o => {
    const cu = customers.find(c => c.id === o.customerId);
    return { ...o, customerName: cu ? cu.name : 'Unknown', customerPhone: cu ? cu.phone : '' };
  }).sort((a, b) => (Number(a.queuePosition)||999) - (Number(b.queuePosition)||999));
  return { success: true, queue: enriched };
}

function updateQueueOrder(body) {
  const sheet = getSheet(SHEETS.ORDERS);
  const queueItems = body.queue || [];
  queueItems.forEach(item => {
    const row = findRow(sheet, 'id', item.id);
    if (row > 0) updateRow(sheet, row, { queuePosition: item.queuePosition });
  });
  return { success: true };
}

// ============================================================
// CUSTOMER — MULTI-STATION & STATS
// ============================================================
function getMyOrdersAllStations(body) {
  const customerId = body._user.userId;
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS))
    .filter(o => o.customerId === customerId && o.status === 'delivered');
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  const enriched = orders.map(o => {
    const ow = owners.find(x => x.id === o.ownerId);
    return { ...o, stationName: ow ? ow.businessName : 'Unknown Station' };
  });
  const stations = owners.filter(x => x.approved === true || x.approved === 'TRUE' || x.approved === 'true')
    .map(x => ({ id: x.id, businessName: x.businessName, address: x.address, pricePerContainer: x.pricePerContainer }));
  return { success: true, orders: enriched, stations };
}

function getAllStationsForCustomer(body) {
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS))
    .filter(x => (x.approved === true || x.approved === 'TRUE' || x.approved === 'true') && !(x.locked === true || x.locked === 'TRUE' || x.locked === 'true'));
  return { success: true, stations: owners.map(x => ({ id: x.id, businessName: x.businessName, address: x.address, pricePerContainer: x.pricePerContainer })) };
}

function switchStation(body) {
  const customerId = body._user.userId;
  const { ownerId } = body;
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS));
  const owner = owners.find(o => o.id === ownerId && (o.approved === true || o.approved === 'TRUE' || o.approved === 'true'));
  if (!owner) return { success: false, error: 'Station not found or not available.' };
  const sheet = getSheet(SHEETS.CUSTOMERS);
  const row = findRow(sheet, 'id', customerId);
  if (row < 0) return { success: false, error: 'Customer not found.' };
  updateRow(sheet, row, { ownerId });
  return { success: true };
}

function getInactiveCustomers(body) {
  const ownerId = body._user.userId;
  const thresholdDays = Number(body.days) || 30;
  const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  const customers = sheetToObjects(getSheet(SHEETS.CUSTOMERS))
    .filter(c => c.ownerId === ownerId && (c.approved === true || c.approved === 'TRUE' || c.approved === 'true'));
  const orders = sheetToObjects(getSheet(SHEETS.ORDERS))
    .filter(o => o.ownerId === ownerId && o.status === 'delivered');

  const result = customers.map(cu => {
    const custOrders = orders.filter(o => o.customerId === cu.id).sort((a, b) => new Date(b.deliveredAt) - new Date(a.deliveredAt));
    const lastOrder = custOrders[0];
    const lastDelivered = lastOrder ? lastOrder.deliveredAt : '';
    const daysSince = lastDelivered ? Math.floor((Date.now() - new Date(lastDelivered).getTime()) / 86400000) : 999;
    return { ...sanitizeCustomer(cu), lastDelivered, daysSince };
  });

  const inactive = result.filter(x => x.daysSince >= thresholdDays).sort((a, b) => b.daysSince - a.daysSince);
  const all = result.sort((a, b) => a.daysSince - b.daysSince);
  return { success: true, inactive, all, threshold: thresholdDays };
}

// ============================================================
// ADMIN FUNCTIONS
// ============================================================
function requireSuperAdmin(body) {
  return body._user && body._user.userId === 'superadmin' && body._user.role === 'superadmin';
}

function adminGetOwners(body) {
  if (!requireSuperAdmin(body)) return { success: false, error: 'Unauthorized' };
  const owners = sheetToObjects(getSheet(SHEETS.OWNERS)).map(o => ({
    id: o.id, name: o.name, email: o.email, businessName: o.businessName,
    phone: o.phone, address: o.address, createdAt: o.createdAt,
    approved: o.approved, locked: o.locked, trialEnd: o.trialEnd,
    pricePerContainer: o.pricePerContainer
  }));
  return { success: true, owners };
}

function adminApproveOwner(body) {
  if (!requireSuperAdmin(body)) return { success: false, error: 'Unauthorized' };
  const sheet = getSheet(SHEETS.OWNERS);
  const row = findRow(sheet, 'id', body.ownerId);
  if (row < 0) return { success: false, error: 'Owner not found' };
  const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  updateRow(sheet, row, { approved: true, locked: false, trialEnd });
  return { success: true };
}

function adminLockOwner(body) {
  if (!requireSuperAdmin(body)) return { success: false, error: 'Unauthorized' };
  const sheet = getSheet(SHEETS.OWNERS);
  const row = findRow(sheet, 'id', body.ownerId);
  if (row < 0) return { success: false, error: 'Owner not found' };
  updateRow(sheet, row, { locked: true });
  // Invalidate all sessions for this owner
  const sessSheet = getSheet(SHEETS.SESSIONS);
  const sessions = sheetToObjects(sessSheet);
  sessions.forEach((s, i) => {
    if (s.userId === body.ownerId) sessSheet.deleteRow(i + 2);
  });
  return { success: true };
}

function adminUnlockOwner(body) {
  if (!requireSuperAdmin(body)) return { success: false, error: 'Unauthorized' };
  const sheet = getSheet(SHEETS.OWNERS);
  const row = findRow(sheet, 'id', body.ownerId);
  if (row < 0) return { success: false, error: 'Owner not found' };
  const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  updateRow(sheet, row, { locked: false, trialEnd });
  return { success: true };
}

function adminDeleteOwner(body) {
  if (!requireSuperAdmin(body)) return { success: false, error: 'Unauthorized' };
  const ownerId = body.ownerId;
  // Delete owner row
  const ownerSheet = getSheet(SHEETS.OWNERS);
  const oRow = findRow(ownerSheet, 'id', ownerId);
  if (oRow > 0) ownerSheet.deleteRow(oRow);
  // Delete their customers
  const custSheet = getSheet(SHEETS.CUSTOMERS);
  const custs = sheetToObjects(custSheet).filter(c => c.ownerId === ownerId);
  custs.forEach(() => {
    const r = findRow(custSheet, 'ownerId', ownerId);
    if (r > 0) custSheet.deleteRow(r);
  });
  // Delete prices
  const priceSheet = getSheet(SHEETS.PRICES);
  const pRow = findRow(priceSheet, 'ownerId', ownerId);
  if (pRow > 0) priceSheet.deleteRow(pRow);
  return { success: true };
}

function adminExtendTrial(body) {
  if (!requireSuperAdmin(body)) return { success: false, error: 'Unauthorized' };
  const sheet = getSheet(SHEETS.OWNERS);
  const row = findRow(sheet, 'id', body.ownerId);
  if (row < 0) return { success: false, error: 'Owner not found' };
  const owner = sheetToObjects(sheet).find(o => o.id === body.ownerId);
  const base = owner && owner.trialEnd && new Date(owner.trialEnd) > new Date() ? new Date(owner.trialEnd) : new Date();
  const newTrialEnd = new Date(base.getTime() + (body.days || 15) * 24 * 60 * 60 * 1000).toISOString();
  updateRow(sheet, row, { trialEnd: newTrialEnd, locked: false });
  return { success: true };
}

// ============================================================
// GET ALL OWNERS (for customer registration dropdown)
// ============================================================
function doGet_owners(e) {
  if (e.parameter.action === 'getOwners') {
    const owners = sheetToObjects(getSheet(SHEETS.OWNERS))
      .map(o => ({ id: o.id, businessName: o.businessName, address: o.address }));
    return respond({ success: true, owners });
  }
}
