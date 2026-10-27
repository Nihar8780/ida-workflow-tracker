// Thin wrapper around Supabase Auth (email + password).
(function () {
  const sb = () => IDA.db.client;

  IDA.auth = {
    async getSession() {
      if (!sb()) return null;
      const { data } = await sb().auth.getSession();
      return data.session || null;
    },

    async signIn(email, password) {
      const { data, error } = await sb().auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },

    // Returns { session } - session is null when email confirmation is required.
    async signUp(email, password, fullName) {
      const { data, error } = await sb().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName || "" },
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      return data;
    },

    async signOut() {
      if (sb()) await sb().auth.signOut();
    },

    onChange(callback) {
      if (!sb()) return;
      sb().auth.onAuthStateChange((event, session) => {
        // Defer so we never call Supabase from inside its own auth callback.
        setTimeout(() => callback(event, session), 0);
      });
    }
  };
})();
