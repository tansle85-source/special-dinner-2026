function renderDoorGiftMgmt() {
    if (!adminTabDoorgifts || adminTabDoorgifts.classList.contains('hidden')) return;

    const searchTerm = document.getElementById('doorgift-search')?.value.toLowerCase() || "";
    const statusFilter = document.getElementById('doorgift-filter-status')?.value || "";
    const dietFilter = document.getElementById('doorgift-filter-diet')?.value || "";

    const tableBody = document.getElementById('admin-doorgifts-table-body');
    if (!tableBody) return;

    let claimedCount = 0;
    let pendingCount = 0;

    const filtered = appData.employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(searchTerm) || String(emp.id).includes(searchTerm);
        const isClaimed = emp.door_gift_claimed === 1 || emp.door_gift_claimed === true;
        const matchesStatus = statusFilter === "" || (statusFilter === "claimed" ? isClaimed : !isClaimed);
        const matchesDiet = dietFilter === "" || emp.diet === dietFilter;

        return matchesSearch && matchesStatus && matchesDiet;
    });

    tableBody.innerHTML = '';
    filtered.forEach(emp => {
        const isClaimed = emp.door_gift_claimed === 1 || emp.door_gift_claimed === true;
        if (isClaimed) claimedCount++; else pendingCount++;

        const tr = document.createElement('tr');
        const safeEmpId = String(emp.id).replace(/'/g, "\\'");
        
        tr.innerHTML = `
            <td>
                <div style="font-weight: 700;">${emp.name}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">ID: ${emp.id} | ${emp.dept}</div>
            </td>
            <td><span class="diet-badge ${emp.diet === 'vegetarian' ? 'veg' : 'non-veg'}">${emp.diet || 'Standard'}</span></td>
            <td>${emp.checked_in ? '<span class="status-badge checked-in">Checked In</span>' : '<span class="status-badge available">Not Present</span>'}</td>
            <td>${isClaimed ? '<span class="status-badge checked-in">Claimed</span>' : '<span class="status-badge reserved">Pending</span>'}</td>
            <td style="text-align: right;">
                ${isClaimed ? 
                    `<button class="admin-action-btn btn-compact-outline" onclick="window.revokeDoorGift('${safeEmpId}')">Revoke</button>` :
                    (emp.checked_in ? `<button class="btn-primary" style="padding: 0.4rem 0.8rem; width: auto;" onclick="window.openDoorGiftModal('${safeEmpId}')">Mark Claimed</button>` : '<span style="color:var(--text-muted); font-size: 0.75rem;">Requires Check-in</span>')
                }
            </td>
        `;
        tableBody.appendChild(tr);
    });

    const statClaimed = document.getElementById('stat-doorgift-claimed');
    const statPending = document.getElementById('stat-doorgift-pending');
    if (statClaimed) statClaimed.innerText = claimedCount;
    if (statPending) statPending.innerText = pendingCount;
}

