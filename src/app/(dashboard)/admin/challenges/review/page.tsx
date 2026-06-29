import { getPendingChallengeSubmissionsAction } from "@/app/actions/gamification.actions";
import { ReviewClient } from "./_components/ReviewClient";
import { PageHeader } from "@/components/shared/PageHeader";

export const dynamic = "force-dynamic";

export default async function ReviewChallengesPage() {
  const { data: submissions, error } = await getPendingChallengeSubmissionsAction();

  if (error) {
    return <div className="p-4 bg-red-100 text-red-700">Lỗi khi tải dữ liệu: {error}</div>;
  }

  return (
    <div className="flex flex-col gap-6 pt-6">
      <PageHeader
        titleKey="admin.menu.reviewChallenges"
        subtitleKey="Duyệt bài dự thi của người dùng"
      />
      <ReviewClient initialSubmissions={submissions} />
    </div>
  );
}
