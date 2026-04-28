function renderLuckyDrawWinners() {
    updateEligibleCount();
    luckydrawWinnersBody.innerHTML = '';
    publicLuckydrawWinnersBody.innerHTML = '';
    if (publicLuckydrawWinnersCards) publicLuckydrawWinnersCards.innerHTML = '';

    const searchTerm = (document.getElementById('winner-search')?.value || '').toLowerCase().trim();
    const isMobile = window.innerWidth < 768;

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
    const currentPrizes = (appData.prizes || []).filter(p => p.session === currentLuckydrawSession);
    currentPrizes.sort((a, b) => {
        const rankA = parseInt(a.prize_rank) || 0;
        const rankB = parseInt(b.prize_rank) || 0;
        if (rankA !== rankB) return rankB - rankA;
        return a.name.localeCompare(b.name);
    });

    // Calculate session summary
    let sessionTotalQty = 0;
    let drawsCount = 0;
    let filteredCount = 0;
    
    currentPrizes.forEach(p => {
        sessionTotalQty += p.quantity;
        drawsCount += (p.drawnIds || []).length;
    });

    // Update summary displays
    const updateSummary = (sumElem, qtyElem) => {
        if (!sumElem) return;
        if (drawsCount > 0) {
            sumElem.style.display = 'flex';
            qtyElem.textContent = `${drawsCount} / ${sessionTotalQty} Items`;
        } else {
            sumElem.style.display = 'none';
        }
    };
    updateSummary(adminSessionSummary, adminSessionTotalQty);
    updateSummary(publicSessionSummary, publicSessionTotalQty);
    
    updateActivePrizeIndicator();

    const bulkContainer = document.getElementById('bulk-draw-controls');
    if (bulkContainer) {
        bulkContainer.innerHTML = '';
        const remainingToDraw = Math.max(0, sessionTotalQty - drawsCount);
        if (remainingToDraw > 0) {
            bulkContainer.innerHTML = `<button class="btn-primary" style="background:var(--accent-blue); padding:1.2rem 2rem; border-radius:50px;" onclick="performLuckyDraw(${remainingToDraw})">? Draw All (${remainingToDraw})</button>`;
        }
    }

    currentPrizes.forEach(prize => {
        (prize.drawnIds || []).forEach(empId => {
            const emp = appData.employees.find(e => e.id === empId);
            if (emp) {
                // Apply search filter (Keyword based: all keywords must match)
                if (searchTerm) {
                    const keywords = searchTerm.split(/\s+/).filter(k => k.length > 0);
                    if (keywords.length > 0) {
                        const allMatch = keywords.every(kw => 
                            emp.name.toLowerCase().includes(kw) || 
                            emp.id.toString().toLowerCase().includes(kw) || 
                            (emp.dept && emp.dept.toLowerCase().includes(kw)) ||
                            prize.name.toLowerCase().includes(kw)
                        );
                        if (!allMatch) return;
                    }
                }
                
                filteredCount++;
                const winItem = (appData.winners || []).find(w => w.prizeId === prize.id && w.empId === emp.id);
                const isClaimed = winItem && winItem.is_claimed === 1;

                // --- Admin Table Row ---
                const tr = document.createElement('tr');
                tr.className = 'winner-row';
                tr.innerHTML = `
            <td data-label="Rank" class="col-rank">${prize.prize_rank || '-'}</td>
            <td data-label="Prize" class="col-prize">
                <div class="prize-name">${prize.name}</div>
            </td>
            <td data-label="Winner" class="col-winner">
                <div class="winner-info">
                    <div class="winner-name">${emp.name}</div>
                    <div class="winner-dept">${emp.dept}</div>
                </div>
            </td>
            <td data-label="Status" class="col-status">
                <span class="status-badge ${isClaimed ? 'checked-in' : 'reserved'}">
                    ${isClaimed ? '✅ CLAIMED' : '🎁 UNCLAIMED'}
                </span>
                <button class="btn-danger btn-compact" style="margin-top:0.4rem; padding: 0.3rem 0.6rem; font-size: 0.7rem;" onclick="revokeWinner('${prize.id}', '${emp.id}')" title="Revoke this winner and return the prize to the pool">Redraw</button>
            </td>
        `;
                luckydrawWinnersBody.appendChild(tr);

                // --- Public Mobile Card (Golden Ticket) ---
                if (publicLuckydrawWinnersCards) {
                    const rankSuffix = (prize.prize_rank || '').toLowerCase();
                    let rankClass = 'rank-other';
                    if (rankSuffix.includes('1st') || rankSuffix.includes('grand')) rankClass = 'rank-gold';
                    else if (rankSuffix.includes('2nd')) rankClass = 'rank-silver';
                    else if (rankSuffix.includes('3rd')) rankClass = 'rank-bronze';

                    const card = document.createElement('div');
                    card.className = `golden-ticket-card ${rankClass}`;
                    card.innerHTML = `
                        <div class="ticket-sideline"></div>
                        <div class="ticket-main">
                            <div class="ticket-header">
                                <span class="ticket-rank">${prize.prize_rank || '-'} PRIZE</span>
                                <span class="ticket-status ${isClaimed ? 'claimed' : ''}">${isClaimed ? 'CLAIMED' : 'LUCKY WINNER'}</span>
                            </div>
                            <div class="ticket-body">
                                <div class="ticket-prize">${prize.name}</div>
                                <div class="ticket-winner">
                                    <div class="winner-icon">🏆</div>
                                    <div class="winner-details">
                                        <div class="winner-name">${emp.name}</div>
                                        <div class="winner-dept">${emp.dept}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="ticket-footer" style="justify-content: center; border-top: none; margin-top: 0; padding-top: 0.5rem;">
                                <div class="ticket-id" style="font-size: 0.65rem; opacity: 0.5;">LUCKY DRAW WINNER</div>
                            </div>
                        </div>
                    `;
                    publicLuckydrawWinnersCards.appendChild(card);
                }

                // --- Public Desktop Table Row (Clone of Admin) ---
                publicLuckydrawWinnersBody.appendChild(tr.cloneNode(true));
            }
        });
    });

    if (drawsCount === 0) {
        const emptyMsg = `No winners drawn yet for Session ${currentLuckydrawSession}.`;
        luckydrawWinnersBody.innerHTML = `<tr><td colspan="4" class="empty-state">${emptyMsg}</td></tr>`;
        publicLuckydrawWinnersBody.innerHTML = `<tr><td colspan="4" class="empty-state">${emptyMsg}</td></tr>`;
        if (publicLuckydrawWinnersCards) {
            publicLuckydrawWinnersCards.innerHTML = `<div class="empty-state">${emptyMsg}</div>`;
        }
    } else if (filteredCount === 0 && searchTerm) {
        const noResultsMsg = `No matches found for "${searchTerm}".`;
        luckydrawWinnersBody.innerHTML = `<tr><td colspan="4" class="empty-state">${noResultsMsg}</td></tr>`;
        publicLuckydrawWinnersBody.innerHTML = `<tr><td colspan="4" class="empty-state">${noResultsMsg}</td></tr>`;
        if (publicLuckydrawWinnersCards) {
            publicLuckydrawWinnersCards.innerHTML = `<div class="empty-state">${noResultsMsg}</div>`;
        }
    }
}

