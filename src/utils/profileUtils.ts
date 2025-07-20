
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

export interface ProfileBackupData {
  email: string;
  role: string;
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
        email: profile.email,
        role: profile.role,
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
      console.warn('Error backing up profile:', error);
    }
  }

  static getBackupProfile(userId: string): ProfileBackupData | null {
    try {
      const stored = localStorage.getItem(`${this.BACKUP_KEY}_${userId}`);
      if (!stored) return null;

      const backup: ProfileBackupData = JSON.parse(stored);
      
      // Check if backup is still valid (not expired)
      if (Date.now() - backup.timestamp > this.BACKUP_TTL) {
        this.clearBackup(userId);
        return null;
      }

      return backup;
    } catch (error) {
      console.warn('Error reading profile backup:', error);
      return null;
    }
  }

  static clearBackup(userId: string): void {
    try {
      localStorage.removeItem(`${this.BACKUP_KEY}_${userId}`);
    } catch (error) {
      console.warn('Error clearing profile backup:', error);
    }
  }

  static async restoreProfileFromBackup(userId: string): Promise<Profile | null> {
    const backup = this.getBackupProfile(userId);
    if (!backup) return null;

    try {
      console.log('Restoring profile from backup for user:', userId);
      
      // Try to create/update the profile with backup data
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: backup.email,
          first_name: backup.first_name,
          last_name: backup.last_name,
          role: backup.role as any,
          company_id: backup.company_id,
          active: true,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error restoring profile from backup:', error);
        return null;
      }

      console.log('Profile restored successfully from backup');
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
    profile.email &&
    profile.role
  );

  // Check if profile is active
  const isActive = profile.active !== false;

  // Check if data looks reasonable
  const hasReasonableData = (
    profile.email.includes('@') &&
    profile.role.length > 0
  );

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
