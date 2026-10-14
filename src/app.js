
require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const pool = require("./db");
const promClient = require("prom-client");

const app = express();
app.disable("x-powered-by");
const PORT = process.env.PORT || 3000;

// ==================== FILE LOGGING ====================

// Tạo thư mục logs nếu chưa tồn tại
const logDirectory = path.join(__dirname, "..", "logs");

if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

// Tạo file log và giữ lại nội dung cũ
const logStream = fs.createWriteStream(
    path.join(logDirectory, "app.log"),
    { flags: "a" }
);

// ==================== PROMETHEUS METRICS ====================

const register = new promClient.Registry();

promClient.collectDefaultMetrics({
    register
});

const httpRequestsTotal = new promClient.Counter({
    name: "appointment_http_requests_total",
    help: "Total HTTP requests to Appointment System",
    labelNames: ["method", "route", "status"]
});

register.registerMetric(httpRequestsTotal);

// ==================== MIDDLEWARE ====================

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Ghi các yêu cầu HTTP vào logs/app.log
app.use(morgan("combined", {
    stream: logStream,
    skip: (req) => req.path === "/metrics"
}));

app.use(express.static(path.join(__dirname, "../public")));

// Đếm số request HTTP, không tính endpoint /metrics
app.use((req, res, next) => {
    if (req.path === "/metrics") {
        return next();
    }

    res.on("finish", () => {
        httpRequestsTotal.inc({
            method: req.method,
            route: req.route?.path || req.path,
            status: String(res.statusCode)
        });
    });

    next();
});

// ==================== HEALTH CHECK ====================

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Appointment System is running"
    });
});

// ==================== DATABASE TEST ====================

app.get("/api/db-test", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT current_database() AS database_name"
        );

        res.json({
            status: "success",
            database: result.rows[0].database_name
        });
    } catch (error) {
        console.error("Database test error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Không thể kết nối database."
        });
    }
});

// ==================== GET SERVICES ====================

app.get("/api/services", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, description, duration_minutes, price
            FROM services
            WHERE is_active = TRUE
            ORDER BY id
        `);

        res.json({
            status: "success",
            data: result.rows
        });
    } catch (error) {
        console.error("Get services error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Không thể lấy danh sách dịch vụ."
        });
    }
});

// ==================== CREATE APPOINTMENT ====================

app.post("/api/appointments", async (req, res) => {
    const { fullName, phone, email, service, date, time } = req.body;

    if (
        !fullName?.trim() ||
        !phone?.trim() ||
        !email?.trim() ||
        !service ||
        !date ||
        !time
    ) {
        return res.status(400).json({
            status: "error",
            message: "Vui lòng điền đầy đủ thông tin."
        });
    }

    const serviceNames = {
        consultation: "Tư vấn",
        maintenance: "Bảo trì",
        other: "Dịch vụ khác"
    };

    const serviceName = serviceNames[service];

    if (!serviceName) {
        return res.status(400).json({
            status: "error",
            message: "Dịch vụ không hợp lệ."
        });
    }

    // Kiểm tra định dạng ngày và giờ
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
        return res.status(400).json({
            status: "error",
            message: "Ngày hoặc giờ hẹn không hợp lệ."
        });
    }

    const dateObject = new Date(`${date}T00:00:00Z`);

    if (
        Number.isNaN(dateObject.getTime()) ||
        dateObject.toISOString().slice(0, 10) !== date
    ) {
        return res.status(400).json({
            status: "error",
            message: "Ngày hẹn không hợp lệ."
        });
    }

    const appointmentDateTime = new Date(`${date}T${time}:00`);

    if (
        Number.isNaN(appointmentDateTime.getTime()) ||
        appointmentDateTime <= new Date()
    ) {
        return res.status(400).json({
            status: "error",
            message: "Vui lòng chọn thời gian trong tương lai."
        });
    }

    let dbClient;

    try {
        dbClient = await pool.connect();
        await dbClient.query("BEGIN");

        // Tìm dịch vụ và thời lượng
        const serviceResult = await dbClient.query(
            `SELECT id, duration_minutes
             FROM services
             WHERE name = $1 AND is_active = TRUE`,
            [serviceName]
        );

        if (serviceResult.rowCount === 0) {
            await dbClient.query("ROLLBACK");

            return res.status(400).json({
                status: "error",
                message: "Dịch vụ hiện không khả dụng."
            });
        }

        const selectedService = serviceResult.rows[0];
        const serviceId = selectedService.id;
        const duration = selectedService.duration_minutes;

        // Tính giờ kết thúc
        const totalMinutes =
            Number(time.slice(0, 2)) * 60 +
            Number(time.slice(3, 5)) +
            duration;

        if (totalMinutes > 24 * 60) {
            await dbClient.query("ROLLBACK");

            return res.status(400).json({
                status: "error",
                message: "Giờ kết thúc vượt quá ngày hẹn."
            });
        }

        const endTime =
            `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:` +
            `${String(totalMinutes % 60).padStart(2, "0")}`;

        // Kiểm tra lịch trùng giờ
        const conflictResult = await dbClient.query(
            `SELECT id
             FROM appointments
             WHERE appointment_date = $1
               AND status IN ('pending', 'confirmed')
               AND start_time < $3::time
               AND end_time > $2::time
             LIMIT 1`,
            [date, time, endTime]
        );

        if (conflictResult.rowCount > 0) {
            await dbClient.query("ROLLBACK");

            return res.status(409).json({
                status: "error",
                message:
                    "Khung giờ này đã có lịch hẹn. Vui lòng chọn giờ khác."
            });
        }

        // Lưu khách hàng
        const customerResult = await dbClient.query(
            `INSERT INTO customers (full_name, phone, email)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [fullName.trim(), phone.trim(), email.trim()]
        );

        const customerId = customerResult.rows[0].id;

        // Lưu lịch hẹn
        const appointmentResult = await dbClient.query(
            `INSERT INTO appointments
                (customer_id, service_id, appointment_date,
                 start_time, end_time, status)
             VALUES ($1, $2, $3, $4, $5, 'pending')
             RETURNING id, appointment_date, start_time, end_time, status`,
            [customerId, serviceId, date, time, endTime]
        );

        await dbClient.query("COMMIT");

        return res.status(201).json({
            status: "success",
            message: "Đặt lịch thành công! Yêu cầu đang chờ xác nhận.",
            appointment: appointmentResult.rows[0]
        });
    } catch (error) {
        if (dbClient) {
            try {
                await dbClient.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback error:", rollbackError.message);
            }
        }

        console.error("Appointment creation error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Không thể lưu lịch hẹn. Vui lòng thử lại."
        });
    } finally {
        if (dbClient) {
            dbClient.release();
        }
    }
});

