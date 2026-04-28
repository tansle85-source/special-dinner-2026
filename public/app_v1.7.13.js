// --- System v1.7.5 INITIALIZATION ---
/**
 * Company Appreciation Night 2026 - Client App
 * Version: v1.7.6 (ROBUST-INITIALIZATION)
 * Last Updated: 2026-04-27
 * Description: Moved DOM element assignments to init() and fixed seating view visibility
 * 
 * Changelog:
 * - v1.7.4: Fixed countdown hang and removed duplicate logic.
 * - v1.7.3: Distributed PAX locking and focused Admin interface.
 * - v1.6.88: Fixed sidebar tab active state and cleaned up redundant functions.
 * - v1.6.87: Integrated Google Gemini AI for feedback analysis.
 * - v1.6.86: Optimized data load with request coalescing.
 */

console.log("?? System v1.7.6 INITIALIZING...");
console.log("?? Location:", window.location.href);

// Device ID for locking synchronization
function getDeviceId() {
    var id = localStorage.getItem('deviceId');
    if (!id) {
        id = 'dev-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', id);
    }
    return id;
}
var DEVICE_ID = getDeviceId();

// Booking Session ID (Tab-specific, survives refresh)
var bookingSessionId = sessionStorage.getItem('bookingSessionId') || Math.random().toString(36).substring(2, 15);
sessionStorage.setItem('bookingSessionId', bookingSessionId);

var profileLockHeartbeat = null;
var reservationTimerInterval = null;
var reservationTimeLeft = 0; // in seconds

 function startProfileLockHeartbeat(empId) {
    if (profileLockHeartbeat) clearInterval(profileLockHeartbeat);
    profileLockHeartbeat = setInterval( function() {
        if (!currentBookingEmployee || currentBookingEmployee.id !== empId) {
            stopProfileLockHeartbeat();
            return;
        }
        console.log("[Heartbeat] Refreshing lock for " + (empId));
         lockProfile(empId);
    }, 2 * 60 * 1000); // Pulse every 2 minutes
}

function stopProfileLockHeartbeat() {
    if (profileLockHeartbeat) {
        clearInterval(profileLockHeartbeat);
        profileLockHeartbeat = null;
    }
}

 function lockProfile(empId) {
    try {
        var res =  fetch((API_BASE) + "/api/profile/lock", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, sessionId: bookingSessionId })
        });
        if (!res.ok) {
            var err =  res.json();
            showToast(err.error || "Profile is already in use.", "danger");
            return false;
        }
        return true;
    } catch (err) {
        console.error("Lock error:", err);
        return false;
    }
}

 function unlockProfile(empId) {
    stopProfileLockHeartbeat();
    try {
         fetch((API_BASE) + "/api/profile/unlock", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, sessionId: bookingSessionId })
        });
    } catch (err) {
        console.error("Unlock error:", err);
    }
}

function diagLog(msg, color) {
    if (color === undefined) color = 'white';
    console.log("[Diag]", msg);
    var logBox = document.getElementById('diag-log-box');
    if (logBox) {
        var entry = document.createElement('div');
        entry.style.color = color;
        entry.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
        entry.style.padding = "2px 0";
        entry.innerText = "[" + (new Date().toLocaleTimeString()) + "] " + (msg);
        logBox.prepend(entry);
    }
}

window.onerror = function(message, source, lineno, colno, error) {
    var errorMsg = "[Global Error] " + (message) + "\\nSource: " + (source) + "\\nLine: " + (lineno);
    diagLog("FATAL: " + message + " at line " + lineno, "red");
    console.error(errorMsg);
    if (!message.includes('ResizeObserver')) {
        alert("?????System Error Detected!\n" + message + " at line " + lineno);
    }
    return false;
};

// Constants
var TOTAL_TABLES = 60;
var SEATS_PER_TABLE = 11;

// --- Reservation Timeout Logic (10 Minutes) ---
function startReservationTimer() {
    var timerEl = document.getElementById('reservation-timer');
    if (!timerEl) return;

    // Reset state
    if (reservationTimerInterval) clearInterval(reservationTimerInterval);
    reservationTimeLeft = 5 * 60; // 5 minutes (as requested)
    timerEl.style.display = 'block';
    
    updateReservationTimerUI();

    reservationTimerInterval = setInterval(function() {
        reservationTimeLeft--;
        updateReservationTimerUI();

        if (reservationTimeLeft <= 0) {
            stopReservationTimer();
            handleReservationTimeout();
        }
    }, 1000);
}

function updateReservationTimerUI() {
    var timerEl = document.getElementById('reservation-timer');
    if (!timerEl) return;

    var minutes = Math.floor(reservationTimeLeft / 60);
    var seconds = reservationTimeLeft % 60;
    var timeStr = (minutes) + ":" + (seconds.toString().padStart(2, '0'));
    
    timerEl.innerText = "? Booking will expire in: " + (timeStr);
    
    // Visual warning at 2 minutes
    if (reservationTimeLeft < 120) {
        timerEl.style.color = '#ff4d4d';
        timerEl.style.transform = 'scale(1.05)';
    } else {
        timerEl.style.color = 'var(--danger)';
        timerEl.style.transform = 'scale(1)';
    }
}

// --- Live Lock Timers for Other Users (v1.5.86) ---
function updateLiveLockTimers() {
    var now = Date.now();
    var timers = document.querySelectorAll('.lock-timer');
    timers.forEach(function(timer) {
        var expires = parseInt(timer.dataset.expires);
        if (!expires || isNaN(expires)) return;

        var secondsLeft = Math.floor((expires - now) / 1000);
        if (secondsLeft <= 0) {
            timer.innerText = "(Expired)";
            // Optional: trigger data reload if it just expired
            if (secondsLeft === 0) loadData();
            return;
        }

        var m = Math.floor(secondsLeft / 60);
        var s = secondsLeft % 60;
        timer.innerText = "(" + (m) + ":" + (s.toString().padStart(2, '0')) + ")";
        
        // Color warning for low time
        if (secondsLeft < 60) {
            timer.style.color = '#ff4d4d';
            timer.style.fontWeight = '800';
        }
    });
}

function stopReservationTimer() {
    if (reservationTimerInterval) {
        clearInterval(reservationTimerInterval);
        reservationTimerInterval = null;
    }
    var timerEl = document.getElementById('reservation-timer');
    if (timerEl) timerEl.style.display = 'none';
}

 function handleReservationTimeout() {
    console.warn("[Timer] Reservation timeout reached.");
    alert("???our booking time has expired (5 minutes).\nThe table has been released for others. Please try again if you still wish to book.");
    
    // Unlock and close
     unlockTable();
    modal.classList.add('hidden');
}

// Maintenance Bypass Check
var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('bypass') === 'true') {
    localStorage.setItem('maintenance_bypass', 'true');
    // Remove query param to clean up URL
    var newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.history.replaceState({path: newUrl}, '', newUrl);
}



// 1. Robust Subdirectory Detection
var API_BASE = "";

// Detect subdirectory by looking at the pathname relative to known base routes
var currentPath = window.location.pathname;
var baseRoutes = ['/seating', '/luckydraw', '/entertainment', '/home', '/checkin', '/admin', '/identify', '/seatselection', '/view-home', '/voting', '/bestdress', '/nominations'];

var detectedSubdir = "";
for (var route of baseRoutes) {
    if (currentPath.includes(route)) {
        detectedSubdir = currentPath.substring(0, currentPath.indexOf(route));
        break;
    }
}

// Fallback: If no known route is found, try to detect from the script path itself
if (!detectedSubdir) {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].src.includes('app.js')) {
            var scriptUrl = new URL(scripts[i].src);
            var pathParts = scriptUrl.pathname.split('/');
            pathParts.pop(); // Remove 'app.js'
            detectedSubdir = pathParts.join('/');
            break;
        }
    }
}

if (detectedSubdir && detectedSubdir !== "/") {
    API_BASE += detectedSubdir.replace(/\/$/, "");
    console.log("[Config] Subdirectory detected: " + (detectedSubdir));
}

API_BASE = API_BASE.replace(/\/$/, "");
console.log("[Config] Final API_BASE:", API_BASE);
console.log("[Config] Current Pathname:", window.location.pathname);

// State
var appData = {
    tables: [],
    employees: [],
    admins: [],
    settings: {},
    serverTimeOffset: 0,
    tableLocks: {},
    profileLocks: {}
};
var lastDataLoadTime = 0;
var loadDataTimeout = null;
var RELOAD_THROTTLE = 2000; // 2 seconds throttle for 600+ users
var currentUser = null; // Decoupled session state
var currentLuckydrawSession = 1;
var isListView = window.innerWidth < 768; // Default to list on mobile
var seatingMode = 'seat'; // 'seat' or 'table' (Guest View)
var adminSeatingMode = 'seat'; // 'seat' or 'table' (Admin View)

// --- ATTACH GLOBAL FUNCTIONS EARLY ---
window.openDoorGiftModal = function(empId) {
    try {
        console.log("[DoorGift] openDoorGiftModal triggered for ID:", empId);
        if (!appData.employees || appData.employees.length === 0) {
            console.warn("[DoorGift] appData.employees is empty!");
            showToast("Data not loaded yet. Please wait.", "error");
            return;
        }
        var emp = appData.employees.find(function(e) { return String(e.id; }) === String(empId));
        if (!emp) {
            console.error("[DoorGift] Employee not found:", empId);
            showToast("Employee record not found.", "error");
            return;
        }
        if (emp.door_gift_claimed === 1 || emp.door_gift_claimed === true) {
            showToast("Door gift already claimed!", "info");
            return;
        }

        if (!emp.checked_in) {
            showToast("?????Please check in " + (emp.name) + " first!", "danger");
            diagLog("[DoorGift] Blocked: " + (emp.name) + " not checked in.", "red");
            return;
        }

        // Fill Modal
        var nameEl = document.getElementById('dg-modal-name');
        var idEl = document.getElementById('dg-modal-id');
        var tableEl = document.getElementById('dg-modal-table');
        var dietEl = document.getElementById('dg-modal-diet');
        var statusEl = document.getElementById('dg-modal-status');
        
        if (nameEl) nameEl.innerText = emp.name;
        if (idEl) idEl.innerText = emp.id;
        if (dietEl) dietEl.innerText = emp.diet || 'Standard';
        if (statusEl) statusEl.innerHTML = emp.checked_in ? '<span style="color: var(--seat-checked-in);">Checked In</span>' : '<span style="color: var(--danger);">Not Checked In</span>';

        var tableNo = "Not Assigned";
        if (appData.tables) {
            for (var t = 0; t < appData.tables.length; t++) {
                var seat = appData.tables[t].find(function(s) { return s && String(s.empId; }) === String(empId));
                if (seat) { tableNo = (t + 1); break; }
            }
        }
        if (tableEl) tableEl.innerText = tableNo;

        if (doorGiftEmpId) doorGiftEmpId.value = empId;
        if (doorGiftPinInput) doorGiftPinInput.value = '';
        if (doorGiftError) doorGiftError.style.display = 'none';
        var doorGiftHeader = document.getElementById('door-gift-header');
        if (doorGiftHeader) doorGiftHeader.classList.remove('hidden');
        if (doorGiftSuccessMsg) doorGiftSuccessMsg.classList.add('hidden');
        if (doorGiftEmpInfo) doorGiftEmpInfo.classList.remove('hidden');
        if (doorGiftForm) doorGiftForm.classList.remove('hidden');

        if (doorGiftModal) {
            diagLog("Opening Door Gift Modal for: " + emp.name, "lime");
            // Force visibility for mobile stability
            doorGiftModal.style.setProperty('display', 'flex', 'important');
            doorGiftModal.style.setProperty('visibility', 'visible', 'important');
            doorGiftModal.style.setProperty('opacity', '1', 'important');
            doorGiftModal.style.setProperty('z-index', '20000', 'important');
            doorGiftModal.classList.remove('hidden');
            setTimeout(function() { if (doorGiftPinInput) doorGiftPinInput.focus(); }, 150);
        } else {
            console.error("[DoorGift] modal element MISSING (modal-door-gift-claim)!");
        }
    } catch (err) {
        console.error("[DoorGift] Exception:", err);
    }
};

window.revokeDoorGift =  function(empId) {
    var pin = prompt("Enter committee PIN to revoke this door gift claim:");
    if (!pin) return;

    try {
        var res =  fetch((API_BASE) + "/api/door-gift/revoke", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, pin })
        });
        var data =  res.json();
        if (!res.ok) {
            alert(data.error || 'Failed to revoke door gift claim.');
            return;
        }
        showToast("Door gift claim revoked successfully.", "success");
         loadData();
        renderDoorGiftMgmt();
    } catch (err) {
        alert('Server error while revoking door gift claim.');
    }
};
window.closeDoorGiftModal =  function() {
    console.log("[DoorGift] closeDoorGiftModal triggered");
    if (doorGiftModal) {
        doorGiftModal.classList.add('hidden');
        doorGiftModal.style.removeProperty('display');
        doorGiftModal.style.removeProperty('visibility');
        doorGiftModal.style.removeProperty('opacity');
        doorGiftModal.style.display = 'none';
    }
};

window.claimDoorGiftFast =  function(empId) {
    if (!empId) return;
    try {
        var res =  fetch((API_BASE) + "/api/checkin/combined", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId })
        });
        var data =  res.json();
        if (!res.ok) {
            alert(data.error || 'Failed to claim door gift.');
            return;
        }
        showToast("Gift marked as claimed for " + (data.name || 'guest') + ".", "success");
         loadData();
        if (typeof renderDoorGiftMgmt === 'function') renderDoorGiftMgmt();
    } catch (err) {
        alert('Server error while claiming door gift.');
    }
};

window.deletePrize =  function(prizeId) {
    if (confirm("Are you sure you want to delete this prize? Any drawn winners for it will be lost.")) {
        try {
            var res =  fetch((API_BASE) + "/api/prize/delete", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: prizeId })
            });
            if (!res.ok) {
                var data =  res.json();
                alert(data.error || 'Failed to delete prize.');
                return;
            }
             loadData();
            renderAdminDashboard();
            if (typeof renderLuckyDrawWinners === 'function' && !adminTabLuckydraw.classList.contains('hidden')) {
                renderLuckyDrawWinners();
            }
            showToast("Prize deleted.");
        } catch (err) {
            alert('Server error while deleting prize.');
        }
    }
};


window.closeCreatePrizeModal = function() {
    console.log("TRIGGER: closeCreatePrizeModal");
    var m = document.getElementById('modal-prize-create');
    if (m) {
        m.classList.add('hidden');
        m.style.removeProperty('display');
        m.style.removeProperty('visibility');
        m.style.removeProperty('opacity');
        m.style.display = 'none';
    }
};

window.closeEditPrizeModal = function() {
    console.log("TRIGGER: closeEditPrizeModal");
    var m = document.getElementById('modal-prize-edit');
    if (m) {
        m.classList.add('hidden');
        m.style.removeProperty('display');
        m.style.removeProperty('visibility');
        m.style.removeProperty('opacity');
        m.style.display = 'none';
        console.log("SUCCESS: Edit modal hidden.");
    } else {
        console.error("ERROR: modal-prize-edit not found during close!");
    }
};

// DOM Elements
var navSeating = document.getElementById('nav-seating');
var navCheckin = document.getElementById('nav-checkin');
var navLuckydraw = document.getElementById('nav-luckydraw');
var navEntertainment = document.getElementById('nav-entertainment');
var navAdmin = document.getElementById('nav-admin');
var navHome = document.getElementById('nav-home');

var viewIdentify = document.getElementById('view-identify');
var viewSeating = document.getElementById('view-seating');
var viewCheckin = document.getElementById('view-checkin');
var viewLuckydraw = document.getElementById('view-luckydraw');
var viewEntertainment = document.getElementById('view-entertainment');
var viewAdmin = document.getElementById('view-admin');
var viewHome = document.getElementById('view-home');
var eventTimerInput = document.getElementById('event-timer-input');
var btnSaveEventTimer = document.getElementById('btn-save-event-timer');
var btnSaveDoorGiftPin = document.getElementById('btn-save-door-gift-pin');
var doorGiftPinSettingInput = document.getElementById('door-gift-pin-setting');
var btnResetEmployees = document.getElementById('btn-admin-reset-employees');
var floorLayout, listLayout, btnToggleView, modal, closeModal, resForm, modalTitle, modalSeatInfo, modalEmpName;
var multiPaxLocks = new Set(); // Track PAX locked during current session
var currentBookingName, btnChangeProfile, identifySearchInput, btnIdentifySearch, identifyResults;
var toast, toastMessage, searchInput;

var btnSearch = document.getElementById('btn-search');
var checkinResults = document.getElementById('checkin-results');

var statTotal = document.getElementById('stat-total');
var statReserved = document.getElementById('stat-reserved');
var statAvailable = document.getElementById('stat-available');
var statCheckedin = document.getElementById('stat-checkedin');
var adminTableBody = document.getElementById('admin-table-body');
var adminSearchEmp = document.getElementById('admin-search-emp');
var btnClearFilters = document.getElementById('btn-clear-filters');

var btnCreateEmp = document.getElementById('btn-create-emp');
var btnImportCsv = document.getElementById('btn-import-csv');
var csvUpload = document.getElementById('csv-upload');
var adminEmpModal = document.getElementById('modal-employee-create');
var elCloseAdminEmpModal = document.getElementById('close-admin-emp-modal');
var adminEmpForm = document.getElementById('admin-emp-form');

var adminEditEmpModal = document.getElementById('modal-employee-edit');
var elCloseAdminEditEmpModal = document.getElementById('close-admin-edit-emp-modal');
var adminEditEmpForm = document.getElementById('admin-edit-emp-form');

var adminEditSeatModal = document.getElementById('admin-edit-seat-modal');
var elCloseEditSeatModal = document.getElementById('close-edit-seat-modal');
var adminEditSeatForm = document.getElementById('admin-edit-seat-form');
var editTableSelect = document.getElementById('edit-table-select');
var editSeatSelect = document.getElementById('edit-seat-select');
var editSeatEmpName = document.getElementById('edit-seat-emp-name');

var adminLoginModal = document.getElementById('admin-login-modal');
var closeAdminLoginModal = document.getElementById('close-admin-login-modal');
var adminLoginForm = document.getElementById('admin-login-form');
var adminLoginUsername = document.getElementById('admin-login-username');
var adminLoginPassword = document.getElementById('admin-login-password');
var btnTestConnection = document.getElementById('btn-test-connection');

var createAdminForm = document.getElementById('create-admin-form');
var createAdminModal = document.getElementById('modal-admin-user-create');
var elCloseCreateAdminModal = document.getElementById('close-create-admin-modal');

var editAdminModal = document.getElementById('modal-admin-user-edit-v135');
var elCloseEditAdminModal = document.getElementById('close-edit-admin-modal');
var editAdminForm = document.getElementById('edit-admin-form');

var adminBatchModal = document.getElementById('admin-batch-table-modal');
var elCloseAdminBatchModal = document.getElementById('close-admin-batch-modal');
var adminBatchForm = document.getElementById('admin-batch-table-form');
var adminBatchPaxContainer = document.getElementById('admin-batch-pax-container');
var adminBatchTableIdxInput = document.getElementById('admin-batch-table-idx');
var btnBatchClearAll = document.getElementById('btn-batch-clear-all');
var newAdminUsername = document.getElementById('new-admin-username');
var newAdminPassword = document.getElementById('new-admin-password');
var newAdminPasswordConfirm = document.getElementById('new-admin-password-confirm');

var btnCreateAdmin = document.getElementById('btn-create-admin');
var adminProfilesTableBody = document.getElementById('admin-profiles-table-body');

var sessionBtns = document.querySelectorAll('.session-btn');
var publicSessionBtns = document.querySelectorAll('.public-session-btn');
var btnDrawWinner = document.getElementById('btn-draw-winner');
var winnerDisplay = document.getElementById('winner-display');
var btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
var luckydrawWinnersBody = document.getElementById('luckydraw-winners-body');
var publicLuckydrawWinnersBody = document.getElementById('public-luckydraw-winners-body');
var publicLuckydrawWinnersCards = document.getElementById('public-luckydraw-winners-cards');
var publicLuckydrawWinnersTableContainer = document.getElementById('public-luckydraw-winners-table-container');
var luckydrawEligibleBody = document.getElementById('luckydraw-eligible-body');
var eligibleCountTable = document.getElementById('eligible-count-table');
var wheelContainer = document.getElementById('wheel-container');
var canvas = document.getElementById('drawing-wheel');
var ctx = canvas ? canvas.getContext('2d') : null;

var activePrizeBanner = document.getElementById('active-prize-banner');
var activePrizeName = document.getElementById('active-prize-name');
var btnNextPrize = document.getElementById('btn-next-prize');
var btnRedrawLast = document.getElementById('btn-redraw-last');

var adminSessionSummary = document.getElementById('admin-session-summary');
var adminSessionTotalQty = document.getElementById('admin-session-total-qty');

var publicSessionSummary = document.getElementById('public-session-summary');
var publicSessionTotalQty = document.getElementById('public-session-total-qty');

var btnCreatePrize = document.getElementById('btn-create-prize');
var btnResetLuckyDraw = document.getElementById('btn-reset-luckydraw');
var adminPrizesTableBody = document.getElementById('admin-prizes-table-body');

var adminTabBtnDashboard = document.getElementById('admin-tab-btn-dashboard');
var adminTabBtnDirectory = document.getElementById('admin-tab-btn-directory');
var adminTabBtnVisual = document.getElementById('admin-tab-btn-visual');
var adminTabBtnPrizes = document.getElementById('admin-tab-btn-prizes');
var adminTabBtnLuckydraw = document.getElementById('admin-tab-btn-luckydraw');
var adminTabBtnClaims = document.getElementById('admin-tab-btn-claims');
var adminTabBtnDoorgifts = document.getElementById('admin-tab-btn-doorgifts');

// Redraw Modal
var modalRedrawConfirm = document.getElementById('modal-redraw-confirm');
var btnConfirmRedrawAction = document.getElementById('btn-confirm-redraw');
var btnCancelRedrawAction = document.getElementById('btn-cancel-redraw');
var adminTabBtnEntertainment = document.getElementById('admin-tab-btn-entertainment');
var adminTabBtnFeedbackResults = document.getElementById('admin-tab-btn-feedback-results');
var adminTabBtnSettings = document.getElementById('admin-tab-btn-settings');
var feedbackThemeInput = document.getElementById('feedback-theme-input');
var adminTabBtnFeedbackManager = document.getElementById('admin-tab-btn-feedback');
var adminTabFeedbackManager = null; // Removed
var eligibleCountInfo = document.getElementById('eligible-count-info');

var adminTabDashboard = document.getElementById('admin-tab-dashboard');
var adminTabDirectory = document.getElementById('admin-tab-directory');
var adminTabVisual = document.getElementById('admin-tab-visual');
var adminTabPrizes = document.getElementById('admin-tab-prizes');
var adminTabLuckydraw = document.getElementById('admin-tab-luckydraw');
var adminTabClaims = document.getElementById('admin-tab-claims');
var adminTabEntertainment = document.getElementById('admin-tab-entertainment');
var adminTabFeedbackResults = document.getElementById('admin-tab-feedback-results');
var adminTabSettings = document.getElementById('admin-tab-settings');

// Admin Sidebar Tabs (Global Scope)
var adminTabBtns = [
    document.getElementById('admin-tab-btn-dashboard'), 
    document.getElementById('admin-tab-btn-directory'),
    document.getElementById('admin-tab-btn-visual'),
    document.getElementById('admin-tab-btn-prizes'),
    document.getElementById('admin-tab-btn-luckydraw'),
    document.getElementById('admin-tab-btn-claims'),
    document.getElementById('admin-tab-btn-doorgifts'),
    document.getElementById('admin-tab-btn-settings')
];
var adminTabViews = [
    document.getElementById('admin-tab-dashboard'),
    document.getElementById('admin-tab-directory'),
    document.getElementById('admin-tab-visual'),
    document.getElementById('admin-tab-prizes'),
    document.getElementById('admin-tab-luckydraw'),
    document.getElementById('admin-tab-claims'),
    document.getElementById('admin-tab-doorgifts'),
    document.getElementById('admin-tab-settings')
];

// Add Door Gift Elements
var adminTabBtnDoorgifts = document.getElementById('admin-tab-btn-doorgifts');
var adminTabDoorgifts = document.getElementById('admin-tab-doorgifts');
var doorgiftsSearchInput = document.getElementById('doorgift-search');
var doorgiftsFilterStatus = document.getElementById('doorgift-filter-status');
var doorgiftsFilterDiet = document.getElementById('doorgift-filter-diet');
var adminDoorgiftsTableBody = document.getElementById('admin-doorgifts-table-body');
var statDoorgiftClaimed = document.getElementById('stat-doorgift-claimed');
var statDoorgiftPending = document.getElementById('stat-doorgift-pending');


// Entertainment Sub-tabs
var adminSubtabBtnVoting = document.getElementById('admin-subtab-btn-voting');
var adminSubtabBtnNominations = document.getElementById('admin-subtab-btn-nominations');
var adminSubtabBtnFeedback = document.getElementById('admin-subtab-btn-feedback');
var adminSubtabVotingContent = document.getElementById('admin-subtab-voting-content');
var adminSubtabNominationsContent = document.getElementById('admin-subtab-nominations-content');
var adminSubtabFeedbackContent = document.getElementById('admin-subtab-feedback-content');

var adminClaimsTableBody = document.getElementById('claims-table-body');
var claimsSearchInput = document.getElementById('claims-search');
var claimsFilterSession = document.getElementById('claims-filter-session');
var claimsFilterStatus = document.getElementById('claims-filter-status');

var doorGiftModal = document.getElementById('modal-door-gift-claim');
var elCloseDoorGiftModal = document.getElementById('close-door-gift-modal');
var doorGiftForm = document.getElementById('door-gift-form');
var doorGiftPinInput = document.getElementById('door-gift-pin-input');
var doorGiftError = document.getElementById('door-gift-error');
var doorGiftEmpId = document.getElementById('door-gift-emp-id');
var doorGiftSuccessMsg = document.getElementById('door-gift-success-msg');
var doorGiftEmpInfo = document.getElementById('door-gift-emp-info');

var adminFloorLayout = document.getElementById('admin-visual-floor-layout');
var filterDept = document.getElementById('filter-dept');
var filterStatus = document.getElementById('filter-status');
var filterCheckin = document.getElementById('filter-checkin');

var createPrizeModal = document.getElementById('modal-prize-create');
var elCloseCreatePrizeModal = document.getElementById('close-create-prize-modal');
var createPrizeForm = document.getElementById('create-prize-form');
var newPrizeSession = document.getElementById('new-prize-session');
var newPrizeName = document.getElementById('new-prize-name');
var newPrizeRank = document.getElementById('new-prize-rank');
var newPrizeQty = document.getElementById('new-prize-qty');

var editPrizeModal = document.getElementById('modal-prize-edit');
var elCloseEditPrizeModal = document.getElementById('close-edit-prize-modal');
var editPrizeForm = document.getElementById('edit-prize-form');
var editPrizeId = document.getElementById('edit-prize-id');
var editPrizeSession = document.getElementById('edit-prize-session');
var editPrizeName = document.getElementById('edit-prize-name');
var editPrizeRank = document.getElementById('edit-prize-rank');
var editPrizeQty = document.getElementById('edit-prize-qty');

var currentSelectedSeat = null; // { tableIdx, seatIdx }
var currentBookingEmployee = null; // the employee object currently booking
var currentEditingSeat = null; // { tIdx, sIdx, empId } for admin move

var isAdminLoggedIn = false; // keep track of admin session
var heartbeatInterval = null;
var stickyPrizeId = null; // Prize ID to keep active after a redraw/revoke

