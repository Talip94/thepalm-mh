import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'tenant' | 'staff' | null;

interface TenantInfo {
  tenant_id: string;
  apartment_id: string;
  first_name: string;
  last_name: string;
  apartment_number: string;
  apartment_name: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  tenantInfo: TenantInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  tenantInfo: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      const { data: roleData } = await supabase.rpc('get_user_role');
      const userRole = (roleData as UserRole) || null;
      setRole(userRole);

      if (userRole === 'tenant') {
        const { data: tenantData } = await supabase.rpc('get_my_tenant_info');
        if (tenantData && tenantData.length > 0) {
          setTenantInfo(tenantData[0] as TenantInfo);
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setRole(null);
          setTenantInfo(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setTenantInfo(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, tenantInfo, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
