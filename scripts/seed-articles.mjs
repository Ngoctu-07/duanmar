#!/usr/bin/env node
/**
 * Seed the 4 purged legacy mock stories as real CMS `article` docs
 * (plan 260929-2151 — mock stories removed from i18n messages, homepage
 * + blog now serve live articles only).
 *
 * Dry-run by default (no token needed). Writes only with --apply + a write token.
 * Idempotent: slugs that already exist in the dataset are skipped.
 *
 * Usage:
 *   node scripts/seed-articles.mjs
 *   node scripts/seed-articles.mjs --apply
 *   SANITY_WRITE_TOKEN=... node scripts/seed-articles.mjs --apply
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const API_VERSION = "2026-09-25";
const ARTICLES = [
  {
    "slug": "record-arrivals-2026",
    "title_en": "Vietnam welcomes record international arrivals in the first half of 2026",
    "title_vi": "Việt Nam đón kỷ lục khách quốc tế nửa đầu 2026",
    "excerpt_en": "Visitor numbers climb as new air routes and a simplified e-visa process make Vietnam easier to reach than ever.",
    "excerpt_vi": "Số lượt khách tăng mạnh nhờ đường bay mới và quy trình e-visa tinh gọn, đưa Việt Nam đến gần hơn bao giờ hết.",
    "content_en": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "International arrivals reached a new high in the first six months of 2026, driven by additional direct flights from Northeast Asia and Europe and continued growth in regional connectivity.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "The national tourism organisation credited a simplified e-visa process and year-round events programming for the uptick, with heritage destinations such as Ha Long Bay, Hoi An and Hue leading demand.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Authorities said the focus for the rest of the year would be sustainable visitor management at popular sites and support for community-based tourism projects in the highlands.",
            "marks": []
          }
        ]
      }
    ],
    "content_vi": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Lượt khách quốc tế đạt mức cao mới trong sáu tháng đầu năm 2026, nhờ các đường bay thẳng tăng cường từ Đông Bắc Á và châu Âu cùng tăng trưởng kết nối trong khu vực.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Tổ chức du lịch quốc gia cho rằng quy trình e-visa đơn giản hóa và chuỗi sự kiện quanh năm là động lực chính, với các điểm di sản như Hạ Long, Hội An và Huế dẫn đầu nhu cầu.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Cơ quan chức năng cho biết phần còn lại của năm sẽ tập trung quản lý du lịch bền vững tại các điểm đông khách và hỗ trợ dự án du lịch cộng đồng ở vùng cao.",
            "marks": []
          }
        ]
      }
    ],
    "publishedAt": "2026-08-28"
  },
  {
    "slug": "hanoi-street-food-48h",
    "title_en": "48 hours in Hanoi: a street-food love letter",
    "title_vi": "48 giờ ở Hà Nội: bức thư tình gửi ẩm thực đường phố",
    "excerpt_en": "Two days, one neighbourhood at a time — where to eat pho, bun cha and egg coffee in the capital's Old Quarter.",
    "excerpt_vi": "Hai ngày, mỗi khu phố một nhịp — chỗ ăn phở, bún chả và cà phê trứng ở Phố Cổ.",
    "content_en": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Start early at a sidewalk pho stall where the broth has been simmering since before dawn, then walk it off around Hoan Kiem Lake while the city wakes up.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Lunch means bun cha over charcoal in the Old Quarter, followed by an egg coffee in a hidden courtyard cafe — sweet, strong and perfectly suited to a humid afternoon.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Dinner belongs to the grills of Ta Hien street, where plastic stools spill onto the pavement and cold beer flows. Leave room for a late banh mi from a cart near the train tracks.",
            "marks": []
          }
        ]
      }
    ],
    "content_vi": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Bắt đầu sớm tại quán phở vỉa hè nơi nước dùng đã ninh từ trước bình minh, rồi đi bộ quanh hồ Hoàn Kiếm trong lúc thành phố thức dậy.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Bữa trưa là bún chả nướng than giữa Phố Cổ, theo sau là cà phê trứng trong khuôn viên cafe khuất — ngọt, đậm và hợp với buổi chiều nắng nóng.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Bữa tối thuộc về các quán nướng phố Tạ Hiện, nơi ghế nhựa tràn ra vỉa hè và bia lạnh tuôn chảy. Dành chỗ cho bánh mì khuya từ xe hàng gần đường ray.",
            "marks": []
          }
        ]
      }
    ],
    "publishedAt": "2026-08-15"
  },
  {
    "slug": "hue-festival-programme",
    "title_en": "Hue Festival announces its full programme",
    "title_vi": "Festival Huế công bố chương trình đầy đủ",
    "excerpt_en": "Performances, parades and light shows will fill the Imperial City during the biennial arts festival.",
    "excerpt_vi": "Biểu diễn, diễu hành và trình diễn ánh sáng phủ kín Kinh thành trong lễ hội nghệ thuật hai năm một lần.",
    "content_en": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "The festival's organisers revealed a programme of more than 60 events spanning music, theatre, visual arts and heritage talks, staged across the Imperial City and the Perfume River.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Highlights include night-time illuminations of the citadel gates, a royal court music revival and an international arts exchange featuring troupes from across Asia and Europe.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Tickets and detailed schedules will be published on the official festival channels, with many courtyard performances free to attend.",
            "marks": []
          }
        ]
      }
    ],
    "content_vi": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Ban tổ chức công bố hơn 60 sự kiện trải âm nhạc, sân khấu, mỹ thuật và tọa đàm di sản, tại Kinh thành và dọc sông Hương.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Điểm nhấn gồm chiếu sáng đêm cổng hoàng thành, tái hiện nhạc cung đình và giao lưu nghệ thuật quốc tế với các đoàn từ châu Á và châu Âu.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Vé và lịch chi tiết sẽ được công bố trên các kênh chính thức, nhiều tiết mục sân trong miễn phí tham dự.",
            "marks": []
          }
        ]
      }
    ],
    "publishedAt": "2026-08-02"
  },
  {
    "slug": "fansipan-sunrise-trek",
    "title_en": "Sunrise trek at Fansipan: a beginner's guide",
    "title_vi": "Chinh phục Fansipan đón bình minh: cẩm nang cho người mới",
    "excerpt_en": "What it actually takes to reach the Roof of Indochina — training, guides and the trail up from Sa Pa.",
    "excerpt_vi": "Cần gì để chạm đỉnh Nóc nhà Đông Dương — thể lực, hướng dẫn viên và cung đường lên từ Sa Pa.",
    "content_en": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Fansipan at 3,143 metres is achievable for reasonably fit hikers, but the mountain deserves respect: steep sections, changing weather and altitude all add up.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Most treks start from Sa Pa with a local guide, camping overnight at one of the high stations before a pre-dawn push to the summit for sunrise above the cloud line.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Pack layers, rain gear and plenty of water; hire warm gear in Sa Pa if you are travelling light, and allow a rest day afterwards to explore the town's markets and waterfalls.",
            "marks": []
          }
        ]
      }
    ],
    "content_vi": [
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Fansipan cao 3.143 m trong tầm với của người đi bộ khỏe mạnh, nhưng ngọn núi đòi hỏi sự tôn trọng: đoạn dốc, thời tiết thay đổi và độ cao cộng dồn.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Hầu hết tour khởi hành từ Sa Pa có hướng dẫn viên địa phương, cắm trại qua đêm ở trạm cao rồi xuất phát trước rạng đông để đón bình minh trên tầng mây.",
            "marks": []
          }
        ]
      },
      {
        "_type": "block",
        "style": "normal",
        "children": [
          {
            "_type": "span",
            "text": "Chuẩn bị áo lớp, đồ chống mưa và nhiều nước; thuê đồ ấm tại Sa Pa nếu hành lý nhẹ, và dành ngày nghỉ sau đó để khám phá chợ bản và thác.",
            "marks": []
          }
        ]
      }
    ],
    "publishedAt": "2026-07-20"
  }
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function envValue(key) {
  if (process.env[key]) return process.env[key];
  const file = fileURLToPath(new URL("../.env.local", import.meta.url));
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : undefined;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const projectId = envValue("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = envValue("NEXT_PUBLIC_SANITY_DATASET") || "production";
  if (!projectId) fail("NEXT_PUBLIC_SANITY_PROJECT_ID missing (env or .env.local)");
  const base = `https://${projectId}.api.sanity.io/v${API_VERSION}`;

  const query = `*[_type == "article"]{ "slug": slug.current }`;
  const res = await fetch(
    `${base}/data/query/${dataset}?query=${encodeURIComponent(query)}`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) fail(`query failed: HTTP ${res.status} ${await res.text()}`);
  const existing = new Set(((await res.json()).result ?? []).map((r) => r.slug).filter(Boolean));

  const mutations = [];
  let pending = 0;
  console.log(`dataset=${dataset} existing=${existing.size} mode=${apply ? "APPLY" : "dry-run"}`);
  for (const a of ARTICLES) {
    if (existing.has(a.slug)) {
      console.log(`  ok       ${a.slug} exists`);
      continue;
    }
    pending += 1;
    console.log(`  ${apply ? "create" : "PENDING"} article-${a.slug} "${a.title_en}" (${a.publishedAt})`);
    mutations.push({
      create: {
        _id: `article-${a.slug}`,
        _type: "article",
        title_en: a.title_en,
        title_vi: a.title_vi,
        excerpt_en: a.excerpt_en,
        excerpt_vi: a.excerpt_vi,
        content_en: a.content_en,
        content_vi: a.content_vi,
        slug: { _type: "slug", current: a.slug },
        publishedAt: a.publishedAt,
      },
    });
  }

  if (pending === 0) {
    console.log("nothing to seed");
    return;
  }
  if (!apply) {
    console.log(`
dry-run: ${pending} article(s) pending. Review, then re-run with --apply.`);
    return;
  }

  const token = envValue("SANITY_WRITE_TOKEN");
  if (!token) fail("write token required for --apply: set SANITY_WRITE_TOKEN in .env.local");
  const mutRes = await fetch(`${base}/data/mutate/${dataset}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
    signal: AbortSignal.timeout(30000),
  });
  if (!mutRes.ok) fail(`mutate failed: HTTP ${mutRes.status} ${await mutRes.text()}`);
  const { transactionId, results } = await mutRes.json();
  console.log(`
applied: ${results.length} article(s) created, transaction=${transactionId}`);
}

main().catch((error) => fail(error.message));
