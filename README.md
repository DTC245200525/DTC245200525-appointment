# Appointment System

## 1. Giới thiệu

**Appointment System** là ứng dụng web quản lý lịch hẹn, được xây dựng cho **Đề tài số 40 - Hệ thống Đặt lịch hẹn / Appointment** của môn **Triển khai và Quản trị Hệ thống Phần mềm**.

Hệ thống được triển khai bằng Docker Compose, sử dụng Node.js và Express.js cho ứng dụng web, PostgreSQL làm cơ sở dữ liệu, Nginx làm reverse proxy, Prometheus và Grafana để giám sát, Loki và Promtail để thu thập log.

Mục tiêu của dự án là xây dựng một hệ thống hoàn chỉnh gồm ứng dụng, cơ sở dữ liệu, reverse proxy, monitoring, logging và các biện pháp hardening cơ bản.

---

## 2. Công nghệ sử dụng

- **Backend:** Node.js, Express.js
- **Frontend:** HTML, CSS, JavaScript
- **Database:** PostgreSQL 17
- **Database Management:** pgAdmin
- **Containerization:** Docker, Docker Compose
- **Reverse Proxy:** Nginx
- **Monitoring:** Prometheus, Grafana
- **PostgreSQL Monitoring:** PostgreSQL Exporter
- **Container Monitoring:** cAdvisor
- **Logging:** Loki, Promtail
- **Metrics ứng dụng:** prom-client
- **HTTP Logging:** Morgan
- **Version Control:** Git, GitHub

---

## 3. Kiến trúc hệ thống

Luồng truy cập chính:

```text
Người dùng
    |
    v
 Nginx :80
    |
    v
Node.js / Express :3000
    |
    v
PostgreSQL :5432
```

Hệ thống monitoring:

```text
Node.js /metrics -----------\
PostgreSQL Exporter ---------> Prometheus -----> Grafana
cAdvisor -------------------/
```

Hệ thống logging:

```text
Node.js
  |
  v
logs/app.log
  |
  v
Promtail
  |
  v
Loki
  |
  v
Grafana Explore
```

---

## 4. Các dịch vụ Docker

Hệ thống gồm 10 dịch vụ Docker Compose:

| Dịch vụ | Vai trò |
|---|---|
| `postgres` | Cơ sở dữ liệu PostgreSQL |
| `pgadmin` | Công cụ quản trị PostgreSQL |
| `app` | Ứng dụng Appointment System |
| `nginx` | Reverse proxy |
| `prometheus` | Thu thập và lưu metrics |
| `grafana` | Dashboard giám sát |
| `loki` | Lưu trữ log tập trung |
| `promtail` | Thu thập log ứng dụng |
| `postgres-exporter` | Xuất metrics PostgreSQL |
| `cadvisor` | Thu thập metrics container/cgroup |

---

## 5. Network

Docker Compose sử dụng ba network:

### `frontend`

Dùng cho:

- Nginx
- Appointment App
- pgAdmin

pgAdmin tham gia cả `backend` và `frontend`: `backend` dùng để kết nối PostgreSQL, còn `frontend` cho phép Docker Desktop publish giao diện pgAdmin ra `127.0.0.1:5050`. Cổng pgAdmin chỉ bind vào localhost.

### `backend`

Dùng cho:

- PostgreSQL
- Appointment App
- pgAdmin
- PostgreSQL Exporter

Network `backend` được cấu hình:

```yaml
internal: true
```

nhằm hạn chế truy cập trực tiếp từ bên ngoài Docker network.

### `monitoring`

Dùng cho:

- Appointment App
- Prometheus
- Grafana
- Loki
- Promtail
- PostgreSQL Exporter
- cAdvisor

---

## 6. Cổng dịch vụ

| Thành phần | Địa chỉ truy cập |
|---|---|
| Website qua Nginx | `http://localhost` |
| PostgreSQL | `127.0.0.1:5432` |
| pgAdmin | `http://127.0.0.1:5050` |
| Prometheus | `http://127.0.0.1:9090` |
| Grafana | `http://127.0.0.1:3001` |
| Loki | `127.0.0.1:3100` |
| Appointment App | Port `3000` nội bộ Docker |
| PostgreSQL Exporter | Port `9187` nội bộ Docker |
| cAdvisor | Port `8080` nội bộ Docker |

Ứng dụng Node.js không được publish trực tiếp ra host. Người dùng truy cập ứng dụng thông qua Nginx.

---

## 7. Cấu hình môi trường

Dự án sử dụng file `.env` để lưu các giá trị cấu hình và thông tin nhạy cảm.

Ví dụ:

