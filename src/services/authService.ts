/**
 * authService.ts
 * Supabase Auth — producción real, sin modo demo.
 */

import { supabase } from './supabase';
import { UserRole, UserProfile } from '../store/useAuthStore';

export const authService = {

  async login(email: string, password: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      console.error('[authService.login]', error?.message);
      return null;
    }
    return authService.getProfile(data.user.id);
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, branches(name), tenants(name, plan_type)')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as UserRole,
      branchId: data.branch_id,
      branchName: (data as any).branches?.name || 'Sucursal Principal',
      tenantId: data.tenant_id,
      tenantName: (data as any).tenants?.name || 'Mi Restaurante',
      planType: (data as any).tenants?.plan_type || 'free',
    };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  async restoreSession(): Promise<UserProfile | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return authService.getProfile(data.session.user.id);
  },

  /**
   * Registrar nueva empresa (tenant) con su administrador.
   */
  async registerCompany(
    companyName: string,
    subdomain: string,
    adminName: string,
    email: string,
    password: string
  ): Promise<UserProfile | null> {

    // 1. Crear tenant
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .insert({ name: companyName, subdomain: subdomain.toLowerCase(), plan_type: 'free' })
      .select('id')
      .single();

    if (tenantError || !tenantData) {
      console.error('[authService.registerCompany] Tenant creation failed', tenantError);
      throw new Error('No se pudo crear la empresa. El subdominio podría estar en uso.');
    }

    const tenantId = tenantData.id;

    // 2. Crear sucursal por defecto
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .insert({ tenant_id: tenantId, name: 'Sucursal Central', address: 'Av. Principal' })
      .select('id')
      .single();

    if (branchError || !branchData) {
      await supabase.from('tenants').delete().eq('id', tenantId);
      throw new Error('No se pudo crear la sucursal por defecto.');
    }

    const branchId = branchData.id;

    // 3. Registrar usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: adminName, role: 'admin', tenant_id: tenantId, branch_id: branchId }
      }
    });

    if (authError || !authData.user) {
      await supabase.from('tenants').delete().eq('id', tenantId);
      throw new Error(authError?.message || 'Error al registrar credenciales de administrador.');
    }

    // 4. Crear perfil manualmente
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      tenant_id: tenantId,
      name: adminName,
      email,
      role: 'admin',
      branch_id: branchId,
      active: true
    });

    // 5. Categorías por defecto
    await supabase.from('categories').insert([
      { tenant_id: tenantId, branch_id: branchId, name: '☕ Café & Cafetería',      slug: 'cafe',      sort_order: 1 },
      { tenant_id: tenantId, branch_id: branchId, name: '🥤 Bebidas & Jugos',       slug: 'bebidas',   sort_order: 2 },
      { tenant_id: tenantId, branch_id: branchId, name: '🥪 Desayunos & Meriendas', slug: 'desayunos', sort_order: 3 },
      { tenant_id: tenantId, branch_id: branchId, name: '🍔 Almuerzos & Cenas',     slug: 'almuerzos', sort_order: 4 },
    ]);

    return {
      id: authData.user.id,
      name: adminName,
      email,
      role: 'admin',
      branchId,
      branchName: 'Sucursal Central',
      tenantId,
      planType: 'free',
    };
  },

  onAuthStateChange(callback: (profile: UserProfile | null) => void) {
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await authService.getProfile(session.user.id);
        callback(profile);
      } else {
        callback(null);
      }
    });
  }
};