// Helper for consistent settings access
function getSettingValue(key) {
    if (appData.settings && appData.settings[key] !== undefined) {
        return appData.settings[key];
    }
    // Default values
    var offByDefault = ['maintenance_mode', 'feature_voting_performance', 'feature_voting_bestdress', 'feature_feedback'];
    return offByDefault.includes(key) ? 'off' : 'on';
}

 function updateSetting(key, value) {
    try {
        var res =  fetch((API_BASE) + "/api/settings/update", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        if (!res.ok) throw new Error("Server error: " + (res.status));
        if (!appData.settings) appData.settings = {};
        appData.settings[key] = value;
        console.log("[Settings] Updated " + (key) + " = " + (value));
    } catch (err) {
        console.error("[Settings] Error updating " + (key) + ":", err);
        throw err;
    }
}

function setupPaxAutocomplete() {
    var inputs = document.querySelectorAll('.pax-autocomplete');
    inputs.forEach(function(input) {
        var resultsEl = input.nextElementSibling;
        
        input.addEventListener('input', function() {
            var query = input.value.trim().toLowerCase();
            if (query.length < 1) {
                resultsEl.classList.add('hidden');
                return;
            }

            // Get all currently seated employee IDs
            var seatedIds = new Set();
            appData.tables.forEach(function(table) {
                table.forEach(function(seat) {
                    if (seat && seat.empId) seatedIds.add(seat.empId);
                });
            });

            // Also get names currently entered in the modal to prevent intra-table duplicates
            var currentModalNames = new Set();
            for (var i = 0; i < 11; i++) {
                var val = document.getElementById("pax-input-" + (i)).value.trim().toLowerCase();
                if (val) currentModalNames.add(val);
            }

            var matches = appData.employees.filter(function(emp) {
                // Skip if already seated at another table
                if (seatedIds.has(emp.id)) return false; 
                // Skip if already entered in this modal (by name)
                if (currentModalNames.has(emp.name.toLowerCase())) return false;
                
                return (emp.name && emp.name.toLowerCase().includes(query)) ||
                       (emp.id && emp.id.toLowerCase().includes(query));
            }).slice(0, 5); // Limit to top 5 results

            if (matches.length > 0) {
                resultsEl.innerHTML = '';
                matches.forEach(function(emp) {
                    var item = document.createElement('div');
                    item.className = 'pax-search-item';
                    item.innerHTML = "\r\n                        <div class=\"pax-search-name\">" + (emp.name) + "</div>\r\n                        <div class=\"pax-search-meta\">" + (emp.dept) + "</div>\r\n                    ";
                    item.addEventListener('click',  function() {
                        // If this input already had a locked PAX, unlock them first
                        var oldEmpId = input.dataset.empId;
                        if (oldEmpId && multiPaxLocks.has(oldEmpId)) {
                            unlockProfile(oldEmpId);
                            multiPaxLocks.delete(oldEmpId);
                        }

                        input.value = emp.name;
                        input.dataset.empId = emp.id; // Store ID for strict enforcement
                        
                        // LOCK NEW PAX
                        if (emp.id) {
                            try {
                                 lockProfile(emp.id);
                                multiPaxLocks.add(emp.id);
                                console.log("[Lock] PAX locked:", emp.id);
                            } catch (err) {
                                showToast("Could not lock colleague: " + emp.name + ". They might be booking elsewhere.", "warning");
                            }
                        }

                        resultsEl.classList.add('hidden');
                    });
                    resultsEl.appendChild(item);
                });
                resultsEl.classList.remove('hidden');
            } else {
                resultsEl.classList.add('hidden');
            }
        });

        input.addEventListener('focus', function() {
            if (input.value.trim().length > 0) {
                // Re-trigger search on focus if input isn't empty
                input.dispatchEvent(new Event('input'));
            }
        });
    });

    // Close all search results when clicking outside
    document.addEventListenerfunction('click', (e) {
        if (!e.target.closest('.pax-search-container')) {
            document.querySelectorAll('.pax-search-results').forEach(function(el) { return el.classList.add('hidden'; }));
        }
    });
}

// Initialize
function checkMaintenanceMode() {
    var isMaintenance = getSettingValue('maintenance_mode') === 'on';
    var hasBypass = localStorage.getItem('maintenance_bypass') === 'true';
    var maintenanceOverlay = document.getElementById('maintenance-overlay');
    
    if (maintenanceOverlay) {
        if (isMaintenance && !hasBypass && !isAdminLoggedIn) {
            maintenanceOverlay.classList.remove('hidden');
        } else {
            maintenanceOverlay.classList.add('hidden');
        }
    }
}

window.addEventListenerfunction('popstate', (e) {
    if (e.state && e.state.view) {
        switchView(e.state.view, false);
    } else {
        handleUrlRoute();
    }
});

function handleUrlRoute() {
    var path = window.location.pathname;
    
    if (path.includes('/admin')) {
        switchView('admin', false);
    } else if (path.includes('/seating') || path.includes('/identify') || path.includes('/seatselection')) {
        switchView('seating', false);
    } else if (path.includes('/checkin')) {
        switchView('checkin', false);
    } else if (path.includes('/luckydraw')) {
        switchView('luckydraw', false);
    } else if (path.includes('/entertainment')) {
        switchView('entertainment', false);
    } else {
        switchView('home', false);
    }
}

 function loadData(force = false) {
    var now = Date.now();
    if (!force && (now - lastDataLoadTime < RELOAD_THROTTLE)) {
        console.log("[Data] Throttling loadData fetch...");
        if (!loadDataTimeout) {
            loadDataTimeout = setTimeout(function() {
                loadDataTimeout = null;
                loadData(true);
            }, RELOAD_THROTTLE - (now - lastDataLoadTime) + 100);
        }
        return;
    }
    lastDataLoadTime = now;
    if (loadDataTimeout) {
        clearTimeout(loadDataTimeout);
        loadDataTimeout = null;
    }

    console.log("[Data] Fetching from: " + (API_BASE) + "/api/data");
    try {
        var res =  fetch((API_BASE) + "/api/data");
        if (!res.ok) {
            var errorText =  res.text().catch(() => "No error body");
            throw new Error("Server returned " + (res.status) + ": " + (errorText));
        }
        var freshData =  res.json();
        // Preserving local-only appData keys if any, but primarily merging server data
        Object.assign(appData, freshData);
        
        console.log("[Data] Load successful:", appData.employees.length, "employees");
        console.log("[Data] Settings loaded:", JSON.stringify(appData.settings));

        // Ensure tables are properly sized
        while (appData.tables.length < TOTAL_TABLES) {
            var row = [];
            for (var j = 0; j < SEATS_PER_TABLE; j++) row.push(null);
            appData.tables.push(row);
        }
        // updateEligibleCount(); // Removed v1.5.71 to resolve ReferenceError
        updateCancelButtonVisibility();
        enforcePermissions(); // Force re-enforcement after any data refresh
    } catch (err) {
        console.error('[Data] Load Failed:', err);
        var fullUrl = (API_BASE) + "/api/data";
        alert("Load Failed!\\n\\nTarget URL: " + (fullUrl) + "\\nError: " + (err.message) + "\\n\\nPlease check if the server is running and accessible at this address.");
    }
}

// Deprecated ??backend now handles persistence via API
// function saveData() { }


function setupEventListeners() {
    var pullIndicator = document.getElementById('pull-to-refresh');
    // Admin Tabs
    if (adminTabBtnDashboard) adminTabBtnDashboard.addEventListener('click',  function() { showAdminTab(adminTabDashboard, adminTabBtnDashboard); renderAdminDashboard(); });
    if (adminTabBtnDirectory) adminTabBtnDirectory.addEventListener('click',  function() { showAdminTab(adminTabDirectory, adminTabBtnDirectory); renderAdminDirectory(); });
    if (adminTabBtnVisual) adminTabBtnVisual.addEventListener('click',  function() { showAdminTab(adminTabVisual, adminTabBtnVisual); renderVisualAdminMap(); });
    if (adminTabBtnDoorgifts) adminTabBtnDoorgifts.addEventListener('click',  function() { showAdminTab(adminTabDoorgifts, adminTabBtnDoorgifts); renderDoorGiftMgmt(); });
    if (adminTabBtnSettings) adminTabBtnSettings.addEventListener('click',  function() { showAdminTab(adminTabSettings, adminTabBtnSettings); renderSettings(); });
    if (adminTabBtnPrizes) adminTabBtnPrizes.addEventListener('click',  function() { showAdminTab(adminTabPrizes, adminTabBtnPrizes); renderAdminDashboard(); });
    if (adminTabBtnLuckydraw) adminTabBtnLuckydraw.addEventListener('click',  function() { showAdminTab(adminTabLuckydraw, adminTabBtnLuckydraw); renderLuckyDrawWinners(); });
    if (adminTabBtnClaims) adminTabBtnClaims.addEventListener('click',  function() { showAdminTab(adminTabClaims, adminTabBtnClaims); renderWinnerClaims(); });

    if (navSeating) navSeating.addEventListener('click',  () => switchView('seating'));
    if (navCheckin) navCheckin.addEventListener('click',  () => switchView('checkin'));
    if (navLuckydraw) navLuckydraw.addEventListener('click',  () => switchView('luckydraw'));
    if (navEntertainment) navEntertainment.addEventListener('click',  () => switchView('entertainment'));
    if (navHome) navHome.addEventListener('click',  () => switchView('home'));

    if (navAdmin) navAdmin.addEventListener('click',  function() {
        if (isAdminLoggedIn) {
            switchView('admin');
        } else {
            adminLoginForm.reset();
            adminLoginModal.classList.remove('hidden');
        }
    });

    var logoutBtn = document.getElementById('admin-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click',  function() {
            isAdminLoggedIn = false;
            currentUser = null;
            switchView('identify');
            showToast("Logged out successfully.");
            checkMaintenanceMode();
            updateCancelButtonVisibility();
        });
    }

    // Mobile Tab Bar
    document.querySelectorAll('.mobile-tab-btn').forEach(function(btn) {
        btn.addEventListener('click',  function() {
            var view = btn.dataset.view;
            if (view === 'admin' && !isAdminLoggedIn) {
                adminLoginForm.reset();
                adminLoginModal.classList.remove('hidden');
            } else {
                switchView(view);
            }
        });
    });

    if (closeAdminLoginModal) {
        closeAdminLoginModal.addEventListener('click',  function() {
            console.log("CLICK: closeAdminLoginModal");
            if (adminLoginModal) adminLoginModal.classList.add('hidden');
        });
    }



    if (elCloseAdminEmpModal) {
        elCloseAdminEmpModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseAdminEmpModal");
            if (adminEmpModal) adminEmpModal.classList.add('hidden');
        });
    }

    if (elCloseAdminEditEmpModal) {
        elCloseAdminEditEmpModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseAdminEditEmpModal");
            if (adminEditEmpModal) adminEditEmpModal.classList.add('hidden');
        });
    }

    if (elCloseEditSeatModal) {
        elCloseEditSeatModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseEditSeatModal");
            if (adminEditSeatModal) adminEditSeatModal.classList.add('hidden');
        });
    }

    if (elCloseCreateAdminModal) {
        elCloseCreateAdminModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseCreateAdminModal");
            if (createAdminModal) createAdminModal.classList.add('hidden');
        });
    }

    if (elCloseEditAdminModal) {
        elCloseEditAdminModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseEditAdminModal");
            if (editAdminModal) editAdminModal.classList.add('hidden');
        });
    }

    if (elCloseAdminBatchModal) {
        elCloseAdminBatchModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseAdminBatchModal");
            if (adminBatchModal) adminBatchModal.classList.add('hidden');
        });
    }

    if (elCloseDoorGiftModal) {
        elCloseDoorGiftModal.addEventListener('click',  function() {
            console.log("CLICK: elCloseDoorGiftModal");
            if (doorGiftModal) doorGiftModal.classList.add('hidden');
        });
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListenerfunction('submit',  (e) {
            e.preventDefault();
            var user = adminLoginUsername.value.trim();
            var pass = adminLoginPassword.value.trim();
            try {
                var res =  fetch((API_BASE) + "/api/admin/login", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass })
                });

                if (!res.ok) {
                    var errorText =  res.text().catch(() => "No error body");
                    throw new Error("Server returned " + (res.status) + ": " + (errorText));
                }

                var data =  res.json();
                isAdminLoggedIn = true;
                currentUser = data; // Store in decoupled variable
                adminLoginModal.classList.add('hidden');
                enforcePermissions();
                switchView('admin');
                checkMaintenanceMode();
            } catch (err) {
                console.error('[Login] Error:', err);
                var fullUrl = (API_BASE) + "/api/admin/login";
                alert("Login Failed!\n\nTarget URL: " + (fullUrl) + "\nError: " + (err.message) + "\n\nPossible causes:\n1. Server is down or restarting.\n2. Corporate proxy/firewall is blocking POST requests.\n3. VPN is disconnected.\n4. Browser cache is stale (Try Ctrl+F5).");
            }
        });
    }

    if (btnTestConnection) {
        btnTestConnection.addEventListener('click',  function() {
            var originalText = btnTestConnection.innerHTML;
            btnTestConnection.innerHTML = "???esting...";
            btnTestConnection.disabled = true;

            var testUrl = (API_BASE) + "/api/health";
            var controller = new AbortController();
            var timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            try {
                console.log("[Diagnostics] Testing connection to:", testUrl);
                var start = Date.now();
                var res =  fetch(testUrl, { signal: controller.signal });
                clearTimeout(timeoutId);
                var duration = Date.now() - start;

                if (res.ok) {
                    var data =  res.json();
                    alert("??Connection Successful!\\n\\nURL: " + (testUrl) + "\\nResponse Time: " + (duration) + "ms\\nServer Status: " + (data.status) + "\\nMessage: " + (data.message || 'Ready'));
                } else {
                    var errStatus = res.status;
                    var errBody =  res.text().catch(() => "No body");
                    alert("??Server Responded with Error\\n\\nURL: " + (testUrl) + "\\nStatus: " + (errStatus) + "\\nResponse: " + (errBody) + "\\n\\nThis means the server is reachable, but the backend is failing (check database).");
                }
            } catch (err) {
                clearTimeout(timeoutId);
                console.error("[Diagnostics] Connection failed:", err);
                var errorMsg = err.name === 'AbortError' ? "Request Timed Out (10s)" : err.message;
                alert("      Connection Failed!\\n\\nTarget URL: " + (testUrl) + "\\nError: " + (errorMsg) + "\\n\\n1. Check if the server is running on this port.\\n2. Check for CORS or firewall blocks.\\n3. Verify the subdirectory path.");
            } finally {
                btnTestConnection.innerHTML = originalText;
                btnTestConnection.disabled = false;
            }
        });
    }

    if (btnCreateAdmin) {
        btnCreateAdmin.addEventListener('click',  function() {
            if (createAdminForm) createAdminForm.reset();
            if (createAdminModal) createAdminModal.classList.remove('hidden');
        });
    }

    if (elCloseCreateAdminModal) {
        elCloseCreateAdminModal.addEventListener('click',  function() {
            if (createAdminModal) createAdminModal.classList.add('hidden');
        });
    }

    document.getElementById('new-admin-role')?.addEventListenerfunction('change', (e) {
        var section = document.getElementById('new-admin-permissions-section');
        if (section) section.style.display = e.target.value.includes('Super Admin') ? 'none' : 'block';
    });
    
    document.getElementById('edit-admin-role')?.addEventListenerfunction('change', (e) {
        var section = document.getElementById('edit-admin-permissions-section');
        if (section) section.style.display = e.target.value.includes('Super Admin') ? 'none' : 'block';
    });

    // Toggle All Permissions Logic
    var toggleAll = function(allSelector, itemSelector) {
        var allCb = document.getElementById(allSelector);
        var itemCbs = document.querySelectorAll(itemSelector);
        if (!allCb) return;
        allCb.addEventListener('change', function() {
            itemCbs.forEach(function(cb) { return cb.checked = allCb.checked; });
        });
        itemCbs.forEach(function(cb) {
            cb.addEventListener('change', function() {
                var total = itemCbs.length;
                var checked = document.querySelectorAll((itemSelector) + ":checked").length;
                allCb.checked = total === checked;
                allCb.indeterminate = checked > 0 && checked < total;
            });
        });
    };
    toggleAll('new-admin-perms-all', '#new-admin-permissions-section input[name="permissions"]');
    toggleAll('edit-admin-perms-all', '#edit-admin-permissions-section input[name="edit-permissions"]');

    if (createAdminForm) {
        createAdminForm.addEventListenerfunction('submit',  (e) {
            e.preventDefault();
            var fullName = document.getElementById('new-admin-fullname').value.trim();
            var user = newAdminUsername.value.trim();
            var role = document.getElementById('new-admin-role').value.trim();
            var pass = newAdminPassword.value.trim();
            var confirm = newAdminPasswordConfirm.value.trim();
            if (pass !== confirm) { alert("Passwords do not match."); return; }
            var perms = Array.from(document.querySelectorAll('#new-admin-permissions-section input[name="permissions"]:checked')).map(function(cb) { return cb.value; });
            try {
                var res =  fetch((API_BASE) + "/api/admin/add", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: user, password: pass, fullName, role, permissions: JSON.stringify(perms) })
                });
                var data =  res.json();
                if (!res.ok) { alert(data.error); return; }
                if (createAdminModal) createAdminModal.classList.add('hidden');
                 loadData();
                renderAdminDashboard();
                showToast("Admin profile created.");
            } catch (err) {
                alert('Server error. Please try again.');
            }
        });
    }

    function updateToggleButton(btn, key, val) {
        var isOn = val === 'on';
        if (isOn) {
            btn.classList.add('active');
            btn.style.background = 'var(--accent-gold)';
            btn.style.color = '#000';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.color = 'white';
        }
        
        // Update texts with dynamic prefixes
        if (key.includes('performance')) {
            btn.textContent = isOn ? 'PERF: ON' : 'PERF: OFF';
        } else if (key === 'feature_bestdress_nominate') {
            btn.textContent = isOn ? 'NOMS: ON' : 'NOMS: OFF';
        } else if (key.includes('bestdress')) {
            btn.textContent = isOn ? 'VOTE: ON' : 'VOTE: OFF';
        } else if (key.includes('seating')) {
            btn.textContent = isOn ? 'SEATS: ON' : 'SEATS: OFF';
        } else if (key.includes('checkin')) {
            btn.textContent = isOn ? 'CHECKIN: ON' : 'CHECKIN: OFF';
        } else if (key.includes('luckydraw')) {
            btn.textContent = isOn ? 'DRAW: ON' : 'DRAW: OFF';
        } else if (key.includes('maintenance')) {
            btn.textContent = isOn ? 'MAINT: ON' : 'MAINT: OFF';
            btn.style.background = isOn ? '#ef4444' : 'rgba(255,255,255,0.1)'; 
            btn.style.color = 'white';
        }
    }

    // Lucky Draw UI
    sessionBtns.forEachfunction(function(btn) {
        btn.addEventListener('click', (e) {
            sessionBtns.forEach(function(b) { return b.classList.remove('active'; }));
            currentLuckydrawSession = parseInt(btn.dataset.session);
            winnerDisplay.innerHTML = '<h3 style="color: var(--text-muted); font-weight: normal;">Ready to draw...</h3>';
            renderLuckyDrawWinners();

        });
    });

    // Public Lucky Draw UI
    publicSessionBtns.forEachfunction(function(btn) {
        btn.addEventListener('click', (e) {
            publicSessionBtns.forEach(function(b) { return b.classList.remove('active'; }));
            e.target.classList.add('active');
            currentLuckydrawSession = parseInt(e.target.dataset.session);
            renderLuckyDrawWinners();

        });
    });

    // btnDrawWinner event listener removed in favor of HTML onclick to avoid double-firing or scoping issues

    // Admin Lucky Draw management
    // btnCreatePrize listener moved to window.showCreatePrizeModal (HTML onclick)

    if (createPrizeForm) {
        createPrizeForm.addEventListenerfunction('submit',  (e) {
            e.preventDefault();
            var session = parseInt(newPrizeSession.value);
            var name = newPrizeName.value.trim();
            var rank = newPrizeRank.value;
            var qty = parseInt(newPrizeQty.value);
            var id = 'prize_' + Date.now();
            try {
                var res =  fetch((API_BASE) + "/api/prize/add", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, session, name, quantity: qty, prize_rank: rank })
                });
                if (!res.ok) { var d =  res.json(); alert(d.error); return; }
                alert("Success: Prize added. Closing modal now.");
                if (window.closeCreatePrizeModal) window.closeCreatePrizeModal();
                 loadData();
                renderAdminDashboard();
                showToast("Prize added.");
            } catch (err) {
                alert('Server error.');
            }
        });
    }

    // closeEditPrizeModal listener moved to window.closeEditPrizeModal (HTML onclick)

    if (editPrizeForm) {
        editPrizeForm.addEventListenerfunction('submit',  (e) {
            e.preventDefault();
            var id = editPrizeId.value;
            var session = parseInt(editPrizeSession.value);
            var name = editPrizeName.value.trim();
            var rank = editPrizeRank.value;
            var qty = parseInt(editPrizeQty.value);

            try {
                var res =  fetch((API_BASE) + "/api/prize/update", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, session, name, quantity: qty, prize_rank: rank })
                });

                if (!res.ok) {
                    var data =  res.json();
                    alert(data.error || 'Failed to update prize.');
                    return;
                }

                alert("Success: Prize updated. Closing modal now.");
                if (window.closeEditPrizeModal) window.closeEditPrizeModal();
                 loadData();
                renderAdminDashboard();
                showToast("Prize updated.");
            } catch (err) {
                alert('Server error.');
            }
        });
    }

    if (btnResetLuckyDraw) {
        btnResetLuckyDraw.addEventListener('click',  function() {
            if (confirm("Are you sure you want to reset ALL lucky draw winners for all sessions?")) {
                try {
                     fetch((API_BASE) + "/api/luckydraw/reset", { method: 'POST' });
                     loadData();
                    renderAdminDashboard();
                    if (adminTabLuckydraw && !adminTabLuckydraw.classList.contains('hidden')) renderLuckyDrawWinners();
                    showToast("All Lucky Draw winners reset.");
                } catch (err) {
                    alert('Server error.');
                }
            }
        });
    }

    // Modal
    // [v1.5.20 Unification] 

    var prizeCsvUpload = document.getElementById('prize-csv-upload');
    if (prizeCsvUpload) {
        prizeCsvUpload.addEventListener('change', handlePrizeCsvUpload);
    }

    if (closeModal) {
        closeModal.addEventListener('click',  function() {
    unlockTable();
    modal.classList.add('hidden');
        });
    }

    var cancelModalBtn = document.getElementById('btn-cancel-modal');
    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click',  function() {
            stopReservationTimer();
            unlockTable();
            modal.classList.add('hidden');
        });
    }

    var btnCancelBooking = document.getElementById('btn-cancel-booking');
    if (btnCancelBooking) {
        btnCancelBooking.addEventListener('click', cancelTableBooking);
    }

    if (resForm) {
        resForm.addEventListener('submit', handleReservationSubmit);
    }

    // Door Gift Modal
    var doorGiftForm = document.getElementById('door-gift-form');
    if (doorGiftForm) {
        doorGiftForm.addEventListener('submit', submitDoorGiftClaim);
    }

    // Check-in Search
    var btnSearch = document.getElementById('btn-search');
    if (btnSearch) {
        btnSearch.addEventListener('click', performSearch);
    }
    if (searchInput) {
        searchInput.addEventListenerfunction('keypress', (e) {
            if (e.key === 'Enter') performSearch();
        });
    }

    var versionBadge = document.getElementById('debug-version-badge');
    if (versionBadge) versionBadge.textContent = "v1.7.6 (FORCE-REFRESH)";

    // Identify
    if (btnIdentifySearch) btnIdentifySearch.addEventListener('click', performIdentifySearch);
    if (identifySearchInput) {
        var searchTimeout;
        identifySearchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(performIdentifySearch, 300);
        });
        identifySearchInput.addEventListenerfunction('keypress', (e) {
            if (e.key === 'Enter') {
                clearTimeout(searchTimeout);
                performIdentifySearch();
            }
        });
    }

    if (btnChangeProfile) {
        btnChangeProfile.addEventListener('click',  function() {
            if (currentBookingEmployee) {
                unlockProfile(currentBookingEmployee.id);
                currentBookingEmployee = null;
            }
            switchView('identify');
        });
    }

    // Release locks when closing/reloading page
    window.addEventListener('beforeunload', function() {
        if (currentBookingEmployee) {
            unlockProfile(currentBookingEmployee.id);
        }
        if (currentSelectedSeat) {
            var { tableIdx } = currentSelectedSeat;
            // No direct  call in beforeunload
        }
    });

    // Admin Add Employee Modal
    if (btnCreateEmp) {
        btnCreateEmp.addEventListener('click',  function() {
            adminEmpForm.reset();
            adminEmpModal.classList.remove('hidden');
        });
    }

    if (elCloseAdminEmpModal) {
        elCloseAdminEmpModal.addEventListener('click',  function() {
            if (adminEmpModal) adminEmpModal.classList.add('hidden');
        });
    }

    if (adminEmpForm) adminEmpForm.addEventListener('submit', handleAddEmployeeSubmit);

    // Admin Edit Employee Modal
    if (elCloseAdminEditEmpModal) {
        elCloseAdminEditEmpModal.addEventListener('click',  function() {
            if (adminEditEmpModal) adminEditEmpModal.classList.add('hidden');
        });
    }

    if (adminEditEmpForm) adminEditEmpForm.addEventListener('submit', handleEditEmployeeSubmit);

    // Batch CSV Import
    if (btnImportCsv) {
        btnImportCsv.addEventListener('click',  function() {
            csvUpload.click();
        });
    }

    if (csvUpload) csvUpload.addEventListener('change', handleCsvUpload);

    if (adminSearchEmp) adminSearchEmp.addEventListener('input', renderAdminDirectory);
    if (filterDept) filterDept.addEventListener('change', renderAdminDirectory);
    if (filterStatus) filterStatus.addEventListener('change', renderAdminDirectory);
    if (filterCheckin) filterCheckin.addEventListener('change', renderAdminDirectory);
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', clearDirectoryFilters);
    }

    // Winner Claims Filters


    // Door Gift Management Filters
    if (doorgiftsSearchInput) doorgiftsSearchInput.addEventListener('input', renderDoorGiftMgmt);
    if (doorgiftsFilterStatus) doorgiftsFilterStatus.addEventListener('change', renderDoorGiftMgmt);
    if (doorgiftsFilterDiet) doorgiftsFilterDiet.addEventListener('change', renderDoorGiftMgmt);

    // Export Seating
    var btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportSeatingToCSV);
    }

    // Edit Seat Modal
    if (elCloseEditSeatModal) {
        elCloseEditSeatModal.addEventListener('click',  function() {
            if (adminEditSeatModal) adminEditSeatModal.classList.add('hidden');
        });
    }

    if (adminEditSeatForm) adminEditSeatForm.addEventListener('submit', handleAdminEditSeatSubmit);
    
    // Batch Table Modal
    if (elCloseAdminBatchModal) {
        elCloseAdminBatchModal.addEventListener('click',  function() {
            if (adminBatchModal) adminBatchModal.classList.add('hidden');
        });
    }
    if (adminBatchForm) adminBatchForm.addEventListener('submit', handleAdminBatchSubmit);
    
    if (btnBatchClearAll) {
        btnBatchClearAll.addEventListener('click',  function() {
            if (confirm("Clear all selections in this table?")) {
                document.querySelectorAll('#admin-batch-table-body input[type="checkbox"]').forEach(function(cb) { return cb.checked = false; });
            }
        });
    }

    // --- NEWLY CONSOLIDATED LISTENERS (from cleanup) ---
    var btnBatchQR = document.getElementById('btn-admin-batch-qr');
    if (btnBatchQR) btnBatchQR.addEventListener('click', generateBatchQR);
    
    var btnToggleManual = document.getElementById('btn-toggle-manual-search');
    if (btnToggleManual) {
        btnToggleManual.addEventListener('click',  function() {
            document.getElementById('manual-search-overlay').classList.remove('hidden');
        });
    }
    
    var btnCloseManual = document.getElementById('btn-close-manual');
    if (btnCloseManual) {
        btnCloseManual.addEventListener('click',  function() {
            document.getElementById('manual-search-overlay').classList.add('hidden');
        });
    }
    
    var btnCfmCheckin = document.getElementById('btn-confirm-checkin');
    if (btnCfmCheckin) btnCfmCheckin.addEventListener('click', handleConfirmCheckin);

    var btnConfirmGift = document.getElementById('btn-confirm-gift');
    var btnCancelGift = document.getElementById('btn-cancel-gift');
    var navGift = document.getElementById('nav-doorgift');

    if (btnConfirmGift) btnConfirmGift.addEventListener('click', handleConfirmDoorgift);
    if (btnCancelGift) btnCancelGift.addEventListener('click', resetDoorGiftUI);
    if (navGift) navGift.addEventListener('click',  () => switchView('doorgift'));
    
    if (btnResetEmployees) {
        btnResetEmployees.addEventListener('click', handleAdminResetEmployees);
    }

    // Auto-update seat dropdown when table dropdown changes
    if (editTableSelect) editTableSelect.addEventListener('change', updateEditSeatDropdown);

    // Zoom
    var scale = 1;
    var zoomIn = document.getElementById('zoom-in');
    var zoomOut = document.getElementById('zoom-out');
    if (zoomIn) {
        zoomIn.addEventListener('click',  function() {
            if (scale < 2) scale += 0.2;
            floorLayout.style.transform = "scale(" + (scale) + ")";
        });
    }
    if (zoomOut) {
        zoomOut.addEventListener('click',  function() {
            if (scale > 0.4) scale -= 0.2;
            floorLayout.style.transform = "scale(" + (scale) + ")";
        });
    }

    // Feature Toggles logic (v1.5.87 Robust)
    document.addEventListenerfunction('click',  (e) {
        var toggleBtn = e.target.closest('.toggle-feature');
        if (toggleBtn) {
            var key = toggleBtn.dataset.feature;
            if (!key) return;
            
            var currentValue = getSettingValue(key);
            var newValue = currentValue === 'on' ? 'off' : 'on';

            console.log("[Admin] Toggle requested for " + (key) + ": " + (currentValue) + " -> " + (newValue));
            
            // UI Feedback: Loading
            toggleBtn.disabled = true;
            toggleBtn.style.opacity = '0.5';
            var originalText = toggleBtn.innerText;
            toggleBtn.innerText = "...";

            try {
                 updateSetting(key, newValue);
                // renderSettings will be called via updateSetting -> broadcast -> sse or we can call it manually
                // But updateSetting already updates appData.settings
                renderSettings();
                showToast((key.replace('feature_', '').toUpperCase()) + " is now " + (newValue.toUpperCase()), "info");
            } catch (err) {
                console.error("[Admin] Toggle failed:", err);
                showToast("Failed to update setting.", "danger");
                toggleBtn.innerText = originalText;
            } finally {
                toggleBtn.disabled = false;
                toggleBtn.style.opacity = '1';
            }
        }
    });

    // Close Winner Reveal
    var btnCloseReveal = document.getElementById('btn-close-winner-reveal');
    if (btnCloseReveal) {
        btnCloseReveal.addEventListener('click',  function() {
            document.getElementById('view-winner-reveal').classList.add('hidden');
        });
    }

    // Admin Dashboard Refresh
    var refreshBtn = document.getElementById('admin-refresh-data-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click',  function() {
            var originalText = refreshBtn.innerText;
            refreshBtn.innerText = "Loading...";
            refreshBtn.disabled = true;
             loadData();
            renderAdminDashboard();
            refreshBtn.innerText = originalText;
            refreshBtn.disabled = false;
        });
    }


// ==========================================
// --- ADMINISTRATIVE GLOBAL FUNCTIONS ---
// ==========================================

 function handleAdminResetEmployees() {
    var confirm1 = confirm("?????CRITICAL ACTION: Are you sure you want to reset the employee database?\n\nThis will ERASE all employees, seat bookings, check-ins, and winners.");
    if (!confirm1) return;

    var confirm2 = confirm("FINAL CONFIRMATION: This action is permanent and cannot be undone.\n\nOnly Admin accounts and Prizes will be preserved. Proceed?");
    if (!confirm2) return;

    try {
        showToast("???esetting database...");
        var res =  fetch((API_BASE) + "/api/admin/employees/reset", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        var data =  res.json();
        if (res.ok) {
            alert("??Employee database has been reset.");
            window.location.reload();
        } else {
            alert("??Reset failed: " + data.error);
        }
    } catch (err) {
        console.error("Reset error:", err);
        alert("??Network error during reset.");
    }
}

// --- DOOR GIFT SCANNER LOGIC ---
var currentGiftUser = null;

function resetDoorGiftUI() {
    var preview = document.getElementById('gift-id-preview');
    var details = document.getElementById('gift-active-user');
    var success = document.getElementById('gift-success-pane');
    
    if (preview) preview.classList.remove('hidden');
    if (details) details.classList.add('hidden');
    if (success) success.classList.add('hidden');
    currentGiftUser = null;
}

function onDoorGiftScanSuccess(decodedText) {
    if (currentGiftUser) return;
    var emp = appData.employees.find(function(e) { return String(e.id; }) === String(decodedText) || e.email === decodedText);
    if (!emp) {
        showToast("Guest not found: " + (decodedText), "danger");
        return;
    }
    currentGiftUser = emp;
    renderDoorGiftDetails(emp);
    if (!emp.door_gift_claimed && emp.checked_in) {
        handleConfirmDoorgift();
    }
}

function renderDoorGiftDetails(emp) {
    document.getElementById('gift-id-preview').classList.add('hidden');
    document.getElementById('gift-active-user').classList.remove('hidden');
    document.getElementById('gift-display-name').innerText = emp.name;
    document.getElementById('gift-display-id').innerText = "ID: " + (emp.id);
    document.getElementById('gift-display-dept').innerText = emp.dept || 'GENERAL';
    var statusBox = document.getElementById('gift-claim-status');
    var confirmBtn = document.getElementById('btn-confirm-gift');
    if (emp.door_gift_claimed) {
        statusBox.innerText = "? PROHIBITED: GIFT ALREADY CLAIMED";
        statusBox.style.background = "rgba(255, 71, 87, 0.1)";
        statusBox.style.color = "var(--danger)";
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.5";
    } else {
        statusBox.innerText = "READY TO CLAIM ?";
        statusBox.style.background = "rgba(45, 133, 115, 0.1)";
        statusBox.style.color = "var(--primary-dark)";
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
    }
}

 function handleConfirmDoorgift() {
    if (!currentGiftUser) return;
    var btn = document.getElementById('btn-confirm-gift');
    var originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "Processing...";
    try {
        var res =  fetch((API_BASE) + "/api/door-gift/claim", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId: currentGiftUser.id })
        });
        if (res.ok) {
            document.getElementById('gift-active-user').classList.add('hidden');
            document.getElementById('gift-success-pane').classList.remove('hidden');
            showToast("Redemption Confirmed!", "success");
            setTimeout(function() {
                if (!document.getElementById('view-doorgift').classList.contains('hidden')) {
                    resetDoorGiftUI();
                }
            }, 5000);
        } else {
            var data =  res.json();
            showToast(data.error || "Claim failed", "danger");
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (err) {
        console.error(err);
        showToast("Network error. Try again.", "danger");
        btn.disabled = false;
                if (pullIndicator) pullIndicator.classList.remove('loading');
        }
    }

    // Export Seating
    var btnExportCsv = document.getElementById('btn-export-csv');
    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', exportSeatingToCSV);
    }

    // --- PULL TO REFRESH INITIALIZATION ---
    if (pullIndicator) {
        var touchStartY = 0;
        var isPulling = false;
        var PULL_THRESHOLD = 80;
        var PULL_MAX = 120;
        var pullLabel = pullIndicator.querySelector('.pull-label');
        var pullSpinner = pullIndicator.querySelector('.pull-spinner');

        window.addEventListenerfunction('touchstart', (e) {
            if (window.scrollY === 0 && !pullIndicator.classList.contains('loading')) {
                touchStartY = e.touches[0].pageY;
                isPulling = true;
                pullIndicator.style.transition = 'none';
            }
        }, { passive: true });

        window.addEventListenerfunction('touchmove', (e) {
            if (!isPulling || window.scrollY > 0) return;
            var touchY = e.touches[0].pageY;
            var pullDistance = Math.max(0, touchY - touchStartY);
            if (pullDistance > 0) {
                var y = Math.min(PULL_MAX, pullDistance * 0.4);
                pullIndicator.style.transform = "translateY(" + (y) + "px)";
                pullIndicator.style.opacity = Math.min(1, y / PULL_THRESHOLD);
                var rotation = (y / PULL_THRESHOLD) * 360;
                if (pullSpinner) pullSpinner.style.transform = "rotate(" + (rotation) + "deg)";
                if (y >= PULL_THRESHOLD) pullLabel.innerText = "Release to refresh";
                else pullLabel.innerText = "Pull to refresh";
            }
        }, { passive: true });

        window.addEventListenerfunction('touchend',  (e) {
            if (!isPulling) return;
            isPulling = false;
            var touchEndY = e.changedTouches[0].pageY;
            var finalPullDistance = (touchEndY - touchStartY) * 0.4;
            pullIndicator.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
            if (finalPullDistance >= PULL_THRESHOLD && window.scrollY === 0)  triggerGlobalRefresh();
            else {
                pullIndicator.style.transform = 'translateY(0)';
                pullIndicator.style.opacity = '0';
            }
        });
    }