window.revokeWinner = async function(prizeId, empId) {
    if (!confirm('Are you sure you want to revoke this winner? The prize will be returned to the undrawn pool.')) return;
    try {
        const res = await fetch(`${API_BASE}/api/luckydraw/revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prizeId, empId })
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Server error');
        }
        showToast('Winner revoked. Prize available for redraw.');
    } catch (err) {
        alert('Failed to revoke winner: ' + err.message);
    }
};

window.performLuckyDraw = async function (count = 1) {
    if (typeof count !== 'number') count = 1;
    const currentPrizes = (appData.prizes || []).filter(p => p.session === currentLuckydrawSession);

    // Check if there are any prizes left in this session
    const availablePrizes = currentPrizes.filter(p => (p.drawnIds || []).length < p.quantity);

    if (availablePrizes.length === 0) {
        alert(`All prizes for Session ${currentLuckydrawSession} have been drawn.`);
        return;
    }

    console.log(`[LuckyDraw] Starting draw for ${count} winners in Session ${currentLuckydrawSession}`);
    const eligibleEmpIds = [];
    const allWinners = new Set();
    (appData.prizes || []).forEach(p => (p.drawnIds || []).forEach(id => allWinners.add(id)));

    appData.employees.forEach(emp => {
        if (emp.checked_in && !allWinners.has(emp.id)) {
            eligibleEmpIds.push(emp.id);
        }
    });
    console.log(`[LuckyDraw] Found ${eligibleEmpIds.length} eligible candidates`);

    if (eligibleEmpIds.length < count) {
        alert(`Not enough eligible winners(${eligibleEmpIds.length}) for a draw of ${count}.`);
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
        winnerDisplay.innerHTML = `<h3 style="color: var(--accent-blue);">Mass Drawing ${count} Winners...</h3>`;
    }

    try {
        const res = await fetch(`${API_BASE}/api/luckydraw/roll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: currentLuckydrawSession, count })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Server error');

        if (!data.winners || data.winners.length === 0) {
            throw new Error('No winners could be drawn. Check if there are eligible candidates or prizes left.');
        }

        if (count === 1) {
            const winner = data.winners[0];
            
            // Build candidates list carefully for the wheel - Include ALL eligible if possible
            let wheelCandidates = [];
            const winnersSet = new Set();
            (appData.prizes || []).forEach(p => (p.drawnIds || []).forEach(id => winnersSet.add(id)));
            
            // Re-identify all current eligible candidates to be absolutely sure
            const allCurrentlyEligible = appData.employees.filter(emp => emp.checked_in && !winnersSet.has(emp.id));
            
            if (allCurrentlyEligible.length <= 100) {
                // If reasonably sized, show ALL
                wheelCandidates = allCurrentlyEligible.map(emp => ({ id: emp.id, name: emp.name }));
            } else {
                // If too many (>100), show winner + a random sample of 99 others to keep wheel somewhat performant
                const others = allCurrentlyEligible.filter(emp => emp.id !== winner.winner.id);
                const sampleSize = 99;
                const sample = [];
                while (sample.length < sampleSize && others.length > 0) {
                    const idx = Math.floor(Math.random() * others.length);
                    sample.push(others.splice(idx, 1)[0]);
                }
                wheelCandidates = [winner.winner, ...sample].map(emp => ({ id: emp.id, name: emp.name }));
            }

            // Shuffle candidates so winner isn't always at index 0
            wheelCandidates = wheelCandidates.sort(() => Math.random() - 0.5);

            const winnerIndex = wheelCandidates.findIndex(c => c.id === winner.winner.id);
            
            // Wheel Spin Animation
            let startTime = null;
            const duration = 4000;
            const spins = 6;
            const sliceAngle = 360 / wheelCandidates.length;
            const centerAngle = (winnerIndex + 0.5) * sliceAngle;
            const targetRotation = (360 * spins) + 270 - centerAngle;

            function animate(timestamp) {
                if (!startTime) startTime = timestamp;
                const progress = (timestamp - startTime) / duration;
                const easeOut = 1 - Math.pow(1 - progress, 4);
                const rotation = targetRotation * easeOut;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate(rotation * Math.PI / 180);
                
                const colors = ['#0A8276', '#086b61', '#e2b45b', '#c19541', '#1a2a44'];
                
                wheelCandidates.forEach((cand, i) => {
                    const startAngle = (i * 2 * Math.PI) / wheelCandidates.length;
                    const endAngle = ((i + 1) * 2 * Math.PI) / wheelCandidates.length;
                    
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
                    let fontSize = 12;
                    let nameLimit = 18;
                    if (wheelCandidates.length > 50) { fontSize = 8; nameLimit = 12; }
                    else if (wheelCandidates.length > 30) { fontSize = 10; nameLimit = 15; }
                    
                    ctx.font = `600 ${fontSize}px Outfit`;
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
            await loadData();
            winnerDisplay.innerHTML = `<h2 style="color: var(--accent-gold);">🏆 ${count} Winners Drawn! 🏆</h2>`;
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
    const { winner, prizeName, prizeRank } = data;
    const rankText = prizeRank ? `${prizeRank} - ` : '';
    
    // Hide active prize banner
    if (activePrizeBanner) activePrizeBanner.style.display = 'none';

    winnerDisplay.innerHTML = `
        <div style="font-size: 1.5rem; color: var(--accent-gold); margin-bottom: 0.5rem;">✨ WINNER - ${rankText}${prizeName} ✨</div>
        <h2 style="margin: 0.5rem 0; font-size: 3.5rem; color: var(--primary-dark); font-weight: 800;">${winner.name}</h2>
        <div style="font-size: 1.8rem; color: var(--accent-gold); font-weight: 600; margin-bottom: 1.5rem;">${winner.dept}</div>
    `;
    loadData().then(() => {
        renderLuckyDrawWinners();
        renderAdminDashboard();
        btnDrawWinner.disabled = false;
    });
}


window.toggleClaimStatus = async function (prizeId, empId, isClaimed) {
    try {
        const res = await fetch(`${API_BASE}/api/luckydraw/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prizeId, empId, isClaimed })
        });
        if (res.ok) {
            await loadData();
            if (!adminTabLuckydraw.classList.contains('hidden')) renderLuckyDrawWinners();
            if (!adminTabClaims.classList.contains('hidden')) renderWinnerClaims();
            showToast(`Status updated.`);
        }
    } catch (err) {
        alert("Failed to update claim status");
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

window.toggleTableStatus = async function (tableIdx, newStatus) {
    try {
        const res = await fetch(`${API_BASE}/api/table/toggle-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tableIdx, status: newStatus })
        });
        if (res.ok) {
            await loadData();
            renderVisualAdminMap();
            showToast(`Table ${tableIdx + 1} status updated to ${newStatus}.`);
        }
    } catch (err) {
        alert('Server error.');
    }
};
// Unassign Seat logic
const unassignBtn = document.getElementById('admin-unassign-seat-btn');
unassignBtn.addEventListener('click', async () => {
    if (!currentEditingSeat || currentEditingSeat.tIdx === null) return;

    if (confirm(`Are you sure you want to unassign ${currentEditingSeat.empName} from Table ${currentEditingSeat.tIdx + 1}?`)) {
        try {
            const res = await fetch(`${API_BASE}/api/seat/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx: currentEditingSeat.tIdx, seatIdx: currentEditingSeat.sIdx })
            });
            if (res.ok) {
                await loadData();
                adminEditSeatModal.classList.add('hidden');
                renderAdminDirectory();
                renderVisualAdminMap();
                renderAdminDashboard();
                showToast("Seat assignment removed.");
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to unassign.');
            }
        } catch (err) { alert('Server error.'); }
    }
});

// Edit Admin Modal

window.openEditAdminModal = function (username) {
    console.log("TRIGGER: openEditAdminModal for:", username);
    const admin = appData.admins.find(a => a.username === username);
    if (!admin) return;

    document.getElementById('edit-admin-original-username').value = admin.username;
    document.getElementById('edit-admin-fullname').value = admin.full_name || '';
    document.getElementById('edit-admin-username').value = admin.username;
    document.getElementById('edit-admin-role').value = admin.role || 'Super Admin';
    document.getElementById('edit-admin-password').value = '';

    // Populate permissions checkboxes
    const perms = admin.permissions ? JSON.parse(admin.permissions) : [];
    const itemCbs = document.querySelectorAll('#edit-admin-permissions-section input[name="edit-permissions"]');
    itemCbs.forEach(cb => {
        cb.checked = perms.includes(cb.value);
    });
    
    // Update Toggle All state
    const allCb = document.getElementById('edit-admin-perms-all');
    if (allCb) {
        const total = itemCbs.length;
        const checked = perms.length;
        allCb.checked = total === checked;
        allCb.indeterminate = checked > 0 && checked < total;
    }
    
    // Toggle visibility based on role
    const permsSection = document.getElementById('edit-admin-permissions-section');
    if (permsSection) permsSection.style.display = admin.role === 'Super Admin' ? 'none' : 'block';

    editAdminModal.classList.remove('hidden');
}

    if (elCloseEditAdminModal) {
        elCloseEditAdminModal.addEventListener('click', () => {
            if (editAdminModal) editAdminModal.classList.add('hidden');
        });
    }

editAdminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const originalUsername = document.getElementById('edit-admin-original-username').value;
    const fullName = document.getElementById('edit-admin-fullname').value.trim();
    const username = document.getElementById('edit-admin-username').value.trim();
    const role = document.getElementById('edit-admin-role').value;
    const password = document.getElementById('edit-admin-password').value.trim();

    const perms = Array.from(document.querySelectorAll('#edit-admin-permissions-section input[name="edit-permissions"]:checked')).map(cb => cb.value);

    try {
        const res = await fetch(`${API_BASE}/api/admin/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalUsername, username, fullName, role, password, permissions: JSON.stringify(perms) })
        });
        if (!res.ok) { const d = await res.json(); alert(d.error); return; }

        editAdminModal.classList.add('hidden');
        await loadData();
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
        const perms = JSON.parse(currentUser.permissions);
        return perms.includes(section);
    } catch (e) {
        return false;
    }
}

