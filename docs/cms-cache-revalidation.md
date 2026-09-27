# CMS Cache Revalidation (Sanity → Web)

Cách dữ liệu CMS (giá tour, destination, homepage, tin tức) tới UI **không cần redeploy**.

## Kiến trúc (3 lớp)

1. **Origin reads** — `src/sanity/lib/client.ts` dùng `useCdn: false`: mọi đọc lấy thẳng
   Content Lake (không qua CDN edge stale).
2. **Tagged cache** — mọi fetch CMS đi qua `fetchPublished`
   (`src/sanity/lib/fetch-published.ts`): `unstable_cache` với tag toàn cục `sanity`
   + tag chi tiết (`sanity:destination:<slug>`, `sanity:pricing:<slug>`, `sanity:news`...).
3. **Webhook invalidation** — Sanity gọi `POST /api/revalidate` khi publish → verify HMAC
   → `revalidateTag("sanity", "max")` + `revalidatePath("/", "layout")`.
   Fallback nếu webhook lỗi: mọi cache entry tự hết hạn sau 300 s (`unstable_cache
   revalidate: 300`) + trang chi tiết destination (SSG) còn `export const revalidate = 300`
   → dữ liệu tối đa ~5 phút tự làm mới, không bao giờ đóng băng tới lần redeploy.

## Cấu hình (1 lần)

1. Sinh secret:
   ```bash
   openssl rand -hex 32
   ```
2. Thêm vào `.env.local` (server, không commit):
   ```
   SANITY_REVALIDATE_SECRET=<value>
   ```
3. Tạo webhook ở **Sanity Manage** → Project → API → Webhooks → **Create**:
   - **URL**: `https://<public-origin>/api/revalidate` (dev: `http://localhost:3000/api/revalidate`)
   - **Trigger**: Create · Update · Delete
   - **Dataset**: `production`
   - **Filter** (chỉ bản đã publish): `!(_id in path("drafts.**"))`
   - **Content type**: `application/json`
   - **Secret**: cùng giá trị `SANITY_REVALIDATE_SECRET`
4. Restart server sau khi đổi env.

## Smoke test (curl)

```bash
# Thiếu/không đúng chữ ký → 401
curl -i -X POST http://localhost:3000/api/revalidate -d '{}'

# Đúng chữ ký → 200 {"revalidated":true,...}
# Ký theo chuẩn Sanity: header t=<ms>,v1=<base64url(HMAC-SHA256(secret, `${t}.${body}`))>
```

Trạng thái: **405** (GET) · **503** (thiếu env) · **401** (sai chữ ký / body hỏng) ·
**500** (lỗi purge — xem log) · **200** (đã invalidate).

## Troubleshooting

| Triệu chứng | Nguyên nhân |
|---|---|
| 503 | Chưa set `SANITY_REVALIDATE_SECRET` / chưa restart |
| 401 | Secret ở webhook ≠ secret ở `.env.local` |
| Vẫn stale sau 200 | Xem lại `useCdn: false` · webhook tạo đúng dataset/filter · đang xem output build cũ (`.next` cần build lại) |
| Publish chưa hiện (dev) | Content Lake eventual consistency — `parseBody` đã chờ sẵn 3 giây |

## Lưu ý

- `SANITY_API_READ_TOKEN` không đổi (chỉ dùng cho draft mode).
- Chưa có Studio login/write token trong CI → test chỉ kiểm **cơ chế** (ký hợp lệ/sai),
  việc publish do người dùng thao tác ở Studio rồi kiểm tra bằng mắt.
