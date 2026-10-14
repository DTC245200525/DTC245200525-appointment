
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    service_id INTEGER NOT NULL REFERENCES services(id),
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_appointments_date
    ON appointments (appointment_date);

CREATE INDEX IF NOT EXISTS idx_appointments_customer
    ON appointments (customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_service
    ON appointments (service_id);

INSERT INTO services (name, description, duration_minutes, price)
VALUES
    ('Tư vấn', 'Dịch vụ tư vấn khách hàng', 30, 100000),
    ('Bảo trì', 'Dịch vụ kiểm tra và bảo trì', 60, 200000),
    ('Dịch vụ khác', 'Các dịch vụ theo yêu cầu', 45, 150000)
ON CONFLICT DO NOTHING;
