import DocumentViewPage from '@/components/documents/DocumentViewPage';

export default async function ViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentViewPage documentId={id} />;
}