// ==================== GET APPOINTMENTS ====================

app.get("/api/appointments", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                a.id,
                c.full_name,
                c.phone,
                c.email,
                s.name AS service_name,
                a.appointment_date,
                a.start_time,
                a.end_time,
                a.status,
                a.created_at
            FROM appointments a
            JOIN customers c ON a.customer_id = c.id
            JOIN services s ON a.service_id = s.id
            ORDER BY a.appointment_date DESC, a.start_time DESC
        `);

        res.json({
            status: "success",
            data: result.rows
        });
    } catch (error) {
        console.error("Get appointments error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Không thể lấy danh sách lịch hẹn."
        });
    }
});

// ==================== UPDATE APPOINTMENT STATUS ====================

app.patch("/api/appointments/:id/status", async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.body;

    if (!Number.isSafeInteger(id) || id <= 0) {
        return res.status(400).json({
            status: "error",
            message: "Mã lịch hẹn không hợp lệ."
        });
    }

    const allowedStatuses = [
        "confirmed",
        "cancelled",
        "completed"
    ];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            status: "error",
            message: "Trạng thái cập nhật không hợp lệ."
        });
    }

    try {
        const result = await pool.query(
            `UPDATE appointments
             SET status = $1
             WHERE id = $2
               AND status = 'pending'
             RETURNING id, status`,
            [status, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                status: "error",
                message: "Không tìm thấy lịch hẹn đang chờ xác nhận."
            });
        }

        res.json({
            status: "success",
            message: "Cập nhật trạng thái thành công.",
            appointment: result.rows[0]
        });
    } catch (error) {
        console.error("Update appointment error:", error.message);

        res.status(500).json({
            status: "error",
            message: "Không thể cập nhật trạng thái."
        });
    }
});

// ==================== PROMETHEUS METRICS ENDPOINT ====================

app.get("/metrics", async (req, res) => {
    try {
        res.set("Content-Type", register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        console.error("Metrics error:", error.message);
        res.status(500).send("Không thể lấy metrics.");
    }
});

// ==================== START SERVER ====================

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Appointment System running on port ${PORT}`);
});

// Đóng file log khi dừng ứng dụng
function shutdown() {
    server.close(() => {
        logStream.end(() => {
            pool.end().finally(() => process.exit(0));
        });
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
