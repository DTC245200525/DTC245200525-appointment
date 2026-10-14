# Appointment System

## 1. Giới thiệu

Appointment System là ứng dụng web hỗ trợ quản lý lịch hẹn dịch vụ. Dự án được xây dựng nhằm thực hành triển khai ứng dụng web, cơ sở dữ liệu, reverse proxy, giám sát hệ thống, thu thập log và các biện pháp bảo mật cơ bản bằng Docker.

## 2. Công nghệ sử dụng

- **Backend:** Node.js, Express.js
- **Frontend:** HTML, CSS, JavaScript
- **Database:** PostgreSQL
- **Database management:** pgAdmin
- **Containerization:** Docker, Docker Compose
- **Reverse proxy:** Nginx
- **Monitoring:** Prometheus, Grafana
- **Logging:** Loki, Promtail

## 3. Kiến trúc hệ thống

Hệ thống gồm các dịch vụ:

| Dịch vụ | Vai trò |
|---|---|
| Nginx | Tiếp nhận HTTP request và chuyển tiếp đến ứng dụng |
| Appointment App | Xử lý yêu cầu từ người dùng và cung cấp API |
| PostgreSQL | Lưu trữ dữ liệu lịch hẹn |
| pgAdmin | Quản trị cơ sở dữ liệu |
| Prometheus | Thu thập metrics từ ứng dụng |
| Grafana | Hiển thị dashboard giám sát |
| Loki | Lưu trữ và truy vấn log |
| Promtail | Thu thập log và gửi đến Loki |

Docker Compose được sử dụng để quản lý vòng đời các dịch vụ và cấu hình mạng giữa chúng.

## 4. Yêu cầu môi trường

Cài đặt các công cụ sau trước khi chạy dự án:

- Docker Desktop
- Docker Compose
- Git
- Trình duyệt web

## 5. Cài đặt và chạy dự án

### Bước 1: Tải mã nguồn

```bash
git clone <GITHUB_REPOSITORY_URL>
cd DTC245200525-appointment
```

Thay `<GITHUB_REPOSITORY_URL>` bằng URL repository GitHub thực tế.

### Bước 2: Cấu hình biến môi trường

Tạo file `.env` ở thư mục gốc dựa trên file `.env.example` nếu dự án có cung cấp.

Điền các thông tin kết nối PostgreSQL và tài khoản quản trị phù hợp với cấu hình trong `docker-compose.yml`.

**Không chia sẻ hoặc commit file `.env` chứa mật khẩu thật lên GitHub.**

### Bước 3: Khởi động hệ thống

```bash
docker compose up -d --build
```

### Bước 4: Kiểm tra trạng thái dịch vụ

```bash
docker compose ps
```

Xem log của toàn bộ dịch vụ:

```bash
docker compose logs --tail=100
```

Xem log riêng của ứng dụng:

```bash
docker compose logs --tail=100 app
```

## 6. Truy cập hệ thống

Các địa chỉ dưới đây áp dụng khi những cổng tương ứng được cấu hình công khai trên máy host trong `docker-compose.yml`.

| Thành phần | Địa chỉ |
|---|---|
| Ứng dụng qua Nginx | http://localhost |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3001 |
| pgAdmin | http://localhost:5050 |

Nếu một địa chỉ không truy cập được, hãy kiểm tra cấu hình `ports` của dịch vụ tương ứng.

## 7. API và kiểm tra chức năng

| Phương thức | Endpoint | Mục đích |
|---|---|---|
| GET | `/health` | Kiểm tra trạng thái ứng dụng |
| GET | `/api/db-test` | Kiểm tra kết nối PostgreSQL |
| GET | `/api/services` | Lấy danh sách dịch vụ |
| GET | `/api/appointments` | Lấy danh sách lịch hẹn |
| POST | `/api/appointments` | Tạo lịch hẹn |
| PATCH | `/api/appointments/:id/status` | Cập nhật trạng thái lịch hẹn |
| GET | `/metrics` | Cung cấp metrics cho Prometheus |

Ví dụ kiểm tra sức khỏe ứng dụng:

```bash
curl http://localhost/health
```

Kiểm tra kết nối cơ sở dữ liệu:

```bash
curl http://localhost/api/db-test
```

## 8. Giám sát bằng Prometheus và Grafana

Prometheus thu thập metrics từ endpoint `/metrics` của ứng dụng.

Các bước kiểm tra:

1. Truy cập Prometheus.
2. Mở mục **Status → Targets**.
3. Kiểm tra job `appointment` có trạng thái `UP`.
4. Truy cập Grafana và cấu hình datasource Prometheus nếu chưa có.
5. Mở dashboard để theo dõi các chỉ số đã cấu hình.

## 9. Thu thập và truy vấn log bằng Loki

Promtail đọc log ứng dụng và gửi dữ liệu đến Loki.

Một số truy vấn LogQL có thể sử dụng trong Grafana Explore:

Hiển thị toàn bộ log:

```logql
{job="appointment"}
```

Tìm log phản hồi HTTP 404:

```logql
{job="appointment"} |= " 404 "
```

Đếm số log HTTP 404 trong 5 phút gần nhất:

```logql
sum(count_over_time({job="appointment"} |= " 404 " [5m]))
```

Kết quả truy vấn phụ thuộc vào log thực tế đã được thu thập và nhãn được cấu hình trong Promtail.

## 10. Biện pháp bảo mật cơ bản

- Sử dụng biến môi trường để cấu hình thông tin kết nối cơ sở dữ liệu.
- Không đưa file `.env` chứa thông tin bí mật vào Git.
- Sử dụng Docker network để giới hạn kết nối giữa các dịch vụ.
- Chạy ứng dụng Node.js bằng tài khoản không phải root trong container.
- Sử dụng Nginx làm reverse proxy.
- Thiết lập các HTTP security headers.
- Giới hạn việc công khai các cổng quản trị và giám sát khi không cần thiết.

## 11. Dừng hệ thống

Dừng các container nhưng giữ nguyên dữ liệu trong named volume:

```bash
docker compose down
```

Khởi động lại:

```bash
docker compose up -d
```

Không sử dụng `docker compose down -v` nếu muốn giữ lại dữ liệu PostgreSQL.

## 12. Hướng phát triển

- Bổ sung kiểm thử tự động cho API.
- Bổ sung dashboard giám sát chi tiết hơn.
- Tích hợp metrics chuyên biệt cho PostgreSQL và tài nguyên container.
- Hoàn thiện HTTPS và kiểm tra bảo mật.
- Bổ sung tài liệu triển khai và ảnh chụp kết quả thực nghiệm.

## 13. Tác giả

- Họ tên: [Vũ Thanh Hải]
- Mã sinh viên: [DTC245200525]
- Môn học: Thiết kế và quản trị hệ thống phần mềm