function enforcePermissions() {
    if (!isAdminLoggedIn || !currentUser) return;
    
    const permissionMap = {
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
    adminTabBtns.forEach(btn => {
        if (!btn) return; // Safety check for null
        
        const section = btn.dataset.section;
        if (section && permissionMap[section]) {
            const permissionKey = permissionMap[section];
            if (!hasPermission(permissionKey)) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        }
    });

    // Special: Relocated Admin Profiles Section handle
    const profilesSection = document.getElementById('admin-profiles-section');
    if (profilesSection) {
        if (!hasPermission('admins')) {
            profilesSection.classList.add('hidden');
        } else {
            profilesSection.classList.remove('hidden');
        }
    }

    // If current tab is restricted, switch to first available
    const currentTab = document.querySelector('.admin-content-section:not(.hidden)')?.id;
    if (currentTab && permissionMap[currentTab] && !hasPermission(permissionMap[currentTab])) {
        const firstVisible = adminTabBtns.find(b => b && b.style.display !== 'none');
        if (firstVisible) firstVisible.click();
    }
}

// Manual Check-in logic
window.updateCheckin = async function (empId, status) {
    try {
        const res = await fetch(`${API_BASE}/api/seat/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empId, undo: status === 'no' })
        });
        if (res.ok) {
            await loadData();
            renderAdminDirectory();
            renderAdminDashboard();
            renderVisualAdminMap();
            showToast(`Check -in status updated.`);
        }
    } catch (err) { alert('Server error.'); }
};

window.resetLuckyDrawSession = async function () {
    if (!confirm(`Are you sure you want to completely clear all winners for Session ${currentLuckydrawSession}? This cannot be undone.`)) return;

    try {
        const res = await fetch(`${API_BASE}/api/luckydraw/reset-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: currentLuckydrawSession })
        });
        if (!res.ok) throw new Error('Failed to reset session');

        await loadData();
        renderLuckyDrawWinners();
        updateEligibleCount();
        showToast(`Session ${currentLuckydrawSession} winners have been reset.`);
    } catch (err) {
        console.error("Reset error:", err);
        alert('Failed to reset session prizes.');
    }
}

