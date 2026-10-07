# Web Project

## Chạy HTTPS local

Dự án này hỗ trợ chạy HTTPS để phát triển local. Tuy nhiên, vì lý do bảo mật, 
các file `server.key` và `server.crt` **không được push lên GitHub**. 
Bạn cần tự tạo certificate trên máy của mình.

### Tạo self-signed certificate với OpenSSL

1. Cài đặt [OpenSSL](https://www.openssl.org/) nếu chưa có.
2. Chạy lệnh sau trong thư mục dự án:

   ```bash
   openssl req -nodes -new -x509 -keyout server.key -out server.crt
