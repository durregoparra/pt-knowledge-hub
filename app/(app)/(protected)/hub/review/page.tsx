import { redirect } from 'next/navigation';
import KnowledgeReview from '@/components/KnowledgeReview';
import { getMyCompany } from '@/lib/company-membership';
import { getSessionSupabase } from '@/lib/supabase-session';

// Company administrators review their company's documents. Everyone else goes back to the hub;
// /api/knowledge/review checks the role again.
export default async function ReviewPage() {
  const company = await getMyCompany(await getSessionSupabase()).catch((err) => {
    console.error('review: company read failed', err);
    return null;
  });
  if (!company?.isAdmin) redirect('/hub');

  return (
    <main className="container pad-x admin__main">
      <section className="admin__panel">
        <div className="admin__panel-head">
          <h1 className="h4">Review documents — {company.companyName}</h1>
        </div>
        <div className="admin__panel-body">
          <p>Every document registered by the people of your company. Approve the pending ones with a comment.</p>
          <p><a href="/hub">Back to the hub</a></p>
        </div>
      </section>
      <KnowledgeReview />
    </main>
  );
}