async function exportSeatingToCSV() {
    try {
        // Collect seating data
        const rows = [
            ["Table", "Seat", "Name", "ID", "Dept", "Dietary", "Status", "Checked In"]
        ];

        appData.tables.forEach((table, tIdx) => {
            table.forEach((seat, sIdx) => {
                if (seat) {
                    rows.push([
                        tIdx + 1,
                        sIdx + 1,
                        `"${seat.name}"`,
                        `"${seat.empId}"`,
                        `"${seat.dept}"`,
                        `"${seat.diet}"`,
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
        const csvContent = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        // Trigger download
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Company_Dinner_Seating_${new Date().toISOString().split('T')[0]}.csv`);
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
    const allWinners = new Set();
    (appData.prizes || []).forEach(p => (p.drawnIds || []).forEach(id => allWinners.add(id)));

    let count = 0;
    const eligibleList = [];
    appData.employees.forEach(emp => {
        if (emp.checked_in && !allWinners.has(emp.id)) {
            count++;
            eligibleList.push(emp);
        }
    });

    eligibleCountInfo.innerText = count;
    if (eligibleCountTable) eligibleCountTable.innerText = count;
    const publicEligibleCount = document.getElementById('public-eligible-count');
    if (publicEligibleCount) publicEligibleCount.innerText = count;
    renderEligibleCandidates(eligibleList);
}

function renderEligibleCandidates(eligibleList) {
    if (!luckydrawEligibleBody) return;
    luckydrawEligibleBody.innerHTML = '';

    // Sort by name or ID
    eligibleList.sort((a, b) => a.name.localeCompare(b.name)).forEach(emp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td data-label="Emp ID">${emp.id}</td>
            <td data-label="Name">${emp.name}</td>
            <td data-label="Department">${emp.dept || '-'}</td>
        `;
        luckydrawEligibleBody.appendChild(tr);
    });
}

function renderWinnerClaims() {
    if (!adminClaimsTableBody) return;
    adminClaimsTableBody.innerHTML = '';

    const searchTerm = claimsSearchInput.value.toLowerCase().trim();
    const sessionFilter = claimsFilterSession.value;
    const statusFilter = claimsFilterStatus.value;

    const winnersList = (appData.winners || []).map(w => {
        const prize = (appData.prizes || []).find(p => p.id === w.prizeId);
        const emp = (appData.employees || []).find(e => e.id === w.empId);
        return { ...w, prize, emp };
    }).filter(item => {
        if (!item.prize || !item.emp) return false;

        // Session Filter
        if (sessionFilter && item.prize.session != sessionFilter) return false;

        // Status Filter
        if (statusFilter === 'claimed' && item.is_claimed !== 1) return false;
        if (statusFilter === 'unclaimed' && item.is_claimed === 1) return false;

        // Search Filter
        if (searchTerm) {
            const match =
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

    winnersList.forEach(item => {
        const tr = document.createElement('tr');
        const isClaimed = item.is_claimed === 1;

        tr.innerHTML = `
            <td data-label="Session"><span class="session-badge" style="background: var(--accent-gold); color: #000; padding: 0.2rem 0.6rem; border-radius: 4px; font-weight: bold;">S${item.prize.session}</span></td>
            <td data-label="Rank" style="font-weight: 700; color: var(--accent-gold);">${item.prize.prize_rank || '-'}</td>
            <td data-label="Prize"><strong>${item.prize.name}</strong></td>
            <td data-label="Winner">
                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                    <div style="font-weight: bold; color: var(--accent-gold);">${item.emp.name}</div>
                    <div style="font-size: 0.85rem; opacity: 0.8;">ID: ${item.emp.id}</div>
                </div>
            </td>
            <td data-label="Dept">${item.emp.dept}</td>
            <td data-label="Status" style="text-align: center;">
                <button class="${isClaimed ? 'btn-secondary' : 'btn-primary'}" 
                    style="padding: 0.5rem 1rem; min-width: 120px;"
                    onclick="toggleClaimStatus('${item.prizeId}', '${item.empId}', ${!isClaimed})">
                    ${isClaimed ? '✅ Claimed' : '🎁 Mark Claimed'}
                </button>
            </td>
            <td data-label="Actions" style="text-align: center;">
                <button class="btn-primary" style="padding: 0.4rem 0.8rem;" onclick="window.openEditPrizeModal('${item.prize.id}')">Edit Prize</button>
            </td>
        `;
        adminClaimsTableBody.appendChild(tr);
    });
}

window.exportWinnerClaimsToCSV = function() {
    try {
        const rows = [
            ["Session", "Prize Name", "Winner Name", "Employee ID", "Department", "Status", "Claimed At"]
        ];

        // Process all winners from appData
        if (!appData.winners || appData.winners.length === 0) {
            alert("No winners found to export.");
            return;
        }

        appData.winners.forEach(w => {
            const prize = appData.prizes.find(p => p.id === w.prizeId);
            const emp = appData.employees.find(e => e.id === w.empId);
            if (prize && emp) {
                rows.push([
                    prize.session,
                    `"${prize.name}"`,
                    `"${emp.name}"`,
                    `"${emp.id}"`,
                    `"${emp.dept}"`,
                    w.is_claimed ? "Claimed" : "Unclaimed",
                    w.claimed_at || "N/A"
                ]);
            }
        });

        const csvContent = rows.map(r => r.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Winner_Claims_${new Date().toISOString().split('T')[0]}.csv`);
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

let countdownInterval = null;
function initCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const settings = appData.settings || {};
    const eventTimeStr = settings.event_timer;
    
    if (!eventTimeStr) {
        console.warn('[Countdown] No event_timer found in settings:', settings);
        return;
    }

    // Try to parse the date safely
    let targetDate;
    try {
        // Handle potential format issues by ensuring it can be parsed
        targetDate = new Date(eventTimeStr).getTime();
        
        // If it's still NaN, try to massage the string (e.g., if it's missing seconds or has spaces)
        if (isNaN(targetDate)) {
            const massaged = eventTimeStr.replace(' ', 'T');
            targetDate = new Date(massaged).getTime();
        }
    } catch (e) {
        console.error('[Countdown] Date parsing exception:', e);
        return;
    }

    if (isNaN(targetDate)) {
        console.error('[Countdown] Invalid target date format after massage:', eventTimeStr);
        return;
    }

    const now = new Date().getTime();
    const timeLeft = targetDate - now;

    const timerGrid = document.getElementById('countdown-timer');
    const endedMsg = document.getElementById('event-ended-message');

    if (timeLeft <= 0) {
        if (timerGrid) timerGrid.classList.add('hidden');
        if (endedMsg) endedMsg.classList.remove('hidden');
        return;
    }

    if (timerGrid) timerGrid.classList.remove('hidden');
    if (endedMsg) endedMsg.classList.add('hidden');

    const d = Math.floor((timeLeft / (1000 * 60 * 60 * 24)));
    const h = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const m = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((timeLeft % (1000 * 60)) / 1000);

    const daysEl = document.getElementById('days');
    const hoursEl = document.getElementById('hours');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');

    if (daysEl) daysEl.innerText = d.toString().padStart(2, '0');
    if (hoursEl) hoursEl.innerText = h.toString().padStart(2, '0');
    if (minutesEl) minutesEl.innerText = m.toString().padStart(2, '0');
    if (secondsEl) secondsEl.innerText = s.toString().padStart(2, '0');
}

// Start app
init();

// --- Support Functions ---

function renderSettings() {
    document.querySelectorAll('.toggle-feature').forEach(btn => {
        const key = btn.dataset.feature;
        const val = getSettingValue(key);
        
        // Handle different button label formats
        if (btn.classList.contains('btn-compact-outline')) {
            if (key === 'feature_seat_mode') btn.innerText = `SEAT: ${val.toUpperCase()}`;
            else if (key === 'feature_table_mode') btn.innerText = `TABLE: ${val.toUpperCase()}`;
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

    const eventTime = (appData.settings && appData.settings.event_timer) || "";
    if (eventTimerInput) eventTimerInput.value = eventTime;

    const doorGiftPin = (appData.settings && appData.settings.door_gift_pin) || "";
    const doorGiftPinInputSetting = document.getElementById('door-gift-pin-setting');
    if (doorGiftPinInputSetting) doorGiftPinInputSetting.value = doorGiftPin;
}

function checkToggleOverlays() {
    // Table Selection / Seating overlay
    updateOverlay('view-identify', 'feature_seating', 'This feature is temporarily locked.');
    updateOverlay('view-seating', 'feature_seating', 'This feature is temporarily locked.');
    
    // Check-in overlay
    updateOverlay('view-checkin', 'feature_checkin', 'This feature is temporarily locked.');
    
    // Lucky draw overlay
    updateOverlay('view-luckydraw', 'feature_luckydraw', 'This feature is temporarily locked.');

    const perfOn = getSettingValue('feature_voting_performance') === 'on';
    const dressVoteOn = getSettingValue('feature_voting_bestdress') === 'on';
    const dressNomOn = getSettingValue('feature_bestdress_nominate') === 'on';
    const feedOn = getSettingValue('feature_feedback') === 'on';
    
    const entView = document.getElementById('view-entertainment');
    if (entView) {
        let overlay = entView.querySelector('.feature-closed-overlay');
        if (!perfOn && !dressVoteOn && !dressNomOn && !feedOn) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'feature-closed-overlay';
                overlay.innerHTML = '<div class="feature-closed-content"><span class="lock-icon">? Locked</h3><p>All entertainment features are currently closed.</p></div>';
                entView.appendChild(overlay);
            }
        } else if (overlay) {
            overlay.remove();
        }
    }
    
    // Seating Mode Guest Toggle Visibility
    const seatModeActive = getSettingValue('feature_seat_mode') === 'on';
    const tableModeActive = getSettingValue('feature_table_mode') === 'on';
    const guestSeatBtn = document.getElementById('mode-seat-btn');
    const guestTableBtn = document.getElementById('mode-table-btn');
    const guestToggleContainer = document.querySelector('.seating-mode-toggle');

    if (guestSeatBtn) guestSeatBtn.style.display = seatModeActive ? 'block' : 'none';
    if (guestTableBtn) guestTableBtn.style.display = tableModeActive ? 'block' : 'none';

    if (guestToggleContainer) {
        if (!seatModeActive && !tableModeActive) {
            guestToggleContainer.style.display = 'none';
        } else if (seatModeActive && tableModeActive) {
            guestToggleContainer.style.display = 'flex';
        } else {
            // Only one mode is active, maybe hide the toggle but keep the label or just show the single button
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

    // Entertainment Feature Cards
    const cardPerf = document.getElementById('card-voting-performance');
    const cardDress = document.getElementById('card-voting-bestdress');
    const cardFeed = document.getElementById('card-feedback');
    const emptyMsg = document.getElementById('entertainment-empty-msg');
    
    let hasActiveFeatures = false;

    if (cardPerf) {
        if (getSettingValue('feature_voting_performance') === 'on') { cardPerf.style.display = 'flex'; hasActiveFeatures = true; }
        else cardPerf.style.display = 'none';
    }
    if (cardDress) {
        if (getSettingValue('feature_voting_bestdress') === 'on') { cardDress.style.display = 'flex'; hasActiveFeatures = true; }
        else cardDress.style.display = 'none';
    }
    if (cardFeed) {
        if (getSettingValue('feature_feedback') === 'on') { cardFeed.style.display = 'flex'; hasActiveFeatures = true; }
        else cardFeed.style.display = 'none';
    }

    if (emptyMsg) {
        emptyMsg.style.display = hasActiveFeatures ? 'none' : 'block';
    }
}

// --- Dynamic Feedback Logic ---
let dynamicFeedbackResponses = {};
// --- Feedback Rendering (v1.5.23 Star Upgrade) ---
async function renderDynamicFeedbackForm() {
    const container = document.getElementById('dynamic-feedback-questions');
    if (!container) return;
    try {
        const res = await fetch(`${API_BASE}/api/feedback/questions`);
        const questions = await res.json();
        container.innerHTML = '';
        
        const customTheme = getSettingValue('feedback_theme');
        const feedbackTitleEl = document.getElementById('feedback-modal-title');
        if (feedbackTitleEl) feedbackTitleEl.innerText = customTheme || 'Event Feedback';
        
        dynamicFeedbackResponses = {};

        questions.forEach(q => {
            let html = `<div class="feedback-question">
                <label style="font-weight:600; display:block; margin-bottom:0.8rem;">${q.question_text}</label>`;
            
            if (q.question_type === 'rating') {
                html += `<div class="star-rating-group" data-question-id="${q.id}" style="display:flex; gap:0.8rem; font-size:1.8rem; color:#ccc; cursor:pointer;">`;
                for (let i = 1; i <= 5; i++) {
                    html += `<span class="star-btn" data-val="${i}">鈽?/span>`;
                }
                html += `</div>`;
            } else if (q.question_type === 'choice') {
                const options = (q.options || '').split(',');
                html += `<select class="feedback-select" data-question-id="${q.id}" required style="width:100%; padding:1rem; border-radius:12px; border:1px solid rgba(0,0,0,0.1); background:white;">
                    <option value="" disabled selected>Choose an option</option>`;
                options.forEach(opt => html += `<option value="${opt.trim()}">${opt.trim()}</option>`);
                html += `</select>`;
            } else {
                html += `<textarea class="feedback-textarea" data-question-id="${q.id}" rows="3" placeholder="Additional comments..." style="width:100%; padding:1rem; border-radius:12px; border:1px solid rgba(0,0,0,0.1); resize:none;"></textarea>`;
            }
            html += `</div>`;
            container.insertAdjacentHTML('beforeend', html);
        });

        // Star Interaction logic
        container.querySelectorAll('.star-rating-group').forEach(group => {
            const stars = group.querySelectorAll('.star-btn');
            stars.forEach(star => {
                star.addEventListener('click', () => {
                    const val = parseInt(star.dataset.val);
                    const qId = group.dataset.questionId;
                    dynamicFeedbackResponses[qId] = val;
                    stars.forEach((s, idx) => {
                        s.style.color = (idx < val) ? '#FFD700' : '#ccc';
                        s.style.transform = (idx < val) ? 'scale(1.2)' : 'scale(1)';
                    });
                });
                star.addEventListener('mouseover', () => {
                    const val = parseInt(star.dataset.val);
                    stars.forEach((s, idx) => s.style.color = (idx < val) ? '#FFE066' : '#ccc');
                });
                star.addEventListener('mouseout', () => {
                    const qId = group.dataset.questionId;
                    const activeVal = dynamicFeedbackResponses[qId] || 0;
                    stars.forEach((s, idx) => s.style.color = (idx < activeVal) ? '#FFD700' : '#ccc');
                });
            });
        });
    } catch (err) { console.error('Error rendering dynamic feedback:', err); }
}

const feedbackModal = document.getElementById('feedback-modal');
const closeFeedbackModal = document.getElementById('close-feedback-modal');
const feedbackForm = document.getElementById('feedback-form');

if (closeFeedbackModal) {
    closeFeedbackModal.addEventListener('click', () => feedbackModal.classList.add('hidden'));
}

if (feedbackForm) {
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const answers = [];
        const questionsElements = document.querySelectorAll('#dynamic-feedback-questions .feedback-question');
        
        for (const el of questionsElements) {
            const starGroup = el.querySelector('.star-rating-group');
            const select = el.querySelector('.feedback-select');
            const textarea = el.querySelector('.feedback-textarea');
            
            let qId, val;
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
            const res = await fetch(`${API_BASE}/api/feedback/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empId: currentUser ? currentUser.id : voterDeviceId,
                    answers
                })
            });
            if (res.ok) {
                showToast("Thank you for your feedback! 鉂わ笍");
                feedbackModal.classList.add('hidden');
            } else { alert('Submission failed.'); }
        } catch (err) { alert('Error submitting feedback'); }
    });
}

// --- Guest Voting Logic ---
const votingModal = document.getElementById('voting-modal');
const closeVotingModal = document.getElementById('close-voting-modal');
const votingCandidatesList = document.getElementById('voting-candidates-list');

if (closeVotingModal) {
    closeVotingModal.addEventListener('click', () => votingModal.classList.add('hidden'));
}

async function openVotingModal(category) {
    try {
        const res = await fetch(`${API_BASE}/api/voting/candidates`);
        const allCandidates = await res.json();
        const candidates = allCandidates.filter(c => c.category === category);
        
        const themeKey = category === 'performance' ? 'voting_performance_theme' : 'voting_bestdress_theme';
        const defaultTitle = category === 'performance' ? 'Performance Voting' : 'Best Dressed Award';
        const customTheme = getSettingValue(themeKey);
        // Fix: If custom theme is accidentally set to "on" or "off", use default
        const displayTitle = (customTheme && customTheme.trim() !== '' && customTheme !== 'on' && customTheme !== 'off') ? customTheme : defaultTitle;
        const icon = category === 'performance' ? '?' : '?';
        
        document.getElementById('voting-modal-title').innerText = displayTitle;
        document.getElementById('voting-modal-icon').innerText = icon;
        votingCandidatesList.innerHTML = '';

        candidates.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'glass-panel voting-candidate-btn';
            btn.style.cssText = 'width: 100%; text-align: left; padding: 1.2rem; display: flex; align-items: center; gap: 1rem; cursor: pointer; border: 1px solid var(--glass-border); transition: all 0.3s;';
            btn.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--accent-gold); display: flex; align-items: center; justify-content: center; font-weight: bold; color: white;">
                    ${c.name.charAt(0)}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600;">${c.name}</div>
                </div>
                <div class="vote-arrow">鉃★笍</div>
            `;
            btn.onclick = () => submitVote(c.id, category);
            votingCandidatesList.appendChild(btn);
        });

        votingModal.classList.remove('hidden');
    } catch (err) { console.error('Error opening voting modal:', err); }
}

async function submitVote(candidateId, category) {
    if (!confirm('Confirm your vote? You can only vote once.')) return;
    try {
        const currentEmpId = currentUser ? (currentUser.id || currentUser.username) : 'Guest';
        
        const res = await fetch(`${API_BASE}/api/voting/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empId: currentUser ? (currentUser.id || currentUser.username) : voterDeviceId,
                candidateId,
                category
            })
        });
        const result = await res.json();
        if (result.success) {
            showToast("Vote cast successfully! Thank you.");
            votingModal.classList.add('hidden');
        } else {
            alert(result.error || "Failed to cast vote.");
        }
    } catch (err) { alert("Error submitting vote."); }
}