```env
POSTGRES_DB=appointment_db
POSTGRES_USER=your_database_user
POSTGRES_PASSWORD=your_strong_password
```

Không sử dụng mật khẩu ví dụ trên cho môi trường thực tế.

File `.env` đã được thêm vào `.gitignore` và **không được commit lên GitHub**.

Các file backup cục bộ dạng:

```text
*.backup.yml
```

cũng được bỏ qua bởi Git.

---

## 8. Khởi động hệ thống

Mở PowerShell tại thư mục dự án:

```powershell
cd C:\Users\admin\DTC245200525-appointment
```

Kiểm tra cấu hình Docker Compose:

```powershell
docker compose config --quiet
```

Khởi động hệ thống:

```powershell
docker compose up -d
```

Nếu cần build lại ứng dụng sau khi thay đổi source:

```powershell
docker compose up -d --build
```

Kiểm tra trạng thái:

```powershell
docker compose ps
```

Không sử dụng:

```text
docker compose down -v
```

vì tùy chọn `-v` có thể xóa Docker volume chứa dữ liệu PostgreSQL.

---

## 9. API của Appointment System

Các endpoint hiện có:

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/health` | Kiểm tra trạng thái ứng dụng |
| GET | `/api/db-test` | Kiểm tra kết nối PostgreSQL |
| GET | `/api/services` | Lấy danh sách dịch vụ |
| GET | `/api/appointments` | Lấy danh sách lịch hẹn |
| POST | `/api/appointments` | Tạo lịch hẹn |
| PATCH | `/api/appointments/:id/status` | Cập nhật trạng thái lịch hẹn |
| GET | `/metrics` | Metrics dành cho Prometheus |

Ví dụ kiểm tra bằng PowerShell:

```powershell
curl.exe -i http://localhost/health
```

```powershell
curl.exe -i http://localhost/api/db-test
```

```powershell
curl.exe -i http://localhost/api/services
```

---

## 10. PostgreSQL và pgAdmin

Database ứng dụng:

```text
appointment_db
```

PostgreSQL sử dụng Docker volume:

```text
postgres_data
```

Volume này chứa dữ liệu cần được bảo vệ và không được xóa tùy tiện.

pgAdmin có thể truy cập tại:

```text
http://127.0.0.1:5050
```

PostgreSQL chỉ được ánh xạ vào localhost:

```text
127.0.0.1:5432
```

---

## 11. Nginx Reverse Proxy

Nginx nhận HTTP request tại port `80` và chuyển tiếp đến ứng dụng:

```nginx
proxy_pass http://app:3000;
```

Các security header được cấu hình:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Nginx cũng được cấu hình:

```nginx
server_tokens off;
```

để không hiển thị phiên bản Nginx trong response header.

Để tránh header `X-Content-Type-Options` bị lặp khi Express trả về trang lỗi, Nginx sử dụng:

```nginx
proxy_hide_header X-Content-Type-Options;
```

Sau đó Nginx tự thêm một header `X-Content-Type-Options: nosniff` thống nhất cho response.

Kiểm tra cấu hình:

```powershell
docker compose exec nginx nginx -t
```

Reload cấu hình:

```powershell
docker compose exec nginx nginx -s reload
```

---

## 12. Prometheus

Prometheus thu thập dữ liệu từ ba target:

### Appointment App

```text
app:3000/metrics
```

### PostgreSQL Exporter

```text
postgres-exporter:9187
```

### cAdvisor

```text
cadvisor:8080
```

Prometheus có thể truy cập tại:

```text
http://127.0.0.1:9090
```

Một số PromQL sử dụng trong hệ thống:

### Trạng thái PostgreSQL

```promql
pg_up
```

### Tổng số kết nối tới database ứng dụng

```promql
sum(pg_stat_activity_count{datname="appointment_db"})
```

### Tốc độ transaction commit

```promql
rate(pg_stat_database_xact_commit{datname="appointment_db"}[5m])
```

### CPU cgroup/container

```promql
rate(container_cpu_usage_seconds_total[5m]) * 100
```

### Memory cgroup/container

```promql
container_memory_working_set_bytes / 1024 / 1024
```

---

## 13. Grafana

Grafana truy cập tại:

```text
http://127.0.0.1:3001
```

Dashboard:

```text
Appointment System Monitoring
```

Dashboard hiện gồm các panel:

- HTTP Requests
- CPU Usage
- Memory Usage
- HTTP 404 Errors
- PostgreSQL Connections
- PostgreSQL Up
- PostgreSQL Transaction Rate

Panel PostgreSQL Transaction Rate sử dụng:

```promql
rate(pg_stat_database_xact_commit{datname="appointment_db"}[5m])
```

và hiển thị đơn vị `ops/s`.

---

## 14. Loki và Promtail

Ứng dụng ghi HTTP log vào:

```text
logs/app.log
```

Promtail đọc log này và gửi tới Loki.

Loki được cấu hình nhận log tại:

```text
http://loki:3100/loki/api/v1/push
```

Có thể sử dụng Grafana Explore để truy vấn log.

### Xem toàn bộ log ứng dụng

```logql
{job="appointment"}
```

### Lọc riêng HTTP 404

```logql
{job="appointment"} |= " 404 "
```

### Đếm lỗi HTTP 404 trong cửa sổ 5 phút

```logql
sum(count_over_time({job="appointment"} |= " 404 " [5m]))
```

Các truy vấn trên đã được sử dụng để kiểm tra dữ liệu log thực tế của ứng dụng.

---

## 15. Hardening và bảo mật

Dự án áp dụng các biện pháp hardening sau:

### 15.1. Ứng dụng chạy bằng non-root user

Dockerfile sử dụng:

```dockerfile
USER node
```

User bên trong container ứng dụng có UID/GID:

```text
uid=1000(node) gid=1000(node)
```

### 15.2. Không commit thông tin bí mật

File:

```text
.env
```

được bỏ qua bởi `.gitignore`.

Thông tin bí mật không được ghi trực tiếp vào repository.

### 15.3. Network isolation

Network:

```text
backend
```

được cấu hình:

```yaml
internal: true
```

PostgreSQL chỉ tham gia backend network.

### 15.4. Hạn chế port công khai

PostgreSQL và các công cụ quản trị/monitoring được bind vào localhost khi cần truy cập từ host.

Ứng dụng Node.js không publish trực tiếp port `3000` ra máy host.

### 15.5. Nginx security headers

Nginx sử dụng các security header:

- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`

