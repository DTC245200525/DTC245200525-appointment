
const appointmentsBody = document.getElementById("appointments-body");
const adminMessage = document.getElementById("admin-message");
const statusFilter = document.getElementById("status-filter");
const refreshButton = document.getElementById("refresh-button");

let appointments = [];

const statusLabels = {
    pending: "Chờ xác nhận",
    confirmed: "Đã xác nhận",
    cancelled: "Đã hủy",
    completed: "Đã hoàn thành"
};

function createCell(value) {
    const cell = document.createElement("td");
    cell.textContent = value ?? "";
    return cell;
}

function renderAppointments() {
    appointmentsBody.replaceChildren();

    const filter = statusFilter.value;

    const filtered = appointments.filter((appointment) => {
        return filter === "all" || appointment.status === filter;
    });

    if (filtered.length === 0) {
        const row = document.createElement("tr");
        const cell = createCell("Không có lịch hẹn phù hợp.");
        cell.colSpan = 8;
        row.appendChild(cell);
        appointmentsBody.appendChild(row);
        return;
    }

    filtered.forEach((appointment) => {
        const row = document.createElement("tr");

        row.appendChild(createCell(appointment.id));
        row.appendChild(createCell(appointment.full_name));
        row.appendChild(createCell(
            `${appointment.phone} | ${appointment.email}`
        ));
        row.appendChild(createCell(appointment.service_name));

        const date = String(appointment.appointment_date).slice(0, 10);
        row.appendChild(createCell(date));

        const start = String(appointment.start_time).slice(0, 5);
        const end = String(appointment.end_time).slice(0, 5);
        row.appendChild(createCell(`${start} - ${end}`));

        const statusCell = createCell(
            statusLabels[appointment.status] || appointment.status
        );
        statusCell.className = `status-${appointment.status}`;
        row.appendChild(statusCell);

        const actionCell = document.createElement("td");

        if (appointment.status === "pending") {
            const confirmButton = document.createElement("button");
            confirmButton.className = "button";
            confirmButton.textContent = "Xác nhận";
            confirmButton.addEventListener("click", () => {
                updateStatus(appointment.id, "confirmed");
            });

            const cancelButton = document.createElement("button");
            cancelButton.className = "button";
            cancelButton.textContent = "Hủy";
            cancelButton.addEventListener("click", () => {
                updateStatus(appointment.id, "cancelled");
            });

            actionCell.append(confirmButton, cancelButton);
        } else {
            actionCell.textContent = "Không có thao tác";
        }

        row.appendChild(actionCell);
        appointmentsBody.appendChild(row);
    });
}

async function loadAppointments() {
    adminMessage.textContent = "Đang tải danh sách lịch hẹn...";

    try {
        const response = await fetch("/api/appointments");
        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error(result.message || "Không thể tải lịch hẹn.");
        }

        appointments = result.data;
        renderAppointments();
        adminMessage.textContent = `Đã tải ${appointments.length} lịch hẹn.`;
    } catch (error) {
        adminMessage.textContent = error.message;
    }
}

async function updateStatus(id, status) {
    const action = status === "confirmed" ? "xác nhận" : "hủy";

    if (!confirm(`Bạn có chắc muốn ${action} lịch hẹn #${id}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/appointments/${id}/status`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ status })
        });

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error(result.message || "Cập nhật thất bại.");
        }

        adminMessage.textContent = result.message;
        await loadAppointments();
    } catch (error) {
        adminMessage.textContent = error.message;
    }
}

statusFilter.addEventListener("change", renderAppointments);
refreshButton.addEventListener("click", loadAppointments);

loadAppointments();
