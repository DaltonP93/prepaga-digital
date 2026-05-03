
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export interface ProfileBackupData {
  email: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  timestamp: number;
}

export class ProfileBackupManager {
  private static BACKUP_KEY = 'profile_backup';
  private static BACKUP_TTL = 24 * 60 * 60 * 1000; // 24 hours

  static backupProfile(profile: Profile): void {
    try {
      const backup: ProfileBackupData = {
        email: profile.email || '',
        company_id: profile.company_id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        timestamp: Date.now()
      };

      localStorage.setItem(
        `${this.BACKUP_KEY}_${profile.id}`, 
        JSON.stringify(backup)
      );
    } catch (error) {
      // intentional empty catch: backup cleanup is best-effort
    }
  }

  static clearBackup(userId: string): void {
    try {
      localStorage.removeItem(`${this.BACKUP_KEY}_${userId}`);
    } catch (error) {
      // intentional empty catch: backup cleanup is best-effort
    }
  }

  static getBackupProfile(userId: string): ProfileBackupData | null {
    try {
      const raw = localStorage.getItem(`${this.BACKUP_KEY}_${userId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProfileBackupData;
      if (!parsed || typeof parsed.timestamp !== 'number') return null;
      if (Date.now() - parsed.timestamp > this.BACKUP_TTL) {
        localStorage.removeItem(`${this.BACKUP_KEY}_${userId}`);
        return null;
      }
      return parsed;
    } catch {
      // intentional empty catch: backup retrieval is best-effort
      return null;
    }
  }

  static async restoreProfileFromBackup(userId: string): Promise<Profile | null> {
    const backup = this.getBackupProfile(userId);
    if (!backup) return null;

    try {
      // Try to create/update the profile with backup data
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: backup.email,
          first_name: backup.first_name,
          last_name: backup.last_name,
          company_id: backup.company_id,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error restoring profile from backup:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to restore profile from backup:', error);
      return null;
    }
  }
}

export const validateProfileIntegrity = (profile: Profile): boolean => {
  if (!profile) return false;
  
  // Check required fields
  const hasRequiredFields = !!(
    profile.id &&
    profile.email
  );

  // Check if profile is active
  const isActive = profile.is_active !== false;

  // Check if data looks reasonable
  const hasReasonableData = profile.email ? profile.email.includes('@') : false;

  return hasRequiredFields && isActive && hasReasonableData;
};

export const sanitizeProfile = (profile: Partial<Profile>): Partial<Profile> => {
  return {
    ...profile,
    email: profile.email?.trim().toLowerCase(),
    first_name: profile.first_name?.trim(),
    last_name: profile.last_name?.trim(),
    phone: profile.phone?.trim() || null,
  };
};