// ==========================================
// --- GLOBAL REFRESH & DATA FUNCTIONS ---
// ==========================================

 function triggerGlobalRefresh() {
    var pullIndicator = document.getElementById('pull-to-refresh');
    if (!pullIndicator || pullIndicator.classList.contains('loading')) return;
    
    var pullLabel = pullIndicator.querySelector('.pull-label');
    pullIndicator.classList.add('loading');
    pullIndicator.style.transform = "translateY(80px)";
    pullIndicator.style.opacity = '1';
    if (pullLabel) pullLabel.innerText = "Refreshing...";
    
    try {
         loadData();
        var activeView = document.querySelector('.view:not(.hidden)');
        if (activeView) {
            var viewId = activeView.id.replace('view-', '');
            if (viewId === 'seating') renderTables();
            if (viewId === 'checkin') renderCheckinResults([]);
            if (viewId === 'admin') {
                var activeTab = document.querySelector('.admin-container:not(.hidden)');
                if (activeTab) {
                    var tabId = activeTab.id;
                    if (tabId === 'admin-tab-dashboard') renderAdminDashboard();
                    if (tabId === 'admin-tab-directory') renderAdminDirectory();
                    if (tabId === 'admin-tab-visual') renderVisualAdminMap();
                    if (tabId === 'admin-tab-doorgifts') renderDoorGiftMgmt();
                    if (tabId === 'admin-tab-settings') renderSettings();
                }
            }
        }
    } catch (err) {
        console.error("Refresh failed:", err);
        showToast("Sync Failed. Please check connection.");
    } finally {
        setTimeout(function() {
            pullIndicator.classList.remove('loading');
            pullIndicator.style.transform = 'translateY(0)';
            pullIndicator.style.opacity = '0';
        }, 1000);
    }
}


    searchInput.addEventListenerfunction('keypress', (e) {
        if (e.key === 'Enter') performSearch();
    });

    if (btnSearch) {
        btnSearch.addEventListener('click', performSearch);
    }

    if (btnToggleView) {
        btnToggleView.addEventListener('click',  function() {
            isListView = !isListView;
            updateViewModeUI();
            renderTables();
        });
    }

    window.setSeatingMode = function(mode) {
        seatingMode = mode;
        var seatBtn = document.getElementById('mode-seat-btn');
        var tableBtn = document.getElementById('mode-table-btn');
        if (seatBtn) seatBtn.classList.toggle('active', mode === 'seat');
        if (tableBtn) tableBtn.classList.toggle('active', mode === 'table');
        renderTables();
        showToast("Switched to Booking by " + (mode === 'table' ? 'Table' : 'Seat'), "info");
    };

    window.setAdminInteractionMode = function(mode) {
        adminSeatingMode = mode;
        var seatBtn = document.getElementById('admin-mode-seat-btn');
        var tableBtn = document.getElementById('admin-mode-table-btn');
        if (seatBtn) seatBtn.classList.toggle('active', mode === 'seat');
        if (tableBtn) tableBtn.classList.toggle('active', mode === 'table');
        renderVisualAdminMap();
        showToast("Admin Mode: " + (mode === 'table' ? 'Bulk Table Booking' : 'Individual Seat Edits'), "info");
    };

    if (btnSaveEventTimer) {
        btnSaveEventTimer.addEventListener('click',  function() {
            var newTime = eventTimerInput.value;
            if (!newTime) return;
            try {
                var res =  fetch((API_BASE) + "/api/settings/update", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'event_timer', value: newTime })
                });
                if (res.ok) {
                    appData.settings['event_timer'] = newTime;
                    showToast("Event timer updated.");
                }
            } catch (err) { alert('Server error'); }
        });
    }

    console.log("[AdminSettings] Door Gift PIN elements:", { btn: !!btnSaveDoorGiftPin, input: !!doorGiftPinSettingInput });

    if (btnSaveDoorGiftPin && doorGiftPinSettingInput) {
        btnSaveDoorGiftPin.addEventListener('click',  function() {
            var newPin = doorGiftPinSettingInput.value.trim();
            console.log("[AdminSettings] Attempting to update PIN to:", newPin);
            
            if (newPin.length !== 4 || isNaN(newPin)) {
                alert("Please enter a valid 4-digit numeric PIN.");
                return;
            }

            // UI feedback: Loading state
            var originalText = btnSaveDoorGiftPin.innerText;
            btnSaveDoorGiftPin.disabled = true;
            btnSaveDoorGiftPin.innerText = "Updating...";

            try {
                console.log("[AdminSettings] Sending POST to /api/settings/update");
                var res =  fetch((API_BASE) + "/api/settings/update", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ key: 'door_gift_pin', value: newPin })
                });
                console.log("[AdminSettings] Response status:", res.status);
                if (res.ok) {
                    appData.settings['door_gift_pin'] = newPin;
                    showToast("Door Gift PIN updated successfully.");
                } else {
                    var errorData =  res.json().catch(() => ({}));
                    console.error("[AdminSettings] Update failed:", errorData);
                    alert("Failed to update PIN: " + (errorData.error || "Unknown error"));
                }
            } catch (err) {
                console.error("[AdminSettings] Error updating PIN:", err);
                alert("Server error while updating PIN.");
            } finally {
                btnSaveDoorGiftPin.disabled = false;
                btnSaveDoorGiftPin.innerText = originalText;
            }
        });
    }

    document.querySelectorAll('.nav-btn, .mobile-tab-btn').forEach(function(btn) {
        btn.addEventListener('click',  function() {
            var view = btn.dataset.view;
            if (view) switchView(view);
        });
    });
}


function updateViewModeUI() {
    if (!floorLayout || !listLayout) return; // btnToggleView is optional now

    if (isListView) {
        floorLayout.classList.add('hidden');
        listLayout.classList.remove('hidden');
        if (btnToggleView) {
            var text = btnToggleView.querySelector('.text');
            var icon = btnToggleView.querySelector('.icon');
            if (text) text.innerText = 'Switch to Map View';
            if (icon) icon.innerText = 'MAP';
        }
    } else {
        floorLayout.classList.remove('hidden');
        listLayout.classList.add('hidden');
        if (btnToggleView) {
            var text = btnToggleView.querySelector('.text');
            var icon = btnToggleView.querySelector('.icon');
            if (text) text.innerText = 'Switch to List View';
            if (icon) icon.innerText = 'LIST';
        }
    }
}

function switchView(view, pushState = true) {
    // Security Guard for Admin View
    if (view === 'admin' && !isAdminLoggedIn) {
        switchView('home', false);
        adminLoginForm.reset();
        adminLoginModal.classList.remove('hidden');
        return;
    }

    // Automatically close booking modal if navigating away
    if (modal && !modal.classList.contains('hidden')) {
        console.log("[Resilience] Closing open booking modal due to view switch.");
        unlockTable();
        stopReservationTimer();
        modal.classList.add('hidden');
    }

    if (pushState) {
        var base = detectedSubdir ? detectedSubdir.replace(/\/$/, "") : "";
        var newPath = base + '/' + view;
        if (view === 'seating' || view === 'identify' || view === 'seatselection') newPath = base + '/seating';
        window.history.pushState({ view }, '', newPath);
    }

    // --- RESET ALL VIEWS & TABS ---
    // Deactivate ALL nav buttons (desktop & mobile)
    document.querySelectorAll('.nav-btn, .mobile-tab-btn, .sidebar-btn').forEach(function(btn) { return btn.classList.remove('active'; }));
    // Hide ALL views
    document.querySelectorAll('section.view').forEach(function(sec) { return sec.classList.add('hidden'; }));

    // Toggle body class and header visibility for admin specific styling
    var mainHeader = document.getElementById('main-header');
    if (view === 'admin') {
        document.body.classList.add('is-admin-view');
        // Restore top bar on laptop view (width > 1024px)
        if (mainHeader) {
            if (window.innerWidth > 1024) {
                mainHeader.classList.remove('hidden');
            } else {
                mainHeader.classList.add('hidden');
            }
        }
    } else {
        document.body.classList.remove('is-admin-view');
        if (mainHeader) mainHeader.classList.remove('hidden');
    }
    
    // Stop heartbeat by default, it will be started if needed
    stopHeartbeat();

    // Re-check feature toggles on every view switch
    checkToggleOverlays();
    checkMaintenanceMode();

    // --- ACTIVATE TARGET VIEW ---

    // Update Mobile Tab Bar Active State (specific mapping)
    document.querySelectorAll('.mobile-tab-btn').forEach(function(btn) {
        var btnView = btn.dataset.view;
        if ((view === 'identify' || view === 'seating') && btnView === 'seating') {
            btn.classList.add('active');
        } else if (view === btnView) {
            btn.classList.add('active');
        }
    });

    if (view === 'seating') {
        if (!currentBookingEmployee) {
            switchView('identify');
            return;
        }
        if (navSeating) navSeating.classList.add('active');
        if (viewSeating) viewSeating.classList.remove('hidden');
        if (currentBookingName) currentBookingName.innerText = (currentBookingEmployee.name) + " (" + (currentBookingEmployee.id) + ")";
        renderTables();
        startHeartbeat();
    } else if (view === 'identify') {
        if (navSeating) navSeating.classList.add('active');
        if (viewIdentify) viewIdentify.classList.remove('hidden');
        identifySearchInput.value = '';
        identifyResults.innerHTML = '';
    } else if (view === 'checkin') {
        if (navCheckin) navCheckin.classList.add('active');
        if (viewCheckin) viewCheckin.classList.remove('hidden');
        
        // Reset Scanner side
        resetQRCheckinUI();
        initQRScanner("qr-reader", onScanSuccess);
        
        // Search Input (Manual Fallback)
        if (searchInput) {
            searchInput.value = '';
            checkinResults.innerHTML = '';
        }

    } else if (view === 'home') {
        if (navHome) navHome.classList.add('active');
        if (viewHome) viewHome.classList.remove('hidden');
    } else if (view === 'doorgift') {
        var navGift = document.getElementById('nav-doorgift');
        var viewGift = document.getElementById('view-doorgift');
        if (navGift) navGift.classList.add('active');
        if (viewGift) viewGift.classList.remove('hidden');
        resetDoorGiftUI();
        initQRScanner("qr-gift-reader", onDoorGiftScanSuccess);
    } else if (view === 'luckydraw') {
        if (navLuckydraw) navLuckydraw.classList.add('active');
        if (viewLuckydraw) viewLuckydraw.classList.remove('hidden');
        renderLuckyDrawWinners();
    } else if (view === 'entertainment') {
        if (navEntertainment) navEntertainment.classList.add('active');
        if (viewEntertainment) viewEntertainment.classList.remove('hidden');
        renderEntertainment();
    } else if (view === 'admin') {
        if (navAdmin) navAdmin.classList.add('active');
        if (viewAdmin) viewAdmin.classList.remove('hidden');
        adminTabBtnDashboard.click();
        enforcePermissions();
        renderAdminDashboard();
        startHeartbeat();
    }
}


function startHeartbeat() {
    // Redundant polling disabled. SSE handles live updates.
    console.log("[Performance] Heartbeat polling disabled. Relying on SSE.");
}

function stopHeartbeat() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
}

function setupSSE() {
    var eventSource = new EventSource((API_BASE) + "/api/events");

    eventSource.onmessage =  function(event) {
        var msg = JSON.parse(event.data);
        
        // Speed Analytics & Clock Sync
        if (msg.ts) {
            var now = Date.now();
            appData.serverTimeOffset = now - msg.ts; // Positive if client is ahead
            var latency = now - msg.ts;
            var adminLat = document.getElementById('admin-sse-latency');
            var guestLat = document.getElementById('guest-sse-speed');
            
            if (adminLat) adminLat.innerText = latency;
            if (guestLat) {
                guestLat.innerText = "??Live: " + (latency) + "ms";
                guestLat.style.display = 'inline';
                // Briefly highlight or stay visible
                setTimeout(function() { guestLat.style.opacity = '0.5'; }, 2000);
            }
        }
        if (msg.type === 'lock_update') {
            var { tableIdx, seatIdx, lock } = msg.data;
            if (!appData.tableLocks) appData.tableLocks = {};
            var lockKey = seatIdx !== undefined ? (tableIdx) + "-" + (seatIdx) : (tableIdx);
            
            if (lock) appData.tableLocks[lockKey] = lock;
            else delete appData.tableLocks[lockKey];
            
                         renderTables();
            if (isListView) renderTableList();
            if (!adminTabVisual.classList.contains('hidden')) renderVisualAdminMap();
        }

        if (msg.type === 'profile_lock_update') {
            var { empId, lock } = msg.data;
            if (!appData.profileLocks) appData.profileLocks = {};
            if (lock) appData.profileLocks[empId] = lock;
            else delete appData.profileLocks[empId];
            
            // Re-render search results if they are visible
            if (!viewIdentify.classList.contains('hidden')) {
                var results = appData.employees.filter(function(e) {
                    var searchBox = document.getElementById('identify-search-input');
                    if (!searchBox) return false;
                    var q = searchBox.value.toLowerCase();
                    return e.name.toLowerCase().includes(q) || e.id.toString().includes(q);
                });
                if (results.length > 0) renderIdentifyResults(results);
            }
        }

        if (msg.type === 'seating_update') {
            var { tableIdx, seatIdx, action, status, empId, paxName, diet, name, newTableIdx, newSeatIdx } = msg.data;
            
            // Partial Update Logic: Update local state immediately without waiting for server reload
            if (action === 'table_status') {
                if (!appData.tablesStatus) appData.tablesStatus = [];
                var ts = appData.tablesStatus.find(function(t) { return t.tableIdx === tableIdx; });
                if (ts) ts.status = status;
                else appData.tablesStatus.push({ tableIdx, status });
            } else if (action === 'reserve' || action === 'lock') {
                if (appData.tables[tableIdx]) {
                    appData.tables[tableIdx][seatIdx] = {
                        empId: empId,
                        paxName: paxName,
                        name: name || paxName,
                        diet: diet || "",
                        checked_in: false
                    };
                }
            } else if (action === 'remove' || action === 'unlock') {
                if (appData.tables[tableIdx]) appData.tables[tableIdx][seatIdx] = null;
            } else if (action === 'move' && newTableIdx !== undefined) {
                var movingSeat = appData.tables[tableIdx][seatIdx];
                if (movingSeat) {
                    appData.tables[newTableIdx][newSeatIdx] = { ...movingSeat };
                    appData.tables[tableIdx][seatIdx] = null;
                }
            }

            // Trigger a throttled reload to ensure total consistency across all tabs
            loadData(); 

            // Immediate UI update from partial data (Synchronous part)
            renderTables();
            if (isListView) renderTableList();
            if (!adminTabVisual.classList.contains('hidden')) renderVisualAdminMap();
            if (!adminTabDashboard.classList.contains('hidden')) renderAdminDashboard();
        } else if (msg.type === 'luckydraw_update') {
            console.log("[SSE] Luckydraw Update received: " + (msg.data?.action));
            loadData().then(function() {
                var isAdminLuckydraw = !adminTabLuckydraw.classList.contains('hidden');
                var isPublicLuckydraw = !document.getElementById('view-luckydraw').classList.contains('hidden');

            });
        } else if (msg.type === 'settings_updated') {
            console.log('[SSE] Settings Update:', msg.data.settings);
            appData.settings = msg.data.settings;
            if (isAdminLoggedIn) {
                renderSettings();
            } else {
                checkToggleOverlays();
                checkMaintenanceMode();
            }
        }
    };

    eventSource.onerror = function(err) {
        console.warn('[SSE] Connection lost or failed. Re-initializing in 3s...', err);
        eventSource.close();
        setTimeout(function() {
            setupSSE();
            // Fetch fresh data when connection is restored to ensure no updates were missed
            loadData().then(function() {
                console.log('[SSE] Connection recovered, data refreshed.');
                renderTables();
            });
        }, 3000);
    };

    eventSource.onopen = function() {
        console.log('[SSE] Live connection active.');
    };
}

function updateSeatElement(el, seat, tableIdx, seatIdx, isAdmin) {
    el.classList.remove('reserved', 'checked-in');

    if (seat) {
        if (seat.checked_in) {
            el.classList.add('checked-in');
            el.title = (seat.name) + " (Checked In)";
        } else {
            el.classList.add('reserved');
            el.title = "Reserved: " + (seat.name);
        }

        el.style.cursor = 'pointer';

        el.onclick = isAdmin ?
            () => openEditSeatModal(tableIdx, seatIdx, seat.empId, seat.name) :
            null;
    } else {
        el.title = "Available";
        el.style.cursor = 'pointer';
        el.onclick = isAdmin ?
            () => openEditSeatModal(tableIdx, seatIdx, null, 'Available') :
             () =>  openReservationModal(tableIdx, seatIdx);
    }
}


function isResourceLocked(tableIdx, seatIdx) {
    var lockKey = seatIdx !== undefined ? (tableIdx) + "-" + (seatIdx) : (tableIdx);
    var lock = appData.tableLocks ? appData.tableLocks[lockKey] : null;
    if (!lock) return null;
    
    var adjustedNow = Date.now() - (appData.serverTimeOffset || 0);
    var isLocked = lock.expiresAt > adjustedNow;
    var isLockedByMe = currentBookingEmployee && lock.empId === currentBookingEmployee.id;
    
    return isLocked && !isLockedByMe ? lock : null;
}

function renderTables() {
    // Re-verify elements if missing (v1.7.6 Resilience)
    if (!floorLayout) floorLayout = document.getElementById('floor-layout');
    if (!listLayout) listLayout = document.getElementById('list-layout');

    diagLog("renderTables called. tables: " + (appData.tables ? appData.tables.length : 'null') + ", mode: " + (isListView ? 'LIST' : 'MAP'));
    updateViewModeUI(); 

    if (isListView) {
        renderTableList();
        return;
    }

    if (!floorLayout) {
        console.error("[Render] floorLayout element missing!");
        return;
    }
    floorLayout.innerHTML = '';

    appData.tables.forEachfunction((table, tableIdx) {
        var tStatusObj = appData.tablesStatus ? appData.tablesStatus.find(function(ts) { return ts.tableIdx === tableIdx; }) : null;
        var isOffline = tStatusObj && tStatusObj.status === 'Reservation';

        var tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';
        if (isOffline) tableContainer.classList.add('offline');

        var tableCenter = document.createElement('div');
        tableCenter.className = 'table-center';
        
        tableContainer.appendChild(tableCenter);

        // Calculate booking status
        var bookedSeats = table.filter(function(s) { return s !== null; }).length;
        var totalSeats = table.length;
        var isFullyBooked = bookedSeats === totalSeats;
        var isPartiallyBooked = bookedSeats > 0 && bookedSeats < totalSeats;

        if (isFullyBooked) tableCenter.classList.add('fully-booked');
        else if (isPartiallyBooked) tableCenter.classList.add('partially-booked');

        tableCenter.innerHTML = "\r\n            <h3>Table " + (tableIdx + 1) + "</h3>\r\n            <div class=\"booking-count\">" + (isFullyBooked ? 'FULL' : (bookedSeats + '/' + totalSeats)) + "</div>\r\n        ";

        var tLock = isResourceLocked(tableIdx);

        // Allow clicking table center in most modes for better UX
        if (true) { 
            if (isOffline) {
                tableCenter.style.cursor = 'not-allowed';
                tableCenter.title = "Table " + (tableIdx + 1) + " is currently reserved for offline booking.";
                tableCenter.addEventListener('click',  () => showToast("?????Table " + (tableIdx + 1) + " is reserved for offline booking.", "danger"));
            } else {
                tableCenter.style.cursor = 'pointer';
                tableCenter.title = isFullyBooked ? "View Occupants of Table " + (tableIdx + 1) : "Click to Reserve Table " + (tableIdx + 1);
                tableCenter.addEventListener('click',  function() {
                    if (tLock) {
                        showToast("??? This table is currently being locked for booking by another user.", "danger");
                        return;
                    }
                     openReservationModal(tableIdx, null);
                });
            }
        }

        if (tLock) {
            tableContainer.classList.add('in-progress');
            var booker = appData.employees.find(function(e) { return e.id === tLock.empId; });
            var bookerName = booker ? (booker.name.split(' ')[0] || 'User') : 'Locked';
            tableCenter.innerHTML += "<div class=\"booking-status\">?? PINNED BY " + (bookerName) + " <span class=\"lock-timer\" data-expires=\"" + (tLock.expiresAt) + "\"></span></div>";
            tableCenter.style.cursor = 'not-allowed';
        }

        // Position seats in a circle
        var radius = 100;
        var centerX = 125;
        var centerY = 125;

        table.forEachfunction((seat, seatIdx) {
            var angle = (seatIdx / table.length) * 2 * Math.PI - (Math.PI / 2); // Start at top
            var x = centerX + radius * Math.cos(angle) - 16;
            var y = centerY + radius * Math.sin(angle) - 16;

            var seatEl = document.createElement('div');
            seatEl.className = 'seat';
            seatEl.id = "seat-t" + (tableIdx) + "-s" + (seatIdx);
            if (isOffline) seatEl.classList.add('offline');
            seatEl.style.left = (x) + "px";
            seatEl.style.top = (y) + "px";
            seatEl.innerText = seatIdx + 1;

            if (seat) {
                var displayName = seat.paxName || seat.name || 'Reserved';
                if (seat.checked_in) {
                    seatEl.classList.add('checked-in');
                    seatEl.title = (displayName) + " (Checked In)";
                } else {
                    seatEl.classList.add('reserved');
                    seatEl.title = "Reserved: " + (displayName) + " ";
                }

                var isVeg = (seat.diet || "").toLowerCase() === 'vegetarian';
                if (isVeg) {
                    seatEl.classList.add('seat-vegetarian');
                    seatEl.title += " [Vegetarian]";
                }
            } else {
                var sLock = isResourceLocked(tableIdx, seatIdx);
                seatEl.title = isOffline ? "Table " + (tableIdx + 1) + " - Offline" : "Table " + (tableIdx + 1) + ", Seat " + (seatIdx + 1) + " ";
                
                if (isOffline) {
                    // Handled by seatEl.classList.add('offline') above
                } else if (tLock || sLock) {
                    seatEl.classList.add('in-progress');
                    seatEl.innerHTML = '???';
                    seatEl.title = "Locked by another user";
                    seatEl.style.cursor = 'not-allowed';
                } else if (seatingMode === 'seat') {
                    seatEl.style.cursor = 'pointer';
                    seatEl.addEventListener('click',  () =>  openReservationModal(tableIdx, seatIdx));
                } else {
                    seatEl.style.cursor = 'default';
                    seatEl.style.opacity = '0.8';
                }
            }

            tableContainer.appendChild(seatEl);
        });

        floorLayout.appendChild(tableContainer);
    });
}

function renderTableList() {
    diagLog("renderTableList called. tables: " + (appData.tables ? appData.tables.length : 'null'));
    if (!listLayout) return;
    listLayout.innerHTML = '';

    appData.tables.forEachfunction((table, tableIdx) {
        var tStatusObj = appData.tablesStatus ? appData.tablesStatus.find(function(ts) { return ts.tableIdx === tableIdx; }) : null;
        var isOffline = tStatusObj && tStatusObj.status === 'Reservation';

        var tableCard = document.createElement('div');
        tableCard.className = "table-list-card glass-panel " + (isOffline ? 'offline' : '');

        var lock = appData.tableLocks ? appData.tableLocks[tableIdx] : null;
        var isLocked = lock && lock.expiresAt > Date.now();
        var isLockedByMe = isLocked && currentBookingEmployee && lock.empId === currentBookingEmployee.id;

        if (isLocked && !isLockedByMe) {
            tableCard.classList.add('in-progress');
        }

        var availableSeats = table.filter(function(s) { return s === null; }).length;
        var statusText = isLocked && !isLockedByMe ? "Booking in Progress <span class=\"lock-timer\" data-expires=\"" + (lock.expiresAt) + "\"></span>" : (isOffline ? 'Online Reservation Only' : (availableSeats) + " seats available");

        tableCard.innerHTML = "\r\n            <div class=\"table-list-header\">\r\n                <h3>Table " + (tableIdx + 1) + "</h3>\r\n                <span class=\"table-status " + (isOffline ? 'status-offline' : '') + "\">" + (statusText) + "</span>\r\n            </div>\r\n            <div class=\"seat-grid\">\r\n                <!-- Seats will be injected here -->\r\n            </div>\r\n        ";

        
        var seatGrid = tableCard.querySelector('.seat-grid');
        if (seatingMode === 'table') {
            seatGrid.style.display = 'none';
            var reserveBtn = document.createElement('button');
            reserveBtn.className = 'btn-primary';
            reserveBtn.style.width = '100%';
            reserveBtn.style.marginTop = '1rem';
            var isFullyBooked = table.every(s => s !== null);
        
        // Detect if table is locked by someone else
        var isLockedByOthers = false;
        if (appData.tableLocks) {
            Object.keys(appData.tableLocks).forEach(function(key) {
                var lock = appData.tableLocks[key];
                var parts = key.split('-'); // Format: tableIdx-seatIdx
                if (parseInt(parts[0]) === tableIdx && lock.empId !== (currentBookingEmployee ? currentBookingEmployee.id : null)) {
                    isLockedByOthers = true;
                }
            });
        }
            var occupiedByOthers = table.some(s => s !== null && (currentBookingEmployee ? s.empId !== currentBookingEmployee.id : true));
            if (isFullyBooked) { reserveBtn.innerText = "TABLE FULL"; reserveBtn.disabled = true; }
            else if (occupiedByOthers) { reserveBtn.innerText = "PARTIALLY OCCUPIED"; reserveBtn.disabled = true; }
            else if (isOffline) { reserveBtn.innerText = "OFFLINE ONLY"; reserveBtn.disabled = true; }
            else { reserveBtn.innerText = "RESERVE ENTIRE TABLE"; reserveBtn.onclick =  () =>  openReservationModal(tableIdx, null); }
            tableCard.appendChild(reserveBtn);
        } else {
            table.forEachfunction((seat, seatIdx) {
                var seatBtn = document.createElement('button');
                seatBtn.className = 'seat-mini';
                if (seat) {
                    if (seat.checked_in) seatBtn.classList.add('checked-in');
                    else seatBtn.classList.add('reserved');
                    if ((seat.diet || "").toLowerCase() === 'vegetarian') seatBtn.classList.add('seat-vegetarian');
                    seatBtn.disabled = true;
                } else if (isOffline) {
                    seatBtn.classList.add('offline'); seatBtn.disabled = true;
                } else {
                    seatBtn.addEventListener('click',  () =>  openReservationModal(tableIdx, seatIdx));
                }
                seatBtn.innerText = seatIdx + 1;
                seatGrid.appendChild(seatBtn);
            });
        }
    

        listLayout.appendChild(tableCard);
    });
}

function performIdentifySearch() {
    if (getSettingValue('feature_seating') === 'off') {
        showToast("Table Selection is currently closed.", "danger");
        return;
    }

    var query = identifySearchInput.value.trim().toLowerCase();
    if (!query) return;

    // Filter employees by name, ID, or email
    var employeeResults = appData.employees.filter(function(emp) { return (emp.name && emp.name.toLowerCase(; }).includes(query)) ||
        (emp.id && emp.id.toLowerCase().includes(query)) ||
        (emp.email && emp.email.toLowerCase().includes(query))
    );

    // Also search for GUESTS across tables
    var guestResults = [];
    appData.tables.forEachfunction((table, tIdx) {
        table.forEachfunction((seat, sIdx) {
            if (seat && !seat.empId && seat.paxName) {
                if (seat.paxName.toLowerCase().includes(query)) {
                    guestResults.push({
                        id: "GUEST-" + (tIdx+1) + "-" + (sIdx+1),
                        name: seat.paxName,
                        dept: 'GUEST',
                        diet: 'Unknown',
                        checked_in: seat.checkedIn || 0,
                        is_guest: true
                    });
                }
            }
        });
    });

    renderIdentifyResults([...employeeResults, ...guestResults]);
}

function renderIdentifyResults(results) {
    identifyResults.innerHTML = '';
    if (results.length === 0) {
        identifyResults.innerHTML = '<p style="color:var(--text-muted)">No employee profile found. Please contact admin.</p>';
        return;
    }

    results.forEach(function(emp) {
        // Check if already has a seat
        var existingSeat = null;
        if (emp.is_guest) {
            // Guest ID is GUEST-T-S
            var parts = emp.id.split('-');
            existingSeat = { tIdx: parseInt(parts[1]) - 1, sIdx: parseInt(parts[2]) - 1 };
        } else {
            appData.tables.forEachfunction((table, tIdx) {
                table.forEachfunction((seat, sIdx) {
                    if (seat && seat.empId === emp.id) {
                        existingSeat = { tIdx, sIdx };
                    }
                });
            });
        }

        var card = document.createElement('div');
        card.className = 'result-card glass-panel';
        
        var isLocked = !emp.is_guest && appData.profileLocks && appData.profileLocks[emp.id] && appData.profileLocks[emp.id].deviceId !== DEVICE_ID;
        
        var actionHtml = '';
        if (existingSeat) {
            actionHtml = "<span class=\"badge bg-success\" style=\"padding:0.5rem 1rem;\">Seated: Table " + (existingSeat.tIdx + 1) + "</span>";
        } else if (isLocked) {
            actionHtml = "<button class=\"btn-secondary\" style=\"width:auto; padding:0.5rem 1.5rem; opacity:0.6;\" disabled>In Use...</button>";
        } else if (!emp.is_guest) {
            actionHtml = "<button class=\"btn-primary\" style=\"width:auto; padding:0.5rem 1.5rem;\" onclick=\"selectBookingProfile('" + (emp.id) + "')\">Select</button>";
        }

        card.innerHTML = "\r\n            <div class=\"result-info\">\r\n                <div class=\"result-header\">\r\n                    <span class=\"emp-dept\">" + (emp.dept) + "</span>\r\n                </div>\r\n                <h4>" + (emp.name) + "</h4>\r\n                <div class=\"result-meta\">\r\n                    <span class=\"diet-badge " + ((emp.diet || "").toLowerCase() === 'vegetarian' ? 'veg' : 'non-veg') + "\">" + (emp.diet || 'Normal') + "</span>\r\n                </div>\r\n            </div>\r\n            <div class=\"result-actions\">\r\n                " + (actionHtml) + "\r\n            </div>\r\n        ";
        identifyResults.appendChild(card);
    });

    // Removed Ballroom Reference per user request

}

