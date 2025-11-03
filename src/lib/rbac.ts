import type { Ability, Role } from '@/lib/auth';

const roleAbilities: Record<Role, Ability[]> = {
  USER: [],
  MOD: ['manage:listings'],
  ADMIN: ['manage:pricing', 'manage:listings', 'manage:users']
};

export function hasAbility(user: { role: Role; abilities?: Ability[] }, ability: Ability) {
  if (user.abilities?.includes(ability)) return true;
  return roleAbilities[user.role]?.includes(ability) ?? false;
}