function renderVisualAdminMap() {
    if (!adminFloorLayout) return;
    adminFloorLayout.innerHTML = '';

    appData.tables.forEach((table, tableIdx) => {
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';

        const tableCenter = document.createElement('div');
        tableCenter.className = 'table-center';
        
        const tStatusObj = appData.tablesStatus ? appData.tablesStatus.find(ts => ts.tableIdx === tableIdx) : null;
        const isOffline = tStatusObj && tStatusObj.status === 'Reservation';

        if (adminSeatingMode === 'table') {
            tableCenter.style.cursor = isOffline ? 'not-allowed' : 'pointer';
            tableCenter.classList.add('table-mode');
            tableCenter.addEventListener('click', () => {
                if (isOffline) {
                    showToast(`Table ${tableIdx + 1} is reserved.`, "danger");
                    return;
                }
                openAdminBatchModal(tableIdx);
            });
            tableCenter.innerHTML = `<h3>Table ${tableIdx + 1}</h3><div style="font-size: 0.7rem; color: var(--accent-gold);">BATCH</div>`;
        } else {
            tableCenter.innerHTML = `
                <h3>Table ${tableIdx + 1}</h3>
                <div class="toggle-container" style="margin-top:0.5rem;">
                    <button class="btn-primary toggle-btn-el" data-table="${tableIdx}"
                        style="font-size:0.7rem; padding:4px 8px; background: ${isOffline ? 'var(--accent-gold)' : '#000000'}; width:auto;">
                        ${isOffline ? 'Set Online' : 'Reserve'}
                    </button>
                </div>
            `;
            const toggleBtn = tableCenter.querySelector('.toggle-btn-el');
            if (toggleBtn) {
                toggleBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.toggleTableStatus(tableIdx, isOffline ? 'Online' : 'Reservation');
                });
            }
        }

        tableContainer.appendChild(tableCenter);
        if (isOffline) tableContainer.classList.add('offline');

        const bookedSeatsCount = table.filter(s => s !== null).length;
        if (bookedSeatsCount === table.length) tableCenter.classList.add('fully-booked');
        else if (bookedSeatsCount > 0) tableCenter.classList.add('partially-booked');

        // Real-time Lock Indicators
        const tLock = isResourceLocked(tableIdx);
        if (tLock) {
            tableContainer.classList.add('in-progress');
            const booker = appData.employees.find(e => e.id === tLock.empId);
            const bookerName = booker ? booker.name : tLock.empId;
            const color = tLock.isLockedByMe ? 'var(--accent-gold)' : 'var(--warning-dark)';
            const label = tLock.isLockedByMe ? 'YOUR BOOKING' : `LOCKED: ${bookerName}`;
            
            tableCenter.style.border = `2px solid ${color}`;
            tableCenter.style.animation = 'pulse-warning 1s infinite';
            
            tableCenter.innerHTML += `
                <div class="booking-status" style="position: absolute; top: -15px; left: 50%; transform: translateX(-50%); background: ${color}; color: white; padding: 4px 10px; border-radius: 20px; font-size: 0.6rem; white-space: nowrap; z-index: 100; font-weight: 800;">
                    ${tLock.isLockedByMe ? '✨' : '🔒'} ${label}
                </div>
            `;
        }

        const radius = 100;
        const centerX = 125;
        const centerY = 125;

        table.forEach((seat, seatIdx) => {
            const angle = (seatIdx / table.length) * 2 * Math.PI - (Math.PI / 2);
            const x = centerX + radius * Math.cos(angle) - 16;
            const y = centerY + radius * Math.sin(angle) - 16;

            const seatEl = document.createElement('div');
            seatEl.className = 'seat';
            seatEl.style.left = `${x}px`;
            seatEl.style.top = `${y}px`;
            seatEl.innerText = seatIdx + 1;

            if (seat) {
                seatEl.classList.add(seat.checked_in ? 'checked-in' : 'reserved');
                if (adminSeatingMode === 'seat') {
                    seatEl.style.cursor = 'pointer';
                    seatEl.addEventListener('click', () => openEditSeatModal(tableIdx, seatIdx, seat.empId, seat.name));
                }
            } else {
                const sLock = isResourceLocked(tableIdx, seatIdx);
                if (tLock || sLock) {
                    seatEl.classList.add('in-progress');
                    seatEl.innerHTML = '🔒';
                }
                if (adminSeatingMode === 'seat') {
                    seatEl.style.cursor = 'pointer';
                    seatEl.addEventListener('click', () => openEditSeatModal(tableIdx, seatIdx, null, 'Available'));
                }
            }
            tableContainer.appendChild(seatEl);
        });

        adminFloorLayout.appendChild(tableContainer);
    });
}

window.toggleFullScreen = function() {
    const elem = document.getElementById('admin-tab-luckydraw');
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
        btnToggleFullscreen.textContent = '✖ Exit Fullscreen';
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        btnToggleFullscreen.textContent = '⛶ Fullscreen';
    }
}

function showToast(msg) {
    toastMessage.innerText = msg;
    toast.classList.remove('hidden');
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function refreshActiveAdminTab() {
    if (!isAdminLoggedIn) return;
    
    const activeTab = document.querySelector('.admin-content-section:not(.hidden)');
    if (!activeTab) return;
    
    const tabId = activeTab.id;
    
    if (tabId === 'admin-tab-dashboard') renderAdminDashboard();
    else if (tabId === 'admin-tab-directory') renderAdminDirectory();
    else if (tabId === 'admin-tab-visual') renderVisualAdminMap();
    else if (tabId === 'admin-tab-prizes') renderPrizeInventory();
    else if (tabId === 'admin-tab-luckydraw') {
        renderLuckyDrawEligible();
        renderLuckyDrawWinners();
    }
    else if (tabId === 'admin-tab-claims') renderWinnerClaims();
    else if (tabId === 'admin-tab-doorgifts') renderDoorGiftMgmt();
    else if (tabId === 'admin-tab-feedback-results') renderFeedbackResults();
    else if (tabId === 'admin-tab-settings') renderSettings();
}
