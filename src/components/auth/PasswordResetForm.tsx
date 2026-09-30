import { Input } from "@/components/ui/input";

interface PasswordResetFormProps {
  newPassword: string;
  setNewPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (password: string) => void;
}

export const PasswordResetForm = ({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
}: PasswordResetFormProps) => {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="newPassword" className="text-sm font-medium">
          Nueva contraseña
        </label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirmar nueva contraseña
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={6}
        />
      </div>
    </>
  );
};