window.selectBookingProfile =  function (empId) {
    var success =  lockProfile(empId);
    if (!success) return;

    currentBookingEmployee = appData.employees.find(function(e) { return e.id === empId; });
    if (currentBookingEmployee) {
        startProfileLockHeartbeat(empId);
        updateCancelButtonVisibility();
        switchView('seating');
    }
}

 function openReservationModal(tableIdx, seatIdx) {
    if (!currentBookingEmployee) return;

    // --- INSTANT SWAP v1.6.86 ---
    // If we have an active lock anywhere else, tell the server to swap it IMMEDIATELY
    console.log("[Booking] Switching to table " + (tableIdx + 1));
    
    // Fire and forget the unlock to clear the path
    fetch((API_BASE) + "/api/table/unlock", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: currentBookingEmployee.id, sessionId: bookingSessionId })
    }).catch(e => console.warn("Cleanup failed, proceeding anyway."));
    
    // Remove the blocking check entirely - always allow the user to click a new table
    // --- End Instant Swap ---
    if (!currentBookingEmployee) return;

    // --- Self-Repair: Check for stale locks before blocking ---
    // PERMISSIVE BYPASS: If the lock belongs to ME, just var me in.
    var myLockKey = Object.keys(appData.tableLocks || {}).find(function(key) {
        var lock = appData.tableLocks[key];
        return String(lock.empId) === String(currentBookingEmployee.id);
    });

    if (myLockKey) {
        console.log("[Booking] Found own lock. Bypassing block.");
        // We var it pass through instead of showing the toast.
    } else {
        // Only block if SOMEONE ELSE has a lock on this specific resource
        // This is handled inside openReservationModal's target checks below.
    }
    // --- End Self-Repair ---
    if (getSettingValue('feature_seating') === 'off') {
        showToast("Table Selection is currently closed.", "danger");
        return;
    }

    if (!currentBookingEmployee) {
        switchView('identify');
        return;
    }

    // Fail-safe: Check if table is offline
    var tStatusObj = appData.tablesStatus ? appData.tablesStatus.find(function(ts) { return ts.tableIdx === tableIdx; }) : null;
    var isOffline = tStatusObj && tStatusObj.status === 'Reservation';
    // Admins can proceed, but guests are blocked
    if (isOffline && !isAdminLoggedIn) {
        showToast("?????Table " + (tableIdx + 1) + " is reserved for offline booking.", "danger");
        return;
    }

    var table = appData.tables[tableIdx];
    var isTable = (seatIdx === null);
    // Enforce feature toggles
    if (isTable && getSettingValue('feature_table_mode') === 'off') {
        showToast("Full-Table Booking is currently disabled by Admin.", "danger");
        return;
    }
    if (!isTable && getSettingValue('feature_seat_mode') === 'off') {
        showToast("Seat-by-Seat Booking is currently disabled by Admin.", "danger");
        return;
    }
    
    
    var isViewOnly = false;
    var viewOnlyReason = '';

    if (isTable) {
        // Table Mode: View only if ANY seat is taken by someone else
        var occupiedByOthers = table.some(s => s !== null && s.empId !== currentBookingEmployee.id);
        var isFullyBooked = table.every(s => s !== null);
        
        if (isFullyBooked) {
            isViewOnly = true;
            viewOnlyReason = 'TABLE ALREADY BOOKED';
        } else if (occupiedByOthers) {
            isViewOnly = true;
            viewOnlyReason = 'TABLE PARTIALLY OCCUPIED';
        }
    } else {
        // Seat Mode: View only if THIS specific seat is taken by someone else
        var seat = table[seatIdx];
        if (seat !== null && seat.empId !== currentBookingEmployee.id) {
            isViewOnly = true;
            viewOnlyReason = 'SEAT ALREADY RESERVED';
        }
    }

    // Only lock if we are actually intending to book
    if (!isViewOnly) {
        try {
            var res =  fetch((API_BASE) + "/api/table/lock", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx, seatIdx: (seatIdx === null ? -1 : seatIdx), empId: currentBookingEmployee.id, sessionId: bookingSessionId })
            });
            if (!res.ok) {
                var data =  res.json();
                showToast("?? " + (data.error || 'Booking in progress. Please choose other table.'), "danger");
                return;
            }
        } catch (err) {
            console.error("Locking failed", err);
        }
    }

    currentSelectedSeat = { tableIdx, seatIdx };
    // isTable already defined above
    
    if (isViewOnly) {
        modalTitle.innerText = "View Occupants: Table " + (tableIdx + 1);
    } else {
        modalTitle.innerText = isTable ? "Reserve Entire Table " + (tableIdx + 1) : "Reserve Seat " + (seatIdx + 1) + " at Table " + (tableIdx + 1);
    }
    
    modalSeatInfo.innerText = isTable ? "Table " + (tableIdx + 1) + " - 11 Seats Total" : "Table " + (tableIdx + 1) + ", Seat " + (seatIdx + 1);
    modalEmpName.innerText = currentBookingEmployee.name;
    
    // Toggle pax inputs visibility
    var paxInputsContainer = document.getElementById('pax-inputs-container');
    var paxSearchContainers = paxInputsContainer.querySelectorAll('.pax-search-container');
    
    // Reset/Prepare UI
    var submitBtn = resForm.querySelector('.btn-primary');
    submitBtn.disabled = isViewOnly;
    submitBtn.style.opacity = isViewOnly ? '0.5' : '1';
    
    if (isViewOnly) {
        submitBtn.innerText = viewOnlyReason || 'UNAVAILABLE';
    } else {
        submitBtn.innerText = isTable ? 'CONFIRM TABLE BOOKING' : 'CONFIRM SEAT BOOKING';
    }

    paxSearchContainers.forEachfunction((container, idx) {
        var input = container.querySelector('input');
        if (idx === 0) {
            container.style.display = 'block'; // Always show Pax 1
            container.style.gridColumn = 'span 2';
            if (input) {
                input.required = !isViewOnly;
                input.readOnly = isViewOnly;
            }
        } else {
            container.style.display = isTable ? 'block' : 'none'; 
            if (input) {
                input.required = false; 
                input.readOnly = isViewOnly;
            }
        }
    });

    var note = resForm.querySelector('p');
    if (note) note.style.display = isTable ? 'block' : 'none';

    // Populate pax inputs
    for (var i = 0; i < 11; i++) {
        var input = document.getElementById("pax-input-" + (i));
        if (!input) continue;
        
        // Clear previous state
        delete input.dataset.empId;
        
        var seat = table[i];
        if (seat) {
            input.value = seat.paxName || seat.name || 'Occupied';
            if (seat.empId) input.dataset.empId = seat.empId;
        } else if (i === 0 && !isViewOnly) {
            input.value = currentBookingEmployee.name;
            input.dataset.empId = currentBookingEmployee.id;
        } else {
            input.value = '';
        }
    }
    // Manual Vegetarian checkbox removed

    // Start 10-minute timer if not in view-only mode
    if (!isViewOnly) {
        startReservationTimer();
    } else {
        stopReservationTimer();
    }

    modal.classList.remove('hidden');
}

 function handleReservationSubmit(e) {
    e.preventDefault();
    console.log("[Booking] Submit triggered");
    try {
        console.log("[Booking] Submit started. Context:", currentSelectedSeat, currentBookingEmployee);
        if (!currentSelectedSeat || !currentBookingEmployee) {
            console.error("[Booking] Missing context", { currentSelectedSeat, currentBookingEmployee });
            alert("Error: Booking context lost. Please re-select table.");
            return;
        }

        var { tableIdx } = currentSelectedSeat;
        var btnConfirm = modal.querySelector('.btn-primary');
        var originalText = btnConfirm.innerText;
        var isTable = (currentSelectedSeat.seatIdx === null);

        // Collect and validate pax names AND IDs
        var paxNames = [];
        var paxEmpIds = [];
        var seenIds = new Set();
        var maxPax = isTable ? 11 : 1;

        console.log("[Booking] Collecting " + (maxPax) + " employees...");

        for (var i = 0; i < maxPax; i++) {
            var el = document.getElementById("pax-input-" + (i));
            if (!el) throw new Error("Input field pax-input-" + (i) + " not found!");
            
            var name = el.value.trim();
            var empId = el.dataset.empId;

            if (!name) {
                alert("Table Booking Error: Name for Pax " + (i + 1) + " is missing. Entire table (all 11 seats) must be filled to use 'Table Booking' mode. Otherwise, please use 'Seat' mode.");
                return;
            }

            if (isTable && !empId) {
                alert("Please select a valid Employee from the list for Pax " + (i + 1) + ". \"Guest\" bookings are not allowed.");
                return;
            }

            if (empId) {
                if (seenIds.has(empId)) {
                    alert("Duplicate employee selected: \"" + (name) + "\". Each person must be unique.");
                    return;
                }
                seenIds.add(empId);
            }

            paxNames.push(name);
            paxEmpIds.push(empId || null);
        }

        console.log("[Booking] Ready to reserve. isTable=" + (isTable) + ", IDs=" + (paxEmpIds));
        btnConfirm.disabled = true;
        btnConfirm.innerText = "Processing...";

        var endpoint = isTable ? '/api/table/reserve' : '/api/seat/reserve';
        var body = isTable ? {
            tableIdx,
            primaryEmpId: currentBookingEmployee.id,
            paxNames: paxNames,
            paxEmpIds: paxEmpIds,
            paxDiets: paxEmpIds.map(function(id) {
                if (!id) return 'Normal';
                var found = appData.employees.find(function(e) { return e.id === id; });
                return found ? (found.diet || 'Normal') : 'Normal';
            })
        } : {
            tableIdx,
            seatIdx: currentSelectedSeat.seatIdx,
            empId: currentBookingEmployee.id,
            paxName: currentBookingEmployee.name,
            diet: currentBookingEmployee.diet || 'Normal' // Automatically detecting from profile
        };

        console.log("[Booking] Submitting to " + endpoint + " with body:", body);

        var res =  fetch((API_BASE) + (endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        var data =  res.json();
        if (!res.ok) {
            console.warn("[Booking] Server rejected reservation:", data);
            if (res.status === 409) {
                showToast("?????" + (data.error || 'Table already taken!'), "danger");
            } else {
                alert("Reservation failed: " + (data.error || 'Unknown error'));
            }
            btnConfirm.disabled = false;
            btnConfirm.innerText = originalText;
            return;
        }

        console.log("[Booking] Reservation confirmed on server. Updating UI...");
        stopReservationTimer();
        modal.classList.add('hidden');
         loadData();
        renderTables();
        
        // Final Confirmation Prompt
        alert("Thank you, your booking is confirmed at Table " + (tableIdx + 1));

        if (currentBookingEmployee) {
            unlockProfile(currentBookingEmployee.id);
            currentBookingEmployee = null;
        }
        
        switchView('home');
        showToast("Success! Your group is now booked at Table " + (tableIdx + 1) + ". ???");
        console.log("[Booking] Success Flow Complete.");

    } catch (err) {
        console.error("[Booking] CRITICAL ERROR:", err);
        btnConfirm.disabled = false;
        btnConfirm.innerText = originalText;
        alert("CRITICAL ERROR during booking: " + (err.message));
    }
}

 function unlockTable() {
    // Unlock all multi-pax profiles first
    if (multiPaxLocks.size > 0) {
        console.log("[Lock] Releasing " + (multiPaxLocks.size) + " PAX locks...");
        for (var empId of multiPaxLocks) {
            unlockProfile(empId);
        }
        multiPaxLocks.clear();
    }

    if (!currentSelectedSeat || !currentBookingEmployee) return;
    var { tableIdx, seatIdx } = currentSelectedSeat;
    try {
        var res =  fetch((API_BASE) + "/api/table/unlock", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableIdx, seatIdx, empId: currentBookingEmployee.id, sessionId: bookingSessionId })
        });
    } catch (err) {
        console.error("Unlock failed", err);
    }
}

 function cancelTableBooking() {
    if (!currentBookingEmployee) return;
    
    var mySeats = [];
    appData.tables.forEachfunction((table, tIdx) {
        table.forEachfunction((seat, sIdx) {
            if (seat && seat.empId === currentBookingEmployee.id) {
                mySeats.push({ tIdx, sIdx });
            }
        });
    });

    if (mySeats.length === 0) {
        showToast("You don't have a reservation to cancel.", "info");
        return;
    }

    var primaryTableIdx = mySeats[0].tIdx;
    var tableSeats = appData.tables[primaryTableIdx];
    
    // Check if there are other unassigned guests at this table (implies a Table Booking was made here)
    var hasUnassignedGuests = tableSeats.some(s => s !== null && s.empId === null);
    // Determine if they own the primary seat (Seat 0)
    var ownsPrimarySeat = mySeats.some(s => s.sIdx === 0);

    // If they own the primary seat AND there are unassigned guests, they probably made a full table booking.
    // If they own multiple explicit seats (e.g. colleagues), they can choose what to do.
    var isLikelyTableBooking = ownsPrimarySeat && hasUnassignedGuests;

    if (isLikelyTableBooking) {
        if (!confirm("Are you sure you want to cancel your TABLE reservation at Table " + (primaryTableIdx + 1) + "? WARNING: This will clear all 11 seats, including all guests.")) return;
        
        try {
            var res =  fetch((API_BASE) + "/api/table/cancel", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx: primaryTableIdx, empId: currentBookingEmployee.id, sessionId: bookingSessionId })
            });
            if (res.ok) {
                showToast("Table reservation cancelled successfully.");
                 loadData();
                renderTables();
                updateCancelButtonVisibility();
            } else {
                var data =  res.json();
                alert(data.error || "Failed to cancel reservation.");
            }
        } catch (err) { alert("Server error during cancellation."); }
    } else {
        // Individual Seat(s) cancellation
        if (!confirm("Are you sure you want to cancel your SEAT reservation?")) return;
        
        try {
            // Cancel each seat they own safely using the new endpoint
            for (var seat of mySeats) {
                 fetch((API_BASE) + "/api/seat/cancel-own", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tableIdx: seat.tIdx, seatIdx: seat.sIdx, empId: currentBookingEmployee.id, sessionId: bookingSessionId })
                });
            }
            
            showToast("Seat reservation(s) cancelled successfully.");
             loadData();
            renderTables();
            updateCancelButtonVisibility();
        } catch (err) {
            alert("Server error during cancellation.");
        }
    }
}

function updateCancelButtonVisibility() {
    var btnCancel = document.getElementById('btn-cancel-booking');
    if (!btnCancel) return;

    if (currentBookingEmployee) {
        var hasBooking = appData.tables.some(table => table.some(s => s && s.empId === currentBookingEmployee.id));
        if (hasBooking) {
            btnCancel.classList.remove('hidden');
            btnCancel.style.display = 'block';
        } else {
            btnCancel.classList.add('hidden');
            btnCancel.style.display = 'none';
        }
    } else {
        btnCancel.classList.add('hidden');
        btnCancel.style.display = 'none';
    }
}

function performSearch() {
    var status = getSettingValue('feature_checkin');
    diagLog("Search trigger. Status: " + (status), "gray");

    if (status === 'off') {
        showToast("Attendance Check-In is currently closed.", "danger");
        return;
    }

    var query = searchInput.value.trim().toLowerCase();
    if (!query) return;

    diagLog("Searching for: " + (query), "white");

    var results = [];
    appData.employees.forEach(function(emp) {
        var empIdStr = String(emp.id).toLowerCase();
        var empNameStr = String(emp.name).toLowerCase();
        var empEmailStr = emp.email ? String(emp.email).toLowerCase() : "";

        if (
            empNameStr.includes(query) ||
            empIdStr.includes(query) ||
            empEmailStr.includes(query)
        ) {
            // Check if they have a seat
            var tableIdx = null;
            var seatIdx = null;
            appData.tables.forEachfunction((table, tIdx) {
                table.forEachfunction((seat, sIdx) {
                    if (seat && seat.empId === emp.id) {
                        tableIdx = tIdx;
                        seatIdx = sIdx;
                    }
                });
            });

            results.push({
                empId: emp.id,
                name: emp.name,
                email: emp.email,
                dept: emp.dept || 'N/A',
                diet: emp.diet || 'None',
                checked_in: emp.checked_in,
                door_gift_claimed: emp.door_gift_claimed,
                tableIdx: tableIdx,
                seatIdx: seatIdx
            });
        }
    });

    diagLog("Results found: " + (results.length), "lime");
    renderSearchResults(results);
}

function renderSearchResults(results) {
    checkinResults.innerHTML = '';
    if (results.length === 0) {
        checkinResults.innerHTML = '<p style="color:var(--text-muted)">No reservations found.</p>';
        return;
    }

    results.forEach(function(res) {
        var card = document.createElement('div');
        card.className = 'result-card glass-panel';

        var safeEmpId = String(res.empId).replace(/'/g, "\\'");
        var doorGiftClaimed = res.door_gift_claimed === 1;
        var giftStatusHtml = res.checked_in 
            ? (doorGiftClaimed 
                ? '<span class="door-gift-claimed-badge" style="margin-top: 10px;">Claimed</span>'
                : "<button class=\"btn-door-gift\" style=\"margin-top: 10px;\" onclick=\"window.openDoorGiftModal('" + (safeEmpId) + "')\">\r\n                    <span class=\"icon\">?????/span> Claim Door Gift\r\n                   </button>")
            : '<span style="color:var(--text-muted); font-size: 0.8rem; margin-top: 5px;">Check in first to claim gift</span>';

        var seatInfoHtml = res.tableIdx !== null
            ? "Table " + (res.tableIdx + 1) + " &middot; Seat " + (res.seatIdx + 1)
            : "Unassigned (No reserved seat)";

        card.innerHTML = "\r\n            <div class=\"result-info\" style=\"flex: 1;\">\r\n                <div class=\"result-header\">\r\n                    <span class=\"emp-dept\">" + (res.dept) + "</span>\r\n                </div>\r\n                <h4 style=\"font-size: 1.2rem; margin: 0.5rem 0;\">" + (res.name) + "</h4>\r\n                <div class=\"result-meta\">\r\n                    <p class=\"seat-info\" style=\"margin-bottom: 0.5rem;\">" + (seatInfoHtml) + "</p>\r\n                    <div style=\"display: flex; gap: 8px; align-items: center; flex-wrap: wrap;\">\r\n                        <span class=\"diet-badge " + (res.diet === 'vegetarian' ? 'veg' : 'non-veg') + "\">" + (res.diet) + "</span>\r\n                        " + (res.checked_in ? '<span class="status-badge checked-in">Checked In</span>' : '<span class="status-badge reserved">Reserved</span>') + "\r\n                    </div>\r\n                    " + (giftStatusHtml) + "\r\n                </div>\r\n            </div>\r\n            <div class=\"result-actions\" style=\"display: flex; flex-direction: column; justify-content: center;\">\r\n                " + (!res.checked_in ? "<button class=\"btn-primary\" onclick=\"checkInUser('" + (safeEmpId) + "')\">CHECK IN</button>" : '') + "\r\n            </div>\r\n        ";
        checkinResults.appendChild(card);
    });

    // Add Ballroom Reference Image after check-in results
    var referenceContainer = document.createElement('div');
    referenceContainer.className = 'ballroom-reference glass-panel animate-fade-in';
    referenceContainer.style.marginTop = '2rem';
    referenceContainer.style.textAlign = 'center';
    referenceContainer.innerHTML = "\r\n        <h3 style=\"margin-bottom: 1rem; color: var(--accent-gold);\">Ballroom Table Reference</h3>\r\n        <p style=\"color: var(--text-muted); margin-bottom: 1.5rem;\">Use this map to find your table location in the ballroom.</p>\r\n        <img src=\"" + (API_BASE) + "/assets/ballroom_layout.png\" alt=\"Ballroom Layout\" style=\"width: 100%; max-width: 800px; border-radius: 15px; border: 1px solid var(--glass-border); box-shadow: 0 10px 30px rgba(0,0,0,0.3);\">\r\n    ";
    checkinResults.appendChild(referenceContainer);
}

// Global function to be called from inline onclick
window.checkInUser =  function (empId) {
    if (empId) {
        try {
            // Streamlined (v1.5.70): Combine check-in and gift claim
            var res =  fetch((API_BASE) + "/api/checkin/combined", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empId: empId })
            });
            if (!res.ok) { var d =  res.json(); alert(d.error); return; }
            
             loadData();
            showToast("Successfully checked in & gift claimed!", "success");
            
            if (typeof performSearch === 'function') performSearch(); // Refresh results in search view
            if (typeof renderDoorGiftMgmt === 'function') renderDoorGiftMgmt(); // Refresh dashboard if open
            
        } catch (err) { alert('Server error during check-in.'); }
    }
};

 function submitDoorGiftClaim(e) {
    if (e) e.preventDefault();
    console.log("[DoorGift] submitDoorGiftClaim started");
    
    var empId = doorGiftEmpId.value;
    var pin = doorGiftPinInput.value;
    
    console.log("[DoorGift] Submitting claim for empId:", empId, "with PIN:", pin);

    if (pin.length !== 4) {
        doorGiftError.innerText = "Please enter a 4-digit PIN.";
        doorGiftError.style.display = 'block';
        return;
    }

    try {
        var res =  fetch((API_BASE) + "/api/door-gift/claim", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, pin })
        });

        var data =  res.json();
        console.log("[DoorGift] API Response Reference:", data);
        
        if (!res.ok) {
            doorGiftError.innerText = data.error || "Failed to claim door gift.";
            doorGiftError.style.display = 'block';
            return;
        }

        // Success Sequence
        var doorGiftHeader = document.getElementById('door-gift-header');
        if (doorGiftHeader) doorGiftHeader.classList.add('hidden');
        if (doorGiftForm) doorGiftForm.classList.add('hidden');
        if (doorGiftEmpInfo) doorGiftEmpInfo.classList.add('hidden');
        if (doorGiftSuccessMsg) doorGiftSuccessMsg.classList.remove('hidden');
        
        showToast("Thank you, hope you enjoy the night! ?", "success");
         loadData();
        
        // Auto-close after 3 seconds
        setTimeout(function() {
            doorGiftModal.classList.add('hidden');
            // Refresh whatever view we are on
            var activeView = document.querySelector('.view:not(.hidden)');
            if (activeView) {
                var viewId = activeView.id.replace('view-', '');
                if (viewId === 'checkin') performSearch(); // Refresh search results
                if (viewId === 'admin') {
                    var activeTab = document.querySelector('.admin-container:not(.hidden)');
                    if (activeTab && activeTab.id === 'admin-tab-directory') renderAdminDirectory();
                }
            }
        }, 3000);
    } catch (err) {
        console.error("[DoorGift] Error:", err);
        doorGiftError.innerText = "Server error. Please try again.";
        doorGiftError.style.display = 'block';
    }
}
window.submitDoorGiftClaim = submitDoorGiftClaim;

window.removeReservation =  function (tIdx, sIdx) {
    if (confirm("Are you sure you want to remove this reservation?")) {
        try {
             fetch((API_BASE) + "/api/seat/remove", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx: tIdx, seatIdx: sIdx })
            });
             loadData();
            renderAdminDashboard();
            renderAdminDirectory();
            renderVisualAdminMap();
            showToast("Reservation removed.");
        } catch (err) {
            alert('Server error.');
        }
    }
}

window.openEditSeatModal = function (tIdx, sIdx, empId, empName) {
    currentEditingSeat = { tIdx, sIdx, empId, empName };
    
    var searchInput = document.getElementById('edit-seat-emp-search');
    var hiddenIdEl = document.getElementById('edit-seat-hidden-emp-id');
    var datalist = document.getElementById('admin-employee-datalist');
    
    // Repopulate datalist
    datalist.innerHTML = '';
    appData.employees.forEach(function(e) {
        var option = document.createElement('option');
        option.value = (e.name) + " (ID: " + (e.id) + ")";
        datalist.appendChild(option);
    });

    var emp = appData.employees.find(function(e) { return e.id === empId; });
    
    // Setup initial values
    if (emp) {
        searchInput.value = (emp.name) + " (ID: " + (emp.id) + ")";
        hiddenIdEl.value = emp.id;
    } else {
        searchInput.value = '';
        hiddenIdEl.value = '';
    }

    // Function to update visual display
    var updateDisplay = function(eId, eName) {
        var nameEl = document.getElementById('edit-seat-emp-name');
        var idEl = document.getElementById('edit-seat-emp-id');
        var deptEl = document.getElementById('edit-seat-emp-dept');
        var dietEl = document.getElementById('edit-seat-emp-diet');
        
        var found = appData.employees.find(function(e) { return e.id === eId; });
        
        nameEl.innerText = found ? found.name : (eName || 'Available');
        idEl.innerText = found ? "(" + (found.id) + ")" : '';
        deptEl.innerText = found ? "Dept: " + (found.dept) : '';
        
        if (found && found.diet) {
            dietEl.innerText = found.diet;
            dietEl.className = "diet-badge " + (found.diet === 'vegetarian' ? 'veg' : 'non-veg');
            dietEl.style.display = 'inline-block';
        } else {
            dietEl.style.display = 'none';
        }
    };
    
    updateDisplay(empId, empName);
    
    // Event listener for input
    searchInput.oninput = function(e) {
        var val = e.target.value;
        var match = val.match(/\(ID: (.*?)\)/);
        if (match && match[1]) {
            hiddenIdEl.value = match[1];
            updateDisplay(match[1], null);
        } else {
            hiddenIdEl.value = '';
            updateDisplay(null, 'Available');
        }
    };

    // Populate Tables
    editTableSelect.innerHTML = '';
    for (var i = 0; i < TOTAL_TABLES; i++) {
        var opt = document.createElement('option');
        opt.value = i;
        opt.innerText = "Table " + (i + 1) + " ";
        if (tIdx !== null && i === tIdx) opt.selected = true;
        editTableSelect.appendChild(opt);
    }

    updateEditSeatDropdown();

    // Show/hide unassign button based on current status
    var unassignBtn = document.getElementById('admin-unassign-seat-btn');
    if (tIdx !== null) {
        unassignBtn.classList.remove('hidden');
    } else {
        unassignBtn.classList.add('hidden');
    }

    adminEditSeatModal.classList.remove('hidden');
}

function updateEditSeatDropdown() {
    var selectedTable = parseInt(editTableSelect.value);
    editSeatSelect.innerHTML = '';

    for (var i = 0; i < SEATS_PER_TABLE; i++) {
        // Only show available seats or their current seat
        var seatData = appData.tables[selectedTable][i];
        if (!seatData || (currentEditingSeat && currentEditingSeat.tIdx !== null && selectedTable === currentEditingSeat.tIdx && i === currentEditingSeat.sIdx)) {
            var opt = document.createElement('option');
            opt.value = i;
            opt.innerText = "Seat " + (i + 1) + " ";
            if (currentEditingSeat && currentEditingSeat.tIdx !== null && selectedTable === currentEditingSeat.tIdx && i === currentEditingSeat.sIdx) {
                opt.selected = true;
                opt.innerText += " (Current)";
            }
            editSeatSelect.appendChild(opt);
        }
    }

    if (editSeatSelect.options.length === 0) {
        editSeatSelect.innerHTML = '<option value="" disabled selected>Table Full</option>';
    }
}

 function handleAdminEditSeatSubmit(e) {
    e.preventDefault();
    if (!currentEditingSeat) return;

    var newTIdx = parseInt(editTableSelect.value);
    var newSIdx = parseInt(editSeatSelect.value);
    var hiddenEmpId = document.getElementById('edit-seat-hidden-emp-id').value;

    if (isNaN(newTIdx) || isNaN(newSIdx)) {
        alert("Please select a valid table and seat.");
        return;
    }
    
    if (!hiddenEmpId) {
        alert("Please search and select a valid employee, or use 'Unassign' to clear the seat.");
        return;
    }

    try {
        var payload = { empId: hiddenEmpId, newTableIdx: newTIdx, newSeatIdx: newSIdx, isAdmin: true };
        
        // We always try to use /api/seat/move. If it fails because the employee isn't already assigned a seat, 
        // we fallback to /api/seat/reserve logic.
        var moveRes =  fetch((API_BASE) + "/api/seat/move", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!moveRes.ok) {
             var moveData =  moveRes.json();
             // If destination is taken via move, alert
             if (moveRes.status === 409) {
                 alert(moveData.error);
                 return;
             }
             
             // If move failed because employee had no old seat, fallback to reserve
             var res =  fetch((API_BASE) + "/api/seat/reserve", {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ tableIdx: newTIdx, seatIdx: newSIdx, empId: hiddenEmpId, isAdmin: true })
             });
             
             if (!res.ok) {
                 var d =  res.json();
                 alert(d.error);
                 return;
             }
        }

         loadData();
        adminEditSeatModal.classList.add('hidden');
        renderAdminDashboard();
        renderAdminDirectory();
        renderVisualAdminMap();
        showToast("Seat assignment updated successfully!");
    } catch (err) {
        alert('Server error.');
    }
}

window.openAdminBatchModal = function (tIdx) {
    if (!adminBatchModal || !adminBatchPaxContainer) return;
    
    adminBatchTableIdxInput.value = tIdx;
    document.getElementById('admin-batch-modal-title').innerText = "Table " + (tIdx + 1) + " Batch Assignment";
    
    // Clear and build inputs for 11 seats
    adminBatchPaxContainer.innerHTML = '';
    var table = appData.tables[tIdx];
    
    for (var i = 0; i < 11; i++) {
        var seat = table[i];
        var div = document.createElement('div');
        div.className = 'form-group';
        div.style.marginBottom = '0.5rem';
        
        var label = document.createElement('label');
        label.innerText = "Seat " + (i + 1);
        label.style.fontSize = '0.75rem';
        
        var input = document.createElement('input');
        input.type = 'text';
        input.id = "batch-pax-name-" + (i);
        input.placeholder = "Employee Name/ID";
        input.style.width = '100%';
        input.style.padding = '0.6rem';
        input.style.borderRadius = '8px';
        input.style.border = '1px solid rgba(0,0,0,0.1)';
        
        if (seat) {
            input.value = seat.empId ? (seat.name) + " (" + (seat.empId) + ")" : (seat.name || '');
        }
        
        div.appendChild(label);
        div.appendChild(input);
        adminBatchPaxContainer.appendChild(div);
    }
    
    adminBatchModal.classList.remove('hidden');
};

 function handleAdminBatchSubmit(e) {
    e.preventDefault();
    var tIdx = parseInt(adminBatchTableIdxInput.value);
    var paxData = [];
    
    for (var i = 0; i < 11; i++) {
        var input = document.getElementById("batch-pax-name-" + (i));
        var val = input.value.trim();
        if (val) {
            // Try to extract name and empId if in format "Name (ID)"
            var match = val.match(/^(.*?) \((.*?)\)$/);
            if (match) {
                paxData.push({ seatIdx: i, name: match[1].trim(), empId: match[2].trim() });
            } else {
                paxData.push({ seatIdx: i, name: val, empId: null });
            }
        } else {
            paxData.push({ seatIdx: i, name: null, empId: null });
        }
    }
    
    try {
        var res =  fetch((API_BASE) + "/api/admin/table/assign", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableIdx: tIdx, paxData })
        });
        
        if (!res.ok) {
            var data =  res.json();
            alert(data.error || "Failed to update table.");
            return;
        }
        
        adminBatchModal.classList.add('hidden');
         loadData();
        renderAdminDashboard();
        renderAdminDirectory();
        renderVisualAdminMap();
        showToast("Table " + (tIdx + 1) + " updated successfully.");
    } catch (err) {
        alert("Server error during batch update.");
    }
}

window.deleteEmployee =  function (empId) {
    if (confirm("Are you sure you want to delete employee " + (empId) + "?")) {
        try {
            var res =  fetch((API_BASE) + "/api/employee/delete", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: empId })
            });
            if (!res.ok) {
                var data =  res.json().catch(() => ({}));
                throw new Error(data.error || 'Server error');
            }
             loadData();
            renderAdminDashboard();
            renderAdminDirectory();
            renderVisualAdminMap(); // Added
            showToast("Employee deleted.");
        } catch (err) { alert("Delete Failed: " + (err.message)); }
    }
}

