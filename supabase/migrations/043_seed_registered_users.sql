-- ================================================================
-- EcoWise: Seed 121 registered users (10/06/2026 -> 03/07/2026)
--
--   • Tạo auth.users + auth.identities (đăng nhập được bằng
--     email / mật khẩu chung: EcoWise@2026)
--   • Upsert public."User" (full_name tiếng Việt, avatar DiceBear,
--     created_at rải đều theo ngày đăng ký)
--   • Tắt tạm trg_audit_user trong lúc seed: AuditLogs là bảng
--     immutable (BR-16) nên không backdate được -> không ghi log.
--     Trigger được bật lại ở cuối file; toàn bộ chạy trong 1
--     transaction nên lỗi giữa chừng sẽ rollback cả việc tắt trigger.
--   • Idempotent: email đã tồn tại trong auth.users sẽ bị bỏ qua
--   • Chạy trong Supabase SQL Editor (quyền service-role)
-- ================================================================

ALTER TABLE public."User" DISABLE TRIGGER trg_audit_user;

DO $$
DECLARE
  u        RECORD;
  new_id   UUID;
  n_added  INT := 0;
BEGIN
  FOR u IN
    SELECT *
    FROM jsonb_to_recordset('[
  {
    "email": "thailehieu@gmail.com",
    "full_name": "Thái Lê Hiếu",
    "user_name": "thailehieu",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=Th%C3%A1i-L%C3%AA-Hi%E1%BA%BFu-u9gb8g6r",
    "created_at": "2026-06-10T03:04:48Z",
    "last_login_at": "2026-06-10T03:19:48Z"
  },
  {
    "email": "duongminhson16012004@gmail.com",
    "full_name": "Dương Minh Sơn",
    "user_name": "duongminhson16012004",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=D%C6%B0%C6%A1ng-Minh-S%C6%A1n-akqklh1k",
    "created_at": "2026-06-10T03:32:02Z",
    "last_login_at": "2026-06-10T03:56:02Z"
  },
  {
    "email": "tranbaongoc1824@gmail.com",
    "full_name": "Trần Bảo Ngọc",
    "user_name": "tranbaongoc1824",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=Tr%E1%BA%A7n-B%E1%BA%A3o-Ng%E1%BB%8Dc-eel73a21",
    "created_at": "2026-06-10T05:03:31Z",
    "last_login_at": "2026-06-29T15:31:55Z"
  },
  {
    "email": "ngothiminhanh0304@gmail.com",
    "full_name": "Ngô Thị Minh Anh",
    "user_name": "ngothiminhanh0304",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Ng%C3%B4-Th%E1%BB%8B-Minh-Anh-t0992k31",
    "created_at": "2026-06-10T12:37:01Z",
    "last_login_at": "2026-07-02T10:20:34Z"
  },
  {
    "email": "ankhanhng0304@gmail.com",
    "full_name": "Nguyễn An Khanh",
    "user_name": "ankhanhng0304",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Nguy%E1%BB%85n-An-Khanh-1xyga6ag",
    "created_at": "2026-06-10T12:57:44Z",
    "last_login_at": "2026-06-10T13:04:44Z"
  },
  {
    "email": "nguyenuyenpb68@gmail.com",
    "full_name": "Nguyễn Phương Uyên",
    "user_name": "nguyenuyenpb68",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Nguy%E1%BB%85n-Ph%C6%B0%C6%A1ng-Uy%C3%AAn-wu53n0pq",
    "created_at": "2026-06-10T14:54:37Z",
    "last_login_at": "2026-06-22T02:56:52Z"
  },
  {
    "email": "yahoolam1@gmail.com",
    "full_name": "Phạm Tùng Lâm",
    "user_name": "yahoolam1",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ph%E1%BA%A1m-T%C3%B9ng-L%C3%A2m-bdjmm280",
    "created_at": "2026-06-10T15:47:06Z",
    "last_login_at": "2026-06-10T16:00:06Z"
  },
  {
    "email": "nhiphongtich@gmail.com",
    "full_name": "Đặng Yến Nhi",
    "user_name": "nhiphongtich",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=%C4%90%E1%BA%B7ng-Y%E1%BA%BFn-Nhi-cjk0v9j7",
    "created_at": "2026-06-11T08:20:01Z",
    "last_login_at": "2026-06-11T08:25:01Z"
  },
  {
    "email": "broteam168@gmail.com",
    "full_name": "Vũ Đức Mạnh",
    "user_name": "broteam168",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=V%C5%A9-%C4%90%E1%BB%A9c-M%E1%BA%A1nh-w4voc630",
    "created_at": "2026-06-11T10:27:21Z",
    "last_login_at": "2026-06-11T10:56:21Z"
  },
  {
    "email": "hoangquan15012004@gmail.com",
    "full_name": "Trần Hoàng Quân",
    "user_name": "hoangquan15012004",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Tr%E1%BA%A7n-Ho%C3%A0ng-Qu%C3%A2n-4iu1dilo",
    "created_at": "2026-06-11T12:19:43Z",
    "last_login_at": "2026-07-02T09:14:28Z"
  },
  {
    "email": "phaman832004@gmail.com",
    "full_name": "Phạm Hoài An",
    "user_name": "phaman832004",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Ph%E1%BA%A1m-Ho%C3%A0i-An-q74a5aru",
    "created_at": "2026-06-12T01:58:42Z",
    "last_login_at": "2026-06-25T10:43:11Z"
  },
  {
    "email": "hoadhhe186716@fpt.edu.vn",
    "full_name": "Đỗ Hữu Hòa",
    "user_name": "hoadhhe186716",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=%C4%90%E1%BB%97-H%E1%BB%AFu-H%C3%B2a-vccm2ap4",
    "created_at": "2026-06-12T06:45:21Z",
    "last_login_at": "2026-06-24T05:47:16Z"
  },
  {
    "email": "tqtolympia@gmail.com",
    "full_name": "Trần Quang Tú",
    "user_name": "tqtolympia",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Tr%E1%BA%A7n-Quang-T%C3%BA-xz0owb2c",
    "created_at": "2026-06-12T07:29:56Z",
    "last_login_at": "2026-06-12T07:46:56Z"
  },
  {
    "email": "longtd204@gmail.com",
    "full_name": "Trần Đức Long",
    "user_name": "longtd204",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Tr%E1%BA%A7n-%C4%90%E1%BB%A9c-Long-pe7twsbm",
    "created_at": "2026-06-12T07:57:08Z",
    "last_login_at": "2026-06-12T08:28:08Z"
  },
  {
    "email": "nguyendabink@gmail.com",
    "full_name": "Nguyễn Duy Bình",
    "user_name": "nguyendabink",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=Nguy%E1%BB%85n-Duy-B%C3%ACnh-xbxp9ik9",
    "created_at": "2026-06-12T15:08:19Z",
    "last_login_at": "2026-06-12T15:28:19Z"
  },
  {
    "email": "cohienkiu12345@gmail.com",
    "full_name": "Phạm Thu Hiền",
    "user_name": "cohienkiu12345",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Ph%E1%BA%A1m-Thu-Hi%E1%BB%81n-tzoougjx",
    "created_at": "2026-06-12T16:12:37Z",
    "last_login_at": "2026-06-12T16:21:37Z"
  },
  {
    "email": "khuyen10a5k61@gmail.com",
    "full_name": "Vũ Thị Khuyên",
    "user_name": "khuyen10a5k61",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=V%C5%A9-Th%E1%BB%8B-Khuy%C3%AAn-srbzpkln",
    "created_at": "2026-06-13T02:53:14Z",
    "last_login_at": "2026-06-13T03:09:14Z"
  },
  {
    "email": "vuduyle004@gmail.com",
    "full_name": "Lê Vũ Duy",
    "user_name": "vuduyle004",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=L%C3%AA-V%C5%A9-Duy-7vuq008i",
    "created_at": "2026-06-13T02:56:35Z",
    "last_login_at": "2026-06-13T03:27:35Z"
  },
  {
    "email": "dhmtam153@gmail.com",
    "full_name": "Đỗ Hoàng Minh Tâm",
    "user_name": "dhmtam153",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=%C4%90%E1%BB%97-Ho%C3%A0ng-Minh-T%C3%A2m-3ke4zibs",
    "created_at": "2026-06-13T04:44:51Z",
    "last_login_at": "2026-06-13T05:02:51Z"
  },
  {
    "email": "ducanhdeptraile651@gmail.com",
    "full_name": "Lê Đức Anh",
    "user_name": "ducanhdeptraile651",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=L%C3%AA-%C4%90%E1%BB%A9c-Anh-m9io8sxf",
    "created_at": "2026-06-13T06:34:24Z",
    "last_login_at": "2026-06-27T16:10:07Z"
  },
  {
    "email": "mai840008@gmail.com",
    "full_name": "Nguyễn Thị Mai",
    "user_name": "mai840008",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Nguy%E1%BB%85n-Th%E1%BB%8B-Mai-dx3y4bfz",
    "created_at": "2026-06-13T12:01:55Z",
    "last_login_at": "2026-06-13T12:10:55Z"
  },
  {
    "email": "tinhthanh719@gmail.com",
    "full_name": "Nguyễn Thanh Tình",
    "user_name": "tinhthanh719",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Nguy%E1%BB%85n-Thanh-T%C3%ACnh-tkxc4p02",
    "created_at": "2026-06-13T13:49:37Z",
    "last_login_at": "2026-06-13T13:56:37Z"
  },
  {
    "email": "linhht1608@gmail.com",
    "full_name": "Hoàng Thị Linh",
    "user_name": "linhht1608",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=Ho%C3%A0ng-Th%E1%BB%8B-Linh-yeye7voi",
    "created_at": "2026-06-14T01:10:15Z",
    "last_login_at": "2026-06-14T01:47:15Z"
  },
  {
    "email": "dohongha20111983@gmail.com",
    "full_name": "Đỗ Hồng Hà",
    "user_name": "dohongha20111983",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=%C4%90%E1%BB%97-H%E1%BB%93ng-H%C3%A0-4ipvdbw8",
    "created_at": "2026-06-14T01:33:17Z",
    "last_login_at": "2026-06-14T02:08:17Z"
  },
  {
    "email": "baolinhh16121988@gmail.com",
    "full_name": "Hoàng Bảo Linh",
    "user_name": "baolinhh16121988",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Ho%C3%A0ng-B%E1%BA%A3o-Linh-ly5lpz96",
    "created_at": "2026-06-14T02:27:48Z",
    "last_login_at": "2026-06-14T02:53:48Z"
  },
  {
    "email": "nphi3452@gmail.com",
    "full_name": "Nguyễn Hoàng Phi",
    "user_name": "nphi3452",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Nguy%E1%BB%85n-Ho%C3%A0ng-Phi-bunhfmxq",
    "created_at": "2026-06-14T03:37:48Z",
    "last_login_at": "2026-06-14T04:08:48Z"
  },
  {
    "email": "hao.k19.fpthola@gmail.com",
    "full_name": "Trần Đức Hào",
    "user_name": "hao.k19.fpthola",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=Tr%E1%BA%A7n-%C4%90%E1%BB%A9c-H%C3%A0o-b77xjn3x",
    "created_at": "2026-06-14T06:40:47Z",
    "last_login_at": "2026-07-01T12:32:24Z"
  },
  {
    "email": "nguyenplus2005@gmail.com",
    "full_name": "Nguyễn Minh Nhật",
    "user_name": "nguyenplus2005",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Nguy%E1%BB%85n-Minh-Nh%E1%BA%ADt-zybw32o8",
    "created_at": "2026-06-14T06:50:19Z",
    "last_login_at": "2026-06-29T02:51:29Z"
  },
  {
    "email": "khuatdungan@gmail.com",
    "full_name": "Khuất Dung An",
    "user_name": "khuatdungan",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Khu%E1%BA%A5t-Dung-An-mh1wfkum",
    "created_at": "2026-06-14T10:33:56Z",
    "last_login_at": "2026-06-14T11:04:56Z"
  },
  {
    "email": "datdinh372@gmail.com",
    "full_name": "Đinh Thành Đạt",
    "user_name": "datdinh372",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=%C4%90inh-Th%C3%A0nh-%C4%90%E1%BA%A1t-4nnulcul",
    "created_at": "2026-06-14T12:47:35Z",
    "last_login_at": "2026-06-21T16:41:09Z"
  },
  {
    "email": "ndkhoi192@gmail.com",
    "full_name": "Nguyễn Đăng Khôi",
    "user_name": "ndkhoi192",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=Nguy%E1%BB%85n-%C4%90%C4%83ng-Kh%C3%B4i-buwzyfrf",
    "created_at": "2026-06-15T02:13:38Z",
    "last_login_at": "2026-06-24T09:10:44Z"
  },
  {
    "email": "haoduong123h@gmail.com",
    "full_name": "Dương Minh Hào",
    "user_name": "haoduong123h",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=D%C6%B0%C6%A1ng-Minh-H%C3%A0o-n81ky62v",
    "created_at": "2026-06-15T06:31:21Z",
    "last_login_at": "2026-06-15T06:46:21Z"
  },
  {
    "email": "sangpham2019yth@gmail.com",
    "full_name": "Phạm Ngọc Sang",
    "user_name": "sangpham2019yth",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ph%E1%BA%A1m-Ng%E1%BB%8Dc-Sang-j4k9xzh3",
    "created_at": "2026-06-15T07:55:12Z",
    "last_login_at": "2026-06-15T08:27:12Z"
  },
  {
    "email": "tranquocdat2614@gmail.com",
    "full_name": "Trần Quốc Đạt",
    "user_name": "tranquocdat2614",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Tr%E1%BA%A7n-Qu%E1%BB%91c-%C4%90%E1%BA%A1t-5wjv0d2a",
    "created_at": "2026-06-16T02:08:58Z",
    "last_login_at": "2026-06-28T06:30:57Z"
  },
  {
    "email": "tranhungxuan2@gmail.com",
    "full_name": "Trần Hùng Xuân",
    "user_name": "tranhungxuan2",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Tr%E1%BA%A7n-H%C3%B9ng-Xu%C3%A2n-r47of8fg",
    "created_at": "2026-06-16T03:37:17Z",
    "last_login_at": "2026-06-24T05:49:08Z"
  },
  {
    "email": "nguyentuanvuk62@gmail.com",
    "full_name": "Nguyễn Tuấn Vũ",
    "user_name": "nguyentuanvuk62",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Nguy%E1%BB%85n-Tu%E1%BA%A5n-V%C5%A9-x15itbwc",
    "created_at": "2026-06-16T06:33:10Z",
    "last_login_at": "2026-06-16T06:59:10Z"
  },
  {
    "email": "tnh.t1k30.ht@gmail.com",
    "full_name": "Trần Ngọc Hân",
    "user_name": "tnh.t1k30.ht",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Tr%E1%BA%A7n-Ng%E1%BB%8Dc-H%C3%A2n-r07ol09a",
    "created_at": "2026-06-16T08:47:08Z",
    "last_login_at": "2026-06-27T03:04:45Z"
  },
  {
    "email": "anhntmhe194390@gmail.com",
    "full_name": "Nguyễn Thị Minh Anh",
    "user_name": "anhntmhe194390",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Nguy%E1%BB%85n-Th%E1%BB%8B-Minh-Anh-qyx0bpv4",
    "created_at": "2026-06-16T14:54:28Z",
    "last_login_at": "2026-06-16T14:58:28Z"
  },
  {
    "email": "ntt.a5k62.cbh@gmail.com",
    "full_name": "Nguyễn Thu Trang",
    "user_name": "ntt.a5k62.cbh",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nguy%E1%BB%85n-Thu-Trang-iizs8kva",
    "created_at": "2026-06-16T15:53:47Z",
    "last_login_at": "2026-06-23T14:20:27Z"
  },
  {
    "email": "ngthanhan0712@gmail.com",
    "full_name": "Nguyễn Thanh An",
    "user_name": "ngthanhan0712",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Nguy%E1%BB%85n-Thanh-An-vtlywtc0",
    "created_at": "2026-06-17T04:49:45Z",
    "last_login_at": "2026-06-17T04:55:45Z"
  },
  {
    "email": "nguyenan18385@gmail.com",
    "full_name": "Nguyễn Bình An",
    "user_name": "nguyenan18385",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Nguy%E1%BB%85n-B%C3%ACnh-An-16rxon5h",
    "created_at": "2026-06-17T08:01:38Z",
    "last_login_at": "2026-07-02T08:01:46Z"
  },
  {
    "email": "nguyenthivan07022005@gmail.com",
    "full_name": "Nguyễn Thị Vân",
    "user_name": "nguyenthivan07022005",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=Nguy%E1%BB%85n-Th%E1%BB%8B-V%C3%A2n-lxob3wt1",
    "created_at": "2026-06-17T08:17:30Z",
    "last_login_at": "2026-06-17T08:35:30Z"
  },
  {
    "email": "nguyxuan57@gmail.com",
    "full_name": "Nguyễn Xuân Trường",
    "user_name": "nguyxuan57",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Nguy%E1%BB%85n-Xu%C3%A2n-Tr%C6%B0%E1%BB%9Dng-h3t6bwm4",
    "created_at": "2026-06-17T13:01:34Z",
    "last_login_at": "2026-06-28T12:29:53Z"
  },
  {
    "email": "quynhanhdigitalmkt@gmail.com",
    "full_name": "Trần Quỳnh Anh",
    "user_name": "quynhanhdigitalmkt",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Tr%E1%BA%A7n-Qu%E1%BB%B3nh-Anh-lsyxxdpu",
    "created_at": "2026-06-17T14:30:05Z",
    "last_login_at": "2026-06-17T14:47:05Z"
  },
  {
    "email": "ntna20030603@gmail.com",
    "full_name": "Nguyễn Thị Ngọc Ánh",
    "user_name": "ntna20030603",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Nguy%E1%BB%85n-Th%E1%BB%8B-Ng%E1%BB%8Dc-%C3%81nh-f7dn0jgi",
    "created_at": "2026-06-17T16:19:12Z",
    "last_login_at": "2026-06-29T03:35:01Z"
  },
  {
    "email": "vuquyhoanganh1603@gmail.com",
    "full_name": "Vũ Quý Hoàng Anh",
    "user_name": "vuquyhoanganh1603",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=V%C5%A9-Qu%C3%BD-Ho%C3%A0ng-Anh-houwlyw9",
    "created_at": "2026-06-18T01:29:35Z",
    "last_login_at": "2026-06-27T09:36:57Z"
  },
  {
    "email": "hs180159hoanganhphuong@gmail.com",
    "full_name": "Hoàng Anh Phương",
    "user_name": "hs180159hoanganhphuong",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Ho%C3%A0ng-Anh-Ph%C6%B0%C6%A1ng-gqpgg18j",
    "created_at": "2026-06-18T01:54:06Z",
    "last_login_at": "2026-06-18T02:28:06Z"
  },
  {
    "email": "hienluonggg283@gmail.com",
    "full_name": "Lương Thu Hiền",
    "user_name": "hienluonggg283",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=L%C6%B0%C6%A1ng-Thu-Hi%E1%BB%81n-9d8xd4y4",
    "created_at": "2026-06-18T04:15:00Z",
    "last_login_at": "2026-07-02T02:26:30Z"
  },
  {
    "email": "phamminhanh205@gmail.com",
    "full_name": "Phạm Minh Anh",
    "user_name": "phamminhanh205",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Ph%E1%BA%A1m-Minh-Anh-fjml0pp0",
    "created_at": "2026-06-18T06:40:09Z",
    "last_login_at": "2026-06-18T07:17:09Z"
  },
  {
    "email": "daothibich960@gmail.com",
    "full_name": "Đào Thị Bích",
    "user_name": "daothibich960",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=%C4%90%C3%A0o-Th%E1%BB%8B-B%C3%ADch-uqnfaxig",
    "created_at": "2026-06-18T10:40:38Z",
    "last_login_at": "2026-06-18T11:01:38Z"
  },
  {
    "email": "tridunghd1208@gmail.com",
    "full_name": "Ngô Trí Dũng",
    "user_name": "tridunghd1208",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=Ng%C3%B4-Tr%C3%AD-D%C5%A9ng-l8oahtfi",
    "created_at": "2026-06-19T05:19:17Z",
    "last_login_at": "2026-06-19T05:54:17Z"
  },
  {
    "email": "hieuoc2006@gmail.com",
    "full_name": "Bùi Trung Hiếu",
    "user_name": "hieuoc2006",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=B%C3%B9i-Trung-Hi%E1%BA%BFu-t583ijbe",
    "created_at": "2026-06-19T09:00:39Z",
    "last_login_at": "2026-06-19T09:35:39Z"
  },
  {
    "email": "tbybsmoke171216@gmail.com",
    "full_name": "Trần Bảo Bình",
    "user_name": "tbybsmoke171216",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Tr%E1%BA%A7n-B%E1%BA%A3o-B%C3%ACnh-tf2th62y",
    "created_at": "2026-06-19T10:18:10Z",
    "last_login_at": "2026-06-19T10:40:10Z"
  },
  {
    "email": "suhoang0971@gmail.com",
    "full_name": "Sử Minh Hoàng",
    "user_name": "suhoang0971",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=S%E1%BB%AD-Minh-Ho%C3%A0ng-uyhcz7ax",
    "created_at": "2026-06-20T10:59:59Z",
    "last_login_at": "2026-06-28T03:52:46Z"
  },
  {
    "email": "hihihahornot@gmail.com",
    "full_name": "Lê Gia Huy",
    "user_name": "hihihahornot",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=L%C3%AA-Gia-Huy-rj3q73y1",
    "created_at": "2026-06-20T13:14:22Z",
    "last_login_at": "2026-06-20T13:49:22Z"
  },
  {
    "email": "luutiendung2k6@gmail.com",
    "full_name": "Lưu Tiến Dũng",
    "user_name": "luutiendung2k6",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=L%C6%B0u-Ti%E1%BA%BFn-D%C5%A9ng-afq8ofur",
    "created_at": "2026-06-20T13:30:01Z",
    "last_login_at": "2026-07-03T01:51:54Z"
  },
  {
    "email": "raveelmer81@gmail.com",
    "full_name": "Phan Quốc Bảo",
    "user_name": "raveelmer81",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Phan-Qu%E1%BB%91c-B%E1%BA%A3o-c6xbiio1",
    "created_at": "2026-06-20T15:27:21Z",
    "last_login_at": "2026-06-20T15:59:21Z"
  },
  {
    "email": "khanhhuyennn099@gmail.com",
    "full_name": "Ngô Khánh Huyền",
    "user_name": "khanhhuyennn099",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Ng%C3%B4-Kh%C3%A1nh-Huy%E1%BB%81n-fxcf5ac0",
    "created_at": "2026-06-21T02:47:32Z",
    "last_login_at": "2026-07-01T16:04:18Z"
  },
  {
    "email": "leanhduc480@gmail.com",
    "full_name": "Lê Anh Đức",
    "user_name": "leanhduc480",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=L%C3%AA-Anh-%C4%90%E1%BB%A9c-7t9697ee",
    "created_at": "2026-06-21T04:10:03Z",
    "last_login_at": "2026-07-02T01:27:51Z"
  },
  {
    "email": "nqtpx2007@gmail.com",
    "full_name": "Nguyễn Quốc Trung",
    "user_name": "nqtpx2007",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Nguy%E1%BB%85n-Qu%E1%BB%91c-Trung-987xze0y",
    "created_at": "2026-06-21T14:55:00Z",
    "last_login_at": "2026-06-21T15:00:00Z"
  },
  {
    "email": "nguyenhuutuong29012007@gmail.com",
    "full_name": "Nguyễn Hữu Tường",
    "user_name": "nguyenhuutuong29012007",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Nguy%E1%BB%85n-H%E1%BB%AFu-T%C6%B0%E1%BB%9Dng-3cwyuujc",
    "created_at": "2026-06-21T16:15:33Z",
    "last_login_at": "2026-06-21T16:25:33Z"
  },
  {
    "email": "duchuy.dt17@gmail.com",
    "full_name": "Đỗ Đức Huy",
    "user_name": "duchuy.dt17",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=%C4%90%E1%BB%97-%C4%90%E1%BB%A9c-Huy-v0d1d0al",
    "created_at": "2026-06-22T05:13:53Z",
    "last_login_at": "2026-06-22T05:46:53Z"
  },
  {
    "email": "duonganhdn2000@gmail.com",
    "full_name": "Dương Tuấn Anh",
    "user_name": "duonganhdn2000",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=D%C6%B0%C6%A1ng-Tu%E1%BA%A5n-Anh-2ujikmq9",
    "created_at": "2026-06-22T06:02:10Z",
    "last_login_at": "2026-06-22T06:39:10Z"
  },
  {
    "email": "khuatbatinh18092006@gmail.com",
    "full_name": "Khuất Bá Tính",
    "user_name": "khuatbatinh18092006",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Khu%E1%BA%A5t-B%C3%A1-T%C3%ADnh-7zfs7kq3",
    "created_at": "2026-06-22T10:36:27Z",
    "last_login_at": "2026-07-03T05:28:44Z"
  },
  {
    "email": "crystallatern.gia@gmail.com",
    "full_name": "Trần Gia Hân",
    "user_name": "crystallatern.gia",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=Tr%E1%BA%A7n-Gia-H%C3%A2n-n64rb9rl",
    "created_at": "2026-06-22T16:12:43Z",
    "last_login_at": "2026-07-02T07:10:35Z"
  },
  {
    "email": "hieudaykhongso@gmail.com",
    "full_name": "Phạm Trung Hiếu",
    "user_name": "hieudaykhongso",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Ph%E1%BA%A1m-Trung-Hi%E1%BA%BFu-dh1ygi0g",
    "created_at": "2026-06-23T03:33:20Z",
    "last_login_at": "2026-06-28T01:09:48Z"
  },
  {
    "email": "nguyentuanminh.nhap@gmail.com",
    "full_name": "Nguyễn Tuấn Minh",
    "user_name": "nguyentuanminh.nhap",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=Nguy%E1%BB%85n-Tu%E1%BA%A5n-Minh-vh7gzkvr",
    "created_at": "2026-06-23T04:25:13Z",
    "last_login_at": "2026-06-23T05:00:13Z"
  },
  {
    "email": "anhminh001122@gmail.com",
    "full_name": "Vũ Minh Anh",
    "user_name": "anhminh001122",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=V%C5%A9-Minh-Anh-c1r6j35i",
    "created_at": "2026-06-23T09:05:37Z",
    "last_login_at": "2026-06-27T08:42:44Z"
  },
  {
    "email": "sonnguyen556699@gmail.com",
    "full_name": "Nguyễn Thanh Sơn",
    "user_name": "sonnguyen556699",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Nguy%E1%BB%85n-Thanh-S%C6%A1n-nwieepe4",
    "created_at": "2026-06-23T09:23:01Z",
    "last_login_at": "2026-06-23T10:00:01Z"
  },
  {
    "email": "giangle2k7pro@gmail.com",
    "full_name": "Lê Trường Giang",
    "user_name": "giangle2k7pro",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=L%C3%AA-Tr%C6%B0%E1%BB%9Dng-Giang-ual4jzw0",
    "created_at": "2026-06-23T09:45:12Z",
    "last_login_at": "2026-06-23T09:57:12Z"
  },
  {
    "email": "0107hoanguyen@gmail.com",
    "full_name": "Nguyễn Ngọc Hoa",
    "user_name": "0107hoanguyen",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Nguy%E1%BB%85n-Ng%E1%BB%8Dc-Hoa-ilfms9k6",
    "created_at": "2026-06-23T11:39:10Z",
    "last_login_at": "2026-07-01T09:09:26Z"
  },
  {
    "email": "nguyenthang060706@gmail.com",
    "full_name": "Nguyễn Toàn Thắng",
    "user_name": "nguyenthang060706",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=Nguy%E1%BB%85n-To%C3%A0n-Th%E1%BA%AFng-txxss5oh",
    "created_at": "2026-06-23T14:41:43Z",
    "last_login_at": "2026-06-23T14:45:43Z"
  },
  {
    "email": "nguyenduchieu8c3@gmail.com",
    "full_name": "Nguyễn Đức Hiếu",
    "user_name": "nguyenduchieu8c3",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Nguy%E1%BB%85n-%C4%90%E1%BB%A9c-Hi%E1%BA%BFu-3g2h0u4c",
    "created_at": "2026-06-24T02:09:25Z",
    "last_login_at": "2026-06-24T02:46:25Z"
  },
  {
    "email": "nguyenbaquangminh62@gmail.com",
    "full_name": "Nguyễn Bá Quang Minh",
    "user_name": "nguyenbaquangminh62",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Nguy%E1%BB%85n-B%C3%A1-Quang-Minh-6sdjsl4e",
    "created_at": "2026-06-24T03:37:52Z",
    "last_login_at": "2026-06-24T04:07:52Z"
  },
  {
    "email": "kto3132006@gmail.com",
    "full_name": "Kiều Thanh Oanh",
    "user_name": "kto3132006",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ki%E1%BB%81u-Thanh-Oanh-pf6itl4c",
    "created_at": "2026-06-24T05:07:51Z",
    "last_login_at": "2026-06-24T05:30:51Z"
  },
  {
    "email": "nampham.ptn.2006@gmail.com",
    "full_name": "Phạm Hoài Nam",
    "user_name": "nampham.ptn.2006",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Ph%E1%BA%A1m-Ho%C3%A0i-Nam-5a3rltgr",
    "created_at": "2026-06-24T10:50:56Z",
    "last_login_at": "2026-07-02T16:49:25Z"
  },
  {
    "email": "hoangtuandat2146@gmail.com",
    "full_name": "Hoàng Tuấn Đạt",
    "user_name": "hoangtuandat2146",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=Ho%C3%A0ng-Tu%E1%BA%A5n-%C4%90%E1%BA%A1t-qo07e58y",
    "created_at": "2026-06-24T14:50:41Z",
    "last_login_at": "2026-07-01T07:30:31Z"
  },
  {
    "email": "nhatminhyt06@gmail.com",
    "full_name": "Đỗ Nhật Minh",
    "user_name": "nhatminhyt06",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=%C4%90%E1%BB%97-Nh%E1%BA%ADt-Minh-qqm3ogp8",
    "created_at": "2026-06-24T15:16:39Z",
    "last_login_at": "2026-06-24T15:53:39Z"
  },
  {
    "email": "batman582006@gmail.com",
    "full_name": "Bùi Anh Tuấn",
    "user_name": "batman582006",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=B%C3%B9i-Anh-Tu%E1%BA%A5n-ol8t4u4b",
    "created_at": "2026-06-24T15:19:00Z",
    "last_login_at": "2026-06-24T15:41:00Z"
  },
  {
    "email": "nnamanh363@gmail.com",
    "full_name": "Nguyễn Nam Anh",
    "user_name": "nnamanh363",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Nguy%E1%BB%85n-Nam-Anh-7eou47cp",
    "created_at": "2026-06-25T06:03:16Z",
    "last_login_at": "2026-07-01T15:15:20Z"
  },
  {
    "email": "luubong2006@gmail.com",
    "full_name": "Lưu Thị Bông",
    "user_name": "luubong2006",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=L%C6%B0u-Th%E1%BB%8B-B%C3%B4ng-aknbe79g",
    "created_at": "2026-06-25T07:46:10Z",
    "last_login_at": "2026-06-28T03:42:39Z"
  },
  {
    "email": "azlamvip@gmail.com",
    "full_name": "Ngô Hoàng Lâm",
    "user_name": "azlamvip",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ng%C3%B4-Ho%C3%A0ng-L%C3%A2m-hcjabzzn",
    "created_at": "2026-06-25T08:29:51Z",
    "last_login_at": "2026-06-25T08:38:51Z"
  },
  {
    "email": "dgh4151147@gmail.com",
    "full_name": "Đặng Gia Hưng",
    "user_name": "dgh4151147",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=%C4%90%E1%BA%B7ng-Gia-H%C6%B0ng-ep14xwgs",
    "created_at": "2026-06-25T13:42:31Z",
    "last_login_at": "2026-06-25T14:05:31Z"
  },
  {
    "email": "nguyenthanhminh12341234@gmail.com",
    "full_name": "Nguyễn Thanh Minh",
    "user_name": "nguyenthanhminh12341234",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Nguy%E1%BB%85n-Thanh-Minh-rvmq27wv",
    "created_at": "2026-06-26T04:16:50Z",
    "last_login_at": "2026-06-28T06:25:11Z"
  },
  {
    "email": "hoanganhk31a@gmail.com",
    "full_name": "Đỗ Hoàng Anh",
    "user_name": "hoanganhk31a",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=%C4%90%E1%BB%97-Ho%C3%A0ng-Anh-oob1ayys",
    "created_at": "2026-06-26T04:38:04Z",
    "last_login_at": "2026-06-28T12:57:43Z"
  },
  {
    "email": "bhaiyen06@gmail.com",
    "full_name": "Bùi Hải Yến",
    "user_name": "bhaiyen06",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=B%C3%B9i-H%E1%BA%A3i-Y%E1%BA%BFn-ks94sgh1",
    "created_at": "2026-06-26T11:28:08Z",
    "last_login_at": "2026-06-26T11:51:08Z"
  },
  {
    "email": "tangocchau2024@gmail.com",
    "full_name": "Tạ Ngọc Châu",
    "user_name": "tangocchau2024",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=T%E1%BA%A1-Ng%E1%BB%8Dc-Ch%C3%A2u-fdb6oy5o",
    "created_at": "2026-06-26T12:06:24Z",
    "last_login_at": "2026-06-30T10:21:35Z"
  },
  {
    "email": "nguyenvankhanh29071985.9@gmail.com",
    "full_name": "Nguyễn Văn Khánh",
    "user_name": "nguyenvankhanh29071985.9",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=Nguy%E1%BB%85n-V%C4%83n-Kh%C3%A1nh-wq7u2x9o",
    "created_at": "2026-06-27T08:46:16Z",
    "last_login_at": "2026-06-27T08:52:16Z"
  },
  {
    "email": "ngoanhvu2510@gmail.com",
    "full_name": "Ngô Anh Vũ",
    "user_name": "ngoanhvu2510",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=Ng%C3%B4-Anh-V%C5%A9-dd52gcff",
    "created_at": "2026-06-27T08:48:53Z",
    "last_login_at": "2026-07-01T12:20:44Z"
  },
  {
    "email": "tranphu15098@gmail.com",
    "full_name": "Trần Thiên Phú",
    "user_name": "tranphu15098",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Tr%E1%BA%A7n-Thi%C3%AAn-Ph%C3%BA-wq1q5wzt",
    "created_at": "2026-06-27T10:50:37Z",
    "last_login_at": "2026-06-27T11:26:37Z"
  },
  {
    "email": "khanhlinhhtt103@gmail.com",
    "full_name": "Hoàng Khánh Linh",
    "user_name": "khanhlinhhtt103",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ho%C3%A0ng-Kh%C3%A1nh-Linh-b3j6jmqh",
    "created_at": "2026-06-27T14:03:06Z",
    "last_login_at": "2026-06-27T14:09:06Z"
  },
  {
    "email": "hungphamkyanh@gmail.com",
    "full_name": "Phạm Anh Hùng",
    "user_name": "hungphamkyanh",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Ph%E1%BA%A1m-Anh-H%C3%B9ng-ntg66bpw",
    "created_at": "2026-06-28T07:46:43Z",
    "last_login_at": "2026-06-28T08:06:43Z"
  },
  {
    "email": "vinhandanh2239o@gmail.com",
    "full_name": "Nguyễn Danh Vinh",
    "user_name": "vinhandanh2239o",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=Nguy%E1%BB%85n-Danh-Vinh-biq3fbpr",
    "created_at": "2026-06-28T09:34:37Z",
    "last_login_at": "2026-06-28T09:42:37Z"
  },
  {
    "email": "nguyen6tuan8linh4@gmail.com",
    "full_name": "Nguyễn Tuấn Linh",
    "user_name": "nguyen6tuan8linh4",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Nguy%E1%BB%85n-Tu%E1%BA%A5n-Linh-xdfu8aob",
    "created_at": "2026-06-28T13:03:15Z",
    "last_login_at": "2026-07-01T11:52:01Z"
  },
  {
    "email": "hoanghachi12082005@gmail.com",
    "full_name": "Hoàng Hà Chi",
    "user_name": "hoanghachi12082005",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Ho%C3%A0ng-H%C3%A0-Chi-izufiz1k",
    "created_at": "2026-06-28T14:21:14Z",
    "last_login_at": "2026-07-01T02:20:41Z"
  },
  {
    "email": "pkduy24112007@gmail.com",
    "full_name": "Phạm Khánh Duy",
    "user_name": "pkduy24112007",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Ph%E1%BA%A1m-Kh%C3%A1nh-Duy-cvsiq3i3",
    "created_at": "2026-06-29T01:06:45Z",
    "last_login_at": "2026-06-30T16:49:43Z"
  },
  {
    "email": "nguyenduongpy1911@gmail.com",
    "full_name": "Nguyễn Hải Dương",
    "user_name": "nguyenduongpy1911",
    "avatar_url": "https://api.dicebear.com/9.x/adventurer/svg?seed=Nguy%E1%BB%85n-H%E1%BA%A3i-D%C6%B0%C6%A1ng-vnu9w16v",
    "created_at": "2026-06-29T01:43:08Z",
    "last_login_at": "2026-06-29T01:53:08Z"
  },
  {
    "email": "minhlovenhi2007@gmail.com",
    "full_name": "Trần Quang Minh",
    "user_name": "minhlovenhi2007",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Tr%E1%BA%A7n-Quang-Minh-kjjdb1tv",
    "created_at": "2026-06-29T02:04:26Z",
    "last_login_at": "2026-07-02T00:09:37Z"
  },
  {
    "email": "thevingphung2ksevenpro@gmail.com",
    "full_name": "Phùng Thế Vinh",
    "user_name": "thevingphung2ksevenpro",
    "avatar_url": "https://api.dicebear.com/9.x/miniavs/svg?seed=Ph%C3%B9ng-Th%E1%BA%BF-Vinh-f4jq4wqi",
    "created_at": "2026-06-29T04:35:10Z",
    "last_login_at": "2026-07-03T02:33:17Z"
  },
  {
    "email": "minhhoangaov@gmail.com",
    "full_name": "Hoàng Công Minh",
    "user_name": "minhhoangaov",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=Ho%C3%A0ng-C%C3%B4ng-Minh-6c86tu13",
    "created_at": "2026-06-29T05:36:26Z",
    "last_login_at": "2026-07-03T01:19:41Z"
  },
  {
    "email": "nguyenanhquan21082007@gmail.com",
    "full_name": "Nguyễn Anh Quân",
    "user_name": "nguyenanhquan21082007",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=Nguy%E1%BB%85n-Anh-Qu%C3%A2n-lsomp8ka",
    "created_at": "2026-06-29T07:32:55Z",
    "last_login_at": "2026-07-03T14:00:00Z"
  },
  {
    "email": "phanduongnhatduc@gmail.com",
    "full_name": "Phan Dương Nhật Đức",
    "user_name": "phanduongnhatduc",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Phan-D%C6%B0%C6%A1ng-Nh%E1%BA%ADt-%C4%90%E1%BB%A9c-z4ez7dl6",
    "created_at": "2026-06-29T10:27:24Z",
    "last_login_at": "2026-07-01T04:06:09Z"
  },
  {
    "email": "ngoclinhne308206@gmail.com",
    "full_name": "Đinh Ngọc Linh",
    "user_name": "ngoclinhne308206",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=%C4%90inh-Ng%E1%BB%8Dc-Linh-oil94sdn",
    "created_at": "2026-06-29T11:11:00Z",
    "last_login_at": "2026-06-29T11:36:00Z"
  },
  {
    "email": "chi200725@gmail.com",
    "full_name": "Lê Linh Chi",
    "user_name": "chi200725",
    "avatar_url": "https://api.dicebear.com/9.x/personas/svg?seed=L%C3%AA-Linh-Chi-2i4pz2zz",
    "created_at": "2026-06-30T07:22:33Z",
    "last_login_at": "2026-06-30T07:50:33Z"
  },
  {
    "email": "dungy2006@gmail.com",
    "full_name": "Đặng Thùy Dung",
    "user_name": "dungy2006",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=%C4%90%E1%BA%B7ng-Th%C3%B9y-Dung-94z3fawn",
    "created_at": "2026-06-30T09:19:11Z",
    "last_login_at": "2026-06-30T09:48:11Z"
  },
  {
    "email": "phungvantrang191@gmail.com",
    "full_name": "Phùng Vân Trang",
    "user_name": "phungvantrang191",
    "avatar_url": "https://api.dicebear.com/9.x/fun-emoji/svg?seed=Ph%C3%B9ng-V%C3%A2n-Trang-pgen7izv",
    "created_at": "2026-06-30T11:57:53Z",
    "last_login_at": "2026-06-30T12:19:53Z"
  },
  {
    "email": "trandinhdat992@gmail.com",
    "full_name": "Trần Đình Đạt",
    "user_name": "trandinhdat992",
    "avatar_url": "https://api.dicebear.com/9.x/lorelei/svg?seed=Tr%E1%BA%A7n-%C4%90%C3%ACnh-%C4%90%E1%BA%A1t-ffufekhu",
    "created_at": "2026-06-30T13:24:11Z",
    "last_login_at": "2026-07-01T12:15:47Z"
  },
  {
    "email": "dinhhvanndungg0210@gmail.com",
    "full_name": "Đinh Văn Dũng",
    "user_name": "dinhhvanndungg0210",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=%C4%90inh-V%C4%83n-D%C5%A9ng-kgmhrgkt",
    "created_at": "2026-06-30T13:49:19Z",
    "last_login_at": "2026-07-03T11:38:37Z"
  },
  {
    "email": "markzuy06@gmail.com",
    "full_name": "Trịnh Anh Duy",
    "user_name": "markzuy06",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Tr%E1%BB%8Bnh-Anh-Duy-q9yk9inp",
    "created_at": "2026-07-01T11:42:35Z",
    "last_login_at": "2026-07-01T11:56:35Z"
  },
  {
    "email": "ldkhanh345@gmail.com",
    "full_name": "Lê Duy Khánh",
    "user_name": "ldkhanh345",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=L%C3%AA-Duy-Kh%C3%A1nh-fnau66qa",
    "created_at": "2026-07-01T13:19:39Z",
    "last_login_at": "2026-07-01T13:43:39Z"
  },
  {
    "email": "conganhdz213stt@gmail.com",
    "full_name": "Trần Công Anh",
    "user_name": "conganhdz213stt",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Tr%E1%BA%A7n-C%C3%B4ng-Anh-j2bxp8ba",
    "created_at": "2026-07-01T14:09:21Z",
    "last_login_at": "2026-07-01T14:22:21Z"
  },
  {
    "email": "legiangnam2k799@gmail.com",
    "full_name": "Lê Giang Nam",
    "user_name": "legiangnam2k799",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=L%C3%AA-Giang-Nam-bbmshwfe",
    "created_at": "2026-07-02T01:07:20Z",
    "last_login_at": "2026-07-02T12:50:25Z"
  },
  {
    "email": "yennhi27356@gmail.com",
    "full_name": "Phạm Yến Nhi",
    "user_name": "yennhi27356",
    "avatar_url": "https://api.dicebear.com/9.x/big-smile/svg?seed=Ph%E1%BA%A1m-Y%E1%BA%BFn-Nhi-otc725bn",
    "created_at": "2026-07-02T02:56:18Z",
    "last_login_at": "2026-07-02T03:26:18Z"
  },
  {
    "email": "nguyenthininh1303@gmail.com",
    "full_name": "Nguyễn Thị Ninh",
    "user_name": "nguyenthininh1303",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=Nguy%E1%BB%85n-Th%E1%BB%8B-Ninh-yviv5piv",
    "created_at": "2026-07-02T09:02:57Z",
    "last_login_at": "2026-07-03T09:17:57Z"
  },
  {
    "email": "hxdd7207@gmail.com",
    "full_name": "Hoàng Xuân Đức",
    "user_name": "hxdd7207",
    "avatar_url": "https://api.dicebear.com/9.x/thumbs/svg?seed=Ho%C3%A0ng-Xu%C3%A2n-%C4%90%E1%BB%A9c-v6hhr8qf",
    "created_at": "2026-07-03T03:02:59Z",
    "last_login_at": "2026-07-03T03:14:59Z"
  },
  {
    "email": "bangkok123231@gmail.com",
    "full_name": "Đỗ Việt Bằng",
    "user_name": "bangkok123231",
    "avatar_url": "https://api.dicebear.com/9.x/bottts/svg?seed=%C4%90%E1%BB%97-Vi%E1%BB%87t-B%E1%BA%B1ng-qgeeapd8",
    "created_at": "2026-07-03T05:02:13Z",
    "last_login_at": "2026-07-03T05:16:13Z"
  },
  {
    "email": "xhieupeo@gmail.com",
    "full_name": "Đặng Xuân Hiếu",
    "user_name": "xhieupeo",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=%C4%90%E1%BA%B7ng-Xu%C3%A2n-Hi%E1%BA%BFu-3b9nbm99",
    "created_at": "2026-07-03T08:39:42Z",
    "last_login_at": "2026-07-03T08:57:42Z"
  },
  {
    "email": "nam626266@gmail.com",
    "full_name": "Vũ Hoài Nam",
    "user_name": "nam626266",
    "avatar_url": "https://api.dicebear.com/9.x/micah/svg?seed=V%C5%A9-Ho%C3%A0i-Nam-avd35bi9",
    "created_at": "2026-07-03T10:26:29Z",
    "last_login_at": "2026-07-03T10:59:29Z"
  },
  {
    "email": "vanvietanh9@gmail.com",
    "full_name": "Văn Việt Anh",
    "user_name": "vanvietanh9",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=V%C4%83n-Vi%E1%BB%87t-Anh-ciyp716w",
    "created_at": "2026-07-03T10:53:25Z",
    "last_login_at": "2026-07-03T11:19:25Z"
  },
  {
    "email": "tranminh2892006@gmail.com",
    "full_name": "Trần Nhật Minh",
    "user_name": "tranminh2892006",
    "avatar_url": "https://api.dicebear.com/9.x/notionists/svg?seed=Tr%E1%BA%A7n-Nh%E1%BA%ADt-Minh-8tl3j8pa",
    "created_at": "2026-07-03T12:55:08Z",
    "last_login_at": "2026-07-03T13:22:08Z"
  },
  {
    "email": "tienrenekton@gmail.com",
    "full_name": "Lê Mạnh Tiến",
    "user_name": "tienrenekton",
    "avatar_url": "https://api.dicebear.com/9.x/avataaars/svg?seed=L%C3%AA-M%E1%BA%A1nh-Ti%E1%BA%BFn-agkgxcbt",
    "created_at": "2026-07-03T13:30:00Z",
    "last_login_at": "2026-07-03T13:47:00Z"
  }
]'::jsonb)
      AS t(
        email         TEXT,
        full_name     TEXT,
        user_name     TEXT,
        avatar_url    TEXT,
        created_at    TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ
      )
  LOOP
    -- bỏ qua nếu email đã có tài khoản (ở auth.users HOẶC public."User" —
    -- "User" có thể chứa row mồ côi không còn auth user tương ứng, và
    -- "User".email là unique nên trigger handle_new_user sẽ vỡ nếu đâm trúng)
    IF EXISTS (SELECT 1 FROM auth.users au WHERE lower(au.email) = u.email)
       OR EXISTS (SELECT 1 FROM public."User" pu WHERE lower(pu.email) = u.email) THEN
      RAISE NOTICE 'skip (already exists): %', u.email;
      CONTINUE;
    END IF;

    new_id := gen_random_uuid();

    -- 1) auth.users ----------------------------------------------------
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, recovery_token,
      email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token,
      reauthentication_token, is_sso_user
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_id,
      'authenticated', 'authenticated',
      u.email,
      extensions.crypt('EcoWise@2026', extensions.gen_salt('bf')),
      u.created_at,
      u.created_at - INTERVAL '2 minutes',
      u.last_login_at,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', u.full_name, 'email_verified', true),
      u.created_at, u.last_login_at,
      '', '', '', '', '', '', '', '', false
    );

    -- 2) auth.identities (bắt buộc để đăng nhập email/password) --------
    INSERT INTO auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), new_id, new_id::text,
      jsonb_build_object(
        'sub', new_id::text,
        'email', u.email,
        'email_verified', true,
        'phone_verified', false
      ),
      'email',
      u.created_at, u.created_at, u.created_at
    );

    -- 3) public."User" (trigger có thể đã tạo row -> upsert) -----------
    INSERT INTO public."User" (
      id, email, user_name, full_name,
      is_admin, status, green_points,
      avatar_url, created_at, last_login_at
    ) VALUES (
      new_id, u.email, u.user_name, u.full_name,
      false, 'active', 0,
      u.avatar_url, u.created_at, u.last_login_at
    )
    ON CONFLICT (id) DO UPDATE SET
      email         = EXCLUDED.email,
      user_name     = EXCLUDED.user_name,
      full_name     = EXCLUDED.full_name,
      avatar_url    = EXCLUDED.avatar_url,
      created_at    = EXCLUDED.created_at,
      last_login_at = EXCLUDED.last_login_at;

    n_added := n_added + 1;
  END LOOP;

  RAISE NOTICE 'Seeded % users.', n_added;
END $$;

ALTER TABLE public."User" ENABLE TRIGGER trg_audit_user;

-- Kiểm tra nhanh sau khi chạy:
-- SELECT count(*) FROM auth.users WHERE created_at >= '2026-06-10';
-- SELECT full_name, email, created_at FROM public."User"
--   ORDER BY created_at DESC LIMIT 20;
