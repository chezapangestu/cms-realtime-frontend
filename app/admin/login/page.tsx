export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