window.deleteAdmin =  function (username) {
    if (confirm("Are you sure you want to delete admin account '" + (username) + "' ? ")) {
        try {
            var res =  fetch((API_BASE) + "/api/admin/delete", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            var data =  res.json();
            if (!res.ok) { alert(data.error); return; }
             loadData();
            renderAdminDashboard();
            showToast("Admin account deleted.");
        } catch (err) { alert('Server error.'); }
    }
}

function handleAddEmployeeSubmit(e) {
    e.preventDefault();
    var name = document.getElementById('new-emp-name').value.trim();
    var id = document.getElementById('new-emp-id').value.trim();
    var email = document.getElementById('new-emp-email').value.trim();
    var dept = document.getElementById('new-emp-dept').value.trim();
    var diet = document.querySelector('input[name="new-diet"]:checked').value;

    fetch((API_BASE) + "/api/employee/add", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, email, dept, diet })
    }).then( function(res) {
        if (!res.ok) { var d =  res.json(); alert(d.error); return; }
        adminEmpModal.classList.add('hidden');
         loadData();
        renderAdminDashboard();
        showToast("Employee created successfully.");
    }).catch(() => alert('Server error.'));
}

window.openEditProfileModal = function (empId) {
    var emp = appData.employees.find(function(e) { return e.id === empId; });
    if (!emp) return;

    document.getElementById('edit-emp-original-id').value = emp.id;
    document.getElementById('edit-emp-name').value = emp.name;
    document.getElementById('edit-emp-id').value = emp.id;
    document.getElementById('edit-emp-email').value = emp.email;
    document.getElementById('edit-emp-dept').value = emp.dept;

    if (emp.diet === 'vegetarian') {
        document.querySelector('input[name="edit-diet"][value="vegetarian"]').checked = true;
    } else {
        document.querySelector('input[name="edit-diet"][value="non-vegetarian"]').checked = true;
    }

    adminEditEmpModal.classList.remove('hidden');
}

function handleEditEmployeeSubmit(e) {
    e.preventDefault();
    var originalId = document.getElementById('edit-emp-original-id').value;
    var name = document.getElementById('edit-emp-name').value.trim();
    var id = document.getElementById('edit-emp-id').value.trim();
    var email = document.getElementById('edit-emp-email').value.trim();
    var dept = document.getElementById('edit-emp-dept').value.trim();
    var diet = document.querySelector('input[name="edit-diet"]:checked').value;

    fetch((API_BASE) + "/api/employee/update", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalId, id, name, email, dept, diet })
    }).then( function(res) {
        if (!res.ok) {
            var d =  res.json().catch(() => ({ error: 'Unknown server error' }));
            alert("Update Failed: " + (d.error || 'Check console for details') + " ");
            console.error("Update error detail:", d);
            return;
        }
        adminEditEmpModal.classList.add('hidden');
         loadData();
        renderAdminDashboard();
        showToast("Employee profile updated.");
    }).catchfunction((err) {
        console.error("Fetch error:", err);
        alert('Connection error. Is the server running?');
    });
}



function handleCsvUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload =  function (evt) {
        var text = evt.target.result;
        var lines = text.split('\n');
        var employees = [];

        // Skip header line assuming: Name, ID, Email, Dept, Diet
        for (var i = 1; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            var parts = line.split(',');
            if (parts.length >= 5) {
                employees.push({
                    name: parts[0].trim(),
                    id: parts[1].trim(),
                    email: parts[2].trim(),
                    dept: parts[3].trim(),
                    diet: parts[4].trim().toLowerCase()
                });
            }
        }

        if (employees.length === 0) {
            alert('No valid employee data found in CSV.');
            return;
        }

        try {
            var res =  fetch((API_BASE) + "/api/employee/import", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employees })
            });
            var data =  res.json();
             loadData();
            renderAdminDashboard();
            showToast("Imported " + (data.imported) + " employees.Skipped " + (data.skipped) + " (already existed).");
        } catch (err) {
            alert('Server error during import.');
        }
    };
    reader.readAsText(file);
}

function renderAdminDashboard() {
    if (!adminTableBody) return;
    var total = TOTAL_TABLES * SEATS_PER_TABLE;
    var reserved = 0;
    var checkedin = 0;

    appData.tables.forEachfunction((table) {
        table.forEachfunction((seat) {
            if (seat) {
                reserved++;
            }
        });
    });

    appData.employees.forEach(function(emp) {
        if (emp.checked_in) checkedin++;
    });

    var adminProfilesSection = document.getElementById('admin-profiles-section');
    if (adminProfilesSection) {
        if (hasPermission('admins')) {
            adminProfilesSection.style.display = 'block';
            adminProfilesTableBody.innerHTML = '';
            appData.admins.forEach(function(admin) {
                var tr = document.createElement('tr');
                var permsCount = admin.permissions ? JSON.parse(admin.permissions).length : 0;
                var permsBrief = admin.role === 'Super Admin' ? 'All Access' : (permsCount > 0 ? (permsCount) + " Sections" : 'None');
                
                tr.innerHTML = "\r\n                    <td data-label=\"Name\">" + (admin.full_name || '-') + "</td>\r\n                    <td data-label=\"Username\">" + (admin.username) + "</td>\r\n                    <td data-label=\"Role\"><span class=\"status-badge\" style=\"background: #f0f0f0; color: #000000; padding: 0.2rem 0.6rem; border: 1px solid #ccc;\">" + (admin.role || 'Admin') + "</span></td>\r\n                    <td data-label=\"Permissions\">" + (permsBrief) + "</td>\r\n                    <td data-label=\"Actions\">\r\n                        <button class=\"btn-primary\" style=\"padding:0.4rem 0.8rem; width: auto; margin-right: 0.3rem;\" onclick=\"openEditAdminModal('" + (admin.username) + "')\">Edit</button>\r\n                        <button class=\"btn-danger\" style=\"padding:0.4rem 0.8rem;\" onclick=\"deleteAdmin('" + (admin.username) + "')\">Delete</button>\r\n                    </td>\r\n                ";
                adminProfilesTableBody.appendChild(tr);
            });
        } else {
            adminProfilesSection.style.display = 'none';
        }
    }



    if (statTotal) statTotal.innerText = total;
    if (statReserved) statReserved.innerText = reserved;
    if (statAvailable) statAvailable.innerText = total - reserved;
    if (statCheckedin) statCheckedin.innerText = checkedin;

    // Update progress bars safely
    var reservedPercent = (reserved / (total || 1)) * 100;
    var checkedinPercent = (checkedin / (total || 1)) * 100;
    var availablePercent = (((total - reserved) / (total || 1))) * 100;

    var mReserved = document.getElementById('meter-reserved');
    var mCheckedin = document.getElementById('meter-checkedin');
    var mAvailable = document.getElementById('meter-available');

    if (mReserved) mReserved.style.width = (reservedPercent) + "%";
    if (mCheckedin) mCheckedin.style.width = (checkedinPercent) + "%";
    if (mAvailable) mAvailable.style.width = (availablePercent) + "%";
}

function initFilters() {
    // Populate Department Filter
    var departments = [...new Set(appData.employees.map(function(e) { return e.dept; }))].sort();
    filterDept.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(function(dept) {
        var opt = document.createElement('option');
        opt.value = dept;
        opt.innerText = dept;
        filterDept.appendChild(opt);
    });
}

function renderAdminDirectory() {
    // Update Count in Directory
    var countEl = document.getElementById('directory-count');

    var searchQuery = (adminSearchEmp.value || '').trim().toLowerCase();
    var deptQuery = filterDept.value;
    var statusQuery = filterStatus.value;
    var checkinQuery = filterCheckin.value;

    var filteredData = [];
    var usedGuestSeats = new Set(); // To track which guest seats were mapped to employees

    // 1. Pre-scan for Guest seats (paxName but no empId) to allow name-based mapping
    var guestSeatMap = new Map(); // name.toLowerCase() -> { tIdx, sIdx, seat }
    appData.tables.forEachfunction((table, tIdx) {
        table.forEachfunction((seat, sIdx) {
            if (seat && !seat.empId && seat.paxName) {
                var key = seat.paxName.trim().toLowerCase();
                if (!guestSeatMap.has(key)) {
                    guestSeatMap.set(key, { t: tIdx + 1, s: sIdx + 1, checkedIn: seat.checkedIn, seatKey: (tIdx) + "-" + (sIdx) });
                }
            }
        });
    });

    // 2. Process Employees
    appData.employees.forEachfunction(function(emp) {
        // A. Primary Match: Match by exact empId
        var seatInfo = null;
        appData.tables.forEach((table, tIdx) {
            table.forEachfunction((seat, sIdx) {
                if (seat && String(seat.empId) === String(emp.id)) {
                    seatInfo = { t: tIdx + 1, s: sIdx + 1, checkedIn: seat.checkedIn };
                }
            });
        });

        // B. Secondary Match: If unassigned, check if they booked by name (Guest entry)
        if (!seatInfo) {
            var nameKey = (emp.name || '').trim().toLowerCase();
            if (guestSeatMap.has(nameKey)) {
                var info = guestSeatMap.get(nameKey);
                seatInfo = { t: info.t, s: info.s, checkedIn: info.checkedIn };
                usedGuestSeats.add(info.seatKey); // Mark as consumed
                console.log("[Directory] Mapped unassigned employee " + (emp.name) + " to Guest seat T" + (info.t) + "-S" + (info.s));
            }
        }

        // Apply filters
        var nameMatch = (emp.name || '').toLowerCase();
        var idMatch = String(emp.id).toLowerCase();
        var deptMatch = (emp.dept || '').toLowerCase();
        
        var matchesSearch = !searchQuery ||
            nameMatch.includes(searchQuery) ||
            idMatch.includes(searchQuery) ||
            (emp.email && emp.email.toLowerCase().includes(searchQuery)) ||
            deptMatch.includes(searchQuery) ||
            (seatInfo && (
                "table " + (seatInfo.t).includes(searchQuery) ||
                "t" + (seatInfo.t).includes(searchQuery) ||
                (seatInfo.t) + "-" + (seatInfo.s).includes(searchQuery)
            ));

        var matchesDept = !deptQuery || emp.dept === deptQuery;

        var matchesStatus = true;
        if (statusQuery === 'seated') matchesStatus = !!seatInfo;
        else if (statusQuery === 'unassigned') matchesStatus = !seatInfo;

        var matchesCheckin = true;
        if (checkinQuery === 'yes') matchesCheckin = emp.checked_in;
        else if (checkinQuery === 'no') matchesCheckin = !emp.checked_in;

        if (matchesSearch && matchesDept && matchesStatus && matchesCheckin) {
            filteredData.push({ emp, seatInfo });
        }
    });

    // 3. Process remaining true GUESTS (not mapped to any employee)
    appData.tables.forEachfunction((table, tIdx) {
        table.forEachfunction((seat, sIdx) {
            var seatKey = (tIdx) + "-" + (sIdx);
            if (seat && !seat.empId && seat.paxName && !usedGuestSeats.has(seatKey)) {
                var guestEmp = {
                    id: "GUEST-" + (tIdx+1) + "-" + (sIdx+1),
                    name: seat.paxName,
                    dept: 'GUEST',
                    email: '-',
                    diet: '-',
                    checked_in: seat.checkedIn || 0,
                    is_guest: true
                };
                
                var seatInfo = { t: tIdx + 1, s: sIdx + 1, checkedIn: seat.checkedIn };
                
                var matchesSearch = !searchQuery || 
                    guestEmp.name.toLowerCase().includes(searchQuery) || 
                    guestEmp.id.toLowerCase().includes(searchQuery) ||
                    (seatInfo && (
                        "table " + (seatInfo.t).includes(searchQuery) ||
                        "t" + (seatInfo.t).includes(searchQuery) ||
                        (seatInfo.t) + "-" + (seatInfo.s).includes(searchQuery)
                    ));
                
                var matchesDept = !deptQuery || deptQuery === 'GUEST';
                
                var matchesStatus = true;
                if (statusQuery === 'unassigned') matchesStatus = false;
                
                var matchesCheckin = true;
                if (checkinQuery === 'yes') matchesCheckin = guestEmp.checked_in;
                else if (checkinQuery === 'no') matchesCheckin = !guestEmp.checked_in;

                if (matchesSearch && matchesDept && matchesStatus && matchesCheckin) {
                    filteredData.push({ emp: guestEmp, seatInfo });
                }
            }
        });
    });

    if (countEl) countEl.innerText = filteredData.length.toLocaleString();
    adminTableBody.innerHTML = '';

    filteredData.forEachfunction(({ emp, seatInfo }) {
        var tr = document.createElement('tr');

        var statusHtml = '';
        var checkinActionHtml = '';
        var managementButtonsHtml = '';

        var safeEmpName = emp.name.replace(/'/g, "\\'");
        
        if (seatInfo) {
            statusHtml = seatInfo.checked_in ?
                '<span class="status-badge checked-in">Checked In</span>' :
                '<span class="status-badge reserved">Reserved (T' + seatInfo.t + ')</span>';

            checkinActionHtml = emp.checked_in ?
                "<button class=\"admin-action-btn btn-compact-outline\" onclick=\"updateCheckin('" + (emp.id) + "', 'no')\" title=\"Undo Check-In\">???????/button>" :
                "<button class=\"admin-action-btn btn-compact-primary\" onclick=\"updateCheckin('" + (emp.id) + "', 'yes')\" title=\"Check In\">??/button>";

            managementButtonsHtml = "\r\n            <button class=\"admin-action-btn btn-compact-outline\" onclick=\"openEditProfileModal('" + (emp.id) + "')\" title=\"Edit Profile\">?????/button>\r\n                <button class=\"admin-action-btn btn-compact-outline\" onclick=\"openEditSeatModal(" + (seatInfo.t - 1) + ", " + (seatInfo.s - 1) + ", '" + (emp.id) + "', '" + (safeEmpName) + "')\" title=\"Change Seat\">?????/button>\r\n                <button class=\"admin-action-btn btn-compact-danger\" onclick=\"removeReservation(" + (seatInfo.t - 1) + ", " + (seatInfo.s - 1) + ")\" title=\"Unassign Seat\">?????/button>\r\n        ";
        } else {
            statusHtml = '<span class="status-badge available">Unassigned</span>';
            checkinActionHtml = emp.checked_in ?
                "<button class=\"admin-action-btn btn-compact-outline\" onclick=\"updateCheckin('" + (emp.id) + "', 'no')\" title=\"Undo Check-In\">???????/button>" :
                "<button class=\"admin-action-btn btn-compact-primary\" onclick=\"updateCheckin('" + (emp.id) + "', 'yes')\" title=\"Check In\">??/button>";

            managementButtonsHtml = "\r\n            <button class=\"admin-action-btn btn-compact-outline\" onclick=\"openEditProfileModal('" + (emp.id) + "')\" title=\"Edit Profile\">?????/button>\r\n                <button class=\"admin-action-btn btn-compact-primary\" onclick=\"openEditSeatModal(null, null, '" + (emp.id) + "', '" + (safeEmpName) + "')\" title=\"Assign Seat\">?????</button>\r\n                <button class=\"admin-action-btn btn-compact-danger\" onclick=\"deleteEmployee('" + (emp.id) + "')\" title=\"Delete Employee\">???????/button>\r\n        ";
        }

        var safeEmpId = String(emp.id).replace(/'/g, "\\'");
        
        tr.innerHTML = "\r\n            <td data-label=\"Location\" class=\"font-medium\">" + (seatInfo ? 'T' + seatInfo.t + ' - S' + seatInfo.s : '<span style="color:var(--text-muted)">-</span>') + "</td>\r\n            <td data-label=\"Employee Name\"><strong class=\"font-bold\">" + (emp.name) + "</strong></td>\r\n            <td data-label=\"ID\"><code>" + (emp.id) + "</code></td>\r\n            <td data-label=\"Email\" style=\"font-size:0.85rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis;\">" + (emp.email || '<span style="color:var(--text-muted)">-</span>') + "</td>\r\n            <td data-label=\"Dept\"><span style=\"font-size:0.85rem;\">" + (emp.dept) + "</span></td>\r\n            <td data-label=\"Diet\"><span style=\"font-size:0.85rem;\" class=\"diet-badge " + (emp.diet === 'vegetarian' ? 'veg' : 'non-veg') + "\">" + (emp.diet || '-') + "</span></td>\r\n            <td data-label=\"Gift\" class=\"text-center\">\r\n                " + (emp.door_gift_claimed === 1 ? 
                    '<span class="door-gift-claimed-badge" style="padding: 0.2rem 0.5rem; font-size: 0.7rem;">Claimed</span>' : 
                    (emp.checked_in ? "<button class=\"admin-action-btn btn-compact-primary\" onclick=\"window.openDoorGiftModal('" + (safeEmpId) + "')\" title=\"Claim Gift\">?????/button>" : '<span style="color:var(--text-muted); font-size: 0.7rem;">Wait Check-In</span>')
                ) + "\r\n            </td>\r\n            <td data-label=\"Status\" class=\"text-center\">" + (statusHtml) + "</td>\r\n            <td data-label=\"Check-in\" class=\"text-center\">" + (checkinActionHtml) + "</td>\r\n            <td data-label=\"Manage\" class=\"text-center\">\r\n                <div style=\"display:flex; gap:0.4rem; justify-content: center;\">\r\n                    <button class=\"admin-action-btn btn-compact-outline\" onclick=\"window.downloadSingleQR('" + (safeEmpId) + "')\" title=\"Download QR Badge\" style=\"border-color: var(--accent-gold); color: var(--accent-gold);\">QR</button>\r\n                    " + (managementButtonsHtml) + "\r\n                </div>\r\n            </td>\r\n        ";
        adminTableBody.appendChild(tr);
    });
}

window.updateCheckin =  function (empId, status) {
    try {
        var undo = status === 'no';
        var res =  fetch((API_BASE) + "/api/seat/checkin", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, undo })
        });
        if (!res.ok) {
            var data =  res.json();
            alert(data.error || 'Failed to update check-in status.');
            return;
        }
         loadData();
        renderAdminDashboard();
        renderAdminDirectory();
    renderPrizeInventory();
    renderDoorGiftMgmt();
        renderVisualAdminMap();
        showToast(undo ? 'Check-in undone.' : 'Employee checked in successfully!');
    } catch (err) {
        alert('Server error while updating check-in.');
    }
}

function renderDoorGiftMgmt() {
    if (typeof doorGiftMgmtTable === "undefined" || !doorGiftMgmtTable) return;
    if (!adminTabDoorgifts || adminTabDoorgifts.classList.contains('hidden')) return;

    var searchTerm = doorgiftsSearchInput?.value.toLowerCase() || "";
    var statusFilter = doorgiftsFilterStatus?.value || "";
    var dietFilter = doorgiftsFilterDiet?.value || "";

    var claimedCount = 0;
    var pendingCount = 0;

    var filtered = appData.employees.filter(function(emp) {
        var matchesSearch = emp.name.toLowerCase().includes(searchTerm) || String(emp.id).includes(searchTerm);
        var isClaimed = emp.door_gift_claimed === 1 || emp.door_gift_claimed === true;
        var matchesStatus = statusFilter === "" || (statusFilter === "claimed" ? isClaimed : !isClaimed);
        var matchesDiet = dietFilter === "" || emp.diet === dietFilter;
        
        if (isClaimed) claimedCount++; else pendingCount++;

        return matchesSearch && matchesStatus && matchesDiet;
    });

    if (statDoorgiftClaimed) statDoorgiftClaimed.innerText = claimedCount;
    if (statDoorgiftPending) statDoorgiftPending.innerText = pendingCount;

    if (!adminDoorgiftsTableBody) return;
    adminDoorgiftsTableBody.innerHTML = '';

    filtered.forEach(function(emp) {
        var isClaimed = emp.door_gift_claimed === 1 || emp.door_gift_claimed === true;
        var row = document.createElement('tr');
        row.innerHTML = "\r\n            <td>\r\n                <div style=\"font-weight:700; color:var(--primary-dark);\">" + (emp.name) + "</div>\r\n                <div style=\"font-size:0.75rem; color:var(--text-muted);\">ID: " + (emp.id) + "</div>\r\n            </td>\r\n            <td>" + (emp.diet || 'Standard') + "</td>\r\n            <td>" + (emp.checked_in ? '<span class="status-badge status-checked-in">Checked In</span>' : '<span class="status-badge status-pending">Pending</span>') + "</td>\r\n            <td>\r\n                " + (isClaimed 
                    ? '<span class="door-gift-claimed-badge" style="padding: 0.3rem 0.8rem; font-size: 0.7rem;">Claimed</span>' 
                    : '<span style="color:var(--text-muted); font-size: 0.8rem;">Not Claimed</span>') + "\r\n            </td>\r\n            <td style=\"text-align: right;\">\r\n                " + ((!isClaimed && emp.checked_in) 
                    ? "<button class=\"btn-door-gift\" style=\"padding: 0.4rem 0.8rem; font-size: 0.75rem;\" onclick=\"window.claimDoorGiftFast('" + (emp.id) + "')\">?????Claim</button>" 
                    : (isClaimed 
                        ? "<button class=\"btn-danger\" style=\"padding: 0.4rem 0.8rem; font-size: 0.75rem; background:#dc3545; border:none; border-radius:4px; color:white;\" onclick=\"window.revokeDoorGift('" + (emp.id) + "')\">?????Revoke</button>" 
                        : '')) + "\r\n            </td>\r\n        ";
        adminDoorgiftsTableBody.appendChild(row);
    });
}

// Helper to switch admin tabs
function showAdminTab(targetView, targetBtn) {
    if (!targetView) return;
    
    // Nuclear Clear for Visual Map to prevent ghosting
    // Aggressive cleanup for all possible layout containers
    var containers = ['admin-visual-floor-layout', 'admin-floor-layout', 'floor-layout-admin'];
    containers.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });
    if (typeof adminVisualFloorLayout !== "undefined" && adminVisualFloorLayout) {
        adminVisualFloorLayout.innerHTML = '';
    }
    
    // Hide all admin tabs

    adminTabBtns.forEach(function(b) { if (b) b.classList.remove('active'); });
    adminTabViews.forEach(function(v) {
        if (v) {
            v.classList.add('hidden');
            v.style.opacity = '0';
            v.style.transform = 'translateY(10px)';
        }
    });

    if (targetBtn) targetBtn.classList.add('active');
    if (targetView) {
        targetView.classList.remove('hidden');
        setTimeout(function() {
            targetView.style.transition = 'all 0.3s ease-out';
            targetView.style.opacity = '1';
            targetView.style.transform = 'translateY(0)';
        }, 10);
    }
}

function renderVisualAdminMap() {
    adminFloorLayout.innerHTML = '';

    appData.tables.forEachfunction((table, tableIdx) {
        var tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';

        var tableCenter = document.createElement('div');
        tableCenter.className = 'table-center';
        
        var tStatusObj = appData.tablesStatus ? appData.tablesStatus.find(function(ts) { return ts.tableIdx === tableIdx; }) : null;
        var isOffline = tStatusObj && tStatusObj.status === 'Reservation';

        // Add interactive styling based on mode
        if (adminSeatingMode === 'table') {
            tableCenter.style.cursor = isOffline ? 'not-allowed' : 'pointer';
            tableCenter.classList.add('table-mode');
            tableCenter.title = isOffline ? "Table is reserved for offline booking" : "Click to assign 11 people to this table";
            tableCenter.addEventListener('click',  function() {
                if (isOffline) {
                    showToast("?????Table " + (tableIdx + 1) + " is reserved for offline booking.", "danger");
                    return;
                }
                openAdminBatchModal(tableIdx);
            });
        }

        // Content changes based on mode
        if (adminSeatingMode === 'table') {
            tableCenter.innerHTML = "\r\n                <h3 style=\"margin:0;\">Table " + (tableIdx + 1) + "</h3>\r\n                <div style=\"font-size: 0.7rem; color: var(--accent-gold); font-weight: bold; margin-top: 5px;\">BATCH BOOKING</div>\r\n            ";
        } else {
            tableCenter.innerHTML = "\r\n                <h3>Table " + (tableIdx + 1) + "</h3>\r\n                <div class=\"toggle-container\" style=\"margin-top:0.5rem; display: flex; justify-content: center;\">\r\n                    <button class=\"btn-primary toggle-btn-el\" data-table=\"" + (tableIdx) + "\"\r\n                        style=\"font-size:0.75rem; padding:0.4rem 0.8rem; background: " + (isOffline ? 'var(--accent-gold)' : '#000000') + "; width:auto; transform: none; box-shadow: none; position: relative; z-index: 10;\">\r\n                        " + (isOffline ? 'Set Online' : 'Set Reservation') + "\r\n                    </button>\r\n                </div>\r\n            ";
            var toggleBtn = tableCenter.querySelector('.toggle-btn-el');
            if (toggleBtn) {
                toggleBtn.addEventListenerfunction('click', (e) {
                    e.stopPropagation();
                    var newStatus = isOffline ? 'Online' : 'Reservation';
                    window.toggleTableStatus(tableIdx, newStatus);
                });
            }
        }

        tableContainer.appendChild(tableCenter);
        if (isOffline) tableContainer.classList.add('offline');

        var bookedSeatsCount = table.filter(function(s) { return s !== null; }).length;
        var totalSeatsCount = table.length;
        if (bookedSeatsCount === totalSeatsCount) tableCenter.classList.add('fully-booked');
        else if (bookedSeatsCount > 0) tableCenter.classList.add('partially-booked');

        // Show Booking Locks in Admin View
        var tLock = isResourceLocked(tableIdx);
        if (tLock) {
            tableContainer.classList.add('in-progress');
            var booker = appData.employees.find(function(e) { return e.id === tLock.empId; });
            var bookerName = booker ? booker.name : tLock.empId;
            tableCenter.innerHTML += "<div class=\"booking-status\" style=\"position: absolute; top: -10px; left: 50%; transform: translateX(-50%); background: var(--accent-gold); color: black; padding: 2px 8px; border-radius: 10px; font-size: 0.65rem; white-space: nowrap; z-index: 15; font-weight: bold;\">Locked: " + (bookerName) + "</div>";
        }

        var radius = 100;
        var centerX = 125;
        var centerY = 125;

        table.forEachfunction((seat, seatIdx) {
            var angle = (seatIdx / table.length) * 2 * Math.PI - (Math.PI / 2);
            var x = centerX + radius * Math.cos(angle) - 16;
            var y = centerY + radius * Math.sin(angle) - 16;

            var seatEl = document.createElement('div');
            seatEl.className = 'seat';
            seatEl.id = "admin-seat-t" + (tableIdx) + "-s" + (seatIdx);
            if (isOffline) seatEl.classList.add('offline');
            seatEl.style.left = (x) + "px";
            seatEl.style.top = (y) + "px";
            seatEl.innerText = seatIdx + 1;

            if (seat) {
                if (seat.checked_in) {
                    seatEl.classList.add('checked-in');
                    seatEl.title = (seat.name) + " (Checked In)";
                } else {
                    seatEl.classList.add('reserved');
                    seatEl.title = "Reserved: " + (seat.name) + " ";
                }
                
                if (adminSeatingMode === 'seat') {
                    seatEl.style.cursor = 'pointer';
                    seatEl.addEventListener('click',  () => openEditSeatModal(tableIdx, seatIdx, seat.empId, seat.name));
                } else {
                    seatEl.style.cursor = 'default';
                    seatEl.style.opacity = '0.6';
                }
            } else {
                var sLock = isResourceLocked(tableIdx, seatIdx);
                if (tLock || sLock) {
                    seatEl.classList.add('in-progress');
                    seatEl.innerHTML = '???';
                    seatEl.title = "Locked by another user";
                } else {
                    seatEl.title = "Available";
                }

                if (adminSeatingMode === 'seat') {
                    seatEl.style.cursor = 'pointer';
                    seatEl.addEventListener('click',  () => openEditSeatModal(tableIdx, seatIdx, null, 'Available'));
                } else {
                    seatEl.style.cursor = 'default';
                    seatEl.style.opacity = '0.4';
                }
            }

            tableContainer.appendChild(seatEl);
        });

        adminFloorLayout.appendChild(tableContainer);
    });
}


function updateActivePrizeIndicator() {
    if (!activePrizeBanner || !activePrizeName) return;
    
    var currentPrizes = (appData.prizes || []).filter(function(p) { return p.session === currentLuckydrawSession; });
    
    var nextPrize = null;
    
    // 1. Check if we have a "sticky" prize from a recent redraw
    if (stickyPrizeId) {
        nextPrize = currentPrizes.find(function(p) { return p.id === stickyPrizeId && (p.drawnIds || []; }).length < p.quantity);
    }
    
    // 2. Otherwise find the first available prize by rank/name
    if (!nextPrize) {
        nextPrize = currentPrizes
            .filter(function(p) { return (p.drawnIds || []; }).length < p.quantity)
            .sortfunction((a, b) {
                var rankA = parseInt(a.prize_rank) || 0;
                var rankB = parseInt(b.prize_rank) || 0;
                if (rankA !== rankB) return rankB - rankA;
                return a.name.localeCompare(b.name);
            })[0];
    }
    
    if (nextPrize) {
        var rankText = nextPrize.prize_rank ? (nextPrize.prize_rank) + " - " : '';
        activePrizeName.textContent = (rankText) + (nextPrize.name);
        activePrizeBanner.style.display = 'none'; // Keep hidden until Next Prize is clicked
        if (btnNextPrize) btnNextPrize.style.display = 'block';
        if (btnDrawWinner) btnDrawWinner.style.display = 'none';
        activePrizeBanner.style.background = 'rgba(8, 107, 97, 0.1)'; 
        activePrizeBanner.querySelector('span').textContent = 'Next Drawing:';
    } else {
        activePrizeBanner.style.display = 'none';
        if (btnNextPrize) btnNextPrize.style.display = 'none';
        if (btnDrawWinner) btnDrawWinner.style.display = 'none';
    }
}

window.showNextPrize = function() {
    if (winnerDisplay) winnerDisplay.innerHTML = '<h3 style="color: var(--text-muted); font-weight: normal;">Ready to draw...</h3>';
    if (activePrizeBanner) activePrizeBanner.style.display = 'block';
    if (btnNextPrize) btnNextPrize.style.display = 'none';
    if (btnDrawWinner) btnDrawWinner.style.display = 'block';
    if (btnRedrawLast) btnRedrawLast.style.display = 'none';
}

window.openEditPrizeModal = function (prizeId) {
    console.log("TRIGGER: openEditPrizeModal for ID:", prizeId);
    try {
        var modal = document.getElementById('modal-prize-edit');
        if (!modal) return;
        var prize = appData.prizes.find(function(p) { return String(p.id; }) === String(prizeId));
        if (!prize) return;

        var els = {
            id: document.getElementById('edit-prize-id'),
            session: document.getElementById('edit-prize-session'),
            name: document.getElementById('edit-prize-name'),
            rank: document.getElementById('edit-prize-rank'),
            qty: document.getElementById('edit-prize-qty')
        };

        if (els.id) els.id.value = prize.id;
        if (els.session) els.session.value = prize.session;
        if (els.name) els.name.value = prize.name;
        if (els.rank) els.rank.value = prize.prize_rank || '';
        if (els.qty) els.qty.value = prize.quantity;

        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    } catch (err) { console.error(err); }
};

window.revokeWinner =  function(prizeId, empId) {
    if (!confirm('Are you sure you want to revoke this winner? The prize will be returned to the undrawn pool.')) return;
    try {
        var res =  fetch('' + (API_BASE) + '/api/luckydraw/revoke', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prizeId, empId })
        });
        if (!res.ok) {
            var data =  res.json();
            throw new Error(data.error || 'Server error');
        }
         loadData();
        renderLuckyDrawWinners();
        showToast('Winner revoked. Prize available for redraw.');
    } catch (err) {
        alert('Failed to revoke winner: ' + err.message);
    }
};

