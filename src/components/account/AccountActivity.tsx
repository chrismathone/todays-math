import { getAccountAccess } from "@/lib/accountAccess";
import ActivityReporter from "./ActivityReporter";

export default async function AccountActivity() {
  const account = await getAccountAccess();
  return account ? (
    <ActivityReporter key={account.id} userId={account.id} />
  ) : null;
}