Đồng thời sử dụng:

```nginx
server_tokens off;
```

### 15.6. Tắt Express X-Powered-By

Ứng dụng sử dụng:

```javascript
app.disable("x-powered-by");
```

để hạn chế lộ thông tin framework.

---

## 16. Kiểm tra hệ thống

Kiểm tra container:

```powershell
docker compose ps
```

Kiểm tra ứng dụng:

```powershell
curl.exe -i http://localhost/health
```

Kiểm tra API dịch vụ:

```powershell
curl.exe -i http://localhost/api/services
```

Tạo request 404 để kiểm tra logging:

```powershell
curl.exe -i http://localhost/duong-dan-khong-ton-tai
```

Kiểm tra Nginx:

```powershell
docker compose exec nginx nginx -t
```

Kiểm tra Prometheus configuration:

```powershell
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
```

---

## 17. Hạn chế đã biết

Dự án được triển khai bằng Docker Desktop trên Windows.

Trong môi trường Docker Desktop Windows, metrics do cAdvisor cung cấp có thể đại diện cho các cgroup như:

```text
/
 /docker
 /docker/buildkit
 /restricted
```

thay vì luôn cung cấp nhãn nhận diện rõ từng container.

Vì vậy, các panel CPU và Memory cần được hiểu là metrics container/cgroup và không được mặc định coi là CPU/RAM riêng của Appointment App khi chưa xác minh được label tương ứng.

cAdvisor hiện cần một số mount hệ thống và quyền:

```yaml
privileged: true
```

để thu thập metrics trong môi trường hiện tại. Đây là quyền cao và là một điểm cần cân nhắc nếu triển khai trong môi trường production.

---

## 18. Quản lý mã nguồn

Repository:

```text
https://github.com/DTC245200525/DTC245200525-appointment.git
```

Branch chính:

```text
master
```

Một số commit có ý nghĩa trong quá trình phát triển:

```text
Initial commit: build Appointment System infrastructure
Add PostgreSQL and container monitoring
Harden Nginx response headers
Ignore local backup configuration files
```

Trước khi commit:

```powershell
git status
git diff
```

Sau khi xác minh thay đổi:

```powershell
git add <file>
git commit -m "Mô tả thay đổi thực tế"
git push origin master
```

---

## 19. Lưu ý về dữ liệu

Không xóa Docker volume PostgreSQL nếu chưa sao lưu.

Đặc biệt không sử dụng:

```powershell
docker compose down -v
```

khi muốn giữ dữ liệu database.

Volume quan trọng:

```text
postgres_data
```

---

## 20. Thông tin sinh viên

- **Họ và tên:** Vũ Thanh Hải
- **Mã sinh viên:** DTC245200525
- **Đề tài:** Đề 40 - Hệ thống Đặt lịch hẹn / Appointment
- **Môn học:** Triển khai và Quản trị Hệ thống Phần mềm