// --- Global Utilities ---

window.toggleFullScreen = function() {
    var elem = document.getElementById('admin-tab-luckydraw');
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        if (typeof btnToggleFullscreen !== 'undefined' && btnToggleFullscreen) btnToggleFullscreen.textContent = '??Exit Fullscreen';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        if (typeof btnToggleFullscreen !== 'undefined' && btnToggleFullscreen) btnToggleFullscreen.textContent = '?????Fullscreen';
    }
};

// QR Logic starts below




// --- Entertainment Hub Logic ---
// --- QR CHECK-IN LOGIC ---
var html5QrScanner = null;
var currentScannedUser = null;

 function initQRScanner(targetId = "qr-reader", customCallback = null) {
    diagLog("Starting Camera Initialization for [" + (targetId) + "]...", "cyan");
    
    // 0. Security Context Check
    if (!window.isSecureContext || window.location.protocol === 'http:') {
        diagLog("CRITICAL: Camera blocked due to insecure (HTTP) connection.", "red");
        showToast("SECURITY ERROR: HTTPS is required for camera access.", "danger");
        return;
    }

    // 1. Cleanup previous instance
    if (html5QrScanner) {
        try {
            diagLog("Stopping previous scanner instance...", "gray");
             html5QrScanner.stop();
        } catch (e) {
            console.warn("[QR] Stop failed:", e);
        }
        html5QrScanner = null;
    }

    // 2. Clear the container to be absolutely sure
    var container = document.getElementById("qr-reader");
    if (container) container.innerHTML = "";

    // 3. Define Fallback Sequence
    var searchAttempts = [
        { 
            name: "HD Environment",
            constraints: { 
                facingMode: "environment",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        },
        { 
            name: "SD Environment",
            constraints: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        { 
            name: "High-Res Laptop (5MP)",
            constraints: { 
                facingMode: "user",
                width: { ideal: 2560 },
                height: { ideal: 1920 }
            }
        },
        { 
            name: "Laptop/Front SD",
            constraints: { 
                facingMode: "user",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        },
        { 
            name: "Laptop Basic",
            constraints: { facingMode: "user" }
        },
        { 
            name: "Universal Basic",
            constraints: true // Zero constraints fallback
        }
    ];

    var config = { 
        fps: 15, // Reduced for higher decoding accuracy on lower-end webcams
        qrbox: { width: 250, height: 250 }, // Use a fixed, consistent box size
        formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
        experimentalFeatures: { useBarCodeDetectorIfSupported: false }, // Bypass buggy Chrome hardware decoders
        disableFlip: false, // Ensure mirror-inverted camera streams are processed properly
        rememberLastUsedCamera: true
    };

    // 4. Execute Attempt Chain
    setTimeout( function() {
        for (var attempt of searchAttempts) {
            try {
                diagLog("Attempting Cam: " + (attempt.name) + "...", "white");
                html5QrScanner = new Html5Qrcode(targetId);
                
                // Refined constraints: removing aspectRatio if it causes issues
                var constraints = attempt.constraints;

                 html5QrScanner.start(constraints, config, customCallback || onScanSuccess, onScanError);
                diagLog("SUCCESS: Camera started in " + (attempt.name) + " mode.", "lime");
                if (attempt.name.includes("Laptop")) {
                    if (attempt.name.includes("5MP")) {
                        diagLog("HIGH-RES ACTIVE: Leveraging 5MP sensor for maximum detail.", "cyan");
                    }
                    diagLog("FOCUS TIP: Hold badge 30cm (1 ruler length) away from camera.", "yellow");
                }
                return; // Exit loop on success
            } catch (err) {
                var errName = err.name || "Error";
                var errMsg = err.message || "Unknown hardware error";
                console.warn("[QR] " + (attempt.name) + " failed:", err);
                diagLog((attempt.name) + " failed: [" + (errName) + "] " + (errMsg), "orange");
                
                // Cleanup instance for next attempt
                if (html5QrScanner) {
                    try {  html5QrScanner.clear(); } catch(e) {}
                    html5QrScanner = null;
                }
            }
        }
        
        // Final fallback: Diagnostics collection
        try {
            var devices =  Html5Qrcode.getCameras();
            if (devices && devices.length > 0) {
                diagLog("Found " + (devices.length) + " cameras. Labels: " + (devices.map(function(d) { return d.label; }).join(", ")), "yellow");
            } else {
                diagLog("NO CAMERAS DETECTED by browser.", "red");
            }
        } catch (devErr) {
            diagLog("Could not enumerate cameras.", "red");
        }

        diagLog("CRITICAL: All camera attempts failed.", "red");
        showToast("Fatal Camera Error. Check permissions or HTTPS.", "danger");
    }, 400);
}

window.forceRestartCamera =  function() {
    showToast("Re-initializing camera...", "info");
    if (html5QrScanner) {
        try {  html5QrScanner.stop(); } catch(e) {}
        html5QrScanner = null;
    }
    // Try absolute minimal path
    initQRScanner();
}

function playSuccessSound() {
    try {
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioCtx.createOscillator();
        var gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.1); // E6

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.warn("Audio feedback failed:", e);
    }
}

function onScanSuccess(decodedText, decodedResult) {
    var text = (decodedText || "").trim();
    if (!text) return;

    diagLog("QR Detected: [" + (text) + "]", "lime");
    
    // QR contains Employee ID
    var emp = appData.employees.find(function(e) { return String(e.id; }).trim() === text);
    
    if (emp) {
        diagLog("Match Found: " + (emp.name), "lime");
        playSuccessSound();
        showScannedUserDetails(emp);
    } else {
        diagLog("No match for ID: " + (text), "orange");
        showToast("Unknown QR Code: " + (text), "warning");
    }
}

function onScanError(err) {
    // Suppress console errors for scanning frames without QR
}

function showScannedUserDetails(emp) {
    currentScannedUser = emp;
    
    var placeholder = document.getElementById('checkin-id-preview');
    var userPanel = document.getElementById('checkin-active-user');
    
    if (placeholder) placeholder.classList.add('hidden');
    if (userPanel) userPanel.classList.remove('hidden');
    
    document.getElementById('checkin-display-id').innerText = emp.id;
    document.getElementById('checkin-display-name').innerText = emp.name;
    document.getElementById('checkin-display-dept').innerText = emp.dept;
    document.getElementById('checkin-display-diet').innerText = emp.diet || 'Normal';
    
    // Check if already checked in
    var btn = document.getElementById('btn-confirm-checkin');
    if (emp.checked_in) {
        btn.innerText = "ALREADY CHECKED IN";
        btn.disabled = true;
        btn.style.opacity = "0.5";
    } else {
        btn.innerHTML = 'CHECK IN <span class="kbd-hint">Press Enter ??/span>';
        btn.disabled = false;
        btn.style.opacity = "1";
    }

    // Seating info
    var seatInfo = "No Seat Assigned";
    appData.tables.forEachfunction((table, tIdx) {
        table.forEachfunction((seat, sIdx) {
            if (seat && seat.empId === emp.id) {
                seatInfo = "Table " + (tIdx + 1) + ", Seat " + (sIdx + 1);
            }
        });
    });
    document.getElementById('checkin-display-table').innerText = seatInfo;
    
    // Auto-focus container for Enter capture
    btn.focus();
}

function resetQRCheckinUI() {
    currentScannedUser = null;
    var placeholder = document.getElementById('checkin-id-preview');
    var userPanel = document.getElementById('checkin-active-user');
    var successPane = document.getElementById('checkin-success-pane');
    
    if (placeholder) placeholder.classList.remove('hidden');
    if (userPanel) userPanel.classList.add('hidden');
    if (successPane) successPane.classList.add('hidden');
}

// Global Enter key listener for Check-In
window.addEventListenerfunction('keydown', (e) {
    if (e.key === 'Enter') {
        var checkinBtn = document.getElementById('btn-confirm-checkin');
        if (checkinBtn && !checkinBtn.disabled && !document.getElementById('view-checkin').classList.contains('hidden') && currentScannedUser) {
            handleConfirmCheckin();
        }
    }
});

 function handleConfirmCheckin() {
    if (!currentScannedUser) return;
    
    var emp = currentScannedUser;
    var btn = document.getElementById('btn-confirm-checkin');
    var originalContent = btn.innerHTML;
    
    btn.disabled = true;
    btn.innerText = "Processing Fast-Track Entry...";
    
    try {
        // Updated to use the combined Check-In + Door Gift endpoint (v1.5.70)
        var res =  fetch((API_BASE) + "/api/checkin/combined", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId: emp.id })
        });
        
        if (res.ok) {
            var data =  res.json();
            showToast("??" + (emp.name) + " Checked-In & Gift Claimed!", "success");
            
            // Immediately hide user details and show success pane
            document.getElementById('checkin-active-user').classList.add('hidden');
            var successPane = document.getElementById('checkin-success-pane');
            if (successPane) {
                // Update success pane to mention gift
                var successTitle = successPane.querySelector('h2');
                if (successTitle) successTitle.innerText = "Entry & Gift Success!";
                successPane.classList.remove('hidden');
            }

            // Trigger data refresh in background
            loadData().then(function() {
                diagLog("[Checkin] Combined update synced to state", "lime");
            });
            
            // Auto-reset UI after 4 seconds for next person
            setTimeout(function() {
                resetQRCheckinUI();
                btn.disabled = false;
                btn.innerHTML = originalContent;
            }, 4000);
        } else {
            var err =  res.json();
            showToast(err.error || "Process failed.", "danger");
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    } catch (err) {
        console.error("Combined check-in error:", err);
        showToast("Network Error. Check server connectivity.", "danger");
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}


// --- QR GENERATION LOGIC ---
 function drawBadgeOnCanvas(emp, canvas, tempQrDiv) {
    var ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

// Initial initialization delay to prevent QRCode.js race conditions in loops (v1.5.66)
    tempQrDiv.innerHTML = '';
     new Promise(r => setTimeout(r, 100));
    
    // Generate QR code into a temp div (Internal size 500x500 for high resolution)
    var qrcode = new QRCode(tempQrDiv, {
        text: String(emp.id),
        width: 500,
        height: 500,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    // Improved QR detection loop
    var qrImg =  new Promisefunction((resolve) {
        var attempts = 0;
        var check = function() {
            var img = tempQrDiv.querySelector('img');
            if (img && img.src && img.complete) {
                resolve(img);
            } else if (attempts < 20) {
                attempts++;
                setTimeout(check, 50);
            } else {
                resolve(null);
            }
        };
        check();
    });

    if (!qrImg) {
        console.error("[BadgeGen] Failed to generate QR after 1s for:", emp.id);
        return false;
    }
    
    // Draw QR to canvas (Centered with safe margin)
    ctx.drawImage(qrImg, 50, 50, 500, 500);
    
    // Draw Text Background (Lowered for 600x800 canvas)
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(30, 570, 540, 180);
    
    // Text configuration
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    
    // Name - Smart Multi-line Wrapping (v1.5.66 Improved)
    var fullName = (emp.name || "").trim().toUpperCase();
    ctx.font = 'bold 32px Arial';
    
    if (fullName.length > 20) {
        // Find a space near the middle to split
        var splitIdx = fullName.lastIndexOf(' ', 22);
        if (splitIdx === -1) splitIdx = 22; // Force split if no space
        
        var line1 = fullName.substring(0, splitIdx);
        var line2 = fullName.substring(splitIdx).trim();
        
        ctx.fillText(line1, 300, 630);
        ctx.fillText(line2, 300, 670);
    } else {
        ctx.font = 'bold 38px Arial';
        ctx.fillText(fullName, 300, 650);
    }
    
    // Dept
    ctx.font = '26px Arial';
    ctx.fillStyle = '#666666';
    ctx.fillText(emp.dept || "GENERAL", 300, 720);
    
    // Branding
    ctx.font = 'italic 16px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText("Appreciation Dinner 2026", 300, 775);
    
    return true;
}

window.downloadSingleQR =  function(empId) {
    var emp = appData.employees.find(function(e) { return String(e.id; }) === String(empId));
    if (!emp) {
        showToast("Employee not found.", "danger");
        return;
    }

    var canvas = document.getElementById('qr-gen-canvas');
    var tempDiv = document.getElementById('qr-gen-temp-div');
    
    showToast("Generating badge for " + (emp.name) + "...", "info");
    var success =  drawBadgeOnCanvas(emp, canvas, tempDiv);
    
    if (success) {
        var url = canvas.toDataURL('image/png');
        var link = document.createElement('a');
        link.download = "QR_" + (emp.id) + "_" + (emp.name.replace(/[^a-z0-9]/gi, '_')) + ".png";
        link.href = url;
        link.click();
        showToast("QR Downloaded!", "success");
    } else {
        showToast("Failed to generate QR.", "danger");
    }
};

 function generateBatchQR() {
    var list = appData.employees;
    if (!list || list.length === 0) {
        alert("No employees found to generate QR codes.");
        return;
    }
    
    if (!confirm("Generate and Download QR Codes for " + (list.length) + " employees?")) return;
    
    var zip = new JSZip();
    var folder = zip.folder("Employee_QR_Badges");
    
    showToast("Generating QR Codes... please wait.", "info");
    
    var canvas = document.getElementById('qr-gen-canvas');
    var tempDiv = document.getElementById('qr-gen-temp-div');
    
    for (var emp of list) {
        var success =  drawBadgeOnCanvas(emp, canvas, tempDiv);
        if (!success) continue;
        
        // Add to ZIP
        var blob =  new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        var fileName = (emp.id) + "_" + (emp.name.replace(/[^a-z0-9]/gi, '_')) + ".png";
        folder.file(fileName, blob);
    }
    
    showToast("Finalizing ZIP...", "info");
    var content =  zip.generateAsync({ type: "blob" });
    saveAs(content, "Employee_QR_Badges_2026.zip");
    showToast("Download Started!", "success");
}

// --- END OF FILE v1.6.86 ---




// --- Restored: renderLuckyDrawWinners ---
function renderLuckyDrawWinners() {
    if (!luckydrawWinnersBody) {
        console.warn("[LuckyDraw] luckydrawWinnersBody element not found. Skipping render.");
        return;
    }
    updateEligibleCount();
    luckydrawWinnersBody.innerHTML = '';
    if (publicLuckydrawWinnersBody) publicLuckydrawWinnersBody.innerHTML = '';
    if (publicLuckydrawWinnersCards) publicLuckydrawWinnersCards.innerHTML = '';

    var searchTerm = (document.getElementById('winner-search')?.value || '').toLowerCase().trim();
    var isMobile = window.innerWidth < 768;

    // Toggle containers based on viewport
    if (publicLuckydrawWinnersTableContainer && publicLuckydrawWinnersCards) {
        if (isMobile) {
            publicLuckydrawWinnersTableContainer.style.display = 'none';
            publicLuckydrawWinnersCards.style.display = 'flex';
        } else {
            publicLuckydrawWinnersTableContainer.style.display = 'block';
            publicLuckydrawWinnersCards.style.display = 'none';
        }
    }

    // Get prizes for current session and sort by rank DESC (8 > 7 > 6 > 5 > 4)
    var currentPrizes = (appData.prizes || []).filter(function(p) { return p.session === currentLuckydrawSession; });
    currentPrizes.sortfunction((a, b) {
        var rankA = parseInt(a.prize_rank) || 0;
        var rankB = parseInt(b.prize_rank) || 0;
        if (rankA !== rankB) return rankB - rankA;
        return a.name.localeCompare(b.name);
    });

    // Calculate session summary
    var sessionTotalQty = 0;
    var drawsCount = 0;
    var filteredCount = 0;
    
    currentPrizes.forEach(function(p) {
        sessionTotalQty += p.quantity;
        drawsCount += (p.drawnIds || []).length;
    });

    // Update summary displays
    var updateSummary = function(sumElem, qtyElem) {
        if (!sumElem) return;
        if (drawsCount > 0) {
            sumElem.style.display = 'flex';
            qtyElem.textContent = '' + (drawsCount) + ' / ' + (sessionTotalQty) + ' Items';
        } else {
            sumElem.style.display = 'none';
        }
    };
    updateSummary(adminSessionSummary, adminSessionTotalQty);
    updateSummary(publicSessionSummary, publicSessionTotalQty);
    
    updateActivePrizeIndicator();

    var bulkContainer = document.getElementById('bulk-draw-controls');
    if (bulkContainer) {
        bulkContainer.innerHTML = '';
        var remainingToDraw = Math.max(0, sessionTotalQty - drawsCount);
        if (remainingToDraw > 0) {
            bulkContainer.innerHTML = '<button class="btn-primary" style="background:var(--accent-blue); padding:1.2rem 2rem; border-radius:50px;" onclick="performLuckyDraw(' + (remainingToDraw) + ')">? Draw All (' + (remainingToDraw) + ')</button>';
        }
    }

    currentPrizes.forEach(function(prize) {
        (prize.drawnIds || []).forEach(function(empId) {
            var emp = appData.employees.find(function(e) { return e.id === empId; });
            if (emp) {
                // Apply search filter (Keyword based: all keywords must match)
                if (searchTerm) {
                    var keywords = searchTerm.split(/\s+/).filter(function(k) { return k.length > 0; });
                    if (keywords.length > 0) {
                        var allMatch = keywords.every(kw => 
                            emp.name.toLowerCase().includes(kw) || 
                            emp.id.toString().toLowerCase().includes(kw) || 
                            (emp.dept && emp.dept.toLowerCase().includes(kw)) ||
                            prize.name.toLowerCase().includes(kw)
                        );
                        if (!allMatch) return;
                    }
                }
                
                filteredCount++;
                var winItem = (appData.winners || []).find(function(w) { return w.prizeId === prize.id && w.empId === emp.id; });
                var isClaimed = winItem && winItem.is_claimed === 1;

                // --- Admin Table Row ---
                var tr = document.createElement('tr');
                tr.className = 'winner-row';
                tr.innerHTML = '\n            <td data-label="Rank" class="col-rank">' + (prize.prize_rank || \'-\') + '</td>\n            <td data-label="Prize" class="col-prize">\n                <div class="prize-name">' + (prize.name) + '</div>\n            </td>\n            <td data-label="Winner" class="col-winner">\n                <div class="winner-info">\n                    <div class="winner-name">' + (emp.name) + '</div>\n                    <div class="winner-dept">' + (emp.dept) + '</div>\n                </div>\n            </td>\n            <td data-label="Status" class="col-status">\n                <span class="status-badge ' + (isClaimed ? \'checked-in\' : \'reserved\') + '">\n                    ' + (isClaimed ? \'??CLAIMED\' : \'? UNCLAIMED\') + '\n                </span>\n                <button class="btn-danger btn-compact" style="margin-top:0.4rem; padding: 0.3rem 0.6rem; font-size: 0.7rem;" onclick="revokeWinner(\'' + (prize.id) + '\', \'' + (emp.id) + '\')" title="Revoke this winner and return the prize to the pool">Redraw</button>\n            </td>\n        ';
                luckydrawWinnersBody.appendChild(tr);

                // --- Public Mobile Card (Golden Ticket) ---
                if (publicLuckydrawWinnersCards) {
                    var rankSuffix = (prize.prize_rank || '').toLowerCase();
                    var rankClass = 'rank-other';
                    if (rankSuffix.includes('1st') || rankSuffix.includes('grand')) rankClass = 'rank-gold';
                    else if (rankSuffix.includes('2nd')) rankClass = 'rank-silver';
                    else if (rankSuffix.includes('3rd')) rankClass = 'rank-bronze';

                    var card = document.createElement('div');
                    card.className = 'golden-ticket-card ' + (rankClass) + '';
                    card.innerHTML = '\n                        <div class="ticket-sideline"></div>\n                        <div class="ticket-main">\n                            <div class="ticket-header">\n                                <span class="ticket-rank">' + (prize.prize_rank || \'-\') + ' PRIZE</span>\n                                <span class="ticket-status ' + (isClaimed ? \'claimed\' : \'\') + '">' + (isClaimed ? \'CLAIMED\' : \'LUCKY WINNER\') + '</span>\n                            </div>\n                            <div class="ticket-body">\n                                <div class="ticket-prize">' + (prize.name) + '</div>\n                                <div class="ticket-winner">\n                                    <div class="winner-icon">?\n                                    <div class="winner-details">\n                                        <div class="winner-name">' + (emp.name) + '</div>\n                                        <div class="winner-dept">' + (emp.dept) + '</div>\n                                    </div>\n                                </div>\n                            </div>\n                            <div class="ticket-footer" style="justify-content: center; border-top: none; margin-top: 0; padding-top: 0.5rem;">\n                                <div class="ticket-id" style="font-size: 0.65rem; opacity: 0.5;">LUCKY DRAW WINNER</div>\n                            </div>\n                        </div>\n                    ';
                    publicLuckydrawWinnersCards.appendChild(card);
                }

                // --- Public Desktop Table Row (Clone of Admin) ---
                publicLuckydrawWinnersBody.appendChild(tr.cloneNode(true));
            }
        });
    });

    if (drawsCount === 0) {
        var emptyMsg = 'No winners drawn yet for Session ' + (currentLuckydrawSession) + '.';
        luckydrawWinnersBody.innerHTML = '<tr><td colspan="4" class="empty-state">' + (emptyMsg) + '</td></tr>';
        publicLuckydrawWinnersBody.innerHTML = '<tr><td colspan="4" class="empty-state">' + (emptyMsg) + '</td></tr>';
        if (publicLuckydrawWinnersCards) {
            publicLuckydrawWinnersCards.innerHTML = '<div class="empty-state">' + (emptyMsg) + '</div>';
        }
    } else if (filteredCount === 0 && searchTerm) {
        var noResultsMsg = 'No matches found for "' + (searchTerm) + '".';
        luckydrawWinnersBody.innerHTML = '<tr><td colspan="4" class="empty-state">' + (noResultsMsg) + '</td></tr>';
        publicLuckydrawWinnersBody.innerHTML = '<tr><td colspan="4" class="empty-state">' + (noResultsMsg) + '</td></tr>';
        if (publicLuckydrawWinnersCards) {
            publicLuckydrawWinnersCards.innerHTML = '<div class="empty-state">' + (noResultsMsg) + '</div>';
        }
    }
}

// window.revokeWinner moved to avoid duplicates

window.performLuckyDraw =  function (count = 1) {
    if (typeof count !== 'number') count = 1;
    var currentPrizes = (appData.prizes || []).filter(function(p) { return p.session === currentLuckydrawSession; });

    // Check if there are any prizes left in this session
    var availablePrizes = currentPrizes.filter(function(p) { return (p.drawnIds || []; }).length < p.quantity);

    if (availablePrizes.length === 0) {
        alert('All prizes for Session ' + (currentLuckydrawSession) + ' have been drawn.');
        return;
    }

    console.log('[LuckyDraw] Starting draw for ' + (count) + ' winners in Session ' + (currentLuckydrawSession) + '');
    var eligibleEmpIds = [];
    var allWinners = new Set();
    (appData.prizes || []).forEach(function(p) { return (p.drawnIds || []; }).forEach(function(id) { return allWinners.add(id; })));

    appData.employees.forEach(function(emp) {
        if (emp.checked_in && !allWinners.has(emp.id)) {
            eligibleEmpIds.push(emp.id);
        }
    });
    console.log('[LuckyDraw] Found ' + (eligibleEmpIds.length) + ' eligible candidates');

    if (eligibleEmpIds.length < count) {
        alert('Not enough eligible winners(' + (eligibleEmpIds.length) + ') for a draw of ' + (count) + '.');
        return;
    }

    // Wheel Container setup
    if (count === 1) {
        wheelContainer.style.display = 'block';
        winnerDisplay.innerHTML = '<h3 style="color: var(--accent-blue);">Spinning...</h3>';
        
        // Finalize banner for the specific prize being drawn
        if (activePrizeBanner) {
            activePrizeBanner.style.background = 'rgba(226, 180, 91, 0.2)'; // Emphasis color during spin
            activePrizeBanner.querySelector('span').textContent = 'NOW DRAWING:';
        }
    } else {
        winnerDisplay.innerHTML = '<h3 style="color: var(--accent-blue);">Mass Drawing ' + (count) + ' Winners...</h3>';
    }

    try {
        var res =  fetch('' + (API_BASE) + '/api/luckydraw/roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: currentLuckydrawSession, count })
        });
        var data =  res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');

        if (!data.winners || data.winners.length === 0) {
            throw new Error('No winners could be drawn. Check if there are eligible candidates or prizes left.');
        }

        if (count === 1) {
            var winner = data.winners[0];
            
            // Build candidates list carefully for the wheel - Include ALL eligible if possible
            var wheelCandidates = [];
            var winnersSet = new Set();
            (appData.prizes || []).forEach(function(p) { return (p.drawnIds || []; }).forEach(function(id) { return winnersSet.add(id; })));
            
            // Re-identify all current eligible candidates to be absolutely sure
            var allCurrentlyEligible = appData.employees.filter(function(emp) { return emp.checked_in && !winnersSet.has(emp.id; }));
            
            if (allCurrentlyEligible.length <= 100) {
                // If reasonably sized, show ALL
                wheelCandidates = allCurrentlyEligible.map(function(emp) { return ({ id: emp.id, name: emp.name }; }));
            } else {
                // If too many (>100), show winner + a random sample of 99 others to keep wheel somewhat performant
                var others = allCurrentlyEligible.filter(function(emp) { return emp.id !== winner.winner.id; });
                var sampleSize = 99;
                var sample = [];
                while (sample.length < sampleSize && others.length > 0) {
                    var idx = Math.floor(Math.random() * others.length);
                    sample.push(others.splice(idx, 1)[0]);
                }
                wheelCandidates = [winner.winner, ...sample].map(function(emp) { return ({ id: emp.id, name: emp.name }; }));
            }

            // Shuffle candidates so winner isn't always at index 0
            wheelCandidates = wheelCandidates.sort(() => Math.random() - 0.5);

            var winnerIndex = wheelCandidates.findIndex(c => c.id === winner.winner.id);
            
            // Wheel Spin Animation
            var startTime = null;
            var duration = 4000;
            var spins = 6;
            var sliceAngle = 360 / wheelCandidates.length;
            var centerAngle = (winnerIndex + 0.5) * sliceAngle;
            var targetRotation = (360 * spins) + 270 - centerAngle;

            function animate(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = (timestamp - startTime) / duration;
                var easeOut = 1 - Math.pow(1 - progress, 4);
                var rotation = targetRotation * easeOut;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                
                var colors = ['#0A8276', '#086b61', '#e2b45b', '#c19541', '#1a2a44'];
                
                wheelCandidates.forEachfunction((cand, i) {
                    var startAngle = (i * 2 * Math.PI) / wheelCandidates.length;
                    var endAngle = ((i + 1) * 2 * Math.PI) / wheelCandidates.length;
                    
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.arc(0, 0, 140, startAngle, endAngle);
                    ctx.fillStyle = colors[i % colors.length];
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    
                    ctx.save();
                    ctx.rotate(startAngle + (Math.PI / wheelCandidates.length));
                    ctx.fillStyle = 'white';
                    
                    // Dynamic scaling for font and name length
                    var fontSize = 12;
                    var nameLimit = 18;
                    if (wheelCandidates.length > 50) { fontSize = 8; nameLimit = 12; }
                    else if (wheelCandidates.length > 30) { fontSize = 10; nameLimit = 15; }
                    
                    ctx.font = '600 ' + (fontSize) + 'px Outfit';
                    ctx.textAlign = 'right';
                    ctx.shadowBlur = 4;
                    ctx.shadowColor = 'rgba(0,0,0,0.5)';
                    ctx.fillText(cand.name.substring(0, nameLimit), 130, fontSize/3);
                    ctx.restore();
                });
                
                ctx.restore();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    displayWinner(winner);
                }
            }
            requestAnimationFrame(animate);
        } else {
             loadData();
            winnerDisplay.innerHTML = '<h2 style="color: var(--accent-gold);">??? ' + count + ' Winners Drawn! ???</h2>';
            renderLuckyDrawWinners();
            renderAdminDashboard();
            btnDrawWinner.disabled = false;
        }
    } catch (err) {
        alert(err.message);
        btnDrawWinner.disabled = false;
        wheelContainer.style.display = 'none';
    }
}

function displayWinner(data) {
    var { winner, prizeName, prizeRank } = data;
    var rankText = prizeRank ? (prizeRank + " - ") : "";
    
    // Hide active prize banner
    if (activePrizeBanner) activePrizeBanner.style.display = 'none';

    winnerDisplay.innerHTML = 
        '<div style="font-size: 1.5rem; color: var(--accent-gold); margin-bottom: 0.5rem;">??? WINNER - ' + rankText + prizeName + ' ???</div>' +
        '<h2 style="margin: 0.5rem 0; font-size: 3.5rem; color: var(--primary-dark); font-weight: 800;">' + winner.name + '</h2>' +
        '<div style="font-size: 1.8rem; color: var(--accent-gold); font-weight: 600; margin-bottom: 1.5rem;">' + winner.dept + '</div>';
    
    loadData().then(function() {
        renderLuckyDrawWinners();
        renderAdminDashboard();
        btnDrawWinner.disabled = false;
    });
}

window.toggleClaimStatus =  function (prizeId, empId, isClaimed) {
    try {
        var res =  fetch((API_BASE) + "/api/luckydraw/claim", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prizeId, empId, isClaimed })
        });
        if (res.ok) {
             loadData();
            if (!adminTabLuckydraw.classList.contains('hidden')) renderLuckyDrawWinners();
            if (!adminTabClaims.classList.contains('hidden')) renderWinnerClaims();
            showToast("Status updated.");
        }
    } catch (err) {
        alert("Failed to update claim status");
    }
}

function showToast(msg) {
    toastMessage.innerText = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(function() {
        toast.classList.remove('show');
    }, 3000);
}

window.toggleTableStatus =  function (tableIdx, newStatus) {
    try {
        var res =  fetch((API_BASE) + "/api/table/toggle-status", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableIdx, status: newStatus })
        });
        if (res.ok) {
             loadData();
            renderVisualAdminMap();
            showToast("Table " + (tableIdx + 1) + " status updated to " + newStatus + ".");
        }
    } catch (err) {
        alert('Server error.');
    }
};
// Unassign Seat logic
var unassignBtn = document.getElementById('admin-unassign-seat-btn');
unassignBtn.addEventListener('click',  function() {
    if (!currentEditingSeat || currentEditingSeat.tIdx === null) return;

    if (confirm("Are you sure you want to unassign " + currentEditingSeat.empName + " from Table " + (currentEditingSeat.tIdx + 1) + "?")) {
        try {
            var res =  fetch((API_BASE) + "/api/seat/remove", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx: currentEditingSeat.tIdx, seatIdx: currentEditingSeat.sIdx })
            });
            if (res.ok) {
                 loadData();
                adminEditSeatModal.classList.add('hidden');
                renderAdminDirectory();
                renderVisualAdminMap();
                renderAdminDashboard();
                showToast("Seat assignment removed.");
            } else {
                var data =  res.json();
                alert(data.error || 'Failed to unassign.');
            }
        } catch (err) { alert('Server error.'); }
    }
});

// Edit Admin Modal

