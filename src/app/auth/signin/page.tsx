import { SignInForm } from "./signin-form";

export const dynamic = "force-dynamic";

function resolveInitialMode(value: string | string[] | undefined): "sign_in" | "create_account" {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "create_account" ? "create_account" : "sign_in";
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl =
    (typeof params.callbackUrl === "string" ? params.callbackUrl : undefined) ||
    "/dashboard";
  const initialMode = resolveInitialMode(params.mode);

  return <SignInForm callbackUrl={callbackUrl} initialMode={initialMode} />;
}
