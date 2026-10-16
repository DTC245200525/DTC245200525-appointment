/**
 * Appointment System - Admin Dashboard JavaScript (admin.js)
 * Clean, Neutral Minimalist Style with Unified Action Select
 */

document.addEventListener("DOMContentLoaded", () => {
    // Auth & Screen Elements
    const loginScreen = document.getElementById("admin-login-screen");
    const dashboardScreen = document.getElementById("admin-dashboard-screen");
    const adminUserNav = document.getElementById("admin-user-nav");
    const adminUserDisplay = document.getElementById("admin-user-display");
    const logoutBtn = document.getElementById("logout-button");

    const loginForm = document.getElementById("login-form");
    const loginUsername = document.getElementById("login-username");
    const loginPassword = document.getElementById("login-password");
    const loginSubmitBtn = document.getElementById("login-submit-btn");
    const loginBtnText = document.getElementById("login-btn-text");
    const loginError = document.getElementById("login-error");
    const togglePwdBtn = document.getElementById("toggle-pwd-btn");

    // Dashboard Elements
    const appointmentsBody = document.getElementById("appointments-body");
    const adminMessage = document.getElementById("admin-message");
    const statusFilter = document.getElementById("status-filter");
    const dateFilter = document.getElementById("date-filter");
    const searchInput = document.getElementById("admin-search-input");
    const refreshButton = document.getElementById("refresh-button");
    const exportCsvBtn = document.getElementById("export-csv-btn");

    // KPI Elements
    const kpiTotal = document.getElementById("kpi-total-val");
    const kpiPending = document.getElementById("kpi-pending-val");
    const kpiConfirmed = document.getElementById("kpi-confirmed-val");
    const kpiCompleted = document.getElementById("kpi-completed-val");
    const kpiCancelled = document.getElementById("kpi-cancelled-val");

    // Modals
    const detailModal = document.getElementById("detail-modal");
    const detailModalBody = document.getElementById("detail-modal-body");
    const closeDetailModal = document.getElementById("close-detail-modal");
    const btnCloseDetail = document.getElementById("btn-close-detail");

    const confirmModal = document.getElementById("confirm-modal");
    const confirmDesc = document.getElementById("confirm-modal-desc");
    const closeConfirmModal = document.getElementById("close-confirm-modal");
    const btnConfirmCancel = document.getElementById("btn-confirm-cancel");
    const btnConfirmProceed = document.getElementById("btn-confirm-proceed");

    const toastContainer = document.getElementById("toast-container");

    let appointments = [];
    let pendingAction = null;

    // -------------------------------------------------------------------------
    // Toast Notification System (Clean, No Emojis)
    // -------------------------------------------------------------------------
    function showToast(text, type = "info") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = text;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            setTimeout(() => toast.remove(), 250);
        }, 4000);
    }

    // -------------------------------------------------------------------------
    // Authentication Token Management
    // -------------------------------------------------------------------------
    const TOKEN_KEY = "appointment_admin_token";
    const USER_KEY = "appointment_admin_user";

    function getToken() {
        return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    }

    function setAuth(token, username) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, username);
    }

    function clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
    }

    function showDashboard(username) {
        if (loginScreen) loginScreen.style.display = "none";
        if (dashboardScreen) dashboardScreen.style.display = "block";
        if (adminUserNav) adminUserNav.style.display = "flex";
        if (adminUserDisplay) adminUserDisplay.textContent = username || "admin";
        loadAppointments();
    }

    function showLogin(errorMessage = null) {
        if (loginScreen) loginScreen.style.display = "flex";
        if (dashboardScreen) dashboardScreen.style.display = "none";
        if (adminUserNav) adminUserNav.style.display = "none";
        if (loginPassword) loginPassword.value = "";
        
        if (errorMessage && loginError) {
            loginError.textContent = errorMessage;
            loginError.classList.add("show");
        } else if (loginError) {
            loginError.classList.remove("show");
        }
    }

    // -------------------------------------------------------------------------
    // Password Visibility Toggle
    // -------------------------------------------------------------------------
    togglePwdBtn?.addEventListener("click", () => {
        if (loginPassword.type === "password") {
            loginPassword.type = "text";
            togglePwdBtn.textContent = "Ẩn";
        } else {
            loginPassword.type = "password";
            togglePwdBtn.textContent = "Hiện";
        }
    });

    // -------------------------------------------------------------------------
    // Login Form Handler
    // -------------------------------------------------------------------------
    loginForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = loginUsername.value.trim();
        const password = loginPassword.value.trim();

        if (!username || !password) {
            loginError.textContent = "Vui lòng nhập tên đăng nhập và mật khẩu.";
            loginError.classList.add("show");
            return;
        }

        loginSubmitBtn.disabled = true;
        if (loginBtnText) loginBtnText.textContent = "Đang xử lý...";
        loginError.classList.remove("show");

        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const result = await response.json();

            if (!response.ok || result.status !== "success") {
                throw new Error(result.message || "Đăng nhập thất bại.");
            }

            setAuth(result.token, result.user.username);
            showToast(`Đăng nhập thành công: ${result.user.username}`);
            showDashboard(result.user.username);
        } catch (err) {
            loginError.textContent = err.message || "Tên đăng nhập hoặc mật khẩu không chính xác.";
            loginError.classList.add("show");
        } finally {
            loginSubmitBtn.disabled = false;
            if (loginBtnText) loginBtnText.textContent = "Đăng nhập";
        }
    });

    // -------------------------------------------------------------------------
    // Logout Handler
    // -------------------------------------------------------------------------
    logoutBtn?.addEventListener("click", () => {
        clearAuth();
        showLogin();
        showToast("Đã đăng xuất.");
    });

    // -------------------------------------------------------------------------
    // Verify Session on Load
    // -------------------------------------------------------------------------
    async function checkAuthSession() {
        const token = getToken();
        if (!token) {
            showLogin();
            return;
        }

        try {
            const res = await fetch("/api/admin/verify", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok && data.status === "success") {
                showDashboard(data.user.username);
            } else {
                clearAuth();
                showLogin("Phiên đăng nhập đã hết hạn.");
            }
        } catch {
            clearAuth();
            showLogin();
        }
    }

    // -------------------------------------------------------------------------
    // Custom Confirm Dialog
    // -------------------------------------------------------------------------
    function openConfirmDialog(message, onConfirm) {
        confirmDesc.textContent = message;
        pendingAction = onConfirm;
        if (typeof confirmModal.showModal === "function") {
            confirmModal.showModal();
        } else {
            confirmModal.setAttribute("open", "");
        }
    }

    function closeConfirmDialog() {
        pendingAction = null;
        if (typeof confirmModal.close === "function") {
            confirmModal.close();
        } else {
            confirmModal.removeAttribute("open");
        }
    }

    closeConfirmModal?.addEventListener("click", closeConfirmDialog);
    btnConfirmCancel?.addEventListener("click", closeConfirmDialog);

    btnConfirmProceed?.addEventListener("click", () => {
        if (typeof pendingAction === "function") {
            pendingAction();
        }
        closeConfirmDialog();
    });

    // -------------------------------------------------------------------------
    // Status Configurations
    // -------------------------------------------------------------------------
    const statusConfig = {
        pending: { label: "Chờ xác nhận", class: "badge-pending" },
        confirmed: { label: "Đã xác nhận", class: "badge-confirmed" },
        completed: { label: "Đã hoàn thành", class: "badge-completed" },
        cancelled: { label: "Đã hủy", class: "badge-cancelled" }
    };

    // -------------------------------------------------------------------------
    // Helper: Customer Name Initials
    // -------------------------------------------------------------------------
    function getInitials(name) {
        if (!name) return "KH";
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    // -------------------------------------------------------------------------
    // Update KPI Dashboard with Progress Bars
    // -------------------------------------------------------------------------
    function updateKPIs(data) {
        let total = data.length;
        let pending = 0;
        let confirmed = 0;
        let completed = 0;
        let cancelled = 0;

        data.forEach(apt => {
            if (apt.status === "pending") pending++;
            else if (apt.status === "confirmed") confirmed++;
            else if (apt.status === "completed") completed++;
            else if (apt.status === "cancelled") cancelled++;
        });

        if (kpiTotal) kpiTotal.textContent = total;
        if (kpiPending) kpiPending.textContent = pending;
        if (kpiConfirmed) kpiConfirmed.textContent = confirmed;
        if (kpiCompleted) kpiCompleted.textContent = completed;
        if (kpiCancelled) kpiCancelled.textContent = cancelled;

        const pendingPct = total > 0 ? (pending / total * 100).toFixed(0) : 0;
        const confirmedPct = total > 0 ? (confirmed / total * 100).toFixed(0) : 0;
        const completedPct = total > 0 ? (completed / total * 100).toFixed(0) : 0;
        const cancelledPct = total > 0 ? (cancelled / total * 100).toFixed(0) : 0;

        document.getElementById("kpi-pending-bar")?.setAttribute("style", `width: ${pendingPct}%; background: #475569;`);
        document.getElementById("kpi-confirmed-bar")?.setAttribute("style", `width: ${confirmedPct}%; background: #166534;`);
        document.getElementById("kpi-completed-bar")?.setAttribute("style", `width: ${completedPct}%; background: #0369a1;`);
        document.getElementById("kpi-cancelled-bar")?.setAttribute("style", `width: ${cancelledPct}%; background: #991b1b;`);
    }

    // -------------------------------------------------------------------------
    // Render Appointments Table (Unified Action Select + Avatars)
    // -------------------------------------------------------------------------
    const searchClearBtn = document.getElementById("search-clear-btn");
    const btnResetFilters = document.getElementById("btn-reset-filters");

    function renderAppointments() {
        appointmentsBody.replaceChildren();

        const sFilter = statusFilter?.value || "all";
        const dFilter = dateFilter?.value || "all";
        const query = (searchInput?.value || "").trim().toLowerCase();

        // Show/hide clear search button
        if (searchClearBtn) {
            searchClearBtn.style.display = query ? "block" : "none";
        }

        // Show/hide reset filters button
        if (btnResetFilters) {
            const hasActiveFilters = sFilter !== "all" || dFilter !== "all" || query !== "";
            btnResetFilters.style.display = hasActiveFilters ? "inline-flex" : "none";
        }

        const todayStr = new Date().toISOString().slice(0, 10);

        const filtered = appointments.filter((apt) => {
            if (sFilter !== "all" && apt.status !== sFilter) {
                return false;
            }

            const aptDateStr = String(apt.appointment_date).slice(0, 10);
            if (dFilter === "today" && aptDateStr !== todayStr) {
                return false;
            }
            if (dFilter === "upcoming" && aptDateStr < todayStr) {
                return false;
            }

            if (query) {
                const idMatch = String(apt.id).includes(query);
                const nameMatch = String(apt.full_name || "").toLowerCase().includes(query);
                const phoneMatch = String(apt.phone || "").toLowerCase().includes(query);
                const emailMatch = String(apt.email || "").toLowerCase().includes(query);
                const serviceMatch = String(apt.service_name || "").toLowerCase().includes(query);
                if (!idMatch && !nameMatch && !phoneMatch && !emailMatch && !serviceMatch) {
                    return false;
                }
            }

            return true;
        });

        if (filtered.length === 0) {
            const tr = document.createElement("tr");
            tr.className = "empty-state-row";
            tr.innerHTML = `
                <td colspan="6">
                    <div class="empty-state">
                        <svg class="svg-icon" viewBox="0 0 24 24" style="width: 32px; height: 32px; color: #94a3b8; stroke-width: 1.5;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <strong>Không tìm thấy lịch hẹn phù hợp</strong>
                        <p style="font-size: 0.86rem;">Vui lòng kiểm tra lại điều kiện lọc hoặc từ khóa tìm kiếm.</p>
                    </div>
                </td>
            `;
            appointmentsBody.appendChild(tr);
            if (adminMessage) adminMessage.textContent = `Hiển thị 0 / ${appointments.length} lịch hẹn.`;
            return;
        }

        filtered.forEach((apt) => {
            const tr = document.createElement("tr");

            // 1. ID
            const tdId = document.createElement("td");
            tdId.className = "cell-id";
            tdId.textContent = `#${String(apt.id).padStart(4, "0")}`;
            tr.appendChild(tdId);

            // 2. Customer with Avatar
            const initials = getInitials(apt.full_name);
            const tdCustomer = document.createElement("td");
            tdCustomer.innerHTML = `
                <div class="cell-customer-wrapper">
                    <div class="customer-avatar" title="${escapeHtml(apt.full_name)}">${initials}</div>
                    <div class="cell-customer">
                        <strong>${escapeHtml(apt.full_name)}</strong>
                        <small>${escapeHtml(apt.phone)} · ${escapeHtml(apt.email)}</small>
                    </div>
                </div>
            `;
            tr.appendChild(tdCustomer);

            // 3. Service
            const tdService = document.createElement("td");
            tdService.innerHTML = `<span style="font-weight: 500;">${escapeHtml(apt.service_name)}</span>`;
            tr.appendChild(tdService);

            // 4. Time
            const tdTime = document.createElement("td");
            const dateStr = String(apt.appointment_date).slice(0, 10);
            const timeStr = `${String(apt.start_time).slice(0, 5)} - ${String(apt.end_time).slice(0, 5)}`;
            tdTime.innerHTML = `
                <div class="cell-datetime">
                    <span class="date">${dateStr}</span>
                    <span class="time">${timeStr}</span>
                </div>
            `;
            tr.appendChild(tdTime);

            // 5. Status Badge
            const tdStatus = document.createElement("td");
            const conf = statusConfig[apt.status] || { label: apt.status, class: "" };
            tdStatus.innerHTML = `<span class="badge ${conf.class}">${conf.label}</span>`;
            tr.appendChild(tdStatus);

            // 6. Unified Actions Dropdown (Gộp các nút thao tác vào 1 lựa chọn)
            const tdActions = document.createElement("td");
            tdActions.style.textAlign = "right";

            const select = document.createElement("select");
            select.className = "action-select";
            select.setAttribute("aria-label", `Thao tác cho lịch hẹn #${apt.id}`);

            let optionsHtml = `<option value="" disabled selected>Thao tác ▾</option>`;
            optionsHtml += `<option value="detail">Xem chi tiết</option>`;

            if (apt.status === "pending") {
                optionsHtml += `<option value="confirmed">Xác nhận lịch</option>`;
                optionsHtml += `<option value="cancelled">Hủy lịch</option>`;
            } else if (apt.status === "confirmed") {
                optionsHtml += `<option value="completed">Hoàn thành</option>`;
                optionsHtml += `<option value="cancelled">Hủy lịch</option>`;
            }

            select.innerHTML = optionsHtml;

            select.addEventListener("change", (e) => {
                const action = e.target.value;
                e.target.value = ""; // Reset dropdown selection

                if (action === "detail") {
                    openDetailModal(apt);
                } else if (action === "confirmed") {
                    openConfirmDialog(
                        `Xác nhận phê duyệt lịch hẹn #${apt.id} của khách hàng ${apt.full_name}?`,
                        () => updateStatus(apt.id, "confirmed")
                    );
                } else if (action === "completed") {
                    openConfirmDialog(
                        `Đánh dấu lịch hẹn #${apt.id} của khách hàng ${apt.full_name} là hoàn thành?`,
                        () => updateStatus(apt.id, "completed")
                    );
                } else if (action === "cancelled") {
                    openConfirmDialog(
                        `Xác nhận hủy lịch hẹn #${apt.id} của khách hàng ${apt.full_name}?`,
                        () => updateStatus(apt.id, "cancelled")
                    );
                }
            });

            tdActions.appendChild(select);
            tr.appendChild(tdActions);

            appointmentsBody.appendChild(tr);
        });

        if (adminMessage) {
            adminMessage.textContent = `Hiển thị ${filtered.length} / ${appointments.length} lịch hẹn.`;
        }
    }

    // -------------------------------------------------------------------------
    // View Details Modal (Customer Dossier + Direct Actions)
    // -------------------------------------------------------------------------
    function openDetailModal(apt) {
        const conf = statusConfig[apt.status] || { label: apt.status, class: "" };
        const dateStr = String(apt.appointment_date).slice(0, 10);
        const timeStr = `${String(apt.start_time).slice(0, 5)} - ${String(apt.end_time).slice(0, 5)}`;
        const createdStr = apt.created_at ? new Date(apt.created_at).toLocaleString("vi-VN") : "N/A";
        const initials = getInitials(apt.full_name);

        detailModalBody.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid var(--border-light);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="customer-avatar" style="width: 44px; height: 44px; font-size: 1rem;">${initials}</div>
                    <div>
                        <span style="font-size: 0.74rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Phiếu lịch hẹn</span>
                        <h2 style="font-size: 1.35rem; color: var(--text-primary); margin: 0; line-height: 1.2;">#${String(apt.id).padStart(4, "0")}</h2>
                    </div>
                </div>
                <span class="badge ${conf.class}">${conf.label}</span>
            </div>

            <div class="dossier-grid">
                <div class="dossier-item">
                    <span class="dossier-label">Khách hàng</span>
                    <div class="dossier-value">${escapeHtml(apt.full_name)}</div>
                </div>
                <div class="dossier-item">
                    <span class="dossier-label">Số điện thoại</span>
                    <div class="dossier-value">
                        <a href="tel:${escapeHtml(apt.phone)}" style="color: var(--brand-navy); text-decoration: none;">${escapeHtml(apt.phone)}</a>
                    </div>
                </div>
                <div class="dossier-item">
                    <span class="dossier-label">Địa chỉ Email</span>
                    <div class="dossier-value">
                        <a href="mailto:${escapeHtml(apt.email)}" style="color: var(--brand-navy); text-decoration: none; word-break: break-all;">${escapeHtml(apt.email)}</a>
                    </div>
                </div>
                <div class="dossier-item">
                    <span class="dossier-label">Dịch vụ</span>
                    <div class="dossier-value">${escapeHtml(apt.service_name)}</div>
                </div>
                <div class="dossier-item">
                    <span class="dossier-label">Ngày hẹn</span>
                    <div class="dossier-value">${dateStr}</div>
                </div>
                <div class="dossier-item">
                    <span class="dossier-label">Khung giờ</span>
                    <div class="dossier-value">${timeStr}</div>
                </div>
                <div class="dossier-item" style="grid-column: 1 / -1; padding-top: 10px; border-top: 1px dashed var(--border-light);">
                    <span class="dossier-label">Thời gian tạo phiếu</span>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">${createdStr}</div>
                </div>
            </div>

            <!-- Direct Action Controls Right Inside Detail Modal -->
            <div class="modal-direct-actions">
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-right: auto;">Thao tác nhanh:</span>
                ${apt.status === "pending" ? `
                    <button type="button" class="button button-sm button-primary" id="btn-modal-confirm">
                        Xác nhận lịch
                    </button>
                    <button type="button" class="button button-sm button-outline" id="btn-modal-cancel" style="color: #991b1b; border-color: #fecaca;">
                        Hủy lịch
                    </button>
                ` : ""}
                ${apt.status === "confirmed" ? `
                    <button type="button" class="button button-sm button-primary" id="btn-modal-complete">
                        Hoàn thành
                    </button>
                    <button type="button" class="button button-sm button-outline" id="btn-modal-cancel" style="color: #991b1b; border-color: #fecaca;">
                        Hủy lịch
                    </button>
                ` : ""}
                ${apt.status === "completed" || apt.status === "cancelled" ? `
                    <span style="font-size: 0.82rem; color: var(--text-muted); font-style: italic;">Phiên hẹn này đã đóng, không thể thay đổi.</span>
                ` : ""}
            </div>
        `;

        // Direct Modal Action Listeners
        document.getElementById("btn-modal-confirm")?.addEventListener("click", () => {
            closeDetail();
            openConfirmDialog(
                `Xác nhận phê duyệt lịch hẹn #${apt.id} của khách hàng ${apt.full_name}?`,
                () => updateStatus(apt.id, "confirmed")
            );
        });

        document.getElementById("btn-modal-complete")?.addEventListener("click", () => {
            closeDetail();
            openConfirmDialog(
                `Đánh dấu lịch hẹn #${apt.id} của khách hàng ${apt.full_name} là hoàn thành?`,
                () => updateStatus(apt.id, "completed")
            );
        });

        document.getElementById("btn-modal-cancel")?.addEventListener("click", () => {
            closeDetail();
            openConfirmDialog(
                `Xác nhận hủy lịch hẹn #${apt.id} của khách hàng ${apt.full_name}?`,
                () => updateStatus(apt.id, "cancelled")
            );
        });

        if (typeof detailModal.showModal === "function") {
            detailModal.showModal();
        } else {
            detailModal.setAttribute("open", "");
        }
    }

    function closeDetail() {
        if (typeof detailModal.close === "function") {
            detailModal.close();
        } else {
            detailModal.removeAttribute("open");
        }
    }

    closeDetailModal?.addEventListener("click", closeDetail);
    btnCloseDetail?.addEventListener("click", closeDetail);

    // -------------------------------------------------------------------------
    // Load Appointments from API (With Auth Token)
    // -------------------------------------------------------------------------
    async function loadAppointments() {
        const token = getToken();
        if (!token) {
            showLogin();
            return;
        }

        const refreshIcon = document.getElementById("refresh-icon");
        if (refreshIcon) refreshIcon.classList.add("rotating");
        if (adminMessage) adminMessage.textContent = "Đang tải dữ liệu...";

        try {
            const response = await fetch("/api/appointments", {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (response.status === 401) {
                clearAuth();
                showLogin("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
                return;
            }

            const result = await response.json();

            if (!response.ok || result.status !== "success") {
                throw new Error(result.message || "Không thể tải danh sách lịch hẹn.");
            }

            appointments = result.data || [];
            updateKPIs(appointments);
            renderAppointments();
        } catch (error) {
            if (adminMessage) adminMessage.textContent = error.message;
            showToast(`Lỗi: ${error.message}`, "error");
        } finally {
            setTimeout(() => {
                if (refreshIcon) refreshIcon.classList.remove("rotating");
            }, 600);
        }
    }

    // -------------------------------------------------------------------------
    // Update Appointment Status (With Auth Token)
    // -------------------------------------------------------------------------
    async function updateStatus(id, status) {
        const token = getToken();
        if (!token) {
            showLogin("Vui lòng đăng nhập lại.");
            return;
        }

        try {
            const response = await fetch(`/api/appointments/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            if (response.status === 401) {
                clearAuth();
                showLogin("Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.");
                return;
            }

            const result = await response.json();

            if (!response.ok || result.status !== "success") {
                throw new Error(result.message || "Cập nhật trạng thái thất bại.");
            }

            showToast(`Cập nhật lịch #${id} thành công.`);
            await loadAppointments();
        } catch (error) {
            showToast(`Lỗi: ${error.message}`, "error");
        }
    }

    // -------------------------------------------------------------------------
    // Export Data to CSV (With UTF-8 BOM for Microsoft Excel)
    // -------------------------------------------------------------------------
    function exportToCSV() {
        if (appointments.length === 0) {
            showToast("Không có dữ liệu để xuất file CSV.", "error");
            return;
        }

        const headers = ["Mã hẹn", "Khách hàng", "Số điện thoại", "Email", "Dịch vụ", "Ngày hẹn", "Giờ bắt đầu", "Giờ kết thúc", "Trạng thái", "Ngày tạo"];
        const rows = appointments.map(apt => [
            apt.id,
            `"${(apt.full_name || "").replace(/"/g, '""')}"`,
            `"${apt.phone || ""}"`,
            `"${apt.email || ""}"`,
            `"${(apt.service_name || "").replace(/"/g, '""')}"`,
            String(apt.appointment_date).slice(0, 10),
            String(apt.start_time).slice(0, 5),
            String(apt.end_time).slice(0, 5),
            apt.status,
            apt.created_at || ""
        ]);

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `danh_sach_lich_hen_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast("Đã xuất file CSV thành công.");
    }

    // Helper to escape HTML
    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Event Listeners
    statusFilter?.addEventListener("change", renderAppointments);
    dateFilter?.addEventListener("change", renderAppointments);
    searchInput?.addEventListener("input", renderAppointments);
    refreshButton?.addEventListener("click", loadAppointments);
    exportCsvBtn?.addEventListener("click", exportToCSV);

    searchClearBtn?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        renderAppointments();
        searchInput?.focus();
    });

    btnResetFilters?.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        if (statusFilter) statusFilter.value = "all";
        if (dateFilter) dateFilter.value = "all";
        renderAppointments();
        showToast("Đã thiết lập lại toàn bộ bộ lọc.", "info");
    });

    // Initial Auth Check
    checkAuthSession();
});