window.openEditAdminModal = function (username) {
    console.log("TRIGGER: openEditAdminModal for:", username);
    var admin = appData.admins.find(function(a) { return a.username === username; });
    if (!admin) return;

    document.getElementById('edit-admin-original-username').value = admin.username;
    document.getElementById('edit-admin-fullname').value = admin.full_name || '';
    document.getElementById('edit-admin-username').value = admin.username;
    document.getElementById('edit-admin-role').value = admin.role || 'Super Admin';
    document.getElementById('edit-admin-password').value = '';

    // Populate permissions checkboxes
    var perms = admin.permissions ? JSON.parse(admin.permissions) : [];
    var itemCbs = document.querySelectorAll('#edit-admin-permissions-section input[name="edit-permissions"]');
    itemCbs.forEach(function(cb) {
        cb.checked = perms.includes(cb.value);
    });
    
    // Update Toggle All state
    var allCb = document.getElementById('edit-admin-perms-all');
    if (allCb) {
        var total = itemCbs.length;
        var checked = perms.length;
        allCb.checked = total === checked;
        allCb.indeterminate = checked > 0 && checked < total;
    }
    
    // Toggle visibility based on role
    var permsSection = document.getElementById('edit-admin-permissions-section');
    if (permsSection) permsSection.style.display = admin.role === 'Super Admin' ? 'none' : 'block';

    editAdminModal.classList.remove('hidden');
}

    if (elCloseEditAdminModal) {
        elCloseEditAdminModal.addEventListener('click',  function() {
            if (editAdminModal) editAdminModal.classList.add('hidden');
        });
    }

editAdminForm.addEventListenerfunction('submit',  (e) {
    e.preventDefault();
    var originalUsername = document.getElementById('edit-admin-original-username').value;
    var fullName = document.getElementById('edit-admin-fullname').value.trim();
    var username = document.getElementById('edit-admin-username').value.trim();
    var role = document.getElementById('edit-admin-role').value;
    var password = document.getElementById('edit-admin-password').value.trim();

    var perms = Array.from(document.querySelectorAll('#edit-admin-permissions-section input[name="edit-permissions"]:checked')).map(function(cb) { return cb.value; });

    try {
        var res =  fetch((API_BASE) + "/api/admin/update", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalUsername, username, fullName, role, password, permissions: JSON.stringify(perms) })
        });
        if (!res.ok) { var d =  res.json(); alert(d.error); return; }

        editAdminModal.classList.add('hidden');
         loadData();
        renderAdminDashboard();
        showToast("Admin profile updated.");
    } catch (err) { alert('Server error.'); }
});

function hasPermission(section) {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    if (section === 'overview') return true; // Always allow Dashboard basic metrics
    
    if (!currentUser.permissions) return false;
    
    try {
        var perms = JSON.parse(currentUser.permissions);
        return perms.includes(section);
    } catch (e) {
        return false;
    }
}

function enforcePermissions() {
    if (!isAdminLoggedIn || !currentUser) return;
    
    var permissionMap = {
        'overview': 'overview',
        'directory': 'directory',
        'visual-map': 'visual-map',
        'prizes': 'prizes',
        'luckydraw': 'luckydraw',
        'claims': 'claims',
        'voting': 'voting',
        'feedback': 'feedback',
        'settings': 'settings',
        'admins': 'admins',
        'doorgifts': 'doorgifts',
        'feedback-results': 'voting'
    };

    // Update Sidebar Buttons based on data-section or ID
    adminTabBtns.forEach(function(btn) {
        if (!btn) return; // Safety check for null
        
        var section = btn.dataset.section;
        if (section && permissionMap[section]) {
            var permissionKey = permissionMap[section];
            if (!hasPermission(permissionKey)) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        }
    });

    // Special: Relocated Admin Profiles Section handle
    var profilesSection = document.getElementById('admin-profiles-section');
    if (profilesSection) {
        if (!hasPermission('admins')) {
            profilesSection.classList.add('hidden');
        } else {
            profilesSection.classList.remove('hidden');
        }
    }

    // If current tab is restricted, switch to first available
    var currentTab = document.querySelector('.admin-content-section:not(.hidden)')?.id;
    if (currentTab && permissionMap[currentTab] && !hasPermission(permissionMap[currentTab])) {
        var firstVisible = adminTabBtns.find(function(b) { return b && b.style.display !== 'none'; });
        if (firstVisible) firstVisible.click();
    }
}

// Manual Check-in logic
window.updateCheckin =  function (empId, status) {
    try {
        var res =  fetch((API_BASE) + "/api/seat/checkin", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, undo: status === 'no' })
        });
        if (res.ok) {
             loadData();
            renderAdminDirectory();
            renderAdminDashboard();
            renderVisualAdminMap();
            showToast("Check-in status updated.");
        }
    } catch (err) { alert('Server error.'); }
};

window.resetLuckyDrawSession =  function () {
    if (!confirm("Are you sure you want to completely clear all winners for Session " + currentLuckydrawSession + "? This cannot be undone.")) return;

    try {
        var res =  fetch((API_BASE) + "/api/luckydraw/reset-session", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: currentLuckydrawSession })
        });
        if (!res.ok) throw new Error('Failed to reset session');

         loadData();
        renderLuckyDrawWinners();
        updateEligibleCount();
        showToast("Session " + currentLuckydrawSession + " winners have been reset.");
    } catch (err) {
        console.error("Reset error:", err);
        alert('Failed to reset session prizes.');
    }
}

 function exportSeatingToCSV() {
    try {
        // Collect seating data
        var rows = [
            ["Table", "Seat", "Name", "ID", "Dept", "Dietary", "Status", "Checked In"]
        ];

        appData.tables.forEachfunction((table, tIdx) {
            table.forEachfunction((seat, sIdx) {
                if (seat) {
                    rows.push([
                        tIdx + 1,
                        sIdx + 1,
                        '"' + seat.name + '"',
                        '"' + seat.empId + '"',
                        '"' + seat.dept + '"',
                        '"' + seat.diet + '"',
                        "Reserved",
                        seat.checked_in ? "Yes" : "No"
                    ]);
                } else {
                    // Optional: include available seats
                    // rows.push([tIdx + 1, sIdx + 1, "", "", "", "", "Available", "No"]);
                }
            });
        });

        if (rows.length === 1) {
            alert("No reservations found to export.");
            return;
        }

        // Convert to CSV string
        var csvContent = rows.map(function(r) { return r.join(","; })).join("\n");
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);

        // Trigger download
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Company_Dinner_Seating_" + new Date().toISOString().split('T')[0] + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Seating list exported successfully.");
    } catch (err) {
        console.error("Export error:", err);
        alert("Failed to export seating data.");
    }
}

function updateEligibleCount() {
    if (!eligibleCountInfo) return;
    if (!eligibleCountInfo) return;
    var allWinners = new Set();
    (appData.prizes || []).forEach(function(p) { return (p.drawnIds || []; }).forEach(function(id) { return allWinners.add(id; })));

    var count = 0;
    var eligibleList = [];
    appData.employees.forEach(function(emp) {
        if (emp.checked_in && !allWinners.has(emp.id)) {
            count++;
            eligibleList.push(emp);
        }
    });

    eligibleCountInfo.innerText = count;
    if (eligibleCountTable) eligibleCountTable.innerText = count;
    var publicEligibleCount = document.getElementById('public-eligible-count');
    if (publicEligibleCount) publicEligibleCount.innerText = count;
    renderEligibleCandidates(eligibleList);
}

function renderEligibleCandidates(eligibleList) {
    if (!luckydrawEligibleBody) return;
    luckydrawEligibleBody.innerHTML = '';

    // Sort by name or ID
    eligibleList.sort((a, b) => a.name.localeCompare(b.name)).forEach(function(emp) {
        var tr = document.createElement('tr');
        tr.innerHTML = 
            '<td data-label="Emp ID">' + emp.id + '</td>' +
            '<td data-label="Name">' + emp.name + '</td>' +
            '<td data-label="Department">' + (emp.dept || '-') + '</td>';
        luckydrawEligibleBody.appendChild(tr);
    });
}

function renderWinnerClaims() {
    if (!adminClaimsTableBody) {
        console.warn("[Claims] adminClaimsTableBody element not found.");
        return;
    }
    adminClaimsTableBody.innerHTML = '';

    var searchTerm = claimsSearchInput.value.toLowerCase().trim();
    var sessionFilter = claimsFilterSession.value;
    var statusFilter = claimsFilterStatus.value;

    var winnersList = (appData.winners || []).map(function(w) {
        var prize = (appData.prizes || []).find(function(p) { return p.id === w.prizeId; });
        var emp = (appData.employees || []).find(function(e) { return e.id === w.empId; });
        return { ...w, prize, emp };
    }).filter(function(item) {
        if (!item.prize || !item.emp) return false;

        // Session Filter
        if (sessionFilter && item.prize.session != sessionFilter) return false;

        // Status Filter
        if (statusFilter === 'claimed' && item.is_claimed !== 1) return false;
        if (statusFilter === 'unclaimed' && item.is_claimed === 1) return false;

        // Search Filter
        if (searchTerm) {
            var match =
                item.emp.name.toLowerCase().includes(searchTerm) ||
                String(item.emp.id).toLowerCase().includes(searchTerm) ||
                item.prize.name.toLowerCase().includes(searchTerm);
            if (!match) return false;
        }

        return true;
    });

    if (winnersList.length === 0) {
        adminClaimsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 3rem; color: var(--text-muted);">No winners found matching filters.</td></tr>';
        return;
    }

    winnersList.forEach(function(item) {
        var tr = document.createElement('tr');
        var isClaimed = item.is_claimed === 1;

        tr.innerHTML = 
            '<td data-label="Session"><span class="session-badge" style="background: var(--accent-gold); color: #000; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: bold;">S' + item.prize.session + '</span></td>' +
            '<td data-label="Rank" style="font-weight: 700; color: var(--accent-gold);">' + (item.prize.prize_rank || '-') + '</td>' +
            '<td data-label="Prize"><strong>' + item.prize.name + '</strong></td>' +
            '<td data-label="Winner">' +
                '<div style="display: flex; flex-direction: column; align-items: flex-start;">' +
                    '<div style="font-weight: bold; color: var(--accent-gold);">' + item.emp.name + '</div>' +
                    '<div style="font-size: 0.85rem; opacity: 0.8;">ID: ' + item.emp.id + '</div>' +
                '</div>' +
            '</td>' +
            '<td data-label="Dept">' + item.emp.dept + '</td>' +
            '<td data-label="Status" style="text-align: center;">' +
                '<button class="' + (isClaimed ? 'btn-secondary' : 'btn-primary') + '" ' +
                    'style="padding: 0.5rem 1rem; min-width: 120px;" ' +
                    'onclick="toggleClaimStatus(\'' + item.prizeId + '\', \'' + item.empId + '\', ' + (!isClaimed) + ')">' +
                    (isClaimed ? '??Claimed' : '??? Mark Claimed') +
                '</button>' +
            '</td>' +
            '<td data-label="Actions" style="text-align: center;">' +
                '<button class="btn-primary" style="padding: 0.4rem 0.8rem;" onclick="window.openEditPrizeModal(\'' + item.prize.id + '\')">Edit Prize</button>' +
            '</td>';
        adminClaimsTableBody.appendChild(tr);
    });
}

window.exportWinnerClaimsToCSV = function() {
    try {
        var rows = [
            ["Session", "Prize Name", "Winner Name", "Employee ID", "Department", "Status", "Claimed At"]
        ];

        // Process all winners from appData
        if (!appData.winners || appData.winners.length === 0) {
            alert("No winners found to export.");
            return;
        }

        appData.winners.forEach(function(w) {
            var prize = appData.prizes.find(function(p) { return p.id === w.prizeId; });
            var emp = appData.employees.find(function(e) { return e.id === w.empId; });
            if (prize && emp) {
                rows.push([
                    prize.session,
                    '"' + prize.name + '"',
                    '"' + emp.name + '"',
                    '"' + emp.id + '"',
                    '"' + emp.dept + '"',
                    (w.is_claimed ? "Claimed" : "Unclaimed"),
                    (w.claimed_at || "N/A")
                ]);
            }
        });

        var csvContent = rows.map(function(r) { return r.join(","; })).join("\n");
        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);

        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Winner_Claims_" + new Date().toISOString().split('T')[0] + ".csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Winner claims exported successfully.");
    } catch (err) {
        console.error("Export error:", err);
        alert("Failed to export claims data.");
    }
}

function clearDirectoryFilters() {
    if (adminSearchEmp) adminSearchEmp.value = '';
    if (filterDept) filterDept.selectedIndex = 0;
    if (filterStatus) filterStatus.selectedIndex = 0;
    if (filterCheckin) filterCheckin.selectedIndex = 0;
    renderAdminDirectory();
    showToast("Filters cleared.");
}

// openEditPrizeModal moved to top

var countdownInterval = null;
function initCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    var settings = appData.settings || {};
    var eventTimeStr = settings.event_timer;
    
    if (!eventTimeStr) {
        console.warn('[Countdown] No event_timer found in settings:', settings);
        return;
    }
    
    var targetDate = new Date(eventTimeStr).getTime();
    if (isNaN(targetDate)) {
        targetDate = new Date(eventTimeStr.replace(' ', 'T')).getTime();
    }

    if (isNaN(targetDate)) return;

    var now = new Date().getTime();
    var timeLeft = targetDate - now;

    var timerGrid = document.getElementById('countdown-timer');
    var endedMsg = document.getElementById('event-ended-message');

    // Use 500ms buffer to ensure transition happens cleanly
    if (timeLeft <= 500) {
        console.log('[Countdown] Target reached. Flipping UI to Event Started mode.');
        if (timerGrid) timerGrid.classList.add('hidden');
        if (endedMsg) {
            endedMsg.classList.remove('hidden');
            endedMsg.style.display = 'block'; // Force display just in case
        }
        return;
    }

    if (timerGrid) timerGrid.classList.remove('hidden');
    if (endedMsg) endedMsg.classList.add('hidden'); // Fix: hide message if timer still active

    var d = Math.floor((timeLeft / (1000 * 60 * 60 * 24)));
    var h = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    var s = Math.floor((timeLeft % (1000 * 60)) / 1000);

    var daysEl = document.getElementById('days');
    var hoursEl = document.getElementById('hours');
    var minutesEl = document.getElementById('minutes');
    var secondsEl = document.getElementById('seconds');

    if (daysEl) daysEl.innerText = d.toString().padStart(2, '0');
    if (hoursEl) hoursEl.innerText = h.toString().padStart(2, '0');
    if (minutesEl) minutesEl.innerText = m.toString().padStart(2, '0');
    if (secondsEl) secondsEl.innerText = s.toString().padStart(2, '0');
}



// --- Support Functions ---

function renderSettings() {
    document.querySelectorAll('.toggle-feature').forEach(function(btn) {
        var key = btn.dataset.feature;
        var val = getSettingValue(key);
        
        // Handle different button label formats
        if (btn.classList.contains('btn-compact-outline')) {
            if (key === 'feature_seat_mode') btn.innerText = 'SEAT: ' + val.toUpperCase();
            else if (key === 'feature_table_mode') btn.innerText = 'TABLE: ' + val.toUpperCase();
            else btn.innerText = val.toUpperCase();
        } else {
            btn.innerText = val.toUpperCase();
        }
        
        if (key === 'maintenance_mode') {
            btn.style.background = val === 'on' ? 'var(--danger)' : 'var(--text-muted)';
        } else {
            btn.style.background = val === 'on' ? 'var(--seat-checked-in)' : 'var(--danger)';
        }
    });
    checkToggleOverlays();
    checkMaintenanceMode();

    var eventTime = (appData.settings && appData.settings.event_timer) || "";
    if (eventTimerInput) eventTimerInput.value = eventTime;

    var doorGiftPin = (appData.settings && appData.settings.door_gift_pin) || "";
    var doorGiftPinInputSetting = document.getElementById('door-gift-pin-setting');
    if (doorGiftPinInputSetting) doorGiftPinInputSetting.value = doorGiftPin;
}



// --- Dynamic Feedback Logic ---
var dynamicFeedbackResponses = {};
// --- Feedback Rendering (v1.5.23 Star Upgrade) ---
 function renderDynamicFeedbackForm() {
    var container = document.getElementById('dynamic-feedback-questions');
    if (!container) return;
    try {
        var res =  fetch((API_BASE) + "/api/feedback/questions");
        var questions =  res.json();
        container.innerHTML = '';
        
        var customTheme = getSettingValue('feedback_theme');
        var feedbackTitleEl = document.getElementById('feedback-modal-title');
        if (feedbackTitleEl) feedbackTitleEl.innerText = customTheme || 'Event Feedback';
        
        dynamicFeedbackResponses = {};

        questions.forEach(function(q) {
            var html = '<div class="feedback-question">' +
                       '<label style="font-weight:600; display:block; margin-bottom:0.8rem;">' + q.question_text + '</label>';
            
            if (q.question_type === 'rating') {
                html += '<div class="star-rating-group" data-question-id="' + q.id + '" style="display:flex; gap:0.8rem; font-size:1.8rem; color:#ccc; cursor:pointer;">';
                for (var i = 1; i <= 5; i++) {
                    html += '<span class="star-btn" data-val="' + i + '">??/span>';
                }
                html += '</div>';
            } else if (q.question_type === 'choice') {
                var options = (q.options || '').split(',');
                html += '<select class="feedback-select" data-question-id="' + q.id + '" required style="width:100%; padding:1rem; border-radius:12px; border:1px solid rgba(0,0,0,0.1); background:white;">' +
                        '<option value="" disabled selected>Choose an option</option>';
                options.forEach(function(opt) { return html += '<option value="' + opt.trim(; }) + '">' + opt.trim() + '</option>');
                html += '</select>';
            } else {
                html += '<textarea class="feedback-textarea" data-question-id="' + q.id + '" rows="3" placeholder="Additional comments..." style="width:100%; padding:1rem; border-radius:12px; border:1px solid rgba(0,0,0,0.1); resize:none;"></textarea>';
            }
            html += '</div>';
            container.insertAdjacentHTML('beforeend', html);
        });

        // Star Interaction logic
        container.querySelectorAll('.star-rating-group').forEach(function(group) {
            var stars = group.querySelectorAll('.star-btn');
            stars.forEach(function(star) {
                star.addEventListener('click',  function() {
                    var val = parseInt(star.dataset.val);
                    var qId = group.dataset.questionId;
                    dynamicFeedbackResponses[qId] = val;
                    stars.forEachfunction((s, idx) {
                        s.style.color = (idx < val) ? '#FFD700' : '#ccc';
                        s.style.transform = (idx < val) ? 'scale(1.2)' : 'scale(1)';
                    });
                });
                star.addEventListener('mouseover', function() {
                    var val = parseInt(star.dataset.val);
                    stars.forEach((s, idx) => s.style.color = (idx < val) ? '#FFE066' : '#ccc');
                });
                star.addEventListener('mouseout', function() {
                    var qId = group.dataset.questionId;
                    var activeVal = dynamicFeedbackResponses[qId] || 0;
                    stars.forEach((s, idx) => s.style.color = (idx < activeVal) ? '#FFD700' : '#ccc');
                });
            });
        });
    } catch (err) { console.error('Error rendering dynamic feedback:', err); }
}

var feedbackModal = document.getElementById('feedback-modal');
var closeFeedbackModal = document.getElementById('close-feedback-modal');
var feedbackForm = document.getElementById('feedback-form');

if (closeFeedbackModal) {
    closeFeedbackModal.addEventListener('click',  () => feedbackModal.classList.add('hidden'));
}

if (feedbackForm) {
    feedbackForm.addEventListenerfunction('submit',  (e) {
        e.preventDefault();
        var answers = [];
        var questionsElements = document.querySelectorAll('#dynamic-feedback-questions .feedback-question');
        
        for (var el of questionsElements) {
            var starGroup = el.querySelector('.star-rating-group');
            var select = el.querySelector('.feedback-select');
            var textarea = el.querySelector('.feedback-textarea');
            
            var qId, val;
            if (starGroup) {
                qId = starGroup.dataset.questionId;
                val = dynamicFeedbackResponses[qId];
                if (!val) { alert('Please provide a rating for all questions.'); return; }
            } else if (select) {
                qId = select.dataset.questionId;
                val = select.value;
            } else if (textarea) {
                qId = textarea.dataset.questionId;
                val = textarea.value;
            }
            if (qId) answers.push({ questionId: parseInt(qId), answer: val });
        }

        try {
            var res =  fetch((API_BASE) + "/api/feedback/submit", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empId: currentUser ? currentUser.id : voterDeviceId,
                    answers
                })
            });
            if (res.ok) {
                showToast("Thank you for your feedback! ?");
                feedbackModal.classList.add('hidden');
            } else { alert('Submission failed.'); }
        } catch (err) { alert('Error submitting feedback'); }
    });
}

// --- Guest Voting Logic ---
var votingModal = document.getElementById('voting-modal');
var closeVotingModal = document.getElementById('close-voting-modal');
var votingCandidatesList = document.getElementById('voting-candidates-list');

if (closeVotingModal) {
    closeVotingModal.addEventListener('click',  () => votingModal.classList.add('hidden'));
}

 function openVotingModal(category) {
    try {
        var res =  fetch((API_BASE) + "/api/voting/candidates");
        var allCandidates =  res.json();
        var candidates = allCandidates.filter(function(c) { return c.category === category; });
        
        var themeKey = category === 'performance' ? 'voting_performance_theme' : 'voting_bestdress_theme';
        var defaultTitle = category === 'performance' ? 'Performance Voting' : 'Best Dressed Award';
        var customTheme = getSettingValue(themeKey);
        // Fix: If custom theme is accidentally set to "on" or "off", use default
        var displayTitle = (customTheme && customTheme.trim() !== '' && customTheme !== 'on' && customTheme !== 'off') ? customTheme : defaultTitle;
        var icon = category === 'performance' ? '?' : '?';
        
        document.getElementById('voting-modal-title').innerText = displayTitle;
        document.getElementById('voting-modal-icon').innerText = icon;
        votingCandidatesList.innerHTML = '';

        candidates.forEach(function(c) {
            var btn = document.createElement('button');
            btn.className = 'glass-panel voting-candidate-btn';
            btn.style.cssText = 'width: 100%; text-align: left; padding: 1.2rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; border: 1px solid var(--glass-border); transition: all 0.3s;';
            btn.innerHTML = 
                '<div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-gold); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">' +
                    c.name.charAt(0) +
                '</div>' +
                '<div style="flex: 1;">' +
                    '<div style="font-weight: 600;">' + c.name + '</div>' +
                '</div>' +
                '<div class="vote-arrow">??/div>';
            btn.onclick =  () => submitVote(c.id, category);
            votingCandidatesList.appendChild(btn);
        });

        votingModal.classList.remove('hidden');
    } catch (err) { console.error('Error opening voting modal:', err); }
}

 function submitVote(candidateId, category) {
    if (!confirm('Confirm your vote? You can only vote once.')) return;
    try {
        var currentEmpId = currentUser ? (currentUser.id || currentUser.username) : 'Guest';
        
        var res =  fetch((API_BASE) + "/api/voting/vote", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empId: currentUser ? (currentUser.id || currentUser.username) : voterDeviceId,
                candidateId,
                category
            })
        });
        var result =  res.json();
        if (result.success) {
            showToast("Vote cast successfully! Thank you.");
            votingModal.classList.add('hidden');
        } else {
            alert(result.error || "Failed to cast vote.");
        }
    } catch (err) { alert("Error submitting vote."); }
}

// --- Entertainment Hub Logic ---
 function renderEntertainment() {
    var perfCard = document.getElementById('card-voting-performance');
    var dressCard = document.getElementById('card-voting-bestdress');
    var feedbackCard = document.getElementById('card-feedback');
    var emptyMsg = document.getElementById('entertainment-empty-msg');

    var showPerf = getSettingValue('feature_voting_performance') === 'on';
    var showDressVote = getSettingValue('feature_voting_bestdress') === 'on';
    var showDressNom = getSettingValue('feature_bestdress_nominations') === 'on';
    var showFeedback = getSettingValue('feature_feedback') === 'on';

    perfCard.style.display = showPerf ? 'flex' : 'none';
    dressCard.style.display = (showDressVote || showDressNom) ? 'flex' : 'none';
    feedbackCard.style.display = showFeedback ? 'flex' : 'none';

    // Show/Hide individual Best Dress buttons
    var btnNominateRender = document.getElementById('btn-nominate-bestdress');
    var btnVoteDressGroup = document.getElementById('btn-group-vote-bestdress');
    
    if (btnNominateRender) {
        btnNominateRender.style.display = showDressNom ? 'block' : 'none';
    }
    
    if (btnVoteDressGroup) {
        btnVoteDressGroup.style.display = showDressVote ? 'flex' : 'none';
        // Only show the groups if they are active
        dressCard.style.display = (showDressVote || showDressNom) ? 'flex' : 'none';
        
        // Dynamic subtitle update
        var subtitle = dressCard.querySelector('p');
        if (subtitle) {
            if (showDressNom) {
                subtitle.textContent = "Nominate your best-dressed colleagues now!";
            } else if (showDressVote) {
                subtitle.textContent = "Nominations are closed! Cast your final vote for King & Queen.";
            } else {
                subtitle.textContent = "Best Dressed features are currently closed.";
            }
        }
    }

    if (!showPerf && !showDressVote && !showDressNom && !showFeedback) {
        emptyMsg.style.display = 'block';
    } else {
        emptyMsg.style.display = 'none';
    }

    // Render Performance Logic
    if (showPerf) {
        try {
            var response =  fetch((API_BASE) + "/api/voting/candidates");
            var candidates =  response.json();
            var activePerf = candidates.find(function(c) { return c.category === 'performance' && c.is_open; });

            var activeMsg = document.getElementById('active-perf-msg');
            var ratingContainer = document.getElementById('perf-rating-container');
            var activeName = document.getElementById('active-perf-name');
            var idInput = document.getElementById('selected-perf-id');
            var btnSubmit = document.getElementById('btn-submit-perf-rating');
            var btnContainer = document.getElementById('perf-rating-buttons');

            if (activePerf) {
                activeMsg.style.display = 'none';
                ratingContainer.style.display = 'flex';
                activeName.textContent = activePerf.name;
                idInput.value = activePerf.id;

                var voteToken = localStorage.getItem('voting_device_token');
                if (!voteToken) {
                    voteToken = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                    localStorage.setItem('voting_device_token', voteToken);
                }
                var currentUser = voteToken;

                var votedActs = JSON.parse(localStorage.getItem('voted_performances') || '{}');
                
                if (votedActs[currentUser] && votedActs[currentUser].includes(activePerf.id)) {
                    btnContainer.innerHTML = '<p style="color: #4caf50; font-weight: bold; text-align: center;">Thank you! Your vote has been recorded.</p>';
                    btnSubmit.style.display = 'none';
                } else {
                    btnSubmit.style.display = 'block';
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = 'Submit Rating';
                    
                    btnContainer.innerHTML = '';
                    for (var i = 1; i <= 10; i++) {
                        var btn = document.createElement('button');
                        btn.className = 'btn-secondary';
                        btn.style.padding = '0.5rem 1rem';
                        btn.style.minWidth = '3rem';
                        btn.textContent = i;
                        btn.onclick = function(e) {
                            Array.from(btnContainer.children).forEach(function(b) { return b.style.outline = 'none'; });
                            e.target.style.outline = '2px solid var(--accent-gold)';
                            document.getElementById('selected-perf-score').value = i;
                            btnSubmit.disabled = false;
                        };
                        btnContainer.appendChild(btn);
                    }

                    btnSubmit.onclick =  function() {
                        btnSubmit.disabled = true;
                        btnSubmit.textContent = 'Submitting...';
                        var score = document.getElementById('selected-perf-score').value;
                        var candidateId = document.getElementById('selected-perf-id').value;
                        var empId = currentUser; // Use the anonymous device token

                        try {
                            var res =  fetch((API_BASE) + "/api/voting/vote", {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ empId, candidateId, category: 'performance', score })
                            });
                            var result =  res.json();
                            if (res.ok && result.success) {
                                var acts = JSON.parse(localStorage.getItem('voted_performances') || '{}');
                                if (!acts[empId]) acts[empId] = [];
                                if (!acts[empId].includes(Number(candidateId))) acts[empId].push(Number(candidateId));
                                localStorage.setItem('voted_performances', JSON.stringify(acts));
                                renderEntertainment();
                            } else {
                                alert(result.error || "Failed to submit rating.");
                                btnSubmit.disabled = false;
                                btnSubmit.textContent = 'Submit Rating';
                            }
                        } catch(err) {
                            alert("Network error.");
                            btnSubmit.disabled = false;
                            btnSubmit.textContent = 'Submit Rating';
                        }
                    };
                }
            } else {
                activeMsg.style.display = 'block';
                ratingContainer.style.display = 'none';
            }
        } catch (e) {
            console.error('Error fetching public performances:', e);
        }
    }

    // Attach guest action listeners
    var btnNominate = document.getElementById('btn-nominate-bestdress');
    var btnVoteMale = document.getElementById('btn-vote-bestdress-male');
    var btnVoteFemale = document.getElementById('btn-vote-bestdress-female');
    if (btnNominate) btnNominate.onclick =  () => document.getElementById('nomination-modal').classList.remove('hidden');
    if (btnVoteMale) btnVoteMale.onclick =  () => openVotingModal('best_dress_male');
    if (btnVoteFemale) btnVoteFemale.onclick =  () => openVotingModal('best_dress_female');
    feedbackCard.querySelector('button').onclick =  function() {
        renderDynamicFeedbackForm();
        feedbackModal.classList.remove('hidden');
    };
}

// Admin Export Feedback
var btnExportFeedback = document.getElementById('btn-export-feedback');
if (btnExportFeedback) {
    btnExportFeedback.addEventListener('click',  function() {
        window.location.href = (API_BASE) + "/api/feedback/export";
    });
}

function updateOverlay(viewId, settingKey, message) {
    var viewEl = document.getElementById(viewId);
    if (!viewEl) return;

    var isOff = getSettingValue(settingKey) === 'off';
    var overlay = viewEl.querySelector('.feature-closed-overlay');

    if (isOff) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'feature-closed-overlay';

            // Context-aware messaging
            var title = "Feature Temporarily Locked";
            var icon = "?";

            if (settingKey === 'feature_seating') {
                title = "Table Selection Closed";
                icon = "???";
            } else if (settingKey === 'feature_checkin') {
                title = "Check-In Closed";
                icon = "???";
            } else if (settingKey === 'feature_luckydraw') {
                title = "Lucky Draw Not Active";
                icon = "???";
            }

            overlay.innerHTML = 
                '<div class="feature-closed-content">' +
                    '<span class="lock-icon">' + icon + '</span>' +
                    '<h3>' + title + '</h3>' +
                    '<p>' + message + '</p>' +
                    '<div style="margin-top: 1.5rem; color: var(--accent-gold); font-weight: 600; font-size: 0.9rem;">' +
                        'Please check back later or contact an administrator.' +
                    '</div>' +
                '</div>';
            viewEl.style.position = 'relative';
            viewEl.appendChild(overlay);
        }
    } else {
        if (overlay) overlay.remove();
    }
}

// --- Admin Batch Assignment Logic ---
window.openAdminBatchModal = function(tableIdx) {
    adminBatchTableIdxInput.value = tableIdx;
    document.getElementById('admin-batch-modal-title').innerText = 'Table ' + (tableIdx + 1) + ' Batch Assignment';
    adminBatchPaxContainer.innerHTML = '';
    
    var tableSeats = appData.tables[tableIdx];
    
    for (var i = 0; i < 11; i++) {
        var seat = tableSeats[i];
        var paxDiv = document.createElement('div');
        paxDiv.className = 'form-group';
        paxDiv.style.padding = '1rem';
        paxDiv.style.background = 'rgba(255,255,255,0.4)';
        paxDiv.style.border = '1px solid var(--glass-border)';
        paxDiv.style.borderRadius = '12px';
        
        paxDiv.innerHTML = 
            '<label style="font-weight: bold; color: var(--accent-gold); margin-bottom: 0.5rem; display: block;">Seat ' + (i + 1) + '</label>' +
            '<div style="display: flex; gap: 0.5rem;">' +
                '<input type="text" class="batch-pax-name" data-idx="' + i + '" placeholder="Name" value="' + (seat ? seat.name : '') + '" style="flex: 2; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);">' +
                '<input type="text" class="batch-pax-id" data-idx="' + i + '" placeholder="Emp ID (Optional)" value="' + (seat ? (seat.empId || '') : '') + '" style="flex: 1; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);">' +
            '</div>';
        adminBatchPaxContainer.appendChild(paxDiv);
    }
    
    adminBatchModal.classList.remove('hidden');
};

