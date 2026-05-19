import { SignInForm } from "./signin-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl =
    (typeof params.callbackUrl === "string" ? params.callbackUrl : undefined) ||
    "/dashboard";

  return <SignInForm callbackUrl={callbackUrl} />;
}
