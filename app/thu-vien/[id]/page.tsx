import Site from "@/components/club/site";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Site view="library" itemId={id} />;
}