if (elCloseAdminBatchModal) {
    elCloseAdminBatchModal.addEventListener('click',  function() {
        if (adminBatchModal) adminBatchModal.classList.add('hidden');
    });
}

if (btnBatchClearAll) {
    btnBatchClearAll.addEventListener('click',  function() {
        if (confirm("Are you sure you want to clear ALL 11 seats at this table?")) {
            document.querySelectorAll('.batch-pax-name').forEach(function(input) { return input.value = ''; });
            document.querySelectorAll('.batch-pax-id').forEach(function(input) { return input.value = ''; });
        }
    });
}

if (adminBatchForm) {
    adminBatchForm.addEventListenerfunction('submit',  (e) {
        e.preventDefault();
        var tableIdx = parseInt(adminBatchTableIdxInput.value);
        var paxData = [];
        
        var names = document.querySelectorAll('.batch-pax-name');
        var ids = document.querySelectorAll('.batch-pax-id');
        
        for (var i = 0; i < 11; i++) {
            paxData.push({
                seatIdx: i,
                name: names[i].value.trim(),
                empId: ids[i].value.trim() || null
            });
        }
        
        try {
            var res =  fetch((API_BASE) + "/api/admin/table/assign", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx, paxData })
            });
            
            if (res.ok) {
                showToast("Table " + (tableIdx + 1) + " updated successfully!");
                adminBatchModal.classList.add('hidden');
                 loadData();
                renderVisualAdminMap();
                renderAdminDashboard();
            } else {
                var err =  res.json();
                alert(err.error || "Failed to update table.");
            }
        } catch (err) {
            alert("Server error during batch assignment.");
        }
    });
}

// --- Voting Mgmt ---
 function renderVotingMgmt() {
    try {
        var response =  fetch((API_BASE) + "/api/voting/candidates");
        var candidates =  response.json();
        var resultsResp =  fetch((API_BASE) + "/api/voting/results");
        var results =  resultsResp.json();

        var votingPerfBody = document.getElementById('voting-perf-body');
        var votingDressBody = document.getElementById('voting-dress-body');

        if (votingPerfBody) votingPerfBody.innerHTML = '';
        if (votingDressBody) votingDressBody.innerHTML = '';

        candidates.forEach(function(c) {
            var result = results.find(function(r) { return r.id === c.id; }) || { vote_count: 0, total_score: 0 };
            var rowHtml = '';
            
            if (c.category === 'performance') {
                var totalScore = result.total_score || 0;
                var statusHtml = c.is_open 
                    ? '<span style="color: #4caf50; font-weight: bold;">OPEN</span>' 
                    : '<span style="color: var(--text-muted);">CLOSED</span>';
                var toggleBtn = c.is_open 
                    ? '<button onclick="toggleVotingCandidate(' + c.id + ', false)" class="btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;">Stop</button>'
                    : '<button onclick="toggleVotingCandidate(' + c.id + ', true)" class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; background: #4caf50;">Start</button>';

                rowHtml = 
                    '<tr>' +
                        '<td>' + c.name + '</td>' +
                        '<td style="text-align: center; font-weight: bold; color: var(--accent-gold);">' + totalScore + '</td>' +
                        '<td style="text-align: center;">' + statusHtml + '</td>' +
                        '<td style="text-align: right;">' +
                            toggleBtn +
                            '<button onclick="deleteCandidate(' + c.id + ')" class="btn-danger" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Delete</button>' +
                        '</td>' +
                    '</tr>';
                votingPerfBody.innerHTML += rowHtml;
            } else {
                var statusHtml = c.is_open 
                    ? '<span style="color: #4caf50; font-weight: bold;">OPEN</span>' 
                    : '<span style="color: var(--text-muted);">CLOSED</span>';
                var toggleBtn = c.is_open 
                    ? '<button onclick="toggleVotingCandidate(' + c.id + ', false)" class="btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;">Stop</button>'
                    : '<button onclick="toggleVotingCandidate(' + c.id + ', true)" class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; background: #4caf50;">Start</button>';

                rowHtml = 
                    '<tr>' +
                        '<td>' + c.name + '</td>' +
                        '<td style="text-align: center; font-weight: bold; color: var(--accent-gold);">' + result.vote_count + '</td>' +
                        '<td style="text-align: center;">' + statusHtml + '</td>' +
                        '<td style="text-align: right;">' +
                            toggleBtn +
                            '<button onclick="deleteCandidate(' + c.id + ')" class="btn-danger" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Delete</button>' +
                        '</td>' +
                    '</tr>';
                votingDressBody.innerHTML += rowHtml;
            }
        });

        // Set theme values
        if (typeof votingPerfThemeInput !== 'undefined' && votingPerfThemeInput) votingPerfThemeInput.value = getSettingValue('voting_performance_theme') || '';
        if (typeof votingDressThemeInput !== 'undefined' && votingDressThemeInput) votingDressThemeInput.value = getSettingValue('voting_bestdress_theme') || '';

        // Auto-refresh every 10s if tab is visible
        if (adminTabEntertainment && !adminTabEntertainment.classList.contains('hidden')) {
            if (window._votingRefreshTimeout) clearTimeout(window._votingRefreshTimeout);
            window._votingRefreshTimeout = setTimeout(renderVotingMgmt, 10000);
        }
    } catch (err) { console.error('Error rendering voting mgmt:', err); }
}

 function toggleVotingCandidate(id, isOpen) {
    try {
        var res =  fetch((API_BASE) + "/api/admin/voting/candidates/toggle", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_open: isOpen })
        });
        if (res.ok) {
            renderVotingMgmt();
            triggerGlobalRefresh();
        } else {
            var data =  res.json();
            alert(data.error || 'Failed to toggle status.');
        }
    } catch (err) { console.error('Toggle err:', err); }
}

 function openAddCandidateModal(category) {
    var name = prompt("Enter name for " + (category === 'performance' ? 'Performance' : 'Best Dress') + " candidate:");
    if (name) {
        console.log("[VotingMgmt] Adding candidate: " + name + " to " + category);
        try {
            var res =  fetch((API_BASE) + "/api/admin/voting/candidates/add", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, name })
            });
            var result =  res.json();
            console.log("[VotingMgmt] Server response:", result);
            if (res.ok && result.success) {
                renderVotingMgmt();
            } else {
                alert('Error adding candidate: ' + (result.error || 'Unknown error'));
            }
        } catch (err) { 
            console.error('[VotingMgmt] Error adding candidate:', err);
            alert('Error adding candidate: ' + err.message); 
        }
    }
}

 function deleteCandidate(id) {
    if (confirm('Are you sure you want to delete this candidate?')) {
        try {
             fetch((API_BASE) + "/api/admin/voting/candidates/delete", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            renderVotingMgmt();
        } catch (err) { alert('Error deleting candidate'); }
    }
}

// --- Feedback Mgmt ---
 function renderFeedbackMgmt() {
    try {
        var response =  fetch((API_BASE) + "/api/feedback/questions");
        var questions =  response.json();
        var grid = document.getElementById('feedback-questions-grid');
        if (!grid) return;

        if (questions.length === 0) {
            grid.innerHTML = 
                '<div style="text-align: center; padding: 4rem 2rem; color: var(--text-muted); background: rgba(0,0,0,0.02); border-radius: 15px; border: 2px dashed rgba(0,0,0,0.05);">' +
                    '<div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">??</div>' +
                    '<p>No questions added yet. Click "+ Add New Question" to begin.</p>' +
                '</div>';
            return;
        }

        grid.innerHTML = '';
        questions.forEach(function(q) {
            var icon = q.question_type === 'rating' ? '?' : (q.question_type === 'choice' ? '??' : '??');
            var typeLabel = q.question_type.charAt(0).toUpperCase() + q.question_type.slice(1);
            
            var html = 
                '<div class="glass-panel animate-fade-in" style="padding: 1.2rem; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05); background: #fff; display: flex; align-items: center; gap: 1.5rem; transition: all 0.2s ease;">' +
                    '<div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(10, 130, 118, 0.1); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;">' +
                        q.sort_order +
                    '</div>' +
                    '<div style="flex: 1;">' +
                        '<div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.4rem;">' +
                            '<span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.6rem; border-radius: 6px; background: rgba(0,0,0,0.04); color: var(--text-muted);">' +
                                icon + ' ' + typeLabel +
                            '</span>' +
                            (q.is_active ? 
                                '<span style="font-size: 0.7rem; font-weight: 700; background: #e8f5e9; color: #2e7d32; padding: 0.2rem 0.6rem; border-radius: 6px;">ACTIVE</span>' : 
                                '<span style="font-size: 0.7rem; font-weight: 700; background: #ffebee; color: #c62828; padding: 0.2rem 0.6rem; border-radius: 6px;">INACTIVE</span>') +
                        '</div>' +
                        '<h4 style="margin: 0; font-size: 1.05rem; color: var(--text-main); line-height: 1.4;">' + q.question_text + '</h4>' +
                        (q.options ? ('<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic;">Options: ' + q.options + '</div>') : '') +
                    '</div>' +
                    '<div style="display: flex; gap: 0.5rem;">' +
                        '<button onclick="deleteFeedbackQuestion(' + q.id + ')" class="btn-danger" ' +
                            'style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; padding: 0; border-radius: 10px; font-size: 1.2rem; cursor: pointer;" ' +
                            'title="Delete Question">' +
                            '???' +
                        '</button>' +
                    '</div>' +
                '</div>';
            grid.innerHTML += html;
        });

        if (feedbackThemeInput) feedbackThemeInput.value = getSettingValue('feedback_theme') || '';
    } catch (err) { console.error('Error rendering feedback mgmt:', err); }
}

 function renderFeedbackResults() {
    try {
        var res =  fetch((API_BASE) + "/api/admin/feedback/stats");
        var { totalSubmissions, stats } =  res.json();
        
        var totalEl = document.getElementById('stat-total-submissions');
        var grid = document.getElementById('feedback-stats-grid');
        
        if (totalEl) totalEl.innerText = totalSubmissions;
        if (!grid) return;
        
        if (!stats || stats.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No survey questions found.</div>';
            return;
        }

        grid.innerHTML = '';
        stats.forEach(function(q) {
            var card = document.createElement('div');
            card.className = 'glass-panel animate-fade-in';
            card.style.padding = '1.5rem';
            card.style.border = '1px solid rgba(0,0,0,0.05)';
            
            var resultHtml = '';
            var icon = q.question_type === 'rating' ? '?' : (q.question_type === 'choice' ? '??' : '??');

            if (q.question_type === 'rating') {
                var avg = q.avg_rating ? parseFloat(q.avg_rating).toFixed(1) : '0';
                var percentage = (parseFloat(avg) / 5) * 100;
                resultHtml = 
                    '<div style="display: flex; align-items: center; gap: 1.5rem;">' +
                        '<div style="text-align: center; min-width: 80px;">' +
                            '<div style="font-size: 2.2rem; font-weight: 800; color: var(--accent-gold); line-height: 1;">' + avg + '</div>' +
                            '<div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-top: 5px;">Avg Stars</div>' +
                        '</div>' +
                        '<div style="flex: 1;">' +
                            '<div style="height: 12px; background: rgba(0,0,0,0.05); border-radius: 6px; overflow: hidden;">' +
                                '<div style="width: ' + percentage + '%; height: 100%; background: linear-gradient(90deg, var(--accent-gold), #ffca28); border-radius: 6px;"></div>' +
                            '</div>' +
                            '<div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-muted);">' +
                                '<span>1 Star</span>' +
                                '<span>5 Stars</span>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
            } else if (q.question_type === 'choice') {
                var breakdown = q.choice_breakdown || [];
                resultHtml = '<div style="display: flex; flex-direction: column; gap: 0.8rem;">';
                breakdown.forEach(function(c) {
                    var perc = q.response_count > 0 ? (c.count / q.response_count * 100).toFixed(0) : 0;
                    resultHtml += 
                        '<div>' +
                            '<div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">' +
                                '<span style="font-weight: 600;">' + c.choice + '</span>' +
                                '<span style="color: var(--text-muted);">' + c.count + ' (' + perc + '%)</span>' +
                            '</div>' +
                            '<div style="height: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden;">' +
                                '<div style="width: ' + perc + '%; height: 100%; background: var(--primary-main); border-radius: 4px;"></div>' +
                            '</div>' +
                        '</div>';
                });
                if (breakdown.length === 0) resultHtml += '<p style="font-size: 0.85rem; color: var(--text-muted);">No selections made yet.</p>';
                resultHtml += '</div>';
            } else if (q.question_type === 'text') {
                var comments = q.recent_comments || [];
                resultHtml = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
                comments.forEach(function(c) {
                    resultHtml += 
                        '<div style="background: rgba(0,0,0,0.02); padding: 0.8rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.4; border-left: 3px solid var(--accent-gold);">' +
                            '"' + c.comment + '"' +
                        '</div>';
                });
                if (comments.length === 0) resultHtml += '<p style="font-size: 0.85rem; color: var(--text-muted);">No comments yet.</p>';
                resultHtml += '</div>';
            }

            card.innerHTML = 
                '<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">' +
                    '<div style="display: flex; align-items: center; gap: 0.8rem;">' +
                        '<span style="font-size: 1.2rem;">' + icon + '</span>' +
                        '<h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">' + q.question_text + '</h4>' +
                    '</div>' +
                    '<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: bold; background: rgba(0,0,0,0.05); padding: 0.2rem 0.6rem; border-radius: 6px;">' +
                        q.response_count + ' Responses' +
                    '</span>' +
                '</div>' +
                resultHtml;
            grid.appendChild(card);
        });
    } catch (err) { console.error('Error rendering feedback results:', err); }
}

 function deleteFeedbackQuestion(id) {
    if (confirm('Are you sure you want to delete this question?')) {
        try {
             fetch((API_BASE) + "/api/admin/feedback/questions/delete", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            renderFeedbackMgmt();
        } catch (err) { alert('Error deleting question'); }
    }
}

// Global hook for adding feedback question
document.getElementById('btn-add-feedback-question')?.addEventListener('click',  function() {
    var text = prompt('Enter question text:');
    if (!text) return;
    var type = prompt('Enter type (text/rating/choice):', 'rating');
    var options = (type === 'choice') ? prompt('Enter options (comma separated):') : '';
    var order = prompt('Enter sort order:', '1');

    try {
         fetch((API_BASE) + "/api/admin/feedback/questions/add", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_text: text, question_type: type, options, sort_order: parseInt(order) })
        });
        renderFeedbackMgmt();
    } catch (err) { alert('Error adding question'); }
});

// Export buttons
document.getElementById('btn-export-voting')?.addEventListener('click',  function() {
    window.location.href = '/api/admin/export/voting';
});

document.getElementById('btn-export-feedback-dynamic')?.addEventListener('click',  function() {
    window.location.href = '/api/admin/export/feedback_dynamic';
});

// --- Best Dress Nomination Logic ---
var nominationModal = document.getElementById('nomination-modal');
var closeNominationBtn = document.getElementById('close-nomination-modal');
var formNominate = document.getElementById('form-nominate-bestdress');
var nominateSearchInput = document.getElementById('nominate-search');
var nominateSearchResults = document.getElementById('nominate-search-results');
var empIdInput = document.getElementById('nominate-emp-id');
var empNameInput = document.getElementById('nominate-emp-name');

if (closeNominationBtn) {
    closeNominationBtn.onclick =  () => nominationModal.classList.add('hidden');
}

if (nominateSearchInput) {
    nominateSearchInput.addEventListenerfunction('input',  (e) {
        var query = e.target.value.trim();
        if (query.length < 2) {
            nominateSearchResults.innerHTML = '';
            empIdInput.value = '';
            empNameInput.value = '';
            return;
        }

        try {
            var res =  fetch((API_BASE) + "/api/employees/search?q=" + encodeURIComponent(query));
            var matches =  res.json();

            nominateSearchResults.innerHTML = '';
            matches.forEach(function(emp) {
                var div = document.createElement('div');
                div.style.cssText = 'padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; color: white; display: flex; justify-content: space-between;';
                div.innerHTML = '<span>' + emp.name + '</span><span style="color: var(--accent-gold); font-size:0.8rem;">' + emp.id + '</span>';
                div.onclick =  function() {
                    nominateSearchInput.value = emp.name;
                    empIdInput.value = emp.id;
                    empNameInput.value = emp.name;
                    nominateSearchResults.innerHTML = '';
                };
                nominateSearchResults.appendChild(div);
            });
            if (matches.length === 0) {
                nominateSearchResults.innerHTML = '<div style="padding: 0.8rem; color: var(--text-muted);">No matches found.</div>';
            }
        } catch (err) {
            console.error('Search error', err);
        }
    });
}

if (formNominate) {
    formNominate.addEventListenerfunction('submit',  (e) {
        e.preventDefault();
        
        if (!empIdInput.value) {
            alert('Please search and select a valid employee from the list.');
            return;
        }

        var btnSubmit = document.getElementById('btn-submit-nomination');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Uploading... (Please wait)';

        var deviceId = localStorage.getItem('voting_device_token');
        if (!deviceId) {
            deviceId = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            localStorage.setItem('voting_device_token', deviceId);
        }

        var formData = new FormData();
        formData.append('category', document.getElementById('nominate-category').value);
        formData.append('nominee_name', empNameInput.value);
        formData.append('nominee_emp_id', empIdInput.value);
        formData.append('submitter_device_id', deviceId);
        formData.append('photo', document.getElementById('nominate-photo').files[0]);

        try {
            var res =  fetch((API_BASE) + "/api/nominations/submit", {
                method: 'POST',
                body: formData
            });
            
            var result =  res.json();
            if (res.ok && result.success) {
                alert('Success! Your nomination has been submitted for AI judging.');
                nominationModal.classList.add('hidden');
                formNominate.reset();
                empIdInput.value = '';
                empNameInput.value = '';
            } else {
                alert(result.error || 'Failed to submit nomination.');
            }
        } catch (err) {
            console.error(err);
            alert('Error during upload. The file might be too large.');
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Submit Nomination';
        }
    });
}

// --- Admin Best Dress Nominations ---
 function loadAdminNominations() {
    try {
        var res =  fetch((API_BASE) + "/api/nominations/list");
        var noms =  res.json();
        var gridMale = document.getElementById('nomination-grid-male');
        var gridFemale = document.getElementById('nomination-grid-female');
        
        if(!gridMale || !gridFemale) return;
        
        var hasRanked = noms.some(n => n.ai_score > 0);
        var btnTransfer = document.getElementById('btn-admin-ai-transfer');
        if (btnTransfer) {
            btnTransfer.style.display = hasRanked ? 'inline-block' : 'none';
            btnTransfer.onclick = promoteAiTop3;
        }

        var maleNoms = noms.filter(function(n) { return n.category === 'male'; }).sort((a,b) => b.ai_score - a.ai_score);
        var femaleNoms = noms.filter(function(n) { return n.category === 'female'; }).sort((a,b) => b.ai_score - a.ai_score);
        
        var renderGrid = function(list, container) {
            container.innerHTML = '';
            if (list.length === 0) container.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">No entries found.</div>';
            list.forEachfunction((nom, index) {
                var isTop3 = nom.ai_score > 0 && index < 3;
                var card = document.createElement('div');
                card.className = 'glass-panel';
                var borderStyle = isTop3 ? 'border: 2px solid var(--accent-gold); box-shadow: 0 0 15px rgba(234,179,8,0.3);' : '';
                
                card.style.cssText = 'padding: 0.5rem; text-align: center; position: relative; overflow: visible; ' + borderStyle;
                card.innerHTML = 
                    (isTop3 ? '<div style="position:absolute; top:-10px; right:-10px; background:var(--accent-gold); color:black; font-weight:bold; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:10; font-size:0.9rem;">#' + (index+1) + '</div>' : '') +
                    '<div style="background: url(\'' + encodeURI(nom.photo_path) + '\') center/cover; width: 100%; aspect-ratio: 1; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1);"></div>' +
                    '<div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' + nom.nominee_name + '">' + nom.nominee_name + '</div>' +
                    '<div style="font-size: 0.75rem; color: var(--accent-gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="' + (nom.dept || nom.nominee_emp_id) + '">' + (nom.dept || nom.nominee_emp_id) + '</div>' +
                    (nom.ai_score > 0 ? 
                        ('<div style="margin-top:0.5rem; background: rgba(0,0,0,0.3); padding: 0.2rem; border-radius: 4px;"><span style="color:var(--accent-gold); font-weight:bold;">' + nom.ai_score + ' / 100</span><br><span style="font-size:0.65rem; color:#aaa; display:block; padding:0 0.2rem;" title="' + nom.ai_reasoning + '">??? "' + nom.ai_reasoning + '"</span></div>') : 
                        '<div style="margin-top:0.5rem; font-size:0.75rem; color:#888;">??? Unranked</div>');
                container.appendChild(card);
            });
        };
        
        renderGrid(maleNoms, gridMale);
        renderGrid(femaleNoms, gridFemale);
    } catch (err) {
        console.error('Error loading nominations', err);
    }
}

 function triggerAiRanking() {
    if (!confirm('Are you sure you want to trigger the AI Judge? This may take up to 15 seconds as it streams images to the cloud for computer vision ranking.')) return;

    var btn = document.getElementById('btn-admin-ai-rank');
    var ogText = btn.innerHTML;
    btn.innerHTML = '??AI is thinking...';
    btn.disabled = true;
    
    try {
        var res =  fetch((API_BASE) + "/api/nominations/ai-rank", { method: 'POST' });
        var data =  res.json();
        alert(data.message || 'AI ranking complete!');
         loadAdminNominations();
    } catch (err) {
        alert('Failed to run AI ranking: ' + err.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

 function promoteAiTop3() {
    if(!confirm('This will promote the Top 3 Men and Top 3 Women into the live voting stage. Proceed?')) return;
    var btn = document.getElementById('btn-admin-ai-transfer');
    var ogText = btn.innerHTML;
    btn.innerHTML = '??Promoting...';
    btn.disabled = true;
    try {
        var res =  fetch((API_BASE) + "/api/admin/nominations/promote", { method: 'POST' });
        var data =  res.json();
        alert("Successfully promoted " + data.promoted + " AI candidates!");
        btn.style.display = 'none';
    } catch(err) {
        alert('Promotion failed: ' + err.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

// --- Winner Reveal Logic ---
window.showWinnerReveal =  function(category) {
    try {
        var response =  fetch((API_BASE) + "/api/voting/candidates");
        var candidates =  response.json();
        var resultsResp =  fetch((API_BASE) + "/api/voting/results");
        var results =  resultsResp.json();

        // Filter and sort
        var categoryCandidates = candidates.filter(function(c) { return c.category === category; });
        var candidatesWithScores = categoryCandidates.map(function(c) {
            var r = results.find(function(res) { return res.id === c.id; }) || { vote_count: 0, total_score: 0 };
            return {
                ...c,
                score: category === 'performance' ? (r.total_score || 0) : (r.vote_count || 0)
            };
        });

        candidatesWithScores.sort((a, b) => b.score - a.score);

        if (candidatesWithScores.length === 0) {
            alert('No candidates found for this category.');
            return;
        }

        var winner = candidatesWithScores[0];

        // UI Setup
        var revealView = document.getElementById('view-winner-reveal');
        var titleLabel = document.getElementById('winner-reveal-title');
        var candidateBox = document.getElementById('winner-reveal-candidate');
        var nameLabel = document.getElementById('winner-name');
        var scoreVal = document.getElementById('winner-score-val');
        
        // Reset state
        titleLabel.style.display = 'block';
        titleLabel.textContent = "Calculating Results...";
        candidateBox.classList.remove('active');
        candidateBox.classList.add('hidden');
        
        nameLabel.textContent = winner.name;
        scoreVal.textContent = winner.score;

        // Show view & request fullscreen
        revealView.classList.remove('hidden');
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen().catch(err => console.log('Fullscreen rejected:', err));
        }
        
        // Animation sequence
        setTimeout(function() {
            titleLabel.textContent = "And the Winner is...";
            
            setTimeout(function() {
                titleLabel.style.display = 'none';
                candidateBox.classList.remove('hidden');
                
                // Slight delay to trigger CSS transition
                setTimeout(function() {
                    candidateBox.classList.add('active');
                }, 100);
            }, 2500);
        }, 2000);

    } catch (err) {
        console.error('Error fetching winner:', err);
        alert('Failed to calculate winner.');
    }
};






 function handlePrizeCsvUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload =  function (evt) {
        var text = evt.target.result;
        var lines = text.split('\n');
        var prizes = [];

        for (var i = 1; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line) continue;
            
            var parts = line.split(',');
            if (parts.length >= 4) {
                var session = parseInt(parts[0].trim());
                var name = parts[1].trim();
                var qty = parseInt(parts[2].trim());
                var rank = parts[3].trim();
                
                if (!isNaN(session) && !isNaN(qty) && name) {
                    prizes.push({
                        id: 'prize_' + Date.now() + '_' + i,
                        session,
                        name,
                        quantity: qty,
                        prize_rank: rank
                    });
                }
            }
        }

        if (prizes.length === 0) {
            alert('No valid prize data found in CSV. Required format: Session, Name, Quantity, Rank');
            return;
        }

        if (!confirm('Found ' + prizes.length + ' prizes. Import them?')) return;

        try {
            var res =  fetch((API_BASE) + '/api/prize/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prizes })
            });
            var data =  res.json();
            if (!res.ok) throw new Error(data.error || 'Server error');
            
             loadData();
            renderAdminDashboard();
            showToast("Successfully imported " + (data.imported || data.count) + " prizes.");
        } catch (err) {
            console.error('Prize import error:', err);
            alert('Error during prize import: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function checkToggleOverlays() {
    console.log("[Resilience] Checking feature toggles...");
    
    // Global Seating Toggle
    var seatingActive = getSettingValue('feature_seating') === 'on';
    updateOverlay('view-identify', 'feature_seating', 'Table Selection is currently closed.');
    updateOverlay('view-seating', 'feature_seating', 'Table Selection is currently closed.');
    
    // Check-in & Door Gift Toggle
    updateOverlay('view-checkin', 'feature_checkin', 'Check-in is currently closed.');
    updateOverlay('view-door-gift', 'feature_checkin', 'Door Gift system is currently closed.');
    
    // Lucky draw overlay
    updateOverlay('view-luckydraw', 'feature_luckydraw', 'Lucky Draw is currently closed.');

    // Entertainment & Voting
    var perfOn = getSettingValue('feature_voting_performance') === 'on';
    var dressVoteOn = getSettingValue('feature_voting_bestdress') === 'on';
    var dressNomOn = getSettingValue('feature_bestdress_nominate') === 'on';
    var feedOn = getSettingValue('feature_feedback') === 'on';
    
    var entView = document.getElementById('view-entertainment');
    if (entView) {
        var overlay = entView.querySelector('.feature-closed-overlay');
        if (!perfOn && !dressVoteOn && !dressNomOn && !feedOn) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'feature-closed-overlay';
                overlay.innerHTML = '<div class="feature-closed-content"><span class="lock-icon">???</span><h3>Features Closed</h3><p>All entertainment features are currently closed.</p></div>';
                entView.appendChild(overlay);
            }
        } else if (overlay) {
            overlay.remove();
        }
    }
    
    // SEATING MODE TOGGLE (Seat vs Table)
    var seatModeActive = getSettingValue('feature_seat_mode') === 'on';
    var tableModeActive = getSettingValue('feature_table_mode') === 'on';
    var guestSeatBtn = document.getElementById('mode-seat-btn');
    var guestTableBtn = document.getElementById('mode-table-btn');
    var guestToggleContainer = document.querySelector('.seating-mode-toggle');

    if (guestSeatBtn) guestSeatBtn.style.display = seatModeActive ? 'block' : 'none';
    if (guestTableBtn) guestTableBtn.style.display = tableModeActive ? 'block' : 'none';

    if (guestToggleContainer) {
        if (!seatModeActive && !tableModeActive) {
            guestToggleContainer.style.display = 'none';
        } else if (seatModeActive && tableModeActive) {
            guestToggleContainer.style.display = 'flex';
        } else {
            guestToggleContainer.style.display = 'flex';
            // Force the active mode if the other is disabled
            if (!seatModeActive && seatingMode === 'seat') {
                seatingMode = 'table';
                if (guestTableBtn) guestTableBtn.classList.add('active');
                if (guestSeatBtn) guestSeatBtn.classList.remove('active');
                renderTables();
            } else if (!tableModeActive && seatingMode === 'table') {
                seatingMode = 'seat';
                if (guestSeatBtn) guestSeatBtn.classList.add('active');
                if (guestTableBtn) guestTableBtn.classList.remove('active');
                renderTables();
            }
        }
    }
    
    updateCancelButtonVisibility();
}

 function init() {
    console.log("[Resilience] Initializing Application v1.7.4 (FIX-READY)...");
    
    // Assign DOM references
    floorLayout = document.getElementById('floor-layout');
    listLayout = document.getElementById('list-layout');
    btnToggleView = document.getElementById('btn-toggle-view');
    modal = document.getElementById('modal-seat-reservation');
    closeModal = document.getElementById('close-modal');
    resForm = document.getElementById('reservation-form');
    modalTitle = document.getElementById('modal-title');
    modalSeatInfo = document.getElementById('modal-seat-info');
    modalEmpName = document.getElementById('modal-emp-name');
    currentBookingName = document.getElementById('current-booking-name');
    btnChangeProfile = document.getElementById('btn-change-profile');
    identifySearchInput = document.getElementById('identify-search');
    btnIdentifySearch = document.getElementById('btn-identify-search');
    identifyResults = document.getElementById('identify-results');
    toast = document.getElementById('toast');
    toastMessage = document.getElementById('toast-message');
    searchInput = document.getElementById('checkin-search');

    var versionBadge = document.getElementById('debug-version-badge');
    if (versionBadge) versionBadge.textContent = "v1.7.6 (STABLE)";

    try {
         loadData();
    } catch (e) {
        console.error("[Init] loadData failed:", e);
    }

    setupEventListeners();
    setupSSE();
    checkMaintenanceMode();
    checkToggleOverlays();
    initCountdown();
    setupPaxAutocomplete();

    // Recover session if exists
    var savedEmp = localStorage.getItem('currentBookingEmployee');
    if (savedEmp) {
        currentBookingEmployee = JSON.parse(savedEmp);
        if (currentBookingName) currentBookingName.innerText = currentBookingEmployee.name;
    }

    // --- ROUTING ---
    handleUrlRoute();
}

init();

window.redrawLastWinner =  function() {
    var winners = (appData.prizes || []).flatMap(p => (p.drawnIds || []).map(function(id) { return ({ prizeId: p.id, empId: id, ts: 0 }; })));
    if (winners.length === 0) {
        alert("No winners drawn yet in this session.");
        return;
    }
    // We don't have timestamps in drawnIds easily, but we can revoke the last one in current session
    var currentSessionPrizes = (appData.prizes || []).filter(function(p) { return p.session === currentLuckydrawSession; });
    var lastWinner = null;
    for (var p of currentSessionPrizes) {
        if (p.drawnIds && p.drawnIds.length > 0) {
            lastWinner = { prizeId: p.id, empId: p.drawnIds[p.drawnIds.length - 1] };
        }
    }
    
    if (!lastWinner) {
        alert("No winners found for the current session.");
        return;
    }

    if (confirm("Revoke the last winner and redraw immediately?")) {
        try {
            var res =  fetch('' + (API_BASE) + '/api/luckydraw/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prizeId: lastWinner.prizeId, empId: lastWinner.empId })
            });
            if (res.ok) {
                 loadData();
                performLuckyDraw(1);
            } else {
                alert("Failed to revoke last winner.");
            }
        } catch (err) { alert(err.message); }
    }
};
