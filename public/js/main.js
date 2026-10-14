
const bookingForm = document.getElementById("booking-form");
const message = document.getElementById("message");
const dateInput = document.getElementById("date");
const serviceSelect = document.getElementById("service");
const submitButton = bookingForm.querySelector('button[type="submit"]');

// Không cho chọn ngày trong quá khứ
function setMinimumDate() {
    const today = new Date();

    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    dateInput.min = localToday;
}

setMinimumDate();

// Lấy danh sách dịch vụ từ PostgreSQL
async function loadServices() {
    try {
        const response = await fetch("/api/services");
        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error("Không thể tải danh sách dịch vụ.");
        }

        serviceSelect.replaceChildren(
            new Option("-- Chọn dịch vụ --", "")
        );

        const serviceValues = {
            "Tư vấn": "consultation",
            "Bảo trì": "maintenance",
            "Dịch vụ khác": "other"
        };

        result.data.forEach((service) => {
            const value = serviceValues[service.name];

            if (!value) return;

            const option = new Option(
                `${service.name} - ${Number(service.price).toLocaleString("vi-VN")} VNĐ`,
                value
            );

            serviceSelect.add(option);
        });
    } catch (error) {
        console.error(error);
        message.textContent =
            "Không tải được danh sách dịch vụ. Vui lòng tải lại trang.";
    }
}

loadServices();

// Gửi thông tin đặt lịch đến backend
bookingForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!bookingForm.reportValidity()) {
        return;
    }

    const bookingData = {
        fullName: document.getElementById("fullName").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        email: document.getElementById("email").value.trim(),
        service: serviceSelect.value,
        date: dateInput.value,
        time: document.getElementById("time").value
    };

    message.textContent = "Đang gửi yêu cầu đặt lịch...";
    submitButton.disabled = true;

    try {
        const response = await fetch("/api/appointments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error(
                result.message || "Không thể đặt lịch."
            );
        }

        message.textContent =
            `${result.message} Mã lịch hẹn: ${result.appointment.id}.`;

        bookingForm.reset();
        setMinimumDate();
    } catch (error) {
        message.textContent = error.message ||
            "Có lỗi xảy ra. Vui lòng thử lại.";

        console.error("Lỗi gửi lịch hẹn:", error);
    } finally {
        submitButton.disabled = false;
    }
});