// --- Entertainment Hub Logic ---
async function renderEntertainment() {
    const perfCard = document.getElementById('card-voting-performance');
    const dressCard = document.getElementById('card-voting-bestdress');
    const feedbackCard = document.getElementById('card-feedback');
    const emptyMsg = document.getElementById('entertainment-empty-msg');

    const showPerf = getSettingValue('feature_voting_performance') === 'on';
    const showDressVote = getSettingValue('feature_voting_bestdress') === 'on';
    const showDressNom = getSettingValue('feature_bestdress_nominations') === 'on';
    const showFeedback = getSettingValue('feature_feedback') === 'on';

    perfCard.style.display = showPerf ? 'flex' : 'none';
    dressCard.style.display = (showDressVote || showDressNom) ? 'flex' : 'none';
    feedbackCard.style.display = showFeedback ? 'flex' : 'none';

    // Show/Hide individual Best Dress buttons
    const btnNominateRender = document.getElementById('btn-nominate-bestdress');
    const btnVoteDressGroup = document.getElementById('btn-group-vote-bestdress');
    
    if (btnNominateRender) {
        btnNominateRender.style.display = showDressNom ? 'block' : 'none';
    }
    
    if (btnVoteDressGroup) {
        btnVoteDressGroup.style.display = showDressVote ? 'flex' : 'none';
        // Only show the groups if they are active
        dressCard.style.display = (showDressVote || showDressNom) ? 'flex' : 'none';
        
        // Dynamic subtitle update
        const subtitle = dressCard.querySelector('p');
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
            const response = await fetch(`${API_BASE}/api/voting/candidates`);
            const candidates = await response.json();
            const activePerf = candidates.find(c => c.category === 'performance' && c.is_open);

            const activeMsg = document.getElementById('active-perf-msg');
            const ratingContainer = document.getElementById('perf-rating-container');
            const activeName = document.getElementById('active-perf-name');
            const idInput = document.getElementById('selected-perf-id');
            const btnSubmit = document.getElementById('btn-submit-perf-rating');
            const btnContainer = document.getElementById('perf-rating-buttons');

            if (activePerf) {
                activeMsg.style.display = 'none';
                ratingContainer.style.display = 'flex';
                activeName.textContent = activePerf.name;
                idInput.value = activePerf.id;

                let voteToken = localStorage.getItem('voting_device_token');
                if (!voteToken) {
                    voteToken = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
                    localStorage.setItem('voting_device_token', voteToken);
                }
                const currentUser = voteToken;

                const votedActs = JSON.parse(localStorage.getItem('voted_performances') || '{}');
                
                if (votedActs[currentUser] && votedActs[currentUser].includes(activePerf.id)) {
                    btnContainer.innerHTML = '<p style="color: #4caf50; font-weight: bold; text-align: center;">Thank you! Your vote has been recorded.</p>';
                    btnSubmit.style.display = 'none';
                } else {
                    btnSubmit.style.display = 'block';
                    btnSubmit.disabled = true;
                    btnSubmit.textContent = 'Submit Rating';
                    
                    btnContainer.innerHTML = '';
                    for (let i = 1; i <= 10; i++) {
                        const btn = document.createElement('button');
                        btn.className = 'btn-secondary';
                        btn.style.padding = '0.5rem 1rem';
                        btn.style.minWidth = '3rem';
                        btn.textContent = i;
                        btn.onclick = (e) => {
                            Array.from(btnContainer.children).forEach(b => b.style.outline = 'none');
                            e.target.style.outline = '2px solid var(--accent-gold)';
                            document.getElementById('selected-perf-score').value = i;
                            btnSubmit.disabled = false;
                        };
                        btnContainer.appendChild(btn);
                    }

                    btnSubmit.onclick = async () => {
                        btnSubmit.disabled = true;
                        btnSubmit.textContent = 'Submitting...';
                        const score = document.getElementById('selected-perf-score').value;
                        const candidateId = document.getElementById('selected-perf-id').value;
                        const empId = currentUser; // Use the anonymous device token

                        try {
                            const res = await fetch(`${API_BASE}/api/voting/vote`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ empId, candidateId, category: 'performance', score })
                            });
                            const result = await res.json();
                            if (res.ok && result.success) {
                                const acts = JSON.parse(localStorage.getItem('voted_performances') || '{}');
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
    const btnNominate = document.getElementById('btn-nominate-bestdress');
    const btnVoteMale = document.getElementById('btn-vote-bestdress-male');
    const btnVoteFemale = document.getElementById('btn-vote-bestdress-female');
    if (btnNominate) btnNominate.onclick = () => document.getElementById('nomination-modal').classList.remove('hidden');
    if (btnVoteMale) btnVoteMale.onclick = () => openVotingModal('best_dress_male');
    if (btnVoteFemale) btnVoteFemale.onclick = () => openVotingModal('best_dress_female');
    feedbackCard.querySelector('button').onclick = () => {
        renderDynamicFeedbackForm();
        feedbackModal.classList.remove('hidden');
    };
}

// Admin Export Feedback
const btnExportFeedback = document.getElementById('btn-export-feedback');
if (btnExportFeedback) {
    btnExportFeedback.addEventListener('click', () => {
        window.location.href = `${API_BASE}/api/feedback/export`;
    });
}

function updateOverlay(viewId, settingKey, message) {
    const viewEl = document.getElementById(viewId);
    if (!viewEl) return;

    const isOff = getSettingValue(settingKey) === 'off';
    let overlay = viewEl.querySelector('.feature-closed-overlay');

    if (isOff) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'feature-closed-overlay';

            // Context-aware messaging
            let title = "Feature Temporarily Locked";
            let icon = "?";

            if (settingKey === 'feature_seating') {
                title = "Table Selection Closed";
                icon = "?";
            } else if (settingKey === 'feature_checkin') {
                title = "Check-In Closed";
                icon = "?";
            } else if (settingKey === 'feature_luckydraw') {
                title = "Lucky Draw Not Active";
                icon = "?";
            }

            overlay.innerHTML = `
                <div class="feature-closed-content">
                    <span class="lock-icon">${icon}</span>
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div style="margin-top: 1.5rem; color: var(--accent-gold); font-weight: 600; font-size: 0.9rem;">
                        Please check back later or contact an administrator.
                    </div>
                </div>
            `;
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
    document.getElementById('admin-batch-modal-title').innerText = `Table ${tableIdx + 1} Batch Assignment`;
    adminBatchPaxContainer.innerHTML = '';
    
    const tableSeats = appData.tables[tableIdx];
    
    for (let i = 0; i < 11; i++) {
        const seat = tableSeats[i];
        const paxDiv = document.createElement('div');
        paxDiv.className = 'form-group';
        paxDiv.style.padding = '1rem';
        paxDiv.style.background = 'rgba(255,255,255,0.4)';
        paxDiv.style.border = '1px solid var(--glass-border)';
        paxDiv.style.borderRadius = '12px';
        
        paxDiv.innerHTML = `
            <label style="font-weight: bold; color: var(--accent-gold); margin-bottom: 0.5rem; display: block;">Seat ${i + 1}</label>
            <div style="display: flex; gap: 0.5rem;">
                <input type="text" class="batch-pax-name" data-idx="${i}" placeholder="Name" value="${seat ? seat.name : ''}" style="flex: 2; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);">
                <input type="text" class="batch-pax-id" data-idx="${i}" placeholder="Emp ID (Optional)" value="${seat ? (seat.empId || '') : ''}" style="flex: 1; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.1);">
            </div>
        `;
        adminBatchPaxContainer.appendChild(paxDiv);
    }
    
    adminBatchModal.classList.remove('hidden');
};

if (elCloseAdminBatchModal) {
    elCloseAdminBatchModal.addEventListener('click', () => {
        if (adminBatchModal) adminBatchModal.classList.add('hidden');
    });
}

if (btnBatchClearAll) {
    btnBatchClearAll.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear ALL 11 seats at this table?")) {
            document.querySelectorAll('.batch-pax-name').forEach(input => input.value = '');
            document.querySelectorAll('.batch-pax-id').forEach(input => input.value = '');
        }
    });
}

