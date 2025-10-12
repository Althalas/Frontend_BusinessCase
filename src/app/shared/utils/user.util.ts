import { environment } from "../../../environments/environment";

/**
 * Interface minimale pour les données utilisateur nécessaires à l'avatar.
 */
interface AvatarUser {
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
}

/**
 * Génère l'URL de l'avatar utilisateur.
 * Gère correctement le stripping du suffixe /api pour les assets statiques.
 */
export function getAvatarUrl(user: AvatarUser | null | undefined): string {
  if (user?.avatarUrl) {
    return `${environment.apiUrl.replace('/api', '')}${user.avatarUrl}`;
  }
  return `https://ui-avatars.com/api/?name=${user?.firstName || ''}+${user?.lastName || ''}&background=random`;
}
