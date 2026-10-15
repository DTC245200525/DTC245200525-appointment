/**
 * Appointment System - Client Main JavaScript (main.js)
 */

document.addEventListener("DOMContentLoaded", () => {
    // Core Elements
    const bookingForm = document.getElementById("booking-form");
    const message = document.getElementById("message");
    const dateInput = document.getElementById("date");
    const timeInput = document.getElementById("time");
    const serviceSelect = document.getElementById("service");
    const submitBtn = document.getElementById("submit-btn");
    const timeSlotBtns = document.querySelectorAll(".time-slot-btn");
    const serviceSelectBtns = document.querySelectorAll(".service-select-btn");

    // Modal Elements
    const successModal = document.getElementById("success-modal");
    const closeSuccessBtn = document.getElementById("close-success-modal");
    const doneModalBtn = document.getElementById("btn-done-modal");

    const lookupModal = document.getElementById("lookup-modal");
    const openLookupBtn = document.getElementById("open-lookup-btn");
    const heroLookupBtn = document.getElementById("hero-lookup-btn");
    const inlineLookupBtn = document.getElementById("inline-lookup-btn");
    const closeLookupBtn = document.getElementById("close-lookup-modal");
    const btnCloseLookup = document.getElementById("btn-close-lookup");
    const lookupForm = document.getElementById("lookup-form");
    const lookupInput = document.getElementById("lookup-input");
    const lookupResults = document.getElementById("lookup-results-container");

    const toastContainer = document.getElementById("toast-container");

    // -------------------------------------------------------------------------
    // Toast Notification Utility
    // -------------------------------------------------------------------------
    function showToast(text, type = "info") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        const icon = type === "success" ? "✓" : (type === "error" ? "✕" : "ℹ");
        toast.innerHTML = `
            <span style="font-weight: 800; font-size: 1.1rem;">${icon}</span>
            <span>${text}</span>
        `;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(10px)";
            setTimeout(() => toast.remove(), 250);
        }, 4000);
    }

    // -------------------------------------------------------------------------
    // Set Minimum Date to Today
    // -------------------------------------------------------------------------
    function setMinimumDate() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const minDate = `${yyyy}-${mm}-${dd}`;
        dateInput.min = minDate;
        if (!dateInput.value) {
            dateInput.value = minDate;
        }
    }
    setMinimumDate();

    // -------------------------------------------------------------------------
    // Time Slots Interactive Picker
    // -------------------------------------------------------------------------
    timeSlotBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            timeSlotBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            timeInput.value = btn.dataset.time;
        });
    });

    timeInput.addEventListener("input", () => {
        timeSlotBtns.forEach(btn => {
            if (btn.dataset.time === timeInput.value) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
    });

    // -------------------------------------------------------------------------
    // Select Service from Cards
    // -------------------------------------------------------------------------
    serviceSelectBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const val = btn.dataset.serviceVal;
            if (val && serviceSelect) {
                serviceSelect.value = val;
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                serviceSelect.focus();
                showToast(`Đã chọn dịch vụ: ${serviceSelect.options[serviceSelect.selectedIndex]?.text || val}`, "info");
            }
        });
    });

    // -------------------------------------------------------------------------
    // Load Services from API
    // -------------------------------------------------------------------------
    async function loadServices() {
        try {
            const response = await fetch("/api/services");
            const result = await response.json();

            if (!response.ok || result.status !== "success") {
                throw new Error("Không thể tải danh sách dịch vụ.");
            }

            const serviceValues = {
                "Tư vấn": "consultation",
                "Bảo trì": "maintenance",
                "Dịch vụ khác": "other"
            };

            serviceSelect.replaceChildren(new Option("-- Chọn dịch vụ --", ""));

            result.data.forEach((service) => {
                const value = serviceValues[service.name];
                if (!value) return;

                const formattedPrice = Number(service.price).toLocaleString("vi-VN");
                const label = `${service.name} - ${formattedPrice} VNĐ (${service.duration_minutes} phút)`;
                const option = new Option(label, value);
                serviceSelect.add(option);
            });
        } catch (error) {
            console.warn("API services fallback to standard options:", error);
        }
    }
    loadServices();

    // -------------------------------------------------------------------------
    // Handle Booking Form Submit
    // -------------------------------------------------------------------------
    bookingForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const fullName = document.getElementById("fullName").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const email = document.getElementById("email").value.trim();
        const service = serviceSelect.value;
        const date = dateInput.value;
        const time = timeInput.value;

        // Basic client validation
        if (!fullName || !phone || !email || !service || !date || !time) {
            showToast("Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)", "error");
            return;
        }

        const submitText = submitBtn.querySelector(".btn-text");
        const originalText = submitText ? submitText.textContent : "Xác nhận gửi yêu cầu";
        submitBtn.disabled = true;
        if (submitText) submitText.textContent = "Đang xử lý...";

        message.className = "field-full";
        message.style.display = "none";

        try {
            const response = await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, phone, email, service, date, time })
            });

            const result = await response.json();

            if (!response.ok || result.status !== "success") {
                throw new Error(result.message || "Không thể đặt lịch. Vui lòng thử lại.");
            }

            // Success feedback
            showToast("Đặt lịch thành công! Yêu cầu đang chờ xác nhận.", "success");
            
            // Populate Ticket Modal
            const apt = result.appointment;
            document.getElementById("ticket-id").textContent = `#${String(apt.id).padStart(4, "0")}`;
            document.getElementById("ticket-name").textContent = fullName;
            document.getElementById("ticket-phone").textContent = phone;
            document.getElementById("ticket-service").textContent = 
                serviceSelect.options[serviceSelect.selectedIndex]?.text.split("-")[0].trim() || service;
            document.getElementById("ticket-datetime").textContent = `${apt.start_time.slice(0, 5)} - ${apt.end_time.slice(0, 5)} | Ngày ${apt.appointment_date.slice(0, 10)}`;

            // Open Modal
            if (typeof successModal.showModal === "function") {
                successModal.showModal();
            } else {
                successModal.setAttribute("open", "");
            }

            bookingForm.reset();
            setMinimumDate();
            timeSlotBtns.forEach(b => b.classList.remove("active"));
        } catch (err) {
            message.textContent = err.message || "Có lỗi xảy ra khi đặt lịch.";
            message.className = "field-full show error";
            showToast(err.message || "Đặt lịch thất bại.", "error");
        } finally {
            submitBtn.disabled = false;
            if (submitText) submitText.textContent = originalText;
        }
    });

    // Close Success Modal
    function closeSuccess() {
        if (typeof successModal.close === "function") {
            successModal.close();
        } else {
            successModal.removeAttribute("open");
        }
    }
    closeSuccessBtn?.addEventListener("click", closeSuccess);
    doneModalBtn?.addEventListener("click", closeSuccess);

    // -------------------------------------------------------------------------
    // Appointment Lookup Modal (Tra cứu lịch hẹn trực tuyến)
    // -------------------------------------------------------------------------
    function openLookup() {
        if (typeof lookupModal.showModal === "function") {
            lookupModal.showModal();
        } else {
            lookupModal.setAttribute("open", "");
        }
        lookupInput?.focus();
    }

    function closeLookup() {
        if (typeof lookupModal.close === "function") {
            lookupModal.close();
        } else {
            lookupModal.removeAttribute("open");
        }
    }

    openLookupBtn?.addEventListener("click", openLookup);
    heroLookupBtn?.addEventListener("click", openLookup);
    inlineLookupBtn?.addEventListener("click", openLookup);
    closeLookupBtn?.addEventListener("click", closeLookup);
    btnCloseLookup?.addEventListener("click", closeLookup);

    // Lookup Form Submit
    lookupForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const query = lookupInput.value.trim().toLowerCase().replace("#", "");
        if (!query) return;

        lookupResults.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 24px 0;">
                <span>⏳ Đang tìm kiếm thông tin lịch hẹn...</span>
            </div>
        `;

        try {
            const res = await fetch(`/api/appointments/lookup?q=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (!res.ok || data.status !== "success") {
                throw new Error(data.message || "Không thể tra cứu lịch hẹn.");
            }

            const matches = data.data || [];

            if (matches.length === 0) {
                lookupResults.innerHTML = `
                    <div style="text-align: center; color: var(--accent-rose); padding: 24px 0; background: var(--bg-muted); border-radius: var(--radius-sm);">
                        <strong style="display:block; margin-bottom: 4px;">Không tìm thấy lịch hẹn phù hợp</strong>
                        <p style="font-size: 0.85rem; color: var(--text-muted);">Vui lòng kiểm tra lại số điện thoại hoặc mã hẹn đã nhập.</p>
                    </div>
                `;
                return;
            }

            const statusMap = {
                pending: { label: "Chờ xác nhận", color: "var(--status-pending-text)", bg: "var(--status-pending-bg)" },
                confirmed: { label: "Đã xác nhận", color: "var(--status-confirmed-text)", bg: "var(--status-confirmed-bg)" },
                completed: { label: "Đã hoàn thành", color: "var(--status-completed-text)", bg: "var(--status-completed-bg)" },
                cancelled: { label: "Đã hủy", color: "var(--status-cancelled-text)", bg: "var(--status-cancelled-bg)" }
            };

            let html = `<div style="display: flex; flex-direction: column; gap: 12px;">`;
            matches.forEach(m => {
                const st = statusMap[m.status] || { label: m.status, color: "#333", bg: "#eee" };
                const dateStr = String(m.appointment_date).slice(0, 10);
                const timeStr = `${String(m.start_time).slice(0, 5)} - ${String(m.end_time).slice(0, 5)}`;
                
                html += `
                    <div style="border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 16px; background: white; box-shadow: var(--shadow-xs);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <strong style="color: var(--brand-navy); font-size: 1rem;">Mã hẹn #${String(m.id).padStart(4, "0")}</strong>
                            <span style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: ${st.bg}; color: ${st.color};">
                                ${st.label}
                            </span>
                        </div>
                        <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">
                            <div><strong>Dịch vụ:</strong> ${m.service_name}</div>
                            <div><strong>Khách hàng:</strong> ${m.full_name} (${m.phone})</div>
                            <div><strong>Thời gian:</strong> ${timeStr} | Ngày ${dateStr}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            lookupResults.innerHTML = html;
        } catch (err) {
            lookupResults.innerHTML = `
                <div style="color: var(--accent-rose); text-align: center; padding: 20px;">
                    Lỗi tra cứu: ${err.message}
                </div>
            `;
        }
    });
});