if (adminBatchForm) {
    adminBatchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const tableIdx = parseInt(adminBatchTableIdxInput.value);
        const paxData = [];
        
        const names = document.querySelectorAll('.batch-pax-name');
        const ids = document.querySelectorAll('.batch-pax-id');
        
        for (let i = 0; i < 11; i++) {
            paxData.push({
                seatIdx: i,
                name: names[i].value.trim(),
                empId: ids[i].value.trim() || null
            });
        }
        
        try {
            const res = await fetch(`${API_BASE}/api/admin/table/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tableIdx, paxData })
            });
            
            if (res.ok) {
                showToast(`Table ${tableIdx + 1} updated successfully!`);
                adminBatchModal.classList.add('hidden');
                await loadData();
                renderVisualAdminMap();
                renderAdminDashboard();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to update table.");
            }
        } catch (err) {
            alert("Server error during batch assignment.");
        }
    });
}

// --- Voting Mgmt ---
async function renderVotingMgmt() {
    try {
        const response = await fetch(`${API_BASE}/api/voting/candidates`);
        const candidates = await response.json();
        const resultsResp = await fetch(`${API_BASE}/api/voting/results`);
        const results = await resultsResp.json();

        const votingPerfBody = document.getElementById('voting-perf-body');
        const votingDressBody = document.getElementById('voting-dress-body');

        if (votingPerfBody) votingPerfBody.innerHTML = '';
        if (votingDressBody) votingDressBody.innerHTML = '';

        candidates.forEach(c => {
            const result = results.find(r => r.id === c.id) || { vote_count: 0, total_score: 0 };
            let rowHtml = '';
            
            if (c.category === 'performance') {
                const totalScore = result.total_score || 0;
                const statusHtml = c.is_open 
                    ? `<span style="color: #4caf50; font-weight: bold;">OPEN</span>` 
                    : `<span style="color: var(--text-muted);">CLOSED</span>`;
                const toggleBtn = c.is_open 
                    ? `<button onclick="toggleVotingCandidate(${c.id}, false)" class="btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;">Stop</button>`
                    : `<button onclick="toggleVotingCandidate(${c.id}, true)" class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; background: #4caf50;">Start</button>`;

                rowHtml = `
                    <tr>
                        <td>${c.name}</td>
                        <td style="text-align: center; font-weight: bold; color: var(--accent-gold);">${totalScore}</td>
                        <td style="text-align: center;">${statusHtml}</td>
                        <td style="text-align: right;">
                            ${toggleBtn}
                            <button onclick="deleteCandidate(${c.id})" class="btn-danger" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Delete</button>
                        </td>
                    </tr>
                `;
                votingPerfBody.innerHTML += rowHtml;
            } else {
                const statusHtml = c.is_open 
                    ? `<span style="color: #4caf50; font-weight: bold;">OPEN</span>` 
                    : `<span style="color: var(--text-muted);">CLOSED</span>`;
                const toggleBtn = c.is_open 
                    ? `<button onclick="toggleVotingCandidate(${c.id}, false)" class="btn-danger" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem;">Stop</button>`
                    : `<button onclick="toggleVotingCandidate(${c.id}, true)" class="btn-primary" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; margin-right: 0.5rem; background: #4caf50;">Start</button>`;

                rowHtml = `
                    <tr>
                        <td>${c.name}</td>
                        <td style="text-align: center; font-weight: bold; color: var(--accent-gold);">${result.vote_count}</td>
                        <td style="text-align: center;">${statusHtml}</td>
                        <td style="text-align: right;">
                            ${toggleBtn}
                            <button onclick="deleteCandidate(${c.id})" class="btn-danger" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;">Delete</button>
                        </td>
                    </tr>
                `;
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

async function toggleVotingCandidate(id, isOpen) {
    try {
        const res = await fetch(`${API_BASE}/api/admin/voting/candidates/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, is_open: isOpen })
        });
        if (res.ok) {
            renderVotingMgmt();
            triggerGlobalRefresh();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to toggle status.');
        }
    } catch (err) { console.error('Toggle err:', err); }
}

async function openAddCandidateModal(category) {
    const name = prompt(`Enter name for ${category === 'performance' ? 'Performance' : 'Best Dress'} candidate:`);
    if (name) {
        console.log(`[VotingMgmt] Adding candidate: ${name} to ${category}`);
        try {
            const res = await fetch(`${API_BASE}/api/admin/voting/candidates/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category, name })
            });
            const result = await res.json();
            console.log(`[VotingMgmt] Server response:`, result);
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

async function deleteCandidate(id) {
    if (confirm('Are you sure you want to delete this candidate?')) {
        try {
            await fetch(`${API_BASE}/api/admin/voting/candidates/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            renderVotingMgmt();
        } catch (err) { alert('Error deleting candidate'); }
    }
}

// --- Feedback Mgmt ---
async function renderFeedbackMgmt() {
    try {
        const response = await fetch(`${API_BASE}/api/feedback/questions`);
        const questions = await response.json();
        const grid = document.getElementById('feedback-questions-grid');
        if (!grid) return;

        if (questions.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 4rem 2rem; color: var(--text-muted); background: rgba(0,0,0,0.02); border-radius: 15px; border: 2px dashed rgba(0,0,0,0.05);">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">?
                    <p>No questions added yet. Click "+ Add New Question" to begin.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        questions.forEach(q => {
            const icon = q.question_type === 'rating' ? '⭐' : (q.question_type === 'choice' ? '❓' : '💬');
            const typeLabel = q.question_type.charAt(0).toUpperCase() + q.question_type.slice(1);
            
            grid.innerHTML += `
                <div class="glass-panel animate-fade-in" style="padding: 1.2rem; border-radius: 12px; border: 1px solid rgba(0,0,0,0.05); background: #fff; display: flex; align-items: center; gap: 1.5rem; transition: all 0.2s ease;">
                    <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(10, 130, 118, 0.1); color: var(--primary-dark); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; flex-shrink: 0;">
                        ${q.sort_order}
                    </div>
                    
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.8rem; margin-bottom: 0.4rem;">
                            <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 0.2rem 0.6rem; border-radius: 6px; background: rgba(0,0,0,0.04); color: var(--text-muted);">
                                ${icon} ${typeLabel}
                            </span>
                            ${q.is_active ? 
                                '<span style="font-size: 0.7rem; font-weight: 700; background: #e8f5e9; color: #2e7d32; padding: 0.2rem 0.6rem; border-radius: 6px;">ACTIVE</span>' : 
                                '<span style="font-size: 0.7rem; font-weight: 700; background: #ffebee; color: #c62828; padding: 0.2rem 0.6rem; border-radius: 6px;">INACTIVE</span>'
                            }
                        </div>
                        <h4 style="margin: 0; font-size: 1.05rem; color: var(--text-main); line-height: 1.4;">${q.question_text}</h4>
                        ${q.options ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem; font-style: italic;">Options: ${q.options}</div>` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="deleteFeedbackQuestion(${q.id})" class="btn-danger" 
                            style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; padding: 0; border-radius: 10px; font-size: 1.2rem; cursor: pointer;" 
                            title="Delete Question">
                            ?                        </button>
                    </div>
                </div>
            `;
        });

        if (feedbackThemeInput) feedbackThemeInput.value = getSettingValue('feedback_theme') || '';
    } catch (err) { console.error('Error rendering feedback mgmt:', err); }
}

async function renderFeedbackResults() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/feedback/stats`);
        const { totalSubmissions, stats } = await res.json();
        
        const totalEl = document.getElementById('stat-total-submissions');
        const grid = document.getElementById('feedback-stats-grid');
        
        if (totalEl) totalEl.innerText = totalSubmissions;
        if (!grid) return;
        
        if (!stats || stats.length === 0) {
            grid.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-muted);">No survey questions found.</div>';
            return;
        }

        grid.innerHTML = '';
        stats.forEach(q => {
            const card = document.createElement('div');
            card.className = 'glass-panel animate-fade-in';
            card.style.padding = '1.5rem';
            card.style.border = '1px solid rgba(0,0,0,0.05)';
            
            let resultHtml = '';
            const icon = q.question_type === 'rating' ? '⭐' : (q.question_type === 'choice' ? '❓' : '💬');

            if (q.question_type === 'rating') {
                const avg = q.avg_rating ? parseFloat(q.avg_rating).toFixed(1) : '0';
                const percentage = (parseFloat(avg) / 5) * 100;
                resultHtml = `
                    <div style="display: flex; align-items: center; gap: 1.5rem;">
                        <div style="text-align: center; min-width: 80px;">
                            <div style="font-size: 2.2rem; font-weight: 800; color: var(--accent-gold); line-height: 1;">${avg}</div>
                            <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; margin-top: 5px;">Avg Stars</div>
                        </div>
                        <div style="flex: 1;">
                            <div style="height: 12px; background: rgba(0,0,0,0.05); border-radius: 6px; overflow: hidden;">
                                <div style="width: ${percentage}%; height: 100%; background: linear-gradient(90deg, var(--accent-gold), #ffca28); border-radius: 6px;"></div>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.75rem; color: var(--text-muted);">
                                <span>1 Star</span>
                                <span>5 Stars</span>
                            </div>
                        </div>
                    </div>
                `;
            } else if (q.question_type === 'choice') {
                const breakdown = q.choice_breakdown || [];
                resultHtml = `<div style="display: flex; flex-direction: column; gap: 0.8rem;">`;
                breakdown.forEach(c => {
                    const perc = q.response_count > 0 ? (c.count / q.response_count * 100).toFixed(0) : 0;
                    resultHtml += `
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 4px;">
                                <span style="font-weight: 600;">${c.choice}</span>
                                <span style="color: var(--text-muted);">${c.count} (${perc}%)</span>
                            </div>
                            <div style="height: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; overflow: hidden;">
                                <div style="width: ${perc}%; height: 100%; background: var(--primary-main); border-radius: 4px;"></div>
                            </div>
                        </div>
                    `;
                });
                if (breakdown.length === 0) resultHtml += '<p style="font-size: 0.85rem; color: var(--text-muted);">No selections made yet.</p>';
                resultHtml += `</div>`;
            } else if (q.question_type === 'text') {
                const comments = q.recent_comments || [];
                resultHtml = `<div style="display: flex; flex-direction: column; gap: 0.5rem;">`;
                comments.forEach(c => {
                    resultHtml += `
                        <div style="background: rgba(0,0,0,0.02); padding: 0.8rem; border-radius: 8px; font-size: 0.85rem; line-height: 1.4; border-left: 3px solid var(--accent-gold);">
                            "${c.comment}"
                        </div>
                    `;
                });
                if (comments.length === 0) resultHtml += '<p style="font-size: 0.85rem; color: var(--text-muted);">No comments yet.</p>';
                resultHtml += `</div>`;
            }

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <span style="font-size: 1.2rem;">${icon}</span>
                        <h4 style="margin: 0; font-size: 1.1rem; color: var(--text-main);">${q.question_text}</h4>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: bold; background: rgba(0,0,0,0.05); padding: 0.2rem 0.6rem; border-radius: 6px;">
                        ${q.response_count} Responses
                    </span>
                </div>
                ${resultHtml}
            `;
            grid.appendChild(card);
        });
    } catch (err) { console.error('Error rendering feedback results:', err); }
}

async function deleteFeedbackQuestion(id) {
    if (confirm('Are you sure you want to delete this question?')) {
        try {
            await fetch(`${API_BASE}/api/admin/feedback/questions/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            renderFeedbackMgmt();
        } catch (err) { alert('Error deleting question'); }
    }
}

// Global hook for adding feedback question
document.getElementById('btn-add-feedback-question')?.addEventListener('click', async () => {
    const text = prompt('Enter question text:');
    if (!text) return;
    const type = prompt('Enter type (text/rating/choice):', 'rating');
    const options = (type === 'choice') ? prompt('Enter options (comma separated):') : '';
    const order = prompt('Enter sort order:', '1');

    try {
        await fetch(`${API_BASE}/api/admin/feedback/questions/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_text: text, question_type: type, options, sort_order: parseInt(order) })
        });
        renderFeedbackMgmt();
    } catch (err) { alert('Error adding question'); }
});

// Export buttons
document.getElementById('btn-export-voting')?.addEventListener('click', () => {
    window.location.href = '/api/admin/export/voting';
});

document.getElementById('btn-export-feedback-dynamic')?.addEventListener('click', () => {
    window.location.href = '/api/admin/export/feedback_dynamic';
});

// --- Best Dress Nomination Logic ---
const nominationModal = document.getElementById('nomination-modal');
const closeNominationBtn = document.getElementById('close-nomination-modal');
const formNominate = document.getElementById('form-nominate-bestdress');
const nominateSearchInput = document.getElementById('nominate-search');
const nominateSearchResults = document.getElementById('nominate-search-results');
const empIdInput = document.getElementById('nominate-emp-id');
const empNameInput = document.getElementById('nominate-emp-name');

if (closeNominationBtn) {
    closeNominationBtn.onclick = () => nominationModal.classList.add('hidden');
}

if (nominateSearchInput) {
    nominateSearchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            nominateSearchResults.innerHTML = '';
            empIdInput.value = '';
            empNameInput.value = '';
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/api/employees/search?q=${encodeURIComponent(query)}`);
            const matches = await res.json();

            nominateSearchResults.innerHTML = '';
            matches.forEach(emp => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 0.8rem; border-bottom: 1px solid rgba(255,255,255,0.1); cursor: pointer; color: white; display: flex; justify-content: space-between;';
                div.innerHTML = `<span>${emp.name}</span><span style="color: var(--accent-gold); font-size:0.8rem;">${emp.id}</span>`;
                div.onclick = () => {
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
    formNominate.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!empIdInput.value) {
            alert('Please search and select a valid employee from the list.');
            return;
        }

        const btnSubmit = document.getElementById('btn-submit-nomination');
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Uploading... (Please wait)';

        let deviceId = localStorage.getItem('voting_device_token');
        if (!deviceId) {
            deviceId = 'dev-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
            localStorage.setItem('voting_device_token', deviceId);
        }

        const formData = new FormData();
        formData.append('category', document.getElementById('nominate-category').value);
        formData.append('nominee_name', empNameInput.value);
        formData.append('nominee_emp_id', empIdInput.value);
        formData.append('submitter_device_id', deviceId);
        formData.append('photo', document.getElementById('nominate-photo').files[0]);

        try {
            const res = await fetch(`${API_BASE}/api/nominations/submit`, {
                method: 'POST',
                body: formData
            });
            
            const result = await res.json();
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
async function loadAdminNominations() {
    try {
        const res = await fetch(`${API_BASE}/api/nominations/list`);
        const noms = await res.json();
        const gridMale = document.getElementById('nomination-grid-male');
        const gridFemale = document.getElementById('nomination-grid-female');
        
        if(!gridMale || !gridFemale) return;
        
        const hasRanked = noms.some(n => n.ai_score > 0);
        const btnTransfer = document.getElementById('btn-admin-ai-transfer');
        if (btnTransfer) {
            btnTransfer.style.display = hasRanked ? 'inline-block' : 'none';
            btnTransfer.onclick = promoteAiTop3;
        }

        const maleNoms = noms.filter(n => n.category === 'male').sort((a,b) => b.ai_score - a.ai_score);
        const femaleNoms = noms.filter(n => n.category === 'female').sort((a,b) => b.ai_score - a.ai_score);
        
        const renderGrid = (list, container) => {
            container.innerHTML = '';
            if (list.length === 0) container.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem;">No entries found.</div>';
            list.forEach((nom, index) => {
                const isTop3 = nom.ai_score > 0 && index < 3;
                const card = document.createElement('div');
                card.className = 'glass-panel';
                let borderStyle = isTop3 ? 'border: 2px solid var(--accent-gold); box-shadow: 0 0 15px rgba(234,179,8,0.3);' : '';
                
                card.style.cssText = `padding: 0.5rem; text-align: center; position: relative; overflow: visible; ${borderStyle}`;
                card.innerHTML = `
                    ${isTop3 ? `<div style="position:absolute; top:-10px; right:-10px; background:var(--accent-gold); color:black; font-weight:bold; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; z-index:10; font-size:0.9rem;">#${index+1}</div>` : ''}
                    <div style="background: url('${encodeURI(nom.photo_path)}') center/cover; width: 100%; aspect-ratio: 1; border-radius: 8px; margin-bottom: 0.5rem; border: 1px solid rgba(255,255,255,0.1);"></div>
                    <div style="font-weight: bold; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${nom.nominee_name}">${nom.nominee_name}</div>
                    <div style="font-size: 0.75rem; color: var(--accent-gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${nom.dept || nom.nominee_emp_id}">${nom.dept || nom.nominee_emp_id}</div>
                    ${nom.ai_score > 0 ? `<div style="margin-top:0.5rem; background: rgba(0,0,0,0.3); padding: 0.2rem; border-radius: 4px;"><span style="color:var(--accent-gold); font-weight:bold;">${nom.ai_score} / 100</span><br><span style="font-size:0.65rem; color:#aaa; display:block; padding:0 0.2rem;" title="${nom.ai_reasoning}">? "${nom.ai_reasoning}"</span></div>` : `<div style="margin-top:0.5rem; font-size:0.75rem; color:#888;">鈴?Unranked</div>`}
                `;
                container.appendChild(card);
            });
        };
        
        renderGrid(maleNoms, gridMale);
        renderGrid(femaleNoms, gridFemale);
    } catch (err) {
        console.error('Error loading nominations', err);
    }
}

async function triggerAiRanking() {
    if (!confirm('Are you sure you want to trigger the AI Judge? This may take up to 15 seconds as it streams images to the cloud for computer vision ranking.')) return;

    const btn = document.getElementById('btn-admin-ai-rank');
    const ogText = btn.innerHTML;
    btn.innerHTML = '鈴?AI is thinking...';
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/api/nominations/ai-rank`, { method: 'POST' });
        const data = await res.json();
        alert(data.message || 'AI ranking complete!');
        await loadAdminNominations();
    } catch (err) {
        alert('Failed to run AI ranking: ' + err.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

async function promoteAiTop3() {
    if(!confirm('This will promote the Top 3 Men and Top 3 Women into the live voting stage. Proceed?')) return;
    const btn = document.getElementById('btn-admin-ai-transfer');
    const ogText = btn.innerHTML;
    btn.innerHTML = '鈴?Promoting...';
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/api/admin/nominations/promote`, { method: 'POST' });
        const data = await res.json();
        alert(`Successfully promoted ${data.promoted} AI candidates!`);
        btn.style.display = 'none';
    } catch(err) {
        alert('Promotion failed: ' + err.message);
    } finally {
        btn.innerHTML = ogText;
        btn.disabled = false;
    }
}

// --- Winner Reveal Logic ---
window.showWinnerReveal = async function(category) {
    try {
        const response = await fetch(`${API_BASE}/api/voting/candidates`);
        const candidates = await response.json();
        const resultsResp = await fetch(`${API_BASE}/api/voting/results`);
        const results = await resultsResp.json();

        // Filter and sort
        const categoryCandidates = candidates.filter(c => c.category === category);
        const candidatesWithScores = categoryCandidates.map(c => {
            const r = results.find(res => res.id === c.id) || { vote_count: 0, total_score: 0 };
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

        const winner = candidatesWithScores[0];

        // UI Setup
        const revealView = document.getElementById('view-winner-reveal');
        const titleLabel = document.getElementById('winner-reveal-title');
        const candidateBox = document.getElementById('winner-reveal-candidate');
        const nameLabel = document.getElementById('winner-name');
        const scoreVal = document.getElementById('winner-score-val');
        
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
        setTimeout(() => {
            titleLabel.textContent = "And the Winner is...";
            
            setTimeout(() => {
                titleLabel.style.display = 'none';
                candidateBox.classList.remove('hidden');
                
                // Slight delay to trigger CSS transition
                setTimeout(() => {
                    candidateBox.classList.add('active');
                }, 100);
            }, 2500);
        }, 2000);

    } catch (err) {
        console.error('Error fetching winner:', err);
        alert('Failed to calculate winner.');
    }
};




