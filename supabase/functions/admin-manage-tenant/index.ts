import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, ...payload } = await req.json();

    if (action === "create") {
      const { email, password, tenant_id } = payload;
      if (!email || !password || !tenant_id) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
      
      let userId: string;
      
      if (existingUser) {
        userId = existingUser.id;
        // Update password for existing user
        await adminClient.auth.admin.updateUser(userId, { password });
      } else {
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (authError) throw authError;
        userId = authData.user.id;
      }

      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: userId,
        role: "tenant",
      });
      if (roleError) throw roleError;

      // Link user to tenant record and store initial password
      const { error: linkError } = await adminClient.from("tenants").update({
        user_id: userId,
        initial_password: password,
      }).eq("id", tenant_id);
      if (linkError) throw linkError;

      // Auto-archive previous tenant on same apartment & update apartment status
      const { data: tenant } = await adminClient.from("tenants").select("apartment_id, lease_start").eq("id", tenant_id).single();
      if (tenant?.apartment_id) {
        const { data: otherTenants } = await adminClient.from("tenants")
          .select("id")
          .eq("apartment_id", tenant.apartment_id)
          .eq("status", "active")
          .neq("id", tenant_id);

        if (otherTenants && otherTenants.length > 0) {
          const leaseEndDate = tenant.lease_start
            ? new Date(new Date(tenant.lease_start).getTime() - 86400000).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

          for (const ot of otherTenants) {
            await adminClient.from("tenants").update({
              status: "moved_out",
              lease_end: leaseEndDate,
            }).eq("id", ot.id);
          }
        }

        if (tenant.lease_start) {
          await adminClient.from("apartments").update({ status: "occupied" }).eq("id", tenant.apartment_id);
        }
      }

      return new Response(JSON.stringify({ success: true, user_id: userId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_password") {
      const { tenant_id, password } = payload;
      if (!tenant_id || !password) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tenant } = await adminClient.from("tenants").select("user_id").eq("id", tenant_id).single();
      if (!tenant?.user_id) {
        return new Response(JSON.stringify({ error: "Tenant has no user account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: authError } = await adminClient.auth.admin.updateUser(tenant.user_id, { password });
      if (authError) throw authError;

      // Update stored password
      await adminClient.from("tenants").update({ initial_password: password }).eq("id", tenant_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { tenant_id } = payload;
      if (!tenant_id) {
        return new Response(JSON.stringify({ error: "Missing tenant_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tenant } = await adminClient.from("tenants").select("user_id, apartment_id").eq("id", tenant_id).single();

      if (tenant?.user_id) {
        await adminClient.auth.admin.deleteUser(tenant.user_id);
      }

      if (tenant?.apartment_id) {
        const { data: remainingTenants } = await adminClient.from("tenants")
          .select("id")
          .eq("apartment_id", tenant.apartment_id)
          .eq("status", "active")
          .neq("id", tenant_id);

        if (!remainingTenants || remainingTenants.length === 0) {
          await adminClient.from("apartments").update({ status: "available" }).eq("id", tenant.apartment_id);
        }
      }

      const { error: deleteError } = await adminClient.from("tenants").delete().eq("id", tenant_id);
      if (deleteError) throw deleteError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
