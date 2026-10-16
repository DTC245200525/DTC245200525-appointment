/**
 * Appointment System - Client Main JavaScript (main.js)
 * Enterprise-grade UX, Instant availability, Stepper progress, and Digital Ticket
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
    const serviceCards = document.querySelectorAll(".service-card");
    const serviceSelectBtns = document.querySelectorAll(".service-select-btn");
    const slotStatusHint = document.getElementById("slot-status-hint");

    // Summary Box Elements
    const summaryBox = document.getElementById("appointment-summary");
    const summaryServiceName = document.getElementById("summary-service-name");
    const summaryDatetime = document.getElementById("summary-datetime");
    const summaryPrice = document.getElementById("summary-price");

    // Modal Elements
    const successModal = document.getElementById("success-modal");
    const closeSuccessBtn = document.getElementById("close-success-modal");
    const doneModalBtn = document.getElementById("btn-done-modal");
    const copyTicketBtn = document.getElementById("copy-ticket-code-btn");
    const copyBtnText = document.getElementById("copy-btn-text");
    const btnTrackNow = document.getElementById("btn-track-now");

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

    let currentTicketId = "";
    let servicesCache = [];

    // -------------------------------------------------------------------------
    // Toast Notification Utility (Clean, Neutral, Modern)
    // -------------------------------------------------------------------------
    function showToast(text, type = "info") {
        if (!toastContainer) return;
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        let iconSvg = `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        if (type === "success") {
            iconSvg = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
        } else if (type === "error") {
            iconSvg = `<svg class="svg-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
        }

        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${iconSvg}
                <span>${text}</span>
            </div>
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
    // Check Booked Slots Availability on Chosen Date
    // -------------------------------------------------------------------------
    async function checkDateAvailability(dateStr) {
        if (!dateStr || !slotStatusHint) return;

        slotStatusHint.textContent = "Đang kiểm tra lịch trống...";

        try {
            const res = await fetch(`/api/appointments/booked-slots?date=${encodeURIComponent(dateStr)}`);
            if (!res.ok) throw new Error("Không thể kiểm tra lịch trống");
            const data = await res.json();
            const booked = data.bookedSlots || [];

            let availableCount = 0;

            timeSlotBtns.forEach(btn => {
                const slotTime = btn.dataset.time;
                // Check if slot falls in any booked appointment [start_time, end_time)
                const isConflict = booked.some(b => {
                    const bStart = String(b.start_time).slice(0, 5);
                    const bEnd = String(b.end_time).slice(0, 5);
                    return slotTime >= bStart && slotTime < bEnd;
                });

                if (isConflict) {
                    btn.disabled = true;
                    btn.classList.add("booked");
                    btn.title = "Khung giờ này đã có người đặt";
                    if (timeInput.value === slotTime) {
                        timeInput.value = "";
                        btn.classList.remove("active");
                    }
                } else {
                    btn.disabled = false;
                    btn.classList.remove("booked");
                    btn.title = `Chọn khung giờ ${slotTime}`;
                    availableCount++;
                }
            });

            slotStatusHint.textContent = availableCount > 0 
                ? `Còn ${availableCount} khung giờ khả dụng` 
                : "Ngày này đã kín toàn bộ khung giờ";
        } catch {
            slotStatusHint.textContent = "Khung giờ khả dụng";
            timeSlotBtns.forEach(b => {
                b.disabled = false;
                b.classList.remove("booked");
            });
        }
    }

    if (dateInput.value) {
        checkDateAvailability(dateInput.value);
    }

    dateInput.addEventListener("change", () => {
        checkDateAvailability(dateInput.value);
        updateSummaryBox();
    });

    // -------------------------------------------------------------------------
    // Time Slots Interactive Picker
    // -------------------------------------------------------------------------
    timeSlotBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            if (btn.disabled) return;
            timeSlotBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            timeInput.value = btn.dataset.time;
            updateSummaryBox();
        });
    });

    timeInput.addEventListener("input", () => {
        timeSlotBtns.forEach(btn => {
            if (btn.dataset.time === timeInput.value && !btn.disabled) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });
        updateSummaryBox();
    });

    // -------------------------------------------------------------------------
    // Select Service from Cards & Sync
    // -------------------------------------------------------------------------
    function highlightSelectedServiceCard(serviceVal) {
        serviceCards.forEach(card => {
            if (card.dataset.serviceCode === serviceVal) {
                card.classList.add("active");
            } else {
                card.classList.remove("active");
            }
        });
    }

    serviceSelectBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const val = btn.dataset.serviceVal;
            if (val && serviceSelect) {
                serviceSelect.value = val;
                highlightSelectedServiceCard(val);
                updateSummaryBox();
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                serviceSelect.focus();
                showToast(`Đã chọn dịch vụ: ${serviceSelect.options[serviceSelect.selectedIndex]?.text.split("-")[0].trim() || val}`, "info");
            }
        });
    });

    serviceSelect.addEventListener("change", () => {
        highlightSelectedServiceCard(serviceSelect.value);
        updateSummaryBox();
    });

    // -------------------------------------------------------------------------
    // Update Dynamic Appointment Summary Box
    // -------------------------------------------------------------------------
    function updateSummaryBox() {
        if (!summaryBox) return;

        const val = serviceSelect.value;
        const date = dateInput.value;
        const time = timeInput.value;

        if (!val) {
            summaryBox.classList.remove("show");
            return;
        }

        const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
        const labelText = selectedOption ? selectedOption.text : "";
        const parts = labelText.split("-");
        const title = parts[0]?.trim() || "Dịch vụ đã chọn";
        const meta = parts[1]?.trim() || "";

        summaryServiceName.textContent = title;
        summaryPrice.textContent = meta || "Tiêu chuẩn";

        if (date && time) {
            summaryDatetime.textContent = `Lịch hẹn: ${time} ngày ${date}`;
        } else if (date) {
            summaryDatetime.textContent = `Ngày ${date} (chưa chọn giờ)`;
        } else {
            summaryDatetime.textContent = "Vui lòng chọn ngày và giờ hẹn";
        }

        summaryBox.classList.add("show");
    }

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

            servicesCache = result.data || [];

            const serviceValues = {
                "Tư vấn": "consultation",
                "Bảo trì": "maintenance",
                "Dịch vụ khác": "other"
            };

            serviceSelect.replaceChildren(new Option("-- Chọn dịch vụ --", ""));

            servicesCache.forEach((service) => {
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

        if (!fullName || !phone || !email || !service || !date || !time) {
            showToast("Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)", "error");
            return;
        }

        const submitText = submitBtn.querySelector(".btn-text");
        const originalText = submitText ? submitText.textContent : "Xác nhận gửi yêu cầu";
        submitBtn.disabled = true;
        if (submitText) submitText.textContent = "Đang kiểm tra và lưu lịch...";

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
            showToast("Đặt lịch thành công! Hệ thống đã ghi nhận phiếu hẹn.", "success");
            
            // Populate Ticket Modal
            const apt = result.appointment;
            currentTicketId = String(apt.id);
            document.getElementById("ticket-id").textContent = `#${currentTicketId.padStart(4, "0")}`;
            document.getElementById("ticket-name").textContent = fullName;
            document.getElementById("ticket-phone").textContent = phone;
            document.getElementById("ticket-service").textContent = 
                serviceSelect.options[serviceSelect.selectedIndex]?.text.split("-")[0].trim() || service;
            document.getElementById("ticket-datetime").textContent = `${apt.start_time.slice(0, 5)} - ${apt.end_time.slice(0, 5)} | Ngày ${apt.appointment_date.slice(0, 10)}`;
            
            const barcodeNum = document.getElementById("ticket-barcode-num");
            if (barcodeNum) {
                barcodeNum.textContent = `APT-${currentTicketId.padStart(6, "0")}`;
            }

            // Open Modal
            if (typeof successModal.showModal === "function") {
                successModal.showModal();
            } else {
                successModal.setAttribute("open", "");
            }

            bookingForm.reset();
            setMinimumDate();
            highlightSelectedServiceCard("");
            updateSummaryBox();
            timeSlotBtns.forEach(b => b.classList.remove("active"));
            if (dateInput.value) {
                checkDateAvailability(dateInput.value);
            }
        } catch (err) {
            message.textContent = err.message || "Có lỗi xảy ra khi đặt lịch.";
            message.className = "field-full show error";
            showToast(err.message || "Đặt lịch thất bại.", "error");
        } finally {
            submitBtn.disabled = false;
            if (submitText) submitText.textContent = originalText;
        }
    });

    // -------------------------------------------------------------------------
    // Digital Ticket Copy Code & Track Actions
    // -------------------------------------------------------------------------
    copyTicketBtn?.addEventListener("click", async () => {
        const text = `#${currentTicketId.padStart(4, "0")}`;
        try {
            await navigator.clipboard.writeText(text);
            if (copyBtnText) copyBtnText.textContent = "Đã chép!";
            showToast(`Đã sao chép mã ${text} vào bộ nhớ tạm`, "success");
            setTimeout(() => {
                if (copyBtnText) copyBtnText.textContent = "Chép mã";
            }, 2000);
        } catch {
            showToast(`Mã phiếu của bạn là: ${text}`, "info");
        }
    });

    btnTrackNow?.addEventListener("click", () => {
        closeSuccess();
        openLookup();
        if (lookupInput) {
            lookupInput.value = currentTicketId;
            lookupForm.dispatchEvent(new Event("submit"));
        }
    });

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
    // Appointment Lookup Modal with Status Stepper
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
            <div style="text-align: center; color: var(--text-muted); padding: 28px 0;">
                <svg class="svg-icon rotating" viewBox="0 0 24 24" style="width: 24px; height: 24px; margin-bottom: 8px;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <div style="font-size: 0.88rem; font-weight: 500;">Đang tra cứu cơ sở dữ liệu...</div>
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
                    <div style="text-align: center; padding: 28px 16px; background: var(--bg-muted); border-radius: var(--radius-sm); border: 1px dashed var(--border-medium);">
                        <strong style="display:block; margin-bottom: 4px; color: var(--text-primary);">Không tìm thấy lịch hẹn phù hợp</strong>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Vui lòng kiểm tra lại số điện thoại hoặc mã hẹn đã nhập.</p>
                    </div>
                `;
                return;
            }

            const statusMap = {
                pending: { label: "Chờ xác nhận", color: "var(--status-pending-text)", bg: "var(--status-pending-bg)", desc: "Yêu cầu đang chờ ban quản lý phê duyệt." },
                confirmed: { label: "Đã xác nhận", color: "var(--status-confirmed-text)", bg: "var(--status-confirmed-bg)", desc: "Lịch hẹn đã được duyệt hợp lệ. Vui lòng đến đúng giờ." },
                completed: { label: "Đã hoàn thành", color: "var(--status-completed-text)", bg: "var(--status-completed-bg)", desc: "Buổi hẹn đã hoàn thành. Cảm ơn quý khách!" },
                cancelled: { label: "Đã hủy", color: "var(--status-cancelled-text)", bg: "var(--status-cancelled-bg)", desc: "Lịch hẹn này đã bị hủy bỏ." }
            };

            let html = `<div style="display: flex; flex-direction: column; gap: 14px;">`;
            matches.forEach(m => {
                const st = statusMap[m.status] || { label: m.status, color: "#333", bg: "#eee", desc: "" };
                const dateStr = String(m.appointment_date).slice(0, 10);
                const timeStr = `${String(m.start_time).slice(0, 5)} - ${String(m.end_time).slice(0, 5)}`;
                
                // Stepper states
                const isStep1Done = true;
                const isStep2Done = m.status === "confirmed" || m.status === "completed";
                const isStep2Active = m.status === "pending";
                const isStep3Done = m.status === "completed";
                const isCancelled = m.status === "cancelled";

                html += `
                    <div style="border: 1px solid var(--border-medium); border-radius: var(--radius-sm); padding: 18px; background: white; box-shadow: var(--shadow-sm);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--border-light);">
                            <div>
                                <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Phiếu hẹn</span>
                                <strong style="color: var(--brand-navy); font-size: 1.1rem; display: block;">#${String(m.id).padStart(4, "0")}</strong>
                            </div>
                            <span style="font-size: 0.8rem; font-weight: 700; padding: 4px 10px; border-radius: var(--radius-xs); background: ${st.bg}; color: ${st.color}; border: 1px solid var(--border-light);">
                                ${st.label}
                            </span>
                        </div>

                        <!-- Stepper Progress Tracker -->
                        <div class="lookup-stepper">
                            <div class="lookup-step ${isStep1Done ? 'completed' : ''}">
                                <div class="step-circle">1</div>
                                <span class="step-label">Tiếp nhận</span>
                            </div>
                            <div class="lookup-step ${isCancelled ? 'cancelled' : (isStep2Done ? 'completed' : (isStep2Active ? 'active' : ''))}">
                                <div class="step-circle">${isCancelled ? '✕' : '2'}</div>
                                <span class="step-label">${isCancelled ? 'Đã hủy' : 'Duyệt lịch'}</span>
                            </div>
                            <div class="lookup-step ${isStep3Done ? 'completed' : ''}">
                                <div class="step-circle">3</div>
                                <span class="step-label">Hoàn thành</span>
                            </div>
                        </div>

                        <div style="background: var(--bg-muted); border-radius: var(--radius-xs); padding: 10px 12px; font-size: 0.84rem; color: var(--text-secondary); margin-bottom: 12px;">
                            ${st.desc}
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.88rem; color: var(--text-secondary);">
                            <div><strong>Dịch vụ:</strong> ${m.service_name}</div>
                            <div><strong>Khách hàng:</strong> ${m.full_name}</div>
                            <div><strong>Số điện thoại:</strong> ${m.phone}</div>
                            <div><strong>Khung giờ:</strong> ${timeStr} ngày ${dateStr}</div>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
            lookupResults.innerHTML = html;
        } catch (err) {
            lookupResults.innerHTML = `
                <div style="color: var(--status-cancelled-text); text-align: center; padding: 20px;">
                    Lỗi tra cứu: ${err.message}
                </div>
            `;
        }
    });
});
