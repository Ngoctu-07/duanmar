import type { BookingConfirmationPayload } from "@/lib/email/email-types";
import type { PaymentMethod } from "@/lib/payment";

/** Escape user-supplied text before it enters the HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** ISO `YYYY-MM-DD` → `DD/MM/YYYY` (travel-date display contract). */
export function formatTravelDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return isoDate;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

function formatAmount(amount: number, currency: "VND" | "USD"): string {
  const locale = currency === "VND" ? "vi-VN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "VND" ? 0 : 2,
  }).format(amount);
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  momo: "MoMo E-wallet / Ví MoMo",
  bank: "Bank Transfer / Chuyển khoản ngân hàng",
};

/**
 * Bilingual (EN + VI stacked) subject per spec:
 * `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - [Booking_ID]`
 */
export function buildConfirmationSubject(reference: string): string {
  return `[DuanMar] Tour Booking Confirmation / Thông Tin Đặt Tour - ${reference}`;
}

export const EMAIL_FOOTER_DISCLAIMER_EN =
  "Please double-check all details. If you notice any discrepancies, please inform our support team within 24 hours.";
export const EMAIL_FOOTER_DISCLAIMER_VI =
  "Quý khách vui lòng kiểm tra lại thông tin, nếu có sai sót xin báo ngay cho chúng tôi trong vòng 24 giờ.";
export const EMAIL_CLOSING_EN =
  "Wishing you a wonderful trip and memorable experience!";
export const EMAIL_CLOSING_VI =
  "Chúc quý khách có một chuyến đi thật vui vẻ và trải nghiệm tuyệt vời!";
export const EMAIL_SIGN_OFF = "DuanMar Travel Team";

interface DataRow {
  labelEn: string;
  labelVi: string;
  value: string;
}

function buildDataRows(payload: BookingConfirmationPayload): DataRow[] {
  const notes = payload.notes.trim();
  return [
    { labelEn: "Full Name", labelVi: "Họ và tên", value: payload.fullName },
    { labelEn: "Email", labelVi: "Email", value: payload.email },
    { labelEn: "Phone", labelVi: "Số điện thoại", value: payload.phone },
    {
      labelEn: "Travel Date",
      labelVi: "Ngày khởi hành",
      value: formatTravelDate(payload.travelDate),
    },
    { labelEn: "Guests", labelVi: "Số lượng khách", value: `${payload.guests}` },
    {
      labelEn: "Total Amount",
      labelVi: "Tổng thanh toán",
      value: formatAmount(payload.total, payload.currency),
    },
    {
      labelEn: "Payment Method",
      labelVi: "Phương thức thanh toán",
      value: PAYMENT_METHOD_LABELS[payload.paymentMethod],
    },
    {
      labelEn: "Notes",
      labelVi: "Yêu cầu đặc biệt",
      value: notes.length > 0 ? notes : "None / Không có",
    },
  ];
}

function renderDataRow(row: DataRow): string {
  return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;width:42%;vertical-align:top;">
            <div style="font-size:13px;font-weight:600;color:#111827;">${escapeHtml(row.labelEn)}</div>
            <div style="font-size:12px;color:#6b7280;">${escapeHtml(row.labelVi)}</div>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;vertical-align:top;font-size:14px;color:#111827;">
            ${escapeHtml(row.value)}
          </td>
        </tr>`;
}

/**
 * Responsive, inline-style-only bilingual confirmation email (email-client
 * safe: tables, no external CSS). All dynamic values are HTML-escaped.
 */
export function renderConfirmationEmail(
  payload: BookingConfirmationPayload
): { subject: string; html: string } {
  const subject = buildConfirmationSubject(payload.reference);
  const rows = buildDataRows(payload).map(renderDataRow).join("");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:#166534;padding:24px 32px;">
              <div style="font-size:22px;font-weight:bold;color:#ffffff;">DuanMar</div>
              <div style="font-size:12px;color:#bbf7d0;margin-top:4px;">Tour Booking Confirmation / Xác nhận đặt tour</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <div style="font-size:16px;color:#111827;font-weight:bold;">${escapeHtml(payload.fullName)},</div>
              <p style="font-size:14px;color:#374151;line-height:1.6;margin:12px 0 4px;">
                Thank you for booking with DuanMar. Your reservation details are below.
              </p>
              <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 20px;">
                Cảm ơn quý khách đã đặt tour cùng DuanMar. Thông tin đặt chỗ của quý khách như sau.
              </p>
              <div style="font-size:13px;color:#6b7280;margin-bottom:6px;">
                Booking ID / Mã đặt chỗ: <strong style="color:#111827;">${escapeHtml(payload.reference)}</strong>
              </div>
              <div style="font-size:13px;color:#6b7280;margin-bottom:16px;">
                Tour: <strong style="color:#111827;">${escapeHtml(payload.tourName)}</strong>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
              </table>
              <div style="margin-top:24px;padding:16px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;">
                <div style="font-size:13px;color:#92400e;line-height:1.6;">${escapeHtml(EMAIL_FOOTER_DISCLAIMER_EN)}</div>
                <div style="font-size:13px;color:#92400e;line-height:1.6;margin-top:8px;">${escapeHtml(EMAIL_FOOTER_DISCLAIMER_VI)}</div>
              </div>
              <div style="margin-top:24px;">
                <div style="font-size:14px;color:#111827;line-height:1.6;">${escapeHtml(EMAIL_CLOSING_EN)}</div>
                <div style="font-size:14px;color:#111827;line-height:1.6;margin-top:6px;">${escapeHtml(EMAIL_CLOSING_VI)}</div>
                <div style="font-size:14px;font-weight:bold;color:#166534;margin-top:16px;">${escapeHtml(EMAIL_SIGN_OFF)}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <div style="font-size:12px;color:#6b7280;">© 2026 DuanMar. All rights reserved. / Bảo lưu mọi quyền.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
