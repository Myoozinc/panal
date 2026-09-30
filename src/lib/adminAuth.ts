// Admin authentication helper for master console access

const MASTER_USER = "Gingerboy";
const MASTER_PASS = "Rona12345";
const STORAGE_KEY = "panal_master_admin_auth";
const STORAGE_TIMESTAMP = "panal_master_admin_timestamp";

export function isMasterAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  const isAuth =
    sessionStorage.getItem(STORAGE_KEY) === "true" ||
    localStorage.getItem(STORAGE_KEY) === "true";
  return isAuth;
}

export function authenticateMasterAdmin(username: string, pass: string): boolean {
  if (
    username.trim().toLowerCase() === MASTER_USER.toLowerCase() &&
    pass === MASTER_PASS
  ) {
    sessionStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem(STORAGE_KEY, "true");
    sessionStorage.setItem(STORAGE_TIMESTAMP, Date.now().toString());
    return true;
  }
  return false;
}

export function logoutMasterAdmin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_TIMESTAMP);
}

export function getMasterAdminUsername(): string {
  return MASTER_USER;
}
