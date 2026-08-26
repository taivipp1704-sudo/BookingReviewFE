// Real usage-guide links (video/tài liệu) cho từng model máy, tổng hợp từ
// file "HDSD CHO KHÁCH HÀNG.xlsx" của shop. Khớp theo cùng slug sản phẩm với
// customerPhotos.js (canon-g7x-m2, fuji-xm5, pocket-3, ...).
//
// Model nào không có trong file gốc (vd: canon-ixy-650) thì không có key ở
// đây — trang chi tiết sẽ chỉ đơn giản không hiện khối "Link hướng dẫn sử
// dụng" cho model đó.
import { slugifyProductName } from "./customerPhotos.js";

export const USAGE_GUIDE_LINKS = {
  "canon-m100": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://www.tiktok.com/@smiley.vibe25/video/7523067684825664775?_t=ZS-90un8Ih550s&_r=1" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://www.tiktok.com/@mayanhvyvy/video/7452180368762948871?_t=ZS-90un9a6m9aB&_r=1" },
  ],
  "canon-m200": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://www.tiktok.com/@smiley.vibe25/video/7523067684825664775?_t=ZS-90un8Ih550s&_r=1" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://www.tiktok.com/@mayanhvyvy/video/7452180368762948871?_t=ZS-90un9a6m9aB&_r=1" },
  ],
  "canon-g7x-m2": [
    { label: "Thư mục hướng dẫn (Google Drive)", url: "https://drive.google.com/drive/folders/1lrO217hnJPpTfedyR43bpx1YvTFGbBTD?usp=sharing" },
    { label: "Clip HDSD nhanh (TikTok)", url: "https://www.tiktok.com/@dathanhcamera/video/7504709463740353793?_t=ZS-90unGwNZKfn&_r=1" },
  ],
  "canon-ixy-600f": [
    { label: "Video hướng dẫn #1 (YouTube)", url: "https://youtu.be/TfuXjpCIRhw?feature=shared" },
    { label: "Video hướng dẫn #2 (YouTube)", url: "https://youtu.be/GMu7ZfaCzQo?feature=shared" },
  ],
  "canon-m10": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://www.tiktok.com/@bloomycam/video/7462292346382585096?_t=ZS-90unQHcc183&_r=1" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://www.tiktok.com/@mayanhcusaigon.90s/video/7543981862796987666?_t=ZS-90unQwq7QSG&_r=1" },
  ],
  "canon-m6": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://www.tiktok.com/@bloomycam/video/7497586851688058130?_t=ZS-90XdAuyvR2e&_r=1" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://www.tiktok.com/@mayanhvyvy/video/7661618663165857031?_r=1&_t=ZS-98qgFIkJrpQ" },
  ],
  "canon-r50": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://vt.tiktok.com/ZSrfAFay2/" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://www.tiktok.com/@bloomycam/video/7507989897785920775?_t=ZS-90unzjNISm2&_r=1" },
    { label: "Video hướng dẫn #3 (TikTok)", url: "https://www.tiktok.com/@_.lensycamchothuemayanh/video/7526429727599365384?_t=ZS-90uo1THPf6I&_r=1" },
  ],
  "canon-m50": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://vt.tiktok.com/ZSyJ3WxwQ/" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://vt.tiktok.com/ZSyJTdTSG/" },
  ],
  "fuji-xm5": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://vt.tiktok.com/ZSfKhFN7U/" },
    { label: "Video hướng dẫn #2 (TikTok)", url: "https://vt.tiktok.com/ZSfKrvtxD/" },
    { label: "Video hướng dẫn #3 (TikTok)", url: "https://vt.tiktok.com/ZSfKhLNts/" },
    { label: "Video hướng dẫn #4 (TikTok)", url: "https://vt.tiktok.com/ZSfKHBPgG/" },
  ],
  "fuji-xa5": [
    { label: "Video hướng dẫn #1 (TikTok)", url: "https://www.tiktok.com/@mayanhvyvy/video/7492011635029134600?_t=ZS-90une9ORa5w&_r=1" },
    { label: "Video hướng dẫn #2 (YouTube)", url: "https://youtu.be/sagNktrJwrI?feature=shared" },
    { label: "Video hướng dẫn #3 (YouTube)", url: "https://youtu.be/tBSXbWPweEw?feature=shared" },
  ],
  "pocket-3": [
    { label: "HDSD của Pocket 3 (YouTube playlist)", url: "https://youtube.com/playlist?list=PLsv88wRDdcjq2ZsJ4iJBYTQ3m83MDulS_&feature=shared" },
    { label: "Quy định bảo quản Pocket 3 (Google Drive)", url: "https://drive.google.com/file/d/1vi_yYDH_jCEa8daAy6QBjy_VPkSQG58L/view?usp=sharing" },
  ],
};

export function usageGuideLinksForProduct(product) {
  const slug = slugifyProductName(product?.name);
  return USAGE_GUIDE_LINKS[slug] || [];